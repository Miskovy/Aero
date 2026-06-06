import { TokenType } from '../constants/token.constants';

/** Base fields present in every JWT issued by the auth module */
interface BaseTokenPayload {
  /** User ID (maps to `users.id`) */
  sub: string;
  /** Issued-at timestamp (auto-set by `jsonwebtoken`) */
  iat?: number;
  /** Expiration timestamp (auto-set by `jsonwebtoken`) */
  exp?: number;
}

/** Payload for short-lived access tokens (15 min) */
export interface AccessTokenPayload extends BaseTokenPayload {
  email: string;
  name: string;
  type: TokenType.ACCESS;
}

/** Payload for refresh tokens (7 days, rotated on each use) */
export interface RefreshTokenPayload extends BaseTokenPayload {
  /** Unique token identifier — also used as the DB primary key */
  jti: string;
  /** Links tokens across rotation cycles for reuse detection */
  familyId: string;
  type: TokenType.REFRESH;
}

/** Payload for one-time OAuth exchange codes (5 min, desktop/CLI only) */
export interface OAuthExchangePayload extends BaseTokenPayload {
  type: TokenType.OAUTH_EXCHANGE;
}

/** Returned by token generation — refresh token is set via cookie, not body */
export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

/** Returned by the /auth/validate endpoint */
export interface TokenValidationResult {
  is_valid: boolean;
  message: string;
  payload?: AccessTokenPayload;
}
