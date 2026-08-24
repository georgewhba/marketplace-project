import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api';
import { useToast } from '../toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
      toast.success('تم إرسال رابط استعادة كلمة المرور إذا كان البريد مسجلاً لدينا');
    } catch (err: any) {
      toast.error(err.message || 'حدث خطأ، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="card p-6" style={{ width: '100%', maxWidth: '400px', margin: '100px auto' }}>
        <h1 className="text-xl font-bold mb-2 text-center">نسيت كلمة المرور</h1>
        <p className="text-secondary text-center mb-6 text-sm">
          أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور
        </p>

        {success ? (
          <div className="bg-brand-50 text-brand-600 p-4 rounded-md mb-4 text-center">
            تم إرسال الرابط بنجاح. يرجى التحقق من بريدك الإلكتروني.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold">البريد الإلكتروني</label>
              <input
                type="email"
                className="input w-full"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="أدخل بريدك الإلكتروني"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full"
              disabled={loading || !email}
            >
              {loading ? 'جاري الإرسال...' : 'إرسال رابط الاستعادة'}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-primary-600 hover:underline">
            العودة لتسجيل الدخول
          </Link>
        </div>
      </div>
    </div>
  );
}
