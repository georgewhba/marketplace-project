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
  ArrowLeft, ArrowRight, Sparkles, ShieldCheck, Truck,
  RefreshCw, Headphones, Copy, Check, Store, Flame
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
  const [copiedCoupon, setCopiedCoupon] = useState(false);

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

  const handleCopyCoupon = () => {
    navigator.clipboard?.writeText('WELCOME10').catch(() => {});
    setCopiedCoupon(true);
    toast.success(t('promo.copied'));
    setTimeout(() => setCopiedCoupon(false), 3000);
  };

  const features = [
    { icon: Truck, title: t('features.shipping.title'), desc: t('features.shipping.desc') },
    { icon: ShieldCheck, title: t('features.secure.title'), desc: t('features.secure.desc') },
    { icon: RefreshCw, title: t('features.returns.title'), desc: t('features.returns.desc') },
    { icon: Headphones, title: t('features.support.title'), desc: t('features.support.desc') },
  ];

  return (
    <AnimatedPage>
      {/* Luxury Hero Section */}
      <section className="hero">
        <div className="hero__glow hero__glow--1" />
        <div className="hero__glow hero__glow--2" />

        <div className="hero__content grid grid-2 items-center">
          <div className="hero__text-col">
            <div className="hero__pill">
              <Sparkles size={14} className="hero__pill-icon" />
              <span>{t('hero.badge')}</span>
            </div>

            <h1 className="hero__title">{t('hero.title')}</h1>
            <p className="hero__subtitle">{t('hero.subtitle')}</p>

            <div className="hero__cta-group">
              <Link to="/products" className="btn btn-primary btn-lg hero__btn-primary">
                <span>{t('hero.ctaPrimary')}</span>
                <DirArrow size={18} />
              </Link>
              <Link to="/register/vendor" className="btn btn-lg hero__btn-secondary">
                <Store size={18} />
                <span>{t('hero.ctaSecondary')}</span>
              </Link>
            </div>

            <div className="hero__stats">
              <div className="hero__stat">
                <span className="hero__stat-value ltr">+40</span>
                <span className="hero__stat-label">{t('hero.statProducts')}</span>
              </div>
              <div className="hero__stat-divider" />
              <div className="hero__stat">
                <span className="hero__stat-value ltr">+10K</span>
                <span className="hero__stat-label">{t('hero.statCustomers')}</span>
              </div>
              <div className="hero__stat-divider" />
              <div className="hero__stat">
                <span className="hero__stat-value ltr">4.9 ★</span>
                <span className="hero__stat-label">{t('hero.statRating')}</span>
              </div>
            </div>
          </div>

          <div className="hero__visual-col">
            <div className="hero__image-wrap">
              <img src={heroImg} alt={t('site.name')} className="hero__image" />
              <div className="hero__floating-card hero__floating-card--top">
                <div className="hero__floating-icon hero__floating-icon--green">
                  <ShieldCheck size={18} />
                </div>
                <span>{t('hero.floatingVerified')}</span>
              </div>
              <div className="hero__floating-card hero__floating-card--bottom">
                <div className="hero__floating-icon hero__floating-icon--gold">
                  <Flame size={18} />
                </div>
                <span>{t('hero.floatingDiscount')}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Trust & Value Proposition Strip */}
        <section className="features-strip">
          {features.map((f, idx) => {
            const IconComp = f.icon;
            return (
              <div key={idx} className="feature-card">
                <div className="feature-card__icon">
                  <IconComp size={22} />
                </div>
                <div className="feature-card__content">
                  <h3 className="feature-card__title">{f.title}</h3>
                  <p className="feature-card__desc">{f.desc}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Categories */}
        <section style={{ paddingTop: 'var(--space-12)' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">{t('section.categories')}</h2>
              <p className="section-subtitle">{t('section.categoriesSub')}</p>
            </div>
            <Link to="/products" className="section-link">
              <span>{t('section.viewAll')}</span>
              <DirArrow size={15} />
            </Link>
          </div>
          <div className="grid grid-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skeleton" style={{ height: 140, borderRadius: 18 }} />
                ))
              : data?.categories?.map((cat: any) => {
                  const IconComp = (Icons as any)[cat.icon || ''] || Icons.Tag;
                  return (
                    <Link to={`/products?category=${cat.slug}`} key={cat.id} className="category-card">
                      <div className="category-card__icon-wrap">
                        <IconComp className="category-card__icon" size={30} />
                      </div>
                      <span className="category-card__name">
                        {translateCategory(cat.name, cat.slug)}
                      </span>
                      <span className="category-card__explore">
                        {t('section.viewAll')} <DirArrow size={13} />
                      </span>
                    </Link>
                  );
                })}
          </div>
        </section>

        {/* Featured Products */}
        <section style={{ paddingTop: 'var(--space-12)' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">{t('section.featured')}</h2>
              <p className="section-subtitle">{t('section.featuredSub')}</p>
            </div>
            <Link to="/products?featured=true" className="section-link">
              <span>{t('section.viewAll')}</span>
              <DirArrow size={15} />
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

        {/* Interactive Luxury Promo Coupon Banner */}
        <section style={{ paddingTop: 'var(--space-12)' }}>
          <div className="promo-banner">
            <div className="promo-banner__content">
              <span className="promo-banner__badge">
                <Sparkles size={13} /> {t('promo.badge')}
              </span>
              <h2 className="promo-banner__title">{t('promo.title')}</h2>
              <p className="promo-banner__desc">{t('promo.desc')}</p>
            </div>
            <div className="promo-banner__action">
              <button
                type="button"
                onClick={handleCopyCoupon}
                className="promo-banner__btn"
              >
                {copiedCoupon ? <Check size={18} /> : <Copy size={18} />}
                <span>{t('promo.copyBtn')}</span>
              </button>
            </div>
          </div>
        </section>

        {/* New Arrivals */}
        <section style={{ padding: 'var(--space-12) 0 var(--space-16)' }}>
          <div className="section-header">
            <div>
              <h2 className="section-title">{t('section.newArrivals')}</h2>
              <p className="section-subtitle">{t('section.newArrivalsSub')}</p>
            </div>
            <Link to="/products?sort=newest" className="section-link">
              <span>{t('section.viewAll')}</span>
              <DirArrow size={15} />
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
