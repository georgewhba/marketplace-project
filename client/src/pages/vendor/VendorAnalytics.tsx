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
    <div>
      <div className="page-header flex justify-between items-center mb-6">
        <div>
          <h1 className="page-header__title m-0">أداء المتجر</h1>
          <p className="page-header__subtitle mt-1">نظرة تحليلية لمبيعاتك ومنتجاتك</p>
        </div>
        <select 
          value={days} 
          onChange={(e) => setDays(Number(e.target.value))}
          className="input"
          style={{ width: 'auto' }}
        >
          <option value={7}>آخر 7 أيام</option>
          <option value={30}>آخر 30 يوم</option>
          <option value={90}>آخر 90 يوم</option>
        </select>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-3 mb-8">
        {[
          { label: 'إجمالي المبيعات', value: overview?.metrics?.sales ? formatCurrency(overview.metrics.sales) : '0', change: overview?.metrics?.salesChange },
          { label: 'الطلبات المكتملة', value: overview?.metrics?.orders || 0, change: overview?.metrics?.ordersChange },
          { label: 'متوسط قيمة الطلب', value: overview?.metrics?.aov ? formatCurrency(overview.metrics.aov) : '0', change: 0 },
        ].map((stat, i) => (
          <div key={i} className="stat-card">
            <h3 className="stat-card__label mb-2">{stat.label}</h3>
            {loadingOverview ? (
              <div className="skeleton" style={{ height: 32, width: '60%' }} />
            ) : (
              <div className="flex items-end gap-3">
                <span className="stat-card__value">{stat.value}</span>
                {stat.change !== 0 && (
                  <span style={{ color: getChangeColor(stat.change || 0), fontSize: 'var(--font-size-sm)' }} className="font-semibold mb-1">
                    {stat.change > 0 ? '+' : ''}{stat.change}%
                  </span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sales Chart */}
      <div className="card p-6 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-bold text-lg m-0">المبيعات اليومية</h2>
          <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => handleExport('store_sales', overview?.dailyBreakdown || [])}>
            <Download size={16} />
            تصدير
          </button>
        </div>
        {loadingOverview ? (
          <div className="skeleton w-full" style={{ height: 200 }} />
        ) : overview?.dailyBreakdown?.length > 0 ? (
          <BarChart 
            data={overview.dailyBreakdown.map((d: any) => ({
              label: formatDate(d.date),
              value: Number(d.sales)
            }))} 
            formatValue={formatCurrency}
          />
        ) : (
          <div className="empty-state border-0">لا توجد بيانات</div>
        )}
      </div>

      {/* Products Performance */}
      <div className="card p-0 mb-8" style={{ overflowX: 'auto' }}>
        <div className="flex justify-between items-center p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <h2 className="font-bold text-lg m-0">أداء المنتجات</h2>
          <button className="btn btn-ghost btn-sm flex items-center gap-1" onClick={() => handleExport('store_products', products || [])}>
            <Download size={16} />
            تصدير
          </button>
        </div>
        {loadingProducts ? (
          <div className="p-6"><div className="skeleton w-full" style={{ height: 160 }} /></div>
        ) : products?.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>المشاهدات</th>
                <th>المبيعات</th>
                <th>معدل التحويل</th>
                <th>الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              {products?.map((product: any) => {
                const conversion = product.views > 0 ? ((product.totalSold / product.views) * 100).toFixed(2) : '0.00';
                return (
                  <tr key={product.id}>
                    <td className="font-semibold">{product.name}</td>
                    <td>{product.views}</td>
                    <td>{product.totalSold}</td>
                    <td className="font-semibold" style={{ color: 'var(--success-500)' }}>{conversion}%</td>
                    <td className="font-bold text-brand">{formatCurrency(product.revenue)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <div className="empty-state border-0">لا توجد منتجات</div>
        )}
      </div>
    </div>
  );
}
