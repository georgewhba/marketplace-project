import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { Tag, Plus, PowerOff, Save, X } from 'lucide-react';

export default function AdminPromotions() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const [form, setForm] = useState({
    planId: '',
    discountPercentage: '',
    durationDays: '30',
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
        durationDays: parseInt(data.durationDays, 10),
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
      durationDays: '30',
    });
  };

  return (
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Tag size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>عروض الباقات</h1>
            <p className="page-header__subtitle">إدارة العروض الترويجية والخصومات الموقوتة على باقات اشتراك البائعين</p>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditId(null);
            resetForm();
            setShowForm(true);
          }}
        >
          <Plus size={18} /> إضافة عرض جديد
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
                <th>الباقة</th>
                <th>قيمة الخصم</th>
                <th>فترة الصلاحية</th>
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
                    <td className="font-semibold text-primary">{p.planName}</td>
                    <td>
                      <span className="badge badge-brand">%{p.discountPercentage}</span>
                    </td>
                    <td>
                      <div style={{ fontSize: 'var(--font-size-xs)' }}>من: {validFrom.toLocaleDateString('ar-EG')}</div>
                      <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                        إلى: {validTo.toLocaleDateString('ar-EG')}
                      </div>
                    </td>
                    <td>
                      {isCurrentlyValid ? (
                        <span className="badge badge-success">ساري</span>
                      ) : !p.isActive ? (
                        <span className="badge badge-neutral">ملغي</span>
                      ) : (
                        <span className="badge badge-danger">منتهي</span>
                      )}
                    </td>
                    <td>
                      {p.isActive && isCurrentlyValid && (
                        <button
                          className="icon-btn"
                          style={{ color: 'var(--error-500)' }}
                          onClick={() => toggleStatusMutation.mutate(p)}
                          title="إلغاء العرض"
                          disabled={toggleStatusMutation.isPending}
                        >
                          <PowerOff size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}

              {(!promotions?.data || promotions.data.length === 0) && (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-muted">
                    لا توجد عروض حالياً
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Add Promotion */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-primary flex items-center gap-2">
                <Tag size={18} color="var(--brand-500)" />
                {editId ? 'تعديل العرض' : 'إضافة عرض جديد للباقات'}
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
              <div className="modal-body flex flex-col gap-4">
                <div className="form-group">
                  <label className="form-label">الباقة المرتبطة *</label>
                  <select
                    className="form-select"
                    value={form.planId}
                    onChange={e => setForm({ ...form, planId: e.target.value })}
                    required
                  >
                    <option value="">-- اختر الباقة --</option>
                    {plans?.data?.map((p: any) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.priceMonthly} ج.م)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">نسبة الخصم (%) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.discountPercentage}
                      onChange={e => setForm({ ...form, discountPercentage: e.target.value })}
                      required
                      max="100"
                      min="1"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">مدة العرض (بالأيام) *</label>
                    <input
                      type="number"
                      className="form-input"
                      value={form.durationDays}
                      onChange={e => setForm({ ...form, durationDays: e.target.value })}
                      required
                      min="1"
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                  إلغاء
                </button>
                <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
                  <Save size={16} /> {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ العرض'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
