import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { Tag, Plus, Edit, Power, PowerOff } from 'lucide-react';

export default function AdminPromotions() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    planId: '',
    discountPercentage: '',
    durationDays: '30'
  });
  
  const { data: promotions, isLoading } = useQuery({
    queryKey: ['admin-promotions'],
    queryFn: () => api.get<any>('/admin/subscription-promotions'),
  });

  const { data: plans } = useQuery({
    queryKey: ['admin-subscription-plans'],
    queryFn: () => api.get<any>('/admin/subscription-plans'),
  });

  const saveMutation = useMutation({
    mutationFn: (data: any) => {
      const payload = {
        planId: parseInt(data.planId, 10),
        discountPercentage: parseFloat(data.discountPercentage),
        durationDays: parseInt(data.durationDays, 10)
      };
      
      return api.post('/admin/subscription-promotions', payload);
    },
    onSuccess: () => {
      addToast(editId ? 'تم تحديث العرض' : 'تمت إضافة العرض', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
      setShowForm(false);
      setEditId(null);
      resetForm();
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (promo: any) => api.put(`/admin/subscription-promotions/${promo.id}/cancel`, {}),
    onSuccess: () => {
      addToast('تم إلغاء العرض', 'success');
      queryClient.invalidateQueries({ queryKey: ['admin-promotions'] });
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  const resetForm = () => {
    setForm({
      planId: plans?.data?.[0]?.id?.toString() || '',
      discountPercentage: '',
      durationDays: '30'
    });
  };

  const handleEdit = (promo: any) => {
    // Only used for viewing now, backend doesn't support full edit
  };

  if (isLoading) return <div className="p-6">جاري التحميل...</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="page-header__title m-0 flex items-center gap-2">
          <Tag size={24} className="text-brand" />
          عروض الباقات
        </h1>
        <button className="btn btn-primary" onClick={() => { setEditId(null); resetForm(); setShowForm(!showForm); }}>
          <Plus size={18} /> {showForm ? 'إلغاء' : 'إضافة عرض جديد'}
        </button>
      </div>

      {showForm && (
        <div className="card p-5 mb-6">
          <h2 className="mt-0 mb-4 font-semibold" style={{ fontSize: 'var(--font-size-lg)' }}>
            {editId ? 'تعديل العرض' : 'إضافة عرض جديد'}
          </h2>
          <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
            <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div className="form-group">
                <label className="form-label">الباقة المرتبطة</label>
                <select 
                  className="input" 
                  value={form.planId} 
                  onChange={e => setForm({ ...form, planId: e.target.value })} 
                  required 
                >
                  <option value="">-- اختر الباقة --</option>
                  {plans?.data?.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.priceMonthly} ج.م)</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">نسبة الخصم (%) - بحد أقصى 100</label>
                <input 
                  type="number"
                  className="input" 
                  value={form.discountPercentage} 
                  onChange={e => setForm({ ...form, discountPercentage: e.target.value })} 
                  required 
                  max="100"
                  min="1"
                  step="0.01"
                />
              </div>
              <div className="form-group">
                <label className="form-label">مدة العرض (بالأيام)</label>
                <input 
                  type="number"
                  className="input" 
                  value={form.durationDays} 
                  onChange={e => setForm({ ...form, durationDays: e.target.value })} 
                  required 
                  min="1"
                />
              </div>
            </div>
            
            <button className="btn btn-primary mt-4" type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'جاري الحفظ...' : 'إضافة'}
            </button>
          </form>
        </div>
      )}

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>الباقة</th>
              <th>قيمة الخصم</th>
              <th>المدة</th>
              <th>الحالة</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {promotions?.data?.map((p: any) => {
              const now = new Date();
              const validFrom = new Date(p.validFrom);
              const validTo = new Date(p.validTo);
              const isCurrentlyValid = p.isActive && validFrom <= now && validTo >= now;
              
              return (
                <tr key={p.id}>
                  <td className="font-semibold">{p.planName}</td>
                  <td><span className="text-success font-semibold">%{p.discountPercentage}</span></td>
                  <td>
                    <div className="text-sm">من: {validFrom.toLocaleDateString('ar-EG')}</div>
                    <div className="text-sm">إلى: {validTo.toLocaleDateString('ar-EG')}</div>
                  </td>
                  <td>
                    {isCurrentlyValid ? (
                      <span className="badge badge-success">ساري</span>
                    ) : !p.isActive ? (
                      <span className="badge badge-neutral">ملغي</span>
                    ) : (
                      <span className="badge badge-danger">منتهي/غير صالح</span>
                    )}
                  </td>
                  <td>
                    {p.isActive && isCurrentlyValid && (
                      <button 
                        className="btn btn-ghost p-2 text-danger" 
                        onClick={() => toggleStatusMutation.mutate(p)}
                        title="إلغاء العرض"
                        disabled={toggleStatusMutation.isPending}
                      >
                        <PowerOff size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {(!promotions?.data || promotions.data.length === 0) && (
              <tr>
                <td colSpan={5} className="text-center py-6 text-muted">لا توجد عروض حالياً</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
