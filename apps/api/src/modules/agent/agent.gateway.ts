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
import {
  Prisma,
  LogPhase,
  LogLevel,
  DeploymentStatus,
} from '../../../generated/prisma/client';
import { AuthenticatedSocket } from './interfaces/gateway.interface';

import { PrismaService } from '../../prisma/prisma.service';
import { sanitizeLogMessage } from '../../common/utils/log-sanitizer';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/agent',
})
export class AgentGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(AgentGateway.name);

  constructor(
    private readonly agentService: AgentService,
    private readonly prisma: PrismaService,
  ) { }

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

  @SubscribeMessage('deploy_log')
  async handleDeployLog(
    client: AuthenticatedSocket,
    payload: {
      deploymentId: string;
      phase: LogPhase;
      message: string;
      level?: LogLevel;
    },
  ): Promise<void> {
    const nodeId = client.data.nodeId;
    if (nodeId && payload.deploymentId) {
      await this.prisma.deploymentLog.create({
        data: {
          deployment_id: payload.deploymentId,
          phase: payload.phase || LogPhase.build,
          message: sanitizeLogMessage(payload.message),
          level: payload.level || LogLevel.info,
        },
      });
    }
  }

  @SubscribeMessage('deploy_status')
  async handleDeployStatus(
    client: AuthenticatedSocket,
    payload: {
      deploymentId: string;
      status: DeploymentStatus;
      containerId?: string;
      imageTag?: string;
    },
  ): Promise<void> {
    const nodeId = client.data.nodeId;
    if (nodeId && payload.deploymentId) {
      await this.prisma.deployment.update({
        where: { id: payload.deploymentId },
        data: {
          status: payload.status,
          docker_image_tag: payload.imageTag || null,
          finished_at: new Date(),
        },
      });
    }
  }

  @SubscribeMessage('service_crashed')
  async handleServiceCrashed(
    client: AuthenticatedSocket,
    payload: { serviceId: string; containerName: string; exitCode: string },
  ): Promise<void> {
    const nodeId = client.data.nodeId;
    if (nodeId && payload.serviceId) {
      this.logger.warn(
        `Service ${payload.serviceId} crashed on node ${nodeId} with exit code ${payload.exitCode}`,
      );
      await this.prisma.service.update({
        where: { id: payload.serviceId },
        data: { status: 'failed' },
      });
      // Optionally add a log entry to the active deployment if we want
      const activeDeployment = await this.prisma.deployment.findFirst({
        where: { service_id: payload.serviceId },
        orderBy: { created_at: 'desc' },
      });
      if (activeDeployment) {
        await this.prisma.deploymentLog.create({
          data: {
            deployment_id: activeDeployment.id,
            phase: LogPhase.health_check,
            message: sanitizeLogMessage(`Service container crashed with exit code ${payload.exitCode}`),
            level: LogLevel.error,
          },
        });
      }
    }
  }

  // Method called by DeploymentsService to stream deployment commands down to the CLI agent
  public sendDeployCommand(nodeId: string, payload: unknown): void {
    this.logger.log(`Sending DEPLOY command to Node ${nodeId}`);
    this.server.to(`node_${nodeId}`).emit('cmd_deploy', payload);
  }
}
