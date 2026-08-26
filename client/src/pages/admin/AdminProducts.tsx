import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Star, Eye, EyeOff, Trash2, Search, ChevronRight, ChevronLeft, Package, Image } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: string;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  vendorName: string;
  images: { url: string }[];
  createdAt: string;
}

export default function AdminProducts() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page],
    queryFn: () => adminApi.getProducts(page),
  });

  const products: Product[] = data?.data ?? [];
  const meta = data?.meta;

  const featureMutation = useMutation({
    mutationFn: (id: number) => adminApi.featureProduct(id),
    onSuccess: () => { addToast('تم تحديث حالة المنتج', 'success'); qc.invalidateQueries({ queryKey: ['admin-products'] }); },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleProduct(id),
    onSuccess: () => { addToast('تم تحديث حالة المنتج', 'success'); qc.invalidateQueries({ queryKey: ['admin-products'] }); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteProduct(id),
    onSuccess: () => { addToast('تم حذف المنتج', 'success'); qc.invalidateQueries({ queryKey: ['admin-products'] }); },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const filtered = search ? products.filter(p => p.name.includes(search)) : products;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Package size={24} className="text-brand" />
        <h1 className="page-header__title m-0">إدارة المنتجات</h1>
      </div>

      <div className="relative mb-4" style={{ maxWidth: 360 }}>
        <Search size={18} className="text-muted" style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input className="input" placeholder="بحث في المنتجات..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingInlineStart: 40 }} />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>البائع</th>
                <th>السعر</th>
                <th className="text-center">الحالة</th>
                <th className="text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                      ) : (
                        <div className="flex items-center justify-center bg-surface-2" style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)' }}><Image size={16} className="text-muted" /></div>
                      )}
                      <span className="font-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>{p.name}</span>
                    </div>
                  </td>
                  <td className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>{p.vendorName || '—'}</td>
                  <td className="font-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>{parseFloat(p.price).toLocaleString('ar-EG')} ج.م</td>
                  <td className="text-center">
                    <span className={`badge ${p.isActive ? 'badge-success' : 'badge-error'}`}>{p.isActive ? 'نشط' : 'معطّل'}</span>
                  </td>
                  <td>
                    <div className="flex justify-center gap-2">
                      <button className="btn btn-ghost" title={p.isFeatured ? 'إلغاء التمييز' : 'تمييز'} style={{ padding: 'var(--space-2)', color: p.isFeatured ? 'var(--accent-500)' : 'var(--text-muted)' }}
                        onClick={() => featureMutation.mutate(p.id)}><Star size={16} fill={p.isFeatured ? 'currentColor' : 'none'} /></button>
                      <button className="btn btn-ghost" title={p.isActive ? 'إخفاء' : 'إظهار'} style={{ padding: 'var(--space-2)', color: 'var(--text-muted)' }}
                        onClick={() => toggleMutation.mutate(p.id)}>{p.isActive ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      <button className="btn btn-ghost" title="حذف" style={{ padding: 'var(--space-2)', color: 'var(--error-500)' }}
                        onClick={() => { if (confirm('حذف هذا المنتج؟')) deleteMutation.mutate(p.id); }}><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={18} /> السابق</button>
          <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>التالي <ChevronLeft size={18} /></button>
        </div>
      )}
    </div>
  );
}
