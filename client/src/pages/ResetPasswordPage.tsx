import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api';
import { useToast } from '../toast';
import { useLanguage } from '../i18n';
import { useSiteName } from '../hooks/useSiteSettings';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { ArrowRight, ArrowLeft } from 'lucide-react';

export default function ResetPasswordPage() {
  const { isRTL } = useLanguage();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const siteName = useSiteName();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error('رابط غير صالح');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('كلمات المرور غير متطابقة');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword({ token, password });
      toast.success('تم إعادة تعيين كلمة المرور بنجاح. يرجى تسجيل الدخول');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.message || 'فشل في إعادة تعيين كلمة المرور');
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

      {!token ? (
        <div className="auth-card text-center">
          <div className="auth-card__logo">
            <img src="/favicon.svg" alt={siteName} width="40" height="40" />
          </div>
          <h1 className="auth-card__title">رابط غير صالح</h1>
          <p className="auth-card__subtitle">الرابط الذي تحاول استخدامه غير صالح أو انتهت صلاحيته.</p>
          <Link to="/forgot-password" className="btn btn-primary btn-lg w-full">طلب رابط جديد</Link>
        </div>
      ) : (
        <div className="auth-card">
          <div className="auth-card__logo">
            <img src="/favicon.svg" alt={siteName} width="40" height="40" />
          </div>
          <h1 className="auth-card__title">إعادة تعيين كلمة المرور</h1>
          <p className="auth-card__subtitle">أدخل كلمة المرور الجديدة لحسابك</p>

          <form onSubmit={handleSubmit}>
            <div className="form-group mb-4">
              <label className="form-label">كلمة المرور الجديدة</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الجديدة"
                dir="ltr"
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            <div className="form-group mb-5">
              <label className="form-label">تأكيد كلمة المرور</label>
              <input
                type="password"
                className="form-input"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="تأكيد كلمة المرور الجديدة"
                dir="ltr"
                required
                disabled={loading}
                minLength={8}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={loading || !password || !confirmPassword}
            >
              {loading ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
