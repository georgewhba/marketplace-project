import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { wishlistApi, cartApi } from '../api';
import { useToast } from '../toast';
import { useLanguage } from '../i18n';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';

interface WishlistItem {
  id: number;
  product: {
    id: number;
    name: string;
    slug: string;
    price: string;
    compareAtPrice: string | null;
    images: { url: string; imageUrl?: string }[];
  };
}

export default function WishlistPage() {
  const { addToast } = useToast();
  const { formatPrice, translateProductName } = useLanguage();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: wishlistApi.getWishlist,
  });

  const items: WishlistItem[] = Array.isArray(data?.data) ? data.data : [];

  const removeMutation = useMutation({
    mutationFn: (productId: number) => wishlistApi.remove(productId),
    onSuccess: () => {
      addToast('تمت الإزالة من المفضلة', 'success');
      qc.invalidateQueries({ queryKey: ['wishlist'] });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: (productId: number) => cartApi.addItem(productId, 1),
    onSuccess: () => {
      addToast('تمت الإضافة للسلة', 'success');
      qc.invalidateQueries({ queryKey: ['cart'] });
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  return (
    <div className="container page-content">
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <Heart size={26} style={{ color: 'var(--brand-500)', fill: 'var(--brand-500)' }} />
          <h1 className="page-header__title m-0">المفضلة</h1>
          <span className="catalog-count-badge">({items.length} منتج)</span>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 320 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Heart size={56} className="empty-state__icon" />
          <div className="empty-state__title">المفضلة فارغة</div>
          <p className="empty-state__description">أضف منتجات إلى المفضلة لتجدها بسهولة لاحقاً</p>
          <Link to="/products" className="btn btn-primary btn-md">تصفح المنتجات</Link>
        </div>
      ) : (
        <div className="grid grid-4">
          {items.map(item => {
            const p = item?.product;
            if (!p) return null;
            const price = parseFloat(p.price || '0');
            const comparePrice = p.compareAtPrice ? parseFloat(p.compareAtPrice) : 0;
            const hasDiscount = comparePrice > price;
            const imgUrl = p.images?.[0]?.url || p.images?.[0]?.imageUrl;
            return (
              <div key={item.id} className="product-card">
                <Link to={`/products/${p.slug}`} className="block">
                  <div className="product-card__image-wrap">
                    {imgUrl ? (
                      <img src={imgUrl} alt={p.name} className="product-card__image" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted">
                        <ShoppingCart size={32} />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="product-card__body">
                  <Link to={`/products/${p.slug}`} className="product-card__name-link">
                    <h4 className="product-card__name">{translateProductName(p.name)}</h4>
                  </Link>
                  <div className="product-card__footer">
                    <div className="product-card__price-col">
                      <span className="product-card__price">{formatPrice(price)}</span>
                      {hasDiscount && (
                        <span className="product-card__compare-price">
                          {formatPrice(comparePrice)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="product-card__cart-action"
                        onClick={() => addToCartMutation.mutate(p.id)}
                        disabled={addToCartMutation.isPending}
                      >
                        <ShoppingCart size={14} /> أضف للسلة
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        style={{ color: 'var(--error-500)' }}
                        title="إزالة من المفضلة"
                        aria-label="إزالة من المفضلة"
                        onClick={() => removeMutation.mutate(p.id)}
                        disabled={removeMutation.isPending}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
