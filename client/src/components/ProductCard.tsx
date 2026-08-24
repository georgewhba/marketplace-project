import { Star, ShoppingCart, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useState } from 'react';
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
    images?: { imageUrl: string; altText?: string }[];
    productImage?: string | null;
  };
  onAddToCart?: (id: number) => void;
  onToggleWishlist?: (id: number) => void;
}

export function ProductCard({ product, onAddToCart, onToggleWishlist }: ProductCardProps) {
  const price = parseFloat(product.price);
  const comparePrice = product.comparePrice ? parseFloat(product.comparePrice) : null;
  const discount = comparePrice ? Math.round((1 - price / comparePrice) * 100) : null;
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
    
    // Subtle tilt: max 2 degrees
    const rotateX = ((y - centerY) / centerY) * -2;
    const rotateY = ((x - centerX) / centerX) * 2;
    
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
        ease: motionTokens.easing.decelerate 
      } 
    }
  };

  return (
    <motion.div 
      className="product-card" 
      variants={itemVariants}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ 
        rotateX: tiltStyle.rotateX, 
        rotateY: tiltStyle.rotateY 
      }}
      transition={{ 
        type: 'spring', 
        stiffness: 400, 
        damping: 30, 
        mass: 0.5 
      }}
      style={{ perspective: '1000px', transformStyle: 'preserve-3d' }}
    >
      <Link to={`/products/${product.slug}`}>
        <motion.div 
          className="product-card__image-wrap"
          whileHover={{ scale: shouldReduceMotion ? 1 : 1.02 }}
          transition={{ duration: motionTokens.duration.fast, ease: motionTokens.easing.standard }}
        >
          <img src={imageUrl} alt={product.name} className="product-card__image" loading="lazy" />
          {discount && <span className="product-card__discount">-{discount}%</span>}
          {isOutOfStock && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(34, 28, 22, 0.65)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '1rem', fontWeight: 700,
              letterSpacing: '0.05em'
            }}>
              نفذ من المخزون
            </div>
          )}
        </motion.div>
      </Link>

      {onToggleWishlist && (
        <button className="product-card__wishlist" onClick={() => onToggleWishlist(product.id)}>
          <Heart size={16} />
        </button>
      )}

      {onAddToCart && !isOutOfStock && (
        <button className="product-card__add-btn" onClick={() => onAddToCart(product.id)}>
          <ShoppingCart size={16} />
          أضف للسلة
        </button>
      )}

      <Link to={`/products/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
        <div className="product-card__body">
          <div className="product-card__name">{product.name}</div>
          <div className="product-card__price-row">
            <span className="product-card__price">{price.toLocaleString('ar-EG')} ج.م</span>
            {comparePrice && (
              <span className="product-card__compare-price">{comparePrice.toLocaleString('ar-EG')}</span>
            )}
          </div>
          {rating > 0 && (
            <div className="product-card__rating">
              <div className="product-card__stars">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} size={14} fill={i <= Math.round(rating) ? 'currentColor' : 'none'} />
                ))}
              </div>
              <span>({product.reviewCount || 0})</span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="product-card">
      <div className="skeleton skeleton-image" />
      <div style={{ padding: '1rem' }}>
        <div className="skeleton skeleton-title" />
        <div className="skeleton skeleton-text" style={{ width: '40%' }} />
        <div className="skeleton skeleton-text" style={{ width: '30%' }} />
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
