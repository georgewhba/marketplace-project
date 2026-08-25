import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { vendorApi } from '../../api';
import { useToast } from '../../toast';
import { Save, Store } from 'lucide-react';

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
      addToast('تم حفظ الإعدادات', 'success');
      qc.invalidateQueries({ queryKey: ['vendor-settings'] });
    },
    onError: () => addToast('حدث خطأ أثناء الحفظ', 'error'),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl">
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 'var(--space-4)' }} />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="page-header mb-6">
        <h1 className="page-header__title m-0 flex items-center gap-3">
          <Store size={24} className="text-primary" style={{ color: 'var(--primary-500)' }} />
          إعدادات المتجر
        </h1>
      </div>

      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}>
        <div className="card p-5 mb-4">
          <h3 className="mt-0 mb-4 font-semibold text-base">المعلومات الأساسية</h3>
          <div className="form-group mb-3">
            <label className="form-label">اسم المتجر</label>
            <input className="input w-full" value={form.storeName} onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))} />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">وصف المتجر</label>
            <textarea className="input w-full" rows={3} value={form.storeDescription} onChange={e => setForm(f => ({ ...f, storeDescription: e.target.value }))} />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">رابط شعار المتجر (Logo URL)</label>
            <input className="input w-full" placeholder="https://..." value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">رابط غلاف المتجر (Banner URL)</label>
            <input className="input w-full" placeholder="https://..." value={form.banner} onChange={e => setForm(f => ({ ...f, banner: e.target.value }))} />
          </div>
        </div>

        <div className="card p-5 mb-4">
          <h3 className="mt-0 mb-4 font-semibold text-base">السياسات</h3>
          <div className="form-group mb-3">
            <label className="form-label">سياسة الشحن</label>
            <textarea className="input w-full" rows={3} value={form.shippingPolicy} onChange={e => setForm(f => ({ ...f, shippingPolicy: e.target.value }))} />
          </div>
          <div className="form-group mb-3">
            <label className="form-label">سياسة الإرجاع</label>
            <textarea className="input w-full" rows={3} value={form.returnPolicy} onChange={e => setForm(f => ({ ...f, returnPolicy: e.target.value }))} />
          </div>
        </div>

        <button className="btn btn-primary w-full" type="submit" disabled={saveMutation.isPending}>
          <Save size={18} />
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </form>
    </div>
  );
}
