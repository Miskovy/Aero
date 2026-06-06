import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { TOKEN_CONFIG } from '../../auth/constants/token.constants';

/**
 * Guard that extracts the refresh token from the HttpOnly cookie
 * and attaches it to `request.refreshToken` for downstream handlers.
 *
 * This guard does NOT verify the token — that's the TokenService's job.
 * It only ensures the cookie is present.
 */
@Injectable()
export class JwtRefreshGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const cookies = request.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[TOKEN_CONFIG.REFRESH_TOKEN_COOKIE_NAME];

    if (!refreshToken) {
      throw new UnauthorizedException(
        'Refresh token cookie is missing. Please log in again.',
      );
    }

    // Attach the raw token to the request for the controller to consume
    (request as Request & { refreshToken: string }).refreshToken = refreshToken;

    return true;
  }
}
