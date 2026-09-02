import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { storeApi, cartApi } from '../api';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { AnimatedPage } from '../components/AnimatedPage';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { SlidersHorizontal, ArrowLeft, ArrowRight } from 'lucide-react';

const sortOptions = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: الأقل' },
  { value: 'price_desc', label: 'السعر: الأعلى' },
  { value: 'popular', label: 'الأكثر مبيعاً' },
  { value: 'rating', label: 'الأعلى تقييماً' },
];

import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ProductsPage() {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  
  const pageTitle = search 
    ? `نتائج البحث عن "${search}"` 
    : (category ? `منتجات قسم ${category}` : 'تصفّح المنتجات');

  useDocumentTitle(pageTitle, {
    description: 'تصفّح تشكيلة واسعة من أفضل المنتجات بأسعار تنافسية وشحن سريع لجميع المحافظات.',
    canonicalPath: '/products',
  });

  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), sort, limit: '12' };
    if (search) params.search = search;
    if (category) params.category = category;
    if (searchParams.get('featured')) params.featured = 'true';

    storeApi.getProducts(params)
      .then((res: any) => {
        setProducts(res.data || []);
        setPagination(res.pagination || null);
      })
      .catch(() => toast.error('فشل تحميل المنتجات'))
      .finally(() => setLoading(false));
  }, [page, sort, search, category, searchParams.get('featured')]);

  const handleAddToCart = async (productId: number) => {
    if (!user) { toast.info('سجّل الدخول أولاً'); return; }
    try {
      await cartApi.addItem(productId, 1);
      toast.success('تمت الإضافة للسلة');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <AnimatedPage className="container page-content">
      <div className="page-header">
        <h1 className="page-header__title">
          {search ? `نتائج البحث: "${search}"` : category ? `قسم: ${category}` : 'جميع المنتجات'}
        </h1>
        <p className="page-header__subtitle">
          {pagination ? `${pagination.total} منتج` : ''}
        </p>
      </div>

      {/* Sort bar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <SlidersHorizontal size={16} className="text-muted" />
          <span className="text-sm text-muted">ترتيب حسب:</span>
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              className={`tab ${sort === opt.value ? 'active' : ''}`}
              onClick={() => updateParam('sort', opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products grid */}
      {loading ? (
        <div className="grid grid-4">
          {Array.from({ length: 12 }).map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <div className="empty-state__title">لا توجد منتجات</div>
          <p className="empty-state__description">جرّب تغيير معايير البحث</p>
          <Link to="/products" className="btn btn-secondary btn-md">
            عرض جميع المنتجات
          </Link>
        </div>
      ) : (
        <motion.div 
          className="grid grid-4"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : motionTokens.stagger } } }}
        >
          {products.map((p: any) => (
            <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
          ))}
        </motion.div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="pagination__btn"
            disabled={page <= 1}
            onClick={() => updateParam('page', String(page - 1))}
          >
            <ArrowRight size={16} />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
            const p = i + 1;
            return (
              <button
                key={p}
                className={`pagination__btn ${page === p ? 'active' : ''}`}
                onClick={() => updateParam('page', String(p))}
              >
                {p}
              </button>
            );
          })}
          <button
            className="pagination__btn"
            disabled={page >= totalPages}
            onClick={() => updateParam('page', String(page + 1))}
          >
            <ArrowLeft size={16} />
          </button>
        </div>
      )}
    </AnimatedPage>
  );
}
