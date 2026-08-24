import { Test, TestingModule } from '@nestjs/testing';
import { ServicesService } from './services.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanQuotaService } from '../../plans/plan-quota.service';
import { VaultService } from '../vault/vault.service';
import { CloudflareService } from '../cloudflare/cloudflare.service';
import { DockerService } from '../docker/docker.service';
import { DeploymentsService } from '../deployments/deployment.service';
import {
  mockPrismaService,
  MockPrismaServiceType,
} from '../../../test/utils/mock-factory';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { NotFoundException } from '@nestjs/common';

describe('ServicesService', () => {
  let service: ServicesService;
  let prisma: MockPrismaServiceType;
  let dockerService: Record<string, jest.Mock>;
  let cloudflareService: Record<string, jest.Mock>;

  const mockPlanQuotaService = {
    validateServiceQuota: jest.fn().mockResolvedValue(undefined),
    validateCustomDomainAllowed: jest.fn().mockResolvedValue(undefined),
  };

  const mockService = {
    id: 'svc-1',
    name: 'Test Service',
    slug: 'test-service',
    status: 'stopped',
    project_id: 'proj-1',
    internal_port: 3000,
    domains: [],
  };

  beforeEach(async () => {
    dockerService = {
      listContainers: jest.fn().mockResolvedValue([]),
      startContainer: jest.fn().mockResolvedValue(true),
      stopContainer: jest.fn().mockResolvedValue(true),
      restartContainer: jest.fn().mockResolvedValue(true),
    };

    cloudflareService = {
      updateTunnelIngress: jest.fn().mockResolvedValue(true),
      createDeploymentDomain: jest
        .fn()
        .mockResolvedValue({ domain: 'test.aerodeploy.app' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServicesService,
        { provide: PrismaService, useFactory: mockPrismaService },
        { provide: PlanQuotaService, useValue: mockPlanQuotaService },
        { provide: VaultService, useValue: { encrypt: jest.fn() } },
        { provide: CloudflareService, useValue: cloudflareService },
        { provide: DockerService, useValue: dockerService },
        {
          provide: DeploymentsService,
          useValue: { triggerDeployment: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<ServicesService>(ServicesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listAllServices', () => {
    it('should return paginated services without cursor', async () => {
      const mockServices = [mockService];
      prisma.service.findMany.mockResolvedValue(mockServices);

      const pagination: PaginationDto = { limit: 10 };
      const result = await service.listAllServices(pagination, 'user-1');

      expect(prisma.service.findMany).toHaveBeenCalled();
      expect(result.data).toEqual(mockServices);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.cursor).toBe('svc-1');
    });

    it('should calculate hasMore when items exceed limit', async () => {
      const item1 = { ...mockService, id: '1' };
      const item2 = { ...mockService, id: '2' };

      prisma.service.findMany.mockResolvedValue([item1, item2]);

      const pagination: PaginationDto = { limit: 1 };
      const result = await service.listAllServices(pagination);

      expect(result.data).toHaveLength(1);
      expect(result.meta.hasMore).toBe(true);
      expect(result.meta.cursor).toBe('1');
    });
  });

  describe('getServiceDetails', () => {
    it('should find service by id with relations', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);

      const result = await service.getServiceDetails('svc-1');
      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'svc-1' },
        include: expect.any(Object) as unknown,
      });
      expect(result).toEqual(mockService);
    });
  });

  describe('updateService', () => {
    it('should update service properties', async () => {
      const updated = { ...mockService, name: 'Updated Name' };
      prisma.service.update.mockResolvedValue(updated);

      const result = await service.updateService('svc-1', {
        name: 'Updated Name',
      });
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'svc-1' },
        data: { name: 'Updated Name' },
        include: expect.any(Object) as unknown,
      });
      expect(result.name).toBe('Updated Name');
    });
  });

  describe('deleteService', () => {
    it('should execute transaction to delete service and related entities', async () => {
      prisma.$transaction.mockResolvedValue([
        {},
        {},
        {},
        {},
        {},
        {},
        mockService,
      ]);

      const result = await service.deleteService('svc-1');
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({
        success: true,
        message: 'Service deleted successfully',
      });
    });
  });

  describe('startService / stopService / restartService', () => {
    it('should start service and update status to running', async () => {
      dockerService.listContainers.mockResolvedValue([{ Id: 'cont-1' }]);
      prisma.service.update.mockResolvedValue({
        ...mockService,
        status: 'running',
      });

      const result = await service.startService('svc-1');
      expect(dockerService.startContainer).toHaveBeenCalledWith('cont-1');
      expect(prisma.service.update).toHaveBeenCalledWith({
        where: { id: 'svc-1' },
        data: { status: 'running' },
        include: { node: true },
      });
      expect(result.service.status).toBe('running');
    });

    it('should stop service and update status to stopped', async () => {
      dockerService.listContainers.mockResolvedValue([{ Id: 'cont-1' }]);
      prisma.service.update.mockResolvedValue({
        ...mockService,
        status: 'stopped',
      });

      const result = await service.stopService('svc-1');
      expect(dockerService.stopContainer).toHaveBeenCalledWith('cont-1');
      expect(result.service.status).toBe('stopped');
    });

    it('should throw NotFoundException on restart if no container exists', async () => {
      dockerService.listContainers.mockResolvedValue([]);

      await expect(service.restartService('svc-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
