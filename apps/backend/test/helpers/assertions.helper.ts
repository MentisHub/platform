import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Custom Jest matchers and assertion helpers for the test suite
 */

/**
 * Assert that a promise rejects with a specific HTTP exception
 *
 * @example
 * await expectHttpException(
 *   () => service.findOne('invalid-id'),
 *   HttpStatus.NOT_FOUND
 * );
 */
export async function expectHttpException(
  fn: () => Promise<any>,
  expectedStatus: HttpStatus,
  expectedMessage?: string | RegExp,
): Promise<void> {
  try {
    await fn();
    fail('Expected function to throw HttpException');
  } catch (error) {
    expect(error).toBeInstanceOf(HttpException);
    const httpError = error as HttpException;
    expect(httpError.getStatus()).toBe(expectedStatus);

    if (expectedMessage) {
      const response = httpError.getResponse();
      const message =
        typeof response === 'string'
          ? response
          : (response as any).message || response;

      if (expectedMessage instanceof RegExp) {
        expect(message).toMatch(expectedMessage);
      } else {
        expect(message).toContain(expectedMessage);
      }
    }
  }
}

/**
 * Assert that a promise rejects with any error
 *
 * @example
 * await expectToThrow(
 *   () => service.create(invalidDto),
 *   'Validation failed'
 * );
 */
export async function expectToThrow(
  fn: () => Promise<any>,
  expectedMessage?: string | RegExp,
): Promise<Error> {
  try {
    await fn();
    fail('Expected function to throw an error');
  } catch (error) {
    expect(error).toBeInstanceOf(Error);

    if (expectedMessage) {
      const message = (error as Error).message;
      if (expectedMessage instanceof RegExp) {
        expect(message).toMatch(expectedMessage);
      } else {
        expect(message).toContain(expectedMessage);
      }
    }

    return error as Error;
  }
}

/**
 * Assert that a mock was called with specific arguments
 *
 * @example
 * expectCalledWith(prisma.node.create, {
 *   data: expect.objectContaining({ name: 'test-node' })
 * });
 */
export function expectCalledWith(mock: jest.Mock, ...args: any[]): void {
  expect(mock).toHaveBeenCalledWith(...args);
}

/**
 * Assert that a mock was called once with specific arguments
 */
export function expectCalledOnceWith(mock: jest.Mock, ...args: any[]): void {
  expect(mock).toHaveBeenCalledTimes(1);
  expect(mock).toHaveBeenCalledWith(...args);
}

/**
 * Assert that a mock was never called
 */
export function expectNotCalled(mock: jest.Mock): void {
  expect(mock).not.toHaveBeenCalled();
}

/**
 * Assert that an object matches a partial structure
 *
 * @example
 * expectToMatchObject(result, {
 *   id: expect.any(String),
 *   status: 'ONLINE',
 * });
 */
export function expectToMatchObject(actual: object, expected: object): void {
  expect(actual).toMatchObject(expected);
}

/**
 * Assert that an array contains an item matching the given object
 *
 * @example
 * expectArrayToContain(nodes, { status: 'ONLINE' });
 */
export function expectArrayToContain(array: any[], expected: object): void {
  expect(array).toEqual(
    expect.arrayContaining([expect.objectContaining(expected)]),
  );
}

/**
 * Assert that a date is within a range
 *
 * @example
 * expectDateWithinRange(result.createdAt, new Date(), 1000);
 */
export function expectDateWithinRange(
  actual: Date,
  expected: Date,
  toleranceMs: number = 1000,
): void {
  const diff = Math.abs(actual.getTime() - expected.getTime());
  expect(diff).toBeLessThanOrEqual(toleranceMs);
}

/**
 * Assert that a UUID is valid
 */
export function expectValidUUID(value: string): void {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  expect(value).toMatch(uuidRegex);
}

/**
 * Assert that a serial number is valid (hex format with colons)
 */
export function expectValidSerialNumber(value: string): void {
  const serialRegex = /^([0-9a-f]{2}:)+[0-9a-f]{2}$/i;
  expect(value).toMatch(serialRegex);
}

/**
 * Create a matcher for Prisma include/select queries
 *
 * @example
 * expect(prisma.node.findUnique).toHaveBeenCalledWith(
 *   expectPrismaQuery({ where: { id: nodeId } })
 * );
 */
export function expectPrismaQuery(expected: object): object {
  return expect.objectContaining(expected);
}

/**
 * Assert that a certificate is valid (not expired, not revoked)
 */
export function expectValidCertificate(cert: {
  expiresAt: Date;
  revokedAt: Date | null;
}): void {
  expect(cert.revokedAt).toBeNull();
  expect(cert.expiresAt.getTime()).toBeGreaterThan(Date.now());
}

/**
 * Helper to create a spy that tracks all calls
 */
export function createCallTracker() {
  const calls: any[][] = [];
  const fn = jest.fn((...args: any[]) => {
    calls.push(args);
  });

  return {
    fn,
    calls,
    getCall: (index: number) => calls[index],
    getLastCall: () => calls[calls.length - 1],
    reset: () => {
      calls.length = 0;
      fn.mockClear();
    },
  };
}
