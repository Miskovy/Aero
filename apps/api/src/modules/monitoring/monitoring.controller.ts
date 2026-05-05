import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MetricsService } from './metrics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('System & Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('system')
export class MonitoringController {
  constructor(private readonly metricsService: MetricsService) {}

  @Get('metrics')
  @ApiOperation({ summary: 'Get host system metrics' })
  @ApiResponse({ status: 200, description: 'Returns system metrics including CPU, memory, disk, and Docker stats' })
  async getMetrics() {
    return this.metricsService.getSystemMetrics();
  }

  @Get('docker/status')
  @ApiOperation({ summary: 'Check Docker Engine connectivity and version' })
  @ApiResponse({ status: 200, description: 'Returns Docker connection status and version' })
  async getDockerStatus() {
    return this.metricsService.getDockerStatus();
  }

  @Get('health')
  @ApiOperation({ summary: 'Control plane health check endpoint' })
  @ApiResponse({ status: 200, description: 'Returns the health status of the control plane and its dependencies' })
  async getSystemHealth() {
    return this.metricsService.getSystemHealth();
  }
}
