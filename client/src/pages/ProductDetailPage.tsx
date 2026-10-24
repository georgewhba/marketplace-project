import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { storeApi, cartApi, wishlistApi, reviewApi } from '../api';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { useLanguage } from '../i18n';
import { StarRating } from '../components/ProductCard';
import { ShoppingCart, Heart, ChevronLeft, ChevronRight, Minus, Plus, Store, Gem, Sparkles, Star } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ProductDetailPage() {
  const { t, isRTL, formatPrice, translateCategory } = useLanguage();
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

  const [reviewForm, setReviewForm] = useState<{ rating: number; title: string; comment: string; orderItemId?: number }>({
    rating: 5,
    title: '',
    comment: '',
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  const BreadcrumbChevron = isRTL ? ChevronLeft : ChevronRight;

  useDocumentTitle(product?.name, {
    description: product?.description ? product.description.slice(0, 160) : undefined,
    canonicalPath: `/products/${slug}`,
  });

  const loadProduct = () => {
    if (!slug) return;
    setLoading(true);
    storeApi.getProduct(slug)
      .then(res => setProduct((res as any).data || res))
      .catch(() => toast.error('Failed to load product'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadProduct();
  }, [slug]);

  const handleAddToCart = async () => {
    if (!user) {
      toast.info(t('product.loginFirst'));
      return;
    }
    setAddingToCart(true);
    try {
      await cartApi.addItem(product.id, quantity);
      qc.invalidateQueries({ queryKey: ['cart'] });
      toast.success(t('product.addedToCart'));
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.info(t('product.loginFirst'));
      return;
    }
    setSubmittingReview(true);
    try {
      await reviewApi.createReview({
        productId: product.id,
        ...(reviewForm.orderItemId ? { orderItemId: reviewForm.orderItemId } : {}),
        rating: reviewForm.rating,
        title: reviewForm.title || undefined,
        comment: reviewForm.comment || undefined,
      });
      toast.success('Review submitted');
      setReviewForm({ rating: 5, title: '', comment: '' });
      loadProduct();
    } catch (e: any) {
      toast.error(e.message || 'Failed to submit review');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleWishlist = async () => {
    if (!user) {
      toast.info(t('product.loginFirst'));
      return;
    }
    try {
      const res = (await wishlistApi.toggle(product.id)) as any;
      const data = res.data || res;
      toast.success(data.wishlisted ? 'Added to wishlist' : 'Removed from wishlist');
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

  if (!product) {
    return (
      <div className="container page-content">
        <div className="empty-state">
          <div className="empty-state__title">{t('catalog.noProducts')}</div>
        </div>
      </div>
    );
  }

  const price = parseFloat(product.price);
  const comparePrice = product.comparePrice ? parseFloat(product.comparePrice) : null;
  const discount = comparePrice && comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : null;
  const images = product.images || [];
  const isOutOfStock = product.stock <= 0;

  return (
    <div className="container page-content">
      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link to="/">{t('nav.home')}</Link>
        <BreadcrumbChevron size={14} className="breadcrumb__separator" />
        <Link to="/products">{t('nav.products')}</Link>
        {product.category && (
          <>
            <BreadcrumbChevron size={14} className="breadcrumb__separator" />
            <Link to={`/products?category=${product.category.slug}`}>
              {translateCategory(product.category.name, product.category.slug)}
            </Link>
          </>
        )}
        <BreadcrumbChevron size={14} className="breadcrumb__separator" />
        <span>{product.name}</span>
      </div>

      <div className="flex gap-8 flex-wrap">
        {/* Images */}
        <div className="w-full md:w-[460px] shrink-0" style={{ maxWidth: '100%' }}>
          <div className="card mb-3">
            <div className="relative overflow-hidden bg-[var(--bg-surface-2)]" style={{ aspectRatio: '1' }}>
              <AnimatePresence mode="wait">
                <motion.img
                  key={selectedImage}
                  src={images[selectedImage]?.imageUrl || images[selectedImage]?.url || 'https://picsum.photos/seed/fallback/800/800'}
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
            <div className="flex gap-2 flex-wrap">
              {images.map((img: any, i: number) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  aria-label={`Image ${i + 1}`}
                  className={`overflow-hidden rounded-lg cursor-pointer border-2 transition-all ${
                    i === selectedImage ? 'border-[var(--brand-500)]' : 'border-[var(--border-color)]'
                  }`}
                  style={{ width: 68, height: 68 }}
                >
                  <img src={img.imageUrl || img.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold mb-3">{product.name}</h1>

          {/* Rating */}
          <div className="flex items-center flex-wrap gap-3 mb-4">
            <StarRating rating={parseFloat(product.rating || '0')} />
            <span className="text-sm text-muted">
              ({product.reviewCount || 0} {t('product.reviews')})
            </span>
          </div>

          {/* Price */}
          <div className="flex items-center flex-wrap gap-3 mb-6">
            <span className="text-3xl font-bold text-[var(--brand-600)]">
              {formatPrice(price)}
            </span>
            {comparePrice && comparePrice > price && (
              <>
                <span className="price-tag--original text-lg">
                  {formatPrice(comparePrice)}
                </span>
                <span className="badge badge-error ltr">-{discount}%</span>
              </>
            )}
          </div>

          {/* Stock */}
          <div className="mb-6">
            {isOutOfStock ? (
              <span className="badge badge-error"><span className="badge-dot" /> {t('product.outOfStock')}</span>
            ) : (
              <span className="badge badge-success"><span className="badge-dot" /> {t('product.inStock')} ({product.stock})</span>
            )}
          </div>

          {/* Quantity & Add to cart */}
          {!isOutOfStock && (
            <div className="flex items-center flex-wrap gap-4 mb-6">
              <div className="quantity-control">
                <button className="quantity-control__btn" aria-label="Decrease" onClick={() => setQuantity(q => Math.max(1, q - 1))}>
                  <Minus size={16} />
                </button>
                <input className="quantity-control__value" type="text" value={quantity} readOnly aria-label="Quantity" />
                <button className="quantity-control__btn" aria-label="Increase" onClick={() => setQuantity(q => Math.min(product.stock, q + 1))}>
                  <Plus size={16} />
                </button>
              </div>
              <button className="btn btn-primary btn-lg" onClick={handleAddToCart} disabled={addingToCart}>
                <ShoppingCart size={18} />
                {t('product.addToCart')}
              </button>
              <button className="btn btn-secondary btn-lg" style={{ padding: '0.85rem' }} aria-label={t('nav.wishlist')} onClick={handleWishlist}>
                <Heart size={20} />
              </button>
            </div>
          )}

          {/* Vendor */}
          {product.vendor && (
            <div className="card p-4 mb-6">
              <Link to={`/store/${product.vendor.storeSlug}`} className="flex items-center gap-3 no-underline">
                <div className="flex items-center justify-center rounded-lg bg-[var(--brand-50)]" style={{ width: 44, height: 44 }}>
                  <Store size={20} className="text-[var(--brand-500)]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold text-[var(--text-primary)]">{product.vendor.storeName}</div>
                    {product.vendor.subscriptionPlanSlug === 'pro' && (
                      <span className="badge badge-brand flex items-center gap-1" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        {t('nav.proBadge')} <Gem size={12} />
                      </span>
                    )}
                    {product.vendor.subscriptionPlanSlug === 'plus' && (
                      <span className="badge badge-info flex items-center gap-1" style={{ fontSize: '0.7rem', padding: '2px 6px' }}>
                        {t('nav.plusBadge')} <Sparkles size={12} />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted mt-1">
                    <StarRating rating={parseFloat(product.vendor.rating || '0')} size={12} />
                    <span>({product.vendor.reviewCount} {t('product.reviews')})</span>
                  </div>
                </div>
              </Link>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <motion.div
              className="mt-4"
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: motionTokens.duration.base }}
            >
              <p className="text-base text-[var(--text-secondary)] leading-relaxed">
                {product.description}
              </p>
            </motion.div>
          )}
        </div>
      </div>

      {/* Reviews */}
      <motion.section
        className="mt-12"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-50px' }}
        transition={{ duration: motionTokens.duration.base }}
      >
        <h2 className="text-xl font-bold mb-6">
          {t('product.reviews')} ({product.reviewCount || 0})
        </h2>

        {user && user.role === 'customer' && (
          <form onSubmit={handleSubmitReview} className="card card-body mb-6">
            <div className="flex items-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  aria-label={`${star} stars`}
                  onClick={() => setReviewForm(prev => ({ ...prev, rating: star }))}
                  className="btn btn-ghost p-1"
                >
                  <Star size={20} fill={star <= reviewForm.rating ? 'var(--accent-500)' : 'none'} color="var(--accent-500)" />
                </button>
              ))}
            </div>
            <div className="form-group mb-3">
              <input
                className="form-input"
                placeholder="..."
                value={reviewForm.title}
                onChange={e => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="form-group mb-3">
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="..."
                value={reviewForm.comment}
                onChange={e => setReviewForm(prev => ({ ...prev, comment: e.target.value }))}
              />
            </div>
            <button type="submit" className="btn btn-primary btn-sm" disabled={submittingReview}>
              {t('catalog.applyFilter')}
            </button>
          </form>
        )}

        {product.reviews && product.reviews.length > 0 && (
          <div className="flex flex-col gap-4">
            {product.reviews.map((review: any) => (
              <div key={review.id} className="card card-body">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} size={14} />
                    {review.title && <strong className="text-sm">{review.title}</strong>}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-[var(--text-secondary)] mb-2">
                    {review.comment}
                  </p>
                )}
                {review.vendorReply && (
                  <div className="mt-3 p-3 bg-[var(--bg-surface-2)] rounded-md text-sm">
                    {review.vendorReply}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </div>
  );
}
