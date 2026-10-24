import { useEffect, useState } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { storeApi, cartApi } from '../api';
import { ProductCard, ProductCardSkeleton, StarRating } from '../components/ProductCard';
import { AnimatedPage } from '../components/AnimatedPage';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { SlidersHorizontal, ArrowLeft, ArrowRight, Store } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

const sortOptions = [
  { value: 'newest', label: 'الأحدث' },
  { value: 'price_asc', label: 'السعر: الأقل' },
  { value: 'price_desc', label: 'السعر: الأعلى' },
  { value: 'popular', label: 'الأكثر مبيعاً' },
  { value: 'rating', label: 'الأعلى تقييماً' },
];

export default function ProductsPage() {
  const shouldReduceMotion = useReducedMotion();
  const [searchParams, setSearchParams] = useSearchParams();
  const { slug: vendorRouteSlug } = useParams<{ slug?: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();

  const search = searchParams.get('search') || '';
  const category = searchParams.get('category') || '';
  const vendorSlug = vendorRouteSlug || searchParams.get('vendor') || '';

  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

  const pageTitle = vendorInfo?.storeName
    ? `متجر ${vendorInfo.storeName}`
    : search
      ? `نتائج البحث عن "${search}"`
      : category
        ? `منتجات قسم ${category}`
        : 'تصفّح المنتجات';

  useDocumentTitle(pageTitle, {
    description: vendorInfo?.storeDescription || 'تصفّح تشكيلة واسعة من أفضل المنتجات بأسعار تنافسية وشحن سريع لجميع المحافظات.',
    canonicalPath: vendorRouteSlug ? `/store/${vendorRouteSlug}` : '/products',
  });

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';

  useEffect(() => {
    if (!vendorSlug) {
      setVendorInfo(null);
      return;
    }
    storeApi.getVendorStore(vendorSlug)
      .then((res: any) => setVendorInfo(res?.data || res))
      .catch(() => setVendorInfo(null));
  }, [vendorSlug]);

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = { page: String(page), sort, limit: '12' };
    if (search) params.search = search;
    if (category) params.category = category;
    if (vendorSlug) params.vendor = vendorSlug;
    if (searchParams.get('featured')) params.featured = 'true';

    storeApi.getProducts(params)
      .then((res: any) => {
        setProducts(res.data || []);
        const paginationData = (res as any)?.meta || (res as any)?.pagination || null;
        setPagination(paginationData);
      })
      .catch(() => toast.error('فشل تحميل المنتجات'))
      .finally(() => setLoading(false));
  }, [page, sort, search, category, vendorSlug, searchParams.get('featured')]);

  const handleAddToCart = async (productId: number) => {
    if (!user) { toast.info('سجّل الدخول أولاً'); return; }
    try {
      await cartApi.addItem(productId, 1);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
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
      {vendorInfo && (
        <div className="card card-body mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center justify-center rounded-lg bg-primary-50" style={{ width: 56, height: 56 }}>
            <Store size={28} className="text-primary" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold m-0">{vendorInfo.storeName}</h1>
            {vendorInfo.storeDescription && (
              <p className="text-muted text-sm mt-1 mb-0">{vendorInfo.storeDescription}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted mt-2">
              <StarRating rating={parseFloat(vendorInfo.rating || '0')} size={14} />
              <span>({vendorInfo.reviewCount || 0} تقييم)</span>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        {!vendorInfo && (
          <h1 className="page-header__title">
            {search ? `نتائج البحث: "${search}"` : category ? `قسم: ${category}` : 'جميع المنتجات'}
          </h1>
        )}
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
            aria-label="الصفحة السابقة"
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
            aria-label="الصفحة التالية"
          >
            <ArrowLeft size={16} />
          </button>
        </div>
      )}
    </AnimatedPage>
  );
}
