import { Lock } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="container page-content" style={{ maxWidth: 860 }}>
      <div className="page-header mb-6">
        <div>
          <h1 className="page-header__title flex items-center gap-3">
            <Lock size={28} className="text-brand" />
            سياسة الخصوصية
          </h1>
          <p className="page-header__subtitle">كيف نحمي بياناتك الشخصية ونحافظ على خصوصيتك</p>
        </div>
      </div>

      <div className="policy-card">
        <div className="policy-section">
          <h3 className="policy-section__title">1. جمع المعلومات الشخصية</h3>
          <p className="policy-section__text">
            نحن نقوم بجمع المعلومات التي تقدمها لنا مباشرة، مثل الاسم، رقم الهاتف، والبريد الإلكتروني، عند إنشاء حساب، إتمام عملية شراء، أو التواصل مع خدمة العملاء. هذه المعلومات ضرورية لتقديم خدماتنا.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">2. استخدام المعلومات</h3>
          <p className="policy-section__text">
            تُستخدم معلوماتك الشخصية لتسهيل عمليات البيع والشراء، تحسين تجربة المستخدم، تقديم الدعم الفني، وإرسال تحديثات وإشعارات هامة متعلقة بحسابك أو طلباتك.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">3. حماية البيانات</h3>
          <p className="policy-section__text">
            نحن نتخذ إجراءات أمنية صارمة لحماية بياناتك من الوصول غير المصرح به أو التعديل أو الإفصاح أو الإتلاف. تُشفر جميع البيانات الحساسة (مثل كلمات المرور) بأحدث المعايير التقنية.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">4. مشاركة البيانات</h3>
          <p className="policy-section__text">
            نحن لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك بعض المعلومات (مثل الاسم ورقم الهاتف والعنوان) مع شركاء الشحن لتسهيل توصيل الطلبات، أو مع بائعينا إذا كان ذلك ضرورياً لإتمام طلباتك.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">5. حقوقك</h3>
          <p className="policy-section__text">
            يحق لك في أي وقت الوصول إلى بياناتك الشخصية المسجلة لدينا، وتحديثها، أو طلب حذفها وفقاً للقوانين واللوائح المعمول بها في جمهورية مصر العربية.
          </p>
        </div>
      </div>
    </div>
  );
}
