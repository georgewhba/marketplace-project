import { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Save } from 'lucide-react';

export default function AdminSettings() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    site_name: '',
    default_commission_rate: '',
    contact_email: '',
    contact_phone: '',
    default_shipping_fee: '',
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
      await adminApi.updateSettings(settings);
      toast.success('تم حفظ الإعدادات بنجاح');
      
      // Update document title if site_name changed
      if (settings.site_name) {
        document.title = settings.site_name;
      }
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton" style={{ height: 60, marginBottom: 16 }} />)}</div>;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-header__title">إعدادات المنصة</h1>
          <p className="page-header__subtitle" style={{ marginTop: 'var(--space-2)' }}>تعديل الإعدادات العامة للمنصة</p>
        </div>
      </div>

      <div className="card max-w-2xl">
        <form className="card-body" onSubmit={handleSubmit}>
          
          <div className="form-group">
            <label className="form-label">اسم المنصة</label>
            <input
              type="text"
              name="site_name"
              className="form-control"
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
              className="form-control"
              value={settings.default_commission_rate}
              onChange={handleChange}
              placeholder="مثال: 10.00"
            />
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
              ستطبق هذه النسبة كإعداد افتراضي على البائعين الجدد.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">بريد التواصل</label>
            <input
              type="email"
              name="contact_email"
              className="form-control"
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
              className="form-control"
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
              className="form-control"
              value={settings.default_shipping_fee}
              onChange={handleChange}
              placeholder="مثال: 50.00"
            />
          </div>

          <div style={{ marginTop: 'var(--space-6)' }}>
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
