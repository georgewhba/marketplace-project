/**
 * Pure function: computes the correct aggregate order status from all its items.
 *
 * Rules (from spec F2 §1):
 * - All delivered/cancelled → "delivered"
 * - Any shipped+ and none still pending → "shipped"
 * - All at least confirmed → "confirmed"
 * - Otherwise → current status unchanged (never regress)
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

  // If ALL items are cancelled → order is cancelled
  if (activeStatuses.length === 0) return 'cancelled';

  // All active items delivered → order is delivered
  if (activeStatuses.every(s => s === 'delivered')) return 'delivered';

  // Any active item shipped or delivered, AND none still pending → shipped
  const hasShippedOrAbove = activeStatuses.some(s => s === 'shipped' || s === 'delivered');
  const nonePending = activeStatuses.every(s => s !== 'pending');
  if (hasShippedOrAbove && nonePending) return 'shipped';

  // All active items at least confirmed → confirmed
  if (activeStatuses.every(s => (STATUS_RANK[s] ?? 0) >= STATUS_RANK['confirmed']!)) return 'confirmed';

  // Default: still pending
  return 'pending';
}

/**
 * Determines if the order status should advance (never regress).
 * Prevents a cancelled order from resurrecting, while allowing transition to 'cancelled' when all items are cancelled.
 */
export function shouldAdvanceOrderStatus(currentStatus: string, computedStatus: string): boolean {
  if (currentStatus === 'cancelled') return false;
  if (computedStatus === 'cancelled') return true;
  const currentRank = STATUS_RANK[currentStatus] ?? 0;
  const computedRank = STATUS_RANK[computedStatus] ?? 0;
  return computedRank > currentRank || computedStatus === 'delivered';
}
