import {
  Injectable,
  Logger,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as dns from 'dns/promises';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PaginatedResponse } from '../../common/interfaces/paginated-response';
import { Prisma } from '../../../generated/prisma/client';

import { AcmeCertificateService } from './acme-certificate.service';

@Injectable()
export class DomainsService {
  private readonly logger = new Logger(DomainsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly acmeCertificateService: AcmeCertificateService,
  ) {}

  async getPrimaryDomain(serviceId: string): Promise<string> {
    const service = await this.prisma.serviceDomain.findFirst({
      where: { service_id: serviceId, type: 'auto_generated' },
    });
    this.logger.log(
      `Fetched primary domain for service ${serviceId}: ${service ? service.domain : 'none'}`,
    );
    return service ? service.domain : `${serviceId}.example.com`; // Placeholder
  }

  async getAllServiceDomains(serviceId: string) {
    return this.prisma.serviceDomain.findMany({
      where: { service_id: serviceId },
    });
  }

  async listDomains(
    serviceId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    const { cursor, limit = 20 } = pagination;
    const take = limit + 1;

    const query: Prisma.ServiceDomainFindManyArgs = {
      where: { service_id: serviceId },
      orderBy: { created_at: 'desc' },
      take,
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1;
    }

    const items = await this.prisma.serviceDomain.findMany(query);
    const hasMore = items.length > limit;
    if (hasMore) items.pop();
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return { data: items, meta: { cursor: nextCursor, hasMore } };
  }

  async addCustomDomain(serviceId: string, domainName: string) {
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service) throw new NotFoundException('Service not found');

    // 1. Verify Pro Subscription via License Key
    // Instead of trusting the local database, we check the environment for a valid cryptographic license key
    const licenseKey = process.env.AERO_LICENSE_KEY;
    if (!licenseKey || licenseKey.length < 10) {
      // In a real scenario, you'd cryptographically verify the signature of `licenseKey` here.
      throw new ForbiddenException(
        'Custom domains are an Aero Pro feature. Please provide a valid AERO_LICENSE_KEY in your environment to continue.',
      );
    }

    const existing = await this.prisma.serviceDomain.findUnique({
      where: { domain: domainName },
    });

    if (existing) {
      throw new ConflictException(
        `The domain ${domainName} is already attached to a service.`,
      );
    }

    return this.prisma.serviceDomain.create({
      data: {
        service_id: serviceId,
        domain: domainName,
        type: 'custom',
        verification_status: 'pending',
        ssl_enabled: true,
      },
    });
  }

  async verifyDomain(serviceId: string, domainId: string) {
    const domainRecord = await this.prisma.serviceDomain.findUnique({
      where: { id: domainId },
    });

    if (!domainRecord || domainRecord.service_id !== serviceId) {
      throw new NotFoundException('Domain not found');
    }

    if (domainRecord.type === 'auto_generated') {
      return domainRecord;
    }

    try {
      // MVP DNS Check: Does the domain resolve to ANY valid IPv4?
      const records = await dns.resolve4(domainRecord.domain);

      if (records && records.length > 0) {
        await this.prisma.serviceDomain.update({
          where: { id: domainId },
          data: {
            verification_status: 'verified',
            verified_at: new Date(),
          },
        });

        // Automatically provision ACME SSL/TLS certificate
        return this.acmeCertificateService.provisionCertificate(domainId);
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.warn(
        `DNS verification failed for ${domainRecord.domain}: ${errorMessage}`,
      );
    }

    // Failed verification
    return this.prisma.serviceDomain.update({
      where: { id: domainId },
      data: { verification_status: 'failed' },
    });
  }

  async removeDomain(serviceId: string, domainId: string) {
    const domainRecord = await this.prisma.serviceDomain.findUnique({
      where: { id: domainId },
    });

    if (!domainRecord || domainRecord.service_id !== serviceId) {
      throw new NotFoundException('Domain not found');
    }

    await this.prisma.serviceDomain.delete({
      where: { id: domainId },
    });

    return { success: true };
  }
}
