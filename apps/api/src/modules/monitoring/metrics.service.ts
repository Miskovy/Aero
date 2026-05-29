import { Injectable, Logger } from '@nestjs/common';
import { DockerService } from '../docker/docker.service';
import { MetricsGateway } from './metrics.gateway';
import { Cron } from '@nestjs/schedule';
import { ContainerStats } from 'dockerode';
import * as os from 'os';
import * as si from 'systeminformation';
import { PrismaService } from '../../prisma/prisma.service';
import { ContainerMetrics } from './interfaces/metrics.interface';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  private isDockerAvailable: boolean | null = null;

  constructor(
    private readonly dockerService: DockerService,
    private readonly wsGateway: MetricsGateway,
    private readonly prisma: PrismaService,
  ) {}

  private async checkDockerAvailability(): Promise<boolean> {
    if (this.isDockerAvailable !== null) {
      return this.isDockerAvailable;
    }
    try {
      const isConnected = await this.dockerService.ping();
      this.isDockerAvailable = isConnected;
    } catch {
      this.isDockerAvailable = false;
    }
    if (!this.isDockerAvailable) {
      this.logger.warn(
        'Local Docker daemon is unavailable. Skipping local metrics collection (Remote-Agent mode active).',
      );
    }
    return this.isDockerAvailable;
  }

  private calculateCpuPercent(stats: ContainerStats): number {
    if (!stats || !stats.cpu_stats || !stats.precpu_stats) return 0;

    const cpuUsage = stats.cpu_stats.cpu_usage?.total_usage || 0;
    const preCpuUsage = stats.precpu_stats.cpu_usage?.total_usage || 0;
    const systemCpuUsage = stats.cpu_stats.system_cpu_usage || 0;
    const preSystemCpuUsage = stats.precpu_stats.system_cpu_usage || 0;

    const cpuDelta = cpuUsage - preCpuUsage;
    const systemCpuDelta = systemCpuUsage - preSystemCpuUsage;
    const numberCpus = stats.cpu_stats.online_cpus || 1;

    if (systemCpuDelta <= 0 || cpuDelta <= 0) {
      return 0;
    }

    return (cpuDelta / systemCpuDelta) * numberCpus * 100;
  }

  async getContainerMetrics(containerId: string): Promise<ContainerMetrics> {
    try {
      const stats = await this.dockerService.getContainerStats(containerId);

      const memoryUsage = stats.memory_stats?.usage || 0;
      const memoryLimit = stats.memory_stats?.limit || 0;
      const memoryPercent =
        memoryLimit > 0 ? (memoryUsage / memoryLimit) * 100 : 0;

      let networkRxBytes = 0;
      let networkTxBytes = 0;

      if (stats.networks) {
        for (const network of Object.values(stats.networks)) {
          networkRxBytes += network.rx_bytes || 0;
          networkTxBytes += network.tx_bytes || 0;
        }
      }

      return {
        cpuPercent: this.calculateCpuPercent(stats),
        memoryUsageBytes: memoryUsage,
        memoryLimitBytes: memoryLimit,
        memoryPercent,
        networkRxBytes,
        networkTxBytes,
      };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to get metrics for container ${containerId}: ${errorMessage}`,
      );
      return {
        cpuPercent: 0,
        memoryUsageBytes: 0,
        memoryLimitBytes: 0,
        memoryPercent: 0,
        networkRxBytes: 0,
        networkTxBytes: 0,
      };
    }
  }

  @Cron('*/5 * * * * *')
  async pushMetrics() {
    if (!(await this.checkDockerAvailability())) {
      return;
    }
    try {
      const containers = await this.dockerService.listContainers({
        filters: { label: ['aero.managed=true'] },
      });

      for (const container of containers) {
        const serviceId = container.Labels['aero.service.id'];
        if (!serviceId) continue;

        const metrics = await this.getContainerMetrics(container.Id);
        this.wsGateway.emit('metrics:update', { serviceId, ...metrics });
      }
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to push metrics: ${errorMessage}`);
    }
  }

  async getSystemMetrics() {
    const [mem, currentLoad, cpu, fsSize, networkStats] = await Promise.all([
      si.mem(),
      si.currentLoad(),
      si.cpu(),
      si.fsSize(),
      si.networkStats(),
    ]);

    const totalBytes = mem.total;
    const usedBytes = mem.active;
    const memoryUsagePercent =
      totalBytes > 0 ? (usedBytes / totalBytes) * 100 : 0;

    const cpuModel = `${cpu.manufacturer} ${cpu.brand}`.trim() || 'Unknown';
    const cpuCores = cpu.cores;
    const cpuUsagePercent = currentLoad.currentLoad;

    let diskTotal = 0;
    let diskUsed = 0;
    for (const fs of fsSize) {
      diskTotal += fs.size;
      diskUsed += fs.used;
    }
    const diskUsagePercent = diskTotal > 0 ? (diskUsed / diskTotal) * 100 : 0;
    const disk = {
      totalBytes: diskTotal,
      usedBytes: diskUsed,
      usagePercent: diskUsagePercent,
    };

    let rxBytesPerSec = 0;
    let txBytesPerSec = 0;
    for (const net of networkStats) {
      if (net.rx_sec > 0) rxBytesPerSec += net.rx_sec;
      if (net.tx_sec > 0) txBytesPerSec += net.tx_sec;
    }
    const network = { rxBytesPerSec, txBytesPerSec };

    let dockerVersion = 'Unknown';
    let containersRunning = 0;
    let containersStopped = 0;
    let imagesCount = 0;

    if (await this.checkDockerAvailability()) {
      try {
        const versionInfo = (await this.dockerService.getVersion()) as {
          Version: string;
        };
        dockerVersion = versionInfo.Version;

        const containers = await this.dockerService.listContainers({
          all: true,
        });
        containersRunning = containers.filter(
          (c) => c.State === 'running',
        ).length;
        containersStopped = containers.filter(
          (c) => c.State !== 'running',
        ).length;

        const images = await this.dockerService.listImages();
        imagesCount = images.length;
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        this.logger.error(
          `Failed to get docker stats for system metrics: ${errorMessage}`,
        );
      }
    }

    return {
      hostname: os.hostname(),
      uptime: os.uptime(),
      cpu: { cores: cpuCores, usagePercent: cpuUsagePercent, model: cpuModel },
      memory: { totalBytes, usedBytes, usagePercent: memoryUsagePercent },
      disk,
      network,
      docker: {
        version: dockerVersion,
        containersRunning,
        containersStopped,
        imagesCount,
      },
    };
  }

  async getDockerStatus() {
    try {
      const isConnected = await this.dockerService.ping();
      if (!isConnected) return { status: 'disconnected', version: null };

      const versionInfo = (await this.dockerService.getVersion()) as {
        Version: string;
      };
      return { status: 'connected', version: versionInfo.Version };
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      return { status: 'disconnected', version: null, error: errorMessage };
    }
  }

  async getSystemHealth() {
    let database = 'disconnected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = 'connected';
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error(`Database health check failed: ${errorMessage}`);
    }

    let docker = 'disconnected';
    try {
      const isConnected = await this.dockerService.ping();
      if (isConnected) docker = 'connected';
    } catch {
      // Ignore ping errors
    }

    return {
      status:
        database === 'connected' && docker === 'connected'
          ? 'healthy'
          : 'degraded',
      version: '1.0.0', // Application version
      uptime: process.uptime(),
      database,
      redis: 'connected', // BullMQ is handled separately, assume connected for now
      docker,
    };
  }
}
