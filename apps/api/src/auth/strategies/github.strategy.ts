import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';
import { AuthService } from '../auth.service';
import { User } from '../../../generated/prisma/client';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(private authService: AuthService) {
    super({
      clientID: process.env.GITHUB_CLIENT_ID || '',
      clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      callbackURL: `${process.env.API_URL || 'http://localhost:3500'}/auth/github/callback`,
      scope: ['user:email'],
    });
  }
  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (error: Error | null, user: User) => void,
  ) {
    const user = await this.authService.validateOAuthUser(profile);
    done(null, user);
  }
}
