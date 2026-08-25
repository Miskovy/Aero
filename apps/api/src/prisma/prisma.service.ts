import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
    const rawDbUrl = process.env.DATABASE_URL || '';
    const isCloudDb =
      rawDbUrl.includes('aivencloud.com') ||
      rawDbUrl.includes('neon.tech') ||
      rawDbUrl.includes('sslmode=') ||
      process.env.NODE_ENV === 'production';

    // Strip sslmode query param so pg-pool does not override rejectUnauthorized: false
    const cleanDbUrl = rawDbUrl.includes('?')
      ? rawDbUrl.split('?')[0] +
        '?' +
        rawDbUrl
          .split('?')[1]
          .split('&')
          .filter((p) => !p.startsWith('sslmode='))
          .join('&')
      : rawDbUrl;

    const sanitizedUrl = cleanDbUrl.endsWith('?')
      ? cleanDbUrl.slice(0, -1)
      : cleanDbUrl;

    const pool = new Pool({
      connectionString: sanitizedUrl,
      ssl: rawDbUrl.includes('sslmode=disable')
        ? false
        : isCloudDb
          ? { rejectUnauthorized: false }
          : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    const adapter = new PrismaPg(pool);

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    super({
      adapter,
      log: ['warn', 'error'],
    } as any);

    this.pool = pool;
  }

  async onModuleInit() {
    this.logger.log('Checking database connection...');

    try {
      await this.$connect();
      await this.$queryRaw`SELECT 1`;

      this.logger.log('Database connected successfully and is ready!');
    } catch (error: unknown) {
      if (error instanceof Error) {
        this.logger.error(`Database connection failed: ${error.message}`);
      } else {
        this.logger.error(`Database connection failed: ${String(error)}`);
      }
      this.logger.warn(
        'Application is starting, but database features will fail until Postgres is running.',
      );
    }
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from the database...');
    await this.$disconnect();
    await this.pool.end();
  }
}
