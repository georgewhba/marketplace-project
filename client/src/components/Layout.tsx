import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Search, ShoppingCart, Heart, User, LogOut, Store, LayoutDashboard,
  Bell, Sun, Moon, MoreVertical, Globe
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth';
import { useQuery } from '@tanstack/react-query';
import { api, cartApi } from '../api';
import { useTheme } from '../hooks/useTheme';
import { useSiteName } from '../hooks/useSiteSettings';
import { useLanguage, LANGUAGES } from '../i18n';
import { LanguageSwitcher } from './LanguageSwitcher';

export function Header({ className }: { className?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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
    <header className={`header ${className || ''}`}>
      <div className="header__inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-5)' }}>
          <Link to="/" className="header__logo">
            <img src="/favicon.svg" alt={siteName} width="32" height="32" />
            <span>{siteName}</span>
          </Link>

          <nav className="header__nav-links desktop-only" aria-label="Main Navigation">
            <Link
              to="/"
              className={`header__nav-link ${location.pathname === '/' ? 'active' : ''}`}
            >
              {t('nav.home')}
            </Link>
            <Link
              to="/products"
              className={`header__nav-link ${location.pathname.startsWith('/products') ? 'active' : ''}`}
            >
              {t('nav.products')}
            </Link>
          </nav>
        </div>

        <form className="header__search desktop-only" onSubmit={handleSearch}>
          <input
            type="text"
            className="header__search-input"
            placeholder={t('nav.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t('nav.searchAria')}
          />
          <button type="submit" className="header__search-btn" aria-label={t('nav.searchAria')}>
            <Search size={15} />
          </button>
        </form>

        <div className="header__actions" ref={menuRef}>
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Theme toggle */}
          <button
            type="button"
            className="header__icon-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
            aria-label={theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}
          >
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user && (
            <>
              <Link
                to="/notifications"
                className="header__icon-btn desktop-only"
                title={t('nav.notifications')}
                aria-label={t('nav.notifications')}
              >
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span className="header__counter-pill">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>

              <Link
                to="/wishlist"
                className="header__icon-btn desktop-only"
                title={t('nav.wishlist')}
                aria-label={t('nav.wishlist')}
              >
                <Heart size={20} />
              </Link>
            </>
          )}

          {user?.role !== 'vendor' && user?.role !== 'admin' && (
            <Link
              to="/cart"
              className="header__icon-btn"
              title={t('nav.cart')}
              aria-label={t('nav.cart')}
            >
              <ShoppingCart size={20} />
              {cartItemCount > 0 && (
                <span className="header__counter-pill">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </Link>
          )}

          {!user ? (
            <Link to="/login" className="btn btn-primary btn-sm desktop-only">
              {t('nav.login')}
            </Link>
          ) : (
            <div className="dropdown desktop-only">
              <button
                type="button"
                className="header__user-menu"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                <div className="header__avatar">
                  <User size={15} />
                </div>
                <span className="header__user-name">{user.firstName}</span>
              </button>

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
                  <button type="button" className="dropdown__item" onClick={handleLogout}>
                    <LogOut size={16} /> {t('nav.logout')}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mobile Overflow Menu (ONLY on <= 768px) */}
          <div className="dropdown mobile-only">
            <button
              type="button"
              className="header__icon-btn"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label={t('nav.menu')}
            >
              <MoreVertical size={20} />
            </button>

            {menuOpen && (
              <div className="dropdown__menu" style={{ minWidth: 220 }}>
                <Link to="/" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                  <Store size={16} /> {t('nav.home')}
                </Link>
                <Link to="/products" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                  <Search size={16} /> {t('nav.products')}
                </Link>
                <hr className="dropdown__divider" />
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
                        {l.code.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                {user ? (
                  <>
                    <Link to="/notifications" className="dropdown__item flex justify-between" onClick={() => setMenuOpen(false)}>
                      <div className="flex items-center gap-2"><Bell size={16} /> {t('nav.notifications')}</div>
                      {unreadCount > 0 && <span className="badge badge-brand">{unreadCount}</span>}
                    </Link>
                    <Link to="/wishlist" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                      <Heart size={16} /> {t('nav.wishlist')}
                    </Link>
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
                    <button type="button" className="dropdown__item" onClick={handleLogout}>
                      <LogOut size={16} /> {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <Link to="/login" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                    <User size={16} /> {t('nav.login')}
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Search Bar (ONLY on <= 768px) */}
      <div className="header__mobile-search mobile-only">
        <form onSubmit={handleSearch} className="header__mobile-search-form">
          <input
            type="text"
            className="header__search-input"
            placeholder={t('nav.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="submit" className="header__search-btn" aria-label={t('nav.searchAria')}>
            <Search size={15} />
          </button>
        </form>
      </div>
    </header>
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
          <div className="footer__brand-name" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/favicon.svg" alt={siteName} width="28" height="28" />
            <span>{siteName}</span>
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
            <Link to="/products?category=home">{t('cat.home')}</Link>
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
