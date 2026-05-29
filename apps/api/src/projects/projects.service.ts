import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async listProjects(orgId: string) {
    return this.prisma.project.findMany({
      where: { organization_id: orgId },
      include: {
        _count: { select: { services: true } },
      },
      take: 50,
    });
  }

  async getProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        services: {
          select: { id: true, name: true, slug: true, status: true, source_type: true },
          take: 50,
        },
        _count: { select: { services: true, environments: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async createProject(orgId: string, name: string) {
    const slug =
      name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() +
      '-' +
      Math.random().toString(36).substring(2, 6);

    return this.prisma.project.create({
      data: {
        organization_id: orgId,
        name,
        slug,
      },
    });
  }

  async updateProject(projectId: string, data: { name?: string; description?: string }) {
    const project = await this.prisma.project.findUnique({ where: { id: projectId } });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
      },
    });
  }

  async deleteProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { _count: { select: { services: true } } },
    });
    if (!project) throw new NotFoundException('Project not found');

    await this.prisma.project.delete({ where: { id: projectId } });
    return { success: true, message: `Project '${project.name}' deleted successfully` };
  }
}
