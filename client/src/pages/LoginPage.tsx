import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useSiteName } from '../hooks/useSiteSettings';
import { useToast } from '../toast';
import { GoogleLogin } from '@react-oauth/google';

import { ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const { login, mfaLogin, googleAuth } = useAuth();
  const siteName = useSiteName();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [showMfa, setShowMfa] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        await googleAuth(credentialResponse.credential);
        toast.success('تم تسجيل الدخول بواسطة Google بنجاح');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدخول بواسطة Google');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (showMfa) {
        await mfaLogin(tempToken, mfaToken);
        toast.success('تم تسجيل الدخول بنجاح');
        navigate('/');
      } else {
        const result = await login(email, password);
        if (result?.requiresMfa) {
          setShowMfa(true);
          setTempToken(result.tempToken);
          toast.success('يرجى إدخال رمز التحقق (MFA)');
        } else {
          toast.success('تم تسجيل الدخول بنجاح');
          navigate('/');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدخول');
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
      <div className="auth-card">
        <h1 className="auth-card__title">تسجيل الدخول</h1>
        <p className="auth-card__subtitle">أهلاً بك في {siteName}</p>

        <form onSubmit={handleSubmit}>
          {showMfa ? (
            <div className="form-group mb-4">
              <label className="form-label">رمز التحقق (Authenticator App)</label>
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
              <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => toast.error('فشل تسجيل الدخول بواسطة Google')}
                  text="signin_with"
                  theme="outline"
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>أو</span>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">البريد الإلكتروني</label>
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

              <div className="form-group mb-4">
                <label className="form-label">كلمة المرور</label>
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
            {loading ? 'جارٍ التسجيل...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--font-size-sm)' }}>
          <p className="text-muted">
            ليس لديك حساب؟{' '}
            <Link to="/register">إنشاء حساب</Link>
          </p>
          <p className="text-muted" style={{ marginTop: 'var(--space-2)' }}>
            هل أنت بائع؟{' '}
            <Link to="/register/vendor">سجّل متجرك</Link>
          </p>
        </div>


      </div>
    </div>
  );
}
