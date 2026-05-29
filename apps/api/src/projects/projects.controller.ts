import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Query,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async listProjects(@Query('orgId') orgId: string) {
    return this.projectsService.listProjects(orgId);
  }

  @Get(':id')
  async getProject(@Param('id') id: string) {
    return this.projectsService.getProject(id);
  }

  @Post()
  async createProject(@Body() data: { orgId: string; name: string }) {
    return this.projectsService.createProject(data.orgId, data.name);
  }

  @Patch(':id')
  async updateProject(
    @Param('id') id: string,
    @Body() data: { name?: string; description?: string },
  ) {
    return this.projectsService.updateProject(id, data);
  }

  @Delete(':id')
  async deleteProject(@Param('id') id: string) {
    return this.projectsService.deleteProject(id);
  }
}
