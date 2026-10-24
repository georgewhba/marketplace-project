import { RotateCcw } from 'lucide-react';

export default function ReturnPolicyPage() {
  return (
    <div className="container page-content" style={{ maxWidth: 860 }}>
      <div className="page-header mb-6">
        <div>
          <h1 className="page-header__title flex items-center gap-3">
            <RotateCcw size={28} className="text-brand" />
            سياسة الإرجاع
          </h1>
          <p className="page-header__subtitle">نسعى دائماً لرضاكم. إذا لم تكن راضياً عن مشترياتك، يمكنك إرجاعها وفقاً للشروط التالية:</p>
        </div>
      </div>

      <div className="policy-card">
        <div className="policy-section">
          <h3 className="policy-section__title">مدة الإرجاع</h3>
          <p className="policy-section__text">
            يمكنك إرجاع المنتجات خلال 14 يوماً من تاريخ استلام الطلب.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">شروط الإرجاع</h3>
          <p className="policy-section__text">
            يجب أن يكون المنتج في حالته الأصلية، غير مستخدم، وبكافة ملحقاته وتغليفه الأصلي. بعض المنتجات مثل الملابس الداخلية والمنتجات القابلة للتلف لا يمكن إرجاعها لأسباب صحية.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">كيفية الاسترداد</h3>
          <p className="policy-section__text">
            بمجرد استلامنا للمنتج المرتجع وفحصه، سيتم إرجاع المبلغ إلى نفس وسيلة الدفع التي استخدمتها خلال 5 إلى 10 أيام عمل.
          </p>
        </div>
      </div>
    </div>
  );
}
