import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi, storeApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Edit2, Trash2, Eye, EyeOff, Image, Search, ChevronRight, ChevronLeft, Package, X, Save } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../../lib/motion-tokens';

interface Product {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  sku?: string | null;
  price: string;
  comparePrice?: string | null;
  compareAtPrice?: string | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  categoryId: number;
  images: { id: number; url?: string; imageUrl?: string; isPrimary?: boolean }[];
  createdAt: string;
}

const initialForm = {
  name: '',
  description: '',
  price: '',
  compareAtPrice: '',
  stock: 10,
  categoryId: 0,
  sku: '',
  weight: '',
  shippingCost: '',
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

  const editingProduct = editId ? products.find(p => p.id === editId) : null;

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
    onSuccess: async res => {
      const targetProductId = editId || res?.data?.id || res?.id;
      if (imageFiles.length > 0 && targetProductId) {
        let hasErrors = false;
        for (const file of imageFiles) {
          const fd = new FormData();
          fd.append('image', file);
          try {
            await vendorApi.uploadProductImage(targetProductId, fd);
          } catch (err: any) {
            hasErrors = true;
            addToast(`فشل رفع ${file.name}: ${err.response?.data?.message || err.message}`, 'error');
          }
        }
        if (!hasErrors) {
          addToast(editId ? 'تم تحديث المنتج والصور بنجاح' : 'تم إضافة المنتج والصور بنجاح', 'success');
        } else {
          addToast(
            editId ? 'تم تحديث المنتج ولكن فشل رفع بعض الصور' : 'تم إضافة المنتج ولكن فشل رفع بعض الصور',
            'error'
          );
        }
      } else {
        addToast(editId ? 'تم تحديث المنتج' : 'تم إضافة المنتج', 'success');
      }
      qc.invalidateQueries({ queryKey: ['vendor-products'] });
      resetForm();
    },
    onError: (err: any) => addToast(err?.message || 'حدث خطأ أثناء الحفظ', 'error'),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      vendorApi.updateProduct(id, { isActive }),
    onSuccess: () => {
      addToast('تم تحديث حالة المنتج', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-products'] });
    },
    onError: (err: any) => addToast(err?.message || 'حدث خطأ أثناء التحديث', 'error'),
  });

  const deleteImageMutation = useMutation({
    mutationFn: ({ productId, imgId }: { productId: number; imgId: number }) =>
      vendorApi.deleteProductImage(productId, imgId),
    onSuccess: () => {
      addToast('تم حذف الصورة', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-products'] });
    },
    onError: (err: any) => addToast(err?.message || 'فشل حذف الصورة', 'error'),
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
      description: p.description || '',
      price: p.price,
      compareAtPrice: String(p.comparePrice || p.compareAtPrice || ''),
      stock: p.stock,
      categoryId: p.categoryId,
      sku: p.sku || '',
      weight: '',
      shippingCost: '',
    });
    setImageFiles([]);
    setEditId(p.id);
    setShowForm(true);
  }

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
            <p className="page-header__subtitle">إضافة وتعديل منتجات متجرك، الأسعار، الصور، والكميات المتوفرة</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} /> إضافة منتج جديد
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="card card-body mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative" style={{ flex: 1, maxWidth: 420 }}>
            <Search
              size={18}
              className="text-muted"
              style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              className="form-input"
              placeholder="بحث في منتجات متجرك..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingInlineEnd: 42 }}
            />
          </div>
          <span className="catalog-count-badge">
            المعروض: <strong>{filtered.length}</strong> منتج
          </span>
        </div>
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            onClick={resetForm}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
          >
            <motion.div
              className="modal card"
              onClick={e => e.stopPropagation()}
              style={{ maxWidth: 580 }}
              initial={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              transition={{ duration: motionTokens.duration.base, ...motionTokens.easing.spring }}
            >
              <div className="modal-header">
                <h3 className="text-primary flex items-center gap-2">
                  <Package size={18} color="var(--brand-500)" />
                  {editId ? 'تعديل المنتج' : 'إضافة منتج جديد'}
                </h3>
                <button className="modal-close" onClick={resetForm} aria-label="إغلاق">
                  <X size={18} />
                </button>
              </div>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  saveMutation.mutate();
                }}
              >
                <div className="modal-body flex flex-col gap-4">
                  <div className="form-group">
                    <label className="form-label">اسم المنتج *</label>
                    <input
                      className="form-input"
                      required
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الوصف</label>
                    <textarea
                      className="form-textarea"
                      rows={3}
                      value={form.description}
                      onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">السعر (ج.م) *</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        required
                        value={form.price}
                        onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">السعر قبل الخصم</label>
                      <input
                        className="form-input"
                        type="number"
                        step="0.01"
                        value={form.compareAtPrice}
                        onChange={e => setForm(f => ({ ...f, compareAtPrice: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-2 gap-3">
                    <div className="form-group">
                      <label className="form-label">المخزون *</label>
                      <input
                        className="form-input"
                        type="number"
                        required
                        value={form.stock}
                        onChange={e => setForm(f => ({ ...f, stock: parseInt(e.target.value) || 0 }))}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">القسم *</label>
                      <select
                        className="form-select"
                        value={form.categoryId || ''}
                        onChange={e => setForm({ ...form, categoryId: parseInt(e.target.value) })}
                        required
                      >
                        <option value="" disabled>
                          اختر القسم
                        </option>
                        {categories.map((c: any) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">رمز المنتج (SKU)</label>
                    <input
                      className="form-input"
                      dir="ltr"
                      value={form.sku}
                      onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                    />
                  </div>

                  {/* Existing Images when editing */}
                  {editId && editingProduct?.images && editingProduct.images.length > 0 && (
                    <div className="form-group">
                      <label className="form-label">الصور الحالية</label>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {editingProduct.images.map(img => (
                          <div key={img.id} className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                            <img src={img.url || img.imageUrl} alt="" className="w-full h-full object-cover rounded" />
                            <button
                              type="button"
                              className="btn-danger rounded-full p-1"
                              style={{ position: 'absolute', top: -4, insetInlineEnd: -4, border: 'none', cursor: 'pointer' }}
                              aria-label="حذف الصورة"
                              disabled={deleteImageMutation.isPending}
                              onClick={() => deleteImageMutation.mutate({ productId: editId, imgId: img.id })}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Upload new/additional images */}
                  <div className="form-group">
                    <label className="form-label">{editId ? 'إضافة صور جديدة' : 'صور المنتج'}</label>
                    <input
                      type="file"
                      className="form-input"
                      accept="image/*"
                      multiple
                      onChange={e => {
                        const files = Array.from(e.target.files ?? []);
                        setImageFiles(prev => [...prev, ...files]);
                      }}
                    />
                    {imageFiles.length > 0 && (
                      <div className="mt-2 flex flex-col gap-2">
                        <small className="text-muted">{imageFiles.length} صورة محددة</small>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                          {imageFiles.map((f, i) => (
                            <div key={i} className="relative flex-shrink-0" style={{ width: 64, height: 64 }}>
                              <img src={URL.createObjectURL(f)} alt="preview" className="w-full h-full object-cover rounded" />
                              <button
                                type="button"
                                className="btn-danger rounded-full p-1"
                                style={{ position: 'absolute', top: -4, insetInlineEnd: -4, border: 'none', cursor: 'pointer' }}
                                aria-label="إزالة الصورة"
                                onClick={() => setImageFiles(prev => prev.filter((_, idx) => idx !== i))}
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-ghost" type="button" onClick={resetForm}>
                    إلغاء
                  </button>
                  <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
                    <Save size={16} />
                    {saveMutation.isPending ? 'جاري الحفظ...' : editId ? 'حفظ التعديلات' : 'إضافة المنتج'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Products Table */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 64 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Package size={52} className="empty-state__icon" />
            <div className="empty-state__title">لا توجد منتجات</div>
            <p className="empty-state__description">أضف منتجك الأول لبدء البيع على المنصة</p>
          </div>
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المنتج</th>
                <th>السعر</th>
                <th>المخزون</th>
                <th className="text-center">الحالة</th>
                <th className="text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const firstImg = p.images?.[0]?.url || p.images?.[0]?.imageUrl;
                return (
                  <tr key={p.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        {firstImg ? (
                          <img src={firstImg} alt="" className="rounded-md object-cover" style={{ width: 48, height: 48 }} />
                        ) : (
                          <div className="rounded-md flex items-center justify-center bg-surface-2" style={{ width: 48, height: 48 }}>
                            <Image size={20} className="text-muted" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-primary" style={{ fontSize: 'var(--font-size-sm)' }}>
                            {p.name}
                          </div>
                          <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                            #{p.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="font-bold text-brand">{parseFloat(p.price).toLocaleString('ar-EG')} ج.م</td>
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
                        <button
                          className="icon-btn"
                          title="تعديل"
                          aria-label="تعديل المنتج"
                          onClick={() => startEdit(p)}
                        >
                          <Edit2 size={15} />
                        </button>
                        <button
                          className="icon-btn"
                          title={p.isActive ? 'إخفاء' : 'إظهار'}
                          aria-label={p.isActive ? 'إخفاء المنتج' : 'إظهار المنتج'}
                          disabled={toggleActiveMutation.isPending}
                          onClick={() => toggleActiveMutation.mutate({ id: p.id, isActive: !p.isActive })}
                        >
                          {p.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                        <button
                          className="icon-btn"
                          style={{ color: 'var(--error-500)' }}
                          title="حذف"
                          aria-label="حذف المنتج"
                          onClick={() => {
                            if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) deleteMutation.mutate(p.id);
                          }}
                        >
                          <Trash2 size={15} />
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

      {/* Pagination */}
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
