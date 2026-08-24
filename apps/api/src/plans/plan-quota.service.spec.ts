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
});
