import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';
import { MetricsGateway } from './metrics.gateway';
import { LogsGateway } from './logs.gateway';
import { DockerModule } from '../docker/docker.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [DockerModule, PrismaModule],
  controllers: [MonitoringController],
  providers: [MetricsService, MetricsGateway, LogsGateway],
  exports: [MetricsService, MetricsGateway, LogsGateway],
})
export class MonitoringModule {}
