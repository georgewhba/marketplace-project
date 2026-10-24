import { db } from '../db/index.js';
import { settlements } from '../db/schema/settlements.js';
import { transactions } from '../db/schema/transactions.js';
import { isNull, eq, and, inArray, sql } from 'drizzle-orm';
import { orderItems } from '../db/schema/order-items.js';

export async function generateSettlements(): Promise<{ createdCount: number }> {
  // Find distinct vendors with unsettled commission or refund transactions
  const unsettledVendors = await db
    .selectDistinct({ vendorId: transactions.vendorId })
    .from(transactions)
    .where(
      and(
        inArray(transactions.type, ['commission', 'refund']),
        isNull(transactions.settlementId)
      )
    );

  let createdCount = 0;
  const now = new Date();

  for (const { vendorId } of unsettledVendors) {
    await db.transaction(async (tx) => {
      // Lock the exact unsettled transactions for this vendor
      const vendorTxs = await tx
        .select({
          id: transactions.id,
          type: transactions.type,
          amount: transactions.amount,
          orderItemId: transactions.orderItemId,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.vendorId, vendorId),
            inArray(transactions.type, ['commission', 'refund']),
            isNull(transactions.settlementId)
          )
        )
        .for('update');

      if (vendorTxs.length === 0) return;

      const txIds = vendorTxs.map((t) => t.id);
      const orderItemIds = [
        ...new Set(
          vendorTxs
            .map((t) => t.orderItemId)
            .filter((id): id is number => id !== null && id !== undefined)
        ),
      ];

      const items =
        orderItemIds.length > 0
          ? await tx
              .select({
                id: orderItems.id,
                total: orderItems.total,
                commissionAmount: orderItems.commissionAmount,
              })
              .from(orderItems)
              .where(inArray(orderItems.id, orderItemIds))
          : [];

      const itemMap = new Map(items.map((item) => [item.id, item]));

      let grossSales = 0;
      let totalCommission = 0;
      let netPayable = 0;

      for (const t of vendorTxs) {
        const txAmount = Number(t.amount);
        netPayable += txAmount;
        const item = t.orderItemId ? itemMap.get(t.orderItemId) : undefined;

        if (t.type === 'commission') {
          grossSales += Number(item?.total ?? txAmount);
          totalCommission += Number(item?.commissionAmount ?? 0);
        } else if (t.type === 'refund') {
          grossSales -= Number(item?.total ?? Math.abs(txAmount));
          totalCommission -= Number(item?.commissionAmount ?? 0);
        }
      }

      if (netPayable <= 0) return;

      const [newSettlement] = await tx
        .insert(settlements)
        .values({
          vendorId,
          periodStart: sql`now() - interval '1 month'`,
          periodEnd: now,
          grossSales: Math.max(0, grossSales).toFixed(2),
          totalCommission: Math.max(0, totalCommission).toFixed(2),
          netPayable: netPayable.toFixed(2),
          status: 'draft',
        })
        .returning({ id: settlements.id });

      await tx
        .update(transactions)
        .set({ settlementId: newSettlement!.id })
        .where(inArray(transactions.id, txIds));

      createdCount++;
    });
  }

  return { createdCount };
}
