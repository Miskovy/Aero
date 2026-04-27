import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VaultModule } from './modules/vault/vault.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { GitModule } from './modules/git/git.module';
import { NetworkingModule } from './modules/networking/networking.module';
import { DomainsModule } from './modules/domains/domains.module';
import { DockerModule } from './modules/docker/docker.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VaultModule,
    UserModule,
    PrismaModule,
    AuthModule,
    GitModule,
    DomainsModule,
    DockerModule,
    NetworkingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
