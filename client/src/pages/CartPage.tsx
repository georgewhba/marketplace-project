import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { cartApi } from '../api';
import { useToast } from '../toast';
import { Trash2, Minus, Plus, ShoppingBag, ArrowLeft } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function CartPage() {
  useDocumentTitle('سلة المشتريات', { canonicalPath: '/cart' });
  const shouldReduceMotion = useReducedMotion();
  const toast = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [cart, setCart] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchCart = async () => {
    try {
      const res = (await cartApi.getCart()) as any;
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
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      fetchCart();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const removeItem = async (itemId: number) => {
    try {
      await cartApi.removeItem(itemId);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('تم الحذف');
      fetchCart();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const clearCart = async () => {
    try {
      await cartApi.clearCart();
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success('تم تفريغ السلة');
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
    <div className="container page-content" style={{ overflowX: 'hidden' }}>
      <div className="flex justify-between items-center mb-8 flex-wrap gap-3">
        <h1 className="page-header__title m-0">سلة التسوق ({items.length} منتج)</h1>
        <button className="btn btn-ghost btn-sm text-red-500" onClick={clearCart}>
          <Trash2 size={16} /> تفريغ السلة
        </button>
      </div>

      <motion.div
        className="flex gap-8 flex-wrap items-start"
        initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: motionTokens.duration.slow, ...motionTokens.easing.spring }}
      >
        {/* Items */}
        <div className="w-full lg:flex-1 shrink-0 lg:min-w-[500px]">
          {items.map((item: any) => (
            <div key={item.id} className="card mb-4 p-4">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <img
                  src={item.productImage || 'https://picsum.photos/seed/fallback/100/100'}
                  alt={item.productName}
                  className="rounded-md object-cover"
                  style={{ width: 80, height: 80 }}
                />
                <div className="flex-1">
                  <Link to={`/products/${item.productSlug}`} className="font-semibold text-primary-dark no-underline">
                    {item.productName}
                  </Link>
                  <div className="text-lg font-bold text-primary mt-2">
                    {parseFloat(item.productPrice).toLocaleString('ar-EG')} ج.م
                  </div>
                  {!item.productIsActive && (
                    <span className="badge badge-error mt-2">المنتج غير متاح</span>
                  )}
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start mt-3 sm:mt-0">
                  <div className="quantity-control">
                    <button
                      className="quantity-control__btn"
                      aria-label="تقليل الكمية"
                      onClick={() => updateQuantity(item.id, Math.max(1, item.quantity - 1))}
                    >
                      <Minus size={14} />
                    </button>
                    <input className="quantity-control__value" type="text" value={item.quantity} readOnly aria-label="الكمية" />
                    <button
                      className="quantity-control__btn"
                      aria-label="زيادة الكمية"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    aria-label="حذف المنتج من السلة"
                    onClick={() => removeItem(item.id)}
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="w-full lg:w-[320px] shrink-0">
          <div className="card card-body">
            <h3 className="text-lg font-semibold mb-4">ملخص الطلب</h3>
            <div className="flex justify-between mb-2">
              <span className="text-muted">المجموع الفرعي</span>
              <span className="font-semibold">{parseFloat(cart.subtotal).toLocaleString('ar-EG')} ج.م</span>
            </div>
            <div className="flex justify-between mb-4">
              <span className="text-muted">الشحن</span>
              <span className="text-sm text-muted">يُحسب عند الدفع</span>
            </div>
            <hr className="divider" />
            <div className="flex justify-between mb-6">
              <span className="font-bold text-lg">الإجمالي</span>
              <span className="font-bold text-lg text-primary">
                {parseFloat(cart.subtotal).toLocaleString('ar-EG')} ج.م
              </span>
            </div>
            <button className="btn btn-primary btn-lg w-full" onClick={() => navigate('/checkout')}>
              إتمام الشراء
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
