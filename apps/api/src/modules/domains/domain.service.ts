import { Injectable, Logger, ForbiddenException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as dns from 'dns/promises';

@Injectable()
export class DomainsService {
    private readonly logger = new Logger(DomainsService.name);

    constructor(private readonly prisma: PrismaService) { }

    async getPrimaryDomain(serviceId: string): Promise<string> {
        const service = await this.prisma.serviceDomain.findFirst({
            where: { service_id: serviceId, type: 'auto_generated' },
        });
        this.logger.log(`Fetched primary domain for service ${serviceId}: ${service ? service.domain : 'none'}`);
        return service ? service.domain : `${serviceId}.example.com`; // Placeholder
    }

    async getAllServiceDomains(serviceId: string) {
        return this.prisma.serviceDomain.findMany({
            where: { service_id: serviceId },
        });
    }

    async listDomains(serviceId: string) {
        return this.getAllServiceDomains(serviceId);
    }

    async addCustomDomain(serviceId: string, domainName: string) {
        const service = await this.prisma.service.findUnique({
            where: { id: serviceId }
        });

        if (!service) throw new NotFoundException('Service not found');

        // 1. Verify Pro Subscription via License Key
        // Instead of trusting the local database, we check the environment for a valid cryptographic license key
        const licenseKey = process.env.AERO_LICENSE_KEY;
        if (!licenseKey || licenseKey.length < 10) {
            // In a real scenario, you'd cryptographically verify the signature of `licenseKey` here.
            throw new ForbiddenException("Custom domains are an Aero Pro feature. Please provide a valid AERO_LICENSE_KEY in your environment to continue.");
        }

        const existing = await this.prisma.serviceDomain.findUnique({
            where: { domain: domainName }
        });

        if (existing) {
            throw new ConflictException(`The domain ${domainName} is already attached to a service.`);
        }

        return this.prisma.serviceDomain.create({
            data: {
                service_id: serviceId,
                domain: domainName,
                type: 'custom',
                verification_status: 'pending',
                ssl_enabled: true
            }
        });
    }

    async verifyDomain(serviceId: string, domainId: string) {
        const domainRecord = await this.prisma.serviceDomain.findUnique({
            where: { id: domainId }
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
                return this.prisma.serviceDomain.update({
                    where: { id: domainId },
                    data: {
                        verification_status: 'verified',
                        verified_at: new Date()
                    }
                });
            }
        } catch (e) {
            this.logger.warn(`DNS verification failed for ${domainRecord.domain}: ${e.message}`);
        }

        // Failed verification
        return this.prisma.serviceDomain.update({
            where: { id: domainId },
            data: { verification_status: 'failed' }
        });
    }

    async removeDomain(serviceId: string, domainId: string) {
        const domainRecord = await this.prisma.serviceDomain.findUnique({
            where: { id: domainId }
        });

        if (!domainRecord || domainRecord.service_id !== serviceId) {
            throw new NotFoundException('Domain not found');
        }

        await this.prisma.serviceDomain.delete({
            where: { id: domainId }
        });

        return { success: true };
    }
}