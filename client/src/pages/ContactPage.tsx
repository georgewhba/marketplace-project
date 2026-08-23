import { Mail, Phone, MapPin } from 'lucide-react';

export default function ContactPage() {
  return (
    <div className="container" style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1 className="page-header__title mb-6">تواصل معنا</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card p-6">
          <h2 className="mb-4 font-bold text-lg">معلومات الاتصال</h2>
          <p className="mb-6 text-secondary">
            نحن هنا لمساعدتك والإجابة على استفساراتك. لا تتردد في التواصل معنا عبر القنوات التالية:
          </p>
          
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-brand-50 p-3 rounded-full text-brand-600">
                <Phone size={20} />
              </div>
              <div>
                <div className="font-semibold">رقم الهاتف</div>
                <div className="text-secondary" dir="ltr">+20 100 123 4567</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-brand-50 p-3 rounded-full text-brand-600">
                <Mail size={20} />
              </div>
              <div>
                <div className="font-semibold">البريد الإلكتروني</div>
                <div className="text-secondary">support@souqmasr.com</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-brand-50 p-3 rounded-full text-brand-600">
                <MapPin size={20} />
              </div>
              <div>
                <div className="font-semibold">العنوان</div>
                <div className="text-secondary">القاهرة، مدينة نصر، شارع مكرم عبيد</div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card p-6">
          <h2 className="mb-4 font-bold text-lg">أرسل رسالة</h2>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.'); }}>
            <div>
              <label className="block mb-2 text-sm">الاسم الكريم</label>
              <input type="text" className="input w-full" placeholder="أدخل اسمك" required />
            </div>
            <div>
              <label className="block mb-2 text-sm">البريد الإلكتروني</label>
              <input type="email" className="input w-full" placeholder="أدخل بريدك الإلكتروني" required />
            </div>
            <div>
              <label className="block mb-2 text-sm">موضوع الرسالة</label>
              <input type="text" className="input w-full" placeholder="موضوع الاستفسار" required />
            </div>
            <div>
              <label className="block mb-2 text-sm">الرسالة</label>
              <textarea className="input w-full" rows={4} placeholder="اكتب رسالتك هنا..." required></textarea>
            </div>
            <button type="submit" className="btn btn-primary w-full">إرسال الرسالة</button>
          </form>
        </div>
      </div>
    </div>
  );
}
