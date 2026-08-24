import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { addressApi, orderApi, cartApi, paymentApi } from '../api';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useToast } from '../toast';
import { MapPin, Plus, CheckCircle, ArrowRight } from 'lucide-react';

export default function CheckoutPage() {
  const shouldReduceMotion = useReducedMotion();
  const toast = useToast();
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<any[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<number | null>(null);
  const [couponCode, setCouponCode] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'cod'>('cod');
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    fullName: '', phone: '', addressLine1: '', city: '', country: 'Egypt',
  });

  useEffect(() => {
    Promise.all([
      addressApi.getAddresses().then((res: any) => {
        const addrs = res.data || res;
        setAddresses(addrs);
        const def = addrs.find((a: any) => a.isDefault);
        if (def) setSelectedAddress(def.id);
        else if (addrs.length > 0) setSelectedAddress(addrs[0].id);
      }),
      cartApi.getCart().then((res: any) => setCart(res.data || res)),
    ]).catch(() => toast.error('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await addressApi.createAddress(newAddress) as any;
      const addr = res.data || res;
      setAddresses(prev => [...prev, addr]);
      setSelectedAddress(addr.id);
      setShowAddAddress(false);
      toast.success('تم إضافة العنوان');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleCheckout = async () => {
    if (!selectedAddress) { toast.error('اختر عنوان التوصيل'); return; }
    setSubmitting(true);
    try {
      // 1. Create order
      const res = await orderApi.checkout({
        addressId: selectedAddress,
        couponCode: couponCode || undefined,
        notes: notes || undefined,
      }) as any;
      
      const order = res.data || res;
      const orderId = order.id || order.orderId || order.data?.id; // fallback depending on response format

      // 2. Initiate Payment
      const paymentData = await paymentApi.initiate({ orderId, method: paymentMethod }) as any;
      const data = paymentData.data || paymentData;

      if (paymentMethod === 'card' && data?.iframeUrl) {
        window.location.href = data.iframeUrl;
      } else {
        toast.success(`تم تأكيد الطلب بنجاح`);
        navigate(`/orders`);
      }
    } catch (e: any) {
      toast.error(e.message || 'حدث خطأ أثناء الدفع');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="container page-content"><div className="skeleton" style={{ height: 400 }} /></div>;
  }

  return (
    <div className="container page-content">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Link to="/cart" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--primary-600)', textDecoration: 'none', fontWeight: 500 }}>
          <ArrowRight size={18} /> العودة للسلة
        </Link>
        <h1 className="page-header__title mb-0">إتمام الشراء</h1>
      </div>

      <motion.div 
        className="flex gap-8" 
        style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : motionTokens.stagger } } }}
      >
        <div style={{ flex: '1 1 500px' }}>
          {/* Addresses */}
          <motion.div 
            className="card card-body mb-6"
            variants={{
              hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 20 },
              visible: { opacity: 1, x: 0, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.decelerate } }
            }}
          >
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>
              <MapPin size={18} style={{ display: 'inline', marginLeft: 'var(--space-2)' }} />
              عنوان التوصيل
            </h3>

            {addresses.length === 0 && !showAddAddress ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                <p className="text-muted mb-4">لم تضف أي عنوان بعد</p>
                <button className="btn btn-secondary btn-md" onClick={() => setShowAddAddress(true)}>
                  <Plus size={16} /> إضافة عنوان
                </button>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {addresses.map((addr: any) => (
                    <label
                      key={addr.id}
                      className="card"
                      style={{
                        padding: 'var(--space-4)', cursor: 'pointer',
                        border: selectedAddress === addr.id ? '2px solid var(--brand-500)' : undefined,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddress === addr.id}
                          onChange={() => setSelectedAddress(addr.id)}
                        />
                        <div>
                          <div style={{ fontWeight: 600 }}>{addr.fullName}</div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                            {addr.addressLine1}، {addr.city}
                          </div>
                          <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>{addr.phone}</div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 'var(--space-3)' }} onClick={() => setShowAddAddress(!showAddAddress)}>
                  <Plus size={14} /> إضافة عنوان جديد
                </button>
              </>
            )}

            {showAddAddress && (
              <form onSubmit={handleAddAddress} style={{ marginTop: 'var(--space-4)' }}>
                <div className="flex gap-4 mb-4">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">الاسم الكامل</label>
                    <input className="form-input" value={newAddress.fullName} onChange={e => setNewAddress(p => ({ ...p, fullName: e.target.value }))} required />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label">رقم الهاتف</label>
                    <input className="form-input" dir="ltr" value={newAddress.phone} onChange={e => setNewAddress(p => ({ ...p, phone: e.target.value }))} required />
                  </div>
                </div>
                <div className="form-group mb-4">
                  <label className="form-label">العنوان</label>
                  <input className="form-input" value={newAddress.addressLine1} onChange={e => setNewAddress(p => ({ ...p, addressLine1: e.target.value }))} required />
                </div>
                <div className="form-group mb-4">
                  <label className="form-label">المدينة</label>
                  <input className="form-input" value={newAddress.city} onChange={e => setNewAddress(p => ({ ...p, city: e.target.value }))} required />
                </div>
                <button type="submit" className="btn btn-primary btn-md">حفظ العنوان</button>
              </form>
            )}
          </motion.div>

          {/* Coupon */}
          <motion.div 
            className="card card-body mb-6"
            variants={{
              hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 20 },
              visible: { opacity: 1, x: 0, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.decelerate } }
            }}
          >
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>كود خصم</h3>
            <div className="flex gap-3">
              <input
                className="form-input"
                placeholder="WELCOME10"
                value={couponCode}
                onChange={e => setCouponCode(e.target.value)}
                dir="ltr"
              />
            </div>
          </motion.div>

          {/* Notes */}
          <motion.div 
            className="card card-body mb-6"
            variants={{
              hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 20 },
              visible: { opacity: 1, x: 0, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.decelerate } }
            }}
          >
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-3)' }}>ملاحظات (اختياري)</h3>
            <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="مثال: الرجاء عدم قرع الجرس" />
          </motion.div>

          {/* Payment Method */}
          <motion.div 
            className="card card-body"
            variants={{
              hidden: { opacity: 0, x: shouldReduceMotion ? 0 : 20 },
              visible: { opacity: 1, x: 0, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.decelerate } }
            }}
          >
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>طريقة الدفع</h3>
            <div className="flex flex-col gap-3">
              <label
                className="card"
                style={{
                  padding: 'var(--space-4)', cursor: 'pointer',
                  border: paymentMethod === 'cod' ? '2px solid var(--brand-500)' : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'cod'}
                    onChange={() => setPaymentMethod('cod')}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>الدفع عند الاستلام</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>ادفع نقداً عند استلام طلبك</div>
                  </div>
                </div>
              </label>
              <label
                className="card"
                style={{
                  padding: 'var(--space-4)', cursor: 'pointer',
                  border: paymentMethod === 'card' ? '2px solid var(--brand-500)' : undefined,
                }}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                  />
                  <div>
                    <div style={{ fontWeight: 600 }}>البطاقة الائتمانية</div>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>دفع آمن عبر الإنترنت</div>
                  </div>
                </div>
              </label>
            </div>
          </motion.div>
        </div>

        {/* Summary */}
        <motion.div 
          style={{ flex: '0 0 320px' }}
          variants={{
            hidden: { opacity: 0, x: shouldReduceMotion ? 0 : -20 },
            visible: { opacity: 1, x: 0, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.decelerate } }
          }}
        >
          <div className="card card-body" style={{ position: 'sticky', top: 'calc(var(--header-height) + var(--space-6))' }}>
            <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>ملخص الطلب</h3>

            {cart?.items?.map((item: any) => (
              <div key={item.id} className="flex justify-between mb-2" style={{ fontSize: 'var(--font-size-sm)' }}>
                <span>{item.productName} ×{item.quantity}</span>
                <span>{(parseFloat(item.productPrice) * item.quantity).toLocaleString('ar-EG')}</span>
              </div>
            ))}

            <hr className="divider" />
            <div className="flex justify-between mb-2">
              <span className="text-muted">المجموع الفرعي</span>
              <span style={{ fontWeight: 600 }}>{parseFloat(cart?.subtotal || '0').toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-muted">الشحن</span>
              <span style={{ fontWeight: 600 }}>30.00 ج.م / بائع</span>
            </div>
            <hr className="divider" />

            <button
              className="btn btn-primary btn-lg"
              style={{ width: '100%', marginTop: 'var(--space-4)' }}
              disabled={submitting || !selectedAddress}
              onClick={handleCheckout}
            >
              <CheckCircle size={18} />
              {submitting ? 'جارٍ إتمام الطلب...' : 'تأكيد الطلب'}
            </button>
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', textAlign: 'center', marginTop: 'var(--space-3)' }}>
              {paymentMethod === 'cod' ? 'الدفع عند الاستلام' : 'دفع إلكتروني آمن'}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
