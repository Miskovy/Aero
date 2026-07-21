import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_ACTION_KEY } from '../decorators/audit.decorator';
import { AuthenticatedRequest } from '../interfaces/Authenticated.interface';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const action = this.reflector.get<string>(
      AUDIT_ACTION_KEY,
      context.getHandler(),
    );

    // Only audit if the decorator is present
    if (!action) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.user?.id;
    const ipAddress =
      request.ip ||
      request.headers['x-forwarded-for'] ||
      request.socket?.remoteAddress;
    const userAgent = request.headers['user-agent'];
    const resourceType = request.url.split('?')[0].split('/')[3] || 'unknown'; // api/v1/resourceType
    const params = request.params as Record<string, unknown> | undefined;
    const body = request.body as Record<string, unknown> | undefined;

    const rawResourceId =
      params?.id || params?.serviceId || params?.orgId || null;
    const resourceId =
      typeof rawResourceId === 'string'
        ? rawResourceId
        : Array.isArray(rawResourceId)
          ? String(rawResourceId[0])
          : null;

    const rawOrganizationId =
      params?.orgId || body?.organization_id || body?.orgId;
    let organizationId: string | null =
      typeof rawOrganizationId === 'string'
        ? rawOrganizationId
        : Array.isArray(rawOrganizationId)
          ? String(rawOrganizationId[0])
          : null;

    return next.handle().pipe(
      tap((response: unknown) => {
        (async () => {
          try {
            if (!organizationId) {
              if (request.params?.serviceId) {
                const serviceId =
                  typeof request.params.serviceId === 'string'
                    ? request.params.serviceId
                    : request.params.serviceId[0];
                const service = await this.prisma.service.findUnique({
                  where: { id: serviceId },
                  include: { project: true },
                });
                if (service) organizationId = service.project.organization_id;
              }
              if (!organizationId && request.params?.projectId) {
                const projectId =
                  typeof request.params.projectId === 'string'
                    ? request.params.projectId
                    : request.params.projectId[0];
                const project = await this.prisma.project.findUnique({
                  where: { id: projectId },
                });
                if (project) organizationId = project.organization_id;
              }
              if (!organizationId) {
                this.logger.warn(
                  `Could not determine organization_id for audit log: ${action}`,
                );
                return;
              }
            }

            const newValue = (
              response ? JSON.parse(JSON.stringify(response)) : null
            ) as Prisma.InputJsonValue;

            // Fire and forget
            this.prisma.auditLog
              .create({
                data: {
                  organization_id: organizationId,
                  user_id: userId as string,
                  action,
                  resource_type: resourceType,
                  resource_id: resourceId,
                  new_value: newValue,
                  ip_address:
                    typeof ipAddress === 'string'
                      ? ipAddress
                      : Array.isArray(ipAddress)
                        ? ipAddress[0]
                        : null,
                  user_agent: userAgent,
                },
              })
              .catch((err: unknown) => {
                const errorMessage =
                  err instanceof Error ? err.message : String(err);
                this.logger.error(
                  `Failed to write audit log asynchronously: ${errorMessage}`,
                );
              });
          } catch (error: unknown) {
            const errorMessage =
              error instanceof Error ? error.message : String(error);
            this.logger.error(`Error in audit interceptor: ${errorMessage}`);
          }
        })().catch((e) =>
          this.logger.error(
            `Unhandled error in audit interceptor: ${e instanceof Error ? e.message : String(e)}`,
          ),
        );
      }),
    );
  }
}
