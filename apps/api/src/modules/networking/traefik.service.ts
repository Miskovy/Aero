import { Injectable } from '@nestjs/common';
import { Service } from '../../../generated/prisma/client';
import { DomainsService } from '../domains/domain.service';

@Injectable()
export class TraefikService {
  constructor(private readonly domainsService: DomainsService) {}

  buildLabelsForService(
    service: Service,
    domains: string[],
    port: number = 3000,
  ): Record<string, string> {
    const name = `aero-${service.slug}`;

    // Support multiple domains using Traefik's OR syntax
    // Example: Host(`a.com`) || Host(`b.com`)
    const hostRule = domains.map((d) => `Host(\`${d}\`)`).join(' || ');

    return {
      'traefik.enable': 'true',
      [`traefik.http.routers.${name}.rule`]: hostRule,
      [`traefik.http.routers.${name}.entrypoints`]: 'websecure',
      [`traefik.http.routers.${name}.tls.certresolver`]: 'aero',
      [`traefik.http.services.${name}.loadbalancer.server.port`]: String(port),
    };
  }

  async getRoutingLabels(
    service: Service,
    targetPort: number = 3000,
  ): Promise<Record<string, string>> {
    const domainsRecords = await this.domainsService.getAllServiceDomains(
      service.id,
    );

    // Filter for auto_generated or verified custom domains
    const activeDomains = domainsRecords
      .filter(
        (d) =>
          d.type === 'auto_generated' || d.verification_status === 'verified',
      )
      .map((d) => d.domain);

    // Fallback to a placeholder if no domains exist
    if (activeDomains.length === 0) {
      activeDomains.push(`${service.id}.example.com`);
    }

    return this.buildLabelsForService(service, activeDomains, targetPort);
  }
}
