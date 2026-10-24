import { Star, ShoppingCart, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useLanguage } from '../i18n';

interface ProductCardProps {
  product: {
    id: number;
    name: string;
    slug: string;
    price: string;
    comparePrice?: string | null;
    rating?: string;
    reviewCount?: number;
    stock?: number;
    isFeatured?: boolean;
    images?: { imageUrl: string; altText?: string }[];
    productImage?: string | null;
  };
  onAddToCart?: (id: number) => void;
  onToggleWishlist?: (id: number) => void;
}

export function ProductCard({ product, onAddToCart, onToggleWishlist }: ProductCardProps) {
  const { t, formatPrice } = useLanguage();
  const price = parseFloat(product.price);
  const comparePrice = product.comparePrice ? parseFloat(product.comparePrice) : null;
  const discount = comparePrice && comparePrice > price ? Math.round((1 - price / comparePrice) * 100) : null;
  const imageUrl = product.images?.[0]?.imageUrl || product.productImage || 'https://picsum.photos/seed/fallback/400/300';
  const rating = product.rating ? parseFloat(product.rating) : 0;
  const isOutOfStock = product.stock !== undefined && product.stock <= 0;

  const shouldReduceMotion = useReducedMotion();

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: motionTokens.duration.fast,
        ease: motionTokens.easing.decelerate,
      },
    },
  };

  return (
    <motion.article className="product-card" variants={itemVariants}>
      <div className="product-card__image-wrap">
        <Link to={`/products/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
          <img src={imageUrl} alt={product.name} className="product-card__image" loading="lazy" />
        </Link>

        <div className="product-card__badges">
          {discount && <span className="product-card__discount ltr">-{discount}%</span>}
          {product.isFeatured && !discount && (
            <span className="product-card__featured-badge">
              {t('product.featured')}
            </span>
          )}
        </div>

        {onToggleWishlist && (
          <button
            type="button"
            className="product-card__wishlist"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleWishlist(product.id);
            }}
            aria-label={t('nav.wishlist')}
          >
            <Heart size={16} />
          </button>
        )}

        {isOutOfStock && (
          <div className="product-card__out-of-stock">
            <span>{t('product.outOfStock')}</span>
          </div>
        )}
      </div>

      <div className="product-card__body">
        {rating > 0 && (
          <div className="product-card__rating">
            <Star size={13} fill="var(--accent-500)" color="var(--accent-500)" />
            <span className="product-card__rating-num ltr">{rating.toFixed(1)}</span>
            <span className="product-card__review-count">({product.reviewCount || 0})</span>
          </div>
        )}

        <Link to={`/products/${product.slug}`} className="product-card__name-link">
          <h3 className="product-card__name">{product.name}</h3>
        </Link>

        <div className="product-card__footer">
          <div className="product-card__price-col">
            <span className="product-card__price">{formatPrice(price)}</span>
            {comparePrice && comparePrice > price && (
              <span className="product-card__compare-price">{formatPrice(comparePrice)}</span>
            )}
          </div>

          {onAddToCart && !isOutOfStock && (
            <button
              type="button"
              className="product-card__cart-action"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onAddToCart(product.id);
              }}
              aria-label={t('product.addToCart')}
              title={t('product.addToCart')}
            >
              <ShoppingCart size={16} />
              <span>{t('product.addToCart')}</span>
            </button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card">
      <div className="skeleton skeleton-image" />
      <div style={{ padding: '1rem' }}>
        <div className="skeleton skeleton-text" style={{ width: '35%', marginBottom: 8 }} />
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: '50%' }} />
      </div>
    </div>
  );
}

export function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="star-rating">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          size={size}
          className={`star-rating__star ${i <= Math.round(rating) ? 'filled' : ''}`}
          fill={i <= Math.round(rating) ? 'currentColor' : 'none'}
        />
      ))}
    </div>
  );
}
