import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DomainsService {
    private readonly logger = new Logger(DomainsService.name);

    constructor(private readonly prisma: PrismaService) {}

    async getPrimaryDomain(serviceId: string): Promise<string> {
        const service = await this.prisma.serviceDomain.findFirst({
            where: { service_id: serviceId, type: 'auto_generated' },
        });
        this.logger.log(`Fetched primary domain for service ${serviceId}: ${service ? service.domain : 'none'}`);
        return service ? service.domain : `${serviceId}.example.com`; // Placeholder
    }
}