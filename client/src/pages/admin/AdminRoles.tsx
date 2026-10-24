import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { Shield, Plus, Edit, Key, Save, X } from 'lucide-react';

export default function AdminRoles() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '' });

  // Permissions modal state
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
    setSelectedPermIds(prev => (prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]));
  };

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Shield size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>الأدوار والصلاحيات</h1>
            <p className="page-header__subtitle">إدارة مستويات الوصول وصلاحيات المشرفين وفريق العمل</p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditId(null);
            setForm({ name: '' });
            setShowForm(true);
          }}
        >
          <Plus size={18} /> إضافة دور جديد
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 64 }} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المعرف</th>
                <th>اسم الدور</th>
                <th>عدد الصلاحيات</th>
                <th>النوع</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {roles?.data?.map((r: any) => (
                <tr key={r.id}>
                  <td className="text-muted">#{r.id}</td>
                  <td className="font-semibold text-primary">{r.name}</td>
                  <td>
                    <span className="badge badge-brand">
                      {Array.isArray(r.permissionIds) ? r.permissionIds.length : 0} صلاحية
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${r.isSystem ? 'badge-info' : 'badge-neutral'}`}>
                      {r.isSystem ? 'دور نظامي' : 'مخصص'}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleOpenPerms(r)}
                        title="إدارة الصلاحيات"
                      >
                        <Key size={14} /> الصلاحيات
                      </button>
                      <button
                        className="icon-btn"
                        onClick={() => handleEdit(r)}
                        disabled={r.isSystem}
                        title={r.isSystem ? 'لا يمكن تعديل دور أساسي في النظام' : 'تعديل'}
                        aria-label="تعديل الدور"
                      >
                        <Edit size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add / Edit Role */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-primary flex items-center gap-2">
                <Shield size={18} color="var(--brand-500)" />
                {editId ? 'تعديل الدور' : 'إضافة دور جديد'}
              </h3>
              <button className="modal-close" onClick={() => setShowForm(false)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form
              onSubmit={e => {
                e.preventDefault();
                saveMutation.mutate(form);
              }}
            >
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">اسم الدور *</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="مثال: مدير العمليات"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" type="button" onClick={() => setShowForm(false)}>
                  إلغاء
                </button>
                <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
                  <Save size={16} /> {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الدور'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Manage Role Permissions */}
      {permRole && (
        <div className="modal-overlay" onClick={() => setPermRole(null)}>
          <div className="modal card" style={{ maxWidth: 680 }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-primary flex items-center gap-2">
                <Key size={18} color="var(--brand-500)" />
                صلاحيات الدور: {permRole.name}
              </h3>
              <button className="modal-close" onClick={() => setPermRole(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div className="grid grid-2 gap-3">
                {allPermissions.map(perm => {
                  const checked = selectedPermIds.includes(perm.id);
                  return (
                    <label
                      key={perm.id}
                      className="flex items-start gap-3 p-3 rounded-lg"
                      style={{
                        border: checked ? '1.5px solid var(--brand-500)' : '1px solid var(--border-color)',
                        background: checked ? 'var(--brand-50)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePerm(perm.id)}
                        style={{ marginTop: 4 }}
                      />
                      <div>
                        <div className="text-primary" style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                          {perm.key}
                        </div>
                        {perm.description && (
                          <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                            {perm.description}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setPermRole(null)}>
                إلغاء
              </button>
              <button
                className="btn btn-primary"
                disabled={savePermsMutation.isPending}
                onClick={() => savePermsMutation.mutate({ roleId: permRole.id, permissionIds: selectedPermIds })}
              >
                <Save size={16} /> {savePermsMutation.isPending ? 'جاري الحفظ...' : 'حفظ الصلاحيات'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
