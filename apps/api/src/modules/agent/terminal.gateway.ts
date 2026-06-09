import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AgentGateway } from './agent.gateway';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../../prisma/prisma.service';
import { OnEvent } from '@nestjs/event-emitter';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/terminal',
})
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TerminalGateway.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly agentGateway: AgentGateway,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const auth = client.handshake.auth as { token?: string };
    const headers = client.handshake.headers as { authorization?: string };
    const rawToken = auth.token || headers.authorization;

    if (!rawToken) {
      this.logger.warn(`Dashboard client connected without token. Disconnecting ${client.id}`);
      client.disconnect();
      return;
    }

    const token = rawToken.replace('Bearer ', '');
    const secret = this.configService.get<string>('JWT_SECRET');

    try {
      const payload = jwt.verify(token, secret!) as any;
      if (!payload || !payload.sub) {
        throw new Error('Invalid token payload');
      }
      
      // Store user ID in client data
      client.data.userId = payload.sub;
      this.logger.log(`Dashboard client (User ${payload.sub}) connected to terminal gateway.`);
    } catch (error) {
      this.logger.warn(`Invalid token for dashboard connection. Disconnecting ${client.id}`);
      client.disconnect();
      return;
    }
  }

  async handleDisconnect(client: Socket): Promise<void> {
    this.logger.log(`Dashboard client disconnected.`);
    
    // Clean up: if this client was attached to a terminal, notify the agent
    if (client.data.nodeId) {
       this.agentGateway.server.to(`node_${client.data.nodeId}`).emit('cmd_terminal_stop', {
          sessionId: client.id
       });
    }
  }

  @SubscribeMessage('terminal:start')
  async handleTerminalStart(
    client: Socket,
    payload: { nodeId: string; cols?: number; rows?: number },
  ): Promise<void> {
    const { nodeId, cols, rows } = payload;
    
    // Verify user has access to this node's organization
    const node = await this.prisma.node.findUnique({
       where: { id: nodeId },
       include: { organization: { include: { members: true } } }
    });

    if (!node) {
        client.emit('terminal:error', 'Node not found');
        return;
    }

    const hasAccess = node.organization.members.some(m => m.user_id === client.data.userId);
    if (!hasAccess) {
        client.emit('terminal:error', 'Access denied');
        return;
    }

    const room = (this.agentGateway.server as any).adapter.rooms.get(`node_${nodeId}`);
    const activeAgentsCount = room ? room.size : 0;
    if (activeAgentsCount === 0) {
        // Mark node offline if it was stale
        if (node.status !== 'offline') {
            await this.prisma.node.update({
                where: { id: nodeId },
                data: { status: 'offline' }
            });
        }
        client.emit('terminal:error', `Node is offline. Please start the agent daemon first using:\r\n\r\naero daemon start --token <token>`);
        return;
    }

    client.data.nodeId = nodeId;
    client.join(`ui_${client.id}`);

    // Tell the node agent to start a PTY session
    this.agentGateway.server.to(`node_${nodeId}`).emit('cmd_terminal_start', {
      sessionId: client.id,
      cols: cols || 80,
      rows: rows || 24,
    });
  }

  @SubscribeMessage('terminal:input')
  async handleTerminalInput(
    client: Socket,
    payload: { input: string },
  ): Promise<void> {
    const nodeId = client.data.nodeId;
    if (nodeId) {
      this.agentGateway.server.to(`node_${nodeId}`).emit('cmd_terminal_input', {
        sessionId: client.id,
        input: payload.input,
      });
    }
  }

  @SubscribeMessage('terminal:resize')
  async handleTerminalResize(
    client: Socket,
    payload: { cols: number; rows: number },
  ): Promise<void> {
    const nodeId = client.data.nodeId;
    if (nodeId) {
      this.agentGateway.server.to(`node_${nodeId}`).emit('cmd_terminal_resize', {
        sessionId: client.id,
        cols: payload.cols,
        rows: payload.rows,
      });
    }
  }

  @OnEvent('terminal.output')
  handleTerminalOutputEvent(payload: { sessionId: string, output: string }) {
    this.server.to(`ui_${payload.sessionId}`).emit('terminal:output', payload.output);
  }
}
