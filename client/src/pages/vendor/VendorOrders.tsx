import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../api';
import { useToast } from '../../toast';
import { Package, Truck, CheckCircle, Clock, ChevronRight, ChevronLeft, Search, X } from 'lucide-react';

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
      vendorApi.updateOrderStatus(itemId, { status, trackingNumber }),
    onSuccess: () => {
      addToast('تم تحديث حالة الطلب', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const createShipmentMutation = useMutation({
    mutationFn: ({ itemId, provider }: { itemId: number; provider: 'bosta' | 'manual' }) =>
      vendorApi.createShipment(itemId, { provider, trackingNumber: provider === 'manual' ? trackingNumber : undefined } as any),
    onSuccess: () => {
      addToast('تم إنشاء الشحنة بنجاح', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-orders'] });
      setShipmentModal(null);
      setTrackingNumber('');
    },
    onError: (err: any) => addToast(err.message || 'فشل إنشاء الشحنة', 'error'),
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
    <div>
      <div className="page-header mb-6">
        <h1 className="page-header__title m-0">إدارة الطلبات</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        {['all', ...statusFlow, 'cancelled'].map(s => (
          <button
            key={s}
            className={`btn ${filter === s ? 'btn-primary' : 'btn-outline'} btn-sm`}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'الكل' : statusLabels[s]?.label ?? s}
          </button>
        ))}
        <div className="relative mr-auto">
          <Search size={16} className="absolute text-muted" style={{ right: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="input" placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingRight: 34, height: 36, maxWidth: 200 }} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state border-0">
          <div className="empty-state__title">لا توجد طلبات</div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(item => {
            const st = statusLabels[item.status] ?? statusLabels.pending;
            const Icon = st.icon;
            const next = getNextStatus(item.status);
            return (
              <div key={item.id} className="card p-4">
                <div className="flex justify-between items-start flex-wrap gap-3">
                  <div className="flex-1" style={{ minWidth: 200 }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon size={18} color={st.color} />
                      <span className="font-semibold" style={{ color: st.color, fontSize: 'var(--font-size-sm)' }}>{st.label}</span>
                      <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>•</span>
                      <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>طلب #{item.orderNumber || item.orderId}</span>
                    </div>
                    <div className="font-semibold mb-1">{item.productName}</div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                      الكمية: {item.quantity} × {parseFloat(item.unitPrice).toLocaleString('ar-EG')} ج.م
                      <span className="mx-2" style={{ color: 'var(--neutral-300)' }}>|</span>
                      العميل: {item.customerName || '—'}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="font-bold text-lg">
                      {parseFloat(item.total).toLocaleString('ar-EG')} ج.م
                    </div>
                    {next && (
                      <button
                        className="btn btn-primary btn-sm"
                        disabled={updateStatusMutation.isPending}
                        onClick={() => {
                          if (item.status === 'processing' && next === 'shipped') {
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
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight size={18} /> السابق
          </button>
          <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
            التالي <ChevronLeft size={18} />
          </button>
        </div>
      )}

      {shipmentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: 'var(--bg-overlay)' }}>
          <div className="card p-5 relative" style={{ width: 400 }}>
            <button
              className="absolute bg-transparent border-0 cursor-pointer"
              style={{ top: 15, right: 15 }}
              onClick={() => setShipmentModal(null)}
            >
              <X size={20} className="text-muted" />
            </button>
            <h3 className="mt-0 mb-4 font-semibold text-lg">شحن الطلب #{shipmentModal.orderNumber}</h3>
            
            <div className="flex flex-col gap-3 mb-5">
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
                <div className="mt-2">
                  <label className="label">رقم التتبع</label>
                  <input
                    type="text"
                    className="input"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="أدخل رقم التتبع"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                className="btn btn-primary flex-1"
                disabled={createShipmentMutation.isPending || (shippingProvider === 'manual' && !trackingNumber)}
                onClick={() => createShipmentMutation.mutate({ itemId: shipmentModal.id, provider: shippingProvider })}
              >
                {createShipmentMutation.isPending ? 'جاري الإنشاء...' : 'تأكيد الشحن'}
              </button>
              <button
                className="btn btn-outline flex-1"
                onClick={() => setShipmentModal(null)}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
