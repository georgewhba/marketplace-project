import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { UserCheck, UserX, Search, ChevronRight, ChevronLeft, Shield, User } from 'lucide-react';

interface AppUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = { customer: 'عميل', vendor: 'بائع', admin: 'مشرف' };

export default function AdminUsers() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-users', page],
    queryFn: () => adminApi.getUsers(page),
  });

  const users: AppUser[] = data?.data ?? [];
  const meta = data?.meta;

  const toggleMutation = useMutation({
    mutationFn: (id: number) => adminApi.toggleUser(id),
    onSuccess: () => { addToast('تم تحديث حالة المستخدم', 'success'); qc.invalidateQueries({ queryKey: ['admin-users'] }); },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const filtered = search ? users.filter(u =>
    u.firstName.includes(search) || u.lastName.includes(search) || u.email.includes(search)
  ) : users;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <User size={24} className="text-brand" />
        <h1 className="page-header__title m-0">إدارة المستخدمين</h1>
      </div>

      <div className="relative mb-4" style={{ maxWidth: 360 }}>
        <Search size={18} className="text-muted" style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)' }} />
        <input className="input" placeholder="بحث بالاسم أو البريد..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingInlineStart: 40 }} />
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد</th>
                <th className="text-center">الدور</th>
                <th className="text-center">الحالة</th>
                <th className="text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center font-semibold text-brand" style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: 'var(--brand-50)', fontSize: 'var(--font-size-sm)' }}>
                        {u.firstName[0]}
                      </div>
                      <span className="font-semibold">{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>{u.email}</td>
                  <td className="text-center">
                    <span className="flex items-center justify-center gap-1 font-semibold" style={{ display: 'inline-flex', fontSize: 'var(--font-size-xs)', padding: '2px 8px', borderRadius: 'var(--radius-full)', background: u.role === 'admin' ? 'var(--brand-50)' : 'var(--bg-surface-2)', color: u.role === 'admin' ? 'var(--brand-700)' : 'var(--text-muted)' }}>
                      {u.role === 'admin' && <Shield size={12} />}
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className={`badge ${u.isActive ? 'badge-success' : 'badge-error'}`}>
                      {u.isActive ? 'نشط' : 'معطّل'}
                    </span>
                  </td>
                  <td className="text-center">
                    <button
                      className="btn btn-ghost p-2"
                      style={{ color: u.isActive ? 'var(--error-500)' : 'var(--success-500)' }}
                      title={u.isActive ? 'تعطيل' : 'تفعيل'}
                      onClick={() => toggleMutation.mutate(u.id)}
                      disabled={u.role === 'admin'}
                    >
                      {u.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-6">
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={18} /> السابق</button>
          <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>التالي <ChevronLeft size={18} /></button>
        </div>
      )}
    </div>
  );
}
