import { Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MetricsService } from './metrics.service';
import { MetricsGateway } from './metrics.gateway';
import { LogsGateway } from './logs.gateway';

@Module({
  controllers: [MonitoringController],
  providers: [MetricsService, MetricsGateway, LogsGateway],
  exports: [MetricsService, MetricsGateway, LogsGateway],
})
export class MonitoringModule {}
