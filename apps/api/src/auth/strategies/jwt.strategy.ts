import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../user/user.service';
import { AccessTokenPayload } from '../interfaces/token-payload.interface';
import { TokenType } from '../constants/token.constants';

/**
 * Passport JWT strategy for validating **access tokens** only.
 *
 * This class has a single responsibility: verify that an incoming
 * Bearer token is a valid, non-expired access token and resolve
 * the corresponding user. All token generation, rotation, and
 * revocation logic lives in {@link TokenService}.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'MISSING_JWT_SECRET',
      ),
    });
  }

  /**
   * Called automatically by Passport after signature + expiry verification.
   *
   * @returns The user object (minus password_hash), which Passport
   *          attaches to `request.user`.
   */
  async validate(payload: AccessTokenPayload) {
    // Reject refresh tokens or exchange codes used as access tokens
    if (payload.type !== TokenType.ACCESS) {
      throw new UnauthorizedException(
        'Invalid token type — expected an access token',
      );
    }

    const user = await this.userService.user({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...result } = user;
    return result;
  }
}
