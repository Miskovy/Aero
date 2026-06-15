import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceService } from './marketplace.service';
import { PrismaService } from '../../prisma/prisma.service';
import { DeploymentsService } from '../deployments/deployment.service';
import { VaultService } from '../vault/vault.service';
import { BadRequestException } from '@nestjs/common';

describe('MarketplaceService', () => {
  let service: MarketplaceService;
  let fetchSpy: jest.SpyInstance;

  const mockPrismaService = {
    service: {
      create: jest.fn(),
    },
    environmentVariable: {
      create: jest.fn(),
    },
  };

  const mockDeploymentsService = {
    triggerDeployment: jest.fn(),
  };

  const mockVaultService = {
    encrypt: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: DeploymentsService, useValue: mockDeploymentsService },
        { provide: VaultService, useValue: mockVaultService },
      ],
    }).compile();

    service = module.get<MarketplaceService>(MarketplaceService);
    fetchSpy = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    delete process.env.AERO_MARKETPLACE_REGISTRY_URL;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRegistry', () => {
    it('should fetch from registry URL and return registry data', async () => {
      const mockRegistry = { templates: [] };
      process.env.AERO_MARKETPLACE_REGISTRY_URL =
        'https://example.com/registry.json';

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRegistry),
      } as any);

      const result = await service.getRegistry();
      expect(result).toEqual(mockRegistry);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://example.com/registry.json',
      );
    });

    it('should normalize github blob URLs to raw user content URLs', async () => {
      const mockRegistry = { templates: [] };
      process.env.AERO_MARKETPLACE_REGISTRY_URL =
        'https://github.com/Miskovy/aero-marketplace-registry/blob/main/registry.json';

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRegistry),
      } as any);

      const result = await service.getRegistry();
      expect(result).toEqual(mockRegistry);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/Miskovy/aero-marketplace-registry/main/registry.json',
      );
    });

    it('should normalize github raw URLs to raw user content URLs', async () => {
      const mockRegistry = { templates: [] };
      process.env.AERO_MARKETPLACE_REGISTRY_URL =
        'https://github.com/Miskovy/aero-marketplace-registry/raw/main/registry.json';

      fetchSpy.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockRegistry),
      } as any);

      const result = await service.getRegistry();
      expect(result).toEqual(mockRegistry);
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://raw.githubusercontent.com/Miskovy/aero-marketplace-registry/main/registry.json',
      );
    });

    it('should throw BadRequestException if fetch fails', async () => {
      process.env.AERO_MARKETPLACE_REGISTRY_URL =
        'https://example.com/registry.json';
      fetchSpy.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.getRegistry()).rejects.toThrow(BadRequestException);
    });
  });
});
