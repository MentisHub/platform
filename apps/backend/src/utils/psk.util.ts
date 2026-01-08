import { createHash, randomBytes } from 'crypto';

/**
 * Generates a cryptographically secure Pre-Shared Key (PSK)
 *
 * @returns A base64url-encoded string (16 bytes of entropy, 22 chars)
 * @example
 * const psk = generatePSK();
 * // Returns: "a7Kj9mP3nQ2vR8sT4uW6"
 */
export function generatePSK(): string {
  return randomBytes(16).toString('base64url');
}

/**
 * Hashes a PSK using SHA-256
 *
 * @param psk - The plaintext PSK to hash
 * @returns The SHA-256 hash as base64url string (43 chars)
 * @example
 * const hash = hashPSK(psk);
 * // Returns: "a7b3c9..." (base64url, ~43 chars)
 */
export function hashPSK(psk: string): string {
  return createHash('sha256').update(psk).digest('base64url');
}

/**
 * Validates a PSK against its hash
 *
 * @param psk - The plaintext PSK to validate
 * @param hash - The SHA-256 hash to validate against
 * @returns True if valid, false otherwise
 * @example
 * const isValid = validatePSK(psk, storedHash);
 */
export function validatePSK(psk: string, hash: string): boolean {
  return hashPSK(psk) === hash;
}

/**
 * Generates a PSK and its hash in one operation
 *
 * @returns An object with both PSK and hash
 * @example
 * const { psk, hash } = generatePSKWithHash();
 * // Save hash to database, return psk to user once
 */
export function generatePSKWithHash(): { psk: string; hash: string } {
  const psk = generatePSK();
  const hash = hashPSK(psk);
  return { psk, hash };
}
