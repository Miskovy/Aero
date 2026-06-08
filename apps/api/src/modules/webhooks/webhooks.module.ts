import { Module, forwardRef } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksService } from './webhooks.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { DeploymentsModule } from '../deployments/deployment.module';

@Module({
  imports: [PrismaModule, forwardRef(() => DeploymentsModule)],
  controllers: [WebhooksController],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}
