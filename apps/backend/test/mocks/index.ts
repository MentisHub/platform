/**
 * Central export for all test mocks
 *
 * @example
 * import {
 *   createMockPrismaService,
 *   createMockVaultService,
 *   createMockSupabaseService,
 * } from '../mocks';
 */

// Prisma
export {
  createMockPrismaService,
  mockPrismaService,
  resetPrismaMock,
  mockTransaction,
  type MockPrismaService,
} from './prisma.mock';

// Vault
export {
  createMockVaultService,
  createMockVaultPKI,
  createMockVaultAuth,
  resetVaultMocks,
  generateSerialNumber,
  generateMockCertificateResponse,
  type MockVaultService,
} from './vault.mock';

// Supabase
export {
  createMockSupabaseService,
  createMockSupabaseClient,
  createMockSupabaseStorage,
  resetSupabaseMocks,
  mockUploadError,
  mockDownloadError,
  mockFileContent,
  type MockSupabaseService,
} from './supabase.mock';

// Docker
export {
  createMockDockerService,
  resetDockerMocks,
  mockExecOutput,
  mockExecError,
  mockContainerStartError,
  mockFlowerNodeRegistration,
  mockFlowerNodeRegistrationLegacy,
  type MockDockerService,
} from './docker.mock';

// Flower
export {
  createMockFlowerService,
  resetFlowerMocks,
  mockNodeRegistration,
  mockNodeRegistrationError,
  mockStartRun,
  mockStartRunError,
  mockStopRunError,
  expectStartRunCalledWith,
  type MockFlowerService,
} from './flower.mock';

// ConfigService mock helper
export const createMockConfigService = (
  overrides: Record<string, any> = {},
) => {
  const config: Record<string, any> = {
    SERVICE_DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    VAULT_ADDR: 'http://localhost:8200',
    VAULT_ROLE_ID: 'test-role-id',
    VAULT_SECRET_ID: 'test-secret-id',
    SUPABASE_URL: 'http://localhost:54321',
    SUPABASE_SERVICE_KEY: 'test-service-key',
    DOCKER_SOCKET: '/var/run/docker.sock',
    SUPERLINK_HOST: 'localhost',
    BACKEND_CERT_PATH: '/tmp/test-cert.pem',
    BACKEND_KEY_PATH: '/tmp/test-key.pem',
    BACKEND_CA_PATH: '/tmp/test-ca.pem',
    JWT_SECRET: 'test-jwt-secret',
    ...overrides,
  };

  return {
    get: jest.fn((key: string) => config[key]),
    getOrThrow: jest.fn((key: string) => {
      if (!(key in config)) {
        throw new Error(`Config key "${key}" not found`);
      }
      return config[key];
    }),
  };
};
