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
  pending: { label: 'قيد الانتظار', cls: 'badge-warning' },
  processing: { label: 'قيد التجهيز', cls: 'badge-info' },
  shipped: { label: 'تم الشحن', cls: 'badge-info' },
  delivered: { label: 'تم التسليم', cls: 'badge-success' },
  cancelled: { label: 'ملغي', cls: 'badge-error' },
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
    <div>
      <div className="flex items-center gap-3 mb-6">
        <ShoppingCart size={24} className="text-brand" />
        <h1 className="page-header__title m-0">إدارة الطلبات</h1>
      </div>

      <div className="relative mb-4" style={{ maxWidth: 360 }}>
        <Search size={18} className="text-muted" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input className="input" placeholder="بحث برقم الطلب..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state__title">لا توجد طلبات</div></div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>رقم الطلب</th>
                <th>العميل</th>
                <th>المبلغ</th>
                <th className="text-center">الحالة</th>
                <th>التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => {
                const st = statusLabels[o.status] ?? statusLabels.pending;
                return (
                  <tr key={o.id}>
                    <td className="text-primary font-mono font-semibold">#{o.orderNumber || o.id}</td>
                    <td>{o.customerName || '—'}</td>
                    <td className="font-semibold">{parseFloat(o.totalAmount).toLocaleString('ar-EG')} ج.م</td>
                    <td className="text-center"><span className={`badge ${st.cls}`}>{st.label}</span></td>
                    <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{new Date(o.createdAt).toLocaleDateString('ar-EG')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={18} /> السابق</button>
          <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>التالي <ChevronLeft size={18} /></button>
        </div>
      )}
    </div>
  );
}
