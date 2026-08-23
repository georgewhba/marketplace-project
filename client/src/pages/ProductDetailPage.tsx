import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { storeApi, cartApi, wishlistApi } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { StarRating } from '../components/ProductCard';
import { ShoppingCart, Heart, ChevronLeft, Minus, Plus, Store } from 'lucide-react';

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const toast = useToast();
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
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (loading) {
    return (
      <div className="container page-content">
        <div className="flex gap-6" style={{ flexWrap: 'wrap' }}>
          <div className="skeleton" style={{ width: 500, height: 400 }} />
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

      <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
        {/* Images */}
        <div style={{ flex: '0 0 480px', maxWidth: '100%' }}>
          <div className="card" style={{ marginBottom: 'var(--space-3)' }}>
            <div style={{ aspectRatio: '1', overflow: 'hidden' }}>
              <img
                src={images[selectedImage]?.imageUrl || 'https://picsum.photos/seed/fallback/800/800'}
                alt={product.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
          {images.length > 1 && (
            <div className="flex gap-2">
              {images.map((img: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  style={{
                    width: 72, height: 72, borderRadius: 'var(--radius-md)',
                    overflow: 'hidden', cursor: 'pointer',
                    border: i === selectedImage ? '2px solid var(--brand-500)' : '1px solid var(--border-color)',
                  }}
                >
                  <img src={img.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 300 }}>
          <h1 style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
            {product.name}
          </h1>

          {/* Rating */}
          <div className="flex items-center gap-3 mb-4">
            <StarRating rating={parseFloat(product.rating || '0')} />
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              ({product.reviewCount || 0} تقييم)
            </span>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)' }}>
              | {product.totalSold || 0} مبيع
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center gap-3 mb-6">
            <span style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 700, color: 'var(--brand-600)' }}>
              {price.toLocaleString('ar-EG')} ج.م
            </span>
            {comparePrice && (
              <>
                <span className="price-tag--original" style={{ fontSize: 'var(--font-size-lg)' }}>
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
            <div className="flex items-center gap-4 mb-6">
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
              <button className="btn btn-ghost btn-lg" onClick={handleWishlist} style={{ padding: 'var(--space-4)' }}>
                <Heart size={20} />
              </button>
            </div>
          )}

          {/* Vendor */}
          {product.vendor && (
            <div className="card" style={{ padding: 'var(--space-4)' }}>
              <Link to={`/store/${product.vendor.storeSlug}`} className="flex items-center gap-3" style={{ textDecoration: 'none' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 'var(--radius-md)',
                  background: 'var(--brand-50)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Store size={20} style={{ color: 'var(--brand-500)' }} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{product.vendor.storeName}</div>
                  <div className="flex items-center gap-2" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                    <StarRating rating={parseFloat(product.vendor.rating || '0')} size={12} />
                    <span>({product.vendor.reviewCount} تقييم)</span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div style={{ marginTop: 'var(--space-6)' }}>
              <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 600, marginBottom: 'var(--space-3)' }}>وصف المنتج</h3>
              <p style={{ fontSize: 'var(--font-size-base)', color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                {product.description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Reviews */}
      {product.reviews && product.reviews.length > 0 && (
        <section style={{ marginTop: 'var(--space-12)' }}>
          <h2 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>
            التقييمات ({product.reviewCount})
          </h2>
          <div className="flex flex-col gap-4">
            {product.reviews.map((review: any) => (
              <div key={review.id} className="card card-body">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size={14} />
                    {review.title && <strong style={{ fontSize: 'var(--font-size-sm)' }}>{review.title}</strong>}
                  </div>
                  {review.isVerifiedPurchase && (
                    <span className="badge badge-success">مشتري مؤكد</span>
                  )}
                </div>
                {review.comment && (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                    {review.comment}
                  </p>
                )}
                {review.vendorReply && (
                  <div style={{
                    marginTop: 'var(--space-3)', padding: 'var(--space-3)',
                    background: 'var(--bg-surface-2)', borderRadius: 'var(--radius-md)',
                    fontSize: 'var(--font-size-sm)',
                  }}>
                    <strong style={{ color: 'var(--brand-600)' }}>رد البائع: </strong>
                    {review.vendorReply}
                  </div>
                )}
                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-2)' }}>
                  {new Date(review.createdAt).toLocaleDateString('ar-EG')}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
