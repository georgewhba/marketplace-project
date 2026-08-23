import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  getAdminOverview, 
  getAdminTopProducts, 
  getAdminTopVendors, 
  getAdminFunnel, 
  getAdminCategoriesAnalytics 
} from '../../api';
import { BarChart, ProgressBar } from '../../components/ui/Chart';
import { exportToCsv } from '../../utils/exportCsv';
import { formatCurrency, formatDate } from '../../utils/format';
import { Download } from 'lucide-react';

export default function AdminAnalytics() {
  const [days, setDays] = useState(30);

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['adminAnalytics', 'overview', days],
    queryFn: () => getAdminOverview(days).then(res => res.data)
  });

  const { data: topProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ['adminAnalytics', 'topProducts', days],
    queryFn: () => getAdminTopProducts(days).then(res => res.data)
  });

  const { data: topVendors, isLoading: loadingVendors } = useQuery({
    queryKey: ['adminAnalytics', 'topVendors', days],
    queryFn: () => getAdminTopVendors(days).then(res => res.data)
  });

  const { data: funnel, isLoading: loadingFunnel } = useQuery({
    queryKey: ['adminAnalytics', 'funnel'],
    queryFn: () => getAdminFunnel().then(res => res.data)
  });

  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['adminAnalytics', 'categories'],
    queryFn: () => getAdminCategoriesAnalytics().then(res => res.data)
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">التحليلات المتقدمة</h1>
          <p className="text-[var(--text-secondary)] mt-1">نظرة شاملة على أداء المنصة</p>
        </div>
        <select 
          value={days} 
          onChange={(e) => setDays(Number(e.target.value))}
          className="border border-[var(--border-color)] rounded-[var(--radius-md)] px-4 py-2 bg-[var(--bg-surface)] focus:border-[var(--brand-500)] outline-none"
        >
          <option value={7}>آخر 7 أيام</option>
          <option value={30}>آخر 30 يوم</option>
          <option value={90}>آخر 90 يوم</option>
        </select>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'إجمالي المبيعات', value: overview?.metrics?.sales ? formatCurrency(overview.metrics.sales) : '0', change: overview?.metrics?.salesChange },
          { label: 'الطلبات المكتملة', value: overview?.metrics?.orders || 0, change: overview?.metrics?.ordersChange },
          { label: 'عملاء جدد', value: overview?.metrics?.newCustomers || 0, change: overview?.metrics?.customersChange },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
            <h3 className="text-[var(--text-secondary)] font-medium mb-2">{stat.label}</h3>
            {loadingOverview ? (
              <div className="skeleton h-8 w-24" />
            ) : (
              <div className="flex items-end gap-3">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</span>
                <span style={{ color: getChangeColor(stat.change || 0) }} className="text-sm font-medium mb-1">
                  {stat.change > 0 ? '+' : ''}{stat.change}%
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">المبيعات اليومية</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => handleExport('daily_sales', overview?.dailyBreakdown || [])}>
            <Download size={16} className="ml-2" />
            تصدير
          </button>
        </div>
        {loadingOverview ? (
          <div className="skeleton h-[200px] w-full" />
        ) : overview?.dailyBreakdown?.length > 0 ? (
          <BarChart 
            data={overview.dailyBreakdown.map((d: any) => ({
              label: formatDate(d.date),
              value: Number(d.sales)
            }))} 
            formatValue={formatCurrency}
          />
        ) : (
          <div className="text-center p-8 text-[var(--text-secondary)]">لا توجد بيانات</div>
        )}
      </div>

      {/* Funnel & Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-6">قمع التحويل (Funnel)</h2>
          {loadingFunnel ? (
            <div className="space-y-4"><div className="skeleton h-8 w-full" /><div className="skeleton h-8 w-full" /></div>
          ) : (
            <div className="space-y-6">
              <ProgressBar value={funnel?.views || 0} max={funnel?.views || 1} label="مشاهدات المنتجات" />
              <ProgressBar value={funnel?.inCart || 0} max={funnel?.views || 1} label="في سلة التسوق" color="var(--info-500)" />
              <ProgressBar value={funnel?.ordered || 0} max={funnel?.views || 1} label="الطلبات المؤكدة" color="var(--success-500)" />
              
              <div className="mt-8 pt-6 border-t border-[var(--border-color)] grid grid-cols-2 gap-4 text-center">
                <div>
                  <p className="text-[var(--text-secondary)] text-sm mb-1">معدل الإضافة للسلة</p>
                  <p className="text-xl font-bold">{funnel?.cartConversion}%</p>
                </div>
                <div>
                  <p className="text-[var(--text-secondary)] text-sm mb-1">معدل التحويل النهائي</p>
                  <p className="text-xl font-bold text-[var(--success-500)]">{funnel?.orderConversion}%</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">أداء الأقسام</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('categories', categories || [])}>
              <Download size={16} className="ml-2" />
              تصدير
            </button>
          </div>
          {loadingCategories ? (
            <div className="space-y-4"><div className="skeleton h-12 w-full" /><div className="skeleton h-12 w-full" /></div>
          ) : (
            <div className="space-y-4">
              {categories?.map((cat: any) => (
                <div key={cat.id} className="flex justify-between items-center border-b border-[var(--border-color)] pb-3 last:border-0">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{cat.name}</p>
                    <p className="text-sm text-[var(--text-secondary)]">{cat.activeProducts} منتج نشط</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-[var(--brand-600)]">{formatCurrency(cat.totalSales)}</p>
                    <p className="text-sm text-[var(--text-secondary)]">⭐ {cat.avgRating}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Top Products & Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">أفضل المنتجات</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('top_products', topProducts || [])}>
              <Download size={16} className="ml-2" />
              تصدير
            </button>
          </div>
          {loadingProducts ? (
            <div className="skeleton h-40 w-full" />
          ) : (
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                  <th className="pb-3 font-medium">المنتج</th>
                  <th className="pb-3 font-medium">المبيعات</th>
                  <th className="pb-3 font-medium">الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {topProducts?.map((product: any) => (
                  <tr key={product.id} className="border-b border-[var(--border-color)] last:border-0">
                    <td className="py-3 font-medium text-[var(--text-primary)]">{product.name}</td>
                    <td className="py-3">{product.totalSold}</td>
                    <td className="py-3 font-bold text-[var(--brand-600)]">{formatCurrency(product.totalRevenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">أفضل البائعين</h2>
            <button className="btn btn-ghost btn-sm" onClick={() => handleExport('top_vendors', topVendors || [])}>
              <Download size={16} className="ml-2" />
              تصدير
            </button>
          </div>
          {loadingVendors ? (
            <div className="skeleton h-40 w-full" />
          ) : (
            <table className="w-full text-sm text-right">
              <thead>
                <tr className="text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                  <th className="pb-3 font-medium">البائع</th>
                  <th className="pb-3 font-medium">الطلبات</th>
                  <th className="pb-3 font-medium">الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {topVendors?.map((vendor: any) => (
                  <tr key={vendor.id} className="border-b border-[var(--border-color)] last:border-0">
                    <td className="py-3 font-medium text-[var(--text-primary)]">{vendor.storeName}</td>
                    <td className="py-3">{vendor.totalOrders}</td>
                    <td className="py-3 font-bold text-[var(--brand-600)]">{formatCurrency(vendor.totalRevenue)}</td>
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
