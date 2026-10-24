import { env } from '../env.js';
import { db } from '../db/index.js';
import { messageLogs } from '../db/schema/notifications-config.js';

export type EmailTemplateKey = 
  | 'welcome' 
  | 'order_confirmation' 
  | 'shipping_update' 
  | 'password_reset' 
  | 'vendor_approval' 
  | 'vendor_rejection' 
  | 'new_order_vendor' 
  | 'receipt'
  | 'otp_registration';

export interface EmailOptions {
  to: string;
  templateKey: EmailTemplateKey;
  subject: string;
  data: Record<string, any>;
  html?: string; // Fallback if no template generator is fully built yet
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  let providerMessageId = '';
  let status: 'sent' | 'failed' = 'sent';
  let errorMessage = '';

  try {
    const htmlContent = options.html || generateTemplate(options.templateKey, options.data);

    if (env.BREVO_API_KEY) {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': env.BREVO_API_KEY,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: 'Marketplace',
            email: env.EMAIL_FROM || 'noreply@marketplace.com'
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: htmlContent
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Brevo API Error: ${response.status} ${errorData}`);
      }
      
      const data = await response.json() as any;
      providerMessageId = data.messageId || '';
    } else {
      // Mock mode
      console.log(`[Email Mock] To: ${options.to} | Subject: ${options.subject}`);
      providerMessageId = `mock-${Date.now()}`;
    }
  } catch (err: any) {
    console.error(`[Email Service] Failed to send email to ${options.to}:`, err);
    status = 'failed';
    errorMessage = err.message || 'Unknown error';
  }

  // Log to database
  try {
    await db.insert(messageLogs).values({
      channel: 'email',
      recipient: options.to,
      templateKey: options.templateKey,
      status,
      providerMessageId: providerMessageId || null,
      errorMessage: errorMessage || null,
    });
  } catch (dbErr) {
    console.error(`[Email Service] Failed to log email for ${options.to}:`, dbErr);
  }
}

// Very basic template generator - in a real app this would be more robust
function generateTemplate(key: EmailTemplateKey, data: Record<string, any>): string {
  const brandColor = '#c95f34';
  const safeName = escapeHtml(data.name);
  const safeOrderNumber = escapeHtml(data.orderNumber);
  const safeOtp = escapeHtml(data.otp);
  const safeResetLink = escapeHtml(data.resetLink);

  const header = `
    <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #211c17;">
      <div style="background-color: ${brandColor}; padding: 20px; text-align: center; color: white;">
        <h2>المتجر</h2>
      </div>
      <div style="padding: 20px; background-color: #faf8f5;">
  `;
  const footer = `
      </div>
      <div style="padding: 10px; text-align: center; color: #9c8f7d; font-size: 12px;">
        جميع الحقوق محفوظة &copy; ${new Date().getFullYear()}
      </div>
    </div>
  `;

  let body = '';
  switch (key) {
    case 'welcome':
      body = `<h3>مرحباً ${safeName}،</h3><p>شكراً لتسجيلك معنا!</p>`;
      break;
    case 'order_confirmation':
      body = `<h3>تم تأكيد طلبك #${safeOrderNumber}</h3><p>نشكرك على تسوقك معنا.</p>`;
      break;
    case 'password_reset':
      body = `<h3>مرحباً ${safeName}،</h3><p>لقد طلبت إعادة تعيين كلمة المرور الخاصة بك. يرجى النقر على الرابط أدناه لإعادة تعيينها:</p><p><a href="${safeResetLink}" style="display: inline-block; padding: 10px 20px; background-color: ${brandColor}; color: white; text-decoration: none; border-radius: 4px;">إعادة تعيين كلمة المرور</a></p><p>إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة.</p>`;
      break;
    case 'otp_registration':
      body = `<div style="text-align: center;">
        <h3>مرحباً ${safeName}،</h3>
        <p>استخدم رمز التحقق التالي لإكمال تسجيل حسابك:</p>
        <div style="background-color: #fff; border: 2px dashed ${brandColor}; color: ${brandColor}; font-size: 24px; font-weight: bold; letter-spacing: 5px; padding: 20px; margin: 20px auto; max-width: 200px; border-radius: 8px;">
          ${safeOtp}
        </div>
        <p>هذا الرمز صالح لمدة دقيقتين فقط.</p>
        <p>إذا لم تطلب هذا الرمز، يمكنك تجاهل هذه الرسالة بأمان.</p>
      </div>`;
      break;
    default:
      body = `<p>إشعار من المتجر.</p>`;
  }

  return `${header}${body}${footer}`;
}
