import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';

export default function MockPaymobPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const orderId = searchParams.get('orderId') || '';
  const isSubscription = orderId.startsWith('SUB-');
  const returnPath = isSubscription ? '/vendor/subscriptions' : '/orders';
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSimulate = async (success: boolean) => {
    setLoading(true);
    try {
      await api.post('/payments/webhook/paymob-mock', {
        orderId,
        success,
      });
      addToast(success ? 'تم الدفع بنجاح (محاكاة)' : 'فشلت عملية الدفع (محاكاة)', success ? 'success' : 'error');
      navigate(returnPath);
    } catch (err: any) {
      addToast(err?.message || 'حدث خطأ أثناء المحاكاة', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container page-content flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
      <div className="card card-body" style={{ maxWidth: 440, width: '100%', textAlign: 'center', padding: 'var(--space-8)' }}>
        <h1 className="page-header__title mb-3">بوابة الدفع (محاكاة)</h1>
        <p className="text-secondary mb-6">
          هذه الصفحة تظهر في بيئة التطوير لمحاكاة استجابة بوابة الدفع Paymob للطلب رقم <strong className="text-brand">{orderId}</strong>.
        </p>
        
        <div className="flex gap-4 justify-center">
          <button 
            onClick={() => handleSimulate(true)} 
            disabled={loading}
            className="btn btn-primary btn-md"
            style={{ flex: 1, background: 'var(--success-500)' }}
          >
            دفع ناجح
          </button>
          <button 
            onClick={() => handleSimulate(false)} 
            disabled={loading}
            className="btn btn-danger btn-md"
            style={{ flex: 1 }}
          >
            دفع فاشل
          </button>
        </div>
        <div className="mt-6">
          <Link to={returnPath} className="text-brand font-semibold">إلغاء والعودة</Link>
        </div>
      </div>
    </div>
  );
}
