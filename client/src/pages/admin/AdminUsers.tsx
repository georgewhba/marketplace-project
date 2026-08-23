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
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <User size={24} color="var(--primary-500)" />
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>إدارة المستخدمين</h2>
      </div>

      <div style={{ position: 'relative', marginBottom: 'var(--space-4)', maxWidth: 360 }}>
        <Search size={18} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
        <input className="input" placeholder="بحث بالاسم أو البريد..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingRight: 40 }} />
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 56 }} />)}
        </div>
      ) : (
        <div className="card" style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--neutral-200)' }}>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>المستخدم</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'right', fontWeight: 600, fontSize: 'var(--text-sm)' }}>البريد</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>الدور</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>الحالة</th>
                <th style={{ padding: 'var(--space-3)', textAlign: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--neutral-100)' }}>
                  <td style={{ padding: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary-100)', color: 'var(--primary-700)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: 'var(--text-sm)' }}>
                        {u.firstName[0]}
                      </div>
                      <span style={{ fontWeight: 500 }}>{u.firstName} {u.lastName}</span>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--space-3)', fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>{u.email}</td>
                  <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 'var(--text-xs)', fontWeight: 500, padding: '2px 8px', borderRadius: 'var(--radius-full)', background: u.role === 'admin' ? 'var(--primary-100)' : 'var(--neutral-100)', color: u.role === 'admin' ? 'var(--primary-700)' : 'var(--neutral-600)' }}>
                      {u.role === 'admin' && <Shield size={12} />}
                      {roleLabels[u.role] ?? u.role}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <span className={`badge ${u.isActive ? 'badge--success' : 'badge--error'}`}>
                      {u.isActive ? 'نشط' : 'معطّل'}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--space-3)', textAlign: 'center' }}>
                    <button
                      className="btn btn--ghost"
                      style={{ padding: 'var(--space-2)', color: u.isActive ? 'var(--error-500)' : 'var(--success-500)' }}
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button className="btn btn--outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={18} /> السابق</button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn--outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>التالي <ChevronLeft size={18} /></button>
        </div>
      )}
    </div>
  );
}
