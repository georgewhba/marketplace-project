import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Save, Settings, Globe, DollarSign } from 'lucide-react';

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
    setSettings(prev => ({ ...prev, [name]: value }));
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

      if (settings.site_name) {
        document.title = settings.site_name;
      }
      qc.invalidateQueries({ queryKey: ['site-settings'] });
    } catch (err: any) {
      toast.error(err.message || 'فشل حفظ الإعدادات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-2">
        {[1, 2].map(i => (
          <div key={i} className="skeleton" style={{ height: 320 }} />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Settings size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إعدادات المنصة</h1>
            <p className="page-header__subtitle">تخصيص الهوية العامة، بيانات التواصل، والسياسات المالية للمتجر</p>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <div className="spinner" /> : <Save size={18} />}
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      <div className="grid grid-2">
        {/* Card 1: Brand & Contact Info */}
        <div className="card card-body">
          <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="feature-card__icon" style={{ width: 38, height: 38 }}>
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-primary" style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700 }}>
                الهوية وبيانات التواصل
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                المعلومات الأساسية التي تظهر للعملاء في الهيدر والفوتر
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">اسم المنصة</label>
              <input
                type="text"
                name="site_name"
                className="form-input"
                value={settings.site_name}
                onChange={handleChange}
                placeholder="مثال: متجرنا"
              />
            </div>

            <div className="form-group">
              <label className="form-label">بريد التواصل الرسمي</label>
              <input
                type="email"
                name="contact_email"
                className="form-input"
                dir="ltr"
                value={settings.contact_email}
                onChange={handleChange}
                placeholder="support@example.com"
              />
            </div>

            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">رقم التواصل</label>
                <input
                  type="text"
                  name="contact_phone"
                  className="form-input"
                  dir="ltr"
                  value={settings.contact_phone}
                  onChange={handleChange}
                  placeholder="01xxxxxxxxx"
                />
              </div>

              <div className="form-group">
                <label className="form-label">العملة الافتراضية</label>
                <input
                  type="text"
                  name="currency"
                  className="form-input"
                  dir="ltr"
                  value={settings.currency}
                  onChange={handleChange}
                  placeholder="EGP"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Financial & Shipping Rules */}
        <div className="card card-body">
          <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="feature-card__icon" style={{ width: 38, height: 38 }}>
              <DollarSign size={18} />
            </div>
            <div>
              <h3 className="text-primary" style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700 }}>
                الإعدادات المالية والشحن
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                العمولات الافتراضية، تكلفة الشحن، والحد الأدنى للطلبات
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">نسبة العمولة الافتراضية (%)</label>
              <input
                type="number"
                step="0.01"
                name="default_commission_rate"
                className="form-input"
                value={settings.default_commission_rate}
                onChange={handleChange}
                placeholder="مثال: 10.00"
              />
              <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                تُطبق هذه النسبة تلقائياً على البائعين الجدد عند التفعيل.
              </p>
            </div>

            <div className="grid grid-2 gap-3">
              <div className="form-group">
                <label className="form-label">رسوم الشحن الافتراضية</label>
                <input
                  type="number"
                  step="0.01"
                  name="default_shipping_fee"
                  className="form-input"
                  value={settings.default_shipping_fee}
                  onChange={handleChange}
                  placeholder="مثال: 50.00"
                />
              </div>

              <div className="form-group">
                <label className="form-label">الحد الأدنى للطلب</label>
                <input
                  type="number"
                  step="0.01"
                  name="min_order_amount"
                  className="form-input"
                  value={settings.min_order_amount}
                  onChange={handleChange}
                  placeholder="مثال: 100.00"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
