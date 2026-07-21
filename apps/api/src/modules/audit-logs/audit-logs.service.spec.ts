import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  mockPrismaService,
  MockPrismaServiceType,
} from '../../../test/utils/mock-factory';

describe('AuditLogsService', () => {
  let service: AuditLogsService;
  let prisma: MockPrismaServiceType;

  const mockLog = {
    id: 'log-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    action: 'SERVICE_CREATE',
    resource_type: 'service',
    resource_id: 'svc-1',
    old_value: null,
    new_value: { name: 'My Service' },
    created_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogsService,
        { provide: PrismaService, useFactory: mockPrismaService },
      ],
    }).compile();

    service = module.get<AuditLogsService>(AuditLogsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('listAuditLogs', () => {
    it('should return paginated audit logs', async () => {
      prisma.auditLog.findMany.mockResolvedValue([mockLog]);

      const result = await service.listAuditLogs('org-1', { limit: 10 });

      expect(prisma.auditLog.findMany).toHaveBeenCalled();
      expect(result.data).toEqual([mockLog]);
      expect(result.meta.hasMore).toBe(false);
      expect(result.meta.cursor).toBe('log-1');
    });
  });
});
