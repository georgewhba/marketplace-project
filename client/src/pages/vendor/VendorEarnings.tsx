import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../api';
import { DollarSign, ChevronRight, ChevronLeft, CreditCard, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '../../toast';

const formatCurrency = (val: number) => 
  parseFloat(String(val)).toLocaleString('ar-EG') + ' ج.م';

const formatDate = (date: string) => 
  new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

export default function VendorEarnings() {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { data: settlementsData, isLoading: isLoadingSettlements } = useQuery({
    queryKey: ['vendor-settlements', page],
    queryFn: () => vendorApi.getSettlements(page),
  });

  const { data: payoutsData, isLoading: isLoadingPayouts } = useQuery({
    queryKey: ['vendor-payouts'],
    queryFn: () => vendorApi.getPayouts(),
  });

  const requestPayoutMutation = useMutation({
    mutationFn: (data: { settlementId: number; amount: string }) => vendorApi.requestPayout(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-payouts'] });
      addToast('تم تقديم طلب السحب بنجاح', 'success');
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  const settlements = settlementsData?.data?.settlements ?? [];
  const meta = settlementsData?.meta;
  const balance = settlementsData?.data?.balance ?? '0';
  const payouts = payoutsData?.data ?? [];

  const handleRequestPayout = (settlement: any) => {
    if (window.confirm(`هل أنت متأكد من طلب سحب مبلغ ${formatCurrency(Number(settlement.netPayable))}؟`)) {
      requestPayoutMutation.mutate({
        settlementId: settlement.id,
        amount: settlement.netPayable,
      });
    }
  };

  return (
    <div>
      <div className="page-header mb-6">
        <h1 className="page-header__title m-0">الأرباح والتسويات</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-3 mb-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-3">
            <span className="stat-card__label">إجمالي الأرباح</span>
            <div className="flex items-center justify-center rounded-md" style={{ width: 36, height: 36, background: `var(--success-50, #ecfdf5)` }}>
              <DollarSign size={18} color="var(--success-500, #10b981)" />
            </div>
          </div>
          <div className="stat-card__value">
            {formatCurrency(Number(balance))}
          </div>
        </div>
      </div>

      <div className="grid grid-2 gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
        <div>
          <h3 className="font-semibold text-lg m-0 mb-3">دورات التسوية</h3>
          
          {isLoadingSettlements ? (
            <div className="flex flex-col gap-3">
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
            </div>
          ) : settlements.length === 0 ? (
            <div className="empty-state border-0">
              <div className="empty-state__title">لا توجد تسويات بعد</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {settlements.map((item: any) => {
                const hasPendingPayout = payouts.some((p: any) => p.settlementId === item.id && (p.status === 'pending' || p.status === 'paid'));
                return (
                  <div key={item.id} className="card p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold mb-1" style={{ fontSize: 'var(--font-size-sm)' }}>تسوية #{item.id}</div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                          {new Date(item.periodStart).toLocaleDateString('ar-EG')} - {new Date(item.periodEnd).toLocaleDateString('ar-EG')}
                        </div>
                      </div>
                      <span className={`badge ${item.status === 'paid' ? 'badge-success' : item.status === 'finalized' ? 'badge-info' : 'badge-warning'}`}>
                        {item.status === 'paid' ? 'مدفوعة' : item.status === 'finalized' ? 'معتمدة' : 'مسودة'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-end pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                      <div>
                        <div className="text-muted mb-1" style={{ fontSize: 'var(--font-size-xs)' }}>الصافي المستحق</div>
                        <div className="font-bold">{formatCurrency(Number(item.netPayable))}</div>
                      </div>
                      
                      {item.status === 'finalized' && !hasPendingPayout && (
                        <button 
                          className="btn btn-primary btn-sm flex items-center gap-1" 
                          onClick={() => handleRequestPayout(item)}
                          disabled={requestPayoutMutation.isPending}
                        >
                          <CreditCard size={14} /> طلب سحب
                        </button>
                      )}
                      {hasPendingPayout && item.status !== 'paid' && (
                        <div className="flex items-center gap-1 font-semibold rounded" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--warning-600)', background: 'var(--warning-50)', padding: '4px 8px' }}>
                          <Clock size={12} /> السحب قيد المراجعة
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {meta && meta.totalPages > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronRight size={18} /> السابق
              </button>
              <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>صفحة {meta.page} من {meta.totalPages}</span>
              <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                التالي <ChevronLeft size={18} />
              </button>
            </div>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-lg m-0 mb-3">طلبات السحب</h3>
          
          {isLoadingPayouts ? (
            <div className="flex flex-col gap-3">
              {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 70 }} />)}
            </div>
          ) : payouts.length === 0 ? (
            <div className="empty-state border-0">
              <div className="empty-state__title">لم تقم بتقديم طلبات سحب</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {payouts.map((req: any) => (
                <div key={req.id} className="card p-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="rounded-full flex items-center justify-center" style={{
                      width: 40, height: 40,
                      background: req.status === 'paid' ? 'var(--success-50, #ecfdf5)' : req.status === 'rejected' ? 'var(--error-50, #fef2f2)' : 'var(--warning-50, #fffbeb)',
                      color: req.status === 'paid' ? 'var(--success-600, #059669)' : req.status === 'rejected' ? 'var(--error-600, #dc2626)' : 'var(--warning-600, #d97706)'
                    }}>
                      {req.status === 'paid' ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <div className="font-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>سحب تسوية #{req.settlementId}</div>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(req.createdAt)}</div>
                    </div>
                  </div>
                  <div className="text-left">
                    <div className="font-bold">{formatCurrency(Number(req.amount))}</div>
                    <div className="mt-1" style={{ 
                      fontSize: 'var(--font-size-xs)',
                      color: req.status === 'paid' ? 'var(--success-600)' : req.status === 'rejected' ? 'var(--error-600)' : 'var(--warning-600)' 
                    }}>
                      {req.status === 'paid' ? 'تم الدفع' : req.status === 'rejected' ? 'مرفوض' : 'قيد المراجعة'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
