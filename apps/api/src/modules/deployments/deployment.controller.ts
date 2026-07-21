import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { DeploymentsService } from './deployment.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';

@Controller('services')
@UseGuards(JwtAuthGuard)
export class DeploymentsController {
  constructor(private readonly deploymentsService: DeploymentsService) {}

  @Post(':serviceId/deployments')
  async triggerDeploy(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.deploymentsService.triggerDeployment(serviceId, userId);
  }

  @Get(':serviceId/deployments')
  async listDeployments(
    @Param('serviceId') serviceId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.deploymentsService.listDeployments(serviceId, pagination);
  }

  @Get(':serviceId/deployments/:id')
  async getDeploymentDetails(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
  ) {
    return this.deploymentsService.getDeploymentDetails(
      serviceId,
      deploymentId,
    );
  }

  @Get(':serviceId/deployments/:id/logs')
  async getDeploymentLogs(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.deploymentsService.getDeploymentLogs(
      serviceId,
      deploymentId,
      pagination,
    );
  }

  @Post(':serviceId/deployments/:id/rollback')
  async triggerRollback(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
  ) {
    return this.deploymentsService.triggerRollback(serviceId, deploymentId);
  }

  @Post(':serviceId/deployments/:id/cancel')
  async cancelDeployment(
    @Param('serviceId') serviceId: string,
    @Param('id') deploymentId: string,
  ) {
    return this.deploymentsService.cancelDeployment(serviceId, deploymentId);
  }
}
