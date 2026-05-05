import { WebSocketGateway, SubscribeMessage, OnGatewayConnection } from '@nestjs/websockets';
import { DockerService } from '../docker/docker.service';
import { Socket } from 'socket.io';

@WebSocketGateway(3501, { cors: true })
export class LogsGateway implements OnGatewayConnection {
    constructor(private readonly dockerService: DockerService) { }

    async handleConnection(client: Socket) {
        console.log(`Logs Gateway connected: ${client.id}`);
    }

    @SubscribeMessage('subscribe:logs')
    async handleSubscribe(client: Socket, data: { serviceId: string }) {
        console.log(`Client ${client.id} subscribed to logs for service ${data.serviceId}`);
        const container = this.dockerService.getContainer(data.serviceId);
        const logStream = await container.logs({
            follow: true,
            stdout: true,
            stderr: true,
            tail: 100,
            timestamps: true,
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
        });
    }
}