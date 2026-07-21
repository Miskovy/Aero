import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';
import { AlertEvaluatorService } from './alert-evaluator.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { MailModule } from '../../mail/mail.module';

@Module({
  imports: [PrismaModule, MailModule],
  controllers: [AlertsController],
  providers: [
    AlertsService,
    AlertEvaluatorService,
    NotificationDispatcherService,
  ],
  exports: [AlertsService],
})
export class AlertsModule {}
