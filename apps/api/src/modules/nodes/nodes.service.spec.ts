import { Test, TestingModule } from '@nestjs/testing';
import { NodesService } from './nodes.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanQuotaService } from '../../plans/plan-quota.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('NodesService', () => {
  let service: NodesService;
  let prisma: typeof mockPrismaService;

  const mockPlanQuotaService = {
    validateNodeQuota: jest.fn().mockResolvedValue(undefined),
  };

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    node: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NodesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PlanQuotaService, useValue: mockPlanQuotaService },
      ],
    }).compile();

    service = module.get<NodesService>(NodesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listNodes', () => {
    it('should list nodes for an organization', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        members: [{ user_id: 'user-1' }],
      });
      prisma.node.findMany.mockResolvedValue([
        { id: 'node-1', name: 'Server 1', status: 'online' },
      ]);

      const result = await service.listNodes('org-1', { limit: 20 }, 'user-1');

      expect(result.data).toHaveLength(1);
      expect((result.data[0] as Record<string, unknown>).id).toBe('node-1');
    });

    it('should throw ForbiddenException if user is not a member', async () => {
      prisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        members: [{ user_id: 'other-user' }],
      });

      await expect(
        service.listNodes('org-1', { limit: 20 }, 'user-1'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('recordHeartbeat', () => {
    it('should update telemetry heartbeat and mark node online', async () => {
      prisma.node.findUnique.mockResolvedValue({
        id: 'node-1',
        agent_token: 'valid-token',
        ip_address: '1.2.3.4',
      });

      prisma.node.update.mockResolvedValue({
        id: 'node-1',
        status: 'online',
        last_heartbeat_at: new Date(),
      });

      const result = await service.recordHeartbeat('valid-token', {
        cpuUsage: 12.5,
        memoryUsage: 45.0,
      });

      expect(prisma.node.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'node-1' },
          data: expect.objectContaining({
            status: 'online',
          }) as unknown,
        }),
      );
      expect(result.status).toBe('online');
    });

    it('should throw NotFoundException for invalid token', async () => {
      prisma.node.findUnique.mockResolvedValue(null);

      await expect(
        service.recordHeartbeat('invalid-token', { cpuUsage: 10 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('auditNodeHealth', () => {
    it('should update stale nodes to offline status', async () => {
      prisma.node.updateMany.mockResolvedValue({ count: 2 });

      await service.auditNodeHealth();

      expect(prisma.node.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'online',
          OR: [
            { last_heartbeat_at: { lt: expect.any(Date) as unknown as Date } },
            { last_heartbeat_at: null },
          ],
        },
        data: {
          status: 'offline',
        },
      });
    });
  });

  describe('selectOptimalNode', () => {
    it('should return least loaded node based on service count and CPU usage', async () => {
      prisma.node.findMany.mockResolvedValue([
        {
          id: 'node-heavy',
          status: 'online',
          services: [{ id: 's1' }, { id: 's2' }],
          resource_usage: { cpu_usage_pct: 80 },
        },
        {
          id: 'node-light',
          status: 'online',
          services: [{ id: 's3' }],
          resource_usage: { cpu_usage_pct: 15 },
        },
      ]);

      const optimal = await service.selectOptimalNode('org-1');

      expect(optimal).toBeDefined();
      expect(optimal?.id).toBe('node-light');
    });
  });
});
