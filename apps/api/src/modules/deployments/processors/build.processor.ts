// import { Processor, WorkerHost } from '@nestjs/bullmq';
// import { Job } from 'bullmq';
// import { DeploymentJob, DeploymentResult } from '../../../../../../packages/shared/src/types/types';

// @Processor('deployment')
// export class BuildProcessor extends WorkerHost {
//   async process(job: Job<DeploymentJob>): Promise<DeploymentResult> {
//     const { serviceId, deploymentId, gitUrl, branch, commitSha } = job.data;

//     // Phase 1: Clone repository
//     await this.updatePhase(deploymentId, 'clone', 'Cloning repository...');
//     const repoPath = await this.gitService.clone(gitUrl, branch, commitSha);

//     // Phase 2: Detect build strategy
//     const strategy = await this.detectBuildStrategy(repoPath);
//     // → Dockerfile? Nixpacks? docker-compose.yml?

//     // Phase 3: Build image
//     await this.updatePhase(deploymentId, 'build', 'Building image...');
//     const imageTag = `aero/${service.slug}:${commitSha.substring(0, 7)}`;
//     await this.dockerService.buildImage(repoPath, { tag: imageTag });

//     // Phase 4: Deploy container
//     await this.updatePhase(deploymentId, 'deploy', 'Starting container...');
//     const containerId = await this.containerService.createFromService(service, {
//       imageTag,
//       envVars: await this.secretsService.getDecrypted(serviceId),
//     });

//     // Phase 5: Health check
//     await this.updatePhase(deploymentId, 'health_check', 'Verifying...');
//     const healthy = await this.healthCheckService.waitForHealthy(containerId, 60);

//     if (!healthy) {
//       await this.rollback(serviceId, deploymentId);
//       throw new Error('Health check failed — rolled back');
//     }

//     // Phase 6: Update routing
//     await this.updatePhase(deploymentId, 'routing', 'Configuring routes...');
//     await this.traefikService.updateRouting(service);

//     return { success: true, containerId, imageTag };
//   }
// }