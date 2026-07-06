import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServicesService } from './services.service';
import { VaultModule } from '../vault/vault.module';
import { CloudflareModule } from '../cloudflare/cloudflare.module';
import { DockerModule } from '../docker/docker.module';
import { DeploymentsModule } from '../deployments/deployment.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ServiceAccessGuard } from './guards/service-access.guard';
import { StateReconciliationService } from './state-reconciliation.service';

@Module({
  imports: [
    PrismaModule,
    VaultModule,
    CloudflareModule,
    DockerModule,
    DeploymentsModule,
  ],
  controllers: [ServicesController],
  providers: [ServicesService, ServiceAccessGuard, StateReconciliationService],
  exports: [ServicesService, ServiceAccessGuard],
})
export class ServicesModule {}
