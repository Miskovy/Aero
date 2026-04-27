import { Injectable } from '@nestjs/common';
import { Service } from '../../../generated/prisma/client';
import { DomainsService } from '../domains/domain.service';

@Injectable()
export class TraefikService {
  constructor(private readonly domainsService: DomainsService) {}

  buildLabelsForService(service: Service, domain: string, port: number = 3000): Record<string, string> {
    const name = `aero-${service.slug}`;
    
    return {
      'traefik.enable': 'true',
      [`traefik.http.routers.${name}.rule`]: `Host(\`${domain}\`)`,
      [`traefik.http.routers.${name}.entrypoints`]: 'websecure',
      [`traefik.http.routers.${name}.tls.certresolver`]: 'aero',
      [`traefik.http.services.${name}.loadbalancer.server.port`]: String(port), 
    };
  }

  async getRoutingLabels(service: Service, targetPort: number = 3000): Promise<Record<string, string>> {
    const domain = await this.domainsService.getPrimaryDomain(service.id);
    return this.buildLabelsForService(service, domain, targetPort);
  }
}