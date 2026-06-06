/**
 * Centralized token configuration constants.
 *
 * Single source of truth for all token lifetimes, cookie names,
 * and security parameters across the auth module.
 */
export const TOKEN_CONFIG = {
  /** Short-lived access token — limits damage window if intercepted */
  ACCESS_TOKEN_TTL: '15m',

  /** Long-lived refresh token — stored server-side, rotated on every use */
  REFRESH_TOKEN_TTL: '7d',

  /** One-time exchange code for desktop / CLI OAuth callbacks */
  OAUTH_EXCHANGE_CODE_TTL: '5m',

  /** HttpOnly cookie name for the refresh token */
  REFRESH_TOKEN_COOKIE_NAME: 'aero_rt',

  /** Cookie max-age in milliseconds (must match REFRESH_TOKEN_TTL) */
  REFRESH_TOKEN_MAX_AGE_MS: 7 * 24 * 60 * 60 * 1000,

  /** Cookie path — restrict to auth endpoints only */
  REFRESH_TOKEN_COOKIE_PATH: '/auth',
} as const;

/** Discriminator values embedded in every JWT payload */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  OAUTH_EXCHANGE = 'oauth_exchange',
}
