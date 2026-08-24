import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api';
import { useToast } from '../toast';

export default function ResetPasswordPage() {
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

  if (!token) {
    return (
      <div className="auth-container">
        <div className="card p-6 text-center" style={{ width: '100%', maxWidth: '400px', margin: '100px auto' }}>
          <h1 className="text-xl font-bold mb-4">رابط غير صالح</h1>
          <p className="mb-6 text-secondary">الرابط الذي تحاول استخدامه غير صالح أو انتهت صلاحيته.</p>
          <Link to="/forgot-password" className="btn btn-primary w-full">طلب رابط جديد</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="card p-6" style={{ width: '100%', maxWidth: '400px', margin: '100px auto' }}>
        <h1 className="text-xl font-bold mb-6 text-center">إعادة تعيين كلمة المرور</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-2 text-sm font-semibold">كلمة المرور الجديدة</label>
            <input
              type="password"
              className="input w-full"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="أدخل كلمة المرور الجديدة"
              required
              disabled={loading}
              minLength={8}
            />
          </div>
          <div>
            <label className="block mb-2 text-sm font-semibold">تأكيد كلمة المرور</label>
            <input
              type="password"
              className="input w-full"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="تأكيد كلمة المرور الجديدة"
              required
              disabled={loading}
              minLength={8}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full mt-2"
            disabled={loading || !password || !confirmPassword}
          >
            {loading ? 'جاري الحفظ...' : 'تغيير كلمة المرور'}
          </button>
        </form>
      </div>
    </div>
  );
}
