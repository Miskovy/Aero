import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';
import { Logger } from '@nestjs/common';

export class RedisIoAdapter extends IoAdapter {
  private readonly logger = new Logger(RedisIoAdapter.name);
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  async connectToRedis(): Promise<void> {
    const upstashUrl = process.env.UPSTASH_REDIS_URL;
    const redisUrl = process.env.REDIS_URL;
    const urlStr = upstashUrl || redisUrl;

    let pubClient: Redis;
    let subClient: Redis;

    try {
      if (urlStr) {
        const isUpstash = urlStr.includes('upstash.io');
        const opts = {
          tls: urlStr.startsWith('rediss://') || isUpstash ? {} : undefined,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        };
        pubClient = new Redis(urlStr, opts);
        subClient = new Redis(urlStr, opts);
      } else {
        const host = process.env.REDIS_HOST || '127.0.0.1';
        const port = parseInt(process.env.REDIS_PORT || '6379', 10);
        const opts = {
          host,
          port,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        };
        pubClient = new Redis(opts);
        subClient = new Redis(opts);
      }

      pubClient.on('error', (err) => {
        this.logger.error(`Redis Pub Client Error: ${err.message}`);
      });
      subClient.on('error', (err) => {
        this.logger.error(`Redis Sub Client Error: ${err.message}`);
      });

      this.adapterConstructor = createAdapter(pubClient, subClient);
      this.logger.log('Redis Pub/Sub WebSocket Adapter initialized successfully.');
    } catch (err: any) {
      this.logger.warn(
        `Failed to initialize Redis Adapter (${err.message}). Falling back to default in-memory WebSocket adapter.`,
      );
    }
  }

  override createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
