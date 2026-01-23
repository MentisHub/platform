/**
 * Jest global setup file
 * Runs before all tests
 */

// Increase timeout for async operations
jest.setTimeout(10000);

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.SERVICE_DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.VAULT_ADDR = 'http://localhost:8200';
process.env.VAULT_ROLE_ID = 'test-role-id';
process.env.VAULT_SECRET_ID = 'test-secret-id';
process.env.SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.DOCKER_SOCKET = '/var/run/docker.sock';
process.env.SUPERLINK_HOST = 'localhost';
process.env.BACKEND_CERT_PATH = '/tmp/test-cert.pem';
process.env.BACKEND_KEY_PATH = '/tmp/test-key.pem';
process.env.BACKEND_CA_PATH = '/tmp/test-ca.pem';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';

// Suppress console logs during tests (optional - comment out for debugging)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Clean up after all tests
afterAll(async () => {
  // Add any global cleanup here
});
