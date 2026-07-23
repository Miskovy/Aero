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
import { CloudflareService } from '../../cloudflare/cloudflare.service';
import {
  DeploymentJob,
  DeploymentResult,
} from '../interfaces/deployment.interface';
import { LogPhase } from '../types/deployment.type';
import { sanitizeLogMessage } from '../../../common/utils/log-sanitizer';

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
    private readonly cloudflareService: CloudflareService,
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
        message: sanitizeLogMessage(message),
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
      this.logger.log(
        `Service ${service.id} targets Node ${service.node_id}. Delegating deployment to agent...`,
      );
      await this.updatePhase(
        deploymentId,
        'clone',
        'Delegating deployment to remote agent...',
      );

      const servicePayload = {
        ...service,
        variables: service.variables?.map((v) => {
          try {
            const decrypted = this.vaultService.decrypt(
              v.encrypted_value,
              v.iv,
              v.auth_tag,
              v.key_version,
            );
            return {
              ...v,
              value: decrypted,
            };
          } catch {
            this.logger.error(
              `Failed to decrypt variable ${v.key} for service ${service.id}`,
            );
            return { ...v, value: '' };
          }
        }),
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
      const buildWorkingDir = service.git_subdirectory
        ? path.join(repoPath, service.git_subdirectory)
        : repoPath;

      if (service.git_subdirectory) {
        const exists = await this.fileExists(buildWorkingDir);
        if (!exists) {
          throw new Error(
            `Configured git subdirectory "${service.git_subdirectory}" does not exist in the repository.`,
          );
        }
        this.logger.log(
          `Using working subdirectory for build: ${buildWorkingDir}`,
        );
      }

      let strategy = await this.detectBuildStrategy(buildWorkingDir);
      // Default Docker build context; may be overridden for monorepo builds
      let dockerBuildContext = buildWorkingDir;

      // If no Dockerfile/docker-compose found, generate one from service config
      if (strategy === 'buildpacks') {
        const buildCmd = service.build_command || 'npm run build';
        const startCmd = service.start_command || 'node index.js';
        const port = service.internal_port || 3000;

        // Detect package manager from lockfiles or build/start commands
        let packageManager: 'pnpm' | 'yarn' | 'npm' = 'npm';
        if (
          await this.fileExists(path.join(buildWorkingDir, 'pnpm-lock.yaml'))
        ) {
          packageManager = 'pnpm';
        } else if (
          await this.fileExists(path.join(repoPath, 'pnpm-lock.yaml'))
        ) {
          // Monorepo: lockfile at root, subdirectory build
          packageManager = 'pnpm';
        } else if (
          await this.fileExists(path.join(buildWorkingDir, 'yarn.lock'))
        ) {
          packageManager = 'yarn';
        } else if (await this.fileExists(path.join(repoPath, 'yarn.lock'))) {
          packageManager = 'yarn';
        } else if (buildCmd.includes('pnpm') || startCmd.includes('pnpm')) {
          packageManager = 'pnpm';
        } else if (buildCmd.includes('yarn') || startCmd.includes('yarn')) {
          packageManager = 'yarn';
        }

        // Decrypt service environment variables for build-time injection
        const envLines: string[] = [];
        if (service.variables && service.variables.length > 0) {
          for (const v of service.variables) {
            try {
              const decrypted = this.vaultService.decrypt(
                v.encrypted_value,
                v.iv,
                v.auth_tag,
                v.key_version,
              );
              envLines.push(`ENV ${v.key}=${decrypted}`);
            } catch {
              this.logger.warn(
                `Could not decrypt variable ${v.key} for build-time injection`,
              );
            }
          }
        }

        // Determine if this is a monorepo subdirectory build
        const isMonorepoSubdir =
          !!service.git_subdirectory && buildWorkingDir !== repoPath;
        const baseImage =
          packageManager === 'pnpm' ? 'node:22-alpine' : 'node:20-alpine';

        const hasPrisma = await this.fileExists(
          path.join(buildWorkingDir, 'prisma', 'schema.prisma'),
        );

        let dockerfileLines: string[];

        if (packageManager === 'pnpm' && isMonorepoSubdir) {
          // MONOREPO PNPM: multi-stage build for lean production images
          // Builder needs the full workspace for workspace:* dependency resolution
          // Production stage only copies the target subdirectory + shared packages
          const subdir = service.git_subdirectory!;

          dockerfileLines = [
            '# ── Builder Stage ──',
            `FROM ${baseImage} AS builder`,
            'WORKDIR /app',
            'RUN corepack enable && corepack prepare pnpm@9 --activate',
            '# Copy workspace config first for better Docker layer caching',
            'COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./',
            'COPY . .',
            'RUN pnpm install --frozen-lockfile || pnpm install',
            `WORKDIR /app/${subdir}`,
            ...envLines,
            ...(hasPrisma ? ['RUN npx prisma generate'] : []),
            `RUN ${buildCmd}`,
            '',
            '# ── Production Stage ──',
            `FROM ${baseImage}`,
            'WORKDIR /app',
            'RUN corepack enable && corepack prepare pnpm@9 --activate',
            '# Copy only workspace config + lockfile for production install',
            'COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./',
            `# Copy only the target app`,
            `COPY --from=builder /app/${subdir} ./${subdir}`,
            '# Copy shared workspace packages (if any)',
            'COPY --from=builder /app/packages* ./packages/',
            '# Install production dependencies only',
            'RUN pnpm install --prod --frozen-lockfile || pnpm install --prod',
            ...(hasPrisma
              ? [
                  `COPY --from=builder /app/${subdir}/generated/prisma /app/${subdir}/generated/prisma`,
                ]
              : []),
            `WORKDIR /app/${subdir}`,
            `EXPOSE ${port}`,
            `CMD ${JSON.stringify(startCmd.split(' '))}`,
          ];

          // Generate .dockerignore at repo root to reduce build context size
          const dockerignore = [
            '.git',
            'node_modules',
            '*.md',
            '.env*',
            '.vscode',
            '.idea',
            'dist',
          ].join('\n');
          await fs.writeFile(
            path.join(repoPath, '.dockerignore'),
            dockerignore,
          );

          // Write Dockerfile at repo root (the build context)
          await fs.writeFile(
            path.join(repoPath, 'Dockerfile'),
            dockerfileLines.join('\n'),
          );
          // Override the build context to repo root for monorepo
          dockerBuildContext = repoPath;

          this.logger.log(
            `Generated multi-stage monorepo Dockerfile for service ${service.slug} (subdir: ${subdir}, pkg: ${packageManager}, build: "${buildCmd}", start: "${startCmd}", envVars: ${envLines.length}, prisma: ${hasPrisma})`,
          );
        } else {
          // Standard single-project build
          let installLines: string[];
          switch (packageManager) {
            case 'pnpm':
              installLines = [
                'RUN corepack enable && corepack prepare pnpm@9 --activate',
                'COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./',
                'RUN pnpm install --frozen-lockfile || pnpm install',
              ];
              break;
            case 'yarn':
              installLines = [
                'COPY package.json yarn.lock* ./',
                'RUN yarn install --frozen-lockfile || yarn install',
              ];
              break;
            default:
              installLines = [
                'COPY package*.json ./',
                'RUN npm ci || npm install',
              ];
              break;
          }

          dockerfileLines = [
            `FROM ${baseImage}`,
            'WORKDIR /app',
            ...installLines,
            'COPY . .',
            ...envLines,
            ...(hasPrisma ? ['RUN npx prisma generate'] : []),
            `RUN ${buildCmd}`,
            `EXPOSE ${port}`,
            `CMD ${JSON.stringify(startCmd.split(' '))}`,
          ];

          await fs.writeFile(
            path.join(buildWorkingDir, 'Dockerfile'),
            dockerfileLines.join('\n'),
          );

          this.logger.log(
            `Generated Dockerfile for service ${service.slug} inside ${service.git_subdirectory || 'root'} (pkg: ${packageManager}, build: "${buildCmd}", start: "${startCmd}", envVars: ${envLines.length}, prisma: ${hasPrisma})`,
          );
        }
        strategy = 'dockerfile';
      }

      await this.updatePhase(
        deploymentId,
        'build',
        `Building image using ${strategy}...`,
      );
      const safeCommit = commitSha ? commitSha.substring(0, 7) : 'latest';
      const imageTag = `aero/${service.slug}:${safeCommit}`;

      // Stream build output to deployment logs so CLI can display it
      const buildLogBatch: string[] = [];
      const flushBuildLogs = async () => {
        if (buildLogBatch.length === 0) return;
        const batch = buildLogBatch.splice(0);
        // Store as a single log entry to avoid excessive DB writes
        await this.prisma.deploymentLog.create({
          data: {
            deployment_id: deploymentId,
            phase: 'build',
            message: sanitizeLogMessage(batch.join('\n')),
            level: 'debug',
          },
        });
      };

      // Flush every 3 seconds during build
      const flushInterval = setInterval(() => {
        flushBuildLogs().catch(() => {});
      }, 3000);

      try {
        await this.dockerService.buildImage(
          dockerBuildContext,
          { t: imageTag },
          (line) => {
            buildLogBatch.push(line);
          },
        );
      } finally {
        clearInterval(flushInterval);
        await flushBuildLogs(); // Flush remaining lines
      }

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

      // Start the container — createFromService only creates it
      try {
        await this.dockerService.startContainer(containerId);
      } catch (startErr: unknown) {
        // Container already started (304) is fine — ignore it
        const msg =
          startErr instanceof Error ? startErr.message : String(startErr);
        if (!msg.includes('304') && !msg.includes('already started')) {
          throw startErr;
        }
        this.logger.warn(`Container ${containerId} was already running`);
      }

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
        'Blue container healthy. Switching ingress traffic & draining predecessor containers...',
      );

      // Sync Cloudflare tunnel / proxy ingress rules to switch traffic to healthy Blue container
      await this.syncTunnelIngress();

      // Gracefully drain active connections on old (Green) container before removal
      await this.containerService.removeOldContainers(service.id, containerId, {
        gracefulDrainTimeoutSec: 5,
      });

      // Update service status to running
      await this.prisma.service.update({
        where: { id: serviceId },
        data: {
          status: 'running',
          active_deployment_id: deploymentId,
        },
      });

      await this.updatePhase(
        deploymentId,
        'completed',
        'Zero-downtime Blue/Green deployment successful',
      );

      // Update deployment with image tag and timestamps
      await this.prisma.deployment.update({
        where: { id: deploymentId },
        data: {
          docker_image_tag: imageTag,
          status: 'running',
          finished_at: new Date(),
        },
      });

      return { success: true, containerId, imageTag };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Deployment ${deploymentId} failed: ${errorMessage}`);
      await this.updatePhase(deploymentId, 'failed', `Failed: ${errorMessage}`);

      // Mark service as failed
      await this.prisma.service
        .update({
          where: { id: serviceId },
          data: { status: 'failed' },
        })
        .catch(() => {});

      throw error;
    }
  }

  /**
   * Sync all running Aero services into the Cloudflare tunnel ingress config.
   */
  private async syncTunnelIngress() {
    try {
      // Get all running services with their domains
      const runningServices = await this.prisma.service.findMany({
        where: { status: 'running' },
        include: { domains: true },
      });

      // Get the container IDs for each service
      const ingressEntries: {
        slug: string;
        domain: string;
        containerId: string;
        port: number;
      }[] = [];

      for (const svc of runningServices) {
        // Find the container for this service
        const containers = await this.dockerService.listContainers({
          all: false, // only running
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
        await this.cloudflareService.updateTunnelIngress(ingressEntries);
      }
    } catch (err) {
      this.logger.warn('Failed to sync tunnel ingress (non-fatal)', err);
    }
  }
}
