import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { LayoutDashboard, Users, Store, Package, ShoppingCart, DollarSign, Tag, Settings, Ticket, Undo, Menu, Shield, ChevronRight, BarChart2, Bell, Bot, Mail } from 'lucide-react';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { useAuth } from '../../auth';

const sidebarLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم', exact: true, permission: 'dashboard.view' },
  { to: '/admin/analytics', icon: BarChart2, label: 'التحليلات', permission: 'analytics.view' },
  { to: '/admin/vendors', icon: Store, label: 'البائعين', permission: 'vendors.approve' },
  { to: '/admin/commission-rules', icon: Tag, label: 'قواعد العمولة', permission: 'commission.manage' },
  { to: '/admin/products', icon: Package, label: 'المنتجات', permission: 'products.moderate' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'الطلبات', permission: 'orders.view' },
  { to: '/admin/settlements', icon: DollarSign, label: 'التسويات', permission: 'payouts.approve' },
  { to: '/admin/payouts', icon: DollarSign, label: 'طلبات السحب', permission: 'payouts.approve' },
  { to: '/admin/transactions', icon: DollarSign, label: 'المعاملات المالية', permission: 'orders.view' },
  { to: '/admin/users', icon: Users, label: 'المستخدمين', permission: 'users.manage' },
  { to: '/admin/roles', icon: Shield, label: 'الأدوار والصلاحيات', permission: 'users.manage' },
  { to: '/admin/categories', icon: Tag, label: 'الأقسام', permission: 'categories.manage' },
  { to: '/admin/refunds', icon: Undo, label: 'المرتجعات', permission: 'orders.refund' },
  { to: '/admin/coupons', icon: Ticket, label: 'الكوبونات', permission: 'coupons.manage' },
  { to: '/admin/promotions', icon: Tag, label: 'عروض الباقات', permission: 'coupons.manage' },
  { to: '/admin/message-logs', icon: Mail, label: 'سجل الرسائل', permission: 'audit.view' },
  { to: '/admin/settings', icon: Settings, label: 'الإعدادات', permission: 'settings.edit' },
  { to: '/admin/ai-settings', icon: Bot, label: 'المساعد الذكي', permission: 'settings.edit' },
];

export function AdminLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const filteredLinks = sidebarLinks.filter(link => 
    !link.permission || user?.isSuperAdmin || (user?.permissions || []).includes(link.permission)
  );

  return (
    <div className="dashboard-layout">
      <div className="dashboard-mobile-header">
        <div className="flex items-center gap-3">
          <button className="sidebar-toggle" onClick={() => setIsSidebarOpen(!isSidebarOpen)} aria-label="فتح القائمة الجانبية">
            <Menu size={24} />
          </button>
          
          {location.pathname !== '/admin' && (
            <button 
              onClick={() => navigate(-1)} 
              className="sidebar-toggle"
              title="رجوع"
              aria-label="رجوع"
            >
              <ChevronRight size={24} />
            </button>
          )}

          <span className="text-primary" style={{ fontWeight: 600, fontSize: 'var(--font-size-lg)' }}>لوحة الإدارة</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/notifications" style={{ color: 'var(--text-secondary)' }} aria-label="الإشعارات">
            <Bell size={20} />
          </Link>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--brand-500)', textDecoration: 'none', fontSize: 'var(--font-size-sm)', fontWeight: 500 }}>
            العودة للمتجر
          </Link>
        </div>
      </div>
      
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)} />
      )}
      
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar__section">
          <div className="sidebar__section-title">لوحة الإدارة</div>
          {filteredLinks.map(link => {
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

export default function AdminDashboard() {
  const toast = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.getDashboard()
      .then((res: any) => setData(res.data || res))
      .catch(() => toast.error('فشل تحميل لوحة التحكم'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 100, marginBottom: 16 }} />)}</div>;

  const stats = data?.stats || {};

  return (
    <>
      <h1 className="page-header__title mb-6">لوحة الإدارة</h1>

      <div className="grid grid-3 mb-8">
        <div className="stat-card">
          <div className="stat-card__label">المستخدمين</div>
          <div className="stat-card__value"><AnimatedNumber value={stats.totalUsers || 0} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">البائعين المعتمدين</div>
          <div className="stat-card__value"><AnimatedNumber value={stats.totalVendors || 0} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">المنتجات</div>
          <div className="stat-card__value"><AnimatedNumber value={stats.totalProducts || 0} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">إجمالي الطلبات</div>
          <div className="stat-card__value"><AnimatedNumber value={stats.totalOrders || 0} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">إجمالي الإيرادات</div>
          <div className="stat-card__value"><AnimatedNumber value={parseFloat(stats.totalRevenue || '0')} suffix=" ج.م" decimals={2} /></div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label text-warning">بائعين بانتظار الموافقة</div>
          <div className="stat-card__value"><AnimatedNumber value={stats.pendingVendors || 0} /></div>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="card">
        <div className="card-body">
          <h3 className="text-primary mb-4" style={{ fontWeight: 600 }}>أحدث الطلبات</h3>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>العميل</th>
              <th>المبلغ</th>
              <th>الحالة</th>
              <th>التاريخ</th>
            </tr>
          </thead>
          <tbody>
            {(data?.recentOrders || []).map((order: any) => {
              const statusLabels: Record<string, { label: string; cls: string }> = {
                pending: { label: 'معلق', cls: 'badge-warning' },
                confirmed: { label: 'مؤكد', cls: 'badge-info' },
                processing: { label: 'قيد التجهيز', cls: 'badge-info' },
                shipped: { label: 'شُحن', cls: 'badge-info' },
                delivered: { label: 'وُصّل', cls: 'badge-success' },
                cancelled: { label: 'ملغي', cls: 'badge-error' },
              };
              const s = statusLabels[order.status] || statusLabels.pending;
              return (
                <tr key={order.id}>
                  <td className="text-primary" style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                  <td>{order.customerName}</td>
                  <td>{parseFloat(order.total).toLocaleString('ar-EG')} ج.م</td>
                  <td><span className={`badge ${s.cls}`}><span className="badge-dot" /> {s.label}</span></td>
                  <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {new Date(order.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
