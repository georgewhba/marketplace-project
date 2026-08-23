import { describe, it, expect } from 'vitest';
import { getPaginationMeta, getOffset } from '../../utils/pagination.js';

describe('getPaginationMeta', () => {
  it('calculates totalPages correctly for exact division', () => {
    const meta = getPaginationMeta(1, 20, 60);
    expect(meta).toEqual({ page: 1, limit: 20, total: 60, totalPages: 3 });
  });

  it('calculates totalPages correctly for partial last page', () => {
    const meta = getPaginationMeta(1, 20, 50);
    expect(meta).toEqual({ page: 1, limit: 20, total: 50, totalPages: 3 });
  });

  it('returns totalPages = 0 when total = 0', () => {
    const meta = getPaginationMeta(1, 20, 0);
    expect(meta).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });

  it('returns totalPages = 1 when total <= limit', () => {
    const meta = getPaginationMeta(1, 20, 15);
    expect(meta).toEqual({ page: 1, limit: 20, total: 15, totalPages: 1 });
  });

  it('clamps limit to MAX_LIMIT (50) when exceeded', () => {
    const meta = getPaginationMeta(1, 200, 100);
    expect(meta.limit).toBe(50);
    expect(meta.totalPages).toBe(2); // 100 / 50 = 2
  });

  it('preserves passed page number', () => {
    const meta = getPaginationMeta(5, 10, 100);
    expect(meta.page).toBe(5);
  });
});

describe('getOffset', () => {
  it('returns 0 for page 1', () => {
    expect(getOffset(1, 20)).toBe(0);
  });

  it('returns correct offset for page 2', () => {
    expect(getOffset(2, 20)).toBe(20);
  });

  it('returns correct offset for page 3', () => {
    expect(getOffset(3, 20)).toBe(40);
  });

  it('clamps limit to MAX_LIMIT when calculating offset', () => {
    // limit=200, but clamped to 50 → page 2 offset = 50
    expect(getOffset(2, 200)).toBe(50);
  });
});
