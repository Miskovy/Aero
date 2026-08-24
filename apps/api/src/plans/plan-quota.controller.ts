import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { PlanQuotaService } from './plan-quota.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OrganizationQuotaSummary, QuotaItem } from './interfaces/plan-quota.interface';

@ApiTags('plans')
@Controller('plans/quota')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PlanQuotaController {
  constructor(private readonly planQuotaService: PlanQuotaService) { }

  @Get(':organizationId')
  @ApiOperation({
    summary: 'Get complete plan quota usage and limits for an organization',
  })
  @ApiResponse({
    status: 200,
    description: 'Organization quota summary returned',
  })
  async getQuotaSummary(
    @Param('organizationId') organizationId: string,
  ): Promise<OrganizationQuotaSummary> {
    return this.planQuotaService.getOrganizationQuotaSummary(organizationId);
  }

  @Get(':organizationId/reached')
  @ApiOperation({
    summary: 'Get all quotas that have been reached or exceeded for an organization',
  })
  @ApiResponse({
    status: 200,
    description: 'List of reached quota items returned',
  })
  async getReachedQuotas(
    @Param('organizationId') organizationId: string,
  ): Promise<{
    organizationId: string;
    hasReachedAnyQuota: boolean;
    reachedQuotas: QuotaItem[];
  }> {
    const reached =
      await this.planQuotaService.getReachedQuotas(organizationId);
    return {
      organizationId,
      hasReachedAnyQuota: reached.length > 0,
      reachedQuotas: reached,
    };
  }
}
