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
  pending: { label: 'في الانتظار', cls: 'badge--warning' },
  approved: { label: 'مفعّل', cls: 'badge--success' },
  rejected: { label: 'مرفوض', cls: 'badge--error' },
  suspended: { label: 'موقوف', cls: 'badge--error' },
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
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <Store size={24} color="var(--primary-500)" />
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>إدارة البائعين</h2>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-4)', flexWrap: 'wrap', alignItems: 'center' }}>
        {['all', 'pending', 'approved', 'rejected', 'suspended'].map(s => (
          <button
            key={s}
            className={`btn ${filter === s ? 'btn--primary' : 'btn--outline'}`}
            style={{ fontSize: 'var(--text-sm)', padding: 'var(--space-2) var(--space-3)' }}
            onClick={() => setFilter(s)}
          >
            {s === 'all' ? 'الكل' : statusBadge[s]?.label ?? s}
          </button>
        ))}
        <div style={{ position: 'relative', marginRight: 'auto' }}>
          <Search size={16} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--neutral-400)' }} />
          <input className="input" placeholder="بحث بالاسم..." value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingRight: 34, fontSize: 'var(--text-sm)', height: 36, maxWidth: 200 }} />
        </div>
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80 }} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-state__title">لا يوجد بائعون</div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          {filtered.map(v => {
            const badge = statusBadge[v.status] ?? statusBadge.pending;
            return (
              <div key={v.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <h4 style={{ margin: 0, fontWeight: 600 }}>{v.storeName}</h4>
                      <span className={`badge ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <div style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-500)' }}>
                      {v.user?.firstName} {v.user?.lastName} • {v.user?.email}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--neutral-400)', marginTop: 'var(--space-1)' }}>
                      عمولة: {v.commissionRate}% • انضم: {new Date(v.createdAt).toLocaleDateString('ar-EG')}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                    {v.status === 'pending' && (
                      <>
                        <button className="btn btn--primary" style={{ fontSize: 'var(--text-sm)' }} onClick={() => approveMutation.mutate(v.id)} disabled={approveMutation.isPending}>
                          <CheckCircle size={16} /> قبول
                        </button>
                        <button className="btn btn--outline" style={{ fontSize: 'var(--text-sm)', color: 'var(--error-500)', borderColor: 'var(--error-200)' }}
                          onClick={() => rejectMutation.mutate(v.id)} disabled={rejectMutation.isPending}>
                          <XCircle size={16} /> رفض
                        </button>
                      </>
                    )}
                    {v.status === 'approved' && (
                      <button className="btn btn--outline" style={{ fontSize: 'var(--text-sm)', color: 'var(--error-500)', borderColor: 'var(--error-200)' }}
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 'var(--space-3)', marginTop: 'var(--space-5)' }}>
          <button className="btn btn--outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronRight size={18} /> السابق</button>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--neutral-600)' }}>صفحة {meta.page} من {meta.totalPages}</span>
          <button className="btn btn--outline" disabled={page >= meta.totalPages} onClick={() => setPage(p => p + 1)}>التالي <ChevronLeft size={18} /></button>
        </div>
      )}
    </div>
  );
}
