import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
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

  @Post()
  async createProject(@Body() data: { orgId: string; name: string }) {
    return this.projectsService.createProject(data.orgId, data.name);
  }
}
