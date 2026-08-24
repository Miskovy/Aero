import { Test, TestingModule } from '@nestjs/testing';
import { BackupsService } from './backups.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlanQuotaService } from '../../plans/plan-quota.service';
import {
  mockPrismaService,
  MockPrismaServiceType,
} from '../../../test/utils/mock-factory';
import { NotFoundException } from '@nestjs/common';

import { DockerService } from '../docker/docker.service';

describe('BackupsService', () => {
  let service: BackupsService;
  let prisma: MockPrismaServiceType;

  const mockPlanQuotaService = {
    validateBackupQuota: jest.fn().mockResolvedValue(undefined),
  };

  const mockDockerService = {
    createVolumeBackup: jest
      .fn()
      .mockResolvedValue('/backups/svc-1/backup-test-service-123.tar.gz'),
    removeBackupFile: jest.fn().mockResolvedValue(true),
  };

  const mockServiceObj = {
    id: 'svc-1',
    name: 'Test Service',
    slug: 'test-service',
  };

  const mockBackupObj = {
    id: 'bk-1',
    service_id: 'svc-1',
    filename: 'backup-test-service-123.tar.gz',
    size_bytes: BigInt(5242880),
    storage_path: '/backups/svc-1/backup-test-service-123.tar.gz',
    status: 'completed',
    trigger: 'manual',
    triggered_by: 'user-1',
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupsService,
        { provide: PrismaService, useFactory: mockPrismaService },
        { provide: PlanQuotaService, useValue: mockPlanQuotaService },
        { provide: DockerService, useValue: mockDockerService },
      ],
    }).compile();

    service = module.get<BackupsService>(BackupsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createBackup', () => {
    it('should throw NotFoundException if service does not exist', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(service.createBackup('svc-missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create backup record if service exists', async () => {
      prisma.service.findUnique.mockResolvedValue(mockServiceObj);
      prisma.backup.create.mockResolvedValue(mockBackupObj);

      const result = await service.createBackup('svc-1', 'user-1');

      expect(prisma.backup.create).toHaveBeenCalled();
      expect(result.id).toBe('bk-1');
      expect(result.size_bytes).toBe(5242880);
    });
  });

  describe('listBackups', () => {
    it('should return paginated backups', async () => {
      prisma.backup.findMany.mockResolvedValue([mockBackupObj]);

      const result = await service.listBackups('svc-1', { limit: 10 });

      expect(prisma.backup.findMany).toHaveBeenCalled();
      expect(result.data[0].id).toBe('bk-1');
      expect(result.data[0].size_bytes).toBe(5242880);
      expect(result.meta.hasMore).toBe(false);
    });
  });

  describe('deleteBackup', () => {
    it('should delete backup if found', async () => {
      prisma.backup.findFirst.mockResolvedValue(mockBackupObj);
      prisma.backup.delete.mockResolvedValue(mockBackupObj);

      const result = await service.deleteBackup('svc-1', 'bk-1');

      expect(prisma.backup.delete).toHaveBeenCalledWith({
        where: { id: 'bk-1' },
      });
      expect(result.success).toBe(true);
    });
  });
});
