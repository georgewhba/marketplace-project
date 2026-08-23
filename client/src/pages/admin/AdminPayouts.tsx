import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

const formatCurrency = (val: number) => parseFloat(String(val)).toLocaleString('ar-EG') + ' ج.م';
const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

interface PayoutRequest {
  id: number;
  vendorId: number;
  vendorName: string;
  settlementId: number;
  amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'paid';
  createdAt: string;
}

export function AdminPayouts() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-payouts'],
    queryFn: () => adminApi.getPayouts(),
  });

  const payouts: PayoutRequest[] = response?.data ?? [];

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approvePayout(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      addToast('تم الموافقة على السحب وتسجيله كمدفوع', 'success');
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => adminApi.rejectPayout(id, 'مرفوض من الإدارة'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-payouts'] });
      addToast('تم رفض طلب السحب', 'success');
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '0 0 var(--space-2)' }}>طلبات السحب</h1>
        <p style={{ color: 'var(--neutral-500)', margin: 0 }}>إدارة طلبات سحب الأرباح المقدمة من البائعين.</p>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>البائع</th>
              <th>رقم التسوية</th>
              <th>المبلغ</th>
              <th>تاريخ الطلب</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1,2,3].map(i => (
                <tr key={i}>
                  <td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td>
                </tr>
              ))
            ) : payouts.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state" style={{ border: 'none' }}>
                    <div className="empty-state__title">لا توجد طلبات سحب حالية</div>
                  </div>
                </td>
              </tr>
            ) : (
              payouts.map((item) => (
                <tr key={item.id}>
                  <td>#REQ-{item.id}</td>
                  <td style={{ fontWeight: 500 }}>{item.vendorName}</td>
                  <td>SET-{item.settlementId}</td>
                  <td style={{ fontWeight: 700 }}>{formatCurrency(Number(item.amount))}</td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>{formatDate(item.createdAt)}</td>
                  <td>
                    <span className={`badge ${item.status === 'paid' ? 'badge--success' : item.status === 'rejected' ? 'badge--error' : 'badge--warning'}`}>
                      {item.status === 'paid' ? 'مدفوع' : item.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                    </span>
                  </td>
                  <td>
                    {item.status === 'pending' ? (
                      <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <button 
                          className="btn btn--primary btn--sm" 
                          onClick={() => {
                            if (window.confirm('هل قمت بتحويل المبلغ فعلياً لحساب البائع البنكي؟ هذا الإجراء سيسجل العملية كمدفوعة ويخصم الرصيد.')) {
                              approveMutation.mutate(item.id);
                            }
                          }}
                          title="تأكيد الدفع"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <CheckCircle size={16} style={{ marginInlineEnd: '4px' }} /> تأكيد الدفع
                        </button>
                        <button 
                          className="btn btn--danger btn--sm" 
                          onClick={() => {
                            if (window.confirm('هل أنت متأكد من رفض طلب السحب؟')) {
                              rejectMutation.mutate(item.id);
                            }
                          }}
                          title="رفض الطلب"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Clock size={14} /> تمت المعالجة
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
