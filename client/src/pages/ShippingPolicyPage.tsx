export default function ShippingPolicyPage() {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-header__title mb-6">الشحن والتوصيل</h1>
      <div className="card p-6">
        <p className="mb-4">نسعى في سوق مصر لتوفير أفضل تجربة شحن لتصلك مشترياتك في أسرع وقت ممكن.</p>
        
        <h2 className="mb-2 font-bold mt-6">مناطق التغطية</h2>
        <p className="mb-4 text-secondary">
          نوفر خدمات الشحن إلى جميع محافظات جمهورية مصر العربية من خلال شركائنا الموثوقين في خدمات التوصيل.
        </p>
        
        <h2 className="mb-2 font-bold mt-6">مدة التوصيل</h2>
        <p className="mb-4 text-secondary">
          تستغرق عملية التوصيل داخل القاهرة والجيزة من يوم إلى 3 أيام عمل. أما لباقي المحافظات، فتستغرق من 3 إلى 7 أيام عمل حسب البعد الجغرافي.
        </p>

        <h2 className="mb-2 font-bold mt-6">رسوم الشحن</h2>
        <p className="mb-4 text-secondary">
          يتم احتساب رسوم الشحن بناءً على وزن الطلب وموقع التوصيل، وسيتم عرض قيمة الشحن بوضوح أثناء عملية إتمام الدفع قبل تأكيد الطلب.
        </p>
      </div>
    </div>
  );
}
