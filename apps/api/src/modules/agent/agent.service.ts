import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class AgentService {
  constructor(private readonly prisma: PrismaService) {}

  async authenticateNode(token: string) {
    return this.prisma.node.findUnique({
      where: { agent_token: token },
    });
  }

  async updateNodeStatus(nodeId: string, status: 'online' | 'offline') {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: status,
        last_heartbeat_at: status === 'online' ? new Date() : undefined,
      },
    });
  }

  async updateHeartbeat(nodeId: string, metrics: Prisma.InputJsonObject) {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: {
        status: 'online',
        last_heartbeat_at: new Date(),
        resource_usage: metrics || {},
      },
    });
  }
}
