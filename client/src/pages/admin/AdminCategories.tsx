import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Edit2, Save, Trash2, Plus, FolderTree, Layers, Tag, Search, X } from 'lucide-react';
import * as Icons from 'lucide-react';
import { IconPicker } from '../../components/IconPicker';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: number | null;
  isActive: boolean;
  sortOrder: number;
  children?: Category[];
}

export default function AdminCategories() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', description: '', icon: '', parentId: 0, sortOrder: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  });

  // Flatten tree if backend returns nested children
  const rawCategories: Category[] = data?.data ?? [];
  const categories: Category[] = [];
  for (const cat of rawCategories) {
    categories.push(cat);
    if (Array.isArray(cat.children)) {
      for (const child of cat.children) {
        if (!categories.some(c => c.id === child.id)) {
          categories.push(child);
        }
      }
    }
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        icon: form.icon || undefined,
        parentId: form.parentId || null,
        sortOrder: form.sortOrder,
      };
      return editId ? adminApi.updateCategory(editId, payload) : adminApi.createCategory(payload);
    },
    onSuccess: () => {
      addToast(editId ? 'تم تحديث القسم بنجاح' : 'تم إضافة القسم بنجاح', 'success');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      resetForm();
    },
    onError: (err: any) => addToast(err?.message || 'حدث خطأ', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => {
      addToast('تم حذف القسم', 'success');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: (err: Error) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  function resetForm() {
    setForm({ name: '', description: '', icon: '', parentId: 0, sortOrder: 0 });
    setEditId(null);
    setShowForm(false);
  }

  function startEdit(c: Category) {
    setForm({
      name: c.name,
      description: c.description ?? '',
      icon: c.icon ?? '',
      parentId: c.parentId ?? 0,
      sortOrder: c.sortOrder,
    });
    setEditId(c.id);
    setShowForm(true);
  }

  function startAddSubcategory(parentId: number) {
    setForm({ name: '', description: '', icon: '', parentId, sortOrder: 0 });
    setEditId(null);
    setShowForm(true);
  }

  const rootCategories = categories.filter(c => !c.parentId);
  const subCategoriesCount = categories.length - rootCategories.length;

  const filteredRootCategories = rootCategories.filter(root => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    const children = categories.filter(c => c.parentId === root.id);
    return (
      root.name.toLowerCase().includes(q) ||
      (root.description || '').toLowerCase().includes(q) ||
      children.some(ch => ch.name.toLowerCase().includes(q))
    );
  });

  return (
    <div>
      {/* Unified Page Header */}
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <FolderTree size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إدارة الأقسام</h1>
            <p className="page-header__subtitle">تنظيم شجرة التصنيفات والأقسام الرئيسية والفرعية للمتجر</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} /> إضافة قسم جديد
        </button>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-3 mb-6">
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="stat-card__label">إجمالي الأقسام</div>
            <div className="stat-card__value" style={{ marginBottom: 0 }}>{categories.length}</div>
          </div>
          <div className="feature-card__icon">
            <Layers size={20} />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="stat-card__label">الأقسام الرئيسية</div>
            <div className="stat-card__value" style={{ marginBottom: 0 }}>{rootCategories.length}</div>
          </div>
          <div className="feature-card__icon">
            <FolderTree size={20} />
          </div>
        </div>
        <div className="stat-card flex items-center justify-between">
          <div>
            <div className="stat-card__label">الأقسام الفرعية</div>
            <div className="stat-card__value" style={{ marginBottom: 0 }}>{subCategoriesCount}</div>
          </div>
          <div className="feature-card__icon">
            <Tag size={20} />
          </div>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="card card-body mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="relative" style={{ flex: 1, maxWidth: 420 }}>
            <Search size={18} className="text-muted" style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="form-input"
              placeholder="ابحث في الأقسام الرئيسية أو الفرعية..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingInlineEnd: 42 }}
            />
          </div>
          <span className="catalog-count-badge">
            عرض <strong>{filteredRootCategories.length}</strong> قسم رئيسي
          </span>
        </div>
      </div>

      {/* Categories Grid */}
      {isLoading ? (
        <div className="grid grid-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 220 }} />)}
        </div>
      ) : filteredRootCategories.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <FolderTree size={56} className="empty-state__icon" />
            <div className="empty-state__title">لا توجد أقسام مطابقة</div>
            <p className="empty-state__description">ابدأ بإضافة قسم رئيسي جديد لتنظيم منتجات المتجر.</p>
            <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
              <Plus size={18} /> إضافة قسم جديد
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-2">
          {filteredRootCategories.map(root => {
            const RootIcon = (Icons as any)[root.icon || ''] || Icons.Tag;
            const children = categories.filter(c => c.parentId === root.id);

            return (
              <div key={root.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                {/* Root Category Header */}
                <div
                  style={{
                    padding: 'var(--space-5)',
                    borderBottom: '1px solid var(--border-color)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div className="feature-card__icon" style={{ width: 48, height: 48, borderRadius: 'var(--radius-lg)' }}>
                      <RootIcon size={22} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-primary" style={{ margin: 0, fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>
                          {root.name}
                        </h3>
                        <span className="badge badge-brand">
                          {children.length} قسم فرعي
                        </span>
                      </div>
                      {root.description ? (
                        <p className="text-secondary" style={{ margin: '4px 0 0', fontSize: 'var(--font-size-sm)' }}>
                          {root.description}
                        </p>
                      ) : (
                        <p className="text-muted" style={{ margin: '4px 0 0', fontSize: 'var(--font-size-xs)' }}>
                          المعرف: <span className="ltr">/{root.slug}</span> • الترتيب: {root.sortOrder}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      className="btn btn-outline btn-sm"
                      onClick={() => startAddSubcategory(root.id)}
                      title="إضافة قسم فرعي"
                    >
                      <Plus size={14} /> فرعي
                    </button>
                    <button
                      className="icon-btn"
                      onClick={() => startEdit(root)}
                      title="تعديل القسم"
                      aria-label="تعديل القسم"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      className="icon-btn"
                      style={{ color: 'var(--error-500)' }}
                      onClick={() => {
                        if (confirm('هل أنت متأكد من حذف هذا القسم؟')) deleteMutation.mutate(root.id);
                      }}
                      title="حذف القسم"
                      aria-label="حذف القسم"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Subcategories Body */}
                <div className="card-body" style={{ flex: 1, background: 'var(--bg-page)' }}>
                  {children.length === 0 ? (
                    <div
                      style={{
                        textAlign: 'center',
                        padding: 'var(--space-5)',
                        color: 'var(--text-muted)',
                        fontSize: 'var(--font-size-sm)',
                        border: '1px dashed var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                      }}
                    >
                      لا توجد أقسام فرعية تحت هذا القسم بعد
                    </div>
                  ) : (
                    <div className="grid grid-2" style={{ gap: 'var(--space-3)' }}>
                      {children.map(child => {
                        const ChildIcon = (Icons as any)[child.icon || ''] || Icons.Tag;
                        return (
                          <div
                            key={child.id}
                            style={{
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-md)',
                              padding: 'var(--space-3) var(--space-4)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 'var(--space-2)',
                              transition: 'border-color var(--transition-fast)',
                            }}
                          >
                            <div className="flex items-center gap-2" style={{ minWidth: 0 }}>
                              <span
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 'var(--radius-sm)',
                                  background: 'var(--bg-surface-2)',
                                  color: 'var(--brand-500)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <ChildIcon size={16} />
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div
                                  className="text-primary"
                                  style={{
                                    fontWeight: 600,
                                    fontSize: 'var(--font-size-sm)',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                  }}
                                >
                                  {child.name}
                                </div>
                                {child.description && (
                                  <div
                                    className="text-muted"
                                    style={{
                                      fontSize: 'var(--font-size-xs)',
                                      whiteSpace: 'nowrap',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                    }}
                                  >
                                    {child.description}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1" style={{ flexShrink: 0 }}>
                              <button
                                className="btn btn-ghost btn-sm"
                                style={{ padding: 6 }}
                                onClick={() => startEdit(child)}
                                title="تعديل"
                                aria-label="تعديل القسم الفرعي"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button
                                className="btn btn-ghost btn-sm text-error"
                                style={{ padding: 6 }}
                                onClick={() => {
                                  if (confirm('هل أنت متأكد من حذف هذا القسم الفرعي؟')) deleteMutation.mutate(child.id);
                                }}
                                title="حذف"
                                aria-label="حذف القسم الفرعي"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Centered Modal for Add / Edit Category */}
      {showForm && (
        <div className="modal-overlay" onClick={resetForm}>
          <div className="modal card" onClick={e => e.stopPropagation()} style={{ overflow: 'visible' }}>
            <div className="modal-header">
              <h3 className="text-primary flex items-center gap-2">
                <FolderTree size={20} color="var(--brand-500)" />
                {editId ? 'تعديل القسم' : 'إضافة قسم جديد'}
              </h3>
              <button className="modal-close" onClick={resetForm} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}>
              <div className="modal-body flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">اسم القسم *</label>
                  <input
                    className="form-input"
                    required
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="مثال: إلكترونيات"
                  />
                </div>
                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">أيقونة القسم</label>
                    <IconPicker
                      value={form.icon || ''}
                      onChange={val => setForm(f => ({ ...f, icon: val }))}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">الترتيب</label>
                    <input
                      className="form-input"
                      type="number"
                      value={form.sortOrder}
                      onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">الوصف</label>
                  <input
                    className="form-input"
                    value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    placeholder="وصف قصير للقسم..."
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">القسم الأب</label>
                  <select
                    className="form-select"
                    value={form.parentId}
                    onChange={e => setForm(f => ({ ...f, parentId: parseInt(e.target.value) }))}
                  >
                    <option value={0}>— قسم رئيسي —</option>
                    {rootCategories
                      .filter(c => c.id !== editId)
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                  </select>
                  <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                    اختر قسماً رئيسياً لتفريعه، أو اتركه كقسم رئيسي مستقل.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" type="button" onClick={resetForm}>
                  إلغاء
                </button>
                <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
                  <Save size={16} /> {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ القسم'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
