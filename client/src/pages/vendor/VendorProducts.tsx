import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi, storeApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, Search, ChevronRight, ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../../lib/motion-tokens';

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
  const shouldReduceMotion = useReducedMotion();
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
  const categories = categoriesData?.data || [];

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
        let hasErrors = false;
        for (const file of imageFiles) {
          const fd = new FormData();
          fd.append('image', file);
          try {
            await vendorApi.uploadProductImage(res.data.id, fd);
          } catch (err: any) { 
            hasErrors = true;
            addToast(`فشل رفع ${file.name}: ${err.response?.data?.message || err.message}`, 'error');
          }
        }
        if (!hasErrors) {
          addToast('تم إضافة المنتج والصور بنجاح', 'success');
        } else {
          addToast('تم إضافة المنتج ولكن فشل رفع بعض الصور', 'error');
        }
      } else {
        addToast(editId ? 'تم تحديث المنتج' : 'تم إضافة المنتج', 'success');
      }
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
    <div>
      <div className="page-header mb-5 flex justify-between items-center">
        <h1 className="page-header__title m-0">إدارة المنتجات</h1>
        <button className="btn btn-primary fab-mobile" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} /> <span className="hidden sm:inline">إضافة منتج</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4" style={{ maxWidth: 360 }}>
        <Search size={18} className="absolute text-muted" style={{ insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input
          className="input"
          placeholder="بحث في المنتجات..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ paddingInlineStart: 40 }}
        />
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            className="fixed inset-0 flex items-center justify-center z-50" 
            style={{ backgroundColor: 'var(--bg-overlay)' }}
            onClick={resetForm}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
          >
            <motion.div 
              className="card relative" 
              onClick={e => e.stopPropagation()} 
              style={{ maxWidth: 560, width: '90vw', maxHeight: '85vh', overflow: 'auto' }}
              initial={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              transition={{ duration: motionTokens.duration.base, ...motionTokens.easing.spring }}
            >
            <div className="p-5">
              <h3 className="mt-0 mb-4">{editId ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h3>
              <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}>
                <div className="form-group mb-3">
                  <label className="form-label">اسم المنتج *</label>
                  <input className="input w-full" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div className="form-group mb-3">
                  <label className="form-label">الوصف</label>
                  <textarea className="input w-full" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-2 gap-3 mb-3">
                  <div className="form-group">
                    <label className="form-label">السعر (ج.م) *</label>
                    <input className="input w-full" type="number" step="0.01" required value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">السعر قبل الخصم</label>
                    <input className="input w-full" type="number" step="0.01" value={form.compareAtPrice} onChange={e => setForm(f => ({ ...f, compareAtPrice: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-2 gap-3 mb-3">
                  <div className="form-group">
                    <label className="form-label">المخزون *</label>
                    <input className="input w-full" type="number" required value={form.stock} onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">القسم *</label>
                    <select 
                      className="input w-full" 
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
                <div className="form-group mb-3">
                  <label className="form-label">SKU</label>
                  <input className="input w-full" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                </div>
                {!editId && (
                  <div className="form-group mb-3">
                    <label className="form-label">صور المنتج</label>
                    <input type="file" className="input w-full" accept="image/*" multiple onChange={e => {
                      const files = Array.from(e.target.files ?? []);
                      setImageFiles(prev => [...prev, ...files]);
                    }} />
                    {imageFiles.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        <small className="text-muted">{imageFiles.length} صورة محددة</small>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {imageFiles.map((f, i) => (
                            <div key={i} className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                              <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover rounded" />
                              <button type="button" className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1" style={{ transform: 'translate(25%, -25%)' }}
                                onClick={() => setImageFiles(prev => prev.filter((_, idx) => idx !== i))}>
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex gap-3 mt-4">
                  <button className="btn btn-primary flex-1" type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? 'جاري الحفظ...' : editId ? 'تحديث' : 'إضافة'}
                  </button>
                  <button className="btn btn-outline flex-1" type="button" onClick={resetForm}>إلغاء</button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>

      {/* Products Table */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state border-0">
          <div className="empty-state__title">لا توجد منتجات</div>
          <p>أضف منتجك الأول لبدء البيع</p>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table w-full text-right">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th className="text-center">الحالة</th>
                <th className="text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {p.images?.[0] ? (
                        <img src={p.images[0].url} alt="" className="rounded-md object-cover" style={{ width: 48, height: 48 }} />
                      ) : (
                        <div className="rounded-md flex items-center justify-center bg-gray-100" style={{ width: 48, height: 48 }}>
                          <Image size={20} className="text-muted" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold" style={{ fontSize: 'var(--font-size-sm)' }}>{p.name}</div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>#{p.id}</div>
                      </div>
                    </div>
                  </td>
                  <td className="font-semibold">{parseFloat(p.price).toLocaleString('ar-EG')} ج.م</td>
                  <td>
                    <span className={`badge badge-${p.stock > 10 ? 'success' : p.stock > 0 ? 'warning' : 'error'}`}>
                      {p.stock > 0 ? `${p.stock} وحدة` : 'نفد'}
                    </span>
                  </td>
                  <td className="text-center">
                    {p.isActive ? (
                      <span className="badge badge-success">نشط</span>
                    ) : (
                      <span className="badge badge-error">معطّل</span>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-center gap-2">
                      <button className="btn btn-ghost p-2" title="تعديل" onClick={() => startEdit(p)}>
                        <Edit2 size={16} />
                      </button>
                      <button className="btn btn-ghost p-2" title={p.isActive ? 'إخفاء' : 'إظهار'}>
                        {p.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <button
                        className="btn btn-ghost p-2 text-red-500"
                        title="حذف"
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
        <div className="flex justify-center items-center gap-3 mt-6">
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronRight size={18} /> السابق
          </button>
          <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
            صفحة {meta.page} من {meta.totalPages}
          </span>
          <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>
            التالي <ChevronLeft size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
