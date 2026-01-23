import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

export type MockPrismaService = DeepMockProxy<PrismaClient>;

export const createMockPrismaService = (): MockPrismaService => {
  return mockDeep<PrismaClient>();
};

/**
 * Creates a mock PrismaService for use in NestJS TestingModule
 *
 * @example
 * const module = await Test.createTestingModule({
 *   providers: [
 *     NodesService,
 *     { provide: PrismaService, useValue: createMockPrismaService() },
 *   ],
 * }).compile();
 */
export const mockPrismaService = createMockPrismaService();

/**
 * Reset all mocks between tests
 * Call this in beforeEach()
 */
export const resetPrismaMock = () => {
  mockReset(mockPrismaService);
};

/**
 * Helper to mock Prisma transaction
 * Prisma's $transaction passes itself to the callback
 */
export const mockTransaction = (prisma: MockPrismaService) => {
  prisma.$transaction.mockImplementation(async (callback: any) => {
    if (typeof callback === 'function') {
      return callback(prisma);
    }
    return Promise.all(callback);
  });
};
