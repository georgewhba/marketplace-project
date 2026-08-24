import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Trash2, Info } from 'lucide-react';

const formatDate = (date: string) => new Date(date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short', year: 'numeric' });

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
        scope: 'global', targetId: '', rate: '', priority: '0', effectiveFrom: '', effectiveTo: ''
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
    <div style={{ padding: 'var(--space-6)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <div>
          <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 700, margin: '0 0 var(--space-2)' }}>قواعد العمولة</h1>
          <p style={{ color: 'var(--neutral-500)', margin: 0 }}>إدارة نسب العمولة المخصصة للبائعين والأقسام.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setIsFormOpen(!isFormOpen)}>
          <Plus size={18} style={{ marginInlineEnd: '8px' }} /> إضافة قاعدة
        </button>
      </div>

      {isFormOpen && (
        <div className="card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>قاعدة جديدة</h2>
          <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="label">النطاق</label>
              <select 
                className="input" 
                value={formData.scope}
                onChange={(e) => setFormData({...formData, scope: e.target.value as any, targetId: ''})}
              >
                <option value="global">عام</option>
                <option value="category">قسم</option>
                <option value="vendor">بائع</option>
              </select>
            </div>
            
            {formData.scope !== 'global' && (
              <div className="form-group">
                <label className="label">معرف ال{formData.scope === 'vendor' ? 'بائع' : 'قسم'} المستهدف</label>
                <input
                  className="input"
                  type="number"
                  required
                  value={formData.targetId}
                  onChange={(e) => setFormData({...formData, targetId: e.target.value})}
                />
              </div>
            )}
            
            <div className="form-group">
              <label className="label">النسبة (%)</label>
              <input
                className="input"
                type="number"
                step="0.01"
                required
                value={formData.rate}
                onChange={(e) => setFormData({...formData, rate: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="label">الأولوية (الأعلى يفوز)</label>
              <input
                className="input"
                type="number"
                required
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="label">فعال من</label>
              <input
                className="input"
                type="date"
                required
                value={formData.effectiveFrom}
                onChange={(e) => setFormData({...formData, effectiveFrom: e.target.value})}
              />
            </div>
            
            <div className="form-group">
              <label className="label">فعال إلى (اختياري)</label>
              <input
                className="input"
                type="date"
                value={formData.effectiveTo}
                onChange={(e) => setFormData({...formData, effectiveTo: e.target.value})}
              />
            </div>
            
            <div style={{ gridColumn: '1 / -1', marginTop: 'var(--space-2)' }}>
              <button type="submit" className="btn btn--primary" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'جاري الحفظ...' : 'حفظ القاعدة'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div style={{ 
        background: 'var(--info-50)', 
        color: 'var(--info-700)', 
        padding: 'var(--space-4)', 
        borderRadius: 'var(--radius-lg)', 
        display: 'flex', 
        gap: 'var(--space-3)', 
        fontSize: 'var(--text-sm)',
        marginBottom: 'var(--space-6)'
      }}>
        <Info size={20} style={{ flexShrink: 0 }} />
        <div>
          <p style={{ fontWeight: 600, marginBottom: '4px' }}>كيف يتم حساب العمولة؟</p>
          <ul style={{ margin: 0, paddingInlineStart: 'var(--space-4)' }}>
            <li>النظام يبحث عن قاعدة بائع تطابق البائع، ثم قاعدة قسم، ثم قاعدة عامة.</li>
            <li>إذا وجدت أكثر من قاعدة لنفس النطاق، القاعدة ذات الأولوية الأعلى تفوز.</li>
            <li>إذا لم توجد أي قاعدة، سيتم استخدام النسبة الافتراضية المحددة في حساب البائع.</li>
          </ul>
        </div>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table className="table" style={{ width: '100%', minWidth: 800 }}>
          <thead>
            <tr>
              <th>النطاق</th>
              <th>المعرف المستهدف</th>
              <th>النسبة (%)</th>
              <th>الأولوية</th>
              <th>من</th>
              <th>إلى</th>
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [1,2,3].map(i => (
                <tr key={i}>
                  <td colSpan={7}><div className="skeleton" style={{ height: 40 }} /></td>
                </tr>
              ))
            ) : rules.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state" style={{ border: 'none' }}>
                    <div className="empty-state__title">لا توجد قواعد عمولة مخصصة حتى الآن.</div>
                  </div>
                </td>
              </tr>
            ) : (
              rules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.scope === 'global' ? 'عام' : rule.scope === 'category' ? 'قسم' : 'بائع'}</td>
                  <td>{rule.targetId ?? '-'}</td>
                  <td style={{ fontWeight: 600 }}>{rule.rate}%</td>
                  <td>{rule.priority}</td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>{formatDate(rule.effectiveFrom)}</td>
                  <td style={{ fontSize: 'var(--text-xs)' }}>{rule.effectiveTo ? formatDate(rule.effectiveTo) : 'مستمر'}</td>
                  <td>
                    <button 
                      className="btn btn--danger btn--sm" 
                      onClick={() => {
                        if (window.confirm('هل أنت متأكد من حذف القاعدة؟')) {
                          deleteMutation.mutate(rule.id);
                        }
                      }}
                      title="حذف"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
