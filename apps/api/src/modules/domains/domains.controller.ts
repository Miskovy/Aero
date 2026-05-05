import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DomainsService } from './domain.service';
import { AddDomainDto } from './dto/domain.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Domains')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('services/:serviceId/domains')
export class DomainsController {
  constructor(private readonly domainsService: DomainsService) {}

  @Get()
  @ApiOperation({ summary: 'List all domains for a service' })
  async listDomains(@Param('serviceId') serviceId: string) {
    return this.domainsService.listDomains(serviceId);
  }

  @Post()
  @ApiOperation({ summary: 'Add a custom domain to a service (Pro Only)' })
  async addDomain(
    @Param('serviceId') serviceId: string,
    @Body() dto: AddDomainDto
  ) {
    return this.domainsService.addCustomDomain(serviceId, dto.domain);
  }

  @Post(':domainId/verify')
  @ApiOperation({ summary: 'Verify DNS for a custom domain' })
  async verifyDomain(
    @Param('serviceId') serviceId: string,
    @Param('domainId') domainId: string
  ) {
    return this.domainsService.verifyDomain(serviceId, domainId);
  }

  @Delete(':domainId')
  @ApiOperation({ summary: 'Remove a domain from a service' })
  async removeDomain(
    @Param('serviceId') serviceId: string,
    @Param('domainId') domainId: string
  ) {
    return this.domainsService.removeDomain(serviceId, domainId);
  }
}
