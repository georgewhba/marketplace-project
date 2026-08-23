import { db } from '../db/index.js';
import { settlements } from '../db/schema/settlements.js';
import { transactions } from '../db/schema/transactions.js';
import { isNull, eq, and, sql } from 'drizzle-orm';
import { vendors } from '../db/schema/vendors.js';
import { orderItems } from '../db/schema/order-items.js';

export async function generateSettlements(): Promise<{ createdCount: number }> {
  // Find all commission transactions that have not been settled yet, join with orderItems to get gross sales
  const unsettledData = await db.select({
    vendorId: transactions.vendorId,
    grossSales: sql<number>`sum(${orderItems.total}::numeric)`,
    totalCommission: sql<number>`sum(${orderItems.commissionAmount}::numeric)`,
    netPayable: sql<number>`sum(${transactions.amount}::numeric)`,
  })
  .from(transactions)
  .innerJoin(orderItems, eq(transactions.orderItemId, orderItems.id))
  .where(and(eq(transactions.type, 'commission'), isNull(transactions.settlementId)))
  .groupBy(transactions.vendorId);
  
  let createdCount = 0;
  const now = new Date();
  
  for (const data of unsettledData) {
    if (data.netPayable <= 0) continue;
    
    await db.transaction(async (tx) => {
      // Create settlement
      const [newSettlement] = await tx.insert(settlements).values({
        vendorId: data.vendorId,
        periodStart: sql`now() - interval '1 month'`, // This is arbitrary, in reality it depends on the last settlement. Let's just use now() and we'll refine if needed.
        periodEnd: now,
        grossSales: data.grossSales.toString(),
        totalCommission: data.totalCommission.toString(),
        netPayable: data.netPayable.toString(),
        status: 'draft',
      }).returning({ id: settlements.id });
      
      // Update transactions to link them to this settlement
      await tx.update(transactions)
        .set({ settlementId: newSettlement!.id })
        .where(
          and(
            eq(transactions.vendorId, data.vendorId),
            eq(transactions.type, 'commission'),
            isNull(transactions.settlementId)
          )
        );
        
      createdCount++;
    });
  }
  
  return { createdCount };
}
