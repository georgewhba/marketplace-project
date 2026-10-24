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
  images: { url?: string; imageUrl?: string }[];
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
    onSuccess: () => {
      addToast('تم تحديث حالة تمييز المنتج', 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleProduct(id),
    onSuccess: () => {
      addToast('تم تحديث حالة ظهور المنتج', 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteProduct(id),
    onSuccess: () => {
      addToast('تم حذف المنتج', 'success');
      qc.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const filtered = search ? products.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : products;

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Package size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إدارة المنتجات</h1>
            <p className="page-header__subtitle">مراجعة منتجات المتاجر، تمييز العروض، والتحكم في حالة النشر</p>
          </div>
        </div>
        <span className="catalog-count-badge">
          المعروض: <strong>{filtered.length}</strong> منتج
        </span>
      </div>

      <div className="card card-body mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <div className="relative" style={{ maxWidth: 420 }}>
          <Search
            size={18}
            className="text-muted"
            style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            className="form-input"
            placeholder="بحث باسم المنتج..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingInlineEnd: 42 }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 64 }} />
          ))}
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
                <th className="text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const imgUrl = p.images?.[0]?.url || p.images?.[0]?.imageUrl;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {imgUrl ? (
                          <img
                            src={imgUrl}
                            alt=""
                            style={{ width: 44, height: 44, objectFit: 'cover', borderRadius: 'var(--radius-md)' }}
                          />
                        ) : (
                          <div
                            className="flex items-center justify-center bg-surface-2"
                            style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)' }}
                          >
                            <Image size={18} className="text-muted" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-primary" style={{ fontSize: 'var(--font-size-sm)' }}>
                            {p.name}
                          </div>
                          {p.isFeatured && (
                            <span className="badge badge-brand" style={{ fontSize: '10px', marginTop: 2 }}>
                              مميز ⭐
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>{p.vendorName || '—'}</td>
                    <td className="font-bold text-brand" style={{ fontSize: 'var(--font-size-sm)' }}>
                      {parseFloat(p.price).toLocaleString('ar-EG')} ج.م
                    </td>
                    <td className="text-center">
                      <span className={`badge ${p.isActive ? 'badge-success' : 'badge-error'}`}>
                        {p.isActive ? 'نشط' : 'معطّل'}
                      </span>
                    </td>
                    <td>
                      <div className="flex justify-center gap-2">
                        <button
                          className="icon-btn"
                          title={p.isFeatured ? 'إلغاء التمييز' : 'تمييز'}
                          style={{ color: p.isFeatured ? 'var(--accent-500)' : 'var(--text-muted)' }}
                          onClick={() => featureMutation.mutate(p.id)}
                        >
                          <Star size={16} fill={p.isFeatured ? 'currentColor' : 'none'} />
                        </button>
                        <button
                          className="icon-btn"
                          title={p.isActive ? 'إخفاء' : 'إظهار'}
                          onClick={() => toggleMutation.mutate(p.id)}
                        >
                          {p.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button
                          className="icon-btn"
                          title="حذف"
                          style={{ color: 'var(--error-500)' }}
                          onClick={() => {
                            if (confirm('حذف هذا المنتج؟')) deleteMutation.mutate(p.id);
                          }}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button className="btn btn-outline btn-sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight size={18} /> السابق
          </button>
          <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            صفحة {meta.page} من {meta.totalPages}
          </span>
          <button className="btn btn-outline btn-sm" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
            التالي <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
