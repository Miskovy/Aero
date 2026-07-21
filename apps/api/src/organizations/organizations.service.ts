import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response';
import { Organization, Prisma } from '../../generated/prisma/client';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizations(
    pagination: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<Organization>> {
    const { cursor, limit = 20 } = pagination;
    const take = limit + 1;

    const query: Prisma.OrganizationFindManyArgs = {
      take,
      orderBy: { created_at: 'desc' },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    if (userId) {
      query.where = {
        members: {
          some: { user_id: userId },
        },
      };
    }

    const items = await this.prisma.organization.findMany(query);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return { data: items, meta: { cursor: nextCursor, hasMore } };
  }

  async createOrganization(name: string, userId?: string) {
    const slug =
      name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() +
      '-' +
      Math.random().toString(36).substring(2, 6);

    if (!userId) {
      // Ideally handled by guards, but just in case
      return this.prisma.organization.create({
        data: {
          name,
          slug,
          owner_id: '00000000-0000-0000-0000-000000000000', // fallback uuid
        },
      });
    }

    return this.prisma.organization.create({
      data: {
        name,
        slug,
        owner_id: userId,
        members: {
          create: {
            user_id: userId,
            role: 'owner',
          },
        },
      },
    });
  }
}
