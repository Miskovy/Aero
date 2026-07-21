import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AlertRule,
  Organization,
  Service,
  AlertChannel,
} from '../../../generated/prisma/client';
import { MailService } from '../../mail/mail.service';

type RuleWithRelations = AlertRule & {
  organization: Organization;
  service: Service | null;
};

@Injectable()
export class NotificationDispatcherService {
  private readonly logger = new Logger(NotificationDispatcherService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  async dispatch(rule: RuleWithRelations, eventData: Record<string, unknown>) {
    this.logger.log(`Dispatching alert for rule ${rule.name}`);

    const message = `Alert triggered: ${rule.name} for service ${rule.service?.name || 'Global'}. Metric: ${rule.metric} ${rule.operator} ${rule.threshold}. Current value: ${String(eventData.value)}`;
    const title = `[Aero] Alert: ${rule.name}`;

    const notification = await this.prisma.notification.create({
      data: {
        alert_rule_id: rule.id,
        title,
        message,
        channel: rule.channel,
        status: 'pending',
      },
    });

    try {
      if (
        rule.channel === AlertChannel.slack ||
        rule.channel === AlertChannel.discord ||
        rule.channel === AlertChannel.webhook
      ) {
        const config = rule.channel_config as Record<string, unknown> | null;
        const webhookUrl = config?.webhook_url as string | undefined;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message, text: message }),
          });
        }
      } else if (rule.channel === AlertChannel.email) {
        const config = rule.channel_config as Record<string, unknown> | null;
        const emails = (config?.emails as string[]) || [];
        for (const email of emails) {
          await this.mailService.sendGenericEmail(email, title, message);
        }
      }

      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'sent', sent_at: new Date() },
      });

      await this.prisma.alertRule.update({
        where: { id: rule.id },
        data: { last_triggered_at: new Date() },
      });
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error(
        `Failed to dispatch notification ${notification.id}: ${errorMessage}`,
      );
      await this.prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'failed' },
      });
    }
  }
}
