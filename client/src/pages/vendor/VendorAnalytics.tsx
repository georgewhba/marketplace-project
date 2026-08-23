import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getVendorOverview, getVendorAnalyticsProducts } from '../../api';
import { BarChart } from '../../components/ui/Chart';
import { exportToCsv } from '../../utils/exportCsv';
import { formatCurrency, formatDate } from '../../utils/format';
import { Download } from 'lucide-react';

export default function VendorAnalytics() {
  const [days, setDays] = useState(30);

  const { data: overview, isLoading: loadingOverview } = useQuery({
    queryKey: ['vendorAnalytics', 'overview', days],
    queryFn: () => getVendorOverview(days).then(res => res.data)
  });

  const { data: products, isLoading: loadingProducts } = useQuery({
    queryKey: ['vendorAnalytics', 'products', days],
    queryFn: () => getVendorAnalyticsProducts(days).then(res => res.data)
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
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">أداء المتجر</h1>
          <p className="text-[var(--text-secondary)] mt-1">نظرة تحليلية لمبيعاتك ومنتجاتك</p>
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
          { label: 'متوسط قيمة الطلب', value: overview?.metrics?.aov ? formatCurrency(overview.metrics.aov) : '0', change: 0 },
        ].map((stat, i) => (
          <div key={i} className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
            <h3 className="text-[var(--text-secondary)] font-medium mb-2">{stat.label}</h3>
            {loadingOverview ? (
              <div className="skeleton h-8 w-24" />
            ) : (
              <div className="flex items-end gap-3">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{stat.value}</span>
                {stat.change !== 0 && (
                  <span style={{ color: getChangeColor(stat.change || 0) }} className="text-sm font-medium mb-1">
                    {stat.change > 0 ? '+' : ''}{stat.change}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">المبيعات اليومية</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => handleExport('store_sales', overview?.dailyBreakdown || [])}>
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

      {/* Products Performance */}
      <div className="bg-[var(--bg-surface)] p-6 rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] border border-[var(--border-color)]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-[var(--text-primary)]">أداء المنتجات</h2>
          <button className="btn btn-ghost btn-sm" onClick={() => handleExport('store_products', products || [])}>
            <Download size={16} className="ml-2" />
            تصدير
          </button>
        </div>
        {loadingProducts ? (
          <div className="skeleton h-40 w-full" />
        ) : products?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right min-w-[600px]">
              <thead>
                <tr className="text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                  <th className="pb-3 font-medium">المنتج</th>
                  <th className="pb-3 font-medium">المشاهدات</th>
                  <th className="pb-3 font-medium">المبيعات</th>
                  <th className="pb-3 font-medium">معدل التحويل</th>
                  <th className="pb-3 font-medium">الإيرادات</th>
                </tr>
              </thead>
              <tbody>
                {products?.map((product: any) => {
                  const conversion = product.views > 0 ? ((product.totalSold / product.views) * 100).toFixed(2) : '0.00';
                  return (
                    <tr key={product.id} className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-surface-2)] transition-colors">
                      <td className="py-3 font-medium text-[var(--text-primary)]">{product.name}</td>
                      <td className="py-3">{product.views}</td>
                      <td className="py-3">{product.totalSold}</td>
                      <td className="py-3 font-medium text-[var(--success-500)]">{conversion}%</td>
                      <td className="py-3 font-bold text-[var(--brand-600)]">{formatCurrency(product.revenue)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center p-8 text-[var(--text-secondary)]">لا توجد منتجات</div>
        )}
      </div>
    </div>
  );
}
