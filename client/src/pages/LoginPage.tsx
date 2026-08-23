import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { useToast } from '../toast';

export default function LoginPage() {
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('تم تسجيل الدخول بنجاح');
      navigate('/');
    } catch (err: any) {
      toast.error(err.message || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1 className="auth-card__title">تسجيل الدخول</h1>
        <p className="auth-card__subtitle">أهلاً بك في سوق مصر</p>

        <form onSubmit={handleSubmit}>
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

          <div className="form-group mb-6">
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

        {/* Demo credentials */}
        <div style={{
          marginTop: 'var(--space-6)', padding: 'var(--space-4)',
          background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)',
          fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)',
        }}>
          <strong>حسابات تجريبية:</strong>
          <div style={{ marginTop: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn-link"
              style={{ fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: 4 }}
              onClick={() => { setEmail('admin@marketplace.com'); setPassword('Admin@123456'); }}
            >
              مدير: admin@marketplace.com
            </button>
            <button
              type="button"
              className="btn-link"
              style={{ fontSize: 'var(--font-size-xs)', display: 'block', marginBottom: 4 }}
              onClick={() => { setEmail('sony@marketplace.com'); setPassword('Vendor@123456'); }}
            >
              بائع: sony@marketplace.com
            </button>
            <button
              type="button"
              className="btn-link"
              style={{ fontSize: 'var(--font-size-xs)', display: 'block' }}
              onClick={() => { setEmail('omar@example.com'); setPassword('Customer@123456'); }}
            >
              عميل: omar@example.com
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
