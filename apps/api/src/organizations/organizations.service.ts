import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizations(userId?: string) {
    if (!userId) {
      return this.prisma.organization.findMany({ take: 50 });
    }
    return this.prisma.organization.findMany({
      where: {
        members: {
          some: { user_id: userId }
        }
      },
      take: 50
    });
  }

  async createOrganization(name: string, userId?: string) {
    const slug = name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase() + '-' + Math.random().toString(36).substring(2, 6);

    if (!userId) {
      // Ideally handled by guards, but just in case
      return this.prisma.organization.create({
        data: {
          name,
          slug,
          owner_id: '00000000-0000-0000-0000-000000000000', // fallback uuid
        }
      });
    }

    return this.prisma.organization.create({
      data: {
        name,
        slug,
        owner_id: userId,
        members: {
          create: {
            user_id: userId,
            role: 'owner'
          }
        }
      }
    });
  }
}
