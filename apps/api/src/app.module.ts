import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VaultModule } from './modules/vault/vault.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GitModule } from './modules/git/git.module';
import { NetworkingModule } from './modules/networking/networking.module';
import { DockerModule } from './modules/docker/docker.module';
import { DeploymentsModule } from './modules/deployments/deployment.module';
import { ServicesModule } from './modules/services/services.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { SecretsModule } from './modules/secrets/secrets.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { DomainsModule } from './modules/domains/domains.module';
import { AgentModule } from './modules/agent/agent.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { CloudflareModule } from './modules/cloudflare/cloudflare.module';
import { ApiKeysModule } from './modules/api-keys/api-keys.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { BackupsModule } from './modules/backups/backups.module';
import { VolumesModule } from './modules/volumes/volumes.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { RedisModule } from './redis/redis.module';
import { MailModule } from './mail/mail.module';
import { PlansModule } from './plans/plans.module';
import { TeamsModule } from './teams/teams.module';
import { PaymentsModule } from './payments/payments.module';
import { LoggerModule } from 'nestjs-pino';
import { getPinoLoggerConfig } from './common/logger/pino-logger.config';

@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        getPinoLoggerConfig(configService),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    RedisModule,
    MailModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const upstashUrl = configService.get<string>('UPSTASH_REDIS_URL');
        const redisUrl = configService.get<string>('REDIS_URL');
        const urlStr = upstashUrl || redisUrl;

        if (urlStr) {
          try {
            const parsed = new URL(urlStr);
            return {
              connection: {
                host: parsed.hostname,
                port: parseInt(parsed.port || '6379', 10),
                username: parsed.username
                  ? decodeURIComponent(parsed.username)
                  : undefined,
                password: parsed.password
                  ? decodeURIComponent(parsed.password)
                  : undefined,
                tls: urlStr.startsWith('rediss://') ? {} : undefined,
              },
            };
          } catch {
            // Fall back to standard settings if URL parsing fails
          }
        }

        return {
          connection: {
            host: configService.get('REDIS_HOST', '127.0.0.1'),
            port: parseInt(configService.get('REDIS_PORT', '6379'), 10),
          },
        };
      },
    }),
    ScheduleModule.forRoot(),
    VaultModule,
    ApiKeysModule,
    UserModule,
    PrismaModule,
    AuthModule,
    GitModule,
    DomainsModule,
    DockerModule,
    DeploymentsModule,
    ServicesModule,
    OrganizationsModule,
    ProjectsModule,
    SecretsModule,
    MonitoringModule,
    MarketplaceModule,
    AgentModule,
    NodesModule,
    NetworkingModule,
    CloudflareModule,
    WebhooksModule,
    AlertsModule,
    AuditLogsModule,
    BackupsModule,
    VolumesModule,
    EventEmitterModule.forRoot(),
    PlansModule,
    TeamsModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule {}
