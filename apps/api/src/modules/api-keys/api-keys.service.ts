import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { randomBytes, createHash } from 'crypto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response';
import { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class ApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate a new API key for a user.
   * Returns the raw key ONCE — it is never stored in plaintext.
   */
  async createApiKey(userId: string, dto: CreateApiKeyDto) {
    // Generate a cryptographically secure random key
    const rawKey = `aero_${randomBytes(32).toString('hex')}`;
    const keyPrefix = rawKey.substring(0, 10);
    const keyHash = this.hashKey(rawKey);

    // If org is specified, verify user has membership
    if (dto.organizationId) {
      const membership = await this.prisma.organizationMember.findUnique({
        where: {
          organization_id_user_id: {
            organization_id: dto.organizationId,
            user_id: userId,
          },
        },
      });
      if (!membership) {
        throw new ForbiddenException(
          'You are not a member of this organization',
        );
      }
    }

    const apiKey = await this.prisma.apiKey.create({
      data: {
        user_id: userId,
        organization_id: dto.organizationId || null,
        name: dto.name,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        permissions: dto.permissions || ['*'],
        expires_at: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        permissions: true,
        expires_at: true,
        created_at: true,
        organization_id: true,
      },
    });

    // Return the raw key only on creation — it's never retrievable again
    return {
      ...apiKey,
      key: rawKey,
    };
  }

  /**
   * List all API keys for a user (without revealing the actual key).
   */
  async listApiKeys(
    userId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const { cursor, limit = 20 } = pagination;
    const take = limit + 1;

    const query: Prisma.ApiKeyFindManyArgs = {
      where: { user_id: userId },
      select: {
        id: true,
        name: true,
        key_prefix: true,
        permissions: true,
        last_used_at: true,
        expires_at: true,
        created_at: true,
        organization_id: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { created_at: 'desc' },
      take,
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const items = await this.prisma.apiKey.findMany(query);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return { data: items, meta: { cursor: nextCursor, hasMore } };
  }

  /**
   * Revoke (delete) an API key.
   */
  async deleteApiKey(userId: string, keyId: string) {
    const key = await this.prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key) throw new NotFoundException('API key not found');
    if (key.user_id !== userId) throw new ForbiddenException('Access denied');

    await this.prisma.apiKey.delete({ where: { id: keyId } });
    return { success: true, message: 'API key revoked successfully' };
  }

  /**
   * Validate an API key from a request header.
   * Returns the user ID if valid, null otherwise.
   */
  async validateApiKey(
    rawKey: string,
  ): Promise<{ userId: string; organizationId: string | null } | null> {
    const keyHash = this.hashKey(rawKey);

    const apiKey = await this.prisma.apiKey.findUnique({
      where: { key_hash: keyHash },
    });

    if (!apiKey) return null;

    // Check expiration
    if (apiKey.expires_at && apiKey.expires_at < new Date()) {
      return null;
    }

    // Update last_used_at (fire-and-forget)
    this.prisma.apiKey
      .update({
        where: { id: apiKey.id },
        data: { last_used_at: new Date() },
      })
      .catch(() => {}); // Non-blocking

    return {
      userId: apiKey.user_id,
      organizationId: apiKey.organization_id,
    };
  }

  private hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }
}
