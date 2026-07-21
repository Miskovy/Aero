import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { BackupsService } from './backups.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuthenticatedRequest } from '../../common/interfaces/Authenticated.interface';

@ApiTags('Backups')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services/:serviceId/backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Post()
  @ApiOperation({ summary: 'Trigger manual service backup' })
  async createBackup(
    @Param('serviceId') serviceId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.backupsService.createBackup(serviceId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List backups for a service' })
  async listBackups(
    @Param('serviceId') serviceId: string,
    @Query() query: PaginationDto,
  ) {
    return this.backupsService.listBackups(serviceId, query);
  }

  @Post(':backupId/restore')
  @ApiOperation({ summary: 'Restore a service backup' })
  async restoreBackup(
    @Param('serviceId') serviceId: string,
    @Param('backupId') backupId: string,
  ) {
    return this.backupsService.restoreBackup(serviceId, backupId);
  }

  @Delete(':backupId')
  @ApiOperation({ summary: 'Delete a service backup' })
  async deleteBackup(
    @Param('serviceId') serviceId: string,
    @Param('backupId') backupId: string,
  ) {
    return this.backupsService.deleteBackup(serviceId, backupId);
  }
}
