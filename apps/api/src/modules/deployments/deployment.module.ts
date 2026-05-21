import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsController } from './deployment.controller';
import { DeploymentsService } from './deployment.service';
import { BuildProcessor } from './processors/build.processor';
import { VaultModule } from '../vault/vault.module';
import { CloudflareModule } from '../cloudflare/cloudflare.module';
import { HealthCheckService } from '../health/health-check.service';
import { DockerModule } from '../docker/docker.module';
import { NetworkingModule } from '../networking/networking.module';
@Module({
  imports: [
    BullModule.registerQueue({
      name: 'deployments',
    }),
    VaultModule,
    CloudflareModule,
    DockerModule,
    NetworkingModule,
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService, BuildProcessor, HealthCheckService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
