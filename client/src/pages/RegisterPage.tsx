import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useSiteName } from '../hooks/useSiteSettings';
import { useToast } from '../toast';
import { GoogleLogin } from '@react-oauth/google';

import { ArrowRight, Mail } from 'lucide-react';

export default function RegisterPage() {
  const { pathname } = window.location;
  const isVendor = pathname.includes('/vendor');
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
        await googleAuth(credentialResponse.credential);
        toast.success('تم التسجيل بواسطة Google بنجاح');
        navigate('/');
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل التسجيل بواسطة Google');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (step === 'details') {
        if (isVendor) {
          await registerVendor(form);
          toast.success('تم تسجيل متجرك — في انتظار الموافقة');
          navigate('/');
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
      <Link to="/" className="auth-back-btn">
        <ArrowRight size={18} />
        <span>العودة للمتجر</span>
      </Link>
      <div className="auth-card" style={{ maxWidth: isVendor ? 520 : 440 }}>
        <h1 className="auth-card__title">
          {step === 'otp' ? 'تحقق من بريدك الإلكتروني' : (isVendor ? `ابدأ البيع على ${siteName}` : `انضم إلى ${siteName}`)}
        </h1>
        <p className="auth-card__subtitle">
          {step === 'otp' 
            ? `لقد أرسلنا رمز تحقق إلى ${form.email}`
            : (isVendor ? 'ابدأ البيع على ' + siteName : 'انضم إلى ' + siteName)}
        </p>

        <form onSubmit={handleSubmit}>
          {step === 'details' ? (
            <>
              {!isVendor && (
                <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'center' }}>
                  {(window.ENV?.VITE_GOOGLE_CLIENT_ID || import.meta.env.VITE_GOOGLE_CLIENT_ID) ? (
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
                      style={{ width: '100%' }}
                      onClick={() => toast.error('زر جوجل معطّل: الرجاء إضافة VITE_GOOGLE_CLIENT_ID في إعدادات Railway')}
                    >
                      التسجيل بواسطة Google (غير مفعل)
                    </button>
                  )}
                </div>
              )}
              
              {!isVendor && (
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
                  <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--font-size-sm)' }}>أو</span>
                  <hr style={{ flex: 1, borderColor: 'var(--border-color)', margin: 0 }} />
                </div>
              )}

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
                  <span>انتهت صلاحية الرمز. <button type="button" onClick={() => { setStep('details'); handleSubmit(new Event('submit') as any); }} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}>إعادة إرسال</button></span>
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
