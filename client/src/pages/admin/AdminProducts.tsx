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
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <Package size={24} color="var(--primary-500)" />
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>إدارة المنتجات</h2>
      </div>

      <div style={{ position: 'relative', marginBottom: 'var(--space-4)', maxWidth: 360 }}>
        <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
        <input className="input" placeholder="بحث في المنتجات..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>المنتج</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>البائع</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>السعر</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>الحالة</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                      ) : (
                        <div style={{ width: 40, height: 40, background: 'var(--neutral-100)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Image size={16} color="var(--neutral-400)" /></div>
                      )}
                      <span style={{ fontWeight: 500, fontSize: 'var(--text-sm)' }}>{p.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>{p.vendorName || '—'}</td>
                  <td style={{ padding: 'var(--space-3)', fontWeight: 600, fontSize: 'var(--text-sm)' }}>{parseFloat(p.price).toLocaleString('ar-EG')} ج.م</td>
                  <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <span className={`badge ${p.isActive ? 'badge--success' : 'badge--error'}`}>{p.isActive ? 'نشط' : 'معطّل'}</span>
                  </td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}>
                      <button className="btn btn--ghost" title={p.isFeatured ? 'إلغاء التمييز' : 'تمييز'} style={{ padding: 'var(--space-2)', color: p.isFeatured ? 'var(--accent-500)' : 'var(--neutral-400)' }}
                        onClick={() => featureMutation.mutate(p.id)}><Star size={16} fill={p.isFeatured ? 'currentColor' : 'none'} /></button>
                      <button className="btn btn--ghost" title={p.isActive ? 'إخفاء' : 'إظهار'} style={{ padding: 'var(--space-2)' }}
                        onClick={() => toggleMutation.mutate(p.id)}>{p.isActive ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                      <button className="btn btn--ghost" title="حذف" style={{ padding: 'var(--space-2)', color: 'var(--error-500)' }}
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button className="btn btn--outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={18} /> السابق</button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn--outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>التالي <ChevronLeft size={18} /></button>
        </div>
      )}
    </div>
  );
}
