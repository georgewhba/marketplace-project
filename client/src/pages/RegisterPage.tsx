import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useSiteName } from '../hooks/useSiteSettings';
import { useToast } from '../toast';

import { ArrowRight } from 'lucide-react';

export default function RegisterPage() {
  const { pathname } = window.location;
  const isVendor = pathname.includes('/vendor');
  const { register, registerVendor } = useAuth();
  const siteName = useSiteName();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', storeName: '', storeDescription: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isVendor) {
        await registerVendor(form);
        toast.success('تم تسجيل متجرك — في انتظار الموافقة');
      } else {
        const { storeName, storeDescription, ...userData } = form;
        await register(userData);
        toast.success('تم إنشاء الحساب بنجاح');
      }
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'فشل التسجيل');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <Link to="/" className="auth-back-btn">
        <ArrowRight size={18} />
        <span>العودة للمتجر</span>
      </Link>
      <div className="auth-card" style={{ maxWidth: isVendor ? 520 : 440 }}>
        <h1 className="auth-card__title">{isVendor ? `ابدأ البيع على ${siteName}` : `انضم إلى ${siteName}`}</h1>
        <p className="auth-card__subtitle">
          {isVendor ? 'ابدأ البيع على ' + siteName : 'انضم إلى ' + siteName}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="flex gap-4 mb-4">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">الاسم الأول</label>
              <input className="form-input" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} required />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">اسم العائلة</label>
              <input className="form-input" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} required />
            </div>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">البريد الإلكتروني</label>
            <input type="email" className="form-input" dir="ltr" value={form.email} onChange={(e) => update('email', e.target.value)} required />
          </div>

          <div className="form-group mb-4">
            <label className="form-label">كلمة المرور</label>
            <input type="password" className="form-input" dir="ltr" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={8} />
            <span className="form-error" style={{ color: 'var(--text-muted)' }}>8 أحرف على الأقل، حرف كبير + صغير + رقم</span>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">رقم الهاتف (اختياري)</label>
            <input type="tel" className="form-input" dir="ltr" placeholder="01xxxxxxxxx" value={form.phone} onChange={(e) => update('phone', e.target.value)} />
          </div>

          {isVendor && (
            <>
              <hr className="divider" />
              <div className="form-group mb-4">
                <label className="form-label">اسم المتجر</label>
                <input className="form-input" value={form.storeName} onChange={(e) => update('storeName', e.target.value)} required />
              </div>
              <div className="form-group mb-4">
                <label className="form-label">وصف المتجر (اختياري)</label>
                <textarea className="form-textarea" value={form.storeDescription} onChange={(e) => update('storeDescription', e.target.value)} />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 'var(--space-4)' }} disabled={loading}>
            {loading ? 'جارٍ التسجيل...' : (isVendor ? 'سجّل متجرك' : 'إنشاء حساب')}
          </button>
          
          <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
            بإنشائك للحساب، أنت توافق على <Link to="/terms" style={{ textDecoration: 'underline' }}>شروط الاستخدام</Link> و <Link to="/privacy" style={{ textDecoration: 'underline' }}>سياسة الخصوصية</Link> الخاصة بنا.
          </p>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
          <p className="text-muted">
            لديك حساب بالفعل؟{' '}<Link to="/login">تسجيل الدخول</Link>
          </p>
          {!isVendor && (
            <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
              هل أنت بائع؟{' '}<Link to="/register/vendor">سجّل متجرك</Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
