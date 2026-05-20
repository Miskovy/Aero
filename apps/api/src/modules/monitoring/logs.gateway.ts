import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { DockerService } from '../docker/docker.service';
import { Socket } from 'socket.io';

@WebSocketGateway(3501, { cors: true })
export class LogsGateway implements OnGatewayConnection {
  constructor(private readonly dockerService: DockerService) {}

  handleConnection(client: Socket) {
    console.log(`Logs Gateway connected: ${client.id}`);
  }

  @SubscribeMessage('subscribe:logs')
  async handleSubscribe(client: Socket, data: { serviceId: string }) {
    console.log(
      `Client ${client.id} subscribed to logs for service ${data.serviceId}`,
    );

    try {
      // Find the running container for this service
      const containers = await this.dockerService.listContainers({
        all: false, // only running containers
        filters: { label: [`aero.service.id=${data.serviceId}`] },
      });

      if (containers.length === 0) {
        client.emit(`log:${data.serviceId}`, {
          serviceId: data.serviceId,
          message: 'Error: No active running container found for this service.\n',
          timestamp: new Date().toISOString(),
        });
        return;
      }

      const containerId = containers[0].Id;
      const container = this.dockerService.getContainer(containerId);
      
      const logStream = await container.logs({
        follow: true,
        stdout: true,
        stderr: true,
        tail: 100,
        timestamps: false,
      });

      logStream.on('data', (chunk: Buffer) => {
        client.emit(`log:${data.serviceId}`, {
          serviceId: data.serviceId,
          message: chunk.toString('utf-8'),
          timestamp: new Date().toISOString(),
        });
      });

      client.on('disconnect', () => {
        console.log(`Client ${client.id} disconnected`);
        try {
          // close/destroy the stream if supported
          (logStream as any).destroy?.();
        } catch {}
      });
    } catch (err: any) {
      client.emit(`log:${data.serviceId}`, {
        serviceId: data.serviceId,
        message: `Error retrieving logs: ${err.message}\n`,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
