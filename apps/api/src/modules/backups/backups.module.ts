import { Module } from '@nestjs/common';
import { BackupsController } from './backups.controller';
import { BackupsService } from './backups.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { DockerModule } from '../docker/docker.module';

@Module({
  imports: [PrismaModule, DockerModule],
  controllers: [BackupsController],
  providers: [BackupsService],
  exports: [BackupsService],
})
export class BackupsModule {}
