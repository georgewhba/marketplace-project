import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../api';
import { useToast } from '../../toast';
import { Package, Truck, CheckCircle, Clock, ChevronRight, ChevronLeft, Search } from 'lucide-react';

interface OrderItem {
  id: number;
  orderId: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
  status: string;
  customerName: string;
  createdAt: string;
}

const statusLabels: Record<string, { label: string; color: string; icon: typeof Package }> = {
  pending: { label: 'قيد الانتظار', color: 'var(--warning-500)', icon: Clock },
  processing: { label: 'قيد التجهيز', color: 'var(--primary-500)', icon: Package },
  shipped: { label: 'تم الشحن', color: 'var(--info-500, #3b82f6)', icon: Truck },
  delivered: { label: 'تم التسليم', color: 'var(--success-500)', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'var(--error-500)', icon: Package },
};

const statusFlow = ['pending', 'processing', 'shipped', 'delivered'];

export default function VendorOrders() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-orders', page],
    queryFn: () => vendorApi.getOrders(page),
  });

  const items: OrderItem[] = data?.data ?? [];
  const meta = data?.meta;

  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, status }: { itemId: number; status: string }) =>
      vendorApi.updateOrderStatus(itemId, { status }),
    onSuccess: () => {
      addToast('تم تحديث حالة الطلب', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  function getNextStatus(current: string): string | null {
    const idx = statusFlow.indexOf(current);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  }

  const filtered = items.filter(item => {
    if (filter !== 'all' && item.status !== filter) return false;
    if (search && !item.orderNumber?.includes(search) && !item.productName?.includes(search)) return false;
    return true;
  });

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <h2 style={{ margin: '0 0 var(--space-5)', fontSize: 'var(--text-xl)', fontWeight: 700 }}>إدارة الطلبات</h2>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', ...statusFlow, 'cancelled'].map(s => (
          <button
            key={s}
            className={`btn ${filter === s ? 'btn--primary' : 'btn--outline'}`}
            style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)' }}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'الكل' : statusLabels[s]?.label ?? s}
          </button>
        ))}
        <div style={{ position: 'relative', marginRight: 'auto' }}>
          <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
          <input className="input" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingRight: 34, fontSize: 'var(--text-sm)', height: 36, maxWidth: 200 }} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">لا توجد طلبات</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(item => {
            const st = statusLabels[item.status] ?? statusLabels.pending;
            const Icon = st.icon;
            const next = getNextStatus(item.status);
            return (
              <div key={item.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <Icon size={18} color={st.color} />
                      <span style={{ color: st.color, fontWeight: 600, fontSize: 'var(--text-sm)' }}>{st.label}</span>
                      <span style={{ color: 'var(--neutral-400)', fontSize: 'var(--text-xs)' }}>•</span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>طلب #{item.orderNumber || item.orderId}</span>
                    </div>
                    <div style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>{item.productName}</div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
                      الكمية: {item.quantity} × {parseFloat(item.unitPrice).toLocaleString('ar-EG')} ج.م
                      <span style={{ margin: '0 var(--space-2)', color: 'var(--neutral-300)' }}>|</span>
                      العميل: {item.customerName || '—'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 'var(--space-2)' }}>
                    <div style={{ fontWeight: 700, fontSize: 'var(--text-lg)' }}>
                      {parseFloat(item.total).toLocaleString('ar-EG')} ج.م
                    </div>
                    {next && (
                      <button
                        className="btn btn--primary"
                        style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-1) var(--space-3)' }}
                        disabled={updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ itemId: item.id, status: next })}
                      >
                        {statusLabels[next]?.label ?? next}
                      </button>
                    )}
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                      {new Date(item.createdAt).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
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
