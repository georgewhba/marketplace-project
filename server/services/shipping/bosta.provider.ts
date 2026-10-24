import { ShippingProvider, CreateShipmentParams, CreateShipmentResult, ShipmentStatus } from './provider.interface.js';
import { env } from '../../env.js';

export class BostaProvider implements ShippingProvider {
  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    if (!env.BOSTA_API_KEY) {
      throw new Error('Bosta integration not configured — BOSTA_API_KEY missing');
    }

    console.log(`[BostaProvider] Creating shipment for Order ID ${params.orderId}, Vendor ID ${params.vendorId}`);
    
    const response = await fetch('https://app.bosta.co/api/v2/deliveries', {
      method: 'POST',
      headers: { 
        'Authorization': env.BOSTA_API_KEY, 
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify({
        type: 10,
        specs: { packageType: 'Parcel', size: 'SMALL' },
        dropOffAddress: {
          city: params.dropoffAddress.city,
          firstLine: params.dropoffAddress.address,
          phone: params.dropoffAddress.phone,
        },
        pickupAddress: {
          city: params.pickupAddress.city,
        },
        businessReference: `order-${params.orderId}-item-${params.items[0]?.id ?? 0}`,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bosta API error (${response.status}): ${errorText}`);
    }

    const data = await response.json() as any;

    return {
      providerShipmentId: data._id,
      trackingNumber: data.trackingNumber,
      cost: data.pricing?.total ?? 0,
    };
  }

  async getTrackingStatus(providerShipmentId: string): Promise<ShipmentStatus> {
    if (!env.BOSTA_API_KEY) {
      throw new Error('Bosta integration not configured — BOSTA_API_KEY missing');
    }

    console.log(`[BostaProvider] Fetching status for ${providerShipmentId}`);
    
    const response = await fetch(`https://app.bosta.co/api/v2/deliveries/${providerShipmentId}`, {
      headers: { 'Authorization': env.BOSTA_API_KEY },
    });
    
    if (!response.ok) {
      throw new Error(`Bosta tracking fetch failed: ${response.status}`);
    }
    
    const data = await response.json() as any;
    const stateVal = typeof data.state === 'object' ? data.state?.value : data.state;
    return this.mapBostaStatusToInternal(stateVal);
  }

  async cancelShipment(providerShipmentId: string): Promise<void> {
    if (!env.BOSTA_API_KEY) {
      throw new Error('Bosta integration not configured — BOSTA_API_KEY missing');
    }

    console.log(`[BostaProvider] Cancelling shipment ${providerShipmentId}`);
    
    const response = await fetch(`https://app.bosta.co/api/v2/deliveries/${providerShipmentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': env.BOSTA_API_KEY },
    });

    if (!response.ok) {
      throw new Error(`Bosta cancellation failed: ${response.status}`);
    }
  }

  private mapBostaStatusToInternal(bostaState: string): ShipmentStatus {
    const stateMap: Record<string, ShipmentStatus> = {
      'TICKET_CREATED': 'created',
      'PACKAGE_RECEIVED': 'picked_up',
      'PICKED_UP': 'picked_up',
      'IN_TRANSIT': 'in_transit',
      'OUT_FOR_DELIVERY': 'out_for_delivery',
      'DELIVERED': 'delivered',
      'FAILED_DELIVERY': 'failed_delivery',
      'CANCELLED': 'cancelled',
      'CANCELED': 'cancelled',
      'RETURNED': 'returned',
    };
    return stateMap[String(bostaState ?? '').toUpperCase()] || 'in_transit';
  }
}
