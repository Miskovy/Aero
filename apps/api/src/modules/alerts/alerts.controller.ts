import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateAlertRuleDto } from './dto/create-alert-rule.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Audited } from '../../common/decorators/audit.decorator';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Post()
  @Audited('alert_rule.create')
  @ApiOperation({ summary: 'Create an alert rule' })
  async createRule(
    @Param('orgId') orgId: string,
    @Body() dto: CreateAlertRuleDto,
  ) {
    return this.alertsService.createRule(orgId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List alert rules' })
  async listRules(
    @Param('orgId') orgId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.alertsService.listRules(orgId, pagination);
  }

  @Delete(':ruleId')
  @Audited('alert_rule.delete')
  @ApiOperation({ summary: 'Delete an alert rule' })
  async deleteRule(
    @Param('orgId') orgId: string,
    @Param('ruleId') ruleId: string,
  ) {
    return this.alertsService.deleteRule(orgId, ruleId);
  }
}
