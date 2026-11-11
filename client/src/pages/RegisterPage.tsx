import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useSiteName } from '../hooks/useSiteSettings';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useToast } from '../toast';
import { GoogleLogin } from '@react-oauth/google';

import { ArrowRight, ArrowLeft, Mail } from 'lucide-react';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { useLanguage } from '../i18n';

export default function RegisterPage() {
  const { isRTL } = useLanguage();
  const BackArrow = isRTL ? ArrowRight : ArrowLeft;
  const { pathname } = useLocation();
  const isVendor = pathname.includes('/vendor');
  useDocumentTitle(isVendor ? 'انضم كبائع جديد' : 'إنشاء حساب جديد', { canonicalPath: '/register' });
  const { register, registerVendor, verifyOtp, googleAuth } = useAuth();
  const siteName = useSiteName();
  const toast = useToast();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', password: '',
    phone: '', storeName: '', storeDescription: '',
  });

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer: any;
    if (countdown > 0 && step === 'otp') {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown, step]);

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      if (credentialResponse.credential) {
        if (isVendor) {
          if (!form.storeName) {
            toast.error('يرجى إدخال اسم المتجر أولاً قبل التسجيل بواسطة Google');
            return;
          }
          await googleAuth(credentialResponse.credential, {
            storeName: form.storeName,
            storeDescription: form.storeDescription,
          });
          toast.success('تم تسجيل متجرك بواسطة Google — في انتظار الموافقة');
          navigate('/');
        } else {
          await googleAuth(credentialResponse.credential);
          toast.success('تم التسجيل بواسطة Google بنجاح');
          navigate('/');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل التسجيل بواسطة Google');
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    try {
      if (isVendor) {
        const result = (await registerVendor(form)) as any;
        setStep('otp');
        setCountdown(120);
        toast.success(result?.message || 'تم إعادة إرسال رمز التحقق');
      } else {
        const { storeName, storeDescription, ...userData } = form;
        const result = await register(userData);
        setStep('otp');
        setCountdown(120);
        toast.success(result?.message || 'تم إعادة إرسال رمز التحقق');
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل إعادة الإرسال');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (step === 'details') {
        if (isVendor) {
          const result = (await registerVendor(form)) as any;
          if (result?.requiresOtp) {
            setStep('otp');
            setCountdown(120);
            toast.success(result?.message || 'تم إرسال رمز التحقق');
          } else {
            toast.success('تم تسجيل متجرك — في انتظار الموافقة');
            navigate('/');
          }
        } else {
          const { storeName, storeDescription, ...userData } = form;
          const result = await register(userData);
          if (result?.requiresOtp) {
            setStep('otp');
            setCountdown(120);
            toast.success(result.message || 'تم إرسال رمز التحقق');
          } else {
            toast.success('تم إنشاء الحساب بنجاح');
            navigate('/');
          }
        }
      } else if (step === 'otp') {
        if (!otp) return toast.error('يرجى إدخال رمز التحقق');
        await verifyOtp(form.email, otp);
        toast.success('تم تفعيل الحساب بنجاح');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل العملية');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
      <div className="auth-card" style={{ maxWidth: isVendor ? 520 : 440 }}>
        <div className="auth-card__logo">
          <img src="/favicon.svg" alt={siteName} width="40" height="40" />
        </div>
        <h1 className="auth-card__title">
          {step === 'otp' ? 'تحقق من بريدك الإلكتروني' : (isVendor ? `ابدأ البيع على ${siteName}` : `انضم إلى ${siteName}`)}
        </h1>
        <p className="auth-card__subtitle">
          {step === 'otp'
            ? `لقد أرسلنا رمز تحقق إلى ${form.email}`
            : (isVendor ? 'أنشئ متجرك وابدأ بعرض منتجاتك لآلاف العملاء' : 'أنشئ حسابك مجاناً واستمتع بتجربة تسوق آمنة وسريعة')}
        </p>

        <form onSubmit={handleSubmit}>
          {step === 'details' ? (
            <>
              <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
                {(window.ENV?.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID || '').endsWith('.apps.googleusercontent.com') ? (
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error('فشل التسجيل بواسطة Google')}
                    text="signup_with"
                    theme="outline"
                  />
                ) : (
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}
                    disabled={loading}
                    onClick={() => {
                      const info = {
                        email: form.email || undefined,
                        firstName: form.firstName || undefined,
                        lastName: form.lastName || undefined,
                      };
                      const payload = btoa(encodeURIComponent(JSON.stringify(info)).replace(/%([0-9A-F]{2})/g, (_, p1) => String.fromCharCode(parseInt(p1, 16))));
                      handleGoogleSuccess({ credential: `demo_google_oauth:${payload}` });
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                    </svg>
                    <span>التسجيل بواسطة Google</span>
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>أو</span>
                <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
              </div>

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
            </>
          ) : (
            <div className="form-group mb-6" style={{ textAlign: 'center' }}>
              <Mail size={48} style={{ color: 'var(--primary)', margin: '0 auto var(--space-4)' }} />
              <label className="form-label" style={{ textAlign: 'center' }}>أدخل الرمز المكون من 6 أرقام</label>
              <input
                type="text"
                className="form-input"
                dir="ltr"
                style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.25rem', padding: 'var(--space-3)' }}
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                placeholder="000000"
              />
              <div style={{ marginTop: 'var(--space-4)', fontSize: 'var(--font-size-sm)', color: countdown > 0 ? 'var(--text-color)' : 'var(--danger)' }}>
                {countdown > 0 ? (
                  <span>صلاحية الرمز تنتهي خلال: {formatTime(countdown)}</span>
                ) : (
                  <span>
                    انتهت صلاحية الرمز.{' '}
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={loading}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      إعادة إرسال
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%', marginBottom: 'var(--space-4)' }} disabled={loading || (step === 'otp' && countdown === 0)}>
            {loading ? 'الرجاء الانتظار...' : (step === 'otp' ? 'تحقق' : (isVendor ? 'سجّل متجرك' : 'إنشاء حساب'))}
          </button>

          {step === 'details' && (
            <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', textAlign: 'center' }}>
              بإنشائك للحساب، أنت توافق على <Link to="/terms" style={{ textDecoration: 'underline' }}>شروط الاستخدام</Link> و <Link to="/privacy" style={{ textDecoration: 'underline' }}>سياسة الخصوصية</Link> الخاصة بنا.
            </p>
          )}
        </form>

        {step === 'details' && (
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
        )}
      </div>
    </div>
  );
}
