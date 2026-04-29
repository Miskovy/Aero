import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VaultModule } from './modules/vault/vault.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { GitModule } from './modules/git/git.module';
import { NetworkingModule } from './modules/networking/networking.module';      
import { DomainsModule } from './modules/domains/domains.module';
import { DockerModule } from './modules/docker/docker.module';
import { DeploymentsModule } from './modules/deployments/deployment.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', '127.0.0.1'),
          port: parseInt(configService.get('REDIS_PORT', '6379'), 10),
        },
      }),
    }),
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
    NetworkingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
