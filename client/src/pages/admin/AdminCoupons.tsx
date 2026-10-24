import { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Plus, Trash, Ticket, X } from 'lucide-react';
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
      setCoupons(data?.data || []);
    } catch {
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
    } catch {
      toast.error('فشل في الحذف');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: formData.code,
        type: formData.discountType,
        value: String(formData.discountValue),
        minOrderAmount: formData.minOrderValue ? String(formData.minOrderValue) : undefined,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : undefined,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : undefined,
        isActive: true,
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
    <div>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Ticket size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إدارة الكوبونات</h1>
            <p className="page-header__subtitle">إنشاء وإدارة أكواد الخصم الترويجية للعملاء</p>
          </div>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} />
          إضافة كوبون جديد
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        {loading ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>جاري التحميل...</div>
        ) : coupons.length === 0 ? (
          <div className="empty-state">
            <Ticket size={48} className="empty-state__icon" />
            <div className="empty-state__title">لا توجد كوبونات حالياً</div>
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
              {coupons.map(coupon => {
                const type = coupon.type || coupon.discountType;
                const val = coupon.value ?? coupon.discountValue;
                const minOrder = coupon.minOrderAmount ?? coupon.minOrderValue;
                return (
                  <tr key={coupon.id}>
                    <td>
                      <span
                        className="badge badge-brand ltr"
                        style={{ fontWeight: 700, fontSize: 'var(--font-size-sm)', padding: '4px 10px' }}
                      >
                        {coupon.code}
                      </span>
                    </td>
                    <td>{type === 'percentage' ? 'نسبة مئوية' : 'مبلغ ثابت'}</td>
                    <td className="font-bold text-brand">
                      {val}
                      {type === 'percentage' ? '%' : ' ج.م'}
                    </td>
                    <td className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                      {coupon.expiresAt ? new Date(coupon.expiresAt).toLocaleDateString('ar-EG') : 'بدون تاريخ انتهاء'}
                    </td>
                    <td>
                      {coupon.usedCount ?? 0} {coupon.usageLimit ? `/ ${coupon.usageLimit}` : ''}
                    </td>
                    <td>{minOrder ? `${minOrder} ج.م` : '—'}</td>
                    <td>
                      <button
                        className="icon-btn"
                        style={{ color: 'var(--error-500)' }}
                        onClick={() => handleDelete(coupon.id)}
                        title="حذف"
                        aria-label="حذف الكوبون"
                      >
                        <Trash size={15} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            className="modal-overlay"
            onClick={() => setIsModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: motionTokens.duration.fast }}
          >
            <motion.div
              className="modal card"
              onClick={e => e.stopPropagation()}
              initial={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: shouldReduceMotion ? 1 : 0.95, opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              transition={{ duration: motionTokens.duration.base, ...motionTokens.easing.spring }}
            >
              <div className="modal-header">
                <h3 className="text-primary flex items-center gap-2">
                  <Ticket size={18} color="var(--brand-500)" /> إضافة كوبون جديد
                </h3>
                <button className="modal-close" onClick={() => setIsModalOpen(false)} aria-label="إغلاق">
                  <X size={18} />
                </button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleSubmit} id="coupon-form" className="flex flex-col gap-4">
                  <div className="form-group">
                    <label className="form-label">كود الكوبون *</label>
                    <input
                      type="text"
                      className="form-input"
                      dir="ltr"
                      value={formData.code}
                      onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      placeholder="SUMMER2026"
                      required
                    />
                  </div>

                  <div className="grid grid-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">نوع الخصم *</label>
                      <select
                        className="form-select"
                        value={formData.discountType}
                        onChange={e => setFormData({ ...formData, discountType: e.target.value })}
                      >
                        <option value="percentage">نسبة مئوية (%)</option>
                        <option value="fixed">مبلغ ثابت (ج.م)</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="form-label">قيمة الخصم *</label>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        step="0.01"
                        value={formData.discountValue}
                        onChange={e => setFormData({ ...formData, discountValue: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">الحد الأدنى للطلب (اختياري)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        value={formData.minOrderValue}
                        onChange={e => setFormData({ ...formData, minOrderValue: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">الحد الأقصى للخصم (اختياري)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="0"
                        value={formData.maxDiscount}
                        onChange={e => setFormData({ ...formData, maxDiscount: e.target.value })}
                        disabled={formData.discountType === 'fixed'}
                      />
                    </div>
                  </div>

                  <div className="grid grid-2 gap-4">
                    <div className="form-group">
                      <label className="form-label">حد الاستخدام الكلي (اختياري)</label>
                      <input
                        type="number"
                        className="form-input"
                        min="1"
                        value={formData.usageLimit}
                        onChange={e => setFormData({ ...formData, usageLimit: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">تاريخ الانتهاء (اختياري)</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.expiresAt}
                        onChange={e => setFormData({ ...formData, expiresAt: e.target.value })}
                      />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button className="btn btn-ghost" onClick={() => setIsModalOpen(false)}>
                  إلغاء
                </button>
                <button type="submit" form="coupon-form" className="btn btn-primary">
                  حفظ الكوبون
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
