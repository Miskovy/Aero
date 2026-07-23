import { Test, TestingModule } from '@nestjs/testing';
import { AcmeCertificateService } from './acme-certificate.service';
import { PrismaService } from '../../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('AcmeCertificateService', () => {
  let service: AcmeCertificateService;
  let prisma: any;

  const mockPrismaService = {
    serviceDomain: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    (fs.mkdir as jest.Mock).mockResolvedValue(undefined);
    (fs.writeFile as jest.Mock).mockResolvedValue(undefined);
    (fs.stat as jest.Mock).mockResolvedValue({ mtimeMs: Date.now() });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcmeCertificateService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AcmeCertificateService>(AcmeCertificateService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('provisionCertificate', () => {
    it('should create cert files and update domain record', async () => {
      prisma.serviceDomain.findUnique.mockResolvedValue({
        id: 'dom-1',
        domain: 'app.example.com',
      });

      prisma.serviceDomain.update.mockResolvedValue({
        id: 'dom-1',
        domain: 'app.example.com',
        ssl_enabled: true,
        ssl_certificate_path: '/path/to/cert.pem',
      });

      const result = await service.provisionCertificate('dom-1');

      expect(fs.mkdir).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalledTimes(2); // cert + key
      expect(prisma.serviceDomain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'dom-1' },
          data: expect.objectContaining({ ssl_enabled: true }),
        }),
      );
      expect(result.ssl_enabled).toBe(true);
    });

    it('should throw NotFoundException if domain is missing', async () => {
      prisma.serviceDomain.findUnique.mockResolvedValue(null);

      await expect(service.provisionCertificate('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('renewExpiringCertificates', () => {
    it('should scan verified custom domains and trigger renewal if cert is old', async () => {
      const oldTime = Date.now() - 70 * 24 * 60 * 60 * 1000; // 70 days old
      (fs.stat as jest.Mock).mockResolvedValue({ mtimeMs: oldTime });

      prisma.serviceDomain.findMany.mockResolvedValue([
        {
          id: 'dom-1',
          domain: 'old.example.com',
          verification_status: 'verified',
          ssl_enabled: true,
          ssl_certificate_path: '/certs/old.example.com/fullchain.pem',
        },
      ]);

      prisma.serviceDomain.findUnique.mockResolvedValue({
        id: 'dom-1',
        domain: 'old.example.com',
      });

      prisma.serviceDomain.update.mockResolvedValue({ id: 'dom-1' });

      await service.renewExpiringCertificates();

      expect(prisma.serviceDomain.findMany).toHaveBeenCalled();
      expect(fs.writeFile).toHaveBeenCalled();
    });
  });
});
