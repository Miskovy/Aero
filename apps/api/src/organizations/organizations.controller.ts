import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async listOrganizations(@Req() req: any) {
    const userId = req.user?.id;
    return this.organizationsService.listOrganizations(userId);
  }

  @Post()
  async createOrganization(@Body() data: { name: string }, @Req() req: any) {
    const userId = req.user?.id;
    return this.organizationsService.createOrganization(data.name, userId);
  }
}
