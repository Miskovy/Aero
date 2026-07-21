import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateVolumeDto } from './dto/create-volume.dto';

@Injectable()
export class VolumesService {
  constructor(private readonly prisma: PrismaService) {}

  async createVolume(serviceId: string, dto: CreateVolumeDto) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const volume = await this.prisma.serviceVolume.create({
      data: {
        service_id: serviceId,
        name: dto.name,
        mount_path: dto.mount_path,
        host_path: dto.host_path || null,
        driver: dto.driver || 'local',
      },
    });

    return {
      ...volume,
      size_bytes: Number(volume.size_bytes || 0),
    };
  }

  async listVolumes(serviceId: string) {
    const volumes = await this.prisma.serviceVolume.findMany({
      where: { service_id: serviceId },
      orderBy: { created_at: 'asc' },
    });

    return volumes.map((vol) => ({
      ...vol,
      size_bytes: Number(vol.size_bytes || 0),
    }));
  }

  async deleteVolume(serviceId: string, volumeId: string) {
    const volume = await this.prisma.serviceVolume.findFirst({
      where: { id: volumeId, service_id: serviceId },
    });

    if (!volume) {
      throw new NotFoundException('Volume not found');
    }

    await this.prisma.serviceVolume.delete({
      where: { id: volumeId },
    });

    return { success: true, message: 'Volume deleted successfully' };
  }
}
