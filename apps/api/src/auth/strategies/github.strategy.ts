import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
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
      callbackURL: `${process.env.API_URL || 'http://localhost:3500'}/auth/github/callback`,
      scope: ['user:email'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user?: User) => void,
  ) {
    try {
      const user = await this.authService.validateOAuthUser(profile);
      done(null, user);
    } catch (error) {
      done(error as Error);
    }
  }
}
