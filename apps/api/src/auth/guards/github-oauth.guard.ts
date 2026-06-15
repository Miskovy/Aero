import { Injectable, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { User } from '../../../generated/prisma/client';

@Injectable()
export class GithubOauthGuard extends AuthGuard('github') {
  private readonly logger = new Logger(GithubOauthGuard.name);

  override handleRequest<TUser = User>(
    err: Error | null | undefined,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();

    this.logger.debug(
      `GithubOauthGuard debug: err=${err instanceof Error ? err.message : String(err)}, ` +
        `user=${user ? JSON.stringify(user) : 'false'}, ` +
        `info=${_info ? JSON.stringify(_info) : 'undefined'}`,
    );

    const isCallback = request.url.includes('/callback');

    if (!isCallback) {
      return super.handleRequest(err, user, _info, context);
    }

    if (err || !user) {
      let errorMessage = 'GitHub authentication failed';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (err) {
        errorMessage = String(err);
      } else if (_info instanceof Error) {
        errorMessage = _info.message;
      } else if (_info && typeof _info === 'object' && 'message' in _info) {
        errorMessage = String((_info as Record<string, unknown>).message);
      }

      this.logger.error(
        `GitHub OAuth failure: err=${err instanceof Error ? err.stack : String(err)}, ` +
          `info=${_info ? JSON.stringify(_info) : 'undefined'}, ` +
          `resolvedError=${errorMessage}`,
      );

      const cookies = request.cookies as Record<string, string> | undefined;
      const hasSession = !!cookies?.['aero_session'];
      const redirectPath = hasSession ? '/profile' : '/login';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';

      response.redirect(
        `${frontendUrl}${redirectPath}?error=${encodeURIComponent(errorMessage)}`,
      );
      // Return a dummy value or handle flow halt; returning null or throwing is required
      // here we cast null to satisfy return type as the redirect has occurred.
      return null as unknown as TUser;
    }

    return user;
  }
}
