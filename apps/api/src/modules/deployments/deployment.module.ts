import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { DeploymentsController } from './deployment.controller';
import { DeploymentsService } from './deployment.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'deployments',
    }),
  ],
  controllers: [DeploymentsController],
  providers: [DeploymentsService],
  exports: [DeploymentsService],
})
export class DeploymentsModule {}
