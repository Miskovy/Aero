import { Test, TestingModule } from '@nestjs/testing';
import { VolumesService } from './volumes.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mockPrismaService,
  MockPrismaServiceType,
} from '../../../test/utils/mock-factory';
import { NotFoundException } from '@nestjs/common';

describe('VolumesService', () => {
  let service: VolumesService;
  let prisma: MockPrismaServiceType;

  const mockServiceObj = {
    id: 'svc-1',
    name: 'Test Service',
  };

  const mockVolumeObj = {
    id: 'vol-1',
    service_id: 'svc-1',
    name: 'data-vol',
    mount_path: '/var/lib/data',
    host_path: null,
    driver: 'local',
    size_bytes: BigInt(0),
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VolumesService,
        { provide: PrismaService, useFactory: mockPrismaService },
      ],
    }).compile();

    service = module.get<VolumesService>(VolumesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createVolume', () => {
    it('should throw NotFoundException if service missing', async () => {
      prisma.service.findUnique.mockResolvedValue(null);

      await expect(
        service.createVolume('svc-missing', {
          name: 'vol',
          mount_path: '/path',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create volume if service exists', async () => {
      prisma.service.findUnique.mockResolvedValue(mockServiceObj);
      prisma.serviceVolume.create.mockResolvedValue(mockVolumeObj);

      const result = await service.createVolume('svc-1', {
        name: 'data-vol',
        mount_path: '/var/lib/data',
      });

      expect(prisma.serviceVolume.create).toHaveBeenCalled();
      expect(result.id).toBe('vol-1');
      expect(result.name).toBe('data-vol');
    });
  });

  describe('listVolumes', () => {
    it('should list all volumes for service', async () => {
      prisma.serviceVolume.findMany.mockResolvedValue([mockVolumeObj]);

      const result = await service.listVolumes('svc-1');

      expect(prisma.serviceVolume.findMany).toHaveBeenCalledWith({
        where: { service_id: 'svc-1' },
        orderBy: { created_at: 'asc' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('vol-1');
    });
  });

  describe('deleteVolume', () => {
    it('should delete volume if found', async () => {
      prisma.serviceVolume.findFirst.mockResolvedValue(mockVolumeObj);
      prisma.serviceVolume.delete.mockResolvedValue(mockVolumeObj);

      const result = await service.deleteVolume('svc-1', 'vol-1');

      expect(prisma.serviceVolume.delete).toHaveBeenCalledWith({
        where: { id: 'vol-1' },
      });
      expect(result.success).toBe(true);
    });
  });
});
