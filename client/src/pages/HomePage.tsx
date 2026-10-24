import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../lib/motion-tokens';
import { storeApi, cartApi } from '../api';
import { ProductCard, ProductCardSkeleton } from '../components/ProductCard';
import { AnimatedPage } from '../components/AnimatedPage';
import { useAuth } from '../auth';
import { useToast } from '../toast';
import { useLanguage } from '../i18n';
import {
  ArrowLeft, ArrowRight, ShieldCheck, Truck,
  RefreshCw, Headphones, Store
} from 'lucide-react';
import * as Icons from 'lucide-react';

import heroImg from '../assets/hero.jpg';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function HomePage() {
  const { t, isRTL, translateCategory } = useLanguage();
  useDocumentTitle('', {
    description: t('site.description'),
    canonicalPath: '/',
  });
  const shouldReduceMotion = useReducedMotion();
  const { user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const DirArrow = isRTL ? ArrowLeft : ArrowRight;

  useEffect(() => {
    storeApi.getHome()
      .then(res => {
        const d = (res as any).data || res;
        setData(d);
      })
      .catch(() => toast.error('Failed to load homepage'))
      .finally(() => setLoading(false));
  }, []);

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

  const features = [
    { icon: Truck, title: t('features.shipping.title'), desc: t('features.shipping.desc') },
    { icon: ShieldCheck, title: t('features.secure.title'), desc: t('features.secure.desc') },
    { icon: RefreshCw, title: t('features.returns.title'), desc: t('features.returns.desc') },
    { icon: Headphones, title: t('features.support.title'), desc: t('features.support.desc') },
  ];

  return (
    <AnimatedPage>
      {/* Hero Section — Authentic Terracotta + Gold Store Identity */}
      <section className="hero">
        <div className="hero__content">
          <div>
            <span className="hero__badge">
              <ShieldCheck size={15} />
              <span>{t('hero.badge')}</span>
            </span>
            <h1 className="hero__title">{t('hero.title')}</h1>
            <p className="hero__subtitle">{t('hero.subtitle')}</p>
            <div className="hero__actions">
              <Link to="/products" className="btn btn-primary btn-lg">
                <span>{t('hero.ctaPrimary')}</span>
                <DirArrow size={18} />
              </Link>
              <Link to="/register/vendor" className="btn btn-lg hero__btn-secondary">
                <Store size={18} />
                <span>{t('hero.ctaSecondary')}</span>
              </Link>
            </div>
          </div>
          <div className="hero__image-wrap">
            <img src={heroImg} alt={t('site.name')} className="hero__image" />
          </div>
        </div>
      </section>

      <div className="container">
        {/* Trust Features Strip */}
        <section className="features-strip">
          {features.map((f, idx) => {
            const IconComp = f.icon;
            return (
              <div key={idx} className="feature-card">
                <div className="feature-card__icon">
                  <IconComp size={22} />
                </div>
                <div>
                  <h3 className="feature-card__title">{f.title}</h3>
                  <p className="feature-card__desc">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Categories */}
        <section className="home-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">{t('section.categories')}</h2>
              <p className="section-subtitle">{t('section.categoriesSub')}</p>
            </div>
            <Link to="/products" className="section-link">
              <span>{t('section.viewAll')}</span>
              <DirArrow size={14} />
            </Link>
          </div>
          <div className="grid grid-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 120, borderRadius: 14 }} />
                ))
              : data?.categories?.map((cat: any) => {
                  const IconComp = (Icons as any)[cat.icon || ''] || Icons.Tag;
                  return (
                    <Link to={`/products?category=${cat.slug}`} key={cat.id} className="category-card">
                      <div className="category-card__icon-wrap">
                        <IconComp size={28} />
                      </div>
                      <span className="category-card__name">
                        {translateCategory(cat.name, cat.slug)}
                      </span>
                    </Link>
                  );
                })}
          </div>
        </section>

        {/* Featured Products */}
        <section className="home-section">
          <div className="section-header">
            <div>
              <h2 className="section-title">{t('section.featured')}</h2>
              <p className="section-subtitle">{t('section.featuredSub')}</p>
            </div>
            <Link to="/products?featured=true" className="section-link">
              <span>{t('section.viewAll')}</span>
              <DirArrow size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-4">
              {Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <motion.div
              className="grid grid-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={{ visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : motionTokens.stagger } } }}
            >
              {data?.featuredProducts?.map((p: any) => (
                <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </motion.div>
          )}
        </section>

        {/* New Arrivals */}
        <section className="home-section" style={{ paddingBottom: 'var(--space-16)' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">{t('section.newArrivals')}</h2>
              <p className="section-subtitle">{t('section.newArrivalsSub')}</p>
            </div>
            <Link to="/products?sort=newest" className="section-link">
              <span>{t('section.viewAll')}</span>
              <DirArrow size={14} />
            </Link>
          </div>
          {loading ? (
            <div className="grid grid-4">
              {Array.from({ length: 4 }).map((_, i) => <ProductCardSkeleton key={i} />)}
            </div>
          ) : (
            <motion.div
              className="grid grid-4"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-50px' }}
              variants={{ visible: { transition: { staggerChildren: shouldReduceMotion ? 0 : motionTokens.stagger } } }}
            >
              {data?.newArrivals?.map((p: any) => (
                <ProductCard key={p.id} product={p} onAddToCart={handleAddToCart} />
              ))}
            </motion.div>
          )}
        </section>
      </div>
    </AnimatedPage>
  );
}
