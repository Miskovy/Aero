import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationDispatcherService } from './notification-dispatcher.service';

@Injectable()
export class AlertEvaluatorService {
  private readonly logger = new Logger(AlertEvaluatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly dispatcher: NotificationDispatcherService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async evaluateRules() {
    this.logger.debug('Evaluating alert rules...');
    const rules = await this.prisma.alertRule.findMany({
      where: { enabled: true },
      include: { service: true, organization: true },
    });

    for (const rule of rules) {
      try {
        // In a real implementation, this would query Prometheus or a metrics store.
        // We'll mock the evaluation logic here for the Masterclass.
        const triggered = false; // Mock

        if (triggered) {
          await this.dispatcher.dispatch(rule, {
            value: 95.5 /* mock value */,
          });
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        this.logger.error(
          `Failed to evaluate rule ${rule.id}: ${errorMessage}`,
        );
      }
    }
  }
}
