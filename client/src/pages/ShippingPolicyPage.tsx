import { useSiteName } from '../hooks/useSiteSettings';
import { Truck } from 'lucide-react';

export default function ShippingPolicyPage() {
  const siteName = useSiteName();
  return (
    <div className="container page-content" style={{ maxWidth: 860 }}>
      <div className="page-header mb-6">
        <div>
          <h1 className="page-header__title flex items-center gap-3">
            <Truck size={28} className="text-brand" />
            الشحن والتوصيل
          </h1>
          <p className="page-header__subtitle">نسعى في {siteName} لتوفير أفضل تجربة شحن لتصلك مشترياتك في أسرع وقت ممكن.</p>
        </div>
      </div>

      <div className="policy-card">
        <div className="policy-section">
          <h3 className="policy-section__title">مناطق التغطية</h3>
          <p className="policy-section__text">
            نوفر خدمات الشحن إلى جميع محافظات جمهورية مصر العربية من خلال شركائنا الموثوقين في خدمات التوصيل.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">مدة التوصيل</h3>
          <p className="policy-section__text">
            تستغرق عملية التوصيل داخل القاهرة والجيزة من يوم إلى 3 أيام عمل. أما لباقي المحافظات، فتستغرق من 3 إلى 7 أيام عمل حسب البعد الجغرافي.
          </p>
        </div>

        <div className="policy-section">
          <h3 className="policy-section__title">رسوم الشحن</h3>
          <p className="policy-section__text">
            يتم احتساب رسوم الشحن بناءً على وزن الطلب وموقع التوصيل، وسيتم عرض قيمة الشحن بوضوح أثناء عملية إتمام الدفع قبل تأكيد الطلب.
          </p>
        </div>
      </div>
    </div>
  );
}
