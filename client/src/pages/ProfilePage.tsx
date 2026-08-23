import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { authApi } from '../api';
import { useToast } from '../toast';
import { User, Mail, Phone, Lock, Save, Shield } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  
  // MFA state
  const [mfaSetup, setMfaSetup] = useState<any>(null);
  const [mfaToken, setMfaToken] = useState('');

  useEffect(() => {
    if (user) {
      setForm({ firstName: user.firstName, lastName: user.lastName, phone: (user as any).phone ?? '' });
    }
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: () => authApi.updateProfile(form),
    onSuccess: () => {
      addToast('تم تحديث البيانات', 'success');
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const passwordMutation = useMutation({
    mutationFn: () => {
      if (pwForm.newPassword !== pwForm.confirmPassword) throw new Error('كلمتا المرور غير متطابقتين');
      return authApi.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
    },
    onSuccess: () => {
      addToast('تم تغيير كلمة المرور', 'success');
      setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
    onError: (err: Error) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  const setupMfaMutation = useMutation({
    mutationFn: () => authApi.setupMfa(),
    onSuccess: (data) => {
      setMfaSetup(data);
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ في إعداد المصادقة', 'error'),
  });

  const verifyMfaMutation = useMutation({
    mutationFn: () => authApi.verifyMfa(mfaToken),
    onSuccess: () => {
      addToast('تم تفعيل المصادقة الثنائية بنجاح', 'success');
      setMfaSetup(null);
      setMfaToken('');
      // Force refresh user to update mfaEnabled flag
      window.dispatchEvent(new Event('auth:refresh'));
      window.location.reload();
    },
    onError: (err: any) => addToast(err.message || 'رمز التحقق غير صحيح', 'error'),
  });

  const disableMfaMutation = useMutation({
    mutationFn: () => authApi.disableMfa(mfaToken),
    onSuccess: () => {
      addToast('تم تعطيل المصادقة الثنائية بنجاح', 'success');
      setMfaToken('');
      window.location.reload();
    },
    onError: (err: any) => addToast(err.message || 'رمز التحقق غير صحيح', 'error'),
  });

  return (
    <div className="container page-content" style={{ maxWidth: 600, margin: '0 auto', padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xl)', fontWeight: 700 }}>
          {user?.firstName?.[0] ?? '?'}
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: 'var(--text-xl)' }}>حسابي</h1>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>{user?.email}</p>
        </div>
      </div>

      {/* Profile Info */}
      <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
          <User size={18} color="var(--primary-500)" /> المعلومات الشخصية
        </h3>
        <form onSubmit={e => { e.preventDefault(); updateMutation.mutate(); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">الاسم الأول</label>
              <input className="input" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">اسم العائلة</label>
              <input className="input" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label"><Phone size={14} style={{ marginLeft: 4 }} />رقم الهاتف</label>
            <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="01XXXXXXXXX" />
          </div>
          <div className="form-group">
            <label className="form-label"><Mail size={14} style={{ marginLeft: 4 }} />البريد الإلكتروني</label>
            <input className="input" value={user?.email ?? ''} disabled style={{ opacity: 0.6 }} />
          </div>
          <button className="btn btn--primary" type="submit" disabled={updateMutation.isPending} style={{ width: '100%' }}>
            <Save size={16} /> {updateMutation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
        </form>
      </div>

      {/* Change Password */}
      <div className="card" style={{ padding: 'var(--space-5)' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
          <Lock size={18} color="var(--primary-500)" /> تغيير كلمة المرور
        </h3>
        <form onSubmit={e => { e.preventDefault(); passwordMutation.mutate(); }}>
          <div className="form-group">
            <label className="form-label">كلمة المرور الحالية</label>
            <input className="input" type="password" value={pwForm.currentPassword} onChange={e => setPwForm(f => ({ ...f, currentPassword: e.target.value }))} required />
          </div>
          <div className="form-group">
            <label className="form-label">كلمة المرور الجديدة</label>
            <input className="input" type="password" value={pwForm.newPassword} onChange={e => setPwForm(f => ({ ...f, newPassword: e.target.value }))} required minLength={8} />
          </div>
          <div className="form-group">
            <label className="form-label">تأكيد كلمة المرور</label>
            <input className="input" type="password" value={pwForm.confirmPassword} onChange={e => setPwForm(f => ({ ...f, confirmPassword: e.target.value }))} required />
          </div>
          <button className="btn btn--outline" type="submit" disabled={passwordMutation.isPending} style={{ width: '100%' }}>
            <Lock size={16} /> {passwordMutation.isPending ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
          </button>
        </form>
      </div>

      {/* Two-Factor Authentication (MFA) */}
      <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
        <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
          <Shield size={18} color="var(--primary-500)" /> المصادقة الثنائية (2FA)
        </h3>
        
        {user?.mfaEnabled ? (
          <div>
            <p style={{ color: 'var(--success-600)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>
              المصادقة الثنائية مفعلة حالياً لحسابك.
            </p>
            <div className="form-group">
              <label className="form-label">رمز التحقق لتعطيل المصادقة</label>
              <input 
                className="input" 
                type="text" 
                value={mfaToken} 
                onChange={e => setMfaToken(e.target.value)} 
                placeholder="123456" 
                style={{ textAlign: 'center', letterSpacing: '0.2em' }} 
              />
            </div>
            <button 
              className="btn btn--danger" 
              onClick={() => disableMfaMutation.mutate()} 
              disabled={disableMfaMutation.isPending || mfaToken.length < 6}
            >
              {disableMfaMutation.isPending ? 'جاري التعطيل...' : 'تعطيل المصادقة الثنائية'}
            </button>
          </div>
        ) : (
          <div>
            <p style={{ marginBottom: 'var(--space-4)' }}>
              أضف طبقة حماية إضافية لحسابك باستخدام تطبيق مصادقة (مثل Google Authenticator).
            </p>
            
            {!mfaSetup ? (
              <button 
                className="btn btn--outline" 
                onClick={() => setupMfaMutation.mutate()} 
                disabled={setupMfaMutation.isPending}
              >
                {setupMfaMutation.isPending ? 'جاري الإعداد...' : 'إعداد المصادقة الثنائية'}
              </button>
            ) : (
              <div style={{ background: 'var(--neutral-50)', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>1. قم بمسح رمز الاستجابة السريعة (QR Code):</p>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-4)', background: '#fff', padding: 'var(--space-4)', borderRadius: 'var(--radius-md)' }}>
                  <img src={mfaSetup.qrCodeUrl} alt="MFA QR Code" style={{ maxWidth: '100%', height: 'auto' }} />
                </div>
                
                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>2. أو أدخل الرمز السري يدوياً:</p>
                <code style={{ display: 'block', padding: 'var(--space-3)', background: '#fff', borderRadius: 'var(--radius-md)', textAlign: 'center', letterSpacing: '0.1em', marginBottom: 'var(--space-4)' }}>
                  {mfaSetup.secret}
                </code>

                <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>3. أدخل الرمز المكون من 6 أرقام للتفعيل:</p>
                <div className="form-group" style={{ marginBottom: 'var(--space-3)' }}>
                  <input 
                    className="input" 
                    type="text" 
                    value={mfaToken} 
                    onChange={e => setMfaToken(e.target.value)} 
                    placeholder="123456" 
                    style={{ textAlign: 'center', letterSpacing: '0.2em', fontSize: '1.2rem' }} 
                  />
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button 
                    className="btn btn--primary" 
                    onClick={() => verifyMfaMutation.mutate()} 
                    disabled={verifyMfaMutation.isPending || mfaToken.length < 6}
                    style={{ flex: 1 }}
                  >
                    {verifyMfaMutation.isPending ? 'جاري التفعيل...' : 'تفعيل المصادقة'}
                  </button>
                  <button 
                    className="btn btn--outline" 
                    onClick={() => setMfaSetup(null)}
                    style={{ flex: 1 }}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <NotificationPreferences />
    </div>
  );
}

function NotificationPreferences() {
  const { addToast } = useToast();
  
  const { data: prefs, isLoading, refetch } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => authApi.getNotificationPreferences().then(res => res.data)
  });

  const updatePrefMutation = useMutation({
    mutationFn: (data: { category: string; channel: string; enabled: boolean }) => 
      authApi.updateNotificationPreference(data),
    onSuccess: () => {
      addToast('تم تحديث التفضيلات', 'success');
      refetch();
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const categories = [
    { id: 'order_updates', label: 'تحديثات الطلبات' },
    { id: 'promotions', label: 'العروض والخصومات' },
    { id: 'stock_alerts', label: 'تنبيهات المخزون' },
    { id: 'system', label: 'إشعارات النظام' }
  ];

  const channels = [
    { id: 'email', label: 'البريد الإلكتروني' },
    { id: 'sms', label: 'الرسائل النصية' },
    { id: 'in_app', label: 'إشعارات التطبيق' }
  ];

  if (isLoading) return <div>جاري تحميل التفضيلات...</div>;

  // Find if a pref exists and is enabled (or true by default if not set)
  const isEnabled = (cat: string, chan: string) => {
    const pref = prefs?.find((p: any) => p.category === cat && p.channel === chan);
    if (pref) return pref.enabled;
    if (cat === 'promotions' && chan === 'sms') return false; // Default off for expensive channels
    return true; 
  };

  return (
    <div className="card" style={{ padding: 'var(--space-5)', marginTop: 'var(--space-4)' }}>
      <h3 style={{ marginTop: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-base)', fontWeight: 600 }}>
        تفضيلات الإشعارات
      </h3>
      
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'var(--space-4)' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'right', padding: 'var(--space-2)', borderBottom: '1px solid var(--neutral-200)' }}>النوع</th>
              {channels.map(chan => (
                <th key={chan.id} style={{ textAlign: 'center', padding: 'var(--space-2)', borderBottom: '1px solid var(--neutral-200)' }}>{chan.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categories.map(cat => (
              <tr key={cat.id}>
                <td style={{ padding: 'var(--space-3) var(--space-2)', borderBottom: '1px solid var(--neutral-100)' }}>
                  {cat.label}
                </td>
                {channels.map(chan => (
                  <td key={chan.id} style={{ textAlign: 'center', padding: 'var(--space-3) var(--space-2)', borderBottom: '1px solid var(--neutral-100)' }}>
                    <input 
                      type="checkbox" 
                      checked={isEnabled(cat.id, chan.id)} 
                      onChange={(e) => updatePrefMutation.mutate({ category: cat.id, channel: chan.id, enabled: e.target.checked })}
                      disabled={updatePrefMutation.isPending}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
