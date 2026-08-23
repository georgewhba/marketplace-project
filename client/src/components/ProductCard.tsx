import { Star, ShoppingCart, Heart } from 'lucide-react';
import { Link } from 'react-router-dom';

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

  return (
    <div className="product-card">
      <Link to={`/products/${product.slug}`}>
        <div className="product-card__image-wrap">
          <img src={imageUrl} alt={product.name} className="product-card__image" loading="lazy" />
          {discount && <span className="product-card__discount">-{discount}%</span>}
          {isOutOfStock && (
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: '0.875rem', fontWeight: 600,
            }}>
              نفذ من المخزون
            </div>
          )}
        </div>
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
    </div>
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
