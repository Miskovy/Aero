import { Test, TestingModule } from '@nestjs/testing';
import { PlanQuotaController } from './plan-quota.controller';
import { PlanQuotaService } from './plan-quota.service';

describe('PlanQuotaController', () => {
  let controller: PlanQuotaController;
  let service: PlanQuotaService;

  const mockQuotaSummary = {
    organizationId: 'org-1',
    plan: {
      id: 'plan-1',
      name: 'FREE',
      price: 0,
      customDomains: false,
    },
    subscription: null,
    hasReachedAnyQuota: false,
    quotas: {
      projects: {
        resource: 'projects',
        used: 1,
        max: 3,
        isInfinite: false,
        percentage: 33,
        limitReached: false,
      },
      services: {
        resource: 'services',
        used: 1,
        max: 5,
        isInfinite: false,
        percentage: 20,
        limitReached: false,
      },
      nodes: {
        resource: 'nodes',
        used: 0,
        max: 1,
        isInfinite: false,
        percentage: 0,
        limitReached: false,
      },
      deployments: {
        resource: 'deployments',
        used: 5,
        max: 50,
        isInfinite: false,
        percentage: 10,
        limitReached: false,
      },
      backups: {
        resource: 'backups',
        used: 0,
        max: 2,
        isInfinite: false,
        percentage: 0,
        limitReached: false,
      },
      webhooks: {
        resource: 'webhooks',
        used: 0,
        max: 2,
        isInfinite: false,
        percentage: 0,
        limitReached: false,
      },
      apiKeys: {
        resource: 'apiKeys',
        used: 1,
        max: 2,
        isInfinite: false,
        percentage: 50,
        limitReached: false,
      },
      alerts: {
        resource: 'alerts',
        used: 0,
        max: 5,
        isInfinite: false,
        percentage: 0,
        limitReached: false,
      },
      teams: {
        resource: 'teams',
        used: 1,
        max: 1,
        isInfinite: false,
        percentage: 100,
        limitReached: true,
      },
      members: {
        resource: 'members',
        used: 1,
        max: 3,
        isInfinite: false,
        percentage: 33,
        limitReached: false,
      },
    },
    features: {
      customDomains: false,
    },
  };

  const mockPlanQuotaService = {
    getOrganizationQuotaSummary: jest
      .fn()
      .mockResolvedValue(mockQuotaSummary),
    getReachedQuotas: jest
      .fn()
      .mockResolvedValue([mockQuotaSummary.quotas.teams]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlanQuotaController],
      providers: [
        { provide: PlanQuotaService, useValue: mockPlanQuotaService },
      ],
    }).compile();

    controller = module.get<PlanQuotaController>(PlanQuotaController);
    service = module.get<PlanQuotaService>(PlanQuotaService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getQuotaSummary', () => {
    it('should return complete quota summary for an organization', async () => {
      const result = await controller.getQuotaSummary('org-1');
      expect(result).toEqual(mockQuotaSummary);
      expect(
        mockPlanQuotaService.getOrganizationQuotaSummary,
      ).toHaveBeenCalledWith('org-1');
    });
  });

  describe('getReachedQuotas', () => {
    it('should return reached quotas and hasReachedAnyQuota flag', async () => {
      const result = await controller.getReachedQuotas('org-1');
      expect(result).toEqual({
        organizationId: 'org-1',
        hasReachedAnyQuota: true,
        reachedQuotas: [mockQuotaSummary.quotas.teams],
      });
      expect(mockPlanQuotaService.getReachedQuotas).toHaveBeenCalledWith(
        'org-1',
      );
    });
  });
});
