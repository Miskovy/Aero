import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../common/interfaces/Authenticated.interface';
import { PaginationDto } from '../common/dto/pagination.dto';

@Controller('organizations')
@UseGuards(JwtAuthGuard)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Get()
  async listOrganizations(
    @Req() req: AuthenticatedRequest,
    @Query() pagination: PaginationDto,
  ) {
    const userId = req.user?.id;
    return this.organizationsService.listOrganizations(pagination, userId);
  }

  @Post()
  async createOrganization(
    @Body() data: { name: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const userId = req.user?.id;
    return this.organizationsService.createOrganization(data.name, userId);
  }
}
