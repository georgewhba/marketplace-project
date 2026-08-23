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
    <div style={{ padding: 'var(--space-6)' }}>
      <h2 style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>الأرباح والتسويات</h2>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)', fontWeight: 500 }}>إجمالي الأرباح</span>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `var(--success-50, #ecfdf5)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <DollarSign size={18} color="var(--success-500, #10b981)" />
            </div>
          </div>
          <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
            {formatCurrency(Number(balance))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 'var(--space-6)' }}>
        <div>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>دورات التسوية</h3>
          
          {isLoadingSettlements ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100 }} />)}
            </div>
          ) : settlements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">لا توجد تسويات بعد</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {settlements.map((item: any) => {
                const hasPendingPayout = payouts.some((p: any) => p.settlementId === item.id && (p.status === 'pending' || p.status === 'paid'));
                return (
                  <div key={item.id} className="card" style={{ padding: 'var(--space-4)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)', marginBottom: '4px' }}>تسوية #{item.id}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>
                          {new Date(item.periodStart).toLocaleDateString('ar-EG')} - {new Date(item.periodEnd).toLocaleDateString('ar-EG')}
                        </div>
                      </div>
                      <span className={`badge ${item.status === 'paid' ? 'badge--success' : item.status === 'finalized' ? 'badge--info' : 'badge--warning'}`}>
                        {item.status === 'paid' ? 'مدفوعة' : item.status === 'finalized' ? 'معتمدة' : 'مسودة'}
                      </span>
                    </div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid var(--neutral-100)', paddingTop: 'var(--space-3)' }}>
                      <div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)', marginBottom: '4px' }}>الصافي المستحق</div>
                        <div style={{ fontWeight: 700 }}>{formatCurrency(Number(item.netPayable))}</div>
                      </div>
                      
                      {item.status === 'finalized' && !hasPendingPayout && (
                        <button 
                          className="btn btn--primary btn--sm" 
                          onClick={() => handleRequestPayout(item)}
                          disabled={requestPayoutMutation.isPending}
                        >
                          <CreditCard size={14} style={{ marginInlineEnd: '6px' }} /> طلب سحب
                        </button>
                      )}
                      {hasPendingPayout && item.status !== 'paid' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--text-xs)', color: 'var(--warning-600)', background: 'var(--warning-50)', padding: '4px 8px', borderRadius: '4px', fontWeight: 500 }}>
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
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
              <button className="btn btn--outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                <ChevronRight size={18} /> السابق
              </button>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>صفحة {meta.page} من {meta.totalPages}</span>
              <button className="btn btn--outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
                التالي <ChevronLeft size={18} />
              </button>
            </div>
          )}
        </div>

        <div>
          <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>طلبات السحب</h3>
          
          {isLoadingPayouts ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {[1,2].map(i => <div key={i} className="skeleton" style={{ height: 70 }} />)}
            </div>
          ) : payouts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state__title">لم تقم بتقديم طلبات سحب</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {payouts.map((req: any) => (
                <div key={req.id} className="card" style={{ padding: 'var(--space-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'center' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: req.status === 'paid' ? 'var(--success-50, #ecfdf5)' : req.status === 'rejected' ? 'var(--error-50, #fef2f2)' : 'var(--warning-50, #fffbeb)',
                      color: req.status === 'paid' ? 'var(--success-600, #059669)' : req.status === 'rejected' ? 'var(--error-600, #dc2626)' : 'var(--warning-600, #d97706)'
                    }}>
                      {req.status === 'paid' ? <CheckCircle size={20} /> : <Clock size={20} />}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>سحب تسوية #{req.settlementId}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>{formatDate(req.createdAt)}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 700 }}>{formatCurrency(Number(req.amount))}</div>
                    <div style={{ 
                      fontSize: 'var(--text-xs)', marginTop: '4px',
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
