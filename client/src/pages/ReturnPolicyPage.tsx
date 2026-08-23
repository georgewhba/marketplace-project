export default function ReturnPolicyPage() {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-header__title mb-6">سياسة الإرجاع</h1>
      <div className="card p-6">
        <p className="mb-4">نسعى دائماً لرضاكم. إذا لم تكن راضياً عن مشترياتك، يمكنك إرجاعها وفقاً للشروط التالية:</p>
        
        <h2 className="mb-2 font-bold mt-6">مدة الإرجاع</h2>
        <p className="mb-4 text-secondary">
          يمكنك إرجاع المنتجات خلال 14 يوماً من تاريخ استلام الطلب.
        </p>
        
        <h2 className="mb-2 font-bold mt-6">شروط الإرجاع</h2>
        <p className="mb-4 text-secondary">
          يجب أن يكون المنتج في حالته الأصلية، غير مستخدم، وبكافة ملحقاته وتغليفه الأصلي. بعض المنتجات مثل الملابس الداخلية والمنتجات القابلة للتلف لا يمكن إرجاعها لأسباب صحية.
        </p>

        <h2 className="mb-2 font-bold mt-6">كيفية الاسترداد</h2>
        <p className="mb-4 text-secondary">
          بمجرد استلامنا للمنتج المرتجع وفحصه، سيتم إرجاع المبلغ إلى نفس وسيلة الدفع التي استخدمتها خلال 5 إلى 10 أيام عمل.
        </p>
      </div>
    </div>
  );
}
