import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AgentService } from './agent.service';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/agent',
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AgentGateway.name);

  constructor(private readonly agentService: AgentService) {}

  async handleConnection(client: Socket) {
    const token = client.handshake.auth?.token || client.handshake.headers?.['authorization'];
    
    if (!token) {
      this.logger.warn(`Agent connected without token. Disconnecting ${client.id}`);
      return client.disconnect();
    }

    const node = await this.agentService.authenticateNode(token);
    
    if (!node) {
      this.logger.warn(`Invalid token for agent connection. Disconnecting ${client.id}`);
      return client.disconnect();
    }

    client.data.nodeId = node.id;
    client.join(`node_${node.id}`);

    await this.agentService.updateNodeStatus(node.id, 'online');
    this.logger.log(`Node ${node.name} (${node.id}) connected successfully.`);
  }

  async handleDisconnect(client: Socket) {
    const nodeId = client.data.nodeId;
    if (nodeId) {
      await this.agentService.updateNodeStatus(nodeId, 'offline');
      this.logger.log(`Node ${nodeId} disconnected.`);
    }
  }

  @SubscribeMessage('ping')
  async handlePing(client: Socket, payload: any) {
    if (client.data.nodeId) {
       await this.agentService.updateHeartbeat(client.data.nodeId, payload);
    }
    return { event: 'pong', data: { timestamp: new Date() } };
  }

  // Method called by DeploymentsService to stream deployment commands down to the CLI agent
  public sendDeployCommand(nodeId: string, payload: any) {
    this.logger.log(`Sending DEPLOY command to Node ${nodeId}`);
    this.server.to(`node_${nodeId}`).emit('cmd_deploy', payload);
  }
}
