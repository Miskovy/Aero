import { Test, TestingModule } from '@nestjs/testing';
import { PlanQuotaService } from './plan-quota.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PlanQuotaService', () => {
  let service: PlanQuotaService;

  const mockPrismaService = {
    organization: {
      findUnique: jest.fn(),
    },
    plan: {
      findFirst: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    service: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
    node: {
      count: jest.fn(),
    },
    deployment: {
      count: jest.fn(),
    },
    backup: {
      count: jest.fn(),
    },
    webhook: {
      count: jest.fn(),
    },
    apiKey: {
      count: jest.fn(),
    },
    alertRule: {
      count: jest.fn(),
    },
    team: {
      count: jest.fn(),
    },
    organizationMember: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanQuotaService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PlanQuotaService>(PlanQuotaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateProjectQuota', () => {
    it('should allow project creation when below limit', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        subscription: {
          plan: { max_projects: 3, is_inf_proj: false },
        },
      });
      mockPrismaService.project.count.mockResolvedValue(2);

      await expect(service.validateProjectQuota('org-1')).resolves.toBeUndefined();
    });

    it('should allow project creation when plan has is_inf_proj = true', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        subscription: {
          plan: { max_projects: null, is_inf_proj: true },
        },
      });

      await expect(service.validateProjectQuota('org-1')).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException when project limit is reached', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        subscription: {
          plan: { max_projects: 2, is_inf_proj: false },
        },
      });
      mockPrismaService.project.count.mockResolvedValue(2);

      await expect(service.validateProjectQuota('org-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('validateCustomDomainAllowed', () => {
    it('should allow custom domain if plan has custom_domains = true', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue({
        id: 'svc-1',
        project: { organization_id: 'org-1' },
      });
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        subscription: {
          plan: { custom_domains: true },
        },
      });

      await expect(service.validateCustomDomainAllowed('svc-1')).resolves.toBeUndefined();
    });

    it('should throw ForbiddenException if plan has custom_domains = false', async () => {
      mockPrismaService.service.findUnique.mockResolvedValue({
        id: 'svc-1',
        project: { organization_id: 'org-1' },
      });
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        subscription: {
          plan: { custom_domains: false },
        },
      });

      await expect(service.validateCustomDomainAllowed('svc-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getOrganizationQuotaSummary & getReachedQuotas', () => {
    it('should return complete quota summary and correctly flag reached quotas', async () => {
      mockPrismaService.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        subscription: {
          id: 'sub-1',
          status: 'active',
          billing_cycle: 'monthly',
          current_period_start: new Date(),
          current_period_end: new Date(),
          cancel_at_period_end: false,
          plan: {
            id: 'plan-free',
            name: 'FREE',
            price: 0,
            custom_domains: false,
            max_projects: 1,
            is_inf_proj: false,
            max_services: 3,
            is_inf_services: false,
            max_nodes: 1,
            is_inf_nodes: false,
            max_deployments: 50,
            is_inf_deployments: false,
            max_backups: 2,
            is_inf_backups: false,
            max_webhooks: 2,
            is_inf_webhooks: false,
            max_apikeys: 2,
            is_inf_apikeys: false,
            max_alerts: 5,
            is_inf_alerts: false,
            max_teams: 1,
            is_inf_teams: false,
            max_members: 3,
            is_inf_members: false,
          },
        },
      });

      mockPrismaService.project.count.mockResolvedValue(1); // Reached (1/1)
      mockPrismaService.service.count.mockResolvedValue(2); // Not reached (2/3)
      mockPrismaService.node.count.mockResolvedValue(0);
      mockPrismaService.deployment.count.mockResolvedValue(10);
      mockPrismaService.backup.count.mockResolvedValue(0);
      mockPrismaService.webhook.count.mockResolvedValue(0);
      mockPrismaService.apiKey.count.mockResolvedValue(0);
      mockPrismaService.alertRule.count.mockResolvedValue(0);
      mockPrismaService.team.count.mockResolvedValue(1); // Reached (1/1)
      mockPrismaService.organizationMember.count.mockResolvedValue(1);

      const summary = await service.getOrganizationQuotaSummary('org-1');
      expect(summary.hasReachedAnyQuota).toBe(true);
      expect(summary.quotas.projects.limitReached).toBe(true);
      expect(summary.quotas.projects.percentage).toBe(100);
      expect(summary.quotas.services.limitReached).toBe(false);
      expect(summary.quotas.teams.limitReached).toBe(true);

      const reached = await service.getReachedQuotas('org-1');
      expect(reached).toHaveLength(2);
      expect(reached.map((r) => r.resource)).toEqual(['projects', 'teams']);
    });
  });
});
