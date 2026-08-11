import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TeamMembersService } from './teamMembers.service';
import { PrismaService } from '../prisma/prisma.service';
import { TeamRole } from '../../generated/prisma/client';

describe('TeamMembersService', () => {
  let service: TeamMembersService;

  const mockTeamMember = {
    id: 'tm-1',
    team_id: 'team-1',
    user_id: 'user-1',
    role: TeamRole.lead,
    joined_at: new Date(),
  };

  const mockTeamWithMembers = {
    id: 'team-1',
    organization_id: 'org-1',
    name: 'Engineering',
    members: [mockTeamMember],
  };

  const mockPrismaService = {
    team: {
      findUnique: jest.fn().mockResolvedValue(mockTeamWithMembers),
    },
    teamMember: {
      create: jest.fn().mockResolvedValue(mockTeamMember),
      delete: jest.fn().mockResolvedValue(mockTeamMember),
      update: jest.fn().mockResolvedValue(mockTeamMember),
      findUnique: jest.fn().mockResolvedValue(mockTeamMember),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamMembersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TeamMembersService>(TeamMembersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listTeamMembers', () => {
    it('should return team members', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue(mockTeamWithMembers);

      const result = await service.listTeamMembers('team-1');
      expect(result).toEqual([mockTeamMember]);
      expect(mockPrismaService.team.findUnique).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        include: { members: true },
      });
    });

    it('should throw BadRequestException if teamId is empty', async () => {
      await expect(service.listTeamMembers('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if team is not found', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.listTeamMembers('invalid-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('createTeamMember', () => {
    it('should create and return a team member', async () => {
      const data = { team_id: 'team-1', user_id: 'user-1', role: TeamRole.member };
      mockPrismaService.teamMember.create.mockResolvedValue(mockTeamMember);

      const result = await service.createTeamMember(data);
      expect(result).toEqual(mockTeamMember);
      expect(mockPrismaService.teamMember.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('deleteTeamMember', () => {
    it('should delete a team member', async () => {
      mockPrismaService.teamMember.delete.mockResolvedValue(mockTeamMember);

      const result = await service.deleteTeamMember('team-1', 'user-1');
      expect(result).toEqual(mockTeamMember);
      expect(mockPrismaService.teamMember.delete).toHaveBeenCalledWith({
        where: {
          team_id_user_id: {
            team_id: 'team-1',
            user_id: 'user-1',
          },
        },
      });
    });
  });

  describe('updateTeamMember', () => {
    it('should update a team member', async () => {
      const data = { role: TeamRole.lead };
      mockPrismaService.teamMember.update.mockResolvedValue({
        ...mockTeamMember,
        role: TeamRole.lead,
      });

      const result = await service.updateTeamMember('team-1', 'user-1', data);
      expect(result.role).toEqual(TeamRole.lead);
      expect(mockPrismaService.teamMember.update).toHaveBeenCalledWith({
        where: {
          team_id_user_id: {
            team_id: 'team-1',
            user_id: 'user-1',
          },
        },
        data,
      });
    });
  });

  describe('getTeamMemberbyId', () => {
    it('should return a team member', async () => {
      mockPrismaService.teamMember.findUnique.mockResolvedValue(mockTeamMember);

      const result = await service.getTeamMemberbyId('team-1', 'user-1');
      expect(result).toEqual(mockTeamMember);
    });
  });
});
