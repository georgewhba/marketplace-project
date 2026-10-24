import { useSiteName } from '../hooks/useSiteSettings';
import { ShieldCheck } from 'lucide-react';

export default function TermsPage() {
  const siteName = useSiteName();

  return (
    <div className="container page-content" style={{ maxWidth: 860 }}>
      <div className="page-header mb-6">
        <div>
          <h1 className="page-header__title flex items-center gap-3">
            <ShieldCheck size={28} className="text-brand" />
            شروط الاستخدام
          </h1>
          <p className="page-header__subtitle">القواعد والأحكام المنظمة لاستخدام منصة {siteName}</p>
        </div>
      </div>

      <div className="policy-card">
        <div className="policy-section">
          <h3 className="policy-section__title">1. مقدمة</h3>
          <p className="policy-section__text">
            أهلاً بك في {siteName}. باستخدامك لمنصتنا، فإنك توافق على الامتثال لهذه الشروط والأحكام. إذا كنت لا توافق على أي جزء من هذه الشروط، يرجى عدم استخدام خدماتنا.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">2. حساب المستخدم</h3>
          <p className="policy-section__text">
            أنت مسؤول عن الحفاظ على سرية حسابك وكلمة المرور وتقييد الوصول إلى جهاز الكمبيوتر الخاص بك أو جهازك الذكي، وتوافق على قبول المسؤولية عن جميع الأنشطة التي تحدث تحت حسابك.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">3. البيع والشراء</h3>
          <p className="policy-section__text">
            يوفر {siteName} منصة تتيح للمستخدمين (البائعين والمشترين) التفاعل وإجراء المعاملات التجارية. نحن لا نملك المنتجات المعروضة إلا في الحالات التي يُنص عليها صراحة. البائع هو المسؤول الوحيد عن المنتجات المقدمة.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">4. الاسترجاع والاسترداد</h3>
          <p className="policy-section__text">
            تخضع جميع عمليات الاسترجاع والاسترداد لسياسة الإرجاع الخاصة بنا. بشكل عام، يحق للعميل إرجاع المنتج خلال 14 يوماً من تاريخ الاستلام طالما أنه بحالته الأصلية.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">5. التعديلات على الشروط</h3>
          <p className="policy-section__text">
            يحتفظ {siteName} بالحق في تحديث أو تعديل هذه الشروط في أي وقت دون إشعار مسبق. يُعد استمرارك في استخدام المنصة بعد أي تغييرات بمثابة قبول لهذه التغييرات.
          </p>
        </div>
      </div>
    </div>
  );
}
