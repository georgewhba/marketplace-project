import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useSiteName } from '../hooks/useSiteSettings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../toast';
import { useLanguage } from '../i18n';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { GoogleLogin } from '@react-oauth/google';
import { ArrowRight, ArrowLeft, Shield, Store, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const { t, isRTL, lang } = useLanguage();
  useDocumentTitle(t('nav.login'), { canonicalPath: '/login' });
  const { login, mfaLogin, googleAuth } = useAuth();
  const rawSiteName = useSiteName();
  const siteName = lang === 'ar' ? rawSiteName : t('site.name');
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        await googleAuth(credentialResponse.credential);
        toast.success('Signed in with Google');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'Google Sign-In failed');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (showMfa) {
        await mfaLogin(tempToken, mfaToken);
        toast.success('Signed in');
        navigate('/');
      } else {
        const result = await login(email, password);
        if (result?.requiresMfa) {
          setShowMfa(true);
          setTempToken(result.tempToken);
          toast.success('Please enter your 2FA code');
        } else {
          toast.success(lang === 'ar' ? 'تم تسجيل الدخول بنجاح' : 'Signed in successfully');
          navigate('/');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
  };

  return (
    <div className="auth-page">
      <div className="auth-top-bar">
        <Link to="/" className="auth-back-btn">
          <BackArrow size={18} />
          <span>{t('auth.backToStore')}</span>
        </Link>
        <LanguageSwitcher />
      </div>

      <div className="auth-card">
        <div className="auth-card__logo">
          <img src="/favicon.svg" alt={siteName} width="40" height="40" />
        </div>
        <h1 className="auth-card__title">{t('auth.loginTitle')}</h1>
        <p className="auth-card__subtitle">{t('auth.loginSubtitle')}</p>

        {/* Quick Demo Account Pills */}
        {!showMfa && (
          <div className="auth-demo-box">
            <span className="auth-demo-box__label">
              {lang === 'ar' ? 'تجربة سريعة بنقرة واحدة:' : 'One-Click Demo Access:'}
            </span>
            <div className="auth-demo-box__btns">
              <button
                type="button"
                onClick={() => fillDemo('omar@example.com', 'Customer@123456')}
                className="auth-demo-pill"
              >
                <UserCheck size={13} /> {lang === 'ar' ? 'عميل' : 'Customer'}
              </button>
              <button
                type="button"
                onClick={() => fillDemo('sony@marketplace.com', 'Vendor@123456')}
                className="auth-demo-pill"
              >
                <Store size={13} /> {lang === 'ar' ? 'بائع' : 'Vendor'}
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin@marketplace.com', 'Admin@123456')}
                className="auth-demo-pill"
              >
                <Shield size={13} /> {lang === 'ar' ? 'أدمن' : 'Admin'}
              </button>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {showMfa ? (
            <div className="form-group mb-4">
              <label className="form-label">Authenticator Code (MFA)</label>
              <input
                type="text"
                className="form-input"
                value={mfaToken}
                onChange={(e) => setMfaToken(e.target.value)}
                placeholder="123456"
                required
                dir="ltr"
                style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.2rem' }}
              />
            </div>
          ) : (
            <>
              {(window.ENV?.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID) && (
                <>
                  <div style={{ marginBottom: 'var(--space-5)', display: 'flex', justifyContent: 'center' }}>
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => toast.error('Google Sign-In failed')}
                      text="signin_with"
                      theme="outline"
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-5)', gap: 'var(--space-4)' }}>
                    <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
                    <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>•</span>
                    <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
                  </div>
                </>
              )}

              <div className="form-group mb-4">
                <label className="form-label">{t('auth.email')}</label>
                <input
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com"
                  required
                  dir="ltr"
                />
              </div>

              <div className="form-group mb-5">
                <div className="flex justify-between items-center">
                  <label className="form-label">{t('auth.password')}</label>
                  <Link to="/forgot-password" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <input
                  type="password"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  dir="ltr"
                />
              </div>
            </>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
            {loading ? t('auth.loggingIn') : t('auth.loginBtn')}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
          <p className="text-muted">
            {t('auth.noAccount')}{' '}
            <Link to="/register" style={{ fontWeight: 600 }}>{t('auth.createAccount')}</Link>
          </p>
          <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
            {t('auth.wantToSell')}{' '}
            <Link to="/register/vendor" style={{ fontWeight: 600 }}>{t('auth.registerStore')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
