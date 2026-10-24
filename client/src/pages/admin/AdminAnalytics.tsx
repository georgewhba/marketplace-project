import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  getAdminOverview,
  getAdminTopProducts,
  getAdminTopVendors,
  getAdminFunnel,
  getAdminCategoriesAnalytics,
} from '../../api';
import { BarChart, ProgressBar } from '../../components/ui/Chart';
import { exportToCsv } from '../../utils/exportCsv';
import { formatCurrency, formatDate } from '../../utils/format';
import { Download, BarChart2 } from 'lucide-react';

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['adminAnalytics', 'overview', days],
    queryFn: () => getAdminOverview(days).then(res => res.data),
  });

  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['adminAnalytics', 'topProducts', days],
    queryFn: () => getAdminTopProducts(days).then(res => res.data),
  });

  const { data: topVendors, isLoading: loadingVendors } = useQuery({
    queryKey: ['adminAnalytics', 'topVendors', days],
    queryFn: () => getAdminTopVendors(days).then(res => res.data),
  });

  const { data: funnel, isLoading: loadingFunnel } = useQuery({
    queryKey: ['adminAnalytics', 'funnel'],
    queryFn: () => getAdminFunnel().then(res => res.data),
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['adminAnalytics', 'categories'],
    queryFn: () => getAdminCategoriesAnalytics().then(res => res.data),
  });

  const handleExport = (reportName: string, data: any[]) => {
    exportToCsv(`${reportName}_${new Date().toISOString().split('T')[0]}.csv`, data);
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'var(--success-500)';
    if (change < 0) return 'var(--error-500)';
    return 'var(--text-muted)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div className="page-header mb-0">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <BarChart2 size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>التحليلات المتقدمة</h1>
            <p className="page-header__subtitle">نظرة شاملة على أداء المبيعات، التحويل، والأقسام عبر المنصة</p>
          </div>
        </div>
        <select
          value={days}
          onChange={e => setDays(Number(e.target.value))}
          className="form-select"
          style={{ width: 'auto', minWidth: 160 }}
        >
          <option value={7}>آخر 7 أيام</option>
          <option value={30}>آخر 30 يوم</option>
          <option value={90}>آخر 90 يوم</option>
        </select>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-3">
        {[
          {
            label: 'إجمالي المبيعات',
            value: overview?.metrics?.sales ? formatCurrency(overview.metrics.sales) : '0 ج.م',
            change: overview?.metrics?.salesChange,
          },
          {
            label: 'الطلبات المكتملة',
            value: overview?.metrics?.orders || 0,
            change: overview?.metrics?.ordersChange,
          },
          {
            label: 'عملاء جدد',
            value: overview?.metrics?.newCustomers || 0,
            change: overview?.metrics?.customersChange,
          },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <div className="stat-card__label">{stat.label}</div>
            {loadingOverview ? (
              <div className="skeleton" style={{ height: 32, width: 96 }} />
            ) : (
              <div className="flex items-center gap-3">
                <span className="stat-card__value" style={{ marginBottom: 0 }}>
                  {stat.value}
                </span>
                <span
                  style={{
                    color: getChangeColor(stat.change || 0),
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 600,
                  }}
                >
                  {stat.change > 0 ? '+' : ''}
                  {stat.change || 0}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="card card-body">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-primary" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
            المبيعات اليومية
          </h2>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => handleExport('daily_sales', overview?.dailyBreakdown || [])}
          >
            <Download size={15} />
            تصدير CSV
          </button>
        </div>
        {loadingOverview ? (
          <div className="skeleton" style={{ height: 200, width: '100%' }} />
        ) : overview?.dailyBreakdown?.length > 0 ? (
          <BarChart
            data={overview.dailyBreakdown.map((d: any) => ({
              label: formatDate(d.date),
              value: Number(d.sales),
            }))}
            formatValue={formatCurrency}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-secondary)' }}>
            لا توجد بيانات
          </div>
        )}
      </div>

      {/* Funnel & Categories */}
      <div className="grid grid-2">
        <div className="card card-body">
          <h2 className="text-primary mb-6" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
            قمع التحويل (Funnel)
          </h2>
          {loadingFunnel ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="skeleton" style={{ height: 32, width: '100%' }} />
              <div className="skeleton" style={{ height: 32, width: '100%' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>
              <ProgressBar value={funnel?.views || 0} max={funnel?.views || 1} label="مشاهدات المنتجات" />
              <ProgressBar
                value={funnel?.inCart || 0}
                max={funnel?.views || 1}
                label="في سلة التسوق"
                color="var(--info-500)"
              />
              <ProgressBar
                value={funnel?.ordered || 0}
                max={funnel?.views || 1}
                label="الطلبات المؤكدة"
                color="var(--success-500)"
              />

              <div
                style={{
                  marginTop: 'var(--space-4)',
                  paddingTop: 'var(--space-5)',
                  borderTop: '1px solid var(--border-color)',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 'var(--space-4)',
                  textAlign: 'center',
                }}
              >
                <div>
                  <p className="text-secondary mb-1" style={{ fontSize: 'var(--font-size-sm)' }}>
                    معدل الإضافة للسلة
                  </p>
                  <p className="text-primary" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>
                    {funnel?.cartConversion ?? 0}%
                  </p>
                </div>
                <div>
                  <p className="text-secondary mb-1" style={{ fontSize: 'var(--font-size-sm)' }}>
                    معدل التحويل النهائي
                  </p>
                  <p className="text-success" style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700, margin: 0 }}>
                    {funnel?.orderConversion ?? 0}%
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card card-body">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-primary" style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700, margin: 0 }}>
              أداء الأقسام
            </h2>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleExport('categories', categories || [])}
            >
              <Download size={15} />
              تصدير
            </button>
          </div>
          {loadingCategories ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div className="skeleton" style={{ height: 48, width: '100%' }} />
              <div className="skeleton" style={{ height: 48, width: '100%' }} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
              {categories?.map((cat: any) => (
                <div
                  key={cat.id}
                  className="flex justify-between items-center"
                  style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: 'var(--space-3)' }}
                >
                  <div>
                    <p className="text-primary" style={{ fontWeight: 600, margin: 0 }}>
                      {cat.name}
                    </p>
                    <p className="text-secondary" style={{ fontSize: 'var(--font-size-xs)', margin: 0 }}>
                      {cat.activeProducts} منتج نشط
                    </p>
                  </div>
                  <div style={{ textAlign: 'end' }}>
                    <p className="text-brand" style={{ fontWeight: 700, margin: 0 }}>
                      {formatCurrency(cat.totalSales)}
                    </p>
                    <p className="text-secondary" style={{ fontSize: 'var(--font-size-xs)', margin: 0 }}>
                      ⭐ {cat.avgRating}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Products & Vendors */}
      <div className="grid grid-2">
        <div className="card" style={{ overflowX: 'auto' }}>
          <div
            className="card-body flex justify-between items-center"
            style={{ borderBottom: '1px solid var(--border-color)', padding: 'var(--space-4) var(--space-5)' }}
          >
            <h2 className="text-primary" style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, margin: 0 }}>
              أفضل المنتجات
            </h2>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleExport('top_products', topProducts || [])}
            >
              <Download size={14} /> تصدير
            </button>
          </div>
          {loadingProducts ? (
            <div className="p-5">
              <div className="skeleton" style={{ height: 160, width: '100%' }} />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>المنتج</th>
                  <th>المبيعات</th>
                  <th>الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {topProducts?.map((product: any) => (
                  <tr key={product.id}>
                    <td className="text-primary" style={{ fontWeight: 600 }}>
                      {product.name}
                    </td>
                    <td>{product.totalSold}</td>
                    <td className="text-brand" style={{ fontWeight: 700 }}>
                      {formatCurrency(product.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card" style={{ overflowX: 'auto' }}>
          <div
            className="card-body flex justify-between items-center"
            style={{ borderBottom: '1px solid var(--border-color)', padding: 'var(--space-4) var(--space-5)' }}
          >
            <h2 className="text-primary" style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, margin: 0 }}>
              أفضل البائعين
            </h2>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => handleExport('top_vendors', topVendors || [])}
            >
              <Download size={14} /> تصدير
            </button>
          </div>
          {loadingVendors ? (
            <div className="p-5">
              <div className="skeleton" style={{ height: 160, width: '100%' }} />
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>البائع</th>
                  <th>الطلبات</th>
                  <th>الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {topVendors?.map((vendor: any) => (
                  <tr key={vendor.id}>
                    <td className="text-primary" style={{ fontWeight: 600 }}>
                      {vendor.storeName}
                    </td>
                    <td>{vendor.totalOrders}</td>
                    <td className="text-brand" style={{ fontWeight: 700 }}>
                      {formatCurrency(vendor.totalRevenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
