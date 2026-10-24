import { db } from '../db/index.js';
import { notificationPreferences } from '../db/schema/notifications-config.js';
import { notifications } from '../db/schema/notifications.js';
import { and, eq } from 'drizzle-orm';
import { emailQueue } from '../jobs/email.queue.js';
import type { EmailTemplateKey } from './email.service.js';
import { sendSms } from './sms.service.js';
import { users } from '../db/schema/users.js';

export type NotificationCategory = 'order_updates' | 'promotions' | 'stock_alerts' | 'system' | 'vendor_updates';

export interface DispatchOptions {
  userId: number;
  category: NotificationCategory;
  title: string;
  message: string;
  actionUrl?: string;
  email?: {
    templateKey: EmailTemplateKey;
    data: Record<string, any>;
  };
  sms?: {
    message: string;
  };
}

export async function dispatchNotification(options: DispatchOptions): Promise<void> {
  const { userId, category, title, message, actionUrl, email, sms } = options;

  // 1. Get user details
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) return;

  // 2. Fetch user preferences
  const preferences = await db
    .select()
    .from(notificationPreferences)
    .where(and(eq(notificationPreferences.userId, userId), eq(notificationPreferences.category, category)));

  // Helper to check if a channel is enabled (default is true if not explicitly set)
  const isEnabled = (channel: string) => {
    // If it's an operational category, it might be forced. But let's respect preferences if explicitly set to false.
    // 'order_updates' might be required for email/in_app.
    const pref = preferences.find(p => p.channel === channel);
    if (pref) return pref.enabled;
    // Default fallback
    if (category === 'promotions' && channel === 'sms') return false; // Default off for expensive channels
    return true; 
  };

  // 3. Dispatch In-App Notification
  if (isEnabled('in_app')) {
    await db.insert(notifications).values({
      userId,
      title,
      message,
      type: category,
      actionUrl,
    });
  }

  // 4. Dispatch Email
  if (email && user.email && isEnabled('email')) {
    // Fire and forget via BullMQ
    emailQueue.add('dispatch-notification', {
      to: user.email,
      subject: title,
      templateKey: email.templateKey,
      data: email.data,
    }).catch((err) => console.error('[Notification] Async dispatch error:', err));
  }

  // 5. Dispatch SMS
  if (sms && user.phone && isEnabled('sms')) {
    // Fire and forget
    sendSms({
      to: user.phone,
      message: sms.message,
      templateKey: category,
    }).catch((err) => console.error('[Notification] Async dispatch error:', err));
  }
}
