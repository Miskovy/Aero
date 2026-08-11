import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Profile } from 'passport-github2';
import { UserService } from '../user/user.service';
import { TokenService } from './token.service';
import { RedisService } from '../redis/redis.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
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
    private readonly redisService: RedisService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Register a new user, store a verification token in Redis, and send verification email.
   */
  async register(
    registerDto: RegisterDto,
  ): Promise<{ user: Omit<User, 'password_hash'> }> {
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
      is_email_verified: false,
      agreed_to_terms: registerDto.agreed_to_terms,
      agreed_to_privacy: registerDto.agreed_to_privacy,
    });

    const verificationToken = crypto.randomBytes(16).toString('hex');
    await this.redisService.set(
      `email_verify:${verificationToken}`,
      user.id,
      86400,
    );

    this.mailService
      .sendVerificationEmail(user.email, user.name, verificationToken)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send verification email: ${msg}`);
      });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...safeUser } = user;
    return { user: safeUser };
  }

  /**
   * Authenticate with email + password, update last_login_at,
   * check email verification status, and return a fresh token pair.
   */
  async login(
    loginDto: LoginDto,
  ): Promise<
    TokenPair & { user: Omit<User, 'password_hash' | 'two_factor_secret'> }
  > {
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

    if (!user.is_email_verified) {
      throw new ForbiddenException(
        'Please verify your email address before logging in.',
      );
    }

    await this.userService.updateUser({
      where: { id: user.id },
      data: { last_login_at: new Date() },
    });

    const tokenPair = await this.tokenService.generateTokenPair(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, two_factor_secret, ...safeUser } = user;
    return { ...tokenPair, user: safeUser };
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
   * Directly generate token pair for a user.
   */
  async generateTokenPair(user: User): Promise<TokenPair> {
    return this.tokenService.generateTokenPair(user);
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
   * Verify a user's email via token stored in Redis
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const userId = await this.redisService.get(`email_verify:${token}`);
    if (!userId) {
      throw new BadRequestException('Invalid or expired verification token.');
    }

    await this.userService.updateUser({
      where: { id: userId },
      data: { is_email_verified: true },
    });

    await this.redisService.del(`email_verify:${token}`);
    return { message: 'Email verified successfully.' };
  }

  /**
   * Resend the verification email to an unverified user
   */
  async resendVerificationEmail(email: string): Promise<{ message: string }> {
    const user = await this.userService.user({ email });
    if (!user) {
      // Return a positive message to prevent user enumeration
      return {
        message:
          'If this email is registered, a new verification link has been sent.',
      };
    }

    if (user.is_email_verified) {
      return { message: 'Email is already verified.' };
    }

    const verificationToken = crypto.randomBytes(16).toString('hex');
    await this.redisService.set(
      `email_verify:${verificationToken}`,
      user.id,
      86400,
    );

    this.mailService
      .sendVerificationEmail(user.email, user.name, verificationToken)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send verification email: ${msg}`);
      });

    return {
      message:
        'If this email is registered, a new verification link has been sent.',
    };
  }

  /**
   * Request password reset: generates a 6-digit PIN code and stores it in Redis
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.userService.user({ email });
    if (!user) {
      return {
        message: 'If this email is registered, a reset PIN code has been sent.',
      };
    }

    const pin = Math.floor(100000 + Math.random() * 900000).toString();
    await this.redisService.set(`pwd_reset_pin:${email}`, pin, 900); // 15 mins

    this.mailService
      .sendForgotPasswordPin(user.email, user.name, pin)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send forgot password email: ${msg}`);
      });

    return {
      message: 'If this email is registered, a reset PIN code has been sent.',
    };
  }

  /**
   * Verify if a reset PIN code is correct
   */
  async verifyResetPin(
    email: string,
    pin: string,
  ): Promise<{ valid: boolean }> {
    const savedPin = await this.redisService.get(`pwd_reset_pin:${email}`);
    if (!savedPin || savedPin !== pin) {
      throw new BadRequestException('Invalid or expired password reset code.');
    }
    return { valid: true };
  }

  /**
   * Complete password reset flow
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    const { email, pin, password } = resetPasswordDto;
    const savedPin = await this.redisService.get(`pwd_reset_pin:${email}`);
    if (!savedPin || savedPin !== pin) {
      throw new BadRequestException('Invalid or expired password reset code.');
    }

    const user = await this.userService.user({ email });
    if (!user) {
      throw new BadRequestException('User not found.');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    await this.userService.updateUser({
      where: { id: user.id },
      data: { password_hash: hashedPassword },
    });

    await this.redisService.del(`pwd_reset_pin:${email}`);
    return { message: 'Password reset successful. You can now log in.' };
  }

  /**
   * Resolve a GitHub OAuth profile to a User record:
   *   - If currentUserId is passed, link that logged-in user to this GitHub account
   *   - Otherwise, standard login or auto-link by matched email address
   */
  async validateOAuthUser(
    profile: Profile,
    currentUserId?: string,
  ): Promise<User> {
    try {
      const { id, username, emails, photos } = profile;
      const providerId = id.toString();
      const primaryEmail = emails?.[0]?.value;
      const email =
        primaryEmail || `${providerId}+${username}@users.noreply.github.com`;
      const avatarUrl = photos?.[0]?.value || null;

      // Find if anyone is already linked to this GitHub ID
      const existingLinkedUser = await this.userService.findFirst({
        where: { auth_provider: 'github', auth_provider_id: providerId },
      });

      // ── CASE A: We are actively linking a logged-in user session ──
      if (currentUserId) {
        if (existingLinkedUser) {
          if (existingLinkedUser.id === currentUserId) {
            // Already linked to the current user.
            return existingLinkedUser;
          } else {
            // Already linked to a different user!
            throw new ConflictException(
              'This GitHub account is already connected to another Aero profile.',
            );
          }
        }

        const currentUser = await this.userService.user({ id: currentUserId });
        if (!currentUser) {
          throw new UnauthorizedException('User not found.');
        }

        this.logger.log(
          `Linking GitHub account ${providerId} to existing logged-in user ${currentUserId}`,
        );
        return await this.userService.updateUser({
          where: { id: currentUserId },
          data: {
            auth_provider: 'github',
            auth_provider_id: providerId,
            is_email_verified: true,
            ...(!currentUser.avatar_url && { avatar_url: avatarUrl }),
          },
        });
      }

      // ── CASE B: Regular Login / New Registration (No active session) ──
      if (existingLinkedUser) {
        return existingLinkedUser;
      }

      // Check if a user with the same email exists to link accounts
      const userWithEmail = await this.userService.user({ email });
      if (userWithEmail) {
        this.logger.log(
          `Linking GitHub account ${providerId} to existing user with email ${email}`,
        );
        return await this.userService.updateUser({
          where: { id: userWithEmail.id },
          data: {
            auth_provider: 'github',
            auth_provider_id: providerId,
            is_email_verified: true,
            ...(!userWithEmail.avatar_url && { avatar_url: avatarUrl }),
          },
        });
      }

      // Register new user
      this.logger.log(`Creating new user from GitHub OAuth: ${username}`);
      return await this.userService.createUser({
        auth_provider: 'github',
        auth_provider_id: providerId,
        name: username || `github-user-${providerId}`,
        email: email,
        avatar_url: avatarUrl,
        is_email_verified: true,
      });
    } catch (error: unknown) {
      if (
        error instanceof InternalServerErrorException ||
        error instanceof UnauthorizedException ||
        error instanceof ConflictException
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
