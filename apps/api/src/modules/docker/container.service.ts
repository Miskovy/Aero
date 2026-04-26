/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Service, Deployment } from '../../../generated/prisma/client';
import { HostRestartPolicy, HostConfig, HealthConfig } from 'dockerode';
import * as Docker from 'dockerode';
import { DockerService } from './docker.service';
import { VaultService } from '../vault/vault.service';

export interface RestartPolicyConfig {
  condition?: 'no' | 'always' | 'on-failure' | 'unless-stopped';
  max_retries?: number;
}

export interface ResourceLimitsConfig {
  cpu?: string | number;
  memory?: string;
}

export interface HealthCheckConfig {
  test?: string[];
  interval?: string;
  timeout?: string;
  retries?: number;
  start_period?: string;
}

interface VaultItem {
  key: string;
  value?: string;
  encrypted_value?: string;
  iv: string;
  auth_tag: string;
}

@Injectable()
export class ContainerService {
  constructor(
    private readonly dockerService: DockerService,
    private readonly vaultService: VaultService,
  ) { }

  // Create an Aero-managed container from a service definition
  async createFromService(
    service: Service,
    deployment: Deployment,
  ): Promise<string> {
    const image = deployment.docker_image_tag || service.docker_image;
    if (!image) {
      throw new Error(
        'No Docker image specified for this service or deployment',
      );
    }

    const config: Docker.ContainerCreateOptions = {
      Image: image,
      name: `aero-${service.name}-${deployment.id.substring(0, 8)}`,
      Labels: this.buildLabels(service, deployment),
      Env: this.buildEnvironment(service),
      HostConfig: {
        RestartPolicy: this.buildRestartPolicy(service),
        ...this.buildResourceLimits(service),
      },
      Healthcheck: this.buildHealthCheck(service),
    };

    const container = await this.dockerService.createContainer(config);
    return container.id;
  }

  private buildLabels(
    service: Service,
    deployment: Deployment,
  ): Record<string, string> {
    return {
      'aero.managed': 'true',
      'aero.project.id': service.project_id,
      'aero.service.id': service.id,
      'aero.deployment.id': deployment.id,
      'aero.service.name': service.name,
      'aero.service.type': service.type.toString(),
    };
  }

  private buildEnvironment(
    service: Service & { variables?: VaultItem[]; secrets?: VaultItem[] },
  ): string[] {
    const env: string[] = [];

    if (service.variables) {
      service.variables.forEach((v) => {
        const encVal = v.encrypted_value || v.value;
        if (!encVal) return; // Optional safety check

        const decVal = this.vaultService.decrypt(encVal, v.iv, v.auth_tag);
        env.push(`${v.key}=${decVal}`);
      });
    }

    if (service.secrets) {
      service.secrets.forEach((s) => {
        const encVal = s.encrypted_value || s.value;
        if (!encVal) return; // Optional safety check

        const decVal = this.vaultService.decrypt(encVal, s.iv, s.auth_tag);
        env.push(`${s.key}=${decVal}`);
      });
    }

    return env;
  }

  private buildRestartPolicy(service: Service): HostRestartPolicy {
    if (!service.restart_policy) {
      return { Name: 'unless-stopped' };
    }

    let policy: RestartPolicyConfig = {};
    try {
      policy =
        typeof service.restart_policy === 'string'
          ? JSON.parse(service.restart_policy)
          : service.restart_policy;
    } catch (e) {
      // Intentionally left empty to fall back to the default 'unless-stopped' policy
    }

    const name = policy.condition || 'unless-stopped';
    const maxRetries = policy.max_retries;

    return {
      Name: name,
      MaximumRetryCount: maxRetries,
    };
  }

  private buildResourceLimits(service: Service): HostConfig {
    const hostConfig: HostConfig = {};

    if (!service.resource_limits) {
      return hostConfig;
    }

    let limits: ResourceLimitsConfig = {};
    try {
      limits =
        typeof service.resource_limits === 'string'
          ? JSON.parse(service.resource_limits)
          : service.resource_limits;
    } catch (e) {
      // Intentionally left empty to fall back to zero limits
    }

    if (limits.memory) {
      const memoryBytes = this.parseMemorySize(limits.memory);
      if (memoryBytes > 0) {
        hostConfig.Memory = memoryBytes;
      }
    }

    if (limits.cpu) {
      // Docker expects NanoCPUs (1 CPU = 1e9 NanoCPUs)
      const cpuVal =
        typeof limits.cpu === 'string' ? parseFloat(limits.cpu) : limits.cpu;
      if (!isNaN(cpuVal) && cpuVal > 0) {
        hostConfig.NanoCpus = Math.floor(cpuVal * 1e9);
      }
    }

    return hostConfig;
  }

  private buildHealthCheck(service: Service): HealthConfig | undefined {
    if (!service.health_check) {
      return undefined;
    }

    let check: HealthCheckConfig = {};
    try {
      check =
        typeof service.health_check === 'string'
          ? JSON.parse(service.health_check)
          : service.health_check;
    } catch (e) {
      return undefined;
    }

    // Docker Healthcheck config
    const healthConfig: HealthConfig = {};

    if (check.test && Array.isArray(check.test)) {
      healthConfig.Test = check.test;
    }

    // Docker expects times in nanoseconds for Healthcheck interval/timeout in some SDKs,
    // actually dockerode expects them in nanoseconds as numbers.
    // 1 second = 1e9 nanoseconds.
    if (check.interval) {
      healthConfig.Interval = this.parseDurationToNanoseconds(String(check.interval));
    }

    if (check.timeout) {
      healthConfig.Timeout = this.parseDurationToNanoseconds(String(check.timeout));
    }

    if (check.start_period) {
      healthConfig.StartPeriod = this.parseDurationToNanoseconds(
        String(check.start_period),
      );
    }

    if (check.retries !== undefined) {
      const retries = parseInt(check.retries as any, 10);
      if (!isNaN(retries)) {
        healthConfig.Retries = retries;
      }
    }

    return Object.keys(healthConfig).length > 0 ? healthConfig : undefined;
  }

  private parseMemorySize(sizeStr: string): number {
    if (!sizeStr) return 0;
    const match = sizeStr
      .toString()
      .toLowerCase()
      .match(/^(\d+)([kmg])?b?$/);
    if (!match) return 0;

    const val = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'k':
        return val * 1024;
      case 'm':
        return val * 1024 * 1024;
      case 'g':
        return val * 1024 * 1024 * 1024;
      default:
        return val;
    }
  }

  private parseDurationToNanoseconds(durationStr: string): number {
    if (!durationStr) return 0;
    const match = durationStr
      .toString()
      .toLowerCase()
      .match(/^(\d+)([smhd])$/);
    if (!match) return 0;

    const val = parseInt(match[1], 10);
    const unit = match[2];

    const nanosecondsPerSecond = 1e9;

    switch (unit) {
      case 's':
        return val * nanosecondsPerSecond;
      case 'm':
        return val * 60 * nanosecondsPerSecond;
      case 'h':
        return val * 60 * 60 * nanosecondsPerSecond;
      case 'd':
        return val * 24 * 60 * 60 * nanosecondsPerSecond;
      default:
        return val * nanosecondsPerSecond;
    }
  }
}
