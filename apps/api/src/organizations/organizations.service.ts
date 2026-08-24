import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response';
import {
  Organization,
  Prisma,
  OrgRole,
  TeamRole,
  SubscriptionStatus,
  BillingCycle,
} from '../../generated/prisma/client';
import { PlansService } from '../plans/plans.service';
import { TeamsService } from '../teams/teams.service';
import { TeamMembersService } from '../teams/teamMembers.service';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly plansService: PlansService,
    private readonly teamsService: TeamsService,
    private readonly teamMembersService: TeamMembersService,
  ) {}

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

  async createOrganization(
    name: string,
    userId?: string,
  ): Promise<Organization> {
    const slug =
      name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() +
      '-' +
      Math.random().toString(36).substring(2, 6);

    if (!userId) {
      throw new UnauthorizedException('Invalid User');
    }

    const plan = await this.plansService.getPlanbyName('FREE');

    if (!plan) {
      throw new BadRequestException('Invalid Plan');
    }

    return await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name,
          slug,
          owner_id: userId,
          plan_id: plan.id,
          plan: plan.name,
          members: {
            create: {
              user_id: userId,
              role: OrgRole.owner,
            },
          },
        },
      });

      await tx.organizationSubscription.create({
        data: {
          organization_id: organization.id,
          plan_id: plan.id,
          status: SubscriptionStatus.active,
          billing_cycle: BillingCycle.monthly,
          current_period_start: new Date(),
        },
      });

      const team = await this.teamsService.createTeam(
        {
          name: `${name} Team`,
          organization_id: organization.id,
        },
        tx,
      );

      await this.teamMembersService.createTeamMember(
        {
          team_id: team.id,
          user_id: userId,
          role: TeamRole.lead,
        },
        tx,
      );

      return organization;
    });
  }

  async getOrganizationSubscription(organizationId: string) {
    const subscription = await this.prisma.organizationSubscription.findUnique({
      where: { organization_id: organizationId },
      include: {
        plan: true,
        payments: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
      },
    });

    if (!subscription) {
      throw new NotFoundException(
        'Subscription not found for this organization',
      );
    }

    return subscription;
  }
}
