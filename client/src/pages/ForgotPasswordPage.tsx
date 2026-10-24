import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api';
import { useToast } from '../toast';
import { useLanguage } from '../i18n';
import { useSiteName } from '../hooks/useSiteSettings';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ArrowRight, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const { isRTL } = useLanguage();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const siteName = useSiteName();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
      toast.success('تم إرسال رابط استعادة كلمة المرور إذا كان البريد مسجلاً لدينا');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-top-bar">
        <Link to="/" className="auth-back-btn">
          <BackArrow size={18} />
          <span>العودة للمتجر</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="auth-card">
        <div className="auth-card__logo">
          <img src="/favicon.svg" alt={siteName} width="40" height="40" />
        </div>
        <h1 className="auth-card__title">نسيت كلمة المرور</h1>
        <p className="auth-card__subtitle">
          أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
        </p>

        {success ? (
          <div className="card card-body text-center mb-6" style={{ background: 'var(--brand-50)', borderColor: 'var(--brand-200)', color: 'var(--brand-700)' }}>
            <Mail size={32} style={{ margin: '0 auto var(--space-3)', color: 'var(--brand-500)' }} />
            <p className="font-semibold m-0">تم إرسال الرابط بنجاح. يرجى التحقق من بريدك الإلكتروني.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="form-group mb-5">
              <label className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                dir="ltr"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading || !email}
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center" style={{ fontSize: 'var(--font-size-sm)' }}>
          <Link to="/login" className="font-semibold">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
