import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DockerService } from '../../docker/docker.service';
import { ContainerService } from '../../docker/container.service';
import { GitSourcesService } from 'src/modules/git/git-sources.service';
import { HealthCheckService } from 'src/modules/health/health-check.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AgentGateway } from 'src/modules/agent/agent.gateway';
import { VaultService } from 'src/modules/vault/vault.service';
import {
  DeploymentJob,
  DeploymentResult,
} from '../interfaces/deployment.interface';
import { LogPhase } from '../types/deployment.type';

@Processor('deployments')
export class BuildProcessor extends WorkerHost {
  private readonly logger = new Logger(BuildProcessor.name);

  constructor(
    private readonly gitSourcesService: GitSourcesService,
    private readonly dockerService: DockerService,
    private readonly containerService: ContainerService,
    private readonly healthCheckService: HealthCheckService,
    private readonly prisma: PrismaService,
    private readonly agentGateway: AgentGateway,
    private readonly vaultService: VaultService,
  ) {
    super();
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async updatePhase(deploymentId: string, phase: LogPhase, message: string) {
    await this.prisma.deploymentLog.create({
      data: {
        deployment_id: deploymentId,
        phase: phase,
        message,
        level: 'info',
      },
    });
  }

  async detectBuildStrategy(repoPath: string): Promise<string> {
    if (await this.fileExists(path.join(repoPath, 'docker-compose.yml'))) {
      return 'docker_compose';
    }
    if (await this.fileExists(path.join(repoPath, 'Dockerfile'))) {
      return 'dockerfile';
    }
    if (await this.fileExists(path.join(repoPath, 'nixpacks.toml'))) {
      return 'nixpacks';
    }
    return 'buildpacks';
  }

  async rollback(
    serviceId: string,
    deploymentId: string,
    failedContainerId?: string,
  ): Promise<void> {
    this.logger.warn(
      `Rolling back deployment ${deploymentId} for service ${serviceId}`,
    );
    await this.updatePhase(
      deploymentId,
      'routing',
      'Health check failed. Tearing down broken infrastructure...',
    );
    if (failedContainerId) {
      try {
        this.logger.log(`Removing failed container: ${failedContainerId}`);
        await this.dockerService.removeContainer(failedContainerId, {
          force: true,
        });
      } catch (error: unknown) {
        if (error instanceof Error) {
          this.logger.error(
            `Failed to remove broken container ${failedContainerId}: ${error.message}`,
          );
        } else {
          this.logger.error(
            `Failed to remove broken container ${failedContainerId}: ${String(error)}`,
          );
        }
      }
    }
    await this.prisma.deployment.update({
      where: { id: deploymentId },
      data: { status: 'rolled_back' },
    });
    await this.updatePhase(deploymentId, 'failed', 'Rollback complete.');
  }

  async process(job: Job<DeploymentJob>): Promise<DeploymentResult> {
    const { serviceId, deploymentId, gitUrl, branch, commitSha } = job.data;

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { variables: true, secrets: true, volumes: true, domains: true },
    });

    if (!service) {
      throw new Error(
        `Cannot process deployment: Service ${serviceId} not found.`,
      );
    }

    // Step 2: Route local deployments to the correct local device
    if (service.node_id) {
      this.logger.log(`Service ${service.id} targets Node ${service.node_id}. Delegating deployment to agent...`);
      await this.updatePhase(deploymentId, 'clone', 'Delegating deployment to remote agent...');

      const servicePayload = {
        ...service,
        variables: service.variables?.map(v => {
          try {
            const decrypted = this.vaultService.decrypt(
              v.encrypted_value,
              v.iv!,
              v.auth_tag!,
              v.key_version!
            );
            return {
              ...v,
              value: decrypted
            };
          } catch (e) {
            this.logger.error(`Failed to decrypt variable ${v.key} for service ${service.id}`);
            return { ...v, value: '' };
          }
        })
      };

      this.agentGateway.sendDeployCommand(service.node_id, {
        service: servicePayload,
        deploymentJob: job.data,
      });

      // The job technically "succeeds" locally by delegating it. It will be tracked via Socket.io logs.
      return { success: true };
    }

    try {
      await this.updatePhase(deploymentId, 'clone', 'Cloning repository...');
      const repoPath = await this.gitSourcesService.clone(
        gitUrl,
        branch,
        commitSha,
      );
      const strategy = await this.detectBuildStrategy(repoPath);

      await this.updatePhase(
        deploymentId,
        'build',
        `Building image using ${strategy}...`,
      );
      const safeCommit = commitSha ? commitSha.substring(0, 7) : 'latest';
      const imageTag = `aero/${service.slug}:${safeCommit}`;
      await this.dockerService.buildImage(repoPath, { t: imageTag });

      await this.updatePhase(deploymentId, 'deploy', 'Starting container...');

      const deployment = await this.prisma.deployment.findUnique({
        where: { id: deploymentId },
      });
      if (!deployment) throw new Error('Deployment not found');

      const containerId = await this.containerService.createFromService(
        service,
        deployment,
        imageTag,
      );

      await this.updatePhase(deploymentId, 'health_check', 'Verifying...');

      let healthy = false;
      try {
        await this.healthCheckService.waitForHealthy(containerId, 60000);
        healthy = true;
      } catch {
        this.logger.warn(
          `Health check failed for new container ${containerId}`,
        );
        healthy = false;
      }

      if (!healthy) {
        await this.rollback(serviceId, deploymentId, containerId);
        throw new Error('Health check failed — rolled back');
      }

      await this.updatePhase(
        deploymentId,
        'routing',
        'Traffic routed successfully. Cleaning up old containers...',
      );
      await this.containerService.removeOldContainers(service.id, containerId);

      await this.updatePhase(
        deploymentId,
        'completed',
        'Deployment successful',
      );
      return { success: true, containerId, imageTag };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Deployment ${deploymentId} failed: ${errorMessage}`);
      await this.updatePhase(deploymentId, 'failed', `Failed: ${errorMessage}`);
      throw error;
    }
  }
}
