import { Module } from '@nestjs/common';
import { VolumesController } from './volumes.controller';
import { VolumesService } from './volumes.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VolumesController],
  providers: [VolumesService],
  exports: [VolumesService],
})
export class VolumesModule {}
