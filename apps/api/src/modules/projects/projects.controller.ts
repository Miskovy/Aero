import { Controller, Get, Post, Query, Body, UseGuards, Req } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async listProjects(@Query('orgId') orgId: string, @Req() req: any) {
    const userId = req.user?.id;
    return this.projectsService.listProjects(orgId, userId);
  }

  @Post()
  async createProject(@Body() data: { orgId: string, name: string }, @Req() req: any) {
    return this.projectsService.createProject(data.orgId, data.name);
  }
}
