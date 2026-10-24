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
import { useLanguage } from '../i18n';
import { SlidersHorizontal, ArrowLeft, ArrowRight, Store, X } from 'lucide-react';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function ProductsPage() {
  const { t, isRTL, translateCategory, translateStoreName, formatNumber } = useLanguage();
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
  const [categories, setCategories] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

  const sortOptions = [
    { value: 'newest', label: t('catalog.sortNewest') },
    { value: 'price_asc', label: t('catalog.sortPriceAsc') },
    { value: 'price_desc', label: t('catalog.sortPriceDesc') },
    { value: 'popular', label: t('catalog.sortBestselling') },
    { value: 'rating', label: t('catalog.sortRating') },
  ];

  const pageTitle = vendorInfo?.storeName
    ? translateStoreName(vendorInfo.storeName)
    : search
      ? `"${search}"`
      : category
        ? translateCategory(category, category)
        : t('catalog.title');

  useDocumentTitle(pageTitle, {
    description: vendorInfo?.storeDescription || t('catalog.subtitle'),
    canonicalPath: vendorRouteSlug ? `/store/${vendorRouteSlug}` : '/products',
  });

  const page = parseInt(searchParams.get('page') || '1');
  const sort = searchParams.get('sort') || 'newest';

  const PrevArrow = isRTL ? ArrowRight : ArrowLeft;
  const NextArrow = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    storeApi.getCategories()
      .then((res: any) => setCategories(res?.data || res || []))
      .catch(() => {});
  }, []);

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
      .catch(() => toast.error('Failed to load products'))
      .finally(() => setLoading(false));
  }, [page, sort, search, category, vendorSlug, searchParams.get('featured')]);

  const handleAddToCart = async (productId: number) => {
    if (!user) {
      toast.info(t('product.loginFirst'));
      return;
    }
    try {
      await cartApi.addItem(productId, 1);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      toast.success(t('product.addedToCart'));
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (!value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    if (key !== 'page') params.delete('page');
    setSearchParams(params);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const totalPages = pagination?.totalPages || 1;

  return (
    <AnimatedPage className="container page-content">
      {vendorInfo && (
        <div className="card card-body mb-6 flex items-center gap-4 flex-wrap">
          <div className="flex items-center justify-center rounded-xl bg-[var(--brand-50)]" style={{ width: 60, height: 60 }}>
            <Store size={30} className="text-[var(--brand-500)]" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold m-0">{translateStoreName(vendorInfo.storeName)}</h1>
            {vendorInfo.storeDescription && (
              <p className="text-muted text-sm mt-1 mb-0">{vendorInfo.storeDescription}</p>
            )}
            <div className="flex items-center gap-2 text-xs text-muted mt-2">
              <StarRating rating={parseFloat(vendorInfo.rating || '0')} size={14} />
              <span>({vendorInfo.reviewCount || 0} {t('product.reviews')})</span>
            </div>
          </div>
        </div>
      )}

      <div className="page-header">
        <div>
          {!vendorInfo && (
            <h1 className="page-header__title">
              {search ? `"${search}"` : category ? translateCategory(category, category) : t('catalog.title')}
            </h1>
          )}
          <p className="page-header__subtitle">{t('catalog.subtitle')}</p>
        </div>
        {pagination && (
          <div className="catalog-count-badge">
            <span className="ltr font-bold">{formatNumber(pagination.total || 0)}</span>
            <span>{t('nav.products')}</span>
          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      {categories.length > 0 && (
        <div className="catalog-category-pills">
          <button
            type="button"
            onClick={() => updateParam('category', '')}
            className={`catalog-pill ${!category ? 'active' : ''}`}
          >
            {t('catalog.allCategories')}
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => updateParam('category', cat.slug)}
              className={`catalog-pill ${category === cat.slug ? 'active' : ''}`}
            >
              {translateCategory(cat.name, cat.slug)}
            </button>
          ))}
          {(category || search || searchParams.get('featured')) && (
            <button
              type="button"
              onClick={clearFilters}
              className="catalog-pill catalog-pill--clear"
            >
              <X size={13} /> {t('catalog.resetFilters')}
            </button>
          )}
        </div>
      )}

      {/* Sort bar */}
      <div className="catalog-sort-bar">
        <div className="flex items-center gap-2 flex-wrap">
          <SlidersHorizontal size={16} className="text-muted" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">{t('catalog.sortBy')}</span>
          {sortOptions.map(opt => (
            <button
              key={opt.value}
              type="button"
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
          <div className="empty-state__title">{t('catalog.noProducts')}</div>
          <p className="empty-state__description">{t('catalog.noProductsDesc')}</p>
          <button type="button" onClick={clearFilters} className="btn btn-primary btn-md">
            {t('catalog.resetFilters')}
          </button>
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
            aria-label="Previous Page"
          >
            <PrevArrow size={16} />
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
            aria-label="Next Page"
          >
            <NextArrow size={16} />
          </button>
        </div>
      )}
    </AnimatedPage>
  );
}
