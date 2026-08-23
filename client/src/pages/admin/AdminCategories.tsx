import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Edit2, Trash2, FolderTree, Save } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  parentId: number | null;
  isActive: boolean;
  sortOrder: number;
}

export default function AdminCategories() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', description: '', parentId: 0, sortOrder: 0 });

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
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCategory(id),
    onSuccess: () => { addToast('تم حذف القسم', 'success'); qc.invalidateQueries({ queryKey: ['admin-categories'] }); },
    onError: (err: Error) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  function resetForm() { setForm({ name: '', description: '', parentId: 0, sortOrder: 0 }); setEditId(null); setShowForm(false); }
  function startEdit(c: Category) { setForm({ name: c.name, description: c.description ?? '', parentId: c.parentId ?? 0, sortOrder: c.sortOrder }); setEditId(c.id); setShowForm(true); }

  const rootCategories = categories.filter(c => !c.parentId);
  const childCategories = (parentId: number) => categories.filter(c => c.parentId === parentId);

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <FolderTree size={24} color="var(--primary-500)" />
          <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>إدارة الأقسام</h2>
        </div>
        <button className="btn btn--primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={18} /> إضافة قسم
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)', maxWidth: 480 }}>
          <h3 style={{ marginTop: 0, fontSize: 'var(--text-base)', fontWeight: 600 }}>{editId ? 'تعديل القسم' : 'قسم جديد'}</h3>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}>
            <div className="form-group">
              <label className="form-label">اسم القسم *</label>
              <input className="input" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">الوصف</label>
              <input className="input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
              <div className="form-group">
                <label className="form-label">القسم الأب</label>
                <select className="input" value={form.parentId} onChange={e => setForm(f => ({ ...f, parentId: parseInt(e.target.value) }))}>
                  <option value={0}>— قسم رئيسي —</option>
                  {rootCategories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">الترتيب</label>
                <input className="input" type="number" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button className="btn btn--primary" type="submit" disabled={saveMutation.isPending}>
                <Save size={16} /> {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
              </button>
              <button className="btn btn--outline" type="button" onClick={resetForm}>إلغاء</button>
            </div>
          </form>
        </div>
      )}

      {/* Categories Tree */}
      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : rootCategories.length === 0 ? (
        <div className="empty-state"><div className="empty-state__title">لا توجد أقسام</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
          {rootCategories.map(cat => (
            <div key={cat.id}>
              <div className="card" style={{ padding: 'var(--space-3) var(--space-4)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{cat.name}</span>
                  {cat.description && <span style={{ marginRight: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--neutral-400)' }}>— {cat.description}</span>}
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <button className="btn btn--ghost" style={{ padding: 'var(--space-2)' }} onClick={() => startEdit(cat)}><Edit2 size={16} /></button>
                  <button className="btn btn--ghost" style={{ padding: 'var(--space-2)', color: 'var(--error-500)' }}
                    onClick={() => { if (confirm('هل أنت متأكد؟')) deleteMutation.mutate(cat.id); }}><Trash2 size={16} /></button>
                </div>
              </div>
              {/* Children */}
              {childCategories(cat.id).map(child => (
                <div key={child.id} className="card" style={{ padding: 'var(--space-3) var(--space-4)', marginRight: 'var(--space-6)', marginTop: 'var(--space-1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRight: '3px solid var(--primary-200)' }}>
                  <span style={{ fontSize: 'var(--text-sm)' }}>{child.name}</span>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    <button className="btn btn--ghost" style={{ padding: 'var(--space-1)' }} onClick={() => startEdit(child)}><Edit2 size={14} /></button>
                    <button className="btn btn--ghost" style={{ padding: 'var(--space-1)', color: 'var(--error-500)' }}
                      onClick={() => { if (confirm('هل أنت متأكد؟')) deleteMutation.mutate(child.id); }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
