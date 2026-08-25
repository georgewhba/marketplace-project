import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Edit2, Trash2, FolderTree, Save, Hash, Cpu, BookOpen, Shirt, Home as HomeIcon } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  parentId: number | null;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminCategories() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', icon: '', parentId: 0, sortOrder: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: () => adminApi.getCategories(),
  });

  const categories: Category[] = data?.data ?? [];

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        icon: form.icon || undefined,
        parentId: form.parentId || undefined,
        sortOrder: form.sortOrder,
      };
      return editId ? adminApi.updateCategory(editId, payload) : adminApi.createCategory(payload);
    },
    onSuccess: () => {
      addToast(editId ? 'تم تحديث القسم' : 'تم إضافة القسم', 'success');
      qc.invalidateQueries({ queryKey: ['admin-categories'] });
      resetForm();
    },
    onError: (err: any) => addToast(err?.message || 'حدث خطأ', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => { addToast('تم حذف القسم', 'success'); qc.invalidateQueries({ queryKey: ['admin-categories'] }); },
    onError: (err: Error) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  function resetForm() { setForm({ name: '', description: '', icon: '', parentId: 0, sortOrder: 0 }); setEditId(null); setShowForm(false); }
  function startEdit(c: Category) { setForm({ name: c.name, description: c.description ?? '', icon: c.icon ?? '', parentId: c.parentId ?? 0, sortOrder: c.sortOrder }); setEditId(c.id); setShowForm(true); }

  const rootCategories = categories.filter(c => !c.parentId);
  
  // Recursive component to render tree
  const CategoryNode = ({ cat, level = 0 }: { cat: Category, level?: number }) => {
    const children = categories.filter(c => c.parentId === cat.id);
    
    return (
      <div key={cat.id}>
        <div 
          className="card" 
          style={{ 
            padding: 'var(--space-3) var(--space-4)', 
            marginRight: `calc(var(--space-6) * ${level})`,
            marginTop: 'var(--space-1)',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            borderRight: level > 0 ? '3px solid var(--brand-200)' : 'none',
            backgroundColor: level > 0 ? 'var(--surface-1)' : 'var(--surface-0)'
          }}
        >
          <div className="flex items-center gap-3">
            {cat.icon && (['Cpu', 'BookOpen', 'Shirt', 'Home'].includes(cat.icon)) ? (
              // Legacy Lucide string mapped to icon
              (() => {
                const IconComp = { Cpu, BookOpen, Shirt, Home: HomeIcon }[cat.icon as 'Cpu'|'BookOpen'|'Shirt'|'Home'];
                return IconComp ? <IconComp size={20} className="text-muted" /> : null;
              })()
            ) : cat.icon ? (
              // Custom Emoji
              <span 
                className="category-emoji-icon"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  width: 24, 
                  height: 24, 
                  fontSize: '1.25rem',
                  lineHeight: 1,
                  filter: 'grayscale(100%) opacity(0.7)',
                  transition: 'all 0.2s ease'
                }}
              >
                {cat.icon}
              </span>
            ) : (
              // Fallback
              <Hash size={18} className="text-muted" />
            )}
            <div style={{ marginRight: 'var(--space-2)' }}>
              <span className="text-primary" style={{ fontWeight: level === 0 ? 600 : 500, fontSize: level === 0 ? '1rem' : '0.9rem' }}>{cat.name}</span>
              {cat.description && <span className="text-muted" style={{ marginRight: 'var(--space-2)', fontSize: 'var(--font-size-sm)' }}>— {cat.description}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost btn-sm" onClick={() => startEdit(cat)} title="تعديل"><Edit2 size={14} /></button>
            <button className="btn btn-ghost btn-sm text-error" onClick={() => { if (confirm('هل أنت متأكد من حذف هذا القسم؟')) deleteMutation.mutate(cat.id); }} title="حذف"><Trash2 size={14} /></button>
          </div>
        </div>
        
        {/* Render children recursively */}
        {children.length > 0 && (
          <div className="category-children">
            {children.map(child => <CategoryNode key={child.id} cat={child} level={level + 1} />)}
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <FolderTree size={24} color="var(--brand-500)" />
          <h2 className="text-primary" style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>إدارة الأقسام</h2>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} /> إضافة قسم
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card card-body mb-4" style={{ maxWidth: 480 }}>
          <h3 className="text-primary" style={{ marginTop: 0, fontSize: 'var(--font-size-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>{editId ? 'تعديل القسم' : 'قسم جديد'}</h3>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">اسم القسم *</label>
              <input className="form-input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="مثال: إلكترونيات" />
            </div>
            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">أيقونة (إيموجي)</label>
                <input className="form-input" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="مثال: 💻" />
                <p className="text-muted mt-1" style={{ fontSize: '11px' }}>ضع إيموجي ليظهر كأيقونة</p>
              </div>
              <div className="form-group">
                <label className="form-label">الترتيب</label>
                <input className="form-input" type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">الوصف</label>
              <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="وصف قصير للقسم..." />
            </div>
            <div className="form-group">
              <label className="form-label">القسم الأب</label>
              <select className="form-select" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: parseInt(e.target.value) }))}>
                <option value={0}>— قسم رئيسي —</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <p className="text-muted mt-1" style={{ fontSize: '11px' }}>اختر قسماً لتفريعه، أو اتركه كقسم رئيسي.</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
                <Save size={16} /> {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button className="btn btn-ghost" type="button" onClick={resetForm}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Tree */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : rootCategories.length === 0 ? (
        <div className="empty-state"><div className="empty-state__title">لا توجد أقسام</div></div>
      ) : (
        <div className="flex flex-col gap-2">
          {rootCategories.map(cat => (
            <CategoryNode key={cat.id} cat={cat} />
          ))}
        </div>
      )}
    </div>
  );
}
