import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { Check, X, RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function AdminRefunds() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['admin-refunds'],
    queryFn: async () => {
      const res = await api.get('/api/refunds/admin') as any;
      return res.data.data || res.data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.put(`/api/refunds/admin/${id}/approve`, { adminNote });
    },
    onSuccess: () => {
      toast.success('تمت الموافقة على الاسترجاع');
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setSelectedRequest(null);
      setAdminNote('');
    },
    onError: (e: any) => toast.error(e.response?.data?.error || 'حدث خطأ')
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      if (!adminNote) throw new Error('سبب الرفض مطلوب');
      await api.put(`/api/refunds/admin/${id}/reject`, { adminNote });
    },
    onSuccess: () => {
      toast.success('تم رفض طلب الاسترجاع');
      queryClient.invalidateQueries({ queryKey: ['admin-refunds'] });
      setSelectedRequest(null);
      setAdminNote('');
    },
    onError: (e: any) => toast.error(e.message || e.response?.data?.error || 'حدث خطأ')
  });

  if (isLoading) return <div className="p-6 skeleton" style={{ height: 400 }}></div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">طلبات الاسترجاع</h1>
      </div>

      <div className="table-wrapper">
        <table className="table">
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
              <tr><td colSpan={6} className="text-center text-muted">لا يوجد طلبات استرجاع</td></tr>
            ) : requests.map((req: any) => (
              <tr key={req.id}>
                <td>#{req.orderId}</td>
                <td style={{ fontWeight: 600 }}>{Number(req.amount).toLocaleString('ar-EG')} ج.م</td>
                <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {req.reason}
                </td>
                <td>
                  <span className={`badge ${
                    req.status === 'pending' ? 'badge-warning' :
                    req.status === 'approved' ? 'badge-success' : 'badge-danger'
                  }`}>
                    {req.status === 'pending' ? 'قيد المراجعة' :
                     req.status === 'approved' ? 'مقبول' : 'مرفوض'}
                  </span>
                </td>
                <td>{new Date(req.createdAt).toLocaleDateString('ar-EG')}</td>
                <td>
                  {req.status === 'pending' && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      onClick={() => setSelectedRequest(req)}
                    >
                      معالجة
                    </button>
                  )}
                  {req.status !== 'pending' && req.adminNote && (
                    <span className="text-xs text-muted" title={req.adminNote}>توجد ملاحظة</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--bg-overlay)', zIndex: 100 }}>
          <div className="card card-body" style={{ width: '100%', maxWidth: 400 }}>
            <h3 className="text-lg font-bold mb-4 flex gap-2 items-center">
              <RefreshCw size={18} /> معالجة طلب استرجاع #{selectedRequest.orderId}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-muted mb-1">السبب المقدم من العميل:</p>
              <div className="p-3 bg-surface border rounded-md">{selectedRequest.reason}</div>
            </div>
            
            <div className="form-group mb-6">
              <label className="form-label">ملاحظات الإدارة (تظهر للعميل)</label>
              <textarea 
                className="form-textarea" 
                rows={3}
                value={adminNote}
                onChange={e => setAdminNote(e.target.value)}
                placeholder="أدخل سبب الرفض أو ملاحظات الموافقة..."
              />
            </div>
            
            <div className="flex gap-3 justify-end">
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
