import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TokenService } from '../token.service';

/**
 * Scheduled job to purge expired refresh tokens from the database.
 * Prevents the refresh_tokens table from growing infinitely.
 */
@Injectable()
export class CleanupTokensJob {
  private readonly logger = new Logger(CleanupTokensJob.name);

  constructor(private readonly tokenService: TokenService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async execute(): Promise<void> {
    this.logger.debug('Running expired refresh tokens cleanup job...');
    const deletedCount = await this.tokenService.cleanupExpiredTokens();
    if (deletedCount > 0) {
      this.logger.log(`Cleaned up ${deletedCount} expired refresh tokens`);
    }
  }
}
