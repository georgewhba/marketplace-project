import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { vendorApi } from '../../api';
import { DollarSign, TrendingUp, TrendingDown, ChevronRight, ChevronLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';

interface Transaction {
  id: number;
  type: string;
  amount: string;
  description: string;
  createdAt: string;
}

export default function VendorEarnings() {
  const [page, setPage] = useState(1);

  const { data: dashData } = useQuery({
    queryKey: ['vendor-dashboard'],
    queryFn: vendorApi.getDashboard,
  });

  const { data: txData, isLoading } = useQuery({
    queryKey: ['vendor-earnings', page],
    queryFn: () => vendorApi.getEarnings(page),
  });

  const transactions: Transaction[] = txData?.data ?? [];
  const meta = txData?.meta;
  const stats = dashData?.data;

  const statCards = [
    { label: 'إجمالي المبيعات', value: stats?.totalRevenue ?? '0', icon: DollarSign, color: 'var(--success-500)' },
    { label: 'العمولة المدفوعة', value: stats?.totalCommission ?? '0', icon: TrendingDown, color: 'var(--error-500)' },
    { label: 'صافي الأرباح', value: stats?.netEarnings ?? '0', icon: TrendingUp, color: 'var(--primary-500)' },
  ];

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h2 style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>الأرباح والمعاملات</h2>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
        {statCards.map((card, i) => (
          <div key={i} className="card" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)', fontWeight: 500 }}>{card.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${card.color}14`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <card.icon size={18} color={card.color} />
              </div>
            </div>
            <div style={{ fontSize: 'var(--text-2xl)', fontWeight: 700 }}>
              {parseFloat(String(card.value)).toLocaleString('ar-EG')} <span style={{ fontSize: 'var(--text-sm)', fontWeight: 400, color: 'var(--neutral-500)' }}>ج.م</span>
            </div>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <h3 style={{ margin: '0 0 var(--space-3)', fontSize: 'var(--text-lg)', fontWeight: 600 }}>سجل المعاملات</h3>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : transactions.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">لا توجد معاملات بعد</div>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'hidden' }}>
          {transactions.map((tx, idx) => {
            const isCredit = tx.type === 'credit' || tx.type === 'sale';
            return (
              <div key={tx.id} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--space-3) var(--space-4)',
                borderBottom: idx < transactions.length - 1 ? '1px solid var(--neutral-100)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: isCredit ? 'var(--success-50, #ecfdf5)' : 'var(--error-50, #fef2f2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isCredit ? <ArrowUpRight size={16} color="var(--success-500)" /> : <ArrowDownRight size={16} color="var(--error-500)" />}
                  </div>
                  <div>
                    <div style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{tx.description || tx.type}</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                      {new Date(tx.createdAt).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, color: isCredit ? 'var(--success-600)' : 'var(--error-600)' }}>
                  {isCredit ? '+' : '-'}{parseFloat(tx.amount).toLocaleString('ar-EG')} ج.م
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
  );
}
