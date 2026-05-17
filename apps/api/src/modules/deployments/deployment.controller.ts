import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  Req,
  Body,
} from '@nestjs/common';
import { DeploymentsService } from './deployment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Delete, Patch } from '@nestjs/common';

@Controller()
@UseGuards(JwtAuthGuard)
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post('services')
  async createService(
    @Body() data: CreateServiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.createService(data, userId);
  }

  @Get('services')
  async listServices(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    return this.deploymentsService.listAllServices(userId);
  }

  @Get('services/:serviceId')
  async getService(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.getServiceDetails(serviceId, userId);
  }

  @Patch('services/:serviceId')
  async updateService(
    @Param('serviceId') serviceId: string,
    @Body() data: UpdateServiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.updateService(serviceId, data, userId);
  }

  @Delete('services/:serviceId')
  async deleteService(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.deleteService(serviceId, userId);
  }

  @Post('services/:serviceId/start')
  async startService(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.startService(serviceId, userId);
  }

  @Post('services/:serviceId/stop')
  async stopService(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.stopService(serviceId, userId);
  }

  @Post('services/:serviceId/restart')
  async restartService(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.restartService(serviceId, userId);
  }

  @Post('services/:serviceId/deployments')
  async triggerDeploy(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.triggerDeployment(serviceId, userId);
  }

  @Get('services/:serviceId/deployments')
  async listDeployments(
    @Param('serviceId') serviceId: string,
    @Query('limit') limit?: string,
  ) {
    const take = limit ? parseInt(limit, 10) : 10;
    return this.deploymentsService.listDeployments(serviceId, take);
  }

  @Get('services/:serviceId/deployments/:id')
  async getDeploymentDetails(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
  ) {
    return this.deploymentsService.getDeploymentDetails(
      serviceId,
      deploymentId,
    );
  }

  @Post('services/:serviceId/deployments/:id/rollback')
  async triggerRollback(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
  ) {
    return this.deploymentsService.triggerRollback(serviceId, deploymentId);
  }

  @Post('services/:serviceId/deployments/:id/cancel')
  async cancelDeployment(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
  ) {
    return this.deploymentsService.cancelDeployment(serviceId, deploymentId);
  }
}
