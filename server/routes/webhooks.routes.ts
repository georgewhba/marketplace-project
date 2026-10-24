import { Hono } from 'hono';
import crypto from 'crypto';
import { z } from 'zod';
import { db } from '../db/index.js';
import { shipments, shipmentEvents, orderItems, orders, products, vendors, transactions } from '../db/schema/index.js';
import { eq, and, sql } from 'drizzle-orm';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { resolveCommissionRate } from '../services/commission.service.js';
import type { AppEnv } from '../types/env.js';
import { env } from '../env.js';

const webhooksRoutes = new Hono<AppEnv>();

// Bosta payload usually contains delivery state and tracking number
const bostaWebhookSchema = z.object({
  _id: z.string().optional(),
  trackingNumber: z.string(),
  state: z.object({
    code: z.number().optional(),
    value: z.string(),
  }),
}).passthrough();

// Map Bosta state to our internal ShipmentStatus
function mapBostaState(bostaValue: string): string {
  const stateMap: Record<string, string> = {
    'TICKET_CREATED': 'created',
    'PICKED_UP': 'picked_up',
    'IN_TRANSIT': 'in_transit',
    'OUT_FOR_DELIVERY': 'out_for_delivery',
    'DELIVERED': 'delivered',
    'FAILED_DELIVERY': 'failed_delivery',
    'RETURNED': 'returned',
    'CANCELED': 'cancelled',
  };
  return stateMap[bostaValue.toUpperCase()] || 'in_transit';
}

// POST /api/webhooks/bosta
webhooksRoutes.post('/bosta', validate('body', bostaWebhookSchema), async (c) => {
  const payload = getValidated<z.infer<typeof bostaWebhookSchema>>(c, 'body');

  if (!env.BOSTA_WEBHOOK_SECRET) {
    throw AppError.unauthorized('Webhook secret not configured');
  }

  const authHeader = c.req.header('Authorization') ?? '';
  const expectedAuth = `Bearer ${env.BOSTA_WEBHOOK_SECRET}`;
  const authBuf = Buffer.from(authHeader);
  const expectedBuf = Buffer.from(expectedAuth);
  if (authBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(authBuf, expectedBuf)) {
    throw AppError.unauthorized('Invalid webhook signature');
  }

  const [shipment] = await db.select()
    .from(shipments)
    .where(eq(shipments.trackingNumber, payload.trackingNumber))
    .limit(1);

  if (!shipment) {
    // Return 200 so Bosta stops retrying, even if not found in our db
    console.warn(`[Webhook] Shipment not found for tracking: ${payload.trackingNumber}`);
    return sendSuccess(c, { received: true });
  }

  const mappedStatus = mapBostaState(payload.state.value);

  await db.transaction(async (tx) => {
    // 1. Add event
    await tx.insert(shipmentEvents).values({
      shipmentId: shipment.id,
      status: mappedStatus as any,
      description: `Bosta update: ${payload.state.value}`,
    });

    // 2. Update shipment
    await tx.update(shipments)
      .set({ status: mappedStatus as any, updatedAt: new Date() })
      .where(eq(shipments.id, shipment.id));

    // 3. Sync to orderItems & orders if delivered (with full ledger + balance + stock stats)
    if (mappedStatus === 'delivered') {
      const lockedItems = await tx
        .select()
        .from(orderItems)
        .where(
          and(
            eq(orderItems.orderId, shipment.orderId),
            eq(orderItems.trackingNumber, payload.trackingNumber)
          )
        )
        .for('update');

      const nowDate = new Date();

      for (const lockedItem of lockedItems) {
        if (lockedItem.vendorStatus === 'delivered' || lockedItem.vendorStatus === 'cancelled') {
          continue;
        }

        let categoryId: number | undefined = undefined;
        if (lockedItem.productId) {
          const [prod] = await tx.select({ categoryId: products.categoryId })
            .from(products)
            .where(eq(products.id, lockedItem.productId));
          categoryId = prod?.categoryId ?? undefined;
        }

        const saleAmount = parseFloat(lockedItem.total);
        const commissionRate = await resolveCommissionRate(lockedItem.vendorId, categoryId ?? 0);
        const commissionAmount = saleAmount * (commissionRate / 100);
        const vendorAmount = saleAmount - commissionAmount;

        // Lock vendor row and compute balance
        const [vendorRecord] = await tx
          .select({ totalSales: vendors.totalSales })
          .from(vendors)
          .where(eq(vendors.id, lockedItem.vendorId))
          .for('update')
          .limit(1);

        const balanceBefore = parseFloat(vendorRecord?.totalSales ?? '0');
        const balanceAfter = balanceBefore + vendorAmount;

        // Record commission transaction
        await tx.insert(transactions).values({
          vendorId: lockedItem.vendorId,
          orderItemId: lockedItem.id,
          type: 'commission',
          amount: vendorAmount.toFixed(2),
          balanceBefore: balanceBefore.toFixed(2),
          balanceAfter: balanceAfter.toFixed(2),
          description: `عمولة من الطلب - ${lockedItem.productName}`,
        });

        // Update vendor balance
        await tx.update(vendors).set({
          totalSales: balanceAfter.toFixed(2),
          updatedAt: nowDate,
        }).where(eq(vendors.id, lockedItem.vendorId));

        // Increment product totalSold
        if (lockedItem.productId) {
          await tx.update(products).set({
            totalSold: sql`${products.totalSold} + ${lockedItem.quantity}`,
          }).where(eq(products.id, lockedItem.productId));
        }

        // Update orderItem
        await tx.update(orderItems).set({
          vendorStatus: 'delivered',
          deliveredAt: nowDate,
          updatedAt: nowDate,
          commissionRate: commissionRate.toFixed(2),
          commissionAmount: commissionAmount.toFixed(2),
          vendorAmount: vendorAmount.toFixed(2),
        }).where(eq(orderItems.id, lockedItem.id));
      }

      // Calculate parent order status
      const [order] = await tx.select().from(orders).where(eq(orders.id, shipment.orderId)).limit(1);
      if (order) {
        const updatedSiblings = await tx.select().from(orderItems).where(eq(orderItems.orderId, shipment.orderId));
        const allDelivered = updatedSiblings.length > 0 && updatedSiblings.every(i => i.vendorStatus === 'delivered' || i.vendorStatus === 'cancelled');
        if (allDelivered) {
          await tx.update(orders)
            .set({ status: 'delivered', updatedAt: nowDate })
            .where(eq(orders.id, order.id));
        }
      }
    }
  });

  return sendSuccess(c, { received: true });
});

export default webhooksRoutes;
