import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

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
        status: status as any, // Cast to any to bypass exact enum type temporarily if prisma hasn't fully inferred
        last_heartbeat_at: status === 'online' ? new Date() : undefined
      },
    });
  }

  async updateHeartbeat(nodeId: string, metrics: any) {
    return this.prisma.node.update({
      where: { id: nodeId },
      data: { 
        last_heartbeat_at: new Date(),
        resource_usage: metrics || {}
      },
    });
  }
}
