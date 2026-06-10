import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const upstashUrl = this.configService.get<string>('UPSTASH_REDIS_URL');
    const redisUrl = this.configService.get<string>('REDIS_URL');
    const urlStr = upstashUrl || redisUrl;

    if (urlStr) {
      try {
        const isUpstash = urlStr.includes('upstash.io');
        this.client = new Redis(urlStr, {
          tls: urlStr.startsWith('rediss://') || isUpstash ? {} : undefined,
        });
        return;
      } catch (err) {
        // Fall back to standard settings if connection fails
      }
    }

    const host = this.configService.get<string>('REDIS_HOST', '127.0.0.1');
    const port = parseInt(
      this.configService.get<string>('REDIS_PORT', '6379'),
      10,
    );
    this.client = new Redis({ host, port });
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }

  /**
   * Set a key with an optional TTL in seconds
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Get a key
   */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<void> {
    await this.client.del(key);
  }
}
