import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../../user/user.service';
import { ConfigService } from '@nestjs/config';
import { User } from '../../../generated/prisma/client';
import { JwtService } from '@nestjs/jwt';

export interface JwtPayload {
  sub: string;
  email?: string;
  name?: string;
  iat?: number;   // Issued at (auto-added by jwt)
  exp?: number;   // Expiration (auto-added by jwt)
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'aero-secret-key',
    });
  }

  generateToken(user: User) {
    const payload = { sub: user.id, email: user.email, name: user.name };
    return {
      payload,
      access_token: this.jwtService.sign(payload),
    };
  }
  
  async validate(payload: JwtPayload) {
    const user = await this.userService.user({ id: payload.sub });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password_hash, ...result } = user;
    return result;
  }
}
