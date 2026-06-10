import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { ApiKeysService } from '../../modules/api-keys/api-keys.service';
import { AuthenticatedRequest } from '../interfaces/Authenticated.interface';
import { JwtPayload } from '../interfaces/guard.interface';

/**
 * Combined guard that accepts either:
 * 1. Bearer JWT token (existing flow)
 * 2. API Key via `X-API-Key` header or `Bearer aero_*` prefix
 *
 * Use this guard on endpoints that should be accessible from CI/CD pipelines.
 */
@Injectable()
export class JwtOrApiKeyGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers['authorization'];
    const apiKeyHeader = request.headers['x-api-key'] as string | undefined;

    // 1. Try X-API-Key header first
    if (apiKeyHeader) {
      return this.authenticateWithApiKey(request, apiKeyHeader);
    }

    // 2. Try Bearer token — check if it's an API key (aero_ prefix) or JWT
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      if (token.startsWith('aero_')) {
        return this.authenticateWithApiKey(request, token);
      }

      // Standard JWT verification
      return this.authenticateWithJwt(request, token);
    }

    throw new UnauthorizedException('No authentication credentials provided');
  }

  private async authenticateWithApiKey(
    request: AuthenticatedRequest,
    rawKey: string,
  ): Promise<boolean> {
    const result = await this.apiKeysService.validateApiKey(rawKey);
    if (!result) {
      throw new UnauthorizedException('Invalid or expired API key');
    }

    // Attach user info to request (same shape as JWT guard)
    request.user = { id: result.userId };
    return true;
  }

  private authenticateWithJwt(
    request: AuthenticatedRequest,
    token: string,
  ): boolean {
    try {
      const secret = this.configService.get<string>('JWT_SECRET');
      const payload: JwtPayload = this.jwtService.verify(token, {
        secret,
      });
      const userId = payload.sub || payload.id;
      if (!userId) {
        throw new UnauthorizedException('Invalid token payload');
      }
      request.user = { id: userId };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }
}
