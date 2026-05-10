import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DeploymentsService } from '../deployments/deployment.service';
import { VaultService } from '../vault/vault.service';
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';
import * as path from 'path';
import { MarketplaceTemplate, RegistryData } from './interfaces/marketplace.interface';

@Injectable()
export class MarketplaceService {
  private readonly logger = new Logger(MarketplaceService.name);
  private cachedRegistry: RegistryData | null = null;
  private lastFetchTime: number = 0;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly deploymentsService: DeploymentsService,
    private readonly vaultService: VaultService,
  ) { }

  async getRegistry(): Promise<RegistryData> {
    const now = Date.now();
    if (this.cachedRegistry && (now - this.lastFetchTime < this.CACHE_TTL)) {
      return this.cachedRegistry;
    }

    const registryUrl = process.env.AERO_MARKETPLACE_REGISTRY_URL || '';

    try {
      const response = await fetch(registryUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch registry from ${registryUrl}: ${response.statusText}`);
      }

      const data = await response.json() as RegistryData;

      this.cachedRegistry = data;
      this.lastFetchTime = now;

      return data;
    } catch (error) {
      this.logger.error(`Registry fetch error: ${error.message}`);
      if (this.cachedRegistry) {
        this.logger.warn('Returning stale cache due to fetch error.');
        return this.cachedRegistry;
      }
      throw new BadRequestException('Could not connect to the Aero Marketplace Registry');
    }
  }

  async listTemplates(): Promise<MarketplaceTemplate[]> {
    const registry = await this.getRegistry();
    return registry.templates;
  }

  async getTemplate(id: string): Promise<MarketplaceTemplate> {
    const registry = await this.getRegistry();
    const template = registry.templates.find(t => t.id === id);
    if (!template) {
      throw new NotFoundException(`Template with ID ${id} not found in the registry`);
    }
    return template;
  }

  async deployTemplate(projectId: string, templateId: string, envVars: Record<string, string>, userId?: string) {
    const template = await this.getTemplate(templateId);

    let composeContent = '';
    try {
      const response = await fetch(template.compose_url);
      if (!response.ok) throw new Error('Bad response');
      composeContent = await response.text();
    } catch (e) {
      throw new BadRequestException(`Failed to download template configuration from ${template.compose_url}`);
    }

    let parsedYaml: Record<string, any>;
    try {
      parsedYaml = yaml.load(composeContent) as Record<string, any>;
      if (!parsedYaml || typeof parsedYaml !== 'object' || !parsedYaml.services) {
        throw new Error('Invalid docker-compose structure. Must contain "services" block.');
      }

      // Strict SSRF/Security Check: reject privileged mode
      for (const [serviceName, serviceConfig] of Object.entries(parsedYaml.services as any)) {
        if ((serviceConfig as any).privileged) {
          throw new Error(`Service ${serviceName} requests privileged mode which is not allowed.`);
        }
      }
    } catch (e) {
      throw new BadRequestException(`Schema validation failed: ${e.message}`);
    }

    const baseSlug = template.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
    const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;

    const dirPath = path.join(process.cwd(), 'data', 'marketplace', slug);
    await fs.mkdir(dirPath, { recursive: true });
    const composePath = path.join(dirPath, 'docker-compose.yml');

    await fs.writeFile(composePath, composeContent, 'utf8');


    const service = await this.prisma.service.create({
      data: {
        project_id: projectId,
        name: template.name,
        slug,
        type: 'application',
        source_type: 'marketplace',
        docker_compose_path: composePath,
      }
    });


    if (envVars && Object.keys(envVars).length > 0) {
      for (const [key, value] of Object.entries(envVars)) {
        const { encryptedValue, iv, authTag, version } = this.vaultService.encrypt(value);
        await this.prisma.environmentVariable.create({
          data: {
            service_id: service.id,
            key,
            encrypted_value: encryptedValue,
            iv,
            auth_tag: authTag,
            key_version: version,
            is_secret: true,
          }
        });
      }
    }

    const deployment = await this.deploymentsService.triggerDeployment(service.id, userId);

    return { service, deployment };
  }
}
