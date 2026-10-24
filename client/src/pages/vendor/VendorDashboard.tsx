import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { vendorApi } from '../../api';
import { useToast } from '../../toast';
import {
  LayoutDashboard, Package, ShoppingCart, DollarSign, Settings, AlertTriangle,
  Menu, ChevronRight, BarChart2, CreditCard, Bell, Store, Clock
} from 'lucide-react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';

const sidebarLinks = [
  { to: '/vendor', icon: LayoutDashboard, label: 'لوحة التحكم', exact: true },
  { to: '/vendor/analytics', icon: BarChart2, label: 'التحليلات' },
  { to: '/vendor/products', icon: Package, label: 'المنتجات' },
  { to: '/vendor/orders', icon: ShoppingCart, label: 'الطلبات' },
  { to: '/vendor/earnings', icon: DollarSign, label: 'الأرباح' },
  { to: '/vendor/subscriptions', icon: CreditCard, label: 'الباقات والاشتراكات' },
  { to: '/vendor/settings', icon: Settings, label: 'إعدادات المتجر' },
];

export function VendorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <div className="dashboard-mobile-header">
        <div className="flex items-center gap-3">
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Menu size={24} />
          </button>

          {location.pathname !== '/vendor' && (
            <button onClick={() => navigate(-1)} className="sidebar-toggle" title="رجوع">
              <ChevronRight size={24} />
            </button>
          )}

          <span className="font-semibold" style={{ fontSize: 'var(--font-size-lg)' }}>لوحة البائع</span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher compact />
          <Link to="/notifications" style={{ color: 'var(--text-secondary)' }}>
            <Bell size={20} />
          </Link>
          <Link to="/" className="flex items-center gap-1 font-semibold text-brand no-underline" style={{ fontSize: 'var(--font-size-sm)' }}>
            العودة للمتجر
          </Link>
        </div>
      </div>

      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />}

      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar__section">
          <div className="flex items-center gap-3 px-3 pb-4 mb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="feature-card__icon" style={{ width: 36, height: 36, borderRadius: 10 }}>
              <Store size={18} />
            </div>
            <div>
              <div className="text-primary" style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', lineHeight: 1.2 }}>
                بوابة التاجر
              </div>
              <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                إدارة المتجر والمبيعات
              </div>
            </div>
          </div>

          {sidebarLinks.map(link => {
            const isActive = link.exact ? location.pathname === link.to : location.pathname.startsWith(link.to);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`sidebar__link ${isActive ? 'active' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
              >
                <link.icon size={18} />
                {link.label}
              </Link>
            );
          })}
        </div>
      </aside>
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}

export default function VendorDashboard() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    vendorApi
      .getDashboard()
      .then((res: any) => setData(res.data || res))
      .catch(() => toast.error('فشل تحميل لوحة التحكم'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="grid grid-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton" style={{ height: 110 }} />
        ))}
      </div>
    );
  }

  const stats = data?.stats || {};

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <LayoutDashboard size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>لوحة تحكم المتجر</h1>
            <p className="page-header__subtitle">متابعة أداء مبيعاتك، الطلبات الجديدة، وحالة المخزون</p>
          </div>
        </div>
      </div>

      {data?.currentPlan && (
        <div className="card card-body mb-6" style={{ background: 'var(--brand-50)', border: '1px solid var(--brand-200)' }}>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="feature-card__icon" style={{ background: 'var(--bg-surface)' }}>
                <CreditCard size={22} />
              </div>
              <div>
                <div className="text-primary font-bold" style={{ fontSize: 'var(--font-size-md)' }}>
                  الباقة الحالية: {data.currentPlan === 'Starter' || data.currentPlan === 'starter' ? 'المجانية' : data.currentPlan}
                </div>
                <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                  احصل على مميزات إضافية وعمولة أقل مع الباقات المتقدمة
                </div>
              </div>
            </div>
            <Link to="/vendor/subscriptions" className="btn btn-primary">
              عرض الباقات والترقية
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-4 mb-8">
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="stat-card__label">إجمالي الطلبات</div>
            <div className="stat-card__value" style={{ marginBottom: 0 }}>
              <AnimatedNumber value={stats.totalOrders || 0} />
            </div>
          </div>
          <div className="feature-card__icon">
            <ShoppingCart size={20} />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="stat-card__label">الإيرادات</div>
            <div className="stat-card__value text-brand" style={{ marginBottom: 0 }}>
              <AnimatedNumber value={parseFloat(stats.totalRevenue || '0')} suffix=" ج.م" decimals={2} />
            </div>
          </div>
          <div className="feature-card__icon">
            <DollarSign size={20} />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="stat-card__label">طلبات معلقة</div>
            <div className="stat-card__value" style={{ marginBottom: 0 }}>
              <AnimatedNumber value={stats.pendingOrders || 0} />
            </div>
          </div>
          <div className="feature-card__icon">
            <Clock size={20} />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="stat-card__label">العمولة</div>
            <div className="stat-card__value" style={{ marginBottom: 0 }}>
              <AnimatedNumber value={parseFloat(stats.totalCommission || '0')} suffix=" ج.م" decimals={2} />
            </div>
          </div>
          <div className="feature-card__icon">
            <Package size={20} />
          </div>
        </div>
      </div>

      {/* Low stock warning */}
      {data?.lowStockProducts?.length > 0 && (
        <div className="card card-body mb-8" style={{ borderColor: 'var(--warning-500)' }}>
          <h3 className="flex items-center gap-2 font-bold m-0 mb-4" style={{ color: 'var(--warning-700)', fontSize: 'var(--font-size-md)' }}>
            <AlertTriangle size={18} /> منتجات بمخزون منخفض
          </h3>
          <div className="flex flex-col gap-2">
            {data.lowStockProducts.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center" style={{ fontSize: 'var(--font-size-sm)' }}>
                <span className="text-primary font-medium">{p.name}</span>
                <span className="badge badge-warning">متبقي {p.stock}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="card" style={{ overflowX: 'auto' }}>
        <div
          className="card-body flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-color)', padding: 'var(--space-4) var(--space-5)' }}
        >
          <h3 className="text-primary font-bold m-0" style={{ fontSize: 'var(--font-size-md)' }}>
            أحدث الطلبات
          </h3>
          <Link to="/vendor/orders" className="btn btn-outline btn-sm">
            عرض كل الطلبات
          </Link>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>المنتج</th>
              <th>الكمية</th>
              <th>المبلغ</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recentOrders || []).map((item: any) => {
              const statusMap: Record<string, { label: string; cls: string }> = {
                pending: { label: 'معلق', cls: 'badge-warning' },
                confirmed: { label: 'مؤكد', cls: 'badge-info' },
                shipped: { label: 'شُحن', cls: 'badge-info' },
                delivered: { label: 'وُصّل', cls: 'badge-success' },
                cancelled: { label: 'ملغي', cls: 'badge-error' },
              };
              const s = statusMap[item.vendorStatus] || statusMap.pending;
              return (
                <tr key={item.id}>
                  <td className="font-semibold text-primary">#{item.orderNumber}</td>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td className="font-bold text-brand">{parseFloat(item.total).toLocaleString('ar-EG')} ج.م</td>
                  <td>
                    <span className={`badge ${s.cls}`}>
                      <span className="badge-dot" /> {s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
