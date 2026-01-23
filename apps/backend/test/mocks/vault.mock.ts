import type {
  PKIIssueCertificateResponse,
  PKISignResponse,
} from 'src/vault/types/pki';

/**
 * Mock VaultPKI API
 */
export const createMockVaultPKI = () => ({
  getCA: jest.fn().mockResolvedValue({
    certificate:
      '-----BEGIN CERTIFICATE-----\nMOCK_CA_CERT\n-----END CERTIFICATE-----',
  }),
  getRootCA: jest
    .fn()
    .mockResolvedValue(
      '-----BEGIN CERTIFICATE-----\nMOCK_ROOT_CA\n-----END CERTIFICATE-----',
    ),
  signCSR: jest.fn().mockResolvedValue({
    certificate:
      '-----BEGIN CERTIFICATE-----\nMOCK_SIGNED_CERT\n-----END CERTIFICATE-----',
    issuing_ca:
      '-----BEGIN CERTIFICATE-----\nMOCK_ISSUING_CA\n-----END CERTIFICATE-----',
    ca_chain: [
      '-----BEGIN CERTIFICATE-----\nMOCK_CA_CHAIN\n-----END CERTIFICATE-----',
    ],
    serial_number: 'aa:bb:cc:dd:ee:ff:00:11',
    expiration: new Date(Date.now() + 31536000000).toISOString(),
  } satisfies PKISignResponse),
  generateIntermediate: jest.fn().mockResolvedValue({
    csr: '-----BEGIN CERTIFICATE REQUEST-----\nMOCK_CSR\n-----END CERTIFICATE REQUEST-----',
  }),
  setSignedIntermediate: jest.fn().mockResolvedValue({}),
  signIntermediate: jest.fn().mockResolvedValue({
    certificate:
      '-----BEGIN CERTIFICATE-----\nMOCK_INTERMEDIATE\n-----END CERTIFICATE-----',
    issuing_ca:
      '-----BEGIN CERTIFICATE-----\nMOCK_ISSUING_CA\n-----END CERTIFICATE-----',
    ca_chain: [
      '-----BEGIN CERTIFICATE-----\nMOCK_CA_CHAIN\n-----END CERTIFICATE-----',
    ],
    serial_number: 'aa:bb:cc:dd:ee:ff:00:11',
    expiration: new Date(Date.now() + 31536000000).toISOString(),
  }),
  signNodeCertificate: jest.fn().mockResolvedValue({
    certificate:
      '-----BEGIN CERTIFICATE-----\nMOCK_NODE_CERT\n-----END CERTIFICATE-----',
    issuing_ca:
      '-----BEGIN CERTIFICATE-----\nMOCK_ISSUING_CA\n-----END CERTIFICATE-----',
    ca_chain: [
      '-----BEGIN CERTIFICATE-----\nMOCK_CA_CHAIN\n-----END CERTIFICATE-----',
    ],
    serial_number: 'aa:bb:cc:dd:ee:ff:00:11',
    private_key:
      '-----BEGIN RSA PRIVATE KEY-----\nMOCK_KEY\n-----END RSA PRIVATE KEY-----',
    private_key_type: 'rsa',
    expiration: Math.floor(Date.now() / 1000) + 31536000,
  } satisfies PKIIssueCertificateResponse),
  issueCertificate: jest.fn().mockResolvedValue({
    certificate:
      '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
    private_key:
      '-----BEGIN RSA PRIVATE KEY-----\nMOCK_KEY\n-----END RSA PRIVATE KEY-----',
    private_key_type: 'rsa',
    issuing_ca:
      '-----BEGIN CERTIFICATE-----\nMOCK_ISSUING_CA\n-----END CERTIFICATE-----',
    ca_chain: [],
    serial_number: 'aa:bb:cc:dd:ee:ff:00:22',
    expiration: Math.floor(Date.now() / 1000) + 31536000,
  } satisfies PKIIssueCertificateResponse),
  configureUrls: jest.fn().mockResolvedValue(undefined),
  createRole: jest.fn().mockResolvedValue(undefined),
  mountPKI: jest.fn().mockResolvedValue(undefined),
  unmountPKI: jest.fn().mockResolvedValue(undefined),
  revokeCertificate: jest.fn().mockResolvedValue({
    revocation_time: Math.floor(Date.now() / 1000),
  }),
});

/**
 * Mock VaultAuth API
 */
export const createMockVaultAuth = () => ({
  login: jest.fn().mockResolvedValue({
    client_token: 'mock-vault-token',
    lease_duration: 3600,
    renewable: true,
  }),
  renewToken: jest.fn().mockResolvedValue({
    client_token: 'mock-renewed-token',
    lease_duration: 3600,
  }),
});

/**
 * Mock VaultService for NestJS DI
 */
export type MockVaultService = {
  pki: ReturnType<typeof createMockVaultPKI>;
  auth: ReturnType<typeof createMockVaultAuth>;
  onModuleInit: jest.Mock;
  onModuleDestroy: jest.Mock;
};

export const createMockVaultService = (): MockVaultService => ({
  pki: createMockVaultPKI(),
  auth: createMockVaultAuth(),
  onModuleInit: jest.fn().mockResolvedValue(undefined),
  onModuleDestroy: jest.fn(),
});

/**
 * Reset all Vault mocks
 */
export const resetVaultMocks = (vaultService: MockVaultService) => {
  Object.values(vaultService.pki).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
  Object.values(vaultService.auth).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

/**
 * Helper to generate realistic certificate serial numbers
 */
export const generateSerialNumber = (): string => {
  const bytes = Array.from({ length: 8 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, '0'),
  );
  return bytes.join(':');
};

/**
 * Helper to generate mock certificate response
 */
export const generateMockCertificateResponse = (
  serialNumber?: string,
): PKIIssueCertificateResponse => ({
  certificate:
    '-----BEGIN CERTIFICATE-----\nMOCK_CERT\n-----END CERTIFICATE-----',
  issuing_ca:
    '-----BEGIN CERTIFICATE-----\nMOCK_ISSUING_CA\n-----END CERTIFICATE-----',
  ca_chain: [
    '-----BEGIN CERTIFICATE-----\nMOCK_CA_CHAIN\n-----END CERTIFICATE-----',
  ],
  serial_number: serialNumber || generateSerialNumber(),
  private_key:
    '-----BEGIN RSA PRIVATE KEY-----\nMOCK_KEY\n-----END RSA PRIVATE KEY-----',
  private_key_type: 'rsa',
  expiration: Math.floor(Date.now() / 1000) + 31536000,
});
