import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { storeApi, cartApi, wishlistApi } from '../api';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { StarRating } from '../components/ProductCard';
import { ShoppingCart, Heart, ChevronLeft, Minus, Plus, Store, Gem, Sparkles } from 'lucide-react';

export default function ProductDetailPage() {
  const shouldReduceMotion = useReducedMotion();
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
  const qc = useQueryClient();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    storeApi.getProduct(slug)
      .then(res => setProduct((res as any).data || res))
      .catch(() => toast.error('فشل تحميل المنتج'))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleAddToCart = async () => {
    if (!user) { toast.info('سجّل الدخول أولاً'); return; }
    setAddingToCart(true);
    try {
      await cartApi.addItem(product.id, quantity);
      toast.success('تمت الإضافة للسلة');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) { toast.info('سجّل الدخول أولاً'); return; }
    try {
      const res = await wishlistApi.toggle(product.id) as any;
      const data = res.data || res;
      toast.success(data.wishlisted ? 'تمت الإضافة للمفضلة' : 'تمت الإزالة من المفضلة');
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="container page-content">
        <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
          <div className="skeleton" style={{ width: '100%', maxWidth: 500, height: 400 }} />
          <div style={{ flex: 1 }}>
            <div className="skeleton skeleton-title" style={{ width: '80%' }} />
            <div className="skeleton skeleton-text" style={{ width: '40%' }} />
            <div className="skeleton skeleton-text" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  if (!product) return <div className="container page-content"><div className="empty-state"><div className="empty-state__title">المنتج غير موجود</div></div></div>;

  const price = parseFloat(product.price);
  const comparePrice = product.comparePrice ? parseFloat(product.comparePrice) : null;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : null;
  const images = product.images || [];
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="container page-content">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">الرئيسية</Link>
        <ChevronLeft size={14} className="breadcrumb__separator" />
        <Link to="/products">المنتجات</Link>
        {product.category && (
          <>
            <ChevronLeft size={14} className="breadcrumb__separator" />
            <Link to={`/products?category=${product.category.slug}`}>{product.category.name}</Link>
          </>
        )}
        <ChevronLeft size={14} className="breadcrumb__separator" />
        <span>{product.name}</span>
      </div>

      <div className="flex gap-8 flex-wrap">
        {/* Images */}
        <div className="w-full md:w-[480px] shrink-0" style={{ maxWidth: '100%' }}>
          <div className="card mb-3">
            <div className="relative overflow-hidden" style={{ aspectRatio: '1' }}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  src={images[selectedImage]?.imageUrl || 'https://picsum.photos/seed/fallback/800/800'}
                  alt={product.name}
                  className="w-full h-full object-cover"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: motionTokens.duration.base }}
                />
              </AnimatePresence>
            </div>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={`overflow-hidden rounded-md cursor-pointer border ${i === selectedImage ? 'border-primary' : 'border-neutral-200'}`}
                  style={{ width: 72, height: 72 }}
                >
                  <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-3">
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center flex-wrap gap-3 mb-4">
            <StarRating rating={parseFloat(product.rating || '0')} />
            <span className="text-sm text-muted">
              ({product.reviewCount || 0} تقييم)
            </span>
            <span className="text-sm text-muted">
              | {product.totalSold || 0} مبيع
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center flex-wrap gap-3 mb-6">
            <span className="text-3xl font-bold text-primary">
              {price.toLocaleString('ar-EG')} ج.م
            </span>
            {comparePrice && (
              <>
                <span className="price-tag--original text-lg">
                  {comparePrice.toLocaleString('ar-EG')}
                </span>
                <span className="badge badge-error">خصم {discount}%</span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6">
            {isOutOfStock ? (
              <span className="badge badge-error"><span className="badge-dot" /> نفذ من المخزون</span>
            ) : product.stock <= 5 ? (
              <span className="badge badge-warning"><span className="badge-dot" /> متبقي {product.stock} فقط</span>
            ) : (
              <span className="badge badge-success"><span className="badge-dot" /> متوفر</span>
            )}
          </div>

          {/* Quantity & Add to cart */}
          {!isOutOfStock && (
            <div className="flex items-center flex-wrap gap-4 mb-6">
              <div className="quantity-control">
                <button className="quantity-control__btn" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Minus size={16} />
                </button>
                <input className="quantity-control__value" type="text" value={quantity} readOnly />
                <button className="quantity-control__btn" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>
                  <Plus size={16} />
                </button>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleAddToCart} disabled={addingToCart}>
                <ShoppingCart size={18} />
                {addingToCart ? 'جارٍ الإضافة...' : 'أضف للسلة'}
              </button>
              <button className="btn btn-ghost btn-lg p-4" onClick={handleWishlist}>
                <Heart size={20} />
              </button>
            </div>
          )}

          {/* Vendor */}
          {product.vendor && (
            <div className="card p-4">
              <Link to={`/store/${product.vendor.storeSlug}`} className="flex items-center gap-3 no-underline">
                <div className="flex items-center justify-center rounded-md bg-primary-50" style={{ width: 44, height: 44 }}>
                  <Store size={20} className="text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-primary-dark">{product.vendor.storeName}</div>
                    {product.vendor.subscriptionPlanSlug === 'pro' && (
                      <span className="badge badge-pro flex items-center gap-1" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        برو <Gem size={12} />
                      </span>
                    )}
                    {product.vendor.subscriptionPlanSlug === 'plus' && (
                      <span className="badge badge-plus flex items-center gap-1" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        بلس <Sparkles size={12} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted mt-1">
                    <StarRating rating={parseFloat(product.vendor.rating || '0')} size={12} />
                    <span>({product.vendor.reviewCount} تقييم)</span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <motion.div 
              className="mt-6"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.decelerate }}
            >
              <h3 className="text-base font-semibold mb-3">وصف المنتج</h3>
              <p className="text-base text-secondary leading-relaxed">
                {product.description}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {product.reviews && product.reviews.length > 0 && (
        <motion.section 
          className="mt-12"
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: motionTokens.duration.slow, ease: motionTokens.easing.decelerate }}
        >
          <h2 className="text-xl font-bold mb-6">
            التقييمات ({product.reviewCount})
          </h2>
          <div className="flex flex-col gap-4">
            {product.reviews.map((review: any) => (
              <div key={review.id} className="card card-body">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size={14} />
                    {review.title && <strong className="text-sm">{review.title}</strong>}
                  </div>
                  {review.isVerifiedPurchase && (
                    <span className="badge badge-success">مشتري مؤكد</span>
                  )}
                </div>
                {review.comment && (
                  <p className="text-sm text-secondary mb-2">
                    {review.comment}
                  </p>
                )}
                {review.vendorReply && (
                  <div className="mt-3 p-3 bg-surface-2 rounded-md text-sm">
                    <strong className="text-primary">رد البائع: </strong>
                    {review.vendorReply}
                  </div>
                )}
                <div className="text-xs text-muted mt-2">
                  {new Date(review.createdAt).toLocaleDateString('ar-EG')}
                </div>
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </div>
  );
}
