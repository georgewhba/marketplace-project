import { ShippingProvider, CreateShipmentParams, CreateShipmentResult, ShipmentStatus } from './provider.interface';
import { randomUUID } from 'crypto';

export class BostaProvider implements ShippingProvider {
  async createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult> {
    // In a real environment, we would make an API call to Bosta here.
    // e.g. await axios.post('https://api.bosta.co/api/v1/deliveries', payload)
    
    // For now, we simulate the Bosta API response
    console.log(`[BostaProvider] Creating shipment for Order ID ${params.orderId}, Vendor ID ${params.vendorId}`);
    
    const providerShipmentId = `BST-${randomUUID().slice(0, 8).toUpperCase()}`;
    const trackingNumber = `TRK-${Math.floor(Math.random() * 1000000000)}`;
    const cost = Math.floor(Math.random() * 50) + 30; // Random cost between 30 and 80 EGP

    return {
      providerShipmentId,
      trackingNumber,
      cost
    };
  }

  async getTrackingStatus(providerShipmentId: string): Promise<ShipmentStatus> {
    // Simulate fetching status
    console.log(`[BostaProvider] Fetching status for ${providerShipmentId}`);
    return 'in_transit'; 
  }

  async cancelShipment(providerShipmentId: string): Promise<void> {
    // Simulate cancellation
    console.log(`[BostaProvider] Cancelling shipment ${providerShipmentId}`);
  }
}
