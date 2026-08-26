import { chromium } from 'playwright';
import { playAudit } from 'playwright-lighthouse';
import fetch from 'node-fetch'; // للتأكد من أن الخادم يعمل قبل الاختبار

// إعدادات پورت الخادم المحلي
const PORT = process.env.PORT || 5173; 

(async () => {
  console.log('🚀 بدء اختبار أداء الواجهة الأمامية باستخدام Lighthouse & Playwright');

  const browser = await chromium.launch({
    args: ['--remote-debugging-port=9222'],
    headless: true
  });
  
  const page = await browser.newPage();
  const url = `http://localhost:${PORT}`;

  try {
    // محاولة الاتصال بالخادم
    const response = await fetch(url);
    if (!response.ok) throw new Error('Server not responding with OK status.');

    console.log(`✅ تم الاتصال بنجاح بالخادم على ${url}`);
    
    // تشغيل الـ Audit
    await playAudit({
      page: page,
      thresholds: {
        performance: 50,
        accessibility: 50,
        'best-practices': 50,
        seo: 50,
      },
      port: 9222,
      reports: {
        formats: {
          html: true, 
        },
        name: `lighthouse-report-${Date.now()}`,
        directory: `${process.cwd()}/performance-tests/reports`,
      },
    });

    console.log('📊 اكتمل فحص الأداء وتم حفظ التقرير في مجلد reports.');

  } catch (error) {
    console.error('❌ فشل فحص الأداء:', error.message);
    console.error('يرجى التأكد من تشغيل خادم التطوير (npm run dev) قبل إجراء الاختبار.');
  } finally {
    await browser.close();
  }
})();
