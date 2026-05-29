import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';
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
import { OrganizationsModule } from './organizations/organizations.module';
import { ProjectsModule } from './projects/projects.module';
import { SecretsModule } from './modules/secrets/secrets.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { MarketplaceModule } from './modules/marketplace/marketplace.module';
import { DomainsModule } from './modules/domains/domains.module';
import { AgentModule } from './modules/agent/agent.module';
import { NodesModule } from './modules/nodes/nodes.module';
import { CloudflareModule } from './modules/cloudflare/cloudflare.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
                username: parsed.username ? decodeURIComponent(parsed.username) : undefined,
                password: parsed.password ? decodeURIComponent(parsed.password) : undefined,
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
    UserModule,
    PrismaModule,
    AuthModule,
    GitModule,
    DomainsModule,
    DockerModule,
    DeploymentsModule,
    OrganizationsModule,
    ProjectsModule,
    SecretsModule,
    MonitoringModule,
    MarketplaceModule,
    AgentModule,
    NodesModule,
    NetworkingModule,
    CloudflareModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
