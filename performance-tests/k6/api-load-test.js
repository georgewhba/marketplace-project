import http from 'k6/http';
import { check, sleep } from 'k6';

// إعدادات الاختبار
export const options = {
  // محاكاة زيادة ونقصان الضغط بشكل تدريجي (Spike/Load)
  stages: [
    { duration: '30s', target: 20 },  // زيادة المستخدمين إلى 20 خلال 30 ثانية
    { duration: '1m', target: 20 },   // الثبات على 20 مستخدم لمدة دقيقة
    { duration: '30s', target: 0 },   // تقليل المستخدمين إلى 0
  ],
  thresholds: {
    // 95% من الطلبات يجب أن تكون أسرع من 500 ملي ثانية
    http_req_duration: ['p(95)<500'],
    // نسبة الفشل يجب أن تكون أقل من 1%
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // فحص حالة النظام أو جلب صفحة عامة
  // يرجى تعديل المسار ليتوافق مع الـ API الخاص بك
  const res = http.get(`${BASE_URL}/api/health`); 
  
  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  // يمكنك إضافة طلبات أخرى هنا مثل جلب المنتجات
  // const productsRes = http.get(`${BASE_URL}/api/products`);
  // check(productsRes, { 'products loaded': (r) => r.status === 200 });

  sleep(1); // انتظار ثانية بين كل دورة طلبات
}
