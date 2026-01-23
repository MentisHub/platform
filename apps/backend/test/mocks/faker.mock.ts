/**
 * Mock for @faker-js/faker
 * This is a simple mock that provides just enough functionality for tests
 */

const fakerInstance = {
  seed: (value: number) => {},
  string: {
    uuid: () => '12345678-1234-1234-1234-123456789012',
    alphanumeric: (length?: number | { length: number }) => {
      const len = typeof length === 'number' ? length : length?.length || 8;
      return 'a'.repeat(len);
    },
  },
  internet: {
    email: () => 'test@example.com',
  },
  person: {
    fullName: () => 'John Doe',
  },
  company: {
    name: () => 'Test Company Inc',
  },
  word: {
    adjective: () => 'test',
    noun: () => 'item',
  },
  number: {
    int: (options?: { min?: number; max?: number }) => {
      const min = options?.min || 0;
      const max = options?.max || 100;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    },
  },
  location: {
    country: () => 'Test Country',
  },
  datatype: {
    boolean: (probability: number = 0.5) => Math.random() < probability,
  },
  helpers: {
    arrayElement: <T>(array: T[]): T => array[0],
    arrayElements: <T>(array: T[], count?: number): T[] => {
      const num = count || Math.min(array.length, 3);
      return array.slice(0, num);
    },
  },
  date: {
    recent: (options?: { days?: number }) => new Date(),
    between: (options: { from: Date | string; to: Date | string }) => new Date(),
  },
  lorem: {
    sentence: () => 'This is a test sentence.',
  },
};

export const faker = fakerInstance;
export default { faker };
