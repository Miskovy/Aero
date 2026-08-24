import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanQuotaService } from '../../plans/plan-quota.service';
import { VaultService } from '../vault/vault.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { DockerService } from '../docker/docker.service';
import { CreateServiceDto } from '../deployments/dto/create-service.dto';
import { UpdateServiceDto } from '../deployments/dto/update-service.dto';
import { DeploymentsService } from '../deployments/deployment.service';
import { OnApplicationBootstrap } from '@nestjs/common';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ServicesService implements OnApplicationBootstrap {
  private readonly logger = new Logger(ServicesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planQuotaService: PlanQuotaService,
    private readonly vaultService: VaultService,
    private readonly cloudflareService: CloudflareService,
    private readonly dockerService: DockerService,
    private readonly deploymentsService: DeploymentsService,
  ) {}

  onApplicationBootstrap() {
    this.syncTunnelIngress().catch((err) => {
      this.logger.error('Failed to sync tunnel ingress on startup', err);
    });
  }

  /**
   * Sync all running Aero services into the Cloudflare tunnel ingress config.
   */
  async syncTunnelIngress() {
    const runningServices = await this.prisma.service.findMany({
      where: { status: 'running' },
      include: { domains: true },
    });

    const ingressEntries: {
      slug: string;
      domain: string;
      containerId: string;
      port: number;
    }[] = [];

    for (const svc of runningServices) {
      const containers = await this.dockerService.listContainers({
        all: false,
        filters: { label: [`aero.service.id=${svc.id}`] },
      });
      if (containers.length === 0) continue;

      const activeDomain = svc.domains.find(
        (d) => d.type === 'auto_generated',
      )?.domain;
      if (!activeDomain) continue;

      ingressEntries.push({
        slug: svc.slug,
        domain: activeDomain,
        containerId: containers[0].Id,
        port: svc.internal_port || 3000,
      });
    }

    if (ingressEntries.length > 0) {
      await this.cloudflareService
        .updateTunnelIngress(ingressEntries)
        .catch((err) => {
          this.logger.error(
            'Failed to sync tunnel ingress',
            err instanceof Error ? err.stack : err,
          );
        });
    } else {
      this.logger.log('No running services to configure in tunnel ingress');
    }
  }

  async listAllServices(
    pagination: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<any>> {
    const { cursor, limit = 20 } = pagination;
    const take = limit + 1; // Fetch one extra to determine hasMore

    const query: Prisma.ServiceFindManyArgs = {
      take,
      include: { project: true },
      orderBy: { created_at: 'desc' },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1; // Skip the cursor itself
    }

    if (userId) {
      query.where = {
        project: {
          organization: {
            members: {
              some: { user_id: userId },
            },
          },
        },
      };
    }

    const items = await this.prisma.service.findMany(query);

    const hasMore = items.length > limit;
    if (hasMore) {
      items.pop();
    }

    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return {
      data: items,
      meta: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async getServiceDetails(serviceId: string) {
    return this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        project: true,
        domains: true,
        variables: {
          select: { id: true, key: true, created_at: true, updated_at: true },
        },
        secrets: {
          select: { id: true, key: true, created_at: true, updated_at: true },
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

  async updateService(serviceId: string, data: UpdateServiceDto) {
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
      include: { project: true, domains: true },
    });
  }

  async deleteService(serviceId: string) {
    await this.prisma.$transaction([
      this.prisma.deploymentLog.deleteMany({
        where: { deployment: { service_id: serviceId } },
      }),
      this.prisma.deployment.deleteMany({ where: { service_id: serviceId } }),
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
      this.prisma.service.delete({ where: { id: serviceId } }),
    ]);

    return { success: true, message: 'Service deleted successfully' };
  }

  private async findServiceContainer(
    serviceId: string,
  ): Promise<string | null> {
    try {
      const containers = await this.dockerService.listContainers({
        all: true,
        filters: { label: [`aero.service.id=${serviceId}`] },
      });
      if (containers.length === 0) return null;
      return containers[0].Id;
    } catch {
      return null;
    }
  }

  private async handleContainerAction(
    action: 'start' | 'stop' | 'restart',
    containerId: string,
    serviceId: string,
  ) {
    try {
      if (action === 'start') {
        await this.dockerService.startContainer(containerId);
      } else if (action === 'stop') {
        await this.dockerService.stopContainer(containerId);
      } else if (action === 'restart') {
        await this.dockerService.restartContainer(containerId);
      }
      this.logger.log(
        `Successfully executed ${action} for container ${containerId} of service ${serviceId}`,
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (action === 'start' && msg.includes('already started')) return;
      if (action === 'stop' && msg.includes('already stopped')) return;
      if (msg.includes('304')) return; // Not modified

      this.logger.error(`Failed to ${action} container: ${msg}`);
      throw new BadRequestException(`Failed to ${action} container: ${msg}`);
    }
  }

  async startService(serviceId: string) {
    const containerId = await this.findServiceContainer(serviceId);
    if (containerId) {
      await this.handleContainerAction('start', containerId, serviceId);
    } else {
      this.logger.warn(`No container found for service ${serviceId}`);
    }

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: { status: 'running' },
      include: { node: true },
    });

    this.syncTunnelIngress().catch(() => {});
    return {
      success: true,
      message: `Service '${service.name}' started`,
      service,
    };
  }

  async stopService(serviceId: string) {
    const containerId = await this.findServiceContainer(serviceId);
    if (containerId) {
      await this.handleContainerAction('stop', containerId, serviceId);
    }

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: { status: 'stopped' },
      include: { node: true },
    });

    this.syncTunnelIngress().catch(() => {});
    return {
      success: true,
      message: `Service '${service.name}' stopped`,
      service,
    };
  }

  async restartService(serviceId: string) {
    const containerId = await this.findServiceContainer(serviceId);
    if (containerId) {
      await this.handleContainerAction('restart', containerId, serviceId);
    } else {
      throw new NotFoundException('No container found for this service');
    }

    const service = await this.prisma.service.update({
      where: { id: serviceId },
      data: { status: 'running' },
      include: { node: true },
    });

    this.syncTunnelIngress().catch(() => {});
    return {
      success: true,
      message: `Service '${service.name}' restarted`,
      service,
    };
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

    // Validate membership manually since it's via body param (projectId)
    if (userId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { organization: { include: { members: true } } },
      });
      if (!project) throw new NotFoundException('Project not found');
      const isMember = project.organization.members.some(
        (m) => m.user_id === userId,
      );
      if (!isMember) throw new ForbiddenException('Access denied');
    }

    await this.planQuotaService.validateServiceQuota(projectId);

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
        git_subdirectory: data.gitSubdirectory,
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
                {
                  domain,
                  type: 'custom' as const,
                  verification_status: 'pending' as const,
                },
                {
                  domain: autoDomain,
                  type: 'auto_generated' as const,
                  verification_status: 'verified' as const,
                },
              ]
            : [
                {
                  domain: autoDomain,
                  type: 'auto_generated' as const,
                  verification_status: 'verified' as const,
                },
              ],
        },
      },
    });

    this.cloudflareService.createDeploymentDomain(autoDomain).catch((err) => {
      this.logger.error(
        `Failed to register DNS for autoDomain ${autoDomain}`,
        err instanceof Error ? err.stack : err,
      );
    });

    if (domain) {
      this.cloudflareService.createDeploymentDomain(domain).catch((err) => {
        this.logger.error(
          `Failed to register DNS for custom domain ${domain}`,
          err instanceof Error ? err.stack : err,
        );
      });
    }

    return this.deploymentsService.triggerDeployment(service.id, userId);
  }
}
