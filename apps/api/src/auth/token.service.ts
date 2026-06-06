import { randomUUID } from 'crypto';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '../../generated/prisma/client';
import { TOKEN_CONFIG, TokenType } from './constants/token.constants';
import { hashToken } from './helpers/token.helper';
import {
  AccessTokenPayload,
  OAuthExchangePayload,
  RefreshTokenPayload,
  TokenPair,
  TokenValidationResult,
} from './interfaces/token-payload.interface';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Issue a fresh access + refresh token pair for a user.
   * A new token family is created (used for reuse detection).
   */
  async generateTokenPair(user: User): Promise<TokenPair> {
    const familyId = randomUUID();
    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(user, familyId);

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  /**
   * Rotate tokens: validate the old refresh token, revoke it,
   * and issue a new pair within the same family.
   *
   * If the token has already been revoked (replay attack), the
   * entire family is invalidated — forcing re-authentication.
   */
  async refreshTokens(oldToken: string): Promise<TokenPair> {
    const payload = this.verifyRefreshToken(oldToken);
    const tokenHash = hashToken(oldToken);

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { token_hash: tokenHash },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token not recognised');
    }

    if (storedToken.is_revoked) {
      this.logger.warn(
        `Refresh token reuse detected for family ${storedToken.family_id} ` +
          `(user ${storedToken.user_id}). Revoking entire family.`,
      );
      await this.revokeTokenFamily(storedToken.family_id);
      throw new UnauthorizedException(
        'Token reuse detected — all sessions in this family have been revoked. Please log in again.',
      );
    }

    if (storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { is_revoked: true },
    });
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    const accessToken = this.signAccessToken(user);
    const refreshToken = await this.createRefreshToken(
      user,
      storedToken.family_id,
    );

    return { access_token: accessToken, refresh_token: refreshToken };
  }

  /**
   * Revoke every token in a family (triggered by reuse detection).
   */
  async revokeTokenFamily(familyId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family_id: familyId, is_revoked: false },
      data: { is_revoked: true },
    });
  }

  /**
   * Revoke every active token for a user (logout / password change).
   * Useful for when a user changes their password or logs out from all devices and Cron Job deleteExpiredTokens
   */
  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { user_id: userId, is_revoked: false },
      data: { is_revoked: true },
    });
  }

  /**
   * Validate an access token without hitting the database.
   * Used by the `POST /auth/validate` endpoint.
   */
  validateAccessToken(token: string): TokenValidationResult {
    if (!token) {
      return { is_valid: false, message: 'No token provided' };
    }

    try {
      const decoded = this.jwtService.verify<AccessTokenPayload>(token);

      if (decoded.type !== TokenType.ACCESS) {
        return { is_valid: false, message: 'Invalid token type' };
      }

      return { is_valid: true, message: 'Token is valid', payload: decoded };
    } catch {
      return { is_valid: false, message: 'Invalid or expired token' };
    }
  }

  /**
   * Generate a short-lived, one-time exchange code for OAuth callbacks
   * to desktop / CLI clients that can't use HttpOnly cookies.
   */
  generateOAuthExchangeCode(user: User): string {
    const payload: Omit<OAuthExchangePayload, 'iat' | 'exp'> = {
      sub: user.id,
      type: TokenType.OAUTH_EXCHANGE,
    };

    return this.jwtService.sign(payload, {
      expiresIn: TOKEN_CONFIG.OAUTH_EXCHANGE_CODE_TTL,
    });
  }

  /**
   * Verify an OAuth exchange code and return a full token pair.
   * The code is single-use by nature — once exchanged, it expires in ≤5 min.
   */
  async exchangeOAuthCode(code: string): Promise<TokenPair> {
    try {
      const payload = this.jwtService.verify<OAuthExchangePayload>(code);

      if (payload.type !== TokenType.OAUTH_EXCHANGE) {
        throw new UnauthorizedException('Invalid exchange code type');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return this.generateTokenPair(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired exchange code');
    }
  }

  /**
   * Purge expired refresh tokens from the database.
   * Prevents the refresh_tokens table from growing unboundedly.
   */
  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expires_at: { lt: new Date() } },
    });
    return result.count;
  }

  /** Sign a short-lived access token JWT */
  private signAccessToken(user: User): string {
    const payload: Omit<AccessTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      name: user.name,
      type: TokenType.ACCESS,
    };

    return this.jwtService.sign(payload, {
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_TTL,
    });
  }

  /**
   * Create a refresh token JWT and persist its hash in the database.
   * The raw token is returned to be set as an HttpOnly cookie.
   */
  private async createRefreshToken(
    user: User,
    familyId: string,
  ): Promise<string> {
    const jti = randomUUID();

    const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      jti,
      familyId,
      type: TokenType.REFRESH,
    };

    const token = this.jwtService.sign(payload, {
      expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_TTL,
    });

    const tokenHash = hashToken(token);

    await this.prisma.refreshToken.create({
      data: {
        id: jti,
        user_id: user.id,
        token_hash: tokenHash,
        family_id: familyId,
        expires_at: new Date(
          Date.now() + TOKEN_CONFIG.REFRESH_TOKEN_MAX_AGE_MS,
        ),
      },
    });

    return token;
  }

  /** Verify a refresh-token JWT and assert its type discriminator */
  private verifyRefreshToken(token: string): RefreshTokenPayload {
    try {
      const payload = this.jwtService.verify<RefreshTokenPayload>(token);

      if (payload.type !== TokenType.REFRESH) {
        throw new UnauthorizedException('Token is not a refresh token');
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }
}
