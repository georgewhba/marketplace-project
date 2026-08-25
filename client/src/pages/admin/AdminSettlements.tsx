import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { CheckCircle, Clock } from 'lucide-react';

const formatCurrency = (val: number) => parseFloat(String(val)).toLocaleString('ar-EG') + ' ج.م';

interface Settlement {
  id: number;
  vendorId: number;
  vendorName: string;
  periodStart: string;
  periodEnd: string;
  grossSales: string;
  totalCommission: string;
  netPayable: string;
  status: 'draft' | 'finalized' | 'paid';
  createdAt: string;
}

export function AdminSettlements() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-settlements'],
    queryFn: () => adminApi.getSettlements(),
  });

  const settlements: Settlement[] = response?.data ?? [];

  const finalizeMutation = useMutation({
    mutationFn: (id: number) => adminApi.finalizeSettlement(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settlements'] });
      addToast('تم اعتماد التسوية بنجاح', 'success');
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">دورات التسوية</h1>
          <p className="page-header__subtitle mt-2">مراجعة واعتماد المبالغ المستحقة للبائعين.</p>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>البائع</th>
              <th>الفترة</th>
              <th>المبيعات</th>
              <th>العمولة</th>
              <th>الصافي للبائع</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1,2,3].map(i => (
                <tr key={i}>
                  <td colSpan={8}><div className="skeleton" style={{ height: 40 }} /></td>
                </tr>
              ))
            ) : settlements.length === 0 ? (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state border-0">
                    <div className="empty-state__title">لا توجد تسويات حالية</div>
                  </div>
                </td>
              </tr>
            ) : (
              settlements.map((item) => (
                <tr key={item.id}>
                  <td>SET-{item.id}</td>
                  <td className="font-semibold">{item.vendorName}</td>
                  <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {new Date(item.periodStart).toLocaleDateString('ar-EG')} - {new Date(item.periodEnd).toLocaleDateString('ar-EG')}
                  </td>
                  <td>{formatCurrency(Number(item.grossSales))}</td>
                  <td style={{ color: 'var(--error-600)' }}>{formatCurrency(Number(item.totalCommission))}</td>
                  <td className="font-bold">{formatCurrency(Number(item.netPayable))}</td>
                  <td>
                    <span className={`badge ${item.status === 'paid' ? 'badge-success' : item.status === 'finalized' ? 'badge-info' : 'badge-warning'}`}>
                      {item.status === 'paid' ? 'مدفوعة' : item.status === 'finalized' ? 'معتمدة' : 'مسودة'}
                    </span>
                  </td>
                  <td>
                    {item.status === 'draft' ? (
                      <button 
                        className="btn btn-primary btn-sm flex items-center gap-1" 
                        onClick={() => {
                          if (window.confirm('اعتماد التسوية يمنع تعديلها لاحقاً ويسمح للبائع بسحب رصيدها. هل أنت متأكد؟')) {
                            finalizeMutation.mutate(item.id);
                          }
                        }}
                        disabled={finalizeMutation.isPending}
                      >
                        <CheckCircle size={16} /> اعتماد
                      </button>
                    ) : (
                      <span className="text-muted flex items-center gap-1" style={{ fontSize: 'var(--font-size-xs)' }}>
                        <Clock size={14} /> تمت المراجعة
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
