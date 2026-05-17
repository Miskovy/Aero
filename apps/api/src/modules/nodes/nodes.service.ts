import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as crypto from 'crypto';
import { UpdateNodeDto } from './dto/updateNode.dto';

@Injectable()
export class NodesService {
  constructor(private readonly prisma: PrismaService) { }

  async listNodes(orgId: string, userId?: string) {
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

    // Exclude the agent_token from the list view for security
    return this.prisma.node.findMany({
      where: { organization_id: orgId },
      orderBy: { created_at: 'desc' },
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
    });
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
    userId?: string) {

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
        ...data
      },
    });
  }

  async getNode(
    orgId: string,
    nodeId: string,
    userId?: string
  ) {
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
    });

    if (!node) throw new NotFoundException('Node not found');

    return node;
  }

}
