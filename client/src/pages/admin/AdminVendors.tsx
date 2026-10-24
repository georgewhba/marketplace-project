import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { CheckCircle, XCircle, Ban, Store, Search, ChevronRight, ChevronLeft } from 'lucide-react';

interface Vendor {
  id: number;
  userId: number;
  storeName: string;
  storeSlug: string;
  status: string;
  commissionRate: string;
  user?: { firstName: string; lastName: string; email: string };
  createdAt: string;
}

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: 'في الانتظار', cls: 'badge-warning' },
  approved: { label: 'مفعّل', cls: 'badge-success' },
  rejected: { label: 'مرفوض', cls: 'badge-error' },
  suspended: { label: 'موقوف', cls: 'badge-error' },
};

export default function AdminVendors() {
  const { addToast } = useToast();
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-vendors', page],
    queryFn: () => adminApi.getVendors(page),
  });

  const vendors: Vendor[] = data?.data ?? [];
  const meta = data?.meta;

  const approveMutation = useMutation({
    mutationFn: (id: number) => adminApi.approveVendor(id, '10.00'),
    onSuccess: () => {
      addToast('تم تفعيل البائع', 'success');
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => adminApi.rejectVendor(id, 'لا يستوفي الشروط'),
    onSuccess: () => {
      addToast('تم رفض البائع', 'success');
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: number) => adminApi.suspendVendor(id),
    onSuccess: () => {
      addToast('تم إيقاف البائع', 'success');
      qc.invalidateQueries({ queryKey: ['admin-vendors'] });
    },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const filtered = vendors.filter(v => {
    if (filter !== 'all' && v.status !== filter) return false;
    if (search && !v.storeName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Store size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إدارة البائعين</h1>
            <p className="page-header__subtitle">مراجعة طلبات انضمام المتاجر، اعتماد البائعين، وإدارة نسب العمولات</p>
          </div>
        </div>
        <span className="catalog-count-badge">
          إجمالي: <strong>{filtered.length}</strong> متجر
        </span>
      </div>

      {/* Filters Toolbar */}
      <div className="card card-body mb-6" style={{ padding: 'var(--space-4) var(--space-5)' }}>
        <div className="flex gap-3 flex-wrap items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {['all', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setFilter(s)}
              >
                {s === 'all' ? 'الكل' : statusBadge[s]?.label ?? s}
              </button>
            ))}
          </div>
          <div className="relative" style={{ minWidth: 240 }}>
            <Search
              size={16}
              className="text-muted"
              style={{ position: 'absolute', insetInlineEnd: 12, top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              className="form-input"
              placeholder="بحث باسم المتجر..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ paddingInlineEnd: 38, height: 38 }}
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton" style={{ height: 88 }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <Store size={52} className="empty-state__icon" />
            <div className="empty-state__title">لا يوجد بائعون مطابقون</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(v => {
            const badge = statusBadge[v.status] ?? statusBadge.pending;
            return (
              <div key={v.id} className="card card-body">
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="feature-card__icon" style={{ width: 46, height: 46 }}>
                      <Store size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-primary font-bold m-0" style={{ fontSize: 'var(--font-size-md)' }}>
                          {v.storeName}
                        </h4>
                        <span className={`badge ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="text-secondary" style={{ fontSize: 'var(--font-size-sm)' }}>
                        {v.user?.firstName} {v.user?.lastName} • <span className="ltr">{v.user?.email}</span>
                      </div>
                      <div className="mt-1 text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        نسبة العمولة: <strong className="text-brand">{v.commissionRate}%</strong> • تاريخ الانضمام:{' '}
                        {new Date(v.createdAt).toLocaleDateString('ar-EG')}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {v.status === 'pending' && (
                      <>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => approveMutation.mutate(v.id)}
                          disabled={approveMutation.isPending}
                        >
                          <CheckCircle size={16} /> قبول وتفعيل
                        </button>
                        <button
                          className="btn btn-outline btn-sm text-error"
                          onClick={() => rejectMutation.mutate(v.id)}
                          disabled={rejectMutation.isPending}
                        >
                          <XCircle size={16} /> رفض
                        </button>
                      </>
                    )}
                    {v.status === 'approved' && (
                      <button
                        className="btn btn-outline btn-sm text-error"
                        onClick={() => {
                          if (confirm('هل أنت متأكد من إيقاف هذا البائع؟')) suspendMutation.mutate(v.id);
                        }}
                      >
                        <Ban size={16} /> إيقاف المتجر
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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
