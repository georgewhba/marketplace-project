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
        const result: any = await googleAuth(credentialResponse.credential);
        if (result?.requiresMfa) {
          setShowMfa(true);
          setTempToken(result.tempToken || '');
          toast.success(lang === 'ar' ? 'يرجى إدخال رمز التحقق الثنائي' : 'Please enter your 2FA code');
        } else {
          toast.success(lang === 'ar' ? 'تم تسجيل الدخول عبر جوجل بنجاح' : 'Signed in with Google');
          navigate('/');
        }
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
              <div style={{ marginBottom: 'var(--space-5)', display: 'flex', justifyContent: 'center' }}>
                {(window.ENV?.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '').endsWith('.apps.googleusercontent.com') ? (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('Google Sign-In failed')}
                    text="signin_with"
                    theme="outline"
                  />
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
                    disabled={loading}
                    onClick={() => {
                      const payload = btoa(encodeURIComponent(JSON.stringify({ email: email || 'omar@example.com' })).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
                      handleGoogleSuccess({ credential: `demo_google_oauth:${payload}` });
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                    </svg>
                    <span>{lang === 'ar' ? 'تسجيل الدخول بواسطة Google' : 'Sign in with Google'}</span>
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-5)', gap: 'var(--space-4)' }}>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>{lang === 'ar' ? 'أو' : 'OR'}</span>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
              </div>

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
