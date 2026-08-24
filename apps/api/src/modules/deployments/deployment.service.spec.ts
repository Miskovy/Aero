import { Test, TestingModule } from '@nestjs/testing';
import { DeploymentsService } from './deployment.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanQuotaService } from '../../plans/plan-quota.service';
import { getQueueToken } from '@nestjs/bullmq';
import {
  mockPrismaService,
  MockPrismaServiceType,
} from '../../../test/utils/mock-factory';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('DeploymentsService', () => {
  let service: DeploymentsService;
  let prisma: MockPrismaServiceType;
  let deploymentsQueue: Record<string, jest.Mock>;

  const mockPlanQuotaService = {
    validateDeploymentQuota: jest.fn().mockResolvedValue(undefined),
  };

  const mockDeployment = {
    id: 'dep-1',
    service_id: 'svc-1',
    status: 'queued',
    trigger: 'manual',
    triggered_by: 'user-1',
    docker_image_tag: 'tag-1',
  };

  const mockService = {
    id: 'svc-1',
    name: 'Service 1',
    git_repository: 'user/repo',
    git_branch: 'main',
  };

  beforeEach(async () => {
    deploymentsQueue = {
      add: jest.fn().mockResolvedValue(true),
      getJobs: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DeploymentsService,
        { provide: PrismaService, useFactory: mockPrismaService },
        { provide: PlanQuotaService, useValue: mockPlanQuotaService },
        { provide: getQueueToken('deployments'), useValue: deploymentsQueue },
      ],
    }).compile();

    service = module.get<DeploymentsService>(DeploymentsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerDeployment', () => {
    it('should throw NotFoundException if service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.triggerDeployment('missing-svc')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create a deployment record and enqueue a deploy job', async () => {
      prisma.service.findUnique.mockResolvedValue(mockService);
      prisma.deployment.create.mockResolvedValue(mockDeployment);

      const result = await service.triggerDeployment('svc-1', 'user-1');

      expect(prisma.service.findUnique).toHaveBeenCalledWith({
        where: { id: 'svc-1' },
      });
      expect(prisma.deployment.create).toHaveBeenCalledWith({
        data: {
          service_id: 'svc-1',
          status: 'queued',
          trigger: 'manual',
          triggered_by: 'user-1',
        },
      });
      expect(deploymentsQueue.add).toHaveBeenCalledWith('deploy', {
        serviceId: 'svc-1',
        deploymentId: 'dep-1',
        gitUrl: 'https://github.com/user/repo.git',
        branch: 'main',
      });
      expect(result).toEqual(mockDeployment);
    });
  });

  describe('listDeployments', () => {
    it('should return paginated deployments', async () => {
      prisma.deployment.findMany.mockResolvedValue([mockDeployment]);

      const result = await service.listDeployments('svc-1', { limit: 10 });

      expect(prisma.deployment.findMany).toHaveBeenCalled();
      expect(result.data).toEqual([mockDeployment]);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.cursor).toBe('dep-1');
    });
  });

  describe('getDeploymentDetails', () => {
    it('should return deployment details with logs', async () => {
      prisma.deployment.findFirst.mockResolvedValue(mockDeployment);

      const result = await service.getDeploymentDetails('svc-1', 'dep-1');
      expect(result).toEqual(mockDeployment);
    });

    it('should throw NotFoundException if deployment does not exist', async () => {
      prisma.deployment.findFirst.mockResolvedValue(null);

      await expect(
        service.getDeploymentDetails('svc-1', 'missing'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('triggerRollback', () => {
    it('should throw BadRequestException if deployment status is not failed', async () => {
      prisma.deployment.findUnique.mockResolvedValue({
        ...mockDeployment,
        status: 'running',
      });

      await expect(service.triggerRollback('svc-1', 'dep-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should update status to rolled_back and enqueue rollback job when status is failed', async () => {
      const failed = { ...mockDeployment, status: 'failed' };
      prisma.deployment.findUnique.mockResolvedValue(failed);
      prisma.deployment.update.mockResolvedValue({
        ...failed,
        status: 'rolled_back',
      });

      const result = await service.triggerRollback('svc-1', 'dep-1');

      expect(prisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'dep-1' },
        data: { status: 'rolled_back' },
      });
      expect(deploymentsQueue.add).toHaveBeenCalledWith('rollback', {
        serviceId: 'svc-1',
        deploymentId: 'dep-1',
        failedContainerId: 'tag-1',
      });
      expect(result.status).toBe('rolled_back');
    });
  });

  describe('cancelDeployment', () => {
    it('should throw BadRequestException if deployment cannot be cancelled', async () => {
      prisma.deployment.findFirst.mockResolvedValue({
        ...mockDeployment,
        status: 'running',
      });

      await expect(service.cancelDeployment('svc-1', 'dep-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should cancel deployment if queued or building', async () => {
      prisma.deployment.findFirst.mockResolvedValue(mockDeployment);
      prisma.deployment.update.mockResolvedValue({
        ...mockDeployment,
        status: 'cancelled',
      });

      const result = await service.cancelDeployment('svc-1', 'dep-1');

      expect(prisma.deployment.update).toHaveBeenCalledWith({
        where: { id: 'dep-1' },
        data: {
          status: 'cancelled',
          finished_at: expect.any(Date) as unknown,
        },
      });
      expect(result.status).toBe('cancelled');
    });
  });
});
