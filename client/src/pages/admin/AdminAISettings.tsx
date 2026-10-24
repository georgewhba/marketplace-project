import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../../api';
import { useToast } from '../../toast';
import { Save, Bot, Cpu, MessageSquare } from 'lucide-react';

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
    adminApi
      .getSettings()
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
      setSettings(prev => ({ ...prev, [name]: checked ? 'true' : 'false' }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
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

  if (loading) {
    return (
      <div className="grid grid-2">
        {[1, 2].map(i => (
          <div key={i} className="skeleton" style={{ height: 360 }} />
        ))}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="page-header mb-6">
        <div className="flex items-center gap-3">
          <div className="feature-card__icon">
            <Bot size={22} />
          </div>
          <div>
            <h1 className="page-header__title" style={{ marginBottom: 2 }}>إعدادات المساعد الذكي</h1>
            <p className="page-header__subtitle">التحكم الكامل في نموذج الذكاء الاصطناعي، درجة الإبداع، وتعليمات خدمة العملاء</p>
          </div>
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <div className="spinner" /> : <Save size={18} />}
          {saving ? 'جاري الحفظ...' : 'حفظ الإعدادات'}
        </button>
      </div>

      <div className="grid grid-2">
        {/* Column 1: Model & API Configuration */}
        <div className="card card-body">
          <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="feature-card__icon" style={{ width: 38, height: 38 }}>
              <Cpu size={18} />
            </div>
            <div>
              <h3 className="text-primary" style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700 }}>
                إعدادات النموذج والاتصال
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                تفعيل المساعد واختيار نموذج Gemini ومفتاح الربط
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <label
              htmlFor="ai_enabled"
              className="flex items-center gap-3 p-4 rounded-lg"
              style={{
                background: settings.ai_enabled === 'true' ? 'var(--brand-50)' : 'var(--bg-surface-2)',
                border: settings.ai_enabled === 'true' ? '1.5px solid var(--brand-500)' : '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                id="ai_enabled"
                name="ai_enabled"
                checked={settings.ai_enabled === 'true'}
                onChange={handleChange}
                style={{ width: 20, height: 20 }}
              />
              <div>
                <div className="text-primary" style={{ fontWeight: 700, fontSize: 'var(--font-size-base)' }}>
                  تفعيل المساعد الذكي للزوار والعملاء
                </div>
                <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>
                  إظهار أيقونة المحادثة الذكية في أسفل صفحات المتجر
                </div>
              </div>
            </label>

            <div className="form-group">
              <label className="form-label">نموذج الذكاء الاصطناعي (Model)</label>
              <select
                name="ai_model"
                className="form-select"
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
                className="form-input"
                value={settings.ai_temperature}
                onChange={handleChange}
              />
              <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                (رقم بين 0.1 و 1.0) القيمة الأقل تعني ردوداً دقيقة ومحددة، والأعلى تعني ردوداً إبداعية. يفضل 0.7.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">مفتاح API الخاص بـ Gemini (اختياري)</label>
              <input
                type="password"
                name="ai_api_key"
                className="form-input"
                placeholder="AIzaSy..."
                value={settings.ai_api_key}
                onChange={handleChange}
                dir="ltr"
              />
              <p className="text-muted" style={{ fontSize: 'var(--font-size-xs)', marginTop: 4 }}>
                إذا تركته فارغاً، سيتم استخدام المفتاح الافتراضي المتوفر في السيرفر.
              </p>
            </div>
          </div>
        </div>

        {/* Column 2: System Prompt Instructions */}
        <div className="card card-body flex flex-col">
          <div className="flex items-center gap-3 mb-5 pb-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
            <div className="feature-card__icon" style={{ width: 38, height: 38 }}>
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 className="text-primary" style={{ margin: 0, fontSize: 'var(--font-size-md)', fontWeight: 700 }}>
                تعليمات النظام (System Prompt)
              </h3>
              <p className="text-muted" style={{ margin: 0, fontSize: 'var(--font-size-xs)' }}>
                التوجيهات السرية التي تحدد شخصية المساعد الذكي وحدود إجاباته
              </p>
            </div>
          </div>

          <div className="form-group flex-1 flex flex-col">
            <textarea
              name="ai_system_prompt"
              className="form-textarea flex-1"
              style={{ minHeight: 280, lineHeight: 1.75 }}
              value={settings.ai_system_prompt}
              onChange={handleChange}
              dir="rtl"
            />
          </div>
        </div>
      </div>
    </form>
  );
}
