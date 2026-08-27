import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Save, Bot } from 'lucide-react';

export function AdminAISettings() {
  const toast = useToast();
  const qc = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    ai_enabled: 'true',
    ai_model: 'gemini-3.7-flash',
    ai_temperature: '0.7',
    ai_system_prompt: '',
    ai_api_key: '',
  });

  const DEFAULT_SYSTEM_INSTRUCTION = `أنت المساعد الذكي الرسمي لموقع "المتجر" (Al-Matjar). 
دورك هو مساعدة العملاء في الاستفسار عن المنتجات، الشحن، سياسة الاسترجاع، وطرق الدفع. 
قواعد هامة:
1. التحدث باللغة العربية بأسلوب احترافي، مهذب، وودود.
2. لا تخترع معلومات غير موجودة عن المتجر. إذا لم تعرف الإجابة، اطلب من المستخدم التواصل مع الدعم البشري عبر صفحة "اتصل بنا".
3. طرق الدفع المتاحة: البطاقات الائتمانية، المحافظ الإلكترونية، الدفع عند الاستلام.
4. الشحن: يتم شحن الطلبات خلال 24-48 ساعة، ونوفر تتبع للشحنات عبر شركة بوسطة.
5. الإرجاع: متاح خلال 14 يوماً من الاستلام بشرط أن يكون المنتج بحالته الأصلية.
6. اختصر إجاباتك ولا تجعلها طويلة جداً.
7. لا تتحدث عن أي مواضيع خارج نطاق التجارة الإلكترونية وخدمة عملاء الموقع.`;

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
        
        // Populate default prompt if empty
        if (!currentSettings.ai_system_prompt) {
          currentSettings.ai_system_prompt = DEFAULT_SYSTEM_INSTRUCTION;
        }
        
        setSettings(currentSettings);
      })
      .catch(() => toast.error('فشل تحميل إعدادات المساعد الذكي'))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings((prev) => ({ ...prev, [name]: checked ? 'true' : 'false' }));
    } else {
      setSettings((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      // Filter out undefined values
      const payload = Object.fromEntries(
        Object.entries(settings).filter(([, v]) => v !== undefined && v !== null)
      );
      
      await adminApi.updateSettings(payload);
      toast.success('تم حفظ إعدادات المساعد الذكي بنجاح');
      
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
          <h1 className="page-header__title flex items-center gap-2">
            <Bot className="text-primary" size={28} />
            إعدادات المساعد الذكي
          </h1>
          <p className="page-header__subtitle mt-2">التحكم الكامل في شخصية وردود الذكاء الاصطناعي</p>
        </div>
      </div>

      <div className="card max-w-3xl">
        <form className="card-body" onSubmit={handleSubmit}>
          
          <div className="form-group flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-4 rounded-lg mb-6 border border-gray-200 dark:border-gray-700">
            <input
              type="checkbox"
              id="ai_enabled"
              name="ai_enabled"
              checked={settings.ai_enabled === 'true'}
              onChange={handleChange}
              className="w-5 h-5 text-primary rounded focus:ring-primary cursor-pointer"
            />
            <label htmlFor="ai_enabled" className="form-label mb-0 cursor-pointer text-lg font-medium">
              تفعيل المساعد الذكي للزوار
            </label>
          </div>

          <div className="form-group mb-4">
            <label className="form-label">مفتاح API الخاص بـ Gemini (اختياري)</label>
            <input
              type="password"
              name="ai_api_key"
              className="input"
              placeholder="AIzaSy..."
              value={settings.ai_api_key}
              onChange={handleChange}
              dir="ltr"
            />
            <p className="text-muted mt-1 text-xs">
              إذا تركته فارغاً، سيتم استخدام المفتاح الافتراضي المتوفر في السيرفر (Railway). 
              البيانات المدخلة هنا لها الأولوية.
            </p>
          </div>

          <div className="grid grid-2 gap-4">
            <div className="form-group">
              <label className="form-label">نموذج الذكاء الاصطناعي (Model)</label>
              <select
                name="ai_model"
                className="input"
                value={settings.ai_model}
                onChange={handleChange}
              >
                <option value="gemini-3.7-flash">Gemini 3.7 Flash (سريع ومتوازن)</option>
                <option value="gemini-3.5-flash-lite">Gemini 3.5 Flash Lite (أسرع وأقل تكلفة)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">درجة الإبداع (Temperature)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="1.0"
                name="ai_temperature"
                className="input"
                value={settings.ai_temperature}
                onChange={handleChange}
              />
              <p className="text-muted mt-1 text-xs">
                (رقم بين 0.1 و 1.0) القيمة الأقل تعني ردود دقيقة ومحددة، والأعلى تعني ردود إبداعية. يفضل 0.7.
              </p>
            </div>
          </div>

          <div className="form-group mt-4">
            <label className="form-label font-bold text-lg">تعليمات النظام (System Prompt)</label>
            <p className="text-muted mb-2 text-sm">
              هذه هي التعليمات السرية التي يتم توجيه المساعد الذكي بها قبل أن يتحدث مع العميل. يمكنك تعديلها لتغيير شخصيته بالكامل.
            </p>
            <textarea
              name="ai_system_prompt"
              className="input"
              style={{ minHeight: '300px', lineHeight: '1.6', fontFamily: 'monospace' }}
              value={settings.ai_system_prompt}
              onChange={handleChange}
              dir="rtl"
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
