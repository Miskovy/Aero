import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit , OnModuleDestroy{

  private readonly logger = new Logger(PrismaService.name);
  private readonly pool: Pool;

  constructor() {
     const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    const adapter = new PrismaPg(pool);

    super({ 
      adapter,
      log: ['warn', 'error'], 
    });

    this.pool = pool;
  }

  async onModuleInit() {
    this.logger.log('Connecting to the database...');
    await this.$connect();
  }

  async onModuleDestroy() {
    this.logger.log('Disconnecting from the database...');
    await this.$disconnect();
    await this.pool.end();
  }
}
