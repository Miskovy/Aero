export type MockPrismaServiceType = {
  service: Record<string, jest.Mock>;
  deployment: Record<string, jest.Mock>;
  deploymentLog: Record<string, jest.Mock>;
  serviceDomain: Record<string, jest.Mock>;
  serviceSecret: Record<string, jest.Mock>;
  environmentVariable: Record<string, jest.Mock>;
  serviceVolume: Record<string, jest.Mock>;
  user: Record<string, jest.Mock>;
  refreshToken: Record<string, jest.Mock>;
  organization: Record<string, jest.Mock>;
  alertRule: Record<string, jest.Mock>;
  notification: Record<string, jest.Mock>;
  auditLog: Record<string, jest.Mock>;
  node: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

export const mockPrismaService = (): MockPrismaServiceType => ({
  service: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  deployment: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  deploymentLog: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  serviceDomain: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  serviceSecret: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  environmentVariable: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  serviceVolume: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  refreshToken: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    delete: jest.fn(),
  },
  organization: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  alertRule: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  notification: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
  },
  node: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
  $transaction: jest.fn(
    (callback: (prisma: MockPrismaServiceType) => unknown) =>
      callback(mockPrismaService()),
  ),
});
