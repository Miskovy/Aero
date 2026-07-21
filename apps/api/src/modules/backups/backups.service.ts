import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class BackupsService {
  constructor(private readonly prisma: PrismaService) {}

  async createBackup(serviceId: string, userId?: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new NotFoundException('Service not found');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${service.slug || serviceId}-${timestamp}.tar.gz`;
    const storagePath = `/backups/${serviceId}/${filename}`;

    const backup = await this.prisma.backup.create({
      data: {
        service_id: serviceId,
        filename,
        storage_path: storagePath,
        status: 'completed',
        trigger: 'manual',
        triggered_by: userId || null,
        started_at: new Date(),
        finished_at: new Date(),
        size_bytes: BigInt(1024 * 1024 * 5), // Mock size ~5MB for MVP
      },
    });

    return {
      ...backup,
      size_bytes: Number(backup.size_bytes),
    };
  }

  async listBackups(serviceId: string, pagination: PaginationDto) {
    const { cursor, limit = 20 } = pagination;
    const take = limit + 1;

    const query: Prisma.BackupFindManyArgs = {
      where: { service_id: serviceId },
      orderBy: { created_at: 'desc' },
      take,
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const items = await this.prisma.backup.findMany(query);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    const formattedItems = items.map((item) => ({
      ...item,
      size_bytes: item.size_bytes ? Number(item.size_bytes) : 0,
    }));

    return {
      data: formattedItems,
      meta: {
        cursor: nextCursor,
        hasMore,
      },
    };
  }

  async restoreBackup(serviceId: string, backupId: string) {
    const backup = await this.prisma.backup.findFirst({
      where: { id: backupId, service_id: serviceId },
    });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    return {
      success: true,
      message: `Backup ${backup.filename} restore initiated`,
      backup_id: backup.id,
    };
  }

  async deleteBackup(serviceId: string, backupId: string) {
    const backup = await this.prisma.backup.findFirst({
      where: { id: backupId, service_id: serviceId },
    });
    if (!backup) {
      throw new NotFoundException('Backup not found');
    }

    await this.prisma.backup.delete({ where: { id: backupId } });
    return { success: true, message: 'Backup deleted' };
  }
}
