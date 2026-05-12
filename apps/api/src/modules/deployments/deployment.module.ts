import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsController } from './deployment.controller';
import { DeploymentsService } from './deployment.service';
import { VaultModule } from '../vault/vault.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'deployments',
    }),
    VaultModule,
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
