export default function TermsPage() {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-header__title mb-6">شروط الاستخدام</h1>
      <div className="card p-6">
        <p className="mb-4">مرحباً بكم في سوق مصر. باستخدامك لمنصتنا، فإنك توافق على الشروط والأحكام التالية:</p>
        <h2 className="mb-2 font-bold mt-6">1. قبول الشروط</h2>
        <p className="mb-4 text-secondary">
          من خلال الوصول إلى الموقع أو استخدامه، فإنك توافق على الالتزام بهذه الشروط والأحكام، والتي تشكل اتفاقية ملزمة قانوناً.
        </p>
        
        <h2 className="mb-2 font-bold mt-6">2. حساب المستخدم</h2>
        <p className="mb-4 text-secondary">
          أنت مسؤول عن الحفاظ على سرية معلومات حسابك وكلمة المرور الخاصة بك. أي نشاط يحدث تحت حسابك هو مسؤوليتك الشخصية.
        </p>

        <h2 className="mb-2 font-bold mt-6">3. المنتجات والمبيعات</h2>
        <p className="mb-4 text-secondary">
          نحن نوفر منصة للبائعين والمشترين. نحن لا نتحمل المسؤولية المباشرة عن أي منتجات معروضة من قبل البائعين المستقلين إلا وفقاً لسياسة الإرجاع الخاصة بنا.
        </p>
      </div>
    </div>
  );
}
