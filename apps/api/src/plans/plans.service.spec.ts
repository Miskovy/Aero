import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { PlansService } from './plans.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PlansService', () => {
  let service: PlansService;

  const mockPlan = {
    id: 'plan-1',
    name: 'FREE',
    price_monthly: 0,
    price_yearly: 0,
    max_deployments: 5,
    max_build_minutes: 500,
    max_bandwidth_gb: 50,
    max_team_members: 3,
    custom_domains: true,
    ssl_certificates: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockPrismaService = {
    plan: {
      findMany: jest.fn().mockResolvedValue([mockPlan]),
      findUnique: jest.fn().mockResolvedValue(mockPlan),
      findFirst: jest.fn().mockResolvedValue(mockPlan),
      create: jest.fn().mockResolvedValue(mockPlan),
      update: jest.fn().mockResolvedValue(mockPlan),
      delete: jest.fn().mockResolvedValue(mockPlan),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlansService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PlansService>(PlansService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllPlans', () => {
    it('should return an array of plans', async () => {
      mockPrismaService.plan.findMany.mockResolvedValue([mockPlan]);
      const result = await service.getAllPlans();
      expect(result).toEqual([mockPlan]);
      expect(mockPrismaService.plan.findMany).toHaveBeenCalled();
    });
  });

  describe('createPlan', () => {
    it('should create and return a plan', async () => {
      const createData = { name: 'PRO', price: 29 };
      mockPrismaService.plan.create.mockResolvedValue({ ...mockPlan, name: 'PRO' });

      const result = await service.createPlan(createData);
      expect(result.name).toEqual('PRO');
      expect(mockPrismaService.plan.create).toHaveBeenCalledWith({ data: createData });
    });
  });

  describe('updatePlan', () => {
    it('should update and return a plan', async () => {
      const updateData = { name: 'ENTERPRISE' };
      mockPrismaService.plan.update.mockResolvedValue({ ...mockPlan, name: 'ENTERPRISE' });

      const result = await service.updatePlan('plan-1', updateData);
      expect(result.name).toEqual('ENTERPRISE');
      expect(mockPrismaService.plan.update).toHaveBeenCalledWith({
        where: { id: 'plan-1' },
        data: updateData,
      });
    });
  });

  describe('deletePlan', () => {
    it('should delete a plan', async () => {
      mockPrismaService.plan.delete.mockResolvedValue(mockPlan);

      const result = await service.deletePlan('plan-1');
      expect(result).toEqual(mockPlan);
      expect(mockPrismaService.plan.delete).toHaveBeenCalledWith({ where: { id: 'plan-1' } });
    });

    it('should throw BadRequestException if delete fails', async () => {
      mockPrismaService.plan.delete.mockRejectedValue(new Error('Foreign key constraint'));

      await expect(service.deletePlan('plan-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPlan', () => {
    it('should return a plan by id', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue(mockPlan);

      const result = await service.getPlan('plan-1');
      expect(result).toEqual(mockPlan);
    });

    it('should throw BadRequestException if id is empty', async () => {
      await expect(service.getPlan('')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if plan is not found', async () => {
      mockPrismaService.plan.findUnique.mockResolvedValue(null);

      await expect(service.getPlan('invalid-id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPlanbyName', () => {
    it('should return a plan by name', async () => {
      mockPrismaService.plan.findFirst.mockResolvedValue(mockPlan);

      const result = await service.getPlanbyName('FREE');
      expect(result).toEqual(mockPlan);
    });

    it('should throw BadRequestException if name is empty', async () => {
      await expect(service.getPlanbyName('')).rejects.toThrow(BadRequestException);
    });
  });
});
