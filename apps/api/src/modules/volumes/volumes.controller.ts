import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { VolumesService } from './volumes.service';
import { CreateVolumeDto } from './dto/create-volume.dto';

@ApiTags('Volumes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services/:serviceId/volumes')
export class VolumesController {
  constructor(private readonly volumesService: VolumesService) {}

  @Post()
  @ApiOperation({ summary: 'Attach a persistent volume to a service' })
  async createVolume(
    @Param('serviceId') serviceId: string,
    @Body() dto: CreateVolumeDto,
  ) {
    return this.volumesService.createVolume(serviceId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List persistent volumes for a service' })
  async listVolumes(@Param('serviceId') serviceId: string) {
    return this.volumesService.listVolumes(serviceId);
  }

  @Delete(':volumeId')
  @ApiOperation({ summary: 'Detach a volume from a service' })
  async deleteVolume(
    @Param('serviceId') serviceId: string,
    @Param('volumeId') volumeId: string,
  ) {
    return this.volumesService.deleteVolume(serviceId, volumeId);
  }
}
