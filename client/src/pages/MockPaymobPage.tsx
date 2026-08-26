import { useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import { useToast } from '../toast';

export default function MockPaymobPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  const { addToast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleSimulate = async (success: boolean) => {
    setLoading(true);
    try {
      // Simulate calling the backend webhook
      await api.post('/payments/webhook/paymob-mock', {
        orderId,
        success
      });
      addToast(success ? 'تم الدفع بنجاح (محاكاة)' : 'فشلت عملية الدفع (محاكاة)', success ? 'success' : 'error');
      // Redirect back to dashboard or previous page
      window.location.href = '/vendor/subscriptions';
    } catch (err: any) {
      addToast('حدث خطأ أثناء المحاكاة', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', color: '#111827' }}>بوابة الدفع (محاكاة)</h1>
        <p style={{ color: '#4b5563', marginBottom: '2rem' }}>
          هذه الصفحة تظهر فقط في بيئة التطوير لأن بيانات Paymob غير متوفرة في ملف .env
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={() => handleSimulate(true)} 
            disabled={loading}
            style={{ padding: '0.75rem 1.5rem', background: '#10b981', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}
          >
            دفع ناجح
          </button>
          <button 
            onClick={() => handleSimulate(false)} 
            disabled={loading}
            style={{ padding: '0.75rem 1.5rem', background: '#ef4444', color: 'white', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: 1 }}
          >
            دفع فاشل
          </button>
        </div>
        <div style={{ marginTop: '1.5rem' }}>
          <a href="/vendor/subscriptions" style={{ color: '#3b82f6', textDecoration: 'none' }}>إلغاء والعودة</a>
        </div>
      </div>
    </div>
  );
}
