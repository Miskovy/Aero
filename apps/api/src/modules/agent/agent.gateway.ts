import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server } from 'socket.io';
import { AgentService } from './agent.service';
import { Logger } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { AuthenticatedSocket } from './interfaces/gateway.interface';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/agent',
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AgentGateway.name);

  constructor(private readonly agentService: AgentService) {}

  async handleConnection(client: AuthenticatedSocket): Promise<void> {
    const auth = client.handshake.auth as { token?: string };
    const headers = client.handshake.headers as { authorization?: string };
    const token = auth.token || headers.authorization;

    if (!token) {
      this.logger.warn(
        `Agent connected without token. Disconnecting ${client.id}`,
      );
      client.disconnect();
      return;
    }

    const node = await this.agentService.authenticateNode(token);

    if (!node) {
      this.logger.warn(
        `Invalid token for agent connection. Disconnecting ${client.id}`,
      );
      client.disconnect();
      return;
    }

    client.data.nodeId = node.id;
    void client.join(`node_${node.id}`);

    await this.agentService.updateNodeStatus(node.id, 'online');
    this.logger.log(`Node ${node.name} (${node.id}) connected successfully.`);
  }

  async handleDisconnect(client: AuthenticatedSocket): Promise<void> {
    const nodeId = client.data.nodeId;
    if (nodeId) {
      await this.agentService.updateNodeStatus(nodeId, 'offline');
      this.logger.log(`Node ${nodeId} disconnected.`);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(
    client: AuthenticatedSocket,
    payload: Prisma.InputJsonObject,
  ): Promise<unknown> {
    const nodeId = client.data.nodeId;
    if (nodeId) {
      await this.agentService.updateHeartbeat(nodeId, payload);
    }
    return { event: 'pong', data: { timestamp: new Date() } };
  }

  // Method called by DeploymentsService to stream deployment commands down to the CLI agent
  public sendDeployCommand(nodeId: string, payload: unknown): void {
    this.logger.log(`Sending DEPLOY command to Node ${nodeId}`);
    this.server.to(`node_${nodeId}`).emit('cmd_deploy', payload);
  }
}
