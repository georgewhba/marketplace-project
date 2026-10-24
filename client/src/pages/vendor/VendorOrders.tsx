import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../api';
import { useToast } from '../../toast';
import { Package, Truck, CheckCircle, Clock, ChevronRight, ChevronLeft, Search, X, ShoppingCart } from 'lucide-react';

interface OrderItem {
  id: number;
  orderId: number;
  orderNumber: string;
  productName: string;
  quantity: number;
  unitPrice: string;
  total: string;
  status?: string;
  vendorStatus?: string;
  customerName: string;
  createdAt: string;
}

const statusLabels: Record<string, { label: string; color: string; badge: string; icon: typeof Package }> = {
  pending: { label: 'قيد الانتظار', color: 'var(--warning-500)', badge: 'badge-warning', icon: Clock },
  confirmed: { label: 'مؤكد (قيد التجهيز)', color: 'var(--brand-500)', badge: 'badge-info', icon: Package },
  processing: { label: 'قيد التجهيز', color: 'var(--brand-500)', badge: 'badge-info', icon: Package },
  shipped: { label: 'تم الشحن', color: 'var(--info-500)', badge: 'badge-info', icon: Truck },
  delivered: { label: 'تم التسليم', color: 'var(--success-500)', badge: 'badge-success', icon: CheckCircle },
  cancelled: { label: 'ملغي', color: 'var(--error-500)', badge: 'badge-error', icon: Package },
};

const statusFlow = ['pending', 'confirmed', 'shipped', 'delivered'];

export default function VendorOrders() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [shipmentModal, setShipmentModal] = useState<OrderItem | null>(null);
  const [shippingProvider, setShippingProvider] = useState<'bosta' | 'manual'>('manual');
  const [trackingNumber, setTrackingNumber] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-orders', page],
    queryFn: () => vendorApi.getOrders(page),
  });

  const items: OrderItem[] = data?.data ?? [];
  const meta = data?.meta;

  const updateStatusMutation = useMutation({
    mutationFn: ({ itemId, status, trackingNumber }: { itemId: number; status: string; trackingNumber?: string }) =>
      vendorApi.updateOrderStatus(itemId, { status, ...(trackingNumber ? { trackingNumber } : {}) }),
    onSuccess: () => {
      addToast('تم تحديث حالة الطلب', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
    onError: (err: any) => addToast(err?.message || 'حدث خطأ', 'error'),
  });

  const createShipmentMutation = useMutation({
    mutationFn: ({ itemId, provider }: { itemId: number; provider: 'bosta' | 'manual' }) => {
      const payload: { provider: 'bosta' | 'manual'; trackingNumber?: string } = { provider };
      if (provider === 'manual' && trackingNumber.trim()) {
        payload.trackingNumber = trackingNumber.trim();
      }
      return vendorApi.createShipment(itemId, payload);
    },
    onSuccess: () => {
      addToast('تم إنشاء الشحنة بنجاح', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
      setShipmentModal(null);
      setTrackingNumber('');
    },
    onError: (err: any) => addToast(err.message || 'فشل إنشاء الشحنة', 'error'),
  });

  function getNextStatus(current: string): string | null {
    const normalized = current === 'processing' ? 'confirmed' : current;
    const idx = statusFlow.indexOf(normalized);
    return idx >= 0 && idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
  }

  const filtered = items.filter(item => {
    const itemStatus = item.vendorStatus || item.status || 'pending';
    if (filter !== 'all' && itemStatus !== filter && !(filter === 'confirmed' && itemStatus === 'processing'))
      return false;
    if (search && !item.orderNumber?.includes(search) && !item.productName?.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <ShoppingCart size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إدارة الطلبات</h1>
            <p className="page-header__subtitle">تجهيز وشحن طلبات العملاء وتحديث حالة التسليم</p>
          </div>
        </div>
        <span className="catalog-count-badge">
          إجمالي: <strong>{filtered.length}</strong> طلب
        </span>
      </div>

      {/* Filters Toolbar */}
      <div className="card card-body mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {['all', ...statusFlow, 'cancelled'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'الكل' : statusLabels[s]?.label ?? s}
              </button>
            ))}
          </div>
          <div className="relative" style={{ minWidth: 240 }}>
            <Search
              size={16}
              className="text-muted"
              style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              className="form-input"
              placeholder="بحث برقم الطلب أو المنتج..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingInlineEnd: 38, height: 38 }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 80 }} />
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
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const itemStatus = item.vendorStatus || item.status || 'pending';
            const st = statusLabels[itemStatus] ?? statusLabels.pending;
            const Icon = st.icon;
            const next = getNextStatus(itemStatus);
            return (
              <div key={item.id} className="card card-body">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex-1 min-w-0" style={{ minWidth: 200 }}>
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Icon size={18} color={st.color} />
                      <span className="font-semibold" style={{ color: st.color, fontSize: 'var(--font-size-sm)' }}>
                        {st.label}
                      </span>
                      <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        •
                      </span>
                      <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        طلب #{item.orderNumber || item.orderId}
                      </span>
                    </div>
                    <div className="font-bold text-primary mb-1">{item.productName}</div>
                    <div className="text-secondary flex flex-wrap items-center gap-2" style={{ fontSize: 'var(--font-size-sm)' }}>
                      <span>
                        الكمية: {item.quantity} × {parseFloat(item.unitPrice).toLocaleString('ar-EG')} ج.م
                      </span>
                      <span>•</span>
                      <span>العميل: {item.customerName || '—'}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-bold text-lg text-brand">
                      {parseFloat(item.total).toLocaleString('ar-EG')} ج.م
                    </div>
                    {next && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          if ((itemStatus === 'confirmed' || itemStatus === 'processing') && next === 'shipped') {
                            setShipmentModal(item);
                            setShippingProvider(meta?.isBostaEnabled ? 'bosta' : 'manual');
                          } else {
                            updateStatusMutation.mutate({ itemId: item.id, status: next });
                          }
                        }}
                      >
                        {statusLabels[next]?.label ?? next}
                      </button>
                    )}
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
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

      {shipmentModal && (
        <div className="modal-overlay" onClick={() => setShipmentModal(null)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-primary flex items-center gap-2">
                <Truck size={18} color="var(--brand-500)" /> شحن الطلب #{shipmentModal.orderNumber}
              </h3>
              <button className="modal-close" onClick={() => setShipmentModal(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body flex flex-col gap-3">
              {meta?.isBostaEnabled && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={shippingProvider === 'bosta'}
                    onChange={() => setShippingProvider('bosta')}
                  />
                  <span>شحن آلي عبر بوسطة (Bosta)</span>
                </label>
              )}

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={shippingProvider === 'manual'}
                  onChange={() => setShippingProvider('manual')}
                />
                <span>شحن يدوي (شركة أخرى)</span>
              </label>

              {shippingProvider === 'manual' && (
                <div className="form-group mt-2">
                  <label className="form-label">رقم التتبع *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={trackingNumber}
                    onChange={e => setTrackingNumber(e.target.value)}
                    placeholder="أدخل رقم بوليصة الشحن"
                  />
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShipmentModal(null)}>
                إلغاء
              </button>
              <button
                className="btn btn-primary"
                disabled={createShipmentMutation.isPending || (shippingProvider === 'manual' && !trackingNumber.trim())}
                onClick={() => createShipmentMutation.mutate({ itemId: shipmentModal.id, provider: shippingProvider })}
              >
                {createShipmentMutation.isPending ? 'جاري الإنشاء...' : 'تأكيد الشحن'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
