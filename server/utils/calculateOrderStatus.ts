/**
 * Pure function: computes the correct aggregate order status from all its items.
 *
 * Rules (from spec F2 §1):
 * - All delivered/cancelled → "delivered"
 * - Any shipped+ and none still pending → "shipped"
 * - All at least confirmed → "confirmed"
 * - Otherwise → current status unchanged (never regress)
 *
 * @param items - All order items with their vendorStatus
 * @param updatedItemId - The item that was just updated (may not yet be persisted)
 * @param updatedStatus - The new status being applied to that item
 * @returns The computed aggregate order status
 */

type ItemStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';

interface OrderItemForStatus {
  id: number;
  vendorStatus: string;
}

const STATUS_RANK: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  shipped: 2,
  delivered: 3,
  cancelled: -1, // Special: doesn't block progression
};

export function calculateOrderStatus(
  items: OrderItemForStatus[],
  updatedItemId: number,
  updatedStatus: ItemStatus,
): string {
  if (items.length === 0) return 'pending';

  // Build effective statuses: apply the pending update to the local copy
  const effectiveStatuses = items.map(item =>
    item.id === updatedItemId ? updatedStatus : item.vendorStatus as ItemStatus,
  );

  // Filter out cancelled items for progression checks
  const activeStatuses = effectiveStatuses.filter(s => s !== 'cancelled');

  // If ALL items are cancelled (edge case) → keep as cancelled
  if (activeStatuses.length === 0) return 'cancelled';

  // All active items delivered → order is delivered
  if (activeStatuses.every(s => s === 'delivered')) return 'delivered';

  // Any active item shipped or delivered, AND none still pending → shipped
  const hasShippedOrAbove = activeStatuses.some(s => s === 'shipped' || s === 'delivered');
  const nonePending = activeStatuses.every(s => s !== 'pending');
  if (hasShippedOrAbove && nonePending) return 'shipped';

  // All active items at least confirmed → confirmed
  if (activeStatuses.every(s => STATUS_RANK[s]! >= STATUS_RANK['confirmed']!)) return 'confirmed';

  // Default: still pending
  return 'pending';
}

/**
 * Determines if the order status should advance (never regress).
 * This prevents a late-confirming vendor from pulling the order status backward
 * after another vendor already shipped their items.
 */
export function shouldAdvanceOrderStatus(currentStatus: string, computedStatus: string): boolean {
  const currentRank = STATUS_RANK[currentStatus] ?? 0;
  const computedRank = STATUS_RANK[computedStatus] ?? 0;
  // Only advance forward, or allow setting "delivered" specifically when all items are done
  return computedRank > currentRank || computedStatus === 'delivered';
}
