import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogQueryDto } from './interfaces/audit-log.interface';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/audit-logs')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get organization audit logs with pagination & filtering',
  })
  async listAuditLogs(
    @Param('orgId') orgId: string,
    @Query() query: AuditLogQueryDto,
  ) {
    return this.auditLogsService.listAuditLogs(orgId, query);
  }
}
