import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { orderApi, api } from '../api';
import { useToast } from '../toast';
import { Package, XCircle, Undo, Truck, X } from 'lucide-react';

const statusMap: Record<string, { label: string; class: string }> = {
  pending: { label: 'قيد الانتظار', class: 'badge-warning' },
  confirmed: { label: 'مؤكد', class: 'badge-info' },
  processing: { label: 'قيد التجهيز', class: 'badge-info' },
  shipped: { label: 'تم الشحن', class: 'badge-info' },
  delivered: { label: 'تم التوصيل', class: 'badge-success' },
  cancelled: { label: 'ملغي', class: 'badge-error' },
};

export default function OrdersPage() {
  const toast = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Refund modal state
  const [refundOrderId, setRefundOrderId] = useState<number | null>(null);
  const [refundReason, setRefundReason] = useState('');
  const [isSubmittingRefund, setIsSubmittingRefund] = useState(false);

  // Tracking modal state
  const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const [trackingData, setTrackingData] = useState<any[]>([]);
  const [isLoadingTracking, setIsLoadingTracking] = useState(false);

  useEffect(() => {
    orderApi.getOrders()
      .then((res: any) => setOrders(res.data || []))
      .catch(() => toast.error('فشل تحميل الطلبات'))
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (orderId: number) => {
    if (!confirm('هل أنت متأكد من إلغاء الطلب؟')) return;
    try {
      await orderApi.cancelOrder(orderId);
      toast.success('تم إلغاء الطلب');
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSubmitRefund = async () => {
    if (!refundOrderId) return;
    if (refundReason.trim().length < 5) {
      toast.error('الرجاء كتابة سبب واضح للاسترجاع (5 أحرف على الأقل)');
      return;
    }

    setIsSubmittingRefund(true);
    try {
      await api.post('/refunds', {
        orderId: refundOrderId,
        reason: refundReason,
      });
      toast.success('تم تقديم طلب الاسترجاع بنجاح');
      setRefundOrderId(null);
      setRefundReason('');
    } catch (e: any) {
      toast.error(e.message || e.response?.data?.error || 'حدث خطأ أثناء تقديم الطلب');
    } finally {
      setIsSubmittingRefund(false);
    }
  };

  const handleTrackOrder = async (orderId: number) => {
    setTrackingOrderId(orderId);
    setIsLoadingTracking(true);
    setTrackingData([]);
    try {
      const res = await orderApi.getTracking(orderId);
      const shipments = res?.data?.shipments || res?.shipments || [];
      setTrackingData(shipments);
    } catch (e: any) {
      toast.error('فشل جلب تفاصيل التتبع');
    } finally {
      setIsLoadingTracking(false);
    }
  };

  if (loading) {
    return <div className="container page-content">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 16 }} />)}</div>;
  }

  if (orders.length === 0) {
    return (
      <div className="container page-content">
        <div className="empty-state">
          <Package size={64} className="empty-state__icon" />
          <div className="empty-state__title">لا توجد طلبات</div>
          <p className="empty-state__description">ابدأ التسوق وأنشئ أول طلب لك</p>
          <Link to="/products" className="btn btn-primary btn-md">تصفّح المنتجات</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-content">
      <h1 className="page-header__title mb-8">طلباتي</h1>

      <div className="flex flex-col gap-4">
        {orders.map((order: any) => {
          const s = statusMap[order.status] || statusMap.pending;
          return (
            <div key={order.id} className="card card-body">
              <div className="flex justify-between items-center mb-4" style={{ flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>طلب #{order.orderNumber}</div>
                  <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    {new Date(order.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${s.class}`}>
                    <span className="badge-dot" /> {s.label}
                  </span>
                  <span style={{ fontWeight: 700, color: 'var(--brand-600)' }}>
                    {parseFloat(order.total ?? order.totalAmount ?? '0').toLocaleString('ar-EG')} ج.م
                  </span>
                </div>
              </div>

              {order.items && (
                <div className="flex gap-3" style={{ overflowX: 'auto' }}>
                  {order.items.slice(0, 4).map((item: any) => (
                    <div key={item.id} style={{ fontSize: 'var(--font-size-sm)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {item.productImage && (
                        <img src={item.productImage} alt="" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', objectFit: 'cover' }} />
                      )}
                      <div>
                        <div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.productName}</div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>×{item.quantity}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-4">
                {order.status === 'pending' && (
                  <button className="btn btn-danger btn-sm" onClick={() => handleCancel(order.id)}>
                    <XCircle size={14} /> إلغاء الطلب
                  </button>
                )}
                {order.status === 'delivered' && (
                  <button className="btn btn-secondary btn-sm" onClick={() => setRefundOrderId(order.id)}>
                    <Undo size={14} /> طلب استرجاع
                  </button>
                )}
                {['shipped', 'delivered'].includes(order.status) && (
                  <button className="btn btn-primary btn-sm" style={{ backgroundColor: 'var(--primary-600)' }} onClick={() => handleTrackOrder(order.id)}>
                    <Truck size={14} /> تتبع الشحنة
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {refundOrderId && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-overlay)', zIndex: 100 }}>
          <div className="card card-body" style={{ width: '100%', maxWidth: 400 }}>
            <h3 className="text-lg font-bold mb-4 flex gap-2 items-center">
              <Undo size={18} /> طلب استرجاع
            </h3>

            <div className="form-group mb-6">
              <label className="form-label">سبب الاسترجاع</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={refundReason}
                onChange={e => setRefundReason(e.target.value)}
                placeholder="الرجاء توضيح سبب الاسترجاع (مثال: المنتج تالف أو غير مطابق للمواصفات)..."
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setRefundOrderId(null);
                  setRefundReason('');
                }}
                disabled={isSubmittingRefund}
              >
                إلغاء
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSubmitRefund}
                disabled={isSubmittingRefund}
              >
                تقديم الطلب
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tracking Modal */}
      {trackingOrderId && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-overlay)', zIndex: 100 }}>
          <div className="card card-body" style={{ width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
            <button
              className="icon-btn"
              style={{ position: 'absolute', top: 12, insetInlineEnd: 12 }}
              onClick={() => setTrackingOrderId(null)}
              aria-label="إغلاق نافذة التتبع"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold mb-6 flex gap-2 items-center">
              <Truck size={20} style={{ color: 'var(--primary-600)' }} /> تتبع شحنة الطلب #{orders.find(o => o.id === trackingOrderId)?.orderNumber}
            </h3>

            {isLoadingTracking ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {[1, 2].map(i => <div key={i} className="skeleton" style={{ height: 60 }} />)}
              </div>
            ) : trackingData.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state__title">لا توجد تفاصيل تتبع لهذا الطلب بعد</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
                {trackingData.map((shipment, idx) => (
                  <div key={shipment.id} style={{ borderBottom: idx < trackingData.length - 1 ? '1px solid var(--neutral-200)' : 'none', paddingBottom: idx < trackingData.length - 1 ? 'var(--space-4)' : 0 }}>
                    <div style={{ marginBottom: 'var(--space-3)', display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ fontWeight: 600 }}>شحنة من البائع</div>
                      <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>
                        بوليصة: <strong style={{ color: 'var(--primary-600)' }}>{shipment.trackingNumber || 'غير متوفر'}</strong>
                      </div>
                    </div>

                    <div style={{ position: 'relative', paddingInlineStart: 'var(--space-4)' }}>
                      {/* Timeline line */}
                      <div style={{ position: 'absolute', insetInlineStart: 7, top: 10, bottom: 10, width: 2, backgroundColor: 'var(--neutral-200)' }} />

                      {shipment.events?.map((event: any, eIdx: number) => {
                        const isLast = eIdx === shipment.events.length - 1;
                        return (
                          <div key={event.id} style={{ position: 'relative', marginBottom: isLast ? 0 : 'var(--space-4)' }}>
                            <div style={{ position: 'absolute', insetInlineStart: -16, top: 4, width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--primary-500)', zIndex: 1 }} />
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{event.description || statusMap[event.status]?.label || event.status}</div>
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>
                                {new Date(event.occurredAt).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
