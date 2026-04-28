import { Controller, Get, Post, Param, Query, UseGuards, Req } from '@nestjs/common';
import { DeploymentsService } from './deployment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('services/:serviceId/deployments')
@UseGuards(JwtAuthGuard)
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post()
  async triggerDeploy(
    @Param('serviceId') serviceId: string,
    @Req() req: any // Request object to get the authenticated user
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.triggerDeployment(serviceId, userId);
  }

  @Get()
  async listDeployments(
    @Param('serviceId') serviceId: string,
    @Query('limit') limit?: string
  ) {
    const take = limit ? parseInt(limit, 10) : 10;
    return this.deploymentsService.listDeployments(serviceId, take);
  }

  @Get(':id')
  async getDeploymentDetails(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string
  ) {
    return this.deploymentsService.getDeploymentDetails(serviceId, deploymentId);
  }

  @Post(':id/rollback')
  async triggerRollback(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
    @Req() req: any
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.triggerRollback(serviceId, deploymentId, userId);
  }

  @Post(':id/cancel')
  async cancelDeployment(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string
  ) {
    return this.deploymentsService.cancelDeployment(serviceId, deploymentId);
  }
}