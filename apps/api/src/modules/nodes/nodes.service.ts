import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanQuotaService } from '../../plans/plan-quota.service';
import * as crypto from 'crypto';
import { UpdateNodeDto } from './dto/updateNode.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class NodesService {
  private readonly logger = new Logger(NodesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly planQuotaService: PlanQuotaService,
  ) {}

  /**
   * Background health checker loop running every 30 seconds.
   * Marks nodes missing heartbeats for over 2 minutes as offline.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async auditNodeHealth() {
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

    const staleNodes = await this.prisma.node.updateMany({
      where: {
        status: 'online',
        OR: [
          { last_heartbeat_at: { lt: twoMinutesAgo } },
          { last_heartbeat_at: null },
        ],
      },
      data: {
        status: 'offline',
      },
    });

    if (staleNodes.count > 0) {
      this.logger.warn(
        `Marked ${staleNodes.count} stale node(s) as offline due to missing heartbeats.`,
      );
    }
  }

  /**
   * Record telemetry heartbeat from agent daemon.
   */
  async recordHeartbeat(
    agentToken: string,
    metrics: {
      cpuUsage?: number;
      memoryUsage?: number;
      systemInfo?: Record<string, any>;
      ipAddress?: string;
    },
  ) {
    if (!agentToken) {
      throw new BadRequestException('Agent token is required');
    }

    const node = await this.prisma.node.findUnique({
      where: { agent_token: agentToken },
    });

    if (!node) {
      throw new NotFoundException('Node not registered or invalid token');
    }

    const resourceUsage = {
      cpu_usage_pct: metrics.cpuUsage ?? 0,
      memory_usage_pct: metrics.memoryUsage ?? 0,
      updated_at: new Date().toISOString(),
    };

    return this.prisma.node.update({
      where: { id: node.id },
      data: {
        status: 'online',
        last_heartbeat_at: new Date(),
        resource_usage: resourceUsage,
        ip_address: metrics.ipAddress || node.ip_address,
        system_info: (metrics.systemInfo ||
          node.system_info) as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Select optimal worker node for container deployment (least-loaded scheduler).
   */
  async selectOptimalNode(orgId: string) {
    const onlineNodes = await this.prisma.node.findMany({
      where: {
        organization_id: orgId,
        status: 'online',
      },
      include: {
        services: true,
      },
    });

    if (onlineNodes.length === 0) {
      const anyNode = await this.prisma.node.findFirst({
        where: { organization_id: orgId },
      });
      return anyNode || null;
    }

    // Sort by service count (ascending), then CPU usage (ascending)
    onlineNodes.sort((a, b) => {
      const aServices = a.services.length;
      const bServices = b.services.length;
      if (aServices !== bServices) return aServices - bServices;

      const aCpu =
        (a.resource_usage as Record<string, number> | null)?.cpu_usage_pct ?? 0;
      const bCpu =
        (b.resource_usage as Record<string, number> | null)?.cpu_usage_pct ?? 0;
      return aCpu - bCpu;
    });

    return onlineNodes[0];
  }

  async listNodes(
    orgId: string,
    pagination: PaginationDto,
    userId?: string,
  ): Promise<PaginatedResponse<any>> {
    // Validate organization access
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    if (userId) {
      const isMember = org.members.some((m) => m.user_id === userId);
      if (!isMember) throw new ForbiddenException('Access denied');
    }

    const { cursor, limit = 20 } = pagination;
    const take = limit + 1;

    const query: Prisma.NodeFindManyArgs = {
      where: { organization_id: orgId },
      orderBy: { created_at: 'desc' },
      take,
      select: {
        id: true,
        name: true,
        hostname: true,
        ip_address: true,
        status: true,
        last_heartbeat_at: true,
        system_info: true,
        resource_usage: true,
      },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const items = await this.prisma.node.findMany(query);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return { data: items, meta: { cursor: nextCursor, hasMore } };
  }

  async createNode(
    orgId: string,
    data: { name: string; hostname: string; ip_address?: string },
    userId?: string,
  ) {
    // Validate org access
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    if (userId) {
      const isMember = org.members.some((m) => m.user_id === userId);
      if (!isMember) throw new ForbiddenException('Access denied');
    }

    await this.planQuotaService.validateNodeQuota(orgId);

    // Generate secure token (64 character hex string)
    const token = crypto.randomBytes(32).toString('hex');

    return this.prisma.node.create({
      data: {
        organization_id: orgId,
        name: data.name,
        hostname: data.hostname,
        ip_address: data.ip_address,
        agent_token: token,
        status: 'offline',
        role: 'worker',
      },
    });
  }

  async removeNode(orgId: string, nodeId: string, userId?: string) {
    // Validate org access
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    if (userId) {
      // Only owners or admins should be able to delete nodes
      const membership = org.members.find((m) => m.user_id === userId);
      if (
        !membership ||
        (membership.role !== 'owner' && membership.role !== 'admin')
      ) {
        throw new ForbiddenException('Only administrators can remove nodes');
      }
    }

    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, organization_id: orgId },
    });

    if (!node) throw new NotFoundException('Node not found');

    await this.prisma.node.delete({
      where: { id: nodeId },
    });

    return { success: true };
  }

  async updateNode(
    orgId: string,
    nodeId: string,
    data: UpdateNodeDto,
    userId?: string,
  ) {
    if (!orgId || !nodeId) {
      throw new BadRequestException('Organization ID and Node ID are required');
    }

    // Validate org access
    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    if (userId) {
      const membership = org.members.find((m) => m.user_id === userId);
      if (
        !membership ||
        (membership.role !== 'owner' && membership.role !== 'admin')
      ) {
        throw new ForbiddenException('Only administrators can update nodes');
      }
    }

    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, organization_id: orgId },
    });

    if (!node) throw new NotFoundException('Node not found');

    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        ...data,
      },
    });
  }

  async getNode(orgId: string, nodeId: string, userId?: string) {
    if (!orgId || !nodeId) {
      throw new BadRequestException('Organization ID and Node ID are required');
    }

    const org = await this.prisma.organization.findUnique({
      where: { id: orgId },
      include: { members: true },
    });

    if (!org) throw new NotFoundException('Organization not found');

    if (userId) {
      const membership = org.members.find((m) => m.user_id === userId);
      if (
        !membership ||
        (membership.role !== 'owner' && membership.role !== 'admin')
      ) {
        throw new ForbiddenException('Only administrators can get nodes');
      }
    }

    const node = await this.prisma.node.findFirst({
      where: { id: nodeId, organization_id: orgId },
      include: { services: true },
    });

    if (!node) throw new NotFoundException('Node not found');

    return node;
  }
}
