import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { Shield, Plus, Edit, Key, Save } from 'lucide-react';

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '' });

  // Permissions modal/panel state
  const [permRole, setPermRole] = useState<any | null>(null);
  const [selectedPermIds, setSelectedPermIds] = useState<number[]>([]);
  
  const { data: roles, isLoading } = useQuery({
    queryKey: ['admin-roles'],
    queryFn: () => api.get<any>('/roles'),
  });

  const { data: permsRes } = useQuery({
    queryKey: ['admin-permissions'],
    queryFn: () => api.get<any>('/roles/permissions'),
  });

  const allPermissions: { id: number; key: string; description?: string }[] = permsRes?.data ?? [];

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

  const savePermsMutation = useMutation({
    mutationFn: ({ roleId, permissionIds }: { roleId: number; permissionIds: number[] }) =>
      api.post(`/roles/${roleId}/permissions`, { permissionIds }),
    onSuccess: () => {
      addToast('تم تحديث صلاحيات الدور بنجاح', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-roles'] });
      setPermRole(null);
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ أثناء حفظ الصلاحيات', 'error'),
  });

  const handleEdit = (role: any) => {
    setEditId(role.id);
    setForm({ name: role.name });
    setShowForm(true);
  };

  const handleOpenPerms = async (role: any) => {
    setPermRole(role);
    if (Array.isArray(role.permissionIds)) {
      setSelectedPermIds(role.permissionIds);
    } else {
      try {
        const res = await api.get<any>(`/roles/${role.id}/permissions`);
        const list = res?.data || [];
        setSelectedPermIds(list.map((p: any) => p.id));
      } catch {
        setSelectedPermIds([]);
      }
    }
  };

  const togglePerm = (id: number) => {
    setSelectedPermIds(prev => prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]);
  };

  if (isLoading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header__title m-0 flex items-center gap-2">
          <Shield size={24} className="text-brand" />
          الأدوار والصلاحيات
        </h1>
        <button className="btn btn-primary" onClick={() => { setEditId(null); setForm({ name: '' }); setShowForm(!showForm); }}>
          <Plus size={18} /> {showForm ? 'إلغاء' : 'إضافة دور جديد'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="mt-0 mb-4 font-semibold" style={{ fontSize: 'var(--font-size-lg)' }}>
            {editId ? 'تعديل دور' : 'إضافة دور جديد'}
          </h2>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
            <div className="form-group mb-4">
              <label className="form-label">اسم الدور</label>
              <input 
                className="form-input" 
                value={form.name} 
                onChange={e => setForm({ ...form, name: e.target.value })} 
                required 
              />
            </div>
            <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
          </form>
        </div>
      )}

      {permRole && (
        <div className="card card-body mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="m-0 font-semibold">صلاحيات الدور: {permRole.name}</h3>
            <button className="btn btn-ghost btn-sm" onClick={() => setPermRole(null)}>إغلاق</button>
          </div>
          <div className="grid grid-3 gap-3 mb-4">
            {allPermissions.map((perm) => (
              <label key={perm.id} className="flex items-center gap-2 p-2 rounded" style={{ border: '1px solid var(--border-primary)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedPermIds.includes(perm.id)}
                  onChange={() => togglePerm(perm.id)}
                />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>{perm.key}</div>
                  {perm.description && <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{perm.description}</div>}
                </div>
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              className="btn btn-primary"
              disabled={savePermsMutation.isPending}
              onClick={() => savePermsMutation.mutate({ roleId: permRole.id, permissionIds: selectedPermIds })}
            >
              <Save size={16} /> {savePermsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
            </button>
            <button className="btn btn-ghost" onClick={() => setPermRole(null)}>إلغاء</button>
          </div>
        </div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>المعرف</th>
              <th>الاسم</th>
              <th>عدد الصلاحيات</th>
              <th>نظامي</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {roles?.data?.map((r: any) => (
              <tr key={r.id}>
                <td>{r.id}</td>
                <td>{r.name}</td>
                <td>{Array.isArray(r.permissionIds) ? r.permissionIds.length : '-'}</td>
                <td>
                  <span className={`badge ${r.isSystem ? 'badge-brand' : 'badge-neutral'}`}>
                    {r.isSystem ? 'نعم' : 'لا'}
                  </span>
                </td>
                <td className="flex gap-2">
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleOpenPerms(r)}
                    title="إدارة الصلاحيات"
                    aria-label="إدارة الصلاحيات"
                  >
                    <Key size={14} /> الصلاحيات
                  </button>
                  <button 
                    className="btn btn-ghost p-2" 
                    onClick={() => handleEdit(r)}
                    disabled={r.isSystem}
                    title={r.isSystem ? 'لا يمكن تعديل دور أساسي في النظام' : 'تعديل'}
                    aria-label="تعديل الدور"
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
