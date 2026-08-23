import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { cartApi } from '../api';
import { useToast } from '../toast';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function CartPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      const res = await cartApi.getCart() as any;
      setCart(res.data || res);
    } catch {
      toast.error('فشل تحميل السلة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCart(); }, []);

  const updateQuantity = async (itemId: number, quantity: number) => {
    try {
      await cartApi.updateItem(itemId, quantity);
      fetchCart();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await cartApi.removeItem(itemId);
      toast.success('تم الحذف');
      fetchCart();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="container page-content">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 80, marginBottom: 'var(--space-4)' }} />
        ))}
      </div>
    );
  }

  const items = cart?.items || [];

  if (items.length === 0) {
    return (
      <div className="container page-content">
        <div className="empty-state">
          <ShoppingBag size={64} className="empty-state__icon" />
          <div className="empty-state__title">السلة فارغة</div>
          <p className="empty-state__description">ابدأ التسوق وأضف منتجات لسلتك</p>
          <Link to="/products" className="btn btn-primary btn-md">
            تصفّح المنتجات <ArrowLeft size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-content">
      <h1 className="page-header__title mb-8">سلة التسوق ({items.length} منتج)</h1>

      <div className="flex gap-8" style={{ flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Items */}
        <div style={{ flex: '1 1 500px' }}>
          {items.map((item: any) => (
            <div key={item.id} className="card mb-4" style={{ padding: 'var(--space-4)' }}>
              <div className="flex gap-4">
                <img
                  src={item.productImage || 'https://picsum.photos/seed/fallback/100/100'}
                  alt={item.productName}
                  style={{ width: 80, height: 80, borderRadius: 'var(--radius-md)', objectFit: 'cover' }}
                />
                <div style={{ flex: 1 }}>
                  <Link to={`/products/${item.productSlug}`} style={{ fontWeight: 600, color: 'var(--text-primary)', textDecoration: 'none' }}>
                    {item.productName}
                  </Link>
                  <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, color: 'var(--brand-600)', marginTop: 'var(--space-2)' }}>
                    {parseFloat(item.productPrice).toLocaleString('ar-EG')} ج.م
                  </div>
                  {!item.productIsActive && (
                    <span className="badge badge-error" style={{ marginTop: 'var(--space-2)' }}>المنتج غير متاح</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="quantity-control">
                    <button className="quantity-control__btn" onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}>
                      <Minus size={14} />
                    </button>
                    <input className="quantity-control__value" type="text" value={item.quantity} readOnly />
                    <button className="quantity-control__btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                      <Plus size={14} />
                    </button>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => removeItem(item.id)}>
                    <Trash2 size={16} style={{ color: 'var(--error-500)' }} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div style={{ flex: '0 0 320px' }}>
          <div className="card card-body">
            <h3 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>ملخص الطلب</h3>
            <div className="flex justify-between mb-2">
              <span className="text-muted">المجموع الفرعي</span>
              <span style={{ fontWeight: 600 }}>{parseFloat(cart.subtotal).toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-muted">الشحن</span>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>يُحسب عند الدفع</span>
            </div>
            <hr className="divider" />
            <div className="flex justify-between mb-6">
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)' }}>الإجمالي</span>
              <span style={{ fontWeight: 700, fontSize: 'var(--font-size-lg)', color: 'var(--brand-600)' }}>
                {parseFloat(cart.subtotal).toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: '100%' }} onClick={() => navigate('/checkout')}>
              إتمام الشراء
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
