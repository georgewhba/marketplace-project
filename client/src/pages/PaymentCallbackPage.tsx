import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';

export default function PaymentCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');

  useEffect(() => {
    // Paymob callback params
    const success = searchParams.get('success');
    const pending = searchParams.get('pending');

    if (pending === 'true') {
      setStatus('loading');
      // Wait or just assume pending
      setTimeout(() => navigate('/orders'), 3000);
    } else if (success === 'true') {
      setStatus('success');
    } else {
      setStatus('failed');
    }
  }, [searchParams, navigate]);

  return (
    <div className="container page-content flex flex-col items-center justify-center" style={{ minHeight: '60vh' }}>
      {status === 'loading' && (
        <>
          <Loader size={48} className="spin text-brand-500 mb-4" />
          <h2 className="text-xl" style={{ fontWeight: 600 }}>جاري معالجة الدفع...</h2>
          <p className="text-muted mt-2">الرجاء الانتظار وعدم إغلاق الصفحة</p>
        </>
      )}

      {status === 'success' && (
        <div style={{ textAlign: 'center' }}>
          <CheckCircle size={64} className="text-success mb-4 mx-auto" />
          <h2 className="text-2xl" style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>تم الدفع بنجاح!</h2>
          <p className="text-muted mb-6">شكراً لك. تم تأكيد طلبك وجاري تجهيزه.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/orders')}>
            عرض طلباتي
          </button>
        </div>
      )}

      {status === 'failed' && (
        <div style={{ textAlign: 'center' }}>
          <XCircle size={64} className="text-danger mb-4 mx-auto" />
          <h2 className="text-2xl" style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>فشلت عملية الدفع</h2>
          <p className="text-muted mb-6">عذراً، لم نتمكن من معالجة دفعتك. الرجاء المحاولة مرة أخرى.</p>
          <button className="btn btn-primary btn-lg" onClick={() => navigate('/cart')}>
            العودة للسلة
          </button>
        </div>
      )}
    </div>
  );
}
