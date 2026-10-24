import { HelpCircle } from 'lucide-react';

export default function FaqPage() {
  return (
    <div className="container page-content" style={{ maxWidth: 860 }}>
      <div className="page-header mb-6">
        <div>
          <h1 className="page-header__title flex items-center gap-3">
            <HelpCircle size={28} className="text-brand" />
            الأسئلة الشائعة
          </h1>
          <p className="page-header__subtitle">إجابات سريعة على أكثر الاستفسارات شيوعاً حول التسوق والبيع</p>
        </div>
      </div>

      <div className="policy-card">
        <div className="policy-section">
          <h3 className="policy-section__title">كيف يمكنني تتبع طلبي؟</h3>
          <p className="policy-section__text">
            يمكنك تتبع طلبك بالدخول إلى حسابك ثم التوجه إلى صفحة "طلباتي". ستجد هناك تفاصيل وحالة كل طلب قمت بإجرائه.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">ما هي طرق الدفع المتاحة؟</h3>
          <p className="policy-section__text">
            نحن نقبل الدفع عبر البطاقات الائتمانية (فيزا، ماستركارد)، الدفع عند الاستلام (كاش)، والمحافظ الإلكترونية المختارة.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">هل يمكنني تعديل الطلب بعد تأكيده؟</h3>
          <p className="policy-section__text">
            يمكنك إلغاء أو تعديل الطلب فقط إذا كانت حالته "قيد المراجعة". بمجرد تغيير حالة الطلب إلى "جاري التجهيز" أو "تم الشحن"، لن تتمكن من تعديله.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">كيف يمكنني البيع على المنصة؟</h3>
          <p className="policy-section__text">
            يمكنك الانضمام كبائع من خلال الضغط على رابط "سجّل متجرك" أسفل الصفحة وتعبئة نموذج التسجيل. سيقوم فريقنا بمراجعة طلبك والتواصل معك.
          </p>
        </div>
      </div>
    </div>
  );
}
