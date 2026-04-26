import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { VaultModule } from './modules/vault/vault.module';
import { UserModule } from './user/user.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { GitModule } from './modules/git/git.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    VaultModule,
    UserModule,
    PrismaModule,
    AuthModule,
    GitModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
