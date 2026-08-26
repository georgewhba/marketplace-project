import { Hono } from 'hono';
import { GoogleGenAI } from '@google/genai';
import { env } from '../env.js';
import { rateLimit } from '../middleware/rateLimit.js';

const chatRoutes = new Hono();

// Rate limit AI chat to prevent abuse (e.g., max 10 messages per minute per IP)
const aiRateLimit = rateLimit({
  windowMs: 60_000,
  maxRequests: 10,
  message: 'عفواً، لقد تجاوزت الحد المسموح به من الرسائل. يرجى المحاولة بعد قليل.',
});

// System prompt dictating the persona of the AI agent
const SYSTEM_INSTRUCTION = `
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

chatRoutes.post('/', aiRateLimit, async (c) => {
  try {
    const { message, history } = await c.req.json();

    if (!message || typeof message !== 'string') {
      return c.json({ error: 'الرسالة مطلوبة' }, 400);
    }

    if (!env.GEMINI_API_KEY) {
      return c.json({ error: 'خدمة الدعم الفني الذكي غير متاحة حالياً.' }, 503);
    }

    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    
    // Format history for Gemini API
    const formattedHistory = Array.isArray(history) ? history.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.text }]
    })) : [];

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: [
        ...formattedHistory,
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.7,
      }
    });

    const reply = response.text || 'عفواً، لم أتمكن من معالجة طلبك الآن.';
    
    return c.json({ reply });
  } catch (error: any) {
    console.error('[AI Chat] Error:', error);
    let errorMessage = error?.message || 'حدث خطأ أثناء الاتصال بالدعم الذكي.';
    try {
      if (errorMessage.startsWith('{')) {
        const parsed = JSON.parse(errorMessage);
        errorMessage = parsed?.error?.message || errorMessage;
      }
    } catch (e) {}
    
    if (errorMessage.includes('high demand')) {
      errorMessage = 'يوجد ضغط كبير على السيرفرات حالياً، يرجى المحاولة بعد قليل.';
    }

    return c.json({ error: `حدث خطأ: ${errorMessage}` }, 500);
  }
});

export default chatRoutes;
