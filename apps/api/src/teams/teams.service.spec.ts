import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { PrismaService } from '../prisma/prisma.service';

describe('TeamsService', () => {
  let service: TeamsService;

  const mockTeam = {
    id: 'team-1',
    organization_id: 'org-1',
    name: 'Engineering',
    description: 'Engineering Team',
    created_at: new Date(),
  };

  const mockPrismaService = {
    team: {
      findMany: jest.fn().mockResolvedValue([mockTeam]),
      findUnique: jest.fn().mockResolvedValue(mockTeam),
      create: jest.fn().mockResolvedValue(mockTeam),
      update: jest.fn().mockResolvedValue(mockTeam),
      delete: jest.fn().mockResolvedValue(mockTeam),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listOrgTeams', () => {
    it('should return teams for an organization', async () => {
      mockPrismaService.team.findMany.mockResolvedValue([mockTeam]);

      const result = await service.listOrgTeams('org-1');
      expect(result).toEqual([mockTeam]);
      expect(mockPrismaService.team.findMany).toHaveBeenCalledWith({
        where: { organization_id: 'org-1' },
      });
    });

    it('should throw BadRequestException if orgId is empty', async () => {
      await expect(service.listOrgTeams('')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTeambyId', () => {
    it('should return a team by id', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue(mockTeam);

      const result = await service.getTeambyId('team-1');
      expect(result).toEqual(mockTeam);
    });

    it('should throw BadRequestException if teamId is empty', async () => {
      await expect(service.getTeambyId('')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if team is not found', async () => {
      mockPrismaService.team.findUnique.mockResolvedValue(null);

      await expect(service.getTeambyId('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createTeam', () => {
    it('should create and return a team', async () => {
      const data = { name: 'Engineering', organization_id: 'org-1' };
      mockPrismaService.team.create.mockResolvedValue(mockTeam);

      const result = await service.createTeam(data);
      expect(result).toEqual(mockTeam);
      expect(mockPrismaService.team.create).toHaveBeenCalledWith({ data });
    });
  });

  describe('updateTeam', () => {
    it('should update and return a team', async () => {
      const data = { name: 'DevOps' };
      mockPrismaService.team.update.mockResolvedValue({
        ...mockTeam,
        name: 'DevOps',
      });

      const result = await service.updateTeam('team-1', data);
      expect(result.name).toEqual('DevOps');
      expect(mockPrismaService.team.update).toHaveBeenCalledWith({
        where: { id: 'team-1' },
        data,
      });
    });
  });

  describe('deleteTeam', () => {
    it('should delete a team', async () => {
      mockPrismaService.team.delete.mockResolvedValue(mockTeam);

      const result = await service.deleteTeam('team-1');
      expect(result).toEqual(mockTeam);
      expect(mockPrismaService.team.delete).toHaveBeenCalledWith({
        where: { id: 'team-1' },
      });
    });

    it('should throw BadRequestException if delete fails', async () => {
      mockPrismaService.team.delete.mockRejectedValue(new Error('Has members'));

      await expect(service.deleteTeam('team-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
