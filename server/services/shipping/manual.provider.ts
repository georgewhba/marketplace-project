import { ShippingProvider, CreateShipmentParams, CreateShipmentResult, ShipmentStatus } from './provider.interface.js';

export class ManualProvider implements ShippingProvider {
  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    console.log(`[ManualProvider] Creating manual shipment for Order ID ${params.orderId}, Vendor ID ${params.vendorId}`);
    
    // In a manual flow, the tracking number should be provided by the vendor
    // We assume the caller handles this logic before or after.
    
    return {
      providerShipmentId: `MANUAL-${Date.now()}`,
      trackingNumber: '', // Will be updated by vendor
      cost: 0 
    };
  }

  async getTrackingStatus(providerShipmentId: string): Promise<ShipmentStatus> {
    return 'in_transit'; // Manual shipments usually don't have automatic tracking
  }

  async cancelShipment(providerShipmentId: string): Promise<void> {
    console.log(`[ManualProvider] Cancelling shipment ${providerShipmentId}`);
  }
}
