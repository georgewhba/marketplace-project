export default function PrivacyPage() {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-header__title mb-6">سياسة الخصوصية</h1>
      <div className="card p-6">
        <p className="mb-4">نحن في سوق مصر نهتم بخصوصيتك. توضح هذه السياسة كيف نقوم بجمع واستخدام وحماية معلوماتك الشخصية.</p>
        
        <h2 className="mb-2 font-bold mt-6">1. جمع المعلومات</h2>
        <p className="mb-4 text-secondary">
          نقوم بجمع المعلومات التي تقدمها عند التسجيل، وعند إجراء عمليات الشراء، وعند تصفحك لمنصتنا، بما في ذلك اسمك وبريدك الإلكتروني ورقم هاتفك وعنوان الشحن.
        </p>
        
        <h2 className="mb-2 font-bold mt-6">2. استخدام المعلومات</h2>
        <p className="mb-4 text-secondary">
          تُستخدم معلوماتك لمعالجة الطلبات، وتحسين تجربتك على المنصة، وللتواصل معك بشأن تحديثات طلبك أو العروض الجديدة.
        </p>

        <h2 className="mb-2 font-bold mt-6">3. حماية البيانات</h2>
        <p className="mb-4 text-secondary">
          نحن نستخدم تقنيات التشفير المتقدمة لحماية بياناتك من الوصول غير المصرح به. نحن لا نشارك معلوماتك مع جهات خارجية إلا لإتمام عمليات الشحن والدفع الخاصة بك.
        </p>
      </div>
    </div>
  );
}
