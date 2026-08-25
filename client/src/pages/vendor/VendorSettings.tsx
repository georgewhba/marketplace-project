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
      <div style={{ padding: 'var(--space-6)' }}>
        {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, marginBottom: 'var(--space-4)' }} />)}
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 640 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
        <Store size={24} color="var(--primary-500)" />
        <h2 style={{ margin: 0, fontSize: 'var(--text-xl)', fontWeight: 700 }}>إعدادات المتجر</h2>
      </div>

      <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(); }}>
        <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ marginTop: 0, fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>المعلومات الأساسية</h3>
          <div className="form-group">
            <label className="form-label">اسم المتجر</label>
            <input className="input" value={form.storeName} onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">وصف المتجر</label>
            <textarea className="input" rows={3} value={form.storeDescription} onChange={e => setForm(f => ({ ...f, storeDescription: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">رابط شعار المتجر (Logo URL)</label>
            <input className="input" placeholder="https://..." value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">رابط غلاف المتجر (Banner URL)</label>
            <input className="input" placeholder="https://..." value={form.banner} onChange={e => setForm(f => ({ ...f, banner: e.target.value }))} />
          </div>
        </div>

        <div className="card" style={{ padding: 'var(--space-5)', marginBottom: 'var(--space-4)' }}>
          <h3 style={{ marginTop: 0, fontSize: 'var(--text-base)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>السياسات</h3>
          <div className="form-group">
            <label className="form-label">سياسة الشحن</label>
            <textarea className="input" rows={3} value={form.shippingPolicy} onChange={e => setForm(f => ({ ...f, shippingPolicy: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">سياسة الإرجاع</label>
            <textarea className="input" rows={3} value={form.returnPolicy} onChange={e => setForm(f => ({ ...f, returnPolicy: e.target.value }))} />
          </div>
        </div>

        <button className="btn btn--primary" type="submit" disabled={saveMutation.isPending} style={{ width: '100%' }}>
          <Save size={18} />
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </form>
    </div>
  );
}
