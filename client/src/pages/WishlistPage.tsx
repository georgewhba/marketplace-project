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
    <div className="container page-content" style={{ padding: 'var(--space-8) var(--space-4)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
        <Heart size={24} color="var(--primary-500)" fill="var(--primary-500)" />
        <h1 style={{ margin: 0, fontSize: 'var(--text-2xl)' }}>المفضلة</h1>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>({items.length} منتج)</span>
      </div>

      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--space-4)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 280 }} />)}
        </div>
      ) : items.length === 0 ? (
        <div className="empty-state" style={{ padding: 'var(--space-12) var(--space-4)' }}>
          <Heart size={48} color="var(--neutral-300)" />
          <div className="empty-state__title" style={{ marginTop: 'var(--space-4)' }}>المفضلة فارغة</div>
          <p style={{ color: 'var(--neutral-500)', marginBottom: 'var(--space-4)' }}>أضف منتجات إلى المفضلة لتجدها بسهولة لاحقاً</p>
          <Link to="/products" className="btn btn--primary">تصفح المنتجات</Link>
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
              <div key={item.id} className="card product-card" style={{ overflow: 'hidden' }}>
                <Link to={`/products/${p.slug}`} style={{ display: 'block' }}>
                  <div style={{ aspectRatio: '4/3', background: 'var(--neutral-100)', overflow: 'hidden' }}>
                    {p.images?.[0] ? (
                      <img src={p.images[0].url} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--neutral-400)' }}>
                        <ShoppingCart size={32} />
                      </div>
                    )}
                  </div>
                </Link>
                <div style={{ padding: 'var(--space-3)' }}>
                  <Link to={`/products/${p.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h4 style={{ margin: '0 0 var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 600, lineHeight: 1.4 }}>{p.name}</h4>
                  </Link>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <span style={{ fontWeight: 700, color: 'var(--primary-600)' }}>{price.toLocaleString('ar-EG')} ج.م</span>
                    {hasDiscount && (
                      <span style={{ textDecoration: 'line-through', fontSize: 'var(--text-xs)', color: 'var(--neutral-400)' }}>
                        {comparePrice.toLocaleString('ar-EG')} ج.م
                      </span>
                    )}
                  </div>
                  <button
                    className="btn btn--outline"
                    style={{ width: '100%', fontSize: 'var(--text-sm)', color: 'var(--error-500)', borderColor: 'var(--error-200)' }}
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
