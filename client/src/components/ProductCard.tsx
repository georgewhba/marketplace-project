import { Star, ShoppingCart, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useState } from 'react';
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
  const [tiltStyle, setTiltStyle] = useState({ rotateX: 0, rotateY: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (shouldReduceMotion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -1.8;
    const rotateY = ((x - centerX) / centerX) * 1.8;

    setTiltStyle({ rotateX, rotateY });
  };

  const handleMouseLeave = () => {
    setTiltStyle({ rotateX: 0, rotateY: 0 });
  };

  const itemVariants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
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
    <motion.div
      className="product-card"
      variants={itemVariants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{
        rotateX: tiltStyle.rotateX,
        rotateY: tiltStyle.rotateY,
      }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 30,
        mass: 0.5,
      }}
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      <div className="product-card__image-wrap">
        <Link to={`/products/${product.slug}`} style={{ display: 'block', width: '100%', height: '100%' }}>
          <img src={imageUrl} alt={product.name} className="product-card__image" loading="lazy" />
        </Link>

        <div className="product-card__badges">
          {discount && <span className="product-card__discount ltr">-{discount}%</span>}
          {product.isFeatured && !discount && (
            <span className="product-card__featured-badge">
              <Sparkles size={11} /> {t('product.featured')}
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

        {onAddToCart && !isOutOfStock && (
          <button
            type="button"
            className="product-card__add-btn"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onAddToCart(product.id);
            }}
          >
            <ShoppingCart size={16} />
            <span>{t('product.addToCart')}</span>
          </button>
        )}
      </div>

      <Link to={`/products/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div className="product-card__body">
          {rating > 0 && (
            <div className="product-card__rating">
              <div className="product-card__stars">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={13} fill={i <= Math.round(rating) ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span className="product-card__rating-num ltr">{rating.toFixed(1)}</span>
              <span className="product-card__review-count">({product.reviewCount || 0})</span>
            </div>
          )}

          <div className="product-card__name">{product.name}</div>

          <div className="product-card__footer">
            <div className="product-card__price-row">
              <span className="product-card__price">{formatPrice(price)}</span>
              {comparePrice && comparePrice > price && (
                <span className="product-card__compare-price">{formatPrice(comparePrice)}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card">
      <div className="skeleton skeleton-image" />
      <div style={{ padding: '1.25rem' }}>
        <div className="skeleton skeleton-text" style={{ width: '35%', marginBottom: 10 }} />
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
