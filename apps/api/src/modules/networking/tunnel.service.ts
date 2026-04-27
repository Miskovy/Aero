import { Injectable, Logger, OnApplicationBootstrap , BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DockerService } from '../docker/docker.service';
import { VaultService } from '../vault/vault.service';
import { Service, Project, Organization } from '../../../generated/prisma/client'; 

type ServiceWithRelations = Service & { 
  project: Project & { organization: Organization } 
};

@Injectable()
export class TunnelService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TunnelService.name);

  constructor(
    private readonly dockerService: DockerService,
    private readonly config: ConfigService,
    private readonly vaultService: VaultService
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Booting up Aero infrastructure...');
    try {
      await this.startTunnel(); 
    } catch (error) {
      this.logger.error('Failed to start platform tunnel during bootstrap.');
      console.error('THE REAL ERROR IS:', error);
    }
  }

  async exposeService(service: ServiceWithRelations): Promise<string> {
    const project = service.project;
    const org = project.organization;

    const isPaidPlan = org.plan && org.plan !== 'free';

    const settings = (project.settings as Record<string, any>) || {};
    const cfSettings = settings.cloudflare; 

    const useTenantTunnel = isPaidPlan && cfSettings?.apiTokenEncrypted;

    let apiToken: string;
    let zoneId: string;
    let tunnelId: string;
    let fullDomainName: string;

    if (useTenantTunnel) {
      // --- PAID TIER: Extract from JSON and Decrypt ---
      apiToken = this.vaultService.decrypt(
        cfSettings.apiTokenEncrypted, 
        cfSettings.iv, 
        cfSettings.authTag
      );
      zoneId = cfSettings.zoneId;
      tunnelId = cfSettings.tunnelId;
      fullDomainName = `${service.slug}.${cfSettings.customDomain}`;
    } else {
      // --- FREE TIER: Use Platform .env fallback ---
      apiToken = this.config.get<string>('CLOUDFLARE_API_TOKEN') || '';
      zoneId = this.config.get<string>('CLOUDFLARE_ZONE_ID') || '';
      tunnelId = this.config.get<string>('CLOUDFLARE_TUNNEL_ID') || '';
      
      const baseDomain = this.config.get<string>('TUNNEL_DOMAIN') || 'aero.local';
      fullDomainName = `${service.slug}.${baseDomain}`;
    }

    if (!apiToken || !zoneId || !tunnelId) {
      throw new Error(`Cloudflare configuration is missing for ${useTenantTunnel ? 'Tenant' : 'Platform'}`);
    }

    const cnameTarget = `${tunnelId}.cfargotunnel.com`;

    try {
      const response = await fetch(`https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'CNAME',
          name: fullDomainName, 
          content: cnameTarget,
          proxied: true, 
          comment: `Managed by Aero: ${service.slug} (Org: ${org.slug})`,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        const isDuplicate = result.errors?.some((e: { code: number }) => e.code === 81053);
        if (!isDuplicate) {
          throw new Error(result.errors?.[0]?.message || 'Unknown API error');
        }
      }

      this.logger.log(`DNS record configured for ${fullDomainName}`);
      return `https://${fullDomainName}`;

    } catch (error) {
      this.logger.error(`DNS configuration failed for ${fullDomainName}`, error);
      throw error;
    }
  }

  async startTunnel(project?: Project): Promise<void> {
    // Check if a paid user is bringing their own tunnel
    const settings = (project?.settings as Record<string, any>) || {};
    const cfSettings = settings.cloudflare;
    const isTenant = project && cfSettings?.tunnelTokenEnc;
    
    const tunnelName = isTenant ? `aero-cloudflared-${project.id}` : 'aero-cloudflared-shared';
    
    let tunnelToken = '';
    if (isTenant) {
      tunnelToken = this.vaultService.decrypt(cfSettings.tunnelTokenEnc, cfSettings.iv, cfSettings.authTag);
    } else {
      tunnelToken = this.config.get<string>('CLOUDFLARE_TUNNEL_TOKEN') || '';
    }

    if (!tunnelToken) throw new BadRequestException(`Tunnel token is missing for ${tunnelName}`);

    // Prevent duplicate tunnels
    const existing = await this.dockerService.listContainers({ all: true, filters: { name: [tunnelName] } });
    
    if (existing.length > 0) {
      if (existing[0].State !== 'running') {
        const container = this.dockerService.getContainer(existing[0].Id);
        await container.start();
        this.logger.log(`Restarted existing Cloudflare tunnel: ${tunnelName}`);
      } else {
        this.logger.log(`Cloudflare tunnel ${tunnelName} is already running.`);
      }
      return;
    }

    // Create and start the new tunnel
    const container = await this.dockerService.createContainer({
      Image: 'cloudflare/cloudflared:latest',
      name: tunnelName,
      Cmd: ['tunnel', '--no-autoupdate', 'run', '--token', tunnelToken],
      Labels: { 'aero.managed': 'true', 'aero.system.component': 'tunnel' },
    });

    await container.start();
    this.logger.log(`Successfully started Cloudflare tunnel: ${tunnelName}`);
  }
}