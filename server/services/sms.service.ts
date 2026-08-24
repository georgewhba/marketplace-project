import { db } from '../db/index.js';
import { messageLogs } from '../db/schema/notifications-config.js';
import { env } from '../env.js';
import twilio from 'twilio';

export interface SmsOptions {
  to: string;
  message: string;
  templateKey?: string;
}

const client = env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
  ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
  : null;

export async function sendSms(options: SmsOptions): Promise<void> {
  let providerMessageId = '';
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage = '';

  if (!client) {
    status = 'failed';
    errorMessage = 'SMS provider not configured (missing Twilio credentials)';
  } else {
    try {
      const message = await client.messages.create({
        body: options.message,
        from: env.TWILIO_FROM_NUMBER,
        to: options.to,
      });
      providerMessageId = message.sid;
      console.log(`[SMS Service] SMS sent successfully to ${options.to}. SID: ${message.sid}`);
    } catch (err: any) {
      console.error(`[SMS Service] Failed to send SMS to ${options.to}:`, err);
      status = 'failed';
      errorMessage = err.message || 'Unknown SMS provider error';
    }
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
