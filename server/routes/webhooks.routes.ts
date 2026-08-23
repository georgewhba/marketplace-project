import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../db/index.js';
import { shipments, shipmentEvents, orderItems, orders } from '../db/schema/index.js';
import { eq, and } from 'drizzle-orm';
import { validate, getValidated } from '../middleware/validate.js';
import { sendSuccess } from '../utils/response.js';
import { AppError } from '../utils/errors.js';
import { calculateOrderStatus, shouldAdvanceOrderStatus } from '../utils/calculateOrderStatus.js';
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

  // Verify auth header or signature here if bosta provides one
  // e.g. const signature = c.req.header('x-bosta-signature');
  const authHeader = c.req.header('Authorization');
  if (!authHeader || authHeader !== `Bearer ${env.BOSTA_WEBHOOK_SECRET}`) {
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

    // 3. Sync to orderItems & orders if delivered
    if (mappedStatus === 'delivered') {
      const allOrderItems = await tx.select().from(orderItems).where(eq(orderItems.orderId, shipment.orderId));
      
      // Update items linked to this shipment's vendor
      await tx.update(orderItems)
        .set({ vendorStatus: 'delivered', deliveredAt: new Date(), updatedAt: new Date() })
        .where(
          and(
            eq(orderItems.orderId, shipment.orderId),
            eq(orderItems.trackingNumber, payload.trackingNumber)
          )
        );

      // Calculate parent order status
      const [order] = await tx.select().from(orders).where(eq(orders.id, shipment.orderId)).limit(1);
      
      if (order) {
        const updatedSiblings = await tx.select().from(orderItems).where(eq(orderItems.orderId, shipment.orderId));
        // A rough simplification of calculateOrderStatus without itemId since we don't know exactly which item caused it
        const allDelivered = updatedSiblings.every(i => i.vendorStatus === 'delivered' || i.vendorStatus === 'cancelled');
        if (allDelivered) {
          await tx.update(orders)
            .set({ status: 'delivered', updatedAt: new Date() })
            .where(eq(orders.id, order.id));
        }
      }
    }
  });

  return sendSuccess(c, { received: true });
});

export default webhooksRoutes;
