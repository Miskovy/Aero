import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { DockerService } from '../docker/docker.service';

@Injectable()
export class StateReconciliationService {
  private readonly logger = new Logger(StateReconciliationService.name);
  private isReconciling = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly dockerService: DockerService,
  ) {}

  @Cron('0 * * * * *') // Run every minute
  async reconcileState() {
    if (this.isReconciling) return;
    this.isReconciling = true;

    try {
      // Get all services that the DB thinks are running
      const runningServices = await this.prisma.service.findMany({
        where: { status: 'running' },
        select: { id: true, name: true, active_deployment_id: true },
      });

      if (runningServices.length === 0) return;

      let isDockerAvailable = false;
      try {
        isDockerAvailable = await this.dockerService.ping();
      } catch {
        isDockerAvailable = false;
      }

      if (!isDockerAvailable) {
        this.logger.warn(
          'Docker is unavailable, skipping state reconciliation.',
        );
        return;
      }

      // Get all managed containers from Docker
      const containers = await this.dockerService.listContainers({
        all: true,
        filters: { label: ['aero.managed=true'] },
      });

      const containerStatusMap = new Map<string, string>();
      for (const container of containers) {
        const serviceId = container.Labels['aero.service.id'];
        if (serviceId) {
          containerStatusMap.set(serviceId, container.State); // 'running', 'exited', etc.
        }
      }

      const servicesToUpdate: string[] = [];

      for (const service of runningServices) {
        const dockerState = containerStatusMap.get(service.id);

        // If it's supposed to be running but Docker says it's not (or it doesn't exist)
        if (!dockerState || dockerState !== 'running') {
          this.logger.warn(
            `State mismatch detected for service ${service.name} (${service.id}). DB: running, Docker: ${dockerState || 'missing'}. Marking as stopped.`,
          );
          servicesToUpdate.push(service.id);
        }
      }

      if (servicesToUpdate.length > 0) {
        await this.prisma.service.updateMany({
          where: { id: { in: servicesToUpdate } },
          data: { status: 'stopped' },
        });
        this.logger.log(
          `Reconciled ${servicesToUpdate.length} service statuses to stopped.`,
        );
      }
    } catch (err: unknown) {
      this.logger.error(
        'Failed to run state reconciliation',
        err instanceof Error ? err.stack : err,
      );
    } finally {
      this.isReconciling = false;
    }
  }
}
