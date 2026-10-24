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
  RefreshCw, Headphones, Copy, Check, Store, Cpu, Tag
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
      <div className="container">
        {/* Contained Editorial Bento Hero (Zero AI Clichés) */}
        <section className="bento-hero">
          <div className="bento-hero__main">
            <div className="bento-hero__text">
              <span className="bento-hero__eyebrow">
                <ShieldCheck size={14} />
                {t('hero.badge')}
              </span>
              <h1 className="bento-hero__title">{t('hero.title')}</h1>
              <p className="bento-hero__subtitle">{t('hero.subtitle')}</p>

              <div className="bento-hero__actions">
                <Link to="/products" className="btn btn-primary btn-lg">
                  <span>{t('hero.ctaPrimary')}</span>
                  <DirArrow size={17} />
                </Link>
                <Link to="/register/vendor" className="btn btn-secondary btn-lg">
                  <Store size={17} />
                  <span>{t('hero.ctaSecondary')}</span>
                </Link>
              </div>

              <div className="bento-hero__metrics">
                <div>
                  <strong className="ltr">40+</strong>
                  <span>{t('hero.statProducts')}</span>
                </div>
                <div>
                  <strong className="ltr">10,000+</strong>
                  <span>{t('hero.statCustomers')}</span>
                </div>
                <div>
                  <strong className="ltr">4.9 / 5</strong>
                  <span>{t('hero.statRating')}</span>
                </div>
              </div>
            </div>

            <div className="bento-hero__media">
              <img src={heroImg} alt={t('site.name')} className="bento-hero__img" />
            </div>
          </div>

          <div className="bento-hero__side">
            <Link to="/products?category=electronics" className="bento-side-card bento-side-card--tech">
              <div className="bento-side-card__top">
                <span className="bento-side-card__tag">
                  <Cpu size={13} /> {t('cat.electronics')}
                </span>
                <DirArrow size={16} />
              </div>
              <h3 className="bento-side-card__title">{t('hero.floatingVerified')}</h3>
              <p className="bento-side-card__desc">{t('section.featuredSub')}</p>
            </Link>

            <div className="bento-side-card bento-side-card--voucher">
              <div className="bento-side-card__top">
                <span className="bento-side-card__tag">
                  <Tag size={13} /> {t('promo.badge')}
                </span>
              </div>
              <h3 className="bento-side-card__title">{t('promo.title')}</h3>
              <button
                type="button"
                onClick={handleCopyCoupon}
                className="bento-voucher-btn"
              >
                {copiedCoupon ? <Check size={15} /> : <Copy size={15} />}
                <span className="ltr">WELCOME10</span>
              </button>
            </div>
          </div>
        </section>

        {/* Value Proposition Strip */}
        <section className="features-strip">
          {features.map((f, idx) => {
            const IconComp = f.icon;
            return (
              <div key={idx} className="feature-card">
                <div className="feature-card__icon">
                  <IconComp size={20} />
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
        <section className="home-section">
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
                  <div key={i} className="skeleton" style={{ height: 110, borderRadius: 14 }} />
                ))
              : data?.categories?.map((cat: any) => {
                  const IconComp = (Icons as any)[cat.icon || ''] || Icons.Tag;
                  return (
                    <Link to={`/products?category=${cat.slug}`} key={cat.id} className="category-card">
                      <div className="category-card__icon-wrap">
                        <IconComp className="category-card__icon" size={24} />
                      </div>
                      <div className="category-card__info">
                        <span className="category-card__name">
                          {translateCategory(cat.name, cat.slug)}
                        </span>
                        <span className="category-card__explore">
                          {t('section.viewAll')} <DirArrow size={12} />
                        </span>
                      </div>
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

        {/* New Arrivals */}
        <section className="home-section" style={{ paddingBottom: 'var(--space-16)' }}>
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
