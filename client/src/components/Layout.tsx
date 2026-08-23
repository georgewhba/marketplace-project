import { Link, useNavigate } from 'react-router-dom';
import { Search, ShoppingCart, Heart, User, LogOut, Store, LayoutDashboard } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../auth';

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <header className="header">
      <div className="header__inner">
        <Link to="/" className="header__logo" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
          <img src="/favicon.svg" alt="سوق مصر" width="32" height="32" />
          سوق مصر
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

        <div className="header__actions">
          {user && (
            <>
              <Link to="/wishlist" className="header__icon-btn" title="المفضلة">
                <Heart size={20} />
              </Link>
              <Link to="/cart" className="header__icon-btn" title="السلة">
                <ShoppingCart size={20} />
              </Link>
            </>
          )}

          {!user ? (
            <Link to="/login" className="btn btn-primary btn-sm">
              تسجيل الدخول
            </Link>
          ) : (
            <div className="dropdown" ref={menuRef}>
              <button className="header__user-menu" onClick={() => setMenuOpen(!menuOpen)}>
                <User size={18} />
                <span style={{ fontSize: '0.8125rem' }}>{user.firstName}</span>
              </button>

              {menuOpen && (
                <div className="dropdown__menu">
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
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__grid">
        <div className="footer__brand">
          <div className="footer__brand-name">سوق مصر</div>
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
        © {new Date().getFullYear()} سوق مصر — جميع الحقوق محفوظة
      </div>
    </footer>
  );
}
