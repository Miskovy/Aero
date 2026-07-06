import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuthenticatedRequest } from '../../../common/interfaces/Authenticated.interface';

@Injectable()
export class ServiceAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const serviceId = request.params.serviceId as string | undefined;
    const userId = request.user?.id;

    if (!serviceId) {
      return true; // Pass through if no serviceId param
    }

    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: {
        project: {
          include: {
            organization: {
              include: { members: true },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundException('Service not found');
    }

    if (userId) {
      const isMember = service.project.organization.members.some(
        (m) => m.user_id === userId,
      );
      if (!isMember) {
        throw new ForbiddenException('Access denied');
      }
    }

    return true;
  }
}
