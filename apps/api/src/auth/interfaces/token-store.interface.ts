/**
 * Abstraction over the refresh-token persistence layer.
 */
export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  isRevoked: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface CreateRefreshTokenData {
  id: string;
  userId: string;
  tokenHash: string;
  familyId: string;
  expiresAt: Date;
}

export interface ITokenStore {
  /** Persist a new refresh token record */
  save(data: CreateRefreshTokenData): Promise<RefreshTokenRecord>;

  /** Look up a token by its SHA-256 hash */
  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;

  /** Mark a single token as revoked */
  revokeById(id: string): Promise<void>;

  /** Revoke every token in a rotation family (reuse-detection response) */
  revokeFamily(familyId: string): Promise<void>;

  /** Revoke every token belonging to a user (logout / password change) */
  revokeAllForUser(userId: string): Promise<void>;

  /** Delete expired tokens to prevent table bloat */
  deleteExpired(): Promise<number>;
}
