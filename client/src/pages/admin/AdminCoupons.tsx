import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Trash, Ticket } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { motionTokens } from '../../lib/motion-tokens';

export default function AdminCoupons() {
  const shouldReduceMotion = useReducedMotion();
  const [coupons, setCoupons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderValue: '',
    maxDiscount: '',
    usageLimit: '',
    expiresAt: '',
  });

  const loadCoupons = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getCoupons();
      setCoupons(data);
    } catch (err) {
      toast.error('فشل في تحميل الكوبونات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCoupons();
  }, []);

  const handleDelete = async (id: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الكوبون؟')) return;
    try {
      await adminApi.deleteCoupon(id);
      toast.success('تم الحذف بنجاح');
      loadCoupons();
    } catch (err) {
      toast.error('فشل في الحذف');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : undefined,
        maxDiscount: formData.maxDiscount ? parseFloat(formData.maxDiscount) : undefined,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
      };
      await adminApi.createCoupon(payload);
      toast.success('تم إنشاء الكوبون بنجاح');
      setIsModalOpen(false);
      setFormData({
        code: '',
        discountType: 'percentage',
        discountValue: '',
        minOrderValue: '',
        maxDiscount: '',
        usageLimit: '',
        expiresAt: '',
      });
      loadCoupons();
    } catch (err: any) {
      toast.error(err.message || 'فشل في إنشاء الكوبون');
    }
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 className="page-header__title">إدارة الكوبونات</h1>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          إضافة كوبون جديد
        </button>
      </div>

      <div className="card">
        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>جاري التحميل...</div>
        ) : coupons.length === 0 ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Ticket size={48} style={{ margin: '0 auto var(--space-4)', opacity: 0.5 }} />
            <p>لا توجد كوبونات حالياً</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>الكود</th>
                <th>النوع</th>
                <th>القيمة</th>
                <th>تاريخ الانتهاء</th>
                <th>الاستخدام</th>
                <th>الحد الأدنى للطلب</th>
                <th>الإجراءات</th>
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id}>
                  <td><span style={{ fontWeight: 'bold', fontFamily: 'monospace', background: 'var(--neutral-100)', padding: '4px 8px', borderRadius: '4px' }}>{coupon.code}</span></td>
                  <td>{coupon.discountType === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</td>
                  <td>
                    {coupon.discountValue}
                    {coupon.discountType === 'percentage' ? '%' : ' ج.م'}
                  </td>
                  <td>{coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('ar-EG') : 'بدون تاريخ انتهاء'}</td>
                  <td>{coupon.usedCount} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : ''}</td>
                  <td>{coupon.minOrderValue ? `${coupon.minOrderValue} ج.م` : '-'}</td>
                  <td>
                    <button 
                      className="btn btn-outline" 
                      onClick={() => handleDelete(coupon.id)}
                      style={{ color: 'var(--error-600)', borderColor: 'var(--error-200)', padding: 'var(--space-2)' }}
                      title="حذف"
                    >
                      <Trash size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
          >
            <motion.div 
              className="modal"
              initial={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              transition={{ duration: motionTokens.duration.base, ...motionTokens.easing.spring }}
            >
            <div className="modal-header">
              <h3>إضافة كوبون جديد</h3>
              <button className="modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} id="coupon-form" className="space-y-4">
                <div>
                  <label className="block mb-2 text-sm font-semibold">كود الكوبون *</label>
                  <input 
                    type="text" 
                    className="input w-full" 
                    value={formData.code} 
                    onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} 
                    placeholder="مثال: SUMMER2024" 
                    required 
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold">نوع الخصم *</label>
                    <select 
                      className="input w-full" 
                      value={formData.discountType}
                      onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                    >
                      <option value="percentage">نسبة مئوية (%)</option>
                      <option value="fixed">مبلغ ثابت (ج.م)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-semibold">قيمة الخصم *</label>
                    <input 
                      type="number" 
                      className="input w-full" 
                      min="1" 
                      step="0.01" 
                      value={formData.discountValue}
                      onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold">الحد الأدنى للطلب (اختياري)</label>
                    <input 
                      type="number" 
                      className="input w-full" 
                      min="0"
                      value={formData.minOrderValue}
                      onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-semibold">الحد الأقصى للخصم (اختياري)</label>
                    <input 
                      type="number" 
                      className="input w-full" 
                      min="0"
                      value={formData.maxDiscount}
                      onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                      disabled={formData.discountType === 'fixed'}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block mb-2 text-sm font-semibold">حد الاستخدام الكلي (اختياري)</label>
                    <input 
                      type="number" 
                      className="input w-full" 
                      min="1"
                      value={formData.usageLimit}
                      onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block mb-2 text-sm font-semibold">تاريخ الانتهاء (اختياري)</label>
                    <input 
                      type="date" 
                      className="input w-full" 
                      value={formData.expiresAt}
                      onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                    />
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button className="btn btn-outline" onClick={() => setIsModalOpen(false)}>إلغاء</button>
              <button type="submit" form="coupon-form" className="btn btn-primary">حفظ الكوبون</button>
            </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
