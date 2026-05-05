import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProjects(orgId: string, userId?: string) {
    return this.prisma.project.findMany({
      where: { organization_id: orgId },
      take: 50
    });
  }

  async createProject(orgId: string, name: string) {
    const slug = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '-' + Math.random().toString(36).substring(2, 6);
    
    return this.prisma.project.create({
      data: {
        organization_id: orgId,
        name,
        slug
      }
    });
  }
}
