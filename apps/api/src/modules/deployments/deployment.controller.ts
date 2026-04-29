import { Controller, Get, Post, Param, Query, UseGuards, Req, Body } from '@nestjs/common';
import { DeploymentsService } from './deployment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post('services')
  async createService(@Body() data: any, @Req() req: any) {
    const userId = req.user?.id;
    return this.deploymentsService.createService(data, userId);
  }

  @Get('services')
  async listServices(@Req() req: any) {
    const userId = req.user?.id;
    return this.deploymentsService.listAllServices(userId);
  }

  @Post('services/:serviceId/deployments')
  async triggerDeploy(
    @Param('serviceId') serviceId: string,
    @Req() req: any
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.triggerDeployment(serviceId, userId);
  }

  @Get('services/:serviceId/deployments')
  async listDeployments(
    @Param('serviceId') serviceId: string,
    @Query('limit') limit?: string
  ) {
    const take = limit ? parseInt(limit, 10) : 10;
    return this.deploymentsService.listDeployments(serviceId, take);
  }

  @Get('services/:serviceId/deployments/:id')
  async getDeploymentDetails(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string
  ) {
    return this.deploymentsService.getDeploymentDetails(serviceId, deploymentId);
  }

  @Post('services/:serviceId/deployments/:id/rollback')
  async triggerRollback(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
    @Req() req: any
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.triggerRollback(serviceId, deploymentId, userId);
  }

  @Post('services/:serviceId/deployments/:id/cancel')
  async cancelDeployment(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string
  ) {
    return this.deploymentsService.cancelDeployment(serviceId, deploymentId);
  }
}
