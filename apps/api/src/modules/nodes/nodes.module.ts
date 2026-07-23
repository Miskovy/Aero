import { Module } from '@nestjs/common';
import { NodesController, NodeHeartbeatController } from './nodes.controller';
import { NodesService } from './nodes.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [NodesController, NodeHeartbeatController],
  providers: [NodesService],
  exports: [NodesService],
})
export class NodesModule {}
