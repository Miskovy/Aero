import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../prisma/prisma.service';
import { Deployment, Prisma } from '../../../generated/prisma/client';

@Injectable()
export class DeploymentsService {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue('deployments') private readonly deploymentsQueue: Queue 
  ) {}

  // POST /services/:serviceId/deployments
  async triggerDeployment(serviceId: string, userId?: string): Promise<Deployment> {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');

    const deployment = await this.prisma.deployment.create({
      data: {
        service_id: serviceId,
        status: 'queued',
        trigger: 'api',
        triggered_by: userId,
      },
    });

    await this.deploymentsQueue.add('build-and-deploy', {
      serviceId: service.id,
      deploymentId: deployment.id,
    });

    return deployment;
  }

  // GET /services/:serviceId/deployments
  async listDeployments(serviceId: string, limit: number = 10): Promise<Deployment[]> {
    return this.prisma.deployment.findMany({
      where: { service_id: serviceId },
      orderBy: { created_at: 'desc' },
      take: limit,
    });
  }

  // GET /services/:serviceId/deployments/:id
  async getDeploymentDetails(serviceId: string, deploymentId: string): Promise<Deployment> {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, service_id: serviceId },
      include: { logs: { orderBy: { created_at: 'asc' } } }, // Fetch logs too!
    });

    if (!deployment) throw new NotFoundException('Deployment not found');
    return deployment;
  }

  // POST /services/:serviceId/deployments/:id/rollback
  async triggerRollback(serviceId: string, deploymentId: string, userId?: string): Promise<Deployment> {
    const failedDeployment = await this.prisma.deployment.findUnique({ where: { id: deploymentId } });
    
    if (!failedDeployment || failedDeployment.status !== 'failed') {
      throw new BadRequestException('You can only rollback from a failed deployment.');
    }

    const updatedDeployment = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'rolled_back' }
    });

    await this.deploymentsQueue.add('rollback', {
      serviceId,
      deploymentId,
      failedContainerId: failedDeployment.docker_image_tag
    });

    return updatedDeployment;
  }

  // POST /services/:serviceId/deployments/:id/cancel
  async cancelDeployment(serviceId: string, deploymentId: string): Promise<Deployment> {
    const deployment = await this.prisma.deployment.findFirst({
      where: { id: deploymentId, service_id: serviceId }
    });

    if (!deployment) throw new NotFoundException('Deployment not found');

    if (deployment.status !== 'queued' && deployment.status !== 'building') {
      throw new BadRequestException(`Cannot cancel a deployment in status: ${deployment.status}`);
    }

    // Update the database
    const cancelled = await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { 
        status: 'cancelled',
        finished_at: new Date()
      }
    });

    // Attempt to remove the job from the BullMQ queue if it hasn't started processing yet
    // BullMQ generates job IDs automatically
    try {
      const jobs = await this.deploymentsQueue.getJobs(['waiting', 'delayed']);
      const jobToCancel = jobs.find(job => job.data.deploymentId === deploymentId);
      
      if (jobToCancel) {
        await jobToCancel.remove();
      }
    } catch (e) {
      console.warn(`Failed to remove cancelled job ${deploymentId} from queue`);
    }

    return cancelled;
  }
}