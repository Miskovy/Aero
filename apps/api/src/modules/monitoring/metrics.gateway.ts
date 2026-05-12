import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway(3502, { cors: true })
export class MetricsGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MetricsGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Metrics Gateway connected: ${client.id}`);
  }

  emit(event: string, data: any) {
    this.server.emit(event, data);
  }
}
