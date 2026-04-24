/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars */
import { Injectable } from '@nestjs/common';
import { Service, Deployment } from '../../../generated/prisma/client';
import { HostRestartPolicy, HostConfig, HealthConfig } from 'dockerode';
import * as Docker from 'dockerode';
import { DockerService } from './docker.service';

@Injectable()
export class ContainerService {
  constructor(private readonly dockerService: DockerService) {}

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

  // Apply Aero labels for tracking
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

  // Inject environment variables and secrets
  private buildEnvironment(
    service: Service & { variables?: any[]; secrets?: any[] },
  ): string[] {
    const env: string[] = [];
    if (service.variables) {
      service.variables.forEach((v) => env.push(`${v.key}=${v.value}`));
    }
    if (service.secrets) {
      // In a real app, secrets should be resolved from a secure store
      service.secrets.forEach((s) => env.push(`${s.key}=${s.value}`));
    }
    return env;
  }

  // Configure restart policy
  private buildRestartPolicy(_service: Service): HostRestartPolicy {
    return { Name: 'unless-stopped' };
  }

  // Configure resource limits
  private buildResourceLimits(_service: Service): HostConfig {
    return {
      // Add default or service-specific memory/cpu limits here
    };
  }

  // Configure health check
  private buildHealthCheck(_service: Service): HealthConfig {
    // Return undefined or empty if no specific healthcheck is configured
    return {};
  }
}
