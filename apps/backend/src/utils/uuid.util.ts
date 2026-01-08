const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encodes a UUID to base32 (DNS-safe, 26 chars)
 *
 * @param uuid - UUID string (with or without hyphens)
 * @returns Base32 encoded string (26 chars, lowercase)
 * @example
 * uuidToBase32('de326564-df80-498d-ac69-42e3b0fafeed')
 * // Returns: "3yzgkzg7qbey3ldkiljwb6x67q"
 */
export function uuidToBase32(uuid: string): string {
  const hex = uuid.replace(/-/g, '');
  const bytes = Buffer.from(hex, 'hex');

  let bits = '';
  for (const byte of bytes) {
    bits += byte.toString(2).padStart(8, '0');
  }

  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }

  return result.toLowerCase();
}

/**
 * Decodes a base32 string back to UUID format
 *
 * @param base32 - Base32 encoded string (26 chars)
 * @returns UUID string with hyphens
 * @example
 * base32ToUuid('3yzgkzg7qbey3ldkiljwb6x67q')
 * // Returns: "de326564-df80-498d-ac69-42e3b0fafeed"
 */
export function base32ToUuid(base32: string): string {
  const upper = base32.toUpperCase();

  let bits = '';
  for (const char of upper) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid base32 character: ${char}`);
    }
    bits += index.toString(2).padStart(5, '0');
  }

  // Take only 128 bits (16 bytes for UUID)
  bits = bits.slice(0, 128);

  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }

  const hex = Buffer.from(bytes).toString('hex');

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}
