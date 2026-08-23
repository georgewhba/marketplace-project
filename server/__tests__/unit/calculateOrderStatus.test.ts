import { describe, it, expect } from 'vitest';
import { calculateOrderStatus, shouldAdvanceOrderStatus } from '../../utils/calculateOrderStatus.js';

describe('calculateOrderStatus', () => {
  const item = (id: number, vendorStatus: string) => ({ id, vendorStatus });

  it('returns "pending" for empty items array', () => {
    expect(calculateOrderStatus([], 1, 'confirmed')).toBe('pending');
  });

  it('returns "pending" when some items are still pending', () => {
    const items = [item(1, 'confirmed'), item(2, 'pending')];
    // Even if we update item 1 to confirmed, item 2 is still pending
    expect(calculateOrderStatus(items, 1, 'confirmed')).toBe('pending');
  });

  it('returns "confirmed" when all active items are at least confirmed', () => {
    const items = [item(1, 'pending'), item(2, 'confirmed')];
    // Update item 1 to confirmed → both are now confirmed
    expect(calculateOrderStatus(items, 1, 'confirmed')).toBe('confirmed');
  });

  it('returns "confirmed" when mix of confirmed and cancelled', () => {
    const items = [item(1, 'confirmed'), item(2, 'cancelled')];
    expect(calculateOrderStatus(items, 1, 'confirmed')).toBe('confirmed');
  });

  it('returns "shipped" when at least one shipped and none pending', () => {
    const items = [item(1, 'confirmed'), item(2, 'confirmed')];
    // Update item 1 to shipped → item 1 shipped, item 2 confirmed → shipped (none pending)
    expect(calculateOrderStatus(items, 1, 'shipped')).toBe('shipped');
  });

  it('stays "confirmed" when one ships but another is still pending', () => {
    const items = [item(1, 'pending'), item(2, 'pending')];
    // Update item 1 to shipped → item 2 still pending
    expect(calculateOrderStatus(items, 1, 'shipped')).toBe('pending');
  });

  it('returns "delivered" when ALL active items are delivered', () => {
    const items = [item(1, 'shipped'), item(2, 'delivered')];
    // Update item 1 to delivered → both delivered
    expect(calculateOrderStatus(items, 1, 'delivered')).toBe('delivered');
  });

  it('returns "delivered" when all non-cancelled items are delivered', () => {
    const items = [item(1, 'shipped'), item(2, 'cancelled')];
    // Update item 1 to delivered → only active item is delivered
    expect(calculateOrderStatus(items, 1, 'delivered')).toBe('delivered');
  });

  it('returns "shipped" when one delivered and one still shipped', () => {
    const items = [item(1, 'shipped'), item(2, 'shipped')];
    // Update item 1 to delivered → item 1 delivered, item 2 shipped → shipped overall
    expect(calculateOrderStatus(items, 1, 'delivered')).toBe('shipped');
  });

  it('returns "cancelled" when ALL items are cancelled', () => {
    const items = [item(1, 'cancelled'), item(2, 'cancelled')];
    expect(calculateOrderStatus(items, 1, 'cancelled')).toBe('cancelled');
  });

  // Multi-vendor scenario: 3 vendors with different progress
  it('handles multi-vendor order correctly', () => {
    const items = [item(1, 'delivered'), item(2, 'shipped'), item(3, 'confirmed')];
    // No update, just querying: one delivered, one shipped, one confirmed → all at least confirmed, some shipped
    expect(calculateOrderStatus(items, 999, 'pending')).toBe('shipped');
  });
});

describe('shouldAdvanceOrderStatus', () => {
  it('advances from pending to confirmed', () => {
    expect(shouldAdvanceOrderStatus('pending', 'confirmed')).toBe(true);
  });

  it('advances from confirmed to shipped', () => {
    expect(shouldAdvanceOrderStatus('confirmed', 'shipped')).toBe(true);
  });

  it('advances from shipped to delivered', () => {
    expect(shouldAdvanceOrderStatus('shipped', 'delivered')).toBe(true);
  });

  it('does NOT regress from shipped to confirmed', () => {
    expect(shouldAdvanceOrderStatus('shipped', 'confirmed')).toBe(false);
  });

  it('does NOT regress from confirmed to pending', () => {
    expect(shouldAdvanceOrderStatus('confirmed', 'pending')).toBe(false);
  });

  it('does NOT regress from delivered to shipped', () => {
    expect(shouldAdvanceOrderStatus('delivered', 'shipped')).toBe(false);
  });

  it('returns false for same status (no-op)', () => {
    expect(shouldAdvanceOrderStatus('confirmed', 'confirmed')).toBe(false);
  });
});
