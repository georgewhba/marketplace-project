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
    onSuccess: () => { addToast('تم تفعيل البائع', 'success'); qc.invalidateQueries({ queryKey: ['admin-vendors'] }); },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => adminApi.rejectVendor(id, 'لا يستوفي الشروط'),
    onSuccess: () => { addToast('تم رفض البائع', 'success'); qc.invalidateQueries({ queryKey: ['admin-vendors'] }); },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: number) => adminApi.suspendVendor(id),
    onSuccess: () => { addToast('تم إيقاف البائع', 'success'); qc.invalidateQueries({ queryKey: ['admin-vendors'] }); },
    onError: () => addToast('حدث خطأ', 'error'),
  });

  const filtered = vendors.filter(v => {
    if (filter !== 'all' && v.status !== filter) return false;
    if (search && !v.storeName.includes(search)) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Store size={24} className="text-brand" />
        <h1 className="page-header__title m-0">إدارة البائعين</h1>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        {['all', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
          <button
            key={s}
            className={`btn ${filter === s ? 'btn-primary' : 'btn-outline'}`}
            style={{ fontSize: 'var(--font-size-sm)', padding: 'var(--space-2) var(--space-3)' }}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'الكل' : statusBadge[s]?.label ?? s}
          </button>
        ))}
        <div className="relative" style={{ marginRight: 'auto' }}>
          <Search size={16} className="text-muted" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }} />
          <input className="input" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingRight: 34, fontSize: 'var(--font-size-sm)', height: 36, maxWidth: 200 }} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state__title">لا يوجد بائعون</div></div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map(v => {
            const badge = statusBadge[v.status] ?? statusBadge.pending;
            return (
              <div key={v.id} className="card p-4">
                <div className="flex justify-between items-center flex-wrap gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold m-0">{v.storeName}</h4>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                      {v.user?.firstName} {v.user?.lastName} • {v.user?.email}
                    </div>
                    <div className="mt-1" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                      عمولة: {v.commissionRate}% • انضم: {new Date(v.createdAt).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {v.status === 'pending' && (
                      <>
                        <button className="btn btn-primary" style={{ fontSize: 'var(--font-size-sm)' }} onClick={() => approveMutation.mutate(v.id)} disabled={approveMutation.isPending}>
                          <CheckCircle size={16} /> قبول
                        </button>
                        <button className="btn btn-outline" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--error-500)', borderColor: 'var(--error-200)' }}
                          onClick={() => rejectMutation.mutate(v.id)} disabled={rejectMutation.isPending}>
                          <XCircle size={16} /> رفض
                        </button>
                      </>
                    )}
                    {v.status === 'approved' && (
                      <button className="btn btn-outline" style={{ fontSize: 'var(--font-size-sm)', color: 'var(--error-500)', borderColor: 'var(--error-200)' }}
                        onClick={() => { if (confirm('هل أنت متأكد من إيقاف هذا البائع؟')) suspendMutation.mutate(v.id); }}>
                        <Ban size={16} /> إيقاف
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
          <button className="btn btn-outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={18} /> السابق</button>
          <span className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn-outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>التالي <ChevronLeft size={18} /></button>
        </div>
      )}
    </div>
  );
}
