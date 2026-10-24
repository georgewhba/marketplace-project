import { Mail, Phone, MapPin, Send } from 'lucide-react';
import { useState } from 'react';
import { storeApi } from '../api';
import { useToast } from '../toast';

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await storeApi.sendContactMessage(formData);
      toast.success('تم إرسال رسالتك بنجاح. سنتواصل معك قريباً.');
      setFormData({ name: '', email: '', subject: '', message: '' });
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ أثناء الإرسال');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-content" style={{ maxWidth: 960 }}>
      <div className="page-header mb-6">
        <div>
          <h1 className="page-header__title">تواصل معنا</h1>
          <p className="page-header__subtitle">نحن هنا لمساعدتك والإجابة على استفساراتك في أي وقت</p>
        </div>
      </div>

      <div className="grid grid-2 gap-6">
        <div className="card card-body">
          <h2 className="mb-3 font-bold" style={{ fontSize: 'var(--font-size-lg)' }}>معلومات الاتصال</h2>
          <p className="mb-6 text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
            نحن هنا لمساعدتك والإجابة على استفساراتك. لا تتردد في التواصل معنا عبر القنوات التالية:
          </p>

          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="feature-card__icon">
                <Phone size={20} />
              </div>
              <div>
                <div className="font-semibold">رقم الهاتف</div>
                <div className="text-secondary ltr">+20 100 123 4567</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="feature-card__icon">
                <Mail size={20} />
              </div>
              <div>
                <div className="font-semibold">البريد الإلكتروني</div>
                <div className="text-secondary ltr">support@souqmasr.com</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="feature-card__icon">
                <MapPin size={20} />
              </div>
              <div>
                <div className="font-semibold">العنوان</div>
                <div className="text-secondary">القاهرة، مدينة نصر، شارع مكرم عبيد</div>
              </div>
            </div>
          </div>
        </div>

        <div className="card card-body">
          <h2 className="mb-4 font-bold" style={{ fontSize: 'var(--font-size-lg)' }}>أرسل رسالة</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">الاسم الكريم</label>
              <input
                type="text"
                className="form-input"
                placeholder="أدخل اسمك"
                required
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                className="form-input"
                placeholder="أدخل بريدك الإلكتروني"
                dir="ltr"
                required
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">موضوع الرسالة</label>
              <input
                type="text"
                className="form-input"
                placeholder="موضوع الاستفسار"
                required
                value={formData.subject}
                onChange={e => setFormData({ ...formData, subject: e.target.value })}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">الرسالة</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="اكتب رسالتك هنا..."
                required
                value={formData.message}
                onChange={e => setFormData({ ...formData, message: e.target.value })}
                disabled={loading}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-md w-full" disabled={loading}>
              <Send size={16} />
              {loading ? 'جاري الإرسال...' : 'إرسال الرسالة'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
