import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Trash2, Info, Tag, Save, X } from 'lucide-react';

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

interface CommissionRule {
  id: number;
  scope: 'global' | 'category' | 'vendor';
  targetId: number | null;
  rate: string;
  priority: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  createdAt: string;
}

export function AdminCommissionRules() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    scope: 'global' as 'global' | 'category' | 'vendor',
    targetId: '',
    rate: '',
    priority: '0',
    effectiveFrom: '',
    effectiveTo: '',
  });

  const { data: response, isLoading } = useQuery({
    queryKey: ['admin-commission-rules'],
    queryFn: () => adminApi.getCommissionRules(),
  });

  const rules: CommissionRule[] = response?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createCommissionRule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-rules'] });
      addToast('تم إضافة القاعدة بنجاح', 'success');
      setIsFormOpen(false);
      setFormData({
        scope: 'global',
        targetId: '',
        rate: '',
        priority: '0',
        effectiveFrom: '',
        effectiveTo: '',
      });
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => adminApi.deleteCommissionRule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-commission-rules'] });
      addToast('تم حذف القاعدة بنجاح', 'success');
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      ...formData,
      targetId: formData.scope === 'global' ? null : Number(formData.targetId),
      priority: Number(formData.priority),
      effectiveFrom: formData.effectiveFrom || undefined,
      effectiveTo: formData.effectiveTo || null,
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
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>قواعد العمولة</h1>
            <p className="page-header__subtitle">إدارة نسب العمولة المخصصة للبائعين والأقسام وفق الأولوية</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setIsFormOpen(true)}>
          <Plus size={18} /> إضافة قاعدة جديدة
        </button>
      </div>

      {/* Info Banner */}
      <div
        className="card card-body mb-6"
        style={{
          background: 'var(--brand-50)',
          borderColor: 'var(--brand-200)',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 'var(--space-3)',
        }}
      >
        <div className="feature-card__icon" style={{ width: 36, height: 36, background: 'var(--bg-surface)' }}>
          <Info size={18} />
        </div>
        <div style={{ fontSize: 'var(--font-size-sm)' }}>
          <p className="text-primary" style={{ fontWeight: 700, marginBottom: 4 }}>كيف يتم احتساب أولوية العمولة؟</p>
          <ul className="text-secondary" style={{ margin: 0, paddingInlineStart: 'var(--space-4)', listStyle: 'disc' }}>
            <li>يبحث النظام أولاً عن قاعدة خاصة بالبائع، ثم قاعدة القسم، ثم القاعدة العامة.</li>
            <li>عند وجود أكثر من قاعدة لنفس النطاق، يتم تطبيق القاعدة ذات رقم الأولوية الأعلى.</li>
            <li>في حال عدم وجود قاعدة مطابقة، يتم تطبيق النسبة الافتراضية المحددة في ملف البائع.</li>
          </ul>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>النطاق</th>
              <th>المعرف المستهدف</th>
              <th>النسبة (%)</th>
              <th>الأولوية</th>
              <th>تاريخ البداية</th>
              <th>تاريخ الانتهاء</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1, 2, 3].map(i => (
                <tr key={i}>
                  <td colSpan={7}>
                    <div className="skeleton" style={{ height: 40 }} />
                  </td>
                </tr>
              ))
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-state__title">لا توجد قواعد عمولة مخصصة حتى الآن</div>
                  </div>
                </td>
              </tr>
            ) : (
              rules.map(rule => (
                <tr key={rule.id}>
                  <td>
                    <span className="badge badge-brand">
                      {rule.scope === 'global' ? 'عام' : rule.scope === 'category' ? 'قسم' : 'بائع'}
                    </span>
                  </td>
                  <td>{rule.targetId ?? '—'}</td>
                  <td className="text-brand" style={{ fontWeight: 700 }}>{rule.rate}%</td>
                  <td>{rule.priority}</td>
                  <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>{formatDate(rule.effectiveFrom)}</td>
                  <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                    {rule.effectiveTo ? formatDate(rule.effectiveTo) : 'مستمر'}
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      style={{ color: 'var(--error-500)' }}
                      onClick={() => {
                        if (window.confirm('هل أنت متأكد من حذف القاعدة؟')) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                      title="حذف"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Commission Rule */}
      {isFormOpen && (
        <div className="modal-overlay" onClick={() => setIsFormOpen(false)}>
          <div className="modal card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="text-primary flex items-center gap-2">
                <Tag size={18} color="var(--brand-500)" /> إضافة قاعدة عمولة جديدة
              </h3>
              <button className="modal-close" onClick={() => setIsFormOpen(false)} aria-label="إغلاق">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body flex flex-col gap-4">
                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">النطاق</label>
                    <select
                      className="form-select"
                      value={formData.scope}
                      onChange={e => setFormData({ ...formData, scope: e.target.value as any, targetId: '' })}
                    >
                      <option value="global">عام (المنصة بالكامل)</option>
                      <option value="category">قسم محدد</option>
                      <option value="vendor">بائع محدد</option>
                    </select>
                  </div>

                  {formData.scope !== 'global' ? (
                    <div className="form-group">
                      <label className="form-label">معرف ال{formData.scope === 'vendor' ? 'بائع' : 'قسم'} *</label>
                      <input
                        className="form-input"
                        type="number"
                        required
                        value={formData.targetId}
                        onChange={e => setFormData({ ...formData, targetId: e.target.value })}
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label className="form-label">الأولوية (الأعلى يفوز)</label>
                      <input
                        className="form-input"
                        type="number"
                        required
                        value={formData.priority}
                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">نسبة العمولة (%) *</label>
                    <input
                      className="form-input"
                      type="number"
                      step="0.01"
                      required
                      value={formData.rate}
                      onChange={e => setFormData({ ...formData, rate: e.target.value })}
                      placeholder="مثال: 8.5"
                    />
                  </div>
                  {formData.scope !== 'global' && (
                    <div className="form-group">
                      <label className="form-label">الأولوية (الأعلى يفوز)</label>
                      <input
                        className="form-input"
                        type="number"
                        required
                        value={formData.priority}
                        onChange={e => setFormData({ ...formData, priority: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-2 gap-3">
                  <div className="form-group">
                    <label className="form-label">فعال من *</label>
                    <input
                      className="form-input"
                      type="date"
                      required
                      value={formData.effectiveFrom}
                      onChange={e => setFormData({ ...formData, effectiveFrom: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">فعال إلى (اختياري)</label>
                    <input
                      className="form-input"
                      type="date"
                      value={formData.effectiveTo}
                      onChange={e => setFormData({ ...formData, effectiveTo: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={() => setIsFormOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" className="btn btn-primary" disabled={createMutation.isPending}>
                  <Save size={16} /> {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ القاعدة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
