import { Hono } from 'hono';
import { z } from 'zod';
import { GoogleGenAI } from '@google/genai';
import { env } from '../env.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { db } from '../db/index.js';
import { siteSettings } from '../db/schema/index.js';
import { inArray } from 'drizzle-orm';

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
      return c.json({ error: 'خدمة الدعم الفني الذكي غير متاحة حالياً (مفتاح API غير متوفر).' }, 503);
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
