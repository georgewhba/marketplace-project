import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { Shield, Plus, Edit } from 'lucide-react';

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '' });
  
  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get<any[]>('/roles'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      if (editId) return api.put(`/roles/${editId}`, data);
      return api.post('/roles', data);
    },
    onSuccess: () => {
      addToast(editId ? 'تم تحديث الدور' : 'تمت إضافة الدور', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setShowForm(false);
      setEditId(null);
      setForm({ name: '' });
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  const handleEdit = (role: any) => {
    setEditId(role.id);
    setForm({ name: role.name });
    setShowForm(true);
  };

  if (isLoading) return <div style={{ padding: 'var(--space-6)' }}>جاري التحميل...</div>;

  return (
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', margin: 0, fontSize: 'var(--text-2xl)' }}>
          <Shield size={24} color="var(--primary-500)" />
          الأدوار والصلاحيات
        </h1>
        <button className="btn btn--primary" onClick={() => { setEditId(null); setForm({ name: '' }); setShowForm(!showForm); }}>
          <Plus size={18} /> {showForm ? 'إلغاء' : 'إضافة دور جديد'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ marginTop: 0, fontSize: 'var(--text-lg)', marginBottom: 'var(--space-4)' }}>
            {editId ? 'تعديل دور' : 'إضافة دور جديد'}
          </h2>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
            <div className="form-group mb-4">
              <label className="form-label">اسم الدور</label>
              <input 
                className="input" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                required 
              />
            </div>
            <button className="btn btn--primary" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </form>
        </div>
      )}

      <div className="table-responsive card">
        <table className="table">
          <thead>
            <tr>
              <th>المعرف</th>
              <th>الاسم</th>
              <th>نظامي</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {roles?.map((r: any) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>
                  <span className={`badge ${r.isSystem ? 'badge--primary' : 'badge--outline'}`}>
                    {r.isSystem ? 'نعم' : 'لا'}
                  </span>
                </td>
                <td>
                  <button 
                    className="btn btn--icon" 
                    onClick={() => handleEdit(r)}
                    disabled={r.isSystem}
                    title={r.isSystem ? 'لا يمكن تعديل دور أساسي في النظام' : 'تعديل'}
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
