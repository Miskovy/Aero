import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Plan } from '../../generated/prisma/client';

@Injectable()
export class PlanQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to retrieve the active plan for an organization via its subscription or fallback plan_rel.
   */
  async getOrganizationPlan(organizationId: string): Promise<Plan> {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        subscription: {
          include: { plan: true },
        },
        plan_rel: true,
      },
    });

    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    const plan = org.subscription?.plan || org.plan_rel;

    if (!plan) {
      // Fallback to FREE plan if neither is set
      const freePlan = await this.prisma.plan.findFirst({
        where: { name: { equals: 'FREE', mode: 'insensitive' } },
      });
      if (!freePlan) {
        throw new NotFoundException('No active plan found for organization');
      }
      return freePlan;
    }

    return plan;
  }

  /**
   * Validate project creation quota for an organization.
   */
  async validateProjectQuota(organizationId: string): Promise<void> {
    const plan = await this.getOrganizationPlan(organizationId);

    if (plan.is_inf_proj || plan.max_projects === null) {
      return;
    }

    const projectCount = await this.prisma.project.count({
      where: { organization_id: organizationId },
    });

    if (projectCount >= plan.max_projects) {
      throw new ForbiddenException(
        `Project limit reached (${plan.max_projects}). Upgrade your plan to create more projects.`,
      );
    }
  }

  /**
   * Validate service creation quota for an organization (via projectId).
   */
  async validateServiceQuota(projectId: string): Promise<void> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { organization_id: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const plan = await this.getOrganizationPlan(project.organization_id);

    if (plan.is_inf_services || plan.max_services === null) {
      return;
    }

    const serviceCount = await this.prisma.service.count({
      where: {
        project: { organization_id: project.organization_id },
      },
    });

    if (serviceCount >= plan.max_services) {
      throw new ForbiddenException(
        `Service limit reached (${plan.max_services}). Upgrade your plan to create more services.`,
      );
    }
  }

  /**
   * Validate node registration quota for an organization.
   */
  async validateNodeQuota(organizationId: string): Promise<void> {
    const plan = await this.getOrganizationPlan(organizationId);

    if (plan.is_inf_nodes || plan.max_nodes === null) {
      return;
    }

    const nodeCount = await this.prisma.node.count({
      where: { organization_id: organizationId },
    });

    if (nodeCount >= plan.max_nodes) {
      throw new ForbiddenException(
        `Node limit reached (${plan.max_nodes}). Upgrade your plan to register more nodes.`,
      );
    }
  }

  /**
   * Validate deployment quota for a service.
   */
  async validateDeploymentQuota(serviceId: string): Promise<void> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        project: {
          include: {
            organization: {
              include: { subscription: true, plan_rel: true },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const org = service.project.organization;
    const plan = await this.getOrganizationPlan(org.id);

    if (plan.is_inf_deployments || plan.max_deployments === null) {
      return;
    }

    const currentPeriodStart =
      org.subscription?.current_period_start ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const deploymentCount = await this.prisma.deployment.count({
      where: {
        service: { project: { organization_id: org.id } },
        created_at: { gte: currentPeriodStart },
      },
    });

    if (deploymentCount >= plan.max_deployments) {
      throw new ForbiddenException(
        `Deployment limit reached for current period (${plan.max_deployments}). Upgrade your plan to deploy more.`,
      );
    }
  }

  /**
   * Validate backup quota for a service.
   */
  async validateBackupQuota(serviceId: string): Promise<void> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { project: { select: { organization_id: true } } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const orgId = service.project.organization_id;
    const plan = await this.getOrganizationPlan(orgId);

    if (plan.is_inf_backups || plan.max_backups === null) {
      return;
    }

    const backupCount = await this.prisma.backup.count({
      where: { service: { project: { organization_id: orgId } } },
    });

    if (backupCount >= plan.max_backups) {
      throw new ForbiddenException(
        `Backup limit reached (${plan.max_backups}). Upgrade your plan to create more backups.`,
      );
    }
  }

  /**
   * Validate webhook creation quota for a service.
   */
  async validateWebhookQuota(serviceId: string): Promise<void> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { project: { select: { organization_id: true } } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const orgId = service.project.organization_id;
    const plan = await this.getOrganizationPlan(orgId);

    if (plan.is_inf_webhooks || plan.max_webhooks === null) {
      return;
    }

    const webhookCount = await this.prisma.webhook.count({
      where: { service_id: serviceId },
    });

    if (webhookCount >= plan.max_webhooks) {
      throw new ForbiddenException(
        `Webhook limit reached (${plan.max_webhooks}). Upgrade your plan to create more webhooks.`,
      );
    }
  }

  /**
   * Validate API Key quota for an organization.
   */
  async validateApiKeyQuota(organizationId: string): Promise<void> {
    const plan = await this.getOrganizationPlan(organizationId);

    if (plan.is_inf_apikeys || plan.max_apikeys === null) {
      return;
    }

    const keyCount = await this.prisma.apiKey.count({
      where: { organization_id: organizationId },
    });

    if (keyCount >= plan.max_apikeys) {
      throw new ForbiddenException(
        `API Key limit reached (${plan.max_apikeys}). Upgrade your plan to generate more API keys.`,
      );
    }
  }

  /**
   * Validate alert rule quota for an organization.
   */
  async validateAlertQuota(organizationId: string): Promise<void> {
    const plan = await this.getOrganizationPlan(organizationId);

    if (plan.is_inf_alerts || plan.max_alerts === null) {
      return;
    }

    const alertCount = await this.prisma.alertRule.count({
      where: { organization_id: organizationId },
    });

    if (alertCount >= plan.max_alerts) {
      throw new ForbiddenException(
        `Alert rules limit reached (${plan.max_alerts}). Upgrade your plan to create more alerts.`,
      );
    }
  }

  /**
   * Validate team creation quota for an organization.
   */
  async validateTeamQuota(organizationId: string): Promise<void> {
    const plan = await this.getOrganizationPlan(organizationId);

    if (plan.is_inf_teams || plan.max_teams === null) {
      return;
    }

    const teamCount = await this.prisma.team.count({
      where: { organization_id: organizationId },
    });

    if (teamCount >= plan.max_teams) {
      throw new ForbiddenException(
        `Team limit reached (${plan.max_teams}). Upgrade your plan to create more teams.`,
      );
    }
  }

  /**
   * Validate member quota for an organization.
   */
  async validateMemberQuota(organizationId: string): Promise<void> {
    const plan = await this.getOrganizationPlan(organizationId);

    if (plan.is_inf_members || plan.max_members === null) {
      return;
    }

    const memberCount = await this.prisma.organizationMember.count({
      where: { organization_id: organizationId },
    });

    if (memberCount >= plan.max_members) {
      throw new ForbiddenException(
        `Member limit reached (${plan.max_members}). Upgrade your plan to add more team members.`,
      );
    }
  }

  /**
   * Validate custom domain feature access for a service.
   */
  async validateCustomDomainAllowed(serviceId: string): Promise<void> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      select: { project: { select: { organization_id: true } } },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const plan = await this.getOrganizationPlan(service.project.organization_id);

    if (!plan.custom_domains) {
      throw new ForbiddenException(
        'Custom domains are not supported on your current plan. Upgrade to Pro or Max to attach custom domains.',
      );
    }
  }
}
