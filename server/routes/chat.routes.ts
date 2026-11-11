import { Hono } from 'hono';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { env } from '../env.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { db } from '../db/index.js';
import { siteSettings, products } from '../db/schema/index.js';
import { inArray, eq, desc } from 'drizzle-orm';

const chatRoutes = new Hono();

// Rate limit AI chat to prevent abuse
const aiRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 30,
  message: 'عفواً، لقد تجاوزت الحد المسموح به من الرسائل. يرجى المحاولة بعد قليل.',
});

// Default fallback instruction
const DEFAULT_SYSTEM_INSTRUCTION = `
أنت المساعد الذكي الرسمي لموقع "المتجر" (Al-Matjar). 
دورك هو مساعدة العملاء في الاستفسار عن المنتجات، الشحن، سياسة الاسترجاع، وطرق الدفع. 
قواعد هامة:
1. التحدث باللغة العربية بأسلوب احترافي، مهذب، وودود.
2. لا تخترع معلومات غير موجودة عن المتجر. إذا لم تعرف الإجابة، اطلب من المستخدم التواصل مع الدعم البشري عبر صفحة "اتصل بنا".
3. طرق الدفع المتاحة: البطاقات الائتمانية، المحافظ الإلكترونية، الدفع عند الاستلام.
4. الشحن: يتم شحن الطلبات خلال 24-48 ساعة، ونوفر تتبع للشحنات عبر شركة بوسطة.
5. الإرجاع: متاح خلال 14 يوماً من الاستلام بشرط أن يكون المنتج بحالته الأصلية.
6. اختصر إجاباتك ولا تجعلها طويلة جداً.
7. لا تتحدث عن أي مواضيع خارج نطاق التجارة الإلكترونية وخدمة عملاء الموقع.
`;

const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'الرسالة مطلوبة').max(1000, 'الرسالة طويلة جداً (الحد الأقصى 1000 حرف)'),
  history: z.array(
    z.object({
      role: z.string(),
      text: z.string().max(1000),
    })
  ).max(15).optional().default([]),
});

chatRoutes.post('/', aiRateLimit, async (c) => {
  try {
    const rawBody = await c.req.json().catch(() => ({}));
    const parsed = chatRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || 'الرسالة غير صالحة';
      return c.json({ error: msg }, 400);
    }

    const { message, history } = parsed.data;

    // Fetch AI settings from database
    const settings = await db.select().from(siteSettings).where(
      inArray(siteSettings.key, ['ai_enabled', 'ai_system_prompt', 'ai_model', 'ai_temperature', 'ai_api_key'])
    );
    const settingsMap = Object.fromEntries(settings.map(s => [s.key, s.value]));

    // Check if AI is disabled
    if (settingsMap['ai_enabled'] === 'false') {
      return c.json({ error: 'المساعد الذكي معطل حالياً من قبل الإدارة.' }, 503);
    }

    // Use DB API key if set, otherwise fallback to env
    const apiKey = settingsMap['ai_api_key'] || env.GEMINI_API_KEY;

    if (!apiKey) {
      const q = message.toLowerCase();
      if (q.includes('شحن') || q.includes('توصيل') || q.includes('ship') || q.includes('delivery')) {
        return c.json({
          reply: 'يتم شحن جميع الطلبات خلال 24–48 ساعة عبر شركة بوسطة مع تتبع مباشر للشحنة. رسوم الشحن الافتراضية 30 ج.م.',
        });
      }
      if (q.includes('استرجاع') || q.includes('إرجاع') || q.includes('استبدال') || q.includes('refund') || q.includes('return')) {
        return c.json({
          reply: 'يمكنك طلب إرجاع أو استبدال المنتجات خلال 14 يوماً من تاريخ الاستلام من صفحة "طلباتي" بشرط أن يكون المنتج بحالته الأصلية.',
        });
      }
      if (q.includes('دفع') || q.includes('فيزا') || q.includes('كاش') || q.includes('pay')) {
        return c.json({
          reply: 'نوفر الدفع عند الاستلام (كاش)، بالإضافة إلى الدفع الإلكتروني الآمن بالبطاقات البنكية والمحافظ الإلكترونية عبر Paymob.',
        });
      }
      if (q.includes('خصم') || q.includes('كوبون') || q.includes('عرض') || q.includes('coupon') || q.includes('discount')) {
        return c.json({
          reply: 'يمكنك استخدام أكواد الخصم المتاحة حالياً عند إتمام الشراء: WELCOME10 (خصم 10%)، SAVE50 (خصم 50 ج.م للطلبات فوق 500 ج.م)، أو SUMMER25 (خصم 25%).',
        });
      }

      const topProducts = await db
        .select({ name: products.name, price: products.price })
        .from(products)
        .where(eq(products.isActive, true))
        .orderBy(desc(products.isFeatured), desc(products.rating))
        .limit(4);

      const sampleList = topProducts.length > 0
        ? `\nأبرز المنتجات المتاحة حالياً:\n${topProducts.map(p => `• ${p.name} (${p.price} ج.م)`).join('\n')}`
        : '';

      return c.json({
        reply: `مرحباً بك في سوق مصر! يسعدني مساعدتك في تصفح المنتجات، معرفة تفاصيل الشحن (24-48 ساعة)، الدفع (عند الاستلام أو بالبطاقة)، وسياسة الاسترجاع (خلال 14 يوماً).${sampleList}`,
      });
    }

    const systemInstruction = settingsMap['ai_system_prompt'] || DEFAULT_SYSTEM_INSTRUCTION;
    const rawModel = settingsMap['ai_model'] || 'gemini-2.5-flash';
    const model = rawModel === 'gemini-3.7-flash' ? 'gemini-2.5-flash' : rawModel;
    const temperature = settingsMap['ai_temperature'] ? Math.min(2, Math.max(0, parseFloat(settingsMap['ai_temperature']))) : 0.7;

    const ai = new GoogleGenAI({ apiKey });
    
    // Format history for Gemini API
    const formattedHistory = history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }],
    }));

    const response = await ai.models.generateContent({
      model,
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] },
      ],
      config: {
        systemInstruction,
        temperature,
        maxOutputTokens: 500,
      },
    });

    const reply = response.text || 'عفواً، لم أتمكن من معالجة طلبك الآن.';
    
    return c.json({ reply });
  } catch (error: any) {
    console.error('[AI Chat] Error:', error);
    const rawMessage = String(error?.message || '');
    if (rawMessage.includes('high demand') || rawMessage.includes('429') || rawMessage.includes('RESOURCE_EXHAUSTED')) {
      return c.json({ error: 'يوجد ضغط كبير على السيرفرات حالياً، يرجى المحاولة بعد قليل.' }, 503);
    }

    return c.json({ error: 'حدث خطأ أثناء الاتصال بالدعم الذكي. يرجى المحاولة مرة أخرى لاحقاً.' }, 500);
  }
});

export default chatRoutes;
