import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { DeploymentsService } from '../deployments/deployment.service';
import { WebhookPayload } from './interfaces/webhook.interface';
import { WebhookProvider } from '../../../generated/prisma/client';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly deploymentsService: DeploymentsService,
  ) {}

  /**
   * Create a webhook for a service. Returns the webhook with the secret token
   * that must be configured in the external provider (GitHub, GitLab, etc.).
   */
  async createWebhook(
    serviceId: string,
    userId: string,
    dto: CreateWebhookDto,
  ) {
    await this.validateServiceOwnership(serviceId, userId);

    const secretToken = randomBytes(32).toString('hex');

    const webhook = await this.prisma.webhook.create({
      data: {
        service_id: serviceId,
        name: dto.name,
        provider: (dto.provider as WebhookProvider) || WebhookProvider.github,
        secret_token: secretToken,
        events: dto.events || ['push'],
        branch_filter: dto.branchFilter || null,
      },
    });

    return {
      ...webhook,
      // Provide the webhook URL that should be configured in GitHub/GitLab
      webhook_url: `/api/webhooks/${secretToken}`,
    };
  }

  /**
   * List all webhooks for a service.
   */
  async listWebhooks(serviceId: string, userId: string) {
    await this.validateServiceOwnership(serviceId, userId);

    const webhooks = await this.prisma.webhook.findMany({
      where: { service_id: serviceId },
      select: {
        id: true,
        name: true,
        provider: true,
        events: true,
        branch_filter: true,
        is_active: true,
        last_triggered_at: true,
        last_status: true,
        created_at: true,
        // Mask the secret token — only show first 8 chars
        secret_token: true,
      },
      orderBy: { created_at: 'desc' },
    });

    // Mask the secret tokens
    return webhooks.map((wh) => ({
      ...wh,
      secret_token: wh.secret_token.substring(0, 8) + '...',
      webhook_url: `/api/webhooks/${wh.secret_token}`,
    }));
  }

  /**
   * Delete a webhook.
   */
  async deleteWebhook(serviceId: string, webhookId: string, userId: string) {
    await this.validateServiceOwnership(serviceId, userId);

    const webhook = await this.prisma.webhook.findFirst({
      where: { id: webhookId, service_id: serviceId },
    });

    if (!webhook) throw new NotFoundException('Webhook not found');

    await this.prisma.webhook.delete({ where: { id: webhookId } });
    return { success: true, message: 'Webhook deleted successfully' };
  }

  /**
   * Handle an incoming webhook payload (public endpoint).
   * This is the URL that GitHub/GitLab will POST to.
   */
  async handleWebhookPayload(
    secretToken: string,
    payload: WebhookPayload,
    headers: Record<string, string>,
  ) {
    const webhook = await this.prisma.webhook.findUnique({
      where: { secret_token: secretToken },
      include: {
        service: true,
      },
    });

    if (!webhook || !webhook.is_active) {
      throw new NotFoundException('Webhook not found or inactive');
    }

    // Verify GitHub signature if present
    const githubSignature = headers['x-hub-signature-256'];
    if (webhook.provider === 'github' && githubSignature) {
      const isValid = this.verifyGitHubSignature(
        JSON.stringify(payload),
        githubSignature,
        webhook.secret_token,
      );
      if (!isValid) {
        this.logger.warn(`Invalid GitHub signature for webhook ${webhook.id}`);
        throw new ForbiddenException('Invalid webhook signature');
      }
    }

    // Extract branch from payload
    const ref = payload?.ref;
    const branch = ref?.replace('refs/heads/', '') || null;

    // Check branch filter
    if (webhook.branch_filter && branch && branch !== webhook.branch_filter) {
      this.logger.log(
        `Webhook ${webhook.id} skipped: push to ${branch}, filter is ${webhook.branch_filter}`,
      );
      await this.updateWebhookStatus(webhook.id, 'skipped_branch_filter');
      return {
        success: true,
        message: `Skipped: push to ${branch}, filter is ${webhook.branch_filter}`,
      };
    }

    // Extract commit info
    const commitSha = payload?.after || payload?.head_commit?.id || null;

    this.logger.log(
      `Webhook triggered for service ${webhook.service.name} (branch: ${branch}, commit: ${commitSha?.substring(0, 7) || 'unknown'})`,
    );

    // Trigger deployment
    try {
      const deployment = await this.deploymentsService.triggerDeployment(
        webhook.service_id,
        undefined, // No user ID for webhook-triggered deploys
      );

      await this.updateWebhookStatus(webhook.id, 'triggered');

      return {
        success: true,
        message: `Deployment triggered for ${webhook.service.name}`,
        deploymentId: deployment.id,
        branch,
        commit: commitSha,
      };
    } catch (error: unknown) {
      const errMsg = error instanceof Error ? error.message : String(error);
      await this.updateWebhookStatus(webhook.id, `failed: ${errMsg}`);
      throw error;
    }
  }

  private verifyGitHubSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    const expectedSignature =
      'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');

    try {
      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      );
    } catch {
      return false;
    }
  }

  private async updateWebhookStatus(webhookId: string, status: string) {
    await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        last_triggered_at: new Date(),
        last_status: status.substring(0, 50),
      },
    });
  }

  private async validateServiceOwnership(serviceId: string, userId: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        project: {
          include: {
            organization: {
              include: { members: true },
            },
          },
        },
      },
    });

    if (!service) throw new NotFoundException('Service not found');

    const isMember = service.project.organization.members.some(
      (m) => m.user_id === userId,
    );
    if (!isMember) throw new ForbiddenException('Access denied');
  }
}
