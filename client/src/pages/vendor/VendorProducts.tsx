import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi, storeApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, Search, ChevronRight, ChevronLeft } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  slug: string;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: number;
  images: { id: number; url: string; isPrimary: boolean }[];
  createdAt: string;
}

const initialForm = {
  name: '', description: '', price: '', compareAtPrice: '', stock: 10,
  categoryId: 0, sku: '', weight: '', shippingCost: '',
};

export default function VendorProducts() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState(initialForm);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-products', page],
    queryFn: () => vendorApi.getProducts(page),
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => storeApi.getCategories(),
  });

  const products: Product[] = data?.data ?? [];
  const meta = data?.meta;
  const categories = categoriesData || [];

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        description: form.description,
        price: form.price,
        comparePrice: form.compareAtPrice || undefined,
        stock: form.stock,
        categoryId: form.categoryId,
        sku: form.sku || undefined,
      };
      if (editId) {
        return vendorApi.updateProduct(editId, payload);
      }
      return vendorApi.createProduct(payload);
    },
    onSuccess: async (res) => {
      // Upload images for new products
      if (!editId && imageFiles.length > 0 && res?.data?.id) {
        for (const file of imageFiles) {
          const fd = new FormData();
          fd.append('image', file);
          try {
            await vendorApi.uploadProductImage(res.data.id, fd);
          } catch { /* ignore individual upload errors */ }
        }
      }
      addToast(editId ? 'تم تحديث المنتج' : 'تم إضافة المنتج', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-products'] });
      resetForm();
    },
    onError: (err: any) => addToast(err?.message || 'حدث خطأ أثناء الحفظ', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => vendorApi.deleteProduct(id),
    onSuccess: () => {
      addToast('تم حذف المنتج', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-products'] });
    },
    onError: (err: any) => addToast(err?.message || 'حدث خطأ أثناء الحذف', 'error'),
  });

  function resetForm() {
    setForm(initialForm);
    setEditId(null);
    setShowForm(false);
    setImageFiles([]);
  }

  function startEdit(p: Product) {
    setForm({
      name: p.name,
      description: '',
      price: p.price,
      compareAtPrice: p.compareAtPrice || '',
      stock: p.stock,
      categoryId: p.categoryId,
      sku: '',
      weight: '',
      shippingCost: '',
    });
    setEditId(p.id);
    setShowForm(true);
  }

  const filtered = search
    ? products.filter(p => p.name.includes(search))
    : products;

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>إدارة المنتجات</h2>
        <button className="btn btn--primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} /> إضافة منتج
        </button>
      </div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 'var(--space-4)', maxWidth: 360 }}>
        <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
        <input
          className="input"
          placeholder="بحث في المنتجات..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingRight: 40 }}
        />
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="modal-backdrop" onClick={resetForm}>
          <div className="card" onClick={e => e.stopPropagation()} style={{ maxWidth: 560, width: '90vw', maxHeight: '85vh', overflow: 'auto', margin: 'auto' }}>
            <div style={{ padding: 'var(--space-5)' }}>
              <h3 style={{ marginTop: 0 }}>{editId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
              <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}>
                <div className="form-group">
                  <label className="form-label">اسم المنتج *</label>
                  <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">الوصف</label>
                  <textarea className="input" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">السعر (ج.م) *</label>
                    <input className="input" type="number" step="0.01" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">السعر قبل الخصم</label>
                    <input className="input" type="number" step="0.01" value={form.compareAtPrice} onChange={e => setForm(f => ({ ...f, compareAtPrice: e.target.value }))} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">المخزون *</label>
                    <input className="input" type="number" required value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">القسم *</label>
                    <select 
                      className="input" 
                      value={form.categoryId || ''} 
                      onChange={e => setForm({ ...form, categoryId: parseInt(e.target.value) })}
                      required
                    >
                      <option value="" disabled>اختر القسم</option>
                      {categories.map((c: any) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 'var(--space-3)' }}>
                  <div className="form-group">
                    <label className="form-label">SKU</label>
                    <input className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                  </div>
                </div>
                {!editId && (
                  <div className="form-group">
                    <label className="form-label">صور المنتج</label>
                    <input type="file" accept="image/*" multiple onChange={e => setImageFiles(Array.from(e.target.files ?? []))} />
                    {imageFiles.length > 0 && <small style={{ color: 'var(--neutral-500)' }}>{imageFiles.length} صورة محددة</small>}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                  <button className="btn btn--primary" type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'جاري الحفظ...' : editId ? 'تحديث' : 'إضافة'}
                  </button>
                  <button className="btn btn--outline" type="button" onClick={resetForm}>إلغاء</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state__title">لا توجد منتجات</div>
          <p>أضف منتجك الأول لبدء البيع</p>
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>المنتج</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>السعر</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>المخزون</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>الحالة</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                      ) : (
                        <div style={{ width: 48, height: 48, background: 'var(--neutral-100)', borderRadius: 'var(--radius-md)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Image size={20} color="var(--neutral-400)" />
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{p.name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-500)' }}>#{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3)', fontWeight: 600 }}>{parseFloat(p.price).toLocaleString('ar-EG')} ج.م</td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <span className={`badge badge--${p.stock > 10 ? 'success' : p.stock > 0 ? 'warning' : 'error'}`}>
                      {p.stock > 0 ? `${p.stock} وحدة` : 'نفد'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    {p.isActive ? (
                      <span className="badge badge--success">نشط</span>
                    ) : (
                      <span className="badge badge--error">معطّل</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-2)' }}>
                      <button className="btn btn--ghost" title="تعديل" onClick={() => startEdit(p)} style={{ padding: 'var(--space-2)' }}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn--ghost" title={p.isActive ? 'إخفاء' : 'إظهار'} style={{ padding: 'var(--space-2)' }}>
                        {p.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        className="btn btn--ghost"
                        title="حذف"
                        style={{ padding: 'var(--space-2)', color: 'var(--error-500)' }}
                        onClick={() => { if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) deleteMutation.mutate(p.id); }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button className="btn btn--outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight size={18} /> السابق
          </button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>
            صفحة {meta.page} من {meta.totalPages}
          </span>
          <button className="btn btn--outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
            التالي <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
