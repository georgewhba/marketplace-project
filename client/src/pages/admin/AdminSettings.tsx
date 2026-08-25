import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Save } from 'lucide-react';

export default function AdminSettings() {
  const toast = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    site_name: '',
    default_commission_rate: '',
    contact_email: '',
    contact_phone: '',
    default_shipping_fee: '',
    currency: '',
    min_order_amount: '',
  });

  useEffect(() => {
    adminApi.getSettings()
      .then((res: any) => {
        const data = res.data || res;
        const currentSettings = { ...settings };
        if (Array.isArray(data)) {
          data.forEach((item: any) => {
            if (item.key in currentSettings) {
              (currentSettings as any)[item.key] = item.value;
            }
          });
        } else if (typeof data === 'object') {
          // In case it returns an object directly
          Object.keys(data).forEach(key => {
            if (key in currentSettings) {
               (currentSettings as any)[key] = data[key];
            }
          });
        }
        setSettings(currentSettings);
      })
      .catch(() => toast.error('فشل تحميل الإعدادات'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(settings).filter(([, v]) => v !== undefined && v !== null && v !== '')
      );
      
      await adminApi.updateSettings(payload);
      toast.success('تم حفظ الإعدادات بنجاح');
      
      // Update document title if site_name changed
      if (settings.site_name) {
        document.title = settings.site_name;
      }
      // Invalidate global site settings cache so header/footer update
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex flex-col gap-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 60 }} />)}</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">إعدادات المنصة</h1>
          <p className="page-header__subtitle mt-2">تعديل الإعدادات العامة للمنصة</p>
        </div>
      </div>

      <div className="card max-w-2xl">
        <form className="card-body" onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label className="form-label">اسم المنصة</label>
            <input
              type="text"
              name="site_name"
              className="input"
              value={settings.site_name}
              onChange={handleChange}
              placeholder="مثال: متجري"
            />
          </div>

          <div className="form-group">
            <label className="form-label">نسبة العمولة الافتراضية (%)</label>
            <input
              type="number"
              step="0.01"
              name="default_commission_rate"
              className="input"
              value={settings.default_commission_rate}
              onChange={handleChange}
              placeholder="مثال: 10.00"
            />
            <p className="text-muted mt-1" style={{ fontSize: 'var(--font-size-xs)' }}>
              ستطبق هذه النسبة كإعداد افتراضي على البائعين الجدد.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">بريد التواصل</label>
            <input
              type="email"
              name="contact_email"
              className="input"
              value={settings.contact_email}
              onChange={handleChange}
              placeholder="مثال: support@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label">رقم التواصل</label>
            <input
              type="text"
              name="contact_phone"
              className="input"
              value={settings.contact_phone}
              onChange={handleChange}
              placeholder="مثال: 01xxxxxxxxx"
            />
          </div>

          <div className="form-group">
            <label className="form-label">رسوم الشحن الافتراضية</label>
            <input
              type="number"
              step="0.01"
              name="default_shipping_fee"
              className="input"
              value={settings.default_shipping_fee}
              onChange={handleChange}
              placeholder="مثال: 50.00"
            />
          </div>

          <div className="form-group">
            <label className="form-label">العملة الافتراضية</label>
            <input
              type="text"
              name="currency"
              className="input"
              value={settings.currency}
              onChange={handleChange}
              placeholder="مثال: EGP"
            />
          </div>

          <div className="form-group">
            <label className="form-label">الحد الأدنى للطلب</label>
            <input
              type="number"
              step="0.01"
              name="min_order_amount"
              className="input"
              value={settings.min_order_amount}
              onChange={handleChange}
              placeholder="مثال: 100.00"
            />
          </div>

          <div className="mt-6">
            <button type="submit" className="btn btn-primary w-full" disabled={saving}>
              {saving ? <div className="spinner" /> : <Save size={18} />}
              {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
