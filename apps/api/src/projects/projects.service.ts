import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PlanQuotaService } from '../plans/plan-quota.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response';
import { Project, Prisma } from '../../generated/prisma/client';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly planQuotaService: PlanQuotaService,
  ) {}

  async listProjects(
    orgId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<Project>> {
    const { cursor, limit = 20 } = pagination;
    const take = limit + 1;

    const query: Prisma.ProjectFindManyArgs = {
      where: { organization_id: orgId },
      include: {
        _count: { select: { services: true } },
      },
      take,
      orderBy: { created_at: 'desc' },
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const items = await this.prisma.project.findMany(query);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return { data: items, meta: { cursor: nextCursor, hasMore } };
  }

  async getProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        services: {
          select: {
            id: true,
            name: true,
            slug: true,
            status: true,
            source_type: true,
          },
          take: 50,
        },
        _count: { select: { services: true, environments: true } },
      },
    });
    if (!project) throw new NotFoundException('Project not found');
    return project;
  }

  async createProject(orgId: string, name: string) {
    await this.planQuotaService.validateProjectQuota(orgId);

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

  async updateProject(
    projectId: string,
    data: { name?: string; description?: string },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.project.update({
      where: { id: projectId },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
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
    return {
      success: true,
      message: `Project '${project.name}' deleted successfully`,
    };
  }
}
