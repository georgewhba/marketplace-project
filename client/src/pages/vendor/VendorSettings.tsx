import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../api';
import { useToast } from '../../toast';
import { Save, Store, ShieldCheck, Globe } from 'lucide-react';

export default function VendorSettings() {
  const { addToast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-settings'],
    queryFn: vendorApi.getSettings,
  });

  const [form, setForm] = useState({
    storeName: '',
    storeDescription: '',
    shippingPolicy: '',
    returnPolicy: '',
    logo: '',
    banner: '',
  });

  useEffect(() => {
    if (data?.data) {
      const v = data.data;
      setForm({
        storeName: v.storeName ?? '',
        storeDescription: v.storeDescription ?? '',
        shippingPolicy: v.shippingPolicy ?? '',
        returnPolicy: v.returnPolicy ?? '',
        logo: v.logo ?? '',
        banner: v.banner ?? '',
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => vendorApi.updateSettings(form),
    onSuccess: () => {
      addToast('تم حفظ إعدادات المتجر بنجاح', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-settings'] });
    },
    onError: () => addToast('حدث خطأ أثناء الحفظ', 'error'),
  });

  if (isLoading) {
    return (
      <div className="grid grid-2">
        {[1, 2].map(i => (
          <div key={i} className="skeleton" style={{ height: 320 }} />
        ))}
      </div>
    );
  }

  return (
    <form
      onSubmit={e => {
        e.preventDefault();
        saveMutation.mutate();
      }}
    >
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Store size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إعدادات المتجر</h1>
            <p className="page-header__subtitle">تخصيص اسم المتجر، الوصف، الهوية البصرية، وسياسات الشحن والاسترجاع</p>
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={saveMutation.isPending}>
          <Save size={18} />
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      <div className="grid grid-2">
        {/* Card 1: Basic Info & Visual Identity */}
        <div className="card card-body">
          <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="feature-card__icon" style={{ width: 38, height: 38 }}>
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-primary" style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700 }}>
                المعلومات الأساسية والهوية
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                الاسم والوصف والشعار المعروض لعملاء المتجر
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">اسم المتجر</label>
              <input
                className="form-input"
                value={form.storeName}
                onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
                placeholder="اسم متجرك"
              />
            </div>
            <div className="form-group">
              <label className="form-label">وصف المتجر</label>
              <textarea
                className="form-textarea"
                rows={3}
                value={form.storeDescription}
                onChange={e => setForm(f => ({ ...f, storeDescription: e.target.value }))}
                placeholder="نبذة مختصرة عن متجرك ومنتجاتك..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">رابط شعار المتجر (Logo URL)</label>
              <input
                className="form-input"
                dir="ltr"
                placeholder="https://..."
                value={form.logo}
                onChange={e => setForm(f => ({ ...f, logo: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">رابط غلاف المتجر (Banner URL)</label>
              <input
                className="form-input"
                dir="ltr"
                placeholder="https://..."
                value={form.banner}
                onChange={e => setForm(f => ({ ...f, banner: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Store Policies */}
        <div className="card card-body">
          <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="feature-card__icon" style={{ width: 38, height: 38 }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="text-primary" style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700 }}>
                سياسات الشحن والإرجاع
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                الشروط التي تظهر للعملاء في صفحات منتجاتك
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">سياسة الشحن والتوصيل</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={form.shippingPolicy}
                onChange={e => setForm(f => ({ ...f, shippingPolicy: e.target.value }))}
                placeholder="حدد مدة التجهيز والتوصيل المتوقعة لمنتجاتك..."
              />
            </div>
            <div className="form-group">
              <label className="form-label">سياسة الاستبدال والإرجاع</label>
              <textarea
                className="form-textarea"
                rows={4}
                value={form.returnPolicy}
                onChange={e => setForm(f => ({ ...f, returnPolicy: e.target.value }))}
                placeholder="حدد شروط استرجاع أو استبدال المنتجات..."
              />
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
