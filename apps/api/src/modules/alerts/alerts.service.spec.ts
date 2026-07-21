import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mockPrismaService,
  MockPrismaServiceType,
} from '../../../test/utils/mock-factory';
import { NotFoundException } from '@nestjs/common';
import {
  AlertMetric,
  AlertOperator,
  AlertChannel,
} from '../../../generated/prisma/client';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: MockPrismaServiceType;

  const mockRule = {
    id: 'rule-1',
    organization_id: 'org-1',
    name: 'High CPU Alert',
    metric: AlertMetric.cpu_percent,
    operator: AlertOperator.gt,
    threshold: 80,
    duration_seconds: 60,
    channel: AlertChannel.email,
    enabled: true,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AlertsService,
        { provide: PrismaService, useFactory: mockPrismaService },
      ],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRule', () => {
    it('should create an alert rule record', async () => {
      prisma.alertRule.create.mockResolvedValue(mockRule);

      const result = await service.createRule('org-1', {
        name: 'High CPU Alert',
        metric: AlertMetric.cpu_percent,
        operator: AlertOperator.gt,
        threshold: 80,
        channel: AlertChannel.email,
      });

      expect(prisma.alertRule.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organization_id: 'org-1',
          name: 'High CPU Alert',
          metric: AlertMetric.cpu_percent,
          operator: AlertOperator.gt,
          threshold: 80,
          channel: AlertChannel.email,
        }) as Record<string, unknown>,
      });
      expect(result).toEqual(mockRule);
    });
  });

  describe('listRules', () => {
    it('should return paginated rules', async () => {
      prisma.alertRule.findMany.mockResolvedValue([mockRule]);

      const result = await service.listRules('org-1', { limit: 10 });

      expect(prisma.alertRule.findMany).toHaveBeenCalled();
      expect(result.data).toEqual([mockRule]);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.cursor).toBe('rule-1');
    });
  });

  describe('deleteRule', () => {
    it('should throw NotFoundException if rule does not exist', async () => {
      prisma.alertRule.findFirst.mockResolvedValue(null);

      await expect(service.deleteRule('org-1', 'rule-99')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should delete rule if it exists', async () => {
      prisma.alertRule.findFirst.mockResolvedValue(mockRule);
      prisma.alertRule.delete.mockResolvedValue(mockRule);

      const result = await service.deleteRule('org-1', 'rule-1');
      expect(prisma.alertRule.delete).toHaveBeenCalledWith({
        where: { id: 'rule-1' },
      });
      expect(result).toEqual({ success: true, message: 'Rule deleted' });
    });
  });
});
