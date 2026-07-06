import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Body,
  Patch,
  Delete,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ServiceAccessGuard } from './guards/service-access.guard';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';
import { CreateServiceDto } from '../deployments/dto/create-service.dto';
import { UpdateServiceDto } from '../deployments/dto/update-service.dto';

@Controller('services')
@UseGuards(JwtAuthGuard, ServiceAccessGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Post()
  async createService(
    @Body() data: CreateServiceDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.servicesService.createService(data, userId);
  }

  @Get()
  async listServices(@Req() req: AuthenticatedRequest) {
    const userId = req.user?.id;
    return this.servicesService.listAllServices(userId);
  }

  @Get(':serviceId')
  async getService(@Param('serviceId') serviceId: string) {
    return this.servicesService.getServiceDetails(serviceId);
  }

  @Patch(':serviceId')
  async updateService(
    @Param('serviceId') serviceId: string,
    @Body() data: UpdateServiceDto,
  ) {
    return this.servicesService.updateService(serviceId, data);
  }

  @Delete(':serviceId')
  async deleteService(@Param('serviceId') serviceId: string) {
    return this.servicesService.deleteService(serviceId);
  }

  @Post(':serviceId/start')
  async startService(@Param('serviceId') serviceId: string) {
    return this.servicesService.startService(serviceId);
  }

  @Post(':serviceId/stop')
  async stopService(@Param('serviceId') serviceId: string) {
    return this.servicesService.stopService(serviceId);
  }

  @Post(':serviceId/restart')
  async restartService(@Param('serviceId') serviceId: string) {
    return this.servicesService.restartService(serviceId);
  }

  @Post(':serviceId/scale')
  async scaleService(
    @Param('serviceId') serviceId: string,
    @Body() body: { replicas: number },
  ) {
    return this.servicesService.updateService(serviceId, {
      replicas: body.replicas,
    });
  }
}
