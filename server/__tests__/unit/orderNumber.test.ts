import { describe, it, expect } from 'vitest';
import { generateOrderNumber } from '../../utils/order-number.js';

describe('generateOrderNumber', () => {
  it('starts with MKT- prefix', () => {
    const num = generateOrderNumber();
    expect(num.startsWith('MKT-')).toBe(true);
  });

  it('matches format MKT-YYYYMMDD-XXXXX', () => {
    const num = generateOrderNumber();
    expect(num).toMatch(/^MKT-\d{8}-\d{5}$/);
  });

  it('uses today\'s date in the YYYYMMDD segment', () => {
    const num = generateOrderNumber();
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const expected = `${year}${month}${day}`;
    const dateSegment = num.split('-')[1];
    expect(dateSegment).toBe(expected);
  });

  it('random segment is 5 digits (10000-99999)', () => {
    const num = generateOrderNumber();
    const randomPart = num.split('-')[2]!;
    const value = parseInt(randomPart, 10);
    expect(value).toBeGreaterThanOrEqual(10000);
    expect(value).toBeLessThanOrEqual(99999);
  });

  it('generates different numbers on successive calls', () => {
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      results.add(generateOrderNumber());
    }
    // With 5 random digits (90000 possibilities), 20 calls should produce at least 15 unique
    expect(results.size).toBeGreaterThanOrEqual(15);
  });
});
