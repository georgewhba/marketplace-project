import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { UserCheck, UserX, Search, ChevronRight, ChevronLeft, Shield, Users } from 'lucide-react';

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
    onSuccess: () => {
      addToast('تم تحديث حالة المستخدم', 'success');
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const filtered = search
    ? users.filter(
        u =>
          u.firstName.toLowerCase().includes(search.toLowerCase()) ||
          u.lastName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase())
      )
    : users;

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Users size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إدارة المستخدمين</h1>
            <p className="page-header__subtitle">استعراض حسابات العملاء والبائعين والمشرفين والتحكم في حالة التفعيل</p>
          </div>
        </div>
        <span className="catalog-count-badge">
          المعروض: <strong>{filtered.length}</strong> مستخدم
        </span>
      </div>

      <div className="card card-body mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <div className="relative" style={{ maxWidth: 420 }}>
          <Search
            size={18}
            className="text-muted"
            style={{ position: 'absolute', insetInlineEnd: 14, top: '50%', transform: 'translateY(-50%)' }}
          />
          <input
            className="form-input"
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingInlineEnd: 42 }}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 56 }} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>المستخدم</th>
                <th>البريد الإلكتروني</th>
                <th className="text-center">الدور</th>
                <th className="text-center">الحالة</th>
                <th className="text-center">الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div
                        className="flex items-center justify-center font-bold text-brand"
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: '50%',
                          backgroundColor: 'var(--brand-50)',
                          border: '1px solid var(--brand-200)',
                          fontSize: 'var(--font-size-sm)',
                        }}
                      >
                        {u.firstName[0]}
                      </div>
                      <span className="font-semibold text-primary">
                        {u.firstName} {u.lastName}
                      </span>
                    </div>
                  </td>
                  <td className="text-secondary ltr" style={{ fontSize: 'var(--font-size-sm)' }}>
                    {u.email}
                  </td>
                  <td className="text-center">
                    <span className={`badge ${u.role === 'admin' ? 'badge-brand' : 'badge-neutral'}`}>
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
                      className="icon-btn"
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
