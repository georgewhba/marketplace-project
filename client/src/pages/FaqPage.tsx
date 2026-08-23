export default function FaqPage() {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-header__title mb-6">الأسئلة الشائعة</h1>
      <div className="card p-6">
        
        <h2 className="mb-2 font-bold mt-4 text-lg">كيف يمكنني تتبع طلبي؟</h2>
        <p className="mb-6 text-secondary pb-4 border-b border-gray-100">
          يمكنك تتبع طلبك بالدخول إلى حسابك ثم التوجه إلى صفحة "طلباتي". ستجد هناك تفاصيل وحالة كل طلب قمت بإجرائه.
        </p>
        
        <h2 className="mb-2 font-bold mt-4 text-lg">ما هي طرق الدفع المتاحة؟</h2>
        <p className="mb-6 text-secondary pb-4 border-b border-gray-100">
          نحن نقبل الدفع عبر البطاقات الائتمانية (فيزا، ماستركارد)، الدفع عند الاستلام (كاش)، والمحافظ الإلكترونية المختارة.
        </p>

        <h2 className="mb-2 font-bold mt-4 text-lg">هل يمكنني تعديل الطلب بعد تأكيده؟</h2>
        <p className="mb-6 text-secondary pb-4 border-b border-gray-100">
          يمكنك إلغاء أو تعديل الطلب فقط إذا كانت حالته "قيد المراجعة". بمجرد تغيير حالة الطلب إلى "جاري التجهيز" أو "تم الشحن"، لن تتمكن من تعديله.
        </p>
        
        <h2 className="mb-2 font-bold mt-4 text-lg">كيف يمكنني البيع على المنصة؟</h2>
        <p className="mb-4 text-secondary">
          يمكنك الانضمام كبائع من خلال الضغط على رابط "سجّل متجرك" أسفل الصفحة وتعبئة نموذج التسجيل. سيقوم فريقنا بمراجعة طلبك والتواصل معك.
        </p>

      </div>
    </div>
  );
}
