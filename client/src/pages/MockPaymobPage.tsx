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
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <div className="card card-body" style={{ maxWidth: '420px', width: '100%', textAlign: 'center', padding: 'var(--space-8)' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>بوابة الدفع (محاكاة)</h1>
        <p className="text-secondary" style={{ marginBottom: '2rem' }}>
          هذه الصفحة تظهر في بيئة التطوير لمحاكاة استجابة بوابة الدفع Paymob للطلب رقم <strong>{orderId}</strong>.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => handleSimulate(true)} 
            disabled={loading}
            className="btn btn-primary"
            style={{ flex: 1, background: '#10b981', borderColor: '#10b981' }}
          >
            دفع ناجح
          </button>
          <button 
            onClick={() => handleSimulate(false)} 
            disabled={loading}
            className="btn btn-danger"
            style={{ flex: 1 }}
          >
            دفع فاشل
          </button>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <Link to={returnPath} className="text-brand" style={{ textDecoration: 'none' }}>إلغاء والعودة</Link>
        </div>
      </div>
    </div>
  );
}
