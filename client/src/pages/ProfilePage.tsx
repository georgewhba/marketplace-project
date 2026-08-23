import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../auth';
import { authApi } from '../api';
import { useToast } from '../toast';
import { User, Mail, Phone, Lock, Save } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const { addToast } = useToast();

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

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
    </div>
  );
}
