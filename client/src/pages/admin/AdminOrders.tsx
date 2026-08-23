import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { ShoppingCart, ChevronRight, ChevronLeft, Search } from 'lucide-react';

interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  status: string;
  totalAmount: string;
  itemCount: number;
  createdAt: string;
}

const statusLabels: Record<string, { label: string; cls: string }> = {
  pending: { label: 'قيد الانتظار', cls: 'badge--warning' },
  processing: { label: 'قيد التجهيز', cls: 'badge--info' },
  shipped: { label: 'تم الشحن', cls: 'badge--info' },
  delivered: { label: 'تم التسليم', cls: 'badge--success' },
  cancelled: { label: 'ملغي', cls: 'badge--error' },
};

export default function AdminOrders() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page],
    queryFn: () => adminApi.getOrders(page),
  });

  const orders: Order[] = data?.data ?? [];
  const meta = data?.meta;

  const filtered = search ? orders.filter(o => o.orderNumber?.includes(search) || o.customerName?.includes(search)) : orders;

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <ShoppingCart size={24} color="var(--primary-500)" />
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>إدارة الطلبات</h2>
      </div>

      <div style={{ position: 'relative', marginBottom: 'var(--space-4)', maxWidth: 360 }}>
        <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
        <input className="input" placeholder="بحث برقم الطلب..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state__title">لا توجد طلبات</div></div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>رقم الطلب</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>العميل</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>المبلغ</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>الحالة</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const st = statusLabels[o.status] ?? statusLabels.pending;
                return (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                    <td style={{ padding: 'var(--space-3)', fontWeight: 600, fontSize: 'var(--text-sm)', fontFamily: 'monospace' }}>#{o.orderNumber || o.id}</td>
                    <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)' }}>{o.customerName || '—'}</td>
                    <td style={{ padding: 'var(--space-3)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{parseFloat(o.totalAmount).toLocaleString('ar-EG')} ج.م</td>
                    <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button className="btn btn--outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={18} /> السابق</button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn--outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>التالي <ChevronLeft size={18} /></button>
        </div>
      )}
    </div>
  );
}
