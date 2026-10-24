import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { ShoppingCart, ChevronRight, ChevronLeft, Search } from 'lucide-react';

interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  status: string;
  total?: string;
  totalAmount?: string;
  itemCount: number;
  createdAt: string;
}

const statusLabels: Record<string, { label: string; cls: string }> = {
  pending: { label: 'قيد الانتظار', cls: 'badge-warning' },
  confirmed: { label: 'مؤكد', cls: 'badge-info' },
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

  const filtered = search
    ? orders.filter(o => o.orderNumber?.includes(search) || o.customerName?.includes(search))
    : orders;

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <ShoppingCart size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إدارة الطلبات</h1>
            <p className="page-header__subtitle">متابعة جميع طلبات العملاء، حالات الشحن، وإجمالي المدفوعات</p>
          </div>
        </div>
        <span className="catalog-count-badge">
          المعروض: <strong>{filtered.length}</strong> طلب
        </span>
      </div>

      <div className="card card-body mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <div className="relative" style={{ maxWidth: 420 }}>
          <Search
            size={18}
            className="text-muted"
            style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            className="form-input"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingInlineEnd: 42 }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 64 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <ShoppingCart size={52} className="empty-state__icon" />
            <div className="empty-state__title">لا توجد طلبات مطابقة</div>
          </div>
        </div>
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
                const totalVal = o.total ?? o.totalAmount ?? 0;
                return (
                  <tr key={o.id}>
                    <td className="text-primary font-semibold">#{o.orderNumber || o.id}</td>
                    <td>{o.customerName || '—'}</td>
                    <td className="font-bold text-brand">{parseFloat(String(totalVal)).toLocaleString('ar-EG')} ج.م</td>
                    <td className="text-center">
                      <span className={`badge ${st.cls}`}>{st.label}</span>
                    </td>
                    <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {new Date(o.createdAt).toLocaleDateString('ar-EG')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight size={18} /> السابق
          </button>
          <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            صفحة {meta.page} من {meta.totalPages}
          </span>
          <button className="btn btn-outline btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
            التالي <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
