import crypto from 'node:crypto';

/**
 * Generates a unique, human-readable order number.
 * Format: MKT-YYYYMMDD-XXXXX (e.g. MKT-20250223-48291)
 */
export function generateOrderNumber(): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const random = crypto.randomInt(10000, 100000);
  return `MKT-${date}-${random}`;
}
