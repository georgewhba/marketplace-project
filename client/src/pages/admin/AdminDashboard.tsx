import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { LayoutDashboard, Users, Store, Package, ShoppingCart, DollarSign, Tag, Settings, Ticket, Undo } from 'lucide-react';

const sidebarLinks = [
  { to: '/admin', icon: LayoutDashboard, label: 'لوحة التحكم', exact: true },
  { to: '/admin/vendors', icon: Store, label: 'البائعين' },
  { to: '/admin/commission-rules', icon: Tag, label: 'قواعد العمولة' },
  { to: '/admin/products', icon: Package, label: 'المنتجات' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'الطلبات' },
  { to: '/admin/settlements', icon: DollarSign, label: 'التسويات' },
  { to: '/admin/payouts', icon: DollarSign, label: 'طلبات السحب' },
  { to: '/admin/users', icon: Users, label: 'المستخدمين' },
  { to: '/admin/categories', icon: Tag, label: 'الأقسام' },
  { to: '/admin/refunds', icon: Undo, label: 'المرتجعات' },
  { to: '/admin/coupons', icon: Ticket, label: 'الكوبونات' },
  { to: '/admin/settings', icon: Settings, label: 'الإعدادات' },
];

export function AdminLayout() {
  const location = useLocation();

  return (
    <div className="dashboard-layout">
      <aside className="sidebar">
        <div className="sidebar__section">
          <div className="sidebar__section-title">لوحة الإدارة</div>
          {sidebarLinks.map(link => {
            const isActive = link.exact ? location.pathname === link.to : location.pathname.startsWith(link.to);
            return (
              <Link key={link.to} to={link.to} className={`sidebar__link ${isActive ? 'active' : ''}`}>
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
          <div className="stat-card__value">{stats.totalUsers}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">البائعين المعتمدين</div>
          <div className="stat-card__value">{stats.totalVendors}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">المنتجات</div>
          <div className="stat-card__value">{stats.totalProducts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">إجمالي الطلبات</div>
          <div className="stat-card__value">{stats.totalOrders}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label">إجمالي الإيرادات</div>
          <div className="stat-card__value">{parseFloat(stats.totalRevenue || '0').toLocaleString('ar-EG')} ج.م</div>
        </div>
        <div className="stat-card">
          <div className="stat-card__label" style={{ color: 'var(--warning-500)' }}>بائعين بانتظار الموافقة</div>
          <div className="stat-card__value">{stats.pendingVendors}</div>
        </div>
      </div>

      {/* Recent orders table */}
      <div className="card">
        <div className="card-body">
          <h3 style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>أحدث الطلبات</h3>
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
                shipped: { label: 'شُحن', cls: 'badge-info' },
                delivered: { label: 'وُصّل', cls: 'badge-success' },
                cancelled: { label: 'ملغي', cls: 'badge-error' },
              };
              const s = statusLabels[order.status] || statusLabels.pending;
              return (
                <tr key={order.id}>
                  <td style={{ fontWeight: 600 }}>{order.orderNumber}</td>
                  <td>{order.customerName}</td>
                  <td>{parseFloat(order.total).toLocaleString('ar-EG')} ج.م</td>
                  <td><span className={`badge ${s.cls}`}><span className="badge-dot" /> {s.label}</span></td>
                  <td style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
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
