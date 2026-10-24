import { Link, useNavigate } from 'react-router-dom';
import {
  Search, ShoppingCart, Heart, User, LogOut, Store, LayoutDashboard,
  Bell, Sun, Moon, MoreVertical, ShieldCheck, Truck, Sparkles, Globe
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth';
import { useQuery } from '@tanstack/react-query';
import { api, cartApi } from '../api';
import { useTheme } from '../hooks/useTheme';
import { useSiteName } from '../hooks/useSiteSettings';
import { useLanguage, LANGUAGES } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

const MotionLink = motion.create(Link);

export function Header({ className }: { className?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const rawSiteName = useSiteName();
  const { t, lang, setLang } = useLanguage();
  const siteName = lang === 'ar' ? rawSiteName : t('site.name');
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications-unread'],
    queryFn: () => api.get<any>('/auth/me/notifications/unread-count').then(res => res.data),
    enabled: !!user,
    refetchInterval: 30000,
  });

  const { data: cartData } = useQuery({
    queryKey: ['cart'],
    queryFn: () => cartApi.getCart().then((res: any) => res.data || res),
    enabled: !!user,
  });

  const unreadCount = unreadData?.count || 0;
  const cartItemCount = cartData?.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMenuOpen(false);
  };

  return (
    <>
      {/* Top Luxury Announcement & Trust Bar */}
      <div className="topbar max-md:!hidden">
        <div className="topbar__inner">
          <div className="topbar__promo">
            <Sparkles size={14} className="topbar__sparkle" />
            <span>{t('topbar.promo')}</span>
          </div>
          <div className="topbar__links">
            <span className="topbar__trust-item">
              <ShieldCheck size={14} />
              {t('topbar.authentic')}
            </span>
            <span className="topbar__trust-item">
              <Truck size={14} />
              {t('topbar.fastDelivery')}
            </span>
            <Link to="/register/vendor" className="topbar__cta">
              <Store size={13} />
              {t('topbar.sellWithUs')}
            </Link>
          </div>
        </div>
      </div>

      <header className={`header ${className || ''}`}>
        <div className="header__inner">
          <Link to="/" className="header__logo">
            <div className="header__logo-icon">
              <img src="/favicon.svg" alt={siteName} width="28" height="28" />
            </div>
            <div className="header__logo-text">
              <span className="header__logo-title">{siteName}</span>
              <span className="header__logo-sub max-lg:!hidden">MARKETPLACE</span>
            </div>
          </Link>

          <form className="header__search" onSubmit={handleSearch}>
            <input
              type="text"
              className="header__search-input"
              placeholder={t('nav.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label={t('nav.searchAria')}
            />
            <button type="submit" className="header__search-btn" aria-label={t('nav.searchAria')}>
              <Search size={16} />
            </button>
          </form>

          <div className="header__actions" ref={menuRef}>
            {/* DESKTOP: Language Switcher */}
            <div className="max-md:!hidden">
              <LanguageSwitcher />
            </div>

            {/* DESKTOP: Theme toggle */}
            <button
              className="header__icon-btn max-md:!hidden"
              onClick={toggleTheme}
              title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
              aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
            >
              {theme === 'dark' ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            {user && (
              <>
                {/* DESKTOP: Notifications */}
                <MotionLink
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  to="/notifications"
                  className="header__icon-btn max-md:!hidden"
                  title={t('nav.notifications')}
                  aria-label={t('nav.notifications')}
                  style={{ position: 'relative' }}
                >
                  <Bell size={19} />
                  {unreadCount > 0 && (
                    <span className="header__counter-pill">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </MotionLink>

                {/* DESKTOP: Wishlist */}
                <MotionLink
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  to="/wishlist"
                  className="header__icon-btn max-md:!hidden"
                  title={t('nav.wishlist')}
                  aria-label={t('nav.wishlist')}
                >
                  <Heart size={19} />
                </MotionLink>
              </>
            )}

            {/* DESKTOP: Cart */}
            {user?.role !== 'vendor' && user?.role !== 'admin' && (
              <MotionLink
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                to="/cart"
                className="header__icon-btn header__cart-btn max-md:!hidden"
                title={t('nav.cart')}
                aria-label={t('nav.cart')}
                style={{ position: 'relative' }}
              >
                <motion.div
                  key={cartItemCount}
                  initial={{ scale: 1 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 0.3 }}
                >
                  <ShoppingCart size={19} />
                </motion.div>
                {cartItemCount > 0 && (
                  <span className="header__counter-pill">
                    {cartItemCount > 99 ? '99+' : cartItemCount}
                  </span>
                )}
              </MotionLink>
            )}

            {/* DESKTOP: Login / User Menu */}
            {!user ? (
              <MotionLink
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                to="/login"
                className="btn btn-primary btn-sm max-md:!hidden"
              >
                {t('nav.login')}
              </MotionLink>
            ) : (
              <div className="dropdown max-md:!hidden">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="header__user-menu"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  <div className="header__avatar">
                    <User size={15} />
                  </div>
                  <span className="inline" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
                    {user.firstName}
                  </span>
                  {user.role === 'vendor' && user.vendor?.subscription?.planSlug === 'plus' && (
                    <span className="inline" style={{
                      background: 'linear-gradient(to right, var(--brand-400), var(--brand-600))',
                      color: 'white', fontSize: 'var(--font-size-xs, 0.65rem)', padding: '2px 6px',
                      borderRadius: '12px', fontWeight: 'bold', marginInlineStart: '4px',
                    }}>{t('nav.plusBadge')}</span>
                  )}
                  {user.role === 'vendor' && user.vendor?.subscription?.planSlug === 'pro' && (
                    <span className="inline" style={{
                      background: 'linear-gradient(45deg, #1f2937, #111827)',
                      color: 'var(--warning-500, #fbbf24)', border: '1px solid #374151',
                      fontSize: 'var(--font-size-xs, 0.65rem)', padding: '2px 6px',
                      borderRadius: '12px', fontWeight: 'bold', marginInlineStart: '4px',
                    }}>{t('nav.proBadge')}</span>
                  )}
                </motion.button>

                {menuOpen && (
                  <div className="dropdown__menu">
                    <Link to="/profile" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                      <User size={16} /> {t('nav.profile')}
                    </Link>
                    <Link to="/orders" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                      <ShoppingCart size={16} /> {t('nav.orders')}
                    </Link>
                    {user.role === 'vendor' && (
                      <Link to="/vendor" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <Store size={16} /> {t('nav.vendorDashboard')}
                      </Link>
                    )}
                    {user.role === 'admin' && (
                      <Link to="/admin" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <LayoutDashboard size={16} /> {t('nav.adminDashboard')}
                      </Link>
                    )}
                    <hr className="dropdown__divider" />
                    <button className="dropdown__item" onClick={handleLogout}>
                      <LogOut size={16} /> {t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MOBILE ONLY: Quick Language + Menu */}
            <div className="dropdown md:hidden flex items-center gap-1">
              <LanguageSwitcher compact />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="header__icon-btn"
                onClick={() => setMenuOpen(!menuOpen)}
                aria-label={t('nav.menu')}
                style={{ position: 'relative' }}
              >
                <MoreVertical size={22} />
                {(unreadCount > 0 || cartItemCount > 0) && (
                  <span style={{
                    position: 'absolute', top: 2, insetInlineEnd: 2, width: 8, height: 8,
                    background: 'var(--brand-500)', borderRadius: '50%', border: '2px solid var(--bg-surface)',
                  }}></span>
                )}
              </motion.button>

              {menuOpen && (
                <div className="dropdown__menu" style={{ minWidth: 230 }}>
                  {/* Theme */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] mb-1">
                    <span className="text-sm font-semibold">{t('nav.theme')}</span>
                    <button
                      onClick={toggleTheme}
                      className="p-1.5 rounded-lg bg-[var(--bg-surface-2)]"
                      aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
                    >
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                  </div>

                  {/* Mobile Language Pills */}
                  <div className="px-3 py-2 border-b border-[var(--border-color)] mb-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--text-muted)] mb-2">
                      <Globe size={13} /> {t('nav.language')}
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {LANGUAGES.map(l => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => setLang(l.code)}
                          className={`text-xs py-1 px-2 rounded-md border transition-all ${
                            lang === l.code
                              ? 'bg-[var(--brand-500)] text-white border-[var(--brand-500)] font-bold'
                              : 'bg-[var(--bg-surface-2)] text-[var(--text-secondary)] border-transparent'
                          }`}
                        >
                          {l.flag} {l.code.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {user ? (
                    <>
                      <Link to="/notifications" className="dropdown__item flex justify-between" onClick={() => setMenuOpen(false)}>
                        <div className="flex items-center gap-2"><Bell size={16} /> {t('nav.notifications')}</div>
                        {unreadCount > 0 && <span className="bg-[var(--brand-500)] text-white text-[10px] px-2 py-0.5 rounded-full">{unreadCount}</span>}
                      </Link>

                      {user?.role !== 'vendor' && user?.role !== 'admin' && (
                        <>
                          <Link to="/wishlist" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                            <Heart size={16} /> {t('nav.wishlist')}
                          </Link>
                          <Link to="/cart" className="dropdown__item flex justify-between" onClick={() => setMenuOpen(false)}>
                            <div className="flex items-center gap-2"><ShoppingCart size={16} /> {t('nav.cart')}</div>
                            {cartItemCount > 0 && <span className="bg-[var(--brand-500)] text-white text-[10px] px-2 py-0.5 rounded-full">{cartItemCount}</span>}
                          </Link>
                        </>
                      )}

                      <hr className="dropdown__divider" />
                      <Link to="/profile" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <User size={16} /> {t('nav.profile')}
                      </Link>
                      <Link to="/orders" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <ShoppingCart size={16} /> {t('nav.orders')}
                      </Link>
                      {user.role === 'vendor' && (
                        <Link to="/vendor" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                          <Store size={16} /> {t('nav.vendorDashboard')}
                        </Link>
                      )}
                      {user.role === 'admin' && (
                        <Link to="/admin" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                          <LayoutDashboard size={16} /> {t('nav.adminDashboard')}
                        </Link>
                      )}
                      <hr className="dropdown__divider" />
                      <button className="dropdown__item" onClick={handleLogout}>
                        <LogOut size={16} /> {t('nav.logout')}
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/cart" className="dropdown__item flex justify-between" onClick={() => setMenuOpen(false)}>
                        <div className="flex items-center gap-2"><ShoppingCart size={16} /> {t('nav.cart')}</div>
                        {cartItemCount > 0 && <span className="badge badge-error text-xs px-2 py-1">{cartItemCount}</span>}
                      </Link>
                      <Link to="/login" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <User size={16} /> {t('nav.login')}
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
}

export function Footer() {
  const rawSiteName = useSiteName();
  const { t, lang } = useLanguage();
  const siteName = lang === 'ar' ? rawSiteName : t('site.name');

  return (
    <footer className="footer">
      <div className="footer__grid">
        <div className="footer__brand">
          <div className="footer__brand-name">
            <img src="/favicon.svg" alt={siteName} width="26" height="26" style={{ display: 'inline-block', marginInlineEnd: 8, verticalAlign: 'middle' }} />
            {siteName}
          </div>
          <p style={{ lineHeight: 1.7, maxWidth: 340 }}>{t('site.description')}</p>
        </div>
        <div>
          <div className="footer__title">{t('footer.quickLinks')}</div>
          <div className="footer__links">
            <Link to="/products">{t('nav.products')}</Link>
            <Link to="/products?category=electronics">{t('cat.electronics')}</Link>
            <Link to="/products?category=books">{t('cat.books')}</Link>
            <Link to="/products?category=clothing">{t('cat.clothing')}</Link>
          </div>
        </div>
        <div>
          <div className="footer__title">{t('footer.customerService')}</div>
          <div className="footer__links">
            <Link to="/return-policy">{t('footer.returnPolicy')}</Link>
            <Link to="/shipping-policy">{t('footer.shippingPolicy')}</Link>
            <Link to="/faq">{t('footer.faq')}</Link>
            <Link to="/contact">{t('footer.contact')}</Link>
          </div>
        </div>
        <div>
          <div className="footer__title">{t('footer.joinAsVendor')}</div>
          <div className="footer__links">
            <Link to="/register/vendor">{t('footer.registerVendor')}</Link>
            <Link to="/terms">{t('footer.terms')}</Link>
            <Link to="/privacy">{t('footer.privacy')}</Link>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        © {new Date().getFullYear()} {siteName} — {t('footer.rights')}
      </div>
    </footer>
  );
}
