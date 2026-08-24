import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { vendorApi } from '../../api';
import { useToast } from '../../toast';
import { LayoutDashboard, Package, ShoppingCart, DollarSign, Settings, AlertTriangle, Menu, ChevronRight, BarChart2 } from 'lucide-react';
import { AnimatedNumber } from '../../components/AnimatedNumber';

const sidebarLinks = [
  { to: '/vendor', icon: LayoutDashboard, label: 'لوحة التحكم', exact: true },
  { to: '/vendor/analytics', icon: BarChart2, label: 'التحليلات' },
  { to: '/vendor/products', icon: Package, label: 'المنتجات' },
  { to: '/vendor/orders', icon: ShoppingCart, label: 'الطلبات' },
  { to: '/vendor/earnings', icon: DollarSign, label: 'الأرباح' },
  { to: '/vendor/settings', icon: Settings, label: 'إعدادات المتجر' },
];

export function VendorLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="dashboard-layout">
      <div className="dashboard-mobile-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 'var(--space-3) var(--space-4)', background: 'white', borderBottom: '1px solid var(--neutral-200)', position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-1)', display: 'flex', alignItems: 'center', color: 'var(--neutral-700)' }}>
            <Menu size={24} />
          </button>
          
          {location.pathname !== '/vendor' && (
            <button 
              onClick={() => navigate(-1)} 
              style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--neutral-700)', padding: 'var(--space-1)' }}
              title="رجوع"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <span style={{ fontWeight: 600, fontSize: 'var(--text-lg)', color: 'var(--neutral-900)' }}>لوحة البائع</span>
        </div>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--primary-600)', textDecoration: 'none', fontSize: 'var(--text-sm)', fontWeight: 500 }}>
          العودة للمتجر
        </Link>
      </div>
      
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar__section">
          <div className="sidebar__section-title">لوحة البائع</div>
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
    vendorApi.getDashboard()
      .then((res: any) => setData(res.data || res))
      .catch(() => toast.error('فشل تحميل لوحة التحكم'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 16 }} />)}</div>;

  const stats = data?.stats || {};

  return (
    <>
      <h1 className="page-header__title mb-6">لوحة تحكم المتجر</h1>

      <div className="grid grid-4 mb-8">
        <div className="stat-card">
          <div className="stat-card__label">إجمالي الطلبات</div>
          <div className="stat-card__value"><AnimatedNumber value={stats.totalOrders || 0} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">الإيرادات</div>
          <div className="stat-card__value"><AnimatedNumber value={parseFloat(stats.totalRevenue || '0')} suffix=" ج.م" decimals={2} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">طلبات معلقة</div>
          <div className="stat-card__value"><AnimatedNumber value={stats.pendingOrders || 0} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">العمولة</div>
          <div className="stat-card__value"><AnimatedNumber value={parseFloat(stats.totalCommission || '0')} suffix=" ج.م" decimals={2} /></div>
        </div>
      </div>

      {/* Low stock warning */}
      {data?.lowStockProducts?.length > 0 && (
        <div className="card card-body mb-8">
          <h3 className="flex items-center gap-2" style={{ fontWeight: 600, marginBottom: 'var(--space-4)', color: 'var(--warning-700)' }}>
            <AlertTriangle size={18} /> منتجات بمخزون منخفض
          </h3>
          <div className="flex flex-col gap-2">
            {data.lowStockProducts.map((p: any) => (
              <div key={p.id} className="flex justify-between items-center" style={{ fontSize: 'var(--font-size-sm)' }}>
                <span>{p.name}</span>
                <span className="badge badge-warning">متبقي {p.stock}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent orders */}
      <div className="card">
        <div className="card-body">
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>أحدث الطلبات</h3>
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
                  <td style={{ fontWeight: 600 }}>{item.orderNumber}</td>
                  <td>{item.productName}</td>
                  <td>{item.quantity}</td>
                  <td>{parseFloat(item.total).toLocaleString('ar-EG')} ج.م</td>
                  <td><span className={`badge ${s.cls}`}><span className="badge-dot" /> {s.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
