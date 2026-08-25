import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { wishlistApi } from '../api';
import { useToast } from '../toast';
import { Heart, Trash2, ShoppingCart } from 'lucide-react';

interface WishlistItem {
  id: number;
  product: {
    id: number;
    name: string;
    slug: string;
    price: string;
    compareAtPrice: string | null;
    images: { url: string }[];
  };
}

export default function WishlistPage() {
  const { addToast } = useToast();
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

  return (
    <div className="container page-content">
      <div className="flex items-center gap-3 mb-6">
        <Heart size={24} style={{ color: 'var(--primary-500)', fill: 'var(--primary-500)' }} />
        <h1 className="m-0 text-2xl font-bold">المفضلة</h1>
        <span className="text-sm text-muted">({items.length} منتج)</span>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 280 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <Heart size={48} className="text-muted" />
          <div className="empty-state__title mt-4">المفضلة فارغة</div>
          <p className="text-muted mb-4">أضف منتجات إلى المفضلة لتجدها بسهولة لاحقاً</p>
          <Link to="/products" className="btn btn-primary">تصفح المنتجات</Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {items.map(item => {
            const p = item?.product;
            if (!p) return null;
            const price = parseFloat(p.price || '0');
            const comparePrice = p.compareAtPrice ? parseFloat(p.compareAtPrice) : 0;
            const hasDiscount = comparePrice > price;
            return (
              <div key={item.id} className="card product-card overflow-hidden">
                <Link to={`/products/${p.slug}`} className="block">
                  <div className="bg-neutral-100 overflow-hidden" style={{ aspectRatio: '4/3' }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0].url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted">
                        <ShoppingCart size={32} />
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-3">
                  <Link to={`/products/${p.slug}`} className="no-underline text-inherit">
                    <h4 className="m-0 mb-2 text-sm font-semibold leading-snug">{p.name}</h4>
                  </Link>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="font-bold text-primary">{price.toLocaleString('ar-EG')} ج.م</span>
                    {hasDiscount && (
                      <span className="line-through text-xs text-muted">
                        {comparePrice.toLocaleString('ar-EG')} ج.م
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn-outline w-full text-sm"
                    onClick={() => removeMutation.mutate(p.id)}
                    disabled={removeMutation.isPending}
                  >
                    <Trash2 size={14} /> إزالة من المفضلة
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
