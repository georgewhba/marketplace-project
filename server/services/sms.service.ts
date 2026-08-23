import { db } from '../db/index.js';
import { messageLogs } from '../db/schema/notifications-config.js';

export interface SmsOptions {
  to: string;
  message: string;
  templateKey?: string;
}

export async function sendSms(options: SmsOptions): Promise<void> {
  let providerMessageId = '';
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage = '';

  try {
    // SMS integration goes here (e.g. Twilio, Vodafone, etc.)
    // For now, it logs to console
    console.log(`[SMS Mock] To: ${options.to} | Message: ${options.message}`);
    providerMessageId = `sms-mock-${Date.now()}`;
  } catch (err: any) {
    console.error(`[SMS Service] Failed to send SMS to ${options.to}:`, err);
    status = 'failed';
    errorMessage = err.message || 'Unknown error';
  }

  // Log to database
  try {
    await db.insert(messageLogs).values({
      channel: 'sms',
      recipient: options.to,
      templateKey: options.templateKey || null,
      status,
      providerMessageId: providerMessageId || null,
      errorMessage: errorMessage || null,
    });
  } catch (dbErr) {
    console.error(`[SMS Service] Failed to log SMS for ${options.to}:`, dbErr);
  }
}
