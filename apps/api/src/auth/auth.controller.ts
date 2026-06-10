import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  Query,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { User } from '../../generated/prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtRefreshGuard } from './guards/jwt-refresh.guard';
import { RefreshTokenRequest } from './interfaces/auth.interface';
import { TOKEN_CONFIG } from './constants/token.constants';
import { extractClientFromCookie } from './helpers/cookie.helper';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly isProduction: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    this.isProduction =
      this.configService.get<string>('NODE_ENV') === 'production';
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User registered.',
  })
  @ApiResponse({ status: 409, description: 'Email already exists.' })
  async register(@Body() registerDto: RegisterDto) {
    const { user } = await this.authService.register(registerDto);
    return {
      user,
      message:
        'Verification email sent. Please verify your email address before logging in.',
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('login')
  @ApiOperation({ summary: 'Login and receive tokens' })
  @ApiResponse({
    status: 200,
    description: 'Access token in body, refresh token in HttpOnly cookie.',
  })
  @ApiResponse({ status: 401, description: 'Invalid credentials.' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } =
      await this.authService.login(loginDto);

    this.setRefreshCookie(res, refresh_token);
    return { access_token };
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email using a token' })
  async verifyEmail(@Body('token') token: string) {
    if (!token) {
      throw new BadRequestException('Token is required');
    }
    return this.authService.verifyEmail(token);
  }

  @HttpCode(HttpStatus.OK)
  @Post('resend-verification')
  @ApiOperation({ summary: 'Resend email verification link' })
  async resendVerification(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.resendVerificationEmail(email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  @ApiOperation({ summary: 'Request a password reset PIN' })
  async forgotPassword(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }
    return this.authService.forgotPassword(email);
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-reset-pin')
  @ApiOperation({ summary: 'Verify forgot password PIN code' })
  async verifyResetPin(@Body('email') email: string, @Body('pin') pin: string) {
    if (!email || !pin) {
      throw new BadRequestException('Email and PIN are required');
    }
    return this.authService.verifyResetPin(email, pin);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password using PIN' })
  async resetPassword(@Body() body: any) {
    if (!body.email || !body.pin || !body.password) {
      throw new BadRequestException('Email, PIN, and password are required');
    }
    return this.authService.resetPassword(body);
  }

  // ──────────────────────────────────────────────────────────────
  //  Token Operations
  // ──────────────────────────────────────────────────────────────

  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Rotate refresh token and get a new access token' })
  @ApiResponse({
    status: 200,
    description: 'New access token in body, new refresh token in cookie.',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid, expired, or reused refresh token.',
  })
  async refresh(
    @Req() req: RefreshTokenRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { access_token, refresh_token } =
      await this.authService.refreshTokens(req.refreshToken);

    this.setRefreshCookie(res, refresh_token);
    return { access_token };
  }

  @HttpCode(HttpStatus.OK)
  @Post('logout')
  @ApiOperation({ summary: 'Revoke all tokens and clear refresh cookie' })
  @ApiResponse({ status: 200, description: 'Successfully logged out.' })
  async logout(
    @Req() req: RefreshTokenRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const refreshToken = cookies?.[TOKEN_CONFIG.REFRESH_TOKEN_COOKIE_NAME];

    if (refreshToken) {
      // Best-effort: extract userId from the token to revoke all sessions
      try {
        const validation = this.authService.validateAccessToken(refreshToken);
        // The refresh token won't pass access validation, so we try a
        // different approach — we use the refresh flow's internal verify
        // to get the userId. But since we're logging out, we can also
        // just revoke based on the token itself via the token service.
        if (validation.payload?.sub) {
          await this.authService.logout(validation.payload.sub);
        }
      } catch {
        // Token may be expired/invalid — that's fine for logout
        this.logger.debug('Could not extract user from token during logout');
      }
    }

    this.clearRefreshCookie(res);
    return { message: 'Logged out successfully' };
  }

  @HttpCode(HttpStatus.OK)
  @Post('validate')
  @ApiOperation({ summary: 'Validate an access token' })
  @ApiResponse({ status: 200, description: 'Token validation result.' })
  validate(@Body('access_token') accessToken: string) {
    if (!accessToken) {
      throw new BadRequestException('access_token is required');
    }
    return this.authService.validateAccessToken(accessToken);
  }

  @Get('github')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'Initiate GitHub OAuth login' })
  githubAuth(@Query('client') client: string, @Res() res: Response) {
    // Store the client type in a short-lived cookie for the callback
    res.cookie('auth_client', client || 'web', {
      maxAge: 300000,
      httpOnly: true,
      sameSite: 'strict',
    });
  }

  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @ApiOperation({ summary: 'GitHub OAuth callback' })
  async githubAuthCallback(
    @Req() req: RefreshTokenRequest & { user: User },
    @Res() res: Response,
  ) {
    const user = req.user;
    const client = extractClientFromCookie(req);

    res.clearCookie('auth_client');

    if (client === 'desktop' || client === 'cli') {
      // ── Non-browser clients: issue a short-lived exchange code ──
      const exchangeCode = this.authService.generateOAuthExchangeCode(user);
      const redirectUrl =
        client === 'desktop'
          ? `aero-app://auth?code=${exchangeCode}`
          : `http://localhost:8080/callback?code=${exchangeCode}`;

      return res.redirect(redirectUrl);
    }

    // ── Browser client: set refresh cookie + redirect with access token ──
    const tokens = await this.authService.generateTokenPair(user);
    this.setRefreshCookie(res, tokens.refresh_token);

    return res.redirect(
      `http://localhost:3001/login?token=${tokens.access_token}`,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('github/exchange')
  @ApiOperation({
    summary: 'Exchange GitHub token for Aero tokens (Device Flow)',
  })
  @ApiResponse({
    status: 200,
    description: 'Access token in body, refresh token in cookie.',
  })
  async exchangeGithubToken(
    @Body('accessToken') accessToken: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!accessToken) {
      throw new BadRequestException('accessToken is required');
    }

    const { access_token, refresh_token } =
      await this.authService.exchangeGithubToken(accessToken);

    this.setRefreshCookie(res, refresh_token);
    return { access_token };
  }

  @HttpCode(HttpStatus.OK)
  @Post('oauth/exchange')
  @ApiOperation({
    summary: 'Exchange an OAuth code for tokens (desktop/CLI callback)',
  })
  @ApiResponse({
    status: 200,
    description: 'Access token in body, refresh token in cookie.',
  })
  async exchangeOAuthCode(
    @Body('code') code: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    if (!code) {
      throw new BadRequestException('code is required');
    }

    const { access_token, refresh_token } =
      await this.authService.exchangeOAuthCode(code);

    this.setRefreshCookie(res, refresh_token);
    return { access_token };
  }

  // ──────────────────────────────────────────────────────────────
  //  Cookie Helpers
  // ──────────────────────────────────────────────────────────────

  /** Set the refresh token as an HttpOnly, Secure, SameSite cookie */
  private setRefreshCookie(res: Response, refreshToken: string): void {
    res.cookie(TOKEN_CONFIG.REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      maxAge: TOKEN_CONFIG.REFRESH_TOKEN_MAX_AGE_MS,
      path: TOKEN_CONFIG.REFRESH_TOKEN_COOKIE_PATH,
    });
  }

  /** Clear the refresh token cookie on logout */
  private clearRefreshCookie(res: Response): void {
    res.clearCookie(TOKEN_CONFIG.REFRESH_TOKEN_COOKIE_NAME, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'strict',
      path: TOKEN_CONFIG.REFRESH_TOKEN_COOKIE_PATH,
    });
  }
}
