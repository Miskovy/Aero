import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Prisma } from '../../../generated/prisma/client';

export interface AuditLogQueryDto extends PaginationDto {
  action?: string;
  resource_type?: string;
  user_id?: string;
}

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async listAuditLogs(orgId: string, filter: AuditLogQueryDto) {
    const { cursor, limit = 20, action, resource_type, user_id } = filter;
    const take = limit + 1;

    const where: Prisma.AuditLogWhereInput = {
      organization_id: orgId,
    };

    if (action) where.action = action;
    if (resource_type) where.resource_type = resource_type;
    if (user_id) where.user_id = user_id;

    const query: Prisma.AuditLogFindManyArgs = {
      where,
      orderBy: { created_at: 'desc' },
      take,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const items = await this.prisma.auditLog.findMany(query);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return {
      data: items,
      meta: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }
}
