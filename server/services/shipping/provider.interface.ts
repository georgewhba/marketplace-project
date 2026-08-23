export type ShipmentStatus = 'created' | 'picked_up' | 'in_transit' | 'out_for_delivery' | 'delivered' | 'failed_delivery' | 'returned' | 'cancelled';

export interface CreateShipmentParams {
  orderId: number;
  vendorId: number;
  pickupAddress: any;
  dropoffAddress: any;
  items: any[];
}

export interface CreateShipmentResult {
  providerShipmentId: string;
  trackingNumber: string;
  cost: number;
}

export interface ShippingProvider {
  createShipment(params: CreateShipmentParams): Promise<CreateShipmentResult>;
  getTrackingStatus(providerShipmentId: string): Promise<ShipmentStatus>;
  cancelShipment(providerShipmentId: string): Promise<void>;
}
