import { ShippingProvider } from './provider.interface';
import { BostaProvider } from './bosta.provider';
import { ManualProvider } from './manual.provider';

export class ShippingFactory {
  static getProvider(providerName: 'bosta' | 'manual'): ShippingProvider {
    switch (providerName) {
      case 'bosta':
        return new BostaProvider();
      case 'manual':
        return new ManualProvider();
      default:
        throw new Error(`Shipping provider ${providerName} is not supported.`);
    }
  }
}
