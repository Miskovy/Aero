import { Injectable, UnauthorizedException, ConflictException, Logger, InternalServerErrorException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';
import * as bcrypt from 'bcryptjs';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../../generated/prisma/client';
import { Profile } from 'passport-github2';
import { JwtStrategy } from './strategies/jwt.strategy';

interface GitHubUser { id: number; login: string; name: string; html_url: string; avatar_url: string; }
interface GitHubEmail { email: string; primary: boolean; }

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly jwtStrategy: JwtStrategy,
  ) { }

  async register(registerDto: RegisterDto) {
    const existingUser = await this.userService.user({ email: registerDto.email });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);

    const authProvider = registerDto.auth_provider || 'unknown';

    const user = await this.userService.createUser({
      email: registerDto.email,
      name: registerDto.name,
      password_hash: hashedPassword,
      auth_provider: authProvider,
    });
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...result } = user; // Exclude password hash from response
    return result;
  }

  async login(loginDto: LoginDto) {
    const user = await this.userService.user({ email: loginDto.email });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userService.updateUser({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return this.jwtStrategy.generateToken(user);
  }

  async validateOAuthUser(profile: Profile): Promise<User> {
    try {
      const { id, username, emails, photos } = profile;
      const primaryEmail = emails?.[0]?.value;
      const email = primaryEmail || `${id}+${username}@users.noreply.github.com`;
      const avatarUrl = photos?.[0]?.value || null;

      const existingUser = await this.userService.findFirst({
        where: {
          OR: [
            { auth_provider: 'github', auth_provider_id: id.toString() },
            { email: email }
          ]
        }
      });

      // PATH A: Brand New User
      if (!existingUser) {
        this.logger.log(`Creating new user from GitHub OAuth: ${username}`);
        return await this.userService.createUser({
          auth_provider: 'github',
          auth_provider_id: id,
          name: username || `github-user-${id}`,
          email: email,
          avatar_url: avatarUrl,
        });
      }

      // PATH B: Returning GitHub User
      if (existingUser.auth_provider === 'github' && existingUser.auth_provider_id === id) {
        return existingUser;
      }

      // PATH C: Account Linking (Email matched, but GitHub ID is not linked)
      if (existingUser.email === email) {
        this.logger.log(`Linking GitHub account ${id} to existing user ${existingUser.id}`);
        return await this.userService.updateUser({
          where: { id: existingUser.id },
          data: {
            auth_provider: 'github',
            auth_provider_id: id,
            ...(!existingUser.avatar_url && { avatar_url: avatarUrl })
          }
        });
      }

      throw new InternalServerErrorException('Unexpected user state during OAuth validation');

    } catch (error) {
      this.logger.error(`OAuth Validation Failed for GitHub ID ${profile.id}:`, error.stack);
      throw new InternalServerErrorException('An error occurred during authentication.');
    }
  }

  async exchangeGithubToken(githubAccessToken: string): Promise<{ access_token: string }> {
    try {

      const profileResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!profileResponse.ok) {
        throw new UnauthorizedException('Invalid GitHub token');
      }

      const ghUser = (await profileResponse.json()) as GitHubUser;

      const emailResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${githubAccessToken}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const ghEmails = (await emailResponse.json()) as GitHubEmail[];

      const profile: Profile = {
        id: ghUser.id.toString(),
        username: ghUser.login,
        displayName: ghUser.name,
        profileUrl: ghUser.html_url,
        provider: 'github',
        photos: [{ value: ghUser.avatar_url }],
        emails: ghEmails.map((e: any) => ({ value: e.email })),
      };

      const user = await this.validateOAuthUser(profile);

      return this.jwtStrategy.generateToken(user);
    } catch (error) {
      this.logger.error('Failed to exchange GitHub token', error);
      throw new InternalServerErrorException('Authentication exchange failed');
    }
  }
}
