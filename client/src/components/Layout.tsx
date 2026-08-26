import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, LogOut, Store, LayoutDashboard, Bell, Sun, Moon, MoreVertical } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../auth';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api';
import { useTheme } from '../hooks/useTheme';
import { cartApi } from '../api';
import { useSiteName } from '../hooks/useSiteSettings';

const MotionLink = motion.create(Link);

export function Header({ className }: { className?: string }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const siteName = useSiteName();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { data: unreadData } = useQuery({
    queryKey: ['notifications', 'unread'],
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
        <Link to="/" className="header__logo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <img src="/favicon.svg" alt={siteName} width="32" height="32" />
          {siteName}
        </Link>

        <form className="header__search" onSubmit={handleSearch}>
          <input
            type="text"
            className="header__search-input"
            placeholder="ابحث عن منتجات..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="header__search-icon" size={16} />
        </form>

        <div className="header__actions" ref={menuRef}>
          {/* DESKTOP: Theme toggle */}
          <button className="header__icon-btn max-md:!hidden" onClick={toggleTheme} title={theme === 'dark' ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن'}>
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {user && (
            <>
              {/* DESKTOP: Notifications */}
              <MotionLink whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} to="/notifications" className="header__icon-btn max-md:!hidden" title="الإشعارات" style={{ position: 'relative' }}>
                <Bell size={20} />
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute', top: -5, insetInlineEnd: -5, background: 'var(--brand-500)', color: 'white',
                    fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(201,95,52,0.4)', border: '1px solid rgba(255,255,255,0.2)'
                  }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </MotionLink>

              {/* DESKTOP: Wishlist */}
              <MotionLink whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} to="/wishlist" className="header__icon-btn max-md:!hidden" title="المفضلة">
                <Heart size={20} />
              </MotionLink>
            </>
          )}

          {/* DESKTOP: Cart */}
          {user?.role !== 'vendor' && user?.role !== 'admin' && (
            <MotionLink 
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              to="/cart" 
              className="header__icon-btn max-md:!hidden" 
              title="السلة" 
              style={{ position: 'relative' }}
            >
              <motion.div
                key={cartItemCount}
                initial={{ scale: 1 }}
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 0.3 }}
              >
                <ShoppingCart size={20} />
              </motion.div>
              {cartItemCount > 0 && (
                <span style={{
                  position: 'absolute', top: -5, insetInlineEnd: -5, background: 'var(--brand-500)', color: 'white',
                  fontSize: '0.65rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 'bold',
                  boxShadow: '0 2px 4px rgba(201,95,52,0.4)', border: '1px solid rgba(255,255,255,0.2)'
                }}>
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </span>
              )}
            </MotionLink>
          )}

          {/* DESKTOP: Login / User Menu */}
          {!user ? (
            <MotionLink whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} to="/login" className="btn btn-primary btn-sm max-md:!hidden">
              تسجيل الدخول
            </MotionLink>
          ) : (
            <div className="dropdown max-md:!hidden">
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="header__user-menu" onClick={() => setMenuOpen(!menuOpen)}>
                <div className="flex items-center"><User size={18} /></div>
                <span className="inline" style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>{user.firstName}</span>
                {user.role === 'vendor' && user.vendor?.subscription?.planSlug === 'plus' && (
                  <span className="inline" style={{ 
                    background: 'linear-gradient(to right, var(--brand-400), var(--brand-600))',
                    color: 'white', fontSize: 'var(--font-size-xs, 0.65rem)', padding: '2px 6px',
                    borderRadius: '12px', fontWeight: 'bold', marginInlineStart: '4px'
                  }}>بلس</span>
                )}
                {user.role === 'vendor' && user.vendor?.subscription?.planSlug === 'pro' && (
                  <span className="inline" style={{ 
                    background: 'linear-gradient(45deg, #1f2937, #111827)',
                    color: 'var(--warning-500, #fbbf24)', border: '1px solid #374151',
                    fontSize: 'var(--font-size-xs, 0.65rem)', padding: '2px 6px',
                    borderRadius: '12px', fontWeight: 'bold', marginInlineStart: '4px'
                  }}>برو</span>
                )}
              </motion.button>
              
              {menuOpen && (
                <div className="dropdown__menu">
                  <Link to="/profile" className="dropdown__item" onClick={() => setMenuOpen(false)}><User size={16} /> حسابي</Link>
                  <Link to="/orders" className="dropdown__item" onClick={() => setMenuOpen(false)}><ShoppingCart size={16} /> طلباتي</Link>
                  {user.role === 'vendor' && <Link to="/vendor" className="dropdown__item" onClick={() => setMenuOpen(false)}><Store size={16} /> لوحة البائع</Link>}
                  {user.role === 'admin' && <Link to="/admin" className="dropdown__item" onClick={() => setMenuOpen(false)}><LayoutDashboard size={16} /> لوحة الإدارة</Link>}
                  <hr className="dropdown__divider" />
                  <button className="dropdown__item" onClick={handleLogout}><LogOut size={16} /> تسجيل الخروج</button>
                </div>
              )}
            </div>
          )}

          {/* MOBILE ONLY: Generic Three Dots Menu */}
          <div className="dropdown md:hidden">
             <motion.button 
               whileHover={{ scale: 1.05 }} 
               whileTap={{ scale: 0.95 }}
               className="header__icon-btn" 
               onClick={() => setMenuOpen(!menuOpen)}
               style={{ position: 'relative' }}
             >
               <MoreVertical size={24} />
               {(unreadCount > 0 || cartItemCount > 0) && (
                 <span style={{
                   position: 'absolute', top: 2, right: 2, width: 8, height: 8,
                   background: 'var(--brand-500)', borderRadius: '50%', border: '2px solid var(--bg-surface)'
                 }}></span>
               )}
             </motion.button>

             {menuOpen && (
                <div className="dropdown__menu" style={{ right: 0, left: 'auto' }}>
                  {/* Theme */}
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)] mb-1">
                    <span className="text-sm font-semibold">المظهر</span>
                    <button onClick={toggleTheme} className="p-1 rounded bg-[var(--bg-surface-2)]">
                      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                    </button>
                  </div>

                  {user ? (
                    <>
                      <Link to="/notifications" className="dropdown__item flex justify-between" onClick={() => setMenuOpen(false)}>
                        <div className="flex items-center gap-2"><Bell size={16} /> الإشعارات</div>
                        {unreadCount > 0 && <span className="badge badge-error text-xs px-2 py-1">{unreadCount}</span>}
                      </Link>
                      <Link to="/wishlist" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <Heart size={16} /> المفضلة
                      </Link>
                      {user.role !== 'vendor' && user.role !== 'admin' && (
                        <Link to="/cart" className="dropdown__item flex justify-between" onClick={() => setMenuOpen(false)}>
                          <div className="flex items-center gap-2"><ShoppingCart size={16} /> السلة</div>
                          {cartItemCount > 0 && <span className="badge badge-error text-xs px-2 py-1">{cartItemCount}</span>}
                        </Link>
                      )}
                      <Link to="/profile" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <User size={16} /> حسابي
                      </Link>
                      <Link to="/orders" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <ShoppingCart size={16} /> طلباتي
                      </Link>
                      {user.role === 'vendor' && (
                        <Link to="/vendor" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                          <Store size={16} /> لوحة البائع
                        </Link>
                      )}
                      {user.role === 'admin' && (
                        <Link to="/admin" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                          <LayoutDashboard size={16} /> لوحة الإدارة
                        </Link>
                      )}
                      <hr className="dropdown__divider" />
                      <button className="dropdown__item" onClick={handleLogout}>
                        <LogOut size={16} /> تسجيل الخروج
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/cart" className="dropdown__item flex justify-between" onClick={() => setMenuOpen(false)}>
                        <div className="flex items-center gap-2"><ShoppingCart size={16} /> السلة</div>
                        {cartItemCount > 0 && <span className="badge badge-error text-xs px-2 py-1">{cartItemCount}</span>}
                      </Link>
                      <Link to="/login" className="dropdown__item" onClick={() => setMenuOpen(false)}>
                        <LogOut size={16} /> تسجيل الدخول
                      </Link>
                    </>
                  )}
                </div>
             )}
          </div>
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  const siteName = useSiteName();
  
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div className="footer__brand">
          <div className="footer__brand-name">{siteName}</div>
          <p>منصة التجارة الإلكترونية الأولى في مصر. تسوّق من أفضل البائعين المعتمدين.</p>
        </div>
        <div>
          <div className="footer__title">روابط سريعة</div>
          <div className="footer__links">
            <Link to="/products">المنتجات</Link>
            <Link to="/products?category=electronics">إلكترونيات</Link>
            <Link to="/products?category=books">كتب</Link>
            <Link to="/products?category=clothing">ملابس</Link>
          </div>
        </div>
        <div>
          <div className="footer__title">خدمة العملاء</div>
          <div className="footer__links">
            <Link to="/return-policy">سياسة الإرجاع</Link>
            <Link to="/shipping-policy">الشحن والتوصيل</Link>
            <Link to="/faq">الأسئلة الشائعة</Link>
            <Link to="/contact">تواصل معنا</Link>
          </div>
        </div>
        <div>
          <div className="footer__title">انضم كبائع</div>
          <div className="footer__links">
            <Link to="/register/vendor">سجّل متجرك</Link>
            <Link to="/terms">شروط الاستخدام</Link>
            <Link to="/privacy">سياسة الخصوصية</Link>
          </div>
        </div>
      </div>
      <div className="footer__bottom">
        © {new Date().getFullYear()} {siteName} — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}
