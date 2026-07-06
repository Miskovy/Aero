import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { Deployment } from '../../../generated/prisma/client';

@Injectable()
export class DeploymentsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DeploymentsService.name);
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('deployments') private readonly deploymentsQueue: Queue,
  ) {}

  async onApplicationBootstrap() {
    // Auto-fix any queued/building deployments that are actually successfully running now
    try {
      const runningServices = await this.prisma.service.findMany({
        where: { status: 'running', active_deployment_id: { not: null } },
      });
      for (const svc of runningServices) {
        if (svc.active_deployment_id) {
          await this.prisma.deployment.updateMany({
            where: {
              id: svc.active_deployment_id,
              status: { in: ['queued', 'building', 'deploying'] },
            },
            data: { status: 'running', finished_at: new Date() },
          });
        }
      }
    } catch (err) {
      this.logger.warn(
        'Failed to auto-resolve active deployment statuses on bootstrap',
        err,
      );
    }
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
      gitUrl: service.git_repository
        ? `https://github.com/${service.git_repository}.git`
        : '',
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

  async getDeploymentDetails(
    serviceId: string,
    deploymentId: string,
  ): Promise<Deployment> {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, service_id: serviceId },
      include: { logs: { orderBy: { created_at: 'asc' } } },
    });

    if (!deployment) throw new NotFoundException('Deployment not found');
    return deployment;
  }

  async getDeploymentLogs(serviceId: string, deploymentId: string) {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, service_id: serviceId },
    });

    if (!deployment) throw new NotFoundException('Deployment not found');

    return this.prisma.deploymentLog.findMany({
      where: { deployment_id: deploymentId },
      orderBy: { created_at: 'asc' },
    });
  }

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

    const cancelled = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: {
        status: 'cancelled',
        finished_at: new Date(),
      },
    });

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
