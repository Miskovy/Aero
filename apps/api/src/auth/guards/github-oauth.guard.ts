import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request, Response } from 'express';
import { User } from '../../../generated/prisma/client';

@Injectable()
export class GithubOauthGuard extends AuthGuard('github') {
  override handleRequest<TUser = User>(
    err: Error | null | undefined,
    user: TUser | false,
    _info: unknown,
    context: ExecutionContext,
  ): TUser {
    const response = context.switchToHttp().getResponse<Response>();
    const request = context.switchToHttp().getRequest<Request>();

    if (err || !user) {
      const errorMessage =
        err instanceof Error ? err.message : 'GitHub authentication failed';
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
