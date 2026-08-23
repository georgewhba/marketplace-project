import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { storeApi, cartApi } from '../api';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { ArrowLeft, Cpu, BookOpen, Shirt, Home as HomeIcon } from 'lucide-react';

import heroImg from '../assets/hero.jpg';

const iconMap: Record<string, any> = { Cpu, BookOpen, Shirt, Home: HomeIcon };

export default function HomePage() {
  const { user } = useAuth();
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storeApi.getHome()
      .then(res => setData((res as any).data || res))
      .catch(() => toast.error('فشل تحميل الصفحة'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (productId: number) => {
    if (!user) { toast.info('سجّل الدخول أولاً'); return; }
    try {
      await cartApi.addItem(productId, 1);
      toast.success('تمت الإضافة للسلة');
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      {/* Hero */}
      <section className="hero">
        <div className="hero__content grid grid-2 items-center">
          <div>
            <h1 className="hero__title">أفضل المنتجات من بائعين موثوقين</h1>
            <p className="hero__subtitle">
              تسوّق إلكترونيات، كتب، ملابس والمزيد من أفضل البائعين في مصر مع ضمان الجودة والتوصيل السريع.
            </p>
            <Link to="/products" className="btn btn-primary btn-lg">
              تصفّح المنتجات
              <ArrowLeft size={18} />
            </Link>
          </div>
          <div className="hero__image-wrap">
            <img src={heroImg} alt="تسوق اونلاين" className="hero__image" />
          </div>
        </div>
      </section>

      <div className="container">
        {/* Categories */}
        <section style={{ paddingTop: 'var(--space-12)' }}>
          <div className="section-header">
            <h2 className="section-title">تسوّق حسب القسم</h2>
            <Link to="/products" className="section-link">
              عرض الكل <ArrowLeft size={14} />
            </Link>
          </div>
          <div className="grid grid-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />
                ))
              : data?.categories?.map((cat: any) => {
                  const Icon = iconMap[cat.icon] || Cpu;
                  return (
                    <Link to={`/products?category=${cat.slug}`} key={cat.id} className="category-card">
                      <Icon className="category-card__icon" size={40} />
                      <span className="category-card__name">{cat.name}</span>
                    </Link>
                  );
                })}
          </div>
        </section>

        {/* Featured Products */}
        <section style={{ paddingTop: 'var(--space-12)' }}>
          <div className="section-header">
            <h2 className="section-title">المنتجات المميزة</h2>
            <Link to="/products?featured=true" className="section-link">
              عرض الكل <ArrowLeft size={14} />
            </Link>
          </div>
          <div className="grid grid-4">
            {loading
              ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : data?.featuredProducts?.map((p: any) => (
                  <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
                ))}
          </div>
        </section>

        {/* New Arrivals */}
        <section style={{ padding: 'var(--space-12) 0 var(--space-16)' }}>
          <div className="section-header">
            <h2 className="section-title">وصل حديثاً</h2>
            <Link to="/products?sort=newest" className="section-link">
              عرض الكل <ArrowLeft size={14} />
            </Link>
          </div>
          <div className="grid grid-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)
              : data?.newArrivals?.map((p: any) => (
                  <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
                ))}
          </div>
        </section>
      </div>
    </>
  );
}
