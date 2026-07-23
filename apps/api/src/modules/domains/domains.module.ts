import { Module } from '@nestjs/common';
import { DomainsService } from './domain.service';
import { DomainsController } from './domains.controller';
import { AcmeCertificateService } from './acme-certificate.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [DomainsController],
  providers: [DomainsService, AcmeCertificateService],
  exports: [DomainsService, AcmeCertificateService],
})
export class DomainsModule {}
