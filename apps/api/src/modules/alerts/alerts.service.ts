import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanQuotaService } from '../../plans/plan-quota.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class AlertsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planQuotaService: PlanQuotaService,
  ) {}

  async createRule(orgId: string, dto: CreateAlertRuleDto) {
    await this.planQuotaService.validateAlertQuota(orgId);

    return this.prisma.alertRule.create({
      data: {
        organization_id: orgId,
        service_id: dto.service_id,
        name: dto.name,
        metric: dto.metric,
        operator: dto.operator,
        threshold: dto.threshold,
        duration_seconds: dto.duration_seconds || 60,
        channel: dto.channel,
        channel_config: (dto.channel_config || {}) as Prisma.InputJsonObject,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async listRules(orgId: string, pagination: PaginationDto) {
    const { cursor, limit = 20 } = pagination;
    const take = limit + 1;

    const query: Prisma.AlertRuleFindManyArgs = {
      where: { organization_id: orgId },
      orderBy: { created_at: 'desc' },
      take,
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const items = await this.prisma.alertRule.findMany(query);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return { data: items, meta: { cursor: nextCursor, hasMore } };
  }

  async deleteRule(orgId: string, ruleId: string) {
    const rule = await this.prisma.alertRule.findFirst({
      where: { id: ruleId, organization_id: orgId },
    });
    if (!rule) throw new NotFoundException('Rule not found');
    await this.prisma.alertRule.delete({ where: { id: ruleId } });
    return { success: true, message: 'Rule deleted' };
  }
}
