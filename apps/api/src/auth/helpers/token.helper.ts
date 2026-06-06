import { createHash } from 'crypto';

/**
 * SHA-256 hash a token before storing or looking it up in the database.
 * This ensures that if the database is breached, the attacker cannot use
 * the stored refresh tokens directly.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
