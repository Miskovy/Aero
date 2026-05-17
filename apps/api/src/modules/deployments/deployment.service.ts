import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { Deployment } from '../../../generated/prisma/client';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { VaultService } from '../vault/vault.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('deployments') private readonly deploymentsQueue: Queue,
    private readonly vaultService: VaultService,
    private readonly cloudflareService: CloudflareService,
  ) {}

  /**
   * Validates that the given user has membership access to the service's organization.
   * Returns the full service with project/org/member chain for further use.
   */
  private async validateServiceAccess(serviceId: string, userId?: string) {
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

    if (userId) {
      const isMember = service.project.organization.members.some(
        (m) => m.user_id === userId,
      );
      if (!isMember) throw new ForbiddenException('Access denied');
    }

    return service;
  }

  async listAllServices(userId?: string) {
    if (!userId) {
      return this.prisma.service.findMany({ take: 50 });
    }

    // We get services that belong to projects in organizations the user is a member of
    return this.prisma.service.findMany({
      where: {
        project: {
          organization: {
            members: {
              some: {
                user_id: userId,
              },
            },
          },
        },
      },
      include: {
        project: true,
      },
      take: 50,
    });
  }

  // GET /services/:serviceId
  async getServiceDetails(serviceId: string, userId?: string) {
    await this.validateServiceAccess(serviceId, userId);

    return this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        project: true,
        domains: true,
        secrets: {
          select: {
            id: true,
            key: true,
            created_at: true,
            updated_at: true,
          },
        },
        node: {
          select: {
            id: true,
            name: true,
            status: true,
            hostname: true,
            last_heartbeat_at: true,
          },
        },
        deployments: {
          orderBy: { created_at: 'desc' },
          take: 5,
        },
      },
    });
  }

  // PATCH /services/:serviceId
  async updateService(
    serviceId: string,
    data: UpdateServiceDto,
    userId?: string,
  ) {
    await this.validateServiceAccess(serviceId, userId);

    return this.prisma.service.update({
      where: { id: serviceId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.nodeId !== undefined && { node_id: data.nodeId }),
        ...(data.git_branch !== undefined && { git_branch: data.git_branch }),
        ...(data.build_command !== undefined && {
          build_command: data.build_command,
        }),
        ...(data.start_command !== undefined && {
          start_command: data.start_command,
        }),
        ...(data.internal_port !== undefined && {
          internal_port: data.internal_port,
        }),
        ...(data.replicas !== undefined && { replicas: data.replicas }),
        ...(data.resource_limits !== undefined && {
          resource_limits: data.resource_limits,
        }),
        ...(data.health_check !== undefined && {
          health_check: data.health_check,
        }),
        ...(data.restart_policy !== undefined && {
          restart_policy: data.restart_policy,
        }),
      },
      include: {
        project: true,
        domains: true,
      },
    });
  }

  // DELETE /services/:serviceId
  async deleteService(serviceId: string, userId?: string) {
    await this.validateServiceAccess(serviceId, userId);

    // Cascade deletes are configured in the schema for most relations,
    // but we delete in a transaction to ensure clean teardown.
    await this.prisma.$transaction([
      this.prisma.deploymentLog.deleteMany({
        where: { deployment: { service_id: serviceId } },
      }),
      this.prisma.deployment.deleteMany({
        where: { service_id: serviceId },
      }),
      this.prisma.serviceDomain.deleteMany({
        where: { service_id: serviceId },
      }),
      this.prisma.serviceSecret.deleteMany({
        where: { service_id: serviceId },
      }),
      this.prisma.environmentVariable.deleteMany({
        where: { service_id: serviceId },
      }),
      this.prisma.serviceVolume.deleteMany({
        where: { service_id: serviceId },
      }),
      this.prisma.service.delete({
        where: { id: serviceId },
      }),
    ]);

    return { success: true, message: 'Service deleted successfully' };
  }

  // POST /services/:serviceId/start
  async startService(serviceId: string, userId?: string) {
    await this.validateServiceAccess(serviceId, userId);

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: { status: 'running' },
      include: { node: true },
    });

    // If service is assigned to a node, the agent should receive a start command.
    // For MVP, we update the DB status. The agent-side command dispatch
    // will be wired via the AgentGateway in a follow-up.
    return {
      success: true,
      message: `Service '${service.name}' started`,
      service,
    };
  }

  // POST /services/:serviceId/stop
  async stopService(serviceId: string, userId?: string) {
    await this.validateServiceAccess(serviceId, userId);

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: { status: 'stopped' },
      include: { node: true },
    });

    return {
      success: true,
      message: `Service '${service.name}' stopped`,
      service,
    };
  }

  // POST /services/:serviceId/restart
  async restartService(serviceId: string, userId?: string) {
    await this.validateServiceAccess(serviceId, userId);

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: { status: 'running' },
      include: { node: true },
    });

    return {
      success: true,
      message: `Service '${service.name}' restarted`,
      service,
    };
  }

  async listOrganizations(userId?: string) {
    if (!userId) {
      return this.prisma.organization.findMany({ take: 50 });
    }
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: { user_id: userId },
        },
      },
      take: 50,
    });
  }

  async listProjects(orgId: string) {
    return this.prisma.project.findMany({
      where: { organization_id: orgId },
      take: 50,
    });
  }

  async createService(data: CreateServiceDto, userId?: string) {
    const {
      projectId,
      repo,
      branch,
      buildCmd,
      startCmd,
      sourceType = 'git',
      dockerImage,
      domain,
      internalPort,
      envVars,
    } = data;

    // Validate inputs based on source_type
    if (sourceType === 'git' && (!repo || !branch)) {
      throw new BadRequestException(
        'repo and branch are required when source_type is git',
      );
    }
    if (sourceType === 'docker_image' && !dockerImage) {
      throw new BadRequestException(
        'dockerImage is required when source_type is docker_image',
      );
    }

    const baseName =
      sourceType === 'git'
        ? repo?.split('/').pop() || 'new-service'
        : dockerImage?.split('/').pop() || 'new-service';
    const baseSlug = baseName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;
    const name = baseName;

    // Auto-generate aerodeploy.app subdomain if no custom domain provided
    const autoDomain = `${slug}.aerodeploy.app`;

    const service = await this.prisma.service.create({
      data: {
        project_id: projectId,
        node_id: data.nodeId,
        name,
        slug,
        type: 'application',
        source_type: sourceType,
        git_repository: repo,
        git_branch: branch,
        docker_image: dockerImage,
        build_command: buildCmd,
        start_command: startCmd,
        internal_port: internalPort || 3000,
        ...(envVars && {
          variables: {
            create: Object.entries(envVars).map(([key, value]) => {
              const encrypted = this.vaultService.encrypt(value);
              return {
                key,
                encrypted_value: encrypted.encryptedValue,
                iv: encrypted.iv,
                auth_tag: encrypted.authTag,
                key_version: encrypted.version,
              };
            }),
          },
        }),
        domains: {
          create: domain
            ? [
                // User provided a custom domain
                { domain, type: 'custom' as const, verification_status: 'pending' as const },
                // Also create the auto-generated free subdomain
                { domain: autoDomain, type: 'auto_generated' as const, verification_status: 'verified' as const },
              ]
            : [
                // No custom domain — only the auto-generated free subdomain
                { domain: autoDomain, type: 'auto_generated' as const, verification_status: 'verified' as const },
              ],
        },
      },
    });

    // Register the auto-generated subdomain with Cloudflare DNS (best-effort, non-blocking)
    this.cloudflareService.createDeploymentDomain(autoDomain).catch((err) => {
      console.warn(`Failed to register DNS for ${autoDomain}:`, err);
    });

    // Queue initial deployment
    return this.triggerDeployment(service.id, userId);
  }

  async triggerDeployment(
    serviceId: string,
    userId?: string,
  ): Promise<Deployment> {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const deployment = await this.prisma.deployment.create({
      data: {
        service_id: serviceId,
        status: 'queued',
        trigger: 'manual',
        triggered_by: userId || null,
      },
    });

    await this.deploymentsQueue.add('deploy', {
      serviceId,
      deploymentId: deployment.id,
      gitUrl: service.git_repository ? `https://github.com/${service.git_repository}.git` : '',
      branch: service.git_branch || 'main',
    });

    return deployment;
  }

  async listDeployments(
    serviceId: string,
    limit: number = 10,
  ): Promise<Deployment[]> {
    return this.prisma.deployment.findMany({
      where: { service_id: serviceId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  // GET /services/:serviceId/deployments/:id
  async getDeploymentDetails(
    serviceId: string,
    deploymentId: string,
  ): Promise<Deployment> {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, service_id: serviceId },
      include: { logs: { orderBy: { created_at: 'asc' } } }, // Fetch logs too!
    });

    if (!deployment) throw new NotFoundException('Deployment not found');
    return deployment;
  }

  // POST /services/:serviceId/deployments/:id/rollback
  async triggerRollback(
    serviceId: string,
    deploymentId: string,
  ): Promise<Deployment> {
    const failedDeployment = await this.prisma.deployment.findUnique({
      where: { id: deploymentId },
    });

    if (!failedDeployment || failedDeployment.status !== 'failed') {
      throw new BadRequestException(
        'You can only rollback from a failed deployment.',
      );
    }

    const updatedDeployment = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'rolled_back' },
    });

    await this.deploymentsQueue.add('rollback', {
      serviceId,
      deploymentId,
      failedContainerId: failedDeployment.docker_image_tag,
    });

    return updatedDeployment;
  }

  // POST /services/:serviceId/deployments/:id/cancel
  async cancelDeployment(
    serviceId: string,
    deploymentId: string,
  ): Promise<Deployment> {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, service_id: serviceId },
    });

    if (!deployment) throw new NotFoundException('Deployment not found');

    if (deployment.status !== 'queued' && deployment.status !== 'building') {
      throw new BadRequestException(
        `Cannot cancel a deployment in status: ${deployment.status}`,
      );
    }

    // Update the database
    const cancelled = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'cancelled',
        finished_at: new Date(),
      },
    });

    // Attempt to remove the job from the BullMQ queue if it hasn't started processing yet
    // BullMQ generates job IDs automatically
    try {
      const jobs = await this.deploymentsQueue.getJobs(['waiting', 'delayed']);
      const jobToCancel = jobs.find(
        (job) =>
          (job.data as { deploymentId?: string }).deploymentId === deploymentId,
      );

      if (jobToCancel) {
        await jobToCancel.remove();
      }
    } catch (e: unknown) {
      console.warn(
        `Failed to remove cancelled job ${deploymentId} from queue`,
        e,
      );
    }

    return cancelled;
  }
}
