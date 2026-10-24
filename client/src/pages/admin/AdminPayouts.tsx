import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { CheckCircle, XCircle, Clock, DollarSign } from 'lucide-react';

const formatCurrency = (val: number) => parseFloat(String(val)).toLocaleString('ar-EG') + ' ج.م';
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

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
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <DollarSign size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>طلبات السحب</h1>
            <p className="page-header__subtitle">إدارة طلبات سحب الأرباح المقدمة من البائعين وتأكيد التحويلات</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>البائع</th>
              <th>رقم التسوية</th>
              <th>المبلغ</th>
              <th>تاريخ الطلب</th>
              <th>الحالة</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3].map(i => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div className="skeleton" style={{ height: 40 }} />
                  </td>
                </tr>
              ))
            ) : payouts.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state__title">لا توجد طلبات سحب حالية</div>
                  </div>
                </td>
              </tr>
            ) : (
              payouts.map(item => (
                <tr key={item.id}>
                  <td className="font-semibold text-primary">#REQ-{item.id}</td>
                  <td className="font-semibold">{item.vendorName}</td>
                  <td>SET-{item.settlementId}</td>
                  <td className="font-bold text-brand">{formatCurrency(Number(item.amount))}</td>
                  <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {formatDate(item.createdAt)}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        item.status === 'paid'
                          ? 'badge-success'
                          : item.status === 'rejected'
                          ? 'badge-error'
                          : 'badge-warning'
                      }`}
                    >
                      {item.status === 'paid' ? 'مدفوع' : item.status === 'rejected' ? 'مرفوض' : 'قيد الانتظار'}
                    </span>
                  </td>
                  <td>
                    {item.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            if (
                              window.confirm(
                                'هل قمت بتحويل المبلغ فعلياً لحساب البائع البنكي؟ هذا الإجراء سيسجل العملية كمدفوعة ويخصم الرصيد.'
                              )
                            ) {
                              approveMutation.mutate(item.id);
                            }
                          }}
                          title="تأكيد الدفع"
                          disabled={approveMutation.isPending || rejectMutation.isPending}
                        >
                          <CheckCircle size={16} /> تأكيد الدفع
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
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
                      <span className="text-muted flex items-center gap-1" style={{ fontSize: 'var(--font-size-xs)' }}>
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
