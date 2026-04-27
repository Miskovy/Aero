import { Module } from '@nestjs/common';
import { DomainsService } from './domain.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [DomainsService],
  exports: [DomainsService],
})
export class DomainsModule {}