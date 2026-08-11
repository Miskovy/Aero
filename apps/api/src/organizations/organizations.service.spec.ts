import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../prisma/prisma.service';
import { PlansService } from '../plans/plans.service';
import { TeamsService } from '../teams/teams.service';
import { TeamMembersService } from '../teams/teamMembers.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  const mockOrg = {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp-1234',
    owner_id: 'user-1',
    plan: 'FREE',
    plan_id: 'plan-free',
    settings: {},
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPlan = {
    id: 'plan-free',
    name: 'FREE',
  };

  const mockTeam = {
    id: 'team-1',
    name: 'Acme Corp Team',
    organization_id: 'org-1',
  };

  const mockTeamMember = {
    id: 'tm-1',
    team_id: 'team-1',
    user_id: 'user-1',
    role: 'lead',
  };

  const mockPrismaService = {
    organization: {
      findMany: jest.fn().mockResolvedValue([mockOrg]),
      create: jest.fn().mockResolvedValue(mockOrg),
    },
    $transaction: jest.fn().mockImplementation(async (cb) => {
      const txMock = {
        organization: {
          create: jest.fn().mockResolvedValue(mockOrg),
        },
      };
      return await cb(txMock);
    }),
  };

  const mockPlansService = {
    getPlanbyName: jest.fn().mockResolvedValue(mockPlan),
  };

  const mockTeamsService = {
    createTeam: jest.fn().mockResolvedValue(mockTeam),
  };

  const mockTeamMembersService = {
    createTeamMember: jest.fn().mockResolvedValue(mockTeamMember),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: PlansService, useValue: mockPlansService },
        { provide: TeamsService, useValue: mockTeamsService },
        { provide: TeamMembersService, useValue: mockTeamMembersService },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listOrganizations', () => {
    it('should list organizations with pagination', async () => {
      mockPrismaService.organization.findMany.mockResolvedValue([mockOrg]);

      const result = await service.listOrganizations({ limit: 10 }, 'user-1');
      expect(result.data).toEqual([mockOrg]);
      expect(result.meta.hasMore).toBe(false);
      expect(mockPrismaService.organization.findMany).toHaveBeenCalled();
    });
  });

  describe('createOrganization', () => {
    it('should throw UnauthorizedException if userId is not provided', async () => {
      await expect(service.createOrganization('Acme Corp')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw BadRequestException if plan is not found', async () => {
      mockPlansService.getPlanbyName.mockResolvedValue(null);

      await expect(
        service.createOrganization('Acme Corp', 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should create an organization, team, and member within transaction', async () => {
      mockPlansService.getPlanbyName.mockResolvedValue(mockPlan);

      const result = await service.createOrganization('Acme Corp', 'user-1');
      expect(result).toEqual(mockOrg);
      expect(mockPlansService.getPlanbyName).toHaveBeenCalledWith('FREE');
      expect(mockTeamsService.createTeam).toHaveBeenCalled();
      expect(mockTeamMembersService.createTeamMember).toHaveBeenCalled();
    });
  });
});
