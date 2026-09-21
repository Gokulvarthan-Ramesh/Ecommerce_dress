import crypto from 'crypto';

/**
 * Generate a single cryptographically secure alphanumeric code.
 * Uses uppercase letters (excluding confusing chars O, I, L) + digits (excluding 0, 1).
 * Format: PREFIX-XXXXXXXX
 */
const SAFE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // 31 chars (no 0,1,I,L,O)

export function generateSecureCode(prefix: string, length: number = 8): string {
  const bytes = crypto.randomBytes(length);
  let code = '';
  for (let i = 0; i < length; i++) {
    code += SAFE_CHARS[bytes[i] % SAFE_CHARS.length];
  }
  return `${prefix}-${code}`;
}

/**
 * Generate multiple unique codes in a batch.
 * Retries internally if a collision is generated within the batch.
 */
export function generateSecureCodes(prefix: string, quantity: number, length: number = 8): string[] {
  const codes = new Set<string>();
  let attempts = 0;
  const maxAttempts = quantity * 3; // Safety valve

  while (codes.size < quantity && attempts < maxAttempts) {
    codes.add(generateSecureCode(prefix, length));
    attempts++;
  }

  if (codes.size < quantity) {
    throw new Error(`Could not generate ${quantity} unique codes after ${maxAttempts} attempts`);
  }

  return Array.from(codes);
}

/**
 * Normalize a promo code: uppercase, trim whitespace
 */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}
