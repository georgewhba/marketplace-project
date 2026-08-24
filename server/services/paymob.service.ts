import crypto from 'crypto';
import { env } from '../env.js';

const PAYMOB_API_URL = 'https://accept.paymob.com/api';

export const paymobService = {
  async getAuthToken(): Promise<string> {
    if (!env.PAYMOB_API_KEY) throw new Error('Paymob API Key missing');
    const authRes = await fetch(`${PAYMOB_API_URL}/auth/tokens`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: env.PAYMOB_API_KEY })
    });
    if (!authRes.ok) throw new Error('Paymob Auth failed');
    const authData = await authRes.json() as any;
    return authData.token;
  },

  /**
   * Generates a payment key for an order
   */
  async generatePaymentKey(orderId: number, amount: number, billingData: any) {
    if (!env.PAYMOB_API_KEY || !env.PAYMOB_INTEGRATION_ID_CARD || !env.PAYMOB_IFRAME_ID) {
      // Mock mode for local dev if credentials are not provided
      console.warn('⚠️ Paymob credentials not found. Using MOCK mode.');
      return {
        paymentKey: 'mock_payment_key_' + orderId,
        iframeUrl: `/mock-paymob?orderId=${orderId}`
      };
    }

    try {
      // 1. Authentication
      const authToken = await this.getAuthToken();

      // 2. Order Registration
      const amountCents = Math.round(amount * 100).toString();
      const orderRes = await fetch(`${PAYMOB_API_URL}/ecommerce/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          delivery_needed: 'false',
          amount_cents: amountCents,
          currency: 'EGP',
          merchant_order_id: `ORD-${orderId}-${Date.now()}`,
          items: []
        })
      });
      if (!orderRes.ok) throw new Error('Paymob Order Registration failed');
      const orderData = await orderRes.json() as any;
      const paymobOrderId = orderData.id;

      // 3. Payment Key Generation
      const keyRes = await fetch(`${PAYMOB_API_URL}/acceptance/payment_keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: authToken,
          amount_cents: amountCents,
          expiration: 3600,
          order_id: paymobOrderId,
          billing_data: billingData,
          currency: 'EGP',
          integration_id: env.PAYMOB_INTEGRATION_ID_CARD
        })
      });
      if (!keyRes.ok) throw new Error('Paymob Payment Key Generation failed');
      const keyData = await keyRes.json() as any;
      const paymentKey = keyData.token;

      return {
        paymentKey,
        iframeUrl: `https://accept.paymob.com/api/acceptance/iframes/${env.PAYMOB_IFRAME_ID}?payment_token=${paymentKey}`
      };
    } catch (err) {
      console.error('Paymob error:', err);
      throw err;
    }
  },

  /**
   * Validates HMAC from Paymob Webhook
   */
  validateHMAC(payload: any, hmacReceived: string) {
    if (!env.PAYMOB_HMAC) {
      console.error('🚨 PAYMOB_HMAC not configured — rejecting all webhooks until fixed');
      return false; // Safe failure
    }

    const keys = [
      'amount_cents',
      'created_at',
      'currency',
      'error_occured',
      'has_parent_transaction',
      'id',
      'integration_id',
      'is_3d_secure',
      'is_auth',
      'is_capture',
      'is_refunded',
      'is_standalone_payment',
      'is_voided',
      'order.id',
      'owner',
      'pending',
      'source_data.pan',
      'source_data.sub_type',
      'source_data.type',
      'success'
    ];

    let concatenatedString = '';
    for (const key of keys) {
      const parts = key.split('.');
      let val = payload;
      for (const part of parts) {
        if (val && typeof val === 'object') {
          val = val[part];
        } else {
          val = undefined;
        }
      }
      
      // Paymob specifies strict formatting for booleans
      if (typeof val === 'boolean') {
        concatenatedString += val ? 'true' : 'false';
      } else if (val !== undefined && val !== null) {
        concatenatedString += String(val);
      }
    }

    const hmacCalculated = crypto
      .createHmac('sha512', env.PAYMOB_HMAC)
      .update(concatenatedString)
      .digest('hex');

    return hmacCalculated === hmacReceived;
  },

  /**
   * Stub for refund (Would call Paymob Refund API)
   */
  async issueRefund(transactionId: string, amount: number) {
    if (!env.PAYMOB_API_KEY) {
      throw new Error('Paymob refund unavailable: API credentials not configured');
    }

    const authToken = await this.getAuthToken();
    const amountCents = Math.round(amount * 100);

    const response = await fetch(`${PAYMOB_API_URL}/acceptance/void_refund/refund`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_token: authToken,
        transaction_id: transactionId,
        amount_cents: amountCents,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Paymob refund failed (${response.status}): ${errText}`);
    }

    const data = await response.json() as any;
    if (data.success !== true && data.success !== 'true') {
      throw new Error(`Paymob refund rejected: ${JSON.stringify(data)}`);
    }

    return { success: true, providerRefundId: data.id };
  }
};
