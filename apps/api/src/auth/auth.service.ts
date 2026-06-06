import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Profile } from 'passport-github2';
import { UserService } from '../user/user.service';
import { TokenService } from './token.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../../generated/prisma/client';
import { GitHubEmail, GitHubUser } from './interfaces/auth.interface';
import {
  TokenPair,
  TokenValidationResult,
} from './interfaces/token-payload.interface';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Register a new user and immediately issue a token pair
   * so the client is authenticated in a single round-trip.
   */
  async register(
    registerDto: RegisterDto,
  ): Promise<TokenPair & { user: Omit<User, 'password_hash'> }> {
    const existingUser = await this.userService.user({
      email: registerDto.email,
    });
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(registerDto.password, salt);
    const authProvider = registerDto.auth_provider || 'local';

    const user = await this.userService.createUser({
      email: registerDto.email,
      name: registerDto.name,
      password_hash: hashedPassword,
      auth_provider: authProvider,
    });

    const tokens = await this.tokenService.generateTokenPair(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safeUser } = user;
    return { ...tokens, user: safeUser };
  }

  /**
   * Authenticate with email + password, update last_login_at,
   * and return a fresh token pair.
   */
  async login(loginDto: LoginDto): Promise<TokenPair> {
    const user = await this.userService.user({ email: loginDto.email });

    if (!user || !user.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.userService.updateUser({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    return this.tokenService.generateTokenPair(user);
  }

  /**
   * Rotate tokens: validate the old refresh token, revoke it,
   * and issue a new pair in the same family.
   */
  async refreshTokens(oldRefreshToken: string): Promise<TokenPair> {
    return this.tokenService.refreshTokens(oldRefreshToken);
  }

  /**
   * Revoke all active tokens for a user (full logout from all devices).
   */
  async logout(userId: string): Promise<void> {
    await this.tokenService.revokeAllUserTokens(userId);
  }

  /**
   * Stateless access-token validation (no DB hit).
   */
  validateAccessToken(accessToken: string): TokenValidationResult {
    return this.tokenService.validateAccessToken(accessToken);
  }

  /**
   * Validate / create / link a user from a GitHub OAuth profile,
   * then return a token pair.
   */
  async handleOAuthLogin(profile: Profile): Promise<TokenPair> {
    const user = await this.validateOAuthUser(profile);
    return this.tokenService.generateTokenPair(user);
  }

  /**
   * Generate a short-lived exchange code for non-browser OAuth clients
   * (desktop app, CLI) that can't receive HttpOnly cookies.
   */
  generateOAuthExchangeCode(user: User): string {
    return this.tokenService.generateOAuthExchangeCode(user);
  }

  /**
   * Exchange an OAuth code for a full token pair (desktop/CLI flow).
   */
  async exchangeOAuthCode(code: string): Promise<TokenPair> {
    return this.tokenService.exchangeOAuthCode(code);
  }

  /**
   * Exchange a raw GitHub access token (device flow) for an Aero token pair.
   */
  async exchangeGithubToken(githubAccessToken: string): Promise<TokenPair> {
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
        emails: ghEmails.map((e: GitHubEmail) => ({ value: e.email })),
      };

      return this.handleOAuthLogin(profile);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      this.logger.error('Failed to exchange GitHub token', error);
      throw new InternalServerErrorException('Authentication exchange failed');
    }
  }

  /**
   * Resolve a GitHub OAuth profile to a User record:
   *   A) Brand new user → create
   *   B) Returning GitHub user → return existing
   *   C) Email match but no GitHub link → link accounts
   */
  async validateOAuthUser(profile: Profile): Promise<User> {
    try {
      const { id, username, emails, photos } = profile;
      const primaryEmail = emails?.[0]?.value;
      const email =
        primaryEmail || `${id}+${username}@users.noreply.github.com`;
      const avatarUrl = photos?.[0]?.value || null;

      const existingUser = await this.userService.findFirst({
        where: {
          OR: [
            { auth_provider: 'github', auth_provider_id: id.toString() },
            { email: email },
          ],
        },
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
      if (
        existingUser.auth_provider === 'github' &&
        existingUser.auth_provider_id === id
      ) {
        return existingUser;
      }

      // PATH C: Account Linking (Email matched, but GitHub ID is not linked)
      if (existingUser.email === email) {
        this.logger.log(
          `Linking GitHub account ${id} to existing user ${existingUser.id}`,
        );
        return await this.userService.updateUser({
          where: { id: existingUser.id },
          data: {
            auth_provider: 'github',
            auth_provider_id: id,
            ...(!existingUser.avatar_url && { avatar_url: avatarUrl }),
          },
        });
      }

      throw new InternalServerErrorException(
        'Unexpected user state during OAuth validation',
      );
    } catch (error: unknown) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof UnauthorizedException
      ) {
        throw error;
      }

      if (error instanceof Error) {
        this.logger.error(
          `OAuth Validation Failed for GitHub ID ${profile.id}:`,
          error.stack,
        );
      } else {
        this.logger.error(
          `OAuth Validation Failed for GitHub ID ${profile.id}:`,
          String(error),
        );
      }
      throw new InternalServerErrorException(
        'An error occurred during authentication.',
      );
    }
  }
}
