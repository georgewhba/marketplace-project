import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { Check, X, RefreshCw, Undo } from 'lucide-react';
import { useState } from 'react';

export default function AdminRefunds() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: async () => {
      const res = (await api.get('/refunds/admin')) as any;
      return res?.data?.data || res?.data || res || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.put(`/refunds/admin/${id}/approve`, { adminNote });
    },
    onSuccess: () => {
      toast.success('تمت الموافقة على الاسترجاع');
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setSelectedRequest(null);
      setAdminNote('');
    },
    onError: (e: any) => toast.error(e.message || e.response?.data?.error || 'حدث خطأ'),
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!adminNote) throw new Error('سبب الرفض مطلوب');
      await api.put(`/refunds/admin/${id}/reject`, { adminNote });
    },
    onSuccess: () => {
      toast.success('تم رفض طلب الاسترجاع');
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setSelectedRequest(null);
      setAdminNote('');
    },
    onError: (e: any) => toast.error(e.message || e.response?.data?.error || 'حدث خطأ'),
  });

  if (isLoading) return <div className="skeleton" style={{ height: 400 }} />;

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Undo size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>طلبات الاسترجاع</h1>
            <p className="page-header__subtitle">مراجعة طلبات استرجاع العملاء واتخاذ قرار القبول أو الرفض</p>
          </div>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>رقم الطلب</th>
              <th>المبلغ</th>
              <th>السبب</th>
              <th>الحالة</th>
              <th>التاريخ</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {requests.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center text-muted" style={{ padding: 'var(--space-8)' }}>
                  لا توجد طلبات استرجاع حالياً
                </td>
              </tr>
            ) : (
              requests.map((req: any) => (
                <tr key={req.id}>
                  <td className="font-semibold text-primary">#{req.orderId}</td>
                  <td className="font-semibold text-brand">{Number(req.amount).toLocaleString('ar-EG')} ج.م</td>
                  <td style={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {req.reason}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        req.status === 'pending'
                          ? 'badge-warning'
                          : req.status === 'approved'
                          ? 'badge-success'
                          : 'badge-error'
                      }`}
                    >
                      {req.status === 'pending' ? 'قيد المراجعة' : req.status === 'approved' ? 'مقبول' : 'مرفوض'}
                    </span>
                  </td>
                  <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {new Date(req.createdAt).toLocaleDateString('ar-EG')}
                  </td>
                  <td>
                    {req.status === 'pending' && (
                      <button className="btn btn-outline btn-sm" onClick={() => setSelectedRequest(req)}>
                        معالجة الطلب
                      </button>
                    )}
                    {req.status !== 'pending' && req.adminNote && (
                      <span className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }} title={req.adminNote}>
                        {req.adminNote}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div className="modal-overlay" onClick={() => setSelectedRequest(null)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-primary flex gap-2 items-center">
                <RefreshCw size={18} color="var(--brand-500)" /> معالجة طلب استرجاع #{selectedRequest.orderId}
              </h3>
              <button className="modal-close" onClick={() => setSelectedRequest(null)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="mb-4">
                <p className="text-muted mb-1" style={{ fontSize: 'var(--font-size-sm)' }}>
                  السبب المقدم من العميل:
                </p>
                <div
                  className="p-3"
                  style={{
                    backgroundColor: 'var(--bg-surface-2)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  {selectedRequest.reason}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">ملاحظات الإدارة (تظهر للعميل)</label>
                <textarea
                  className="form-textarea"
                  rows={3}
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  placeholder="أدخل سبب الرفض أو ملاحظات الموافقة..."
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-ghost"
                onClick={() => {
                  setSelectedRequest(null);
                  setAdminNote('');
                }}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                إلغاء
              </button>
              <button
                className="btn btn-danger"
                onClick={() => rejectMutation.mutate(selectedRequest.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <X size={16} /> رفض الطلب
              </button>
              <button
                className="btn btn-primary"
                onClick={() => approveMutation.mutate(selectedRequest.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
              >
                <Check size={16} /> موافقة واسترجاع
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
