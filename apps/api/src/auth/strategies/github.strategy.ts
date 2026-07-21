import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { User } from '../../../generated/prisma/client';

/**
 * Passport strategy for GitHub OAuth 2.0 authentication.
 *
 * Resolves a GitHub profile to an Aero {@link User} and passes
 * it to `request.user`. Token generation is handled by the controller.
 */
@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private readonly authService: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL:
        process.env.GITHUB_CALLBACK_URL ||
        `${(process.env.API_URL || 'http://localhost:3000').replace(/\/+$/, '')}${
          (process.env.API_URL || '').endsWith('/api/v1') ? '' : '/api/v1'
        }/auth/github/callback`,
      scope: ['user:email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: Request,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ): Promise<User> {
    let currentUserId: string | undefined = undefined;
    const cookies = req.cookies as Record<string, string> | undefined;
    const token = cookies?.['aero_session'];
    if (token) {
      try {
        const validationResult = this.authService.validateAccessToken(token);
        if (validationResult.is_valid && validationResult.payload?.sub) {
          currentUserId = validationResult.payload.sub;
        }
      } catch {
        // Ignore invalid session cookies
      }
    }

    return this.authService.validateOAuthUser(profile, currentUserId);
  }
}
