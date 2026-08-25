import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { motion, AnimatePresence } from 'framer-motion';
import { motionTokens } from '../../lib/motion-tokens';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { ChevronDown } from 'lucide-react';

export default function VendorSubscriptions() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  
  const [salesEstimate, setSalesEstimate] = useState<number>(25000);
  const [isYearly, setIsYearly] = useState<boolean>(false);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const { data: plansData, isLoading: loadingPlans } = useQuery({
    queryKey: ['store-subscription-plans'],
    queryFn: () => api.get<any>('/store/subscription-plans'),
  });

  const { data: currentSub, isLoading: loadingSub } = useQuery({
    queryKey: ['vendor-current-subscription'],
    queryFn: () => api.get<any>('/vendor/subscription/current'),
  });

  const subscribeMutation = useMutation({
    mutationFn: (planId: number) => api.post('/vendor/subscription/subscribe', { planId }),
    onSuccess: (res: any) => {
      addToast(res.message || 'تم بدء عملية الاشتراك بنجاح', 'success');
      if (res.iframeUrl) {
        window.location.href = res.iframeUrl;
      } else {
        queryClient.invalidateQueries({ queryKey: ['vendor-current-subscription'] });
      }
    },
    onError: (err: any) => addToast(err.message || 'حدث خطأ', 'error'),
  });

  // Setup countdown for promo banner
  useEffect(() => {
    // Arbitrary end date for demonstration, in a real app this comes from the promo data
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    
    const timer = setInterval(() => {
      const now = new Date();
      const difference = end.getTime() - now.getTime();
      
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  if (loadingPlans || loadingSub) return (
    <div className="p-6 flex justify-center items-center h-64">
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full"
      />
    </div>
  );

  const activePlanId = currentSub?.data?.planId;
  const plans = plansData?.data || [];
  
  // Find highest commission to use as baseline for savings
  const maxCommission = plans.length > 0 ? Math.max(...plans.map((p: any) => p.commissionRate)) : 0;
  
  // Check if any plan has a promo
  const hasPromo = plans.some((p: any) => parseFloat(p.discountAmount || '0') > 0);

  const faqs = [
    { q: "هل أقدر ألغي الاشتراك في أي وقت؟", a: "أكيد. الإلغاء بيوقف التجديد التلقائي فوراً، وهتفضل مستفيد بكل مميزات باقتك لحد آخر يوم في فترة اشتراكك الحالية." },
    { q: "هل بيانات باقتي ومميزاتها بتتغير فوراً عند الترقية؟", a: "بمجرد إتمام الدفع، النظام بيحدث نسبة عمولتك ومميزاتك في نفس اللحظة عشان تبدأ تستفيد بيها فوراً." },
    { q: "إيه اللي بيحصل لو المبيعات قلّت وأنا مشترك في باقة احترافية؟", a: "أنت دايماً متحكم. لو حسيت إن الباقة مش مناسبة لحجم مبيعاتك الحالي، تقدر ترجع للباقة المجانية بعد انتهاء فترة اشتراكك بدون أي غرامات." },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: motionTokens.stagger }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: motionTokens.duration.base, ease: motionTokens.easing.decelerate } }
  };

  return (
    <div className="max-w-5xl mx-auto pb-12">
      {/* Promo Banner */}
      <AnimatePresence>
        {hasPromo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="bg-brand-900 text-brand-50 mb-8 overflow-hidden rounded-xl shadow-lg relative"
          >
            <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-right relative z-10" style={{ background: 'var(--bg-gradient-mesh)' }}>
              <div>
                <strong className="block text-lg font-bold text-accent-400 mb-1">عرض محدود!</strong>
                <p className="text-sm opacity-90">اشترك الآن واستفد من الخصم الحصري قبل انتهاء العرض.</p>
              </div>
              <div className="flex items-center gap-3 shrink-0" dir="ltr">
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold font-mono bg-black/20 px-3 py-1 rounded-md min-w-[3ch] text-center">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="text-[10px] uppercase mt-1 opacity-70">ساعة</span>
                </div>
                <span className="text-xl font-bold opacity-50">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold font-mono bg-black/20 px-3 py-1 rounded-md min-w-[3ch] text-center">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="text-[10px] uppercase mt-1 opacity-70">دقيقة</span>
                </div>
                <span className="text-xl font-bold opacity-50">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-xl font-bold font-mono bg-black/20 px-3 py-1 rounded-md min-w-[3ch] text-center">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="text-[10px] uppercase mt-1 opacity-70">ثانية</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="text-center mb-12">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 mb-4">
          استثمر في نمو مبيعاتك، <span className="text-brand-500">مش في العمولات</span>
        </h1>
        <p className="text-neutral-500 max-w-2xl mx-auto text-lg">
          اختر الباقة اللي تناسب طموحك. وفّر في العمولات كل ما مبيعاتك زادت، واستمتع بمميزات متقدمة بتكبر معاك.
        </p>
      </div>

      {/* Savings Calculator Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.base }}
        className="card p-6 mb-12 max-w-3xl mx-auto relative overflow-hidden bg-brand-50 border-brand-200"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
          <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 22h20L12 2zm0 3.8l7.2 14.2H4.8L12 5.8z"/>
          </svg>
        </div>
        
        <h3 className="text-xl font-bold mb-6 text-center relative z-10 text-brand-900">
          اكتشف حجم توفيرك الشهري
        </h3>
        
        <div className="mb-8 relative z-10">
          <div className="flex justify-between text-sm font-semibold text-brand-700 mb-2">
            <span>مبيعاتك المتوقعة شهرياً</span>
            <AnimatedNumber value={salesEstimate} format={(v) => Math.round(v).toLocaleString('ar-EG') + ' ج.م'} />
          </div>
          <input 
            type="range" 
            min="0" 
            max="200000" 
            step="5000"
            value={salesEstimate} 
            onChange={(e) => setSalesEstimate(Number(e.target.value))}
            className="w-full h-2 bg-brand-200 rounded-lg appearance-none cursor-pointer accent-brand-500"
            style={{ 
              background: `linear-gradient(to left, var(--brand-500) ${(salesEstimate / 200000) * 100}%, var(--brand-200) ${(salesEstimate / 200000) * 100}%)` 
            }}
          />
          <style>{`
            input[type=range]::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: var(--brand-600);
              cursor: pointer;
              box-shadow: var(--shadow-sm);
              border: 2px solid white;
            }
            input[type=range]::-moz-range-thumb {
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: var(--brand-600);
              cursor: pointer;
              box-shadow: var(--shadow-sm);
              border: 2px solid white;
            }
          `}</style>
          <div className="flex justify-between text-xs text-neutral-400 mt-2">
            <span>0 ج.م</span>
            <span>+200,000 ج.م</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 relative z-10">
          {plans.slice(1, 3).map((plan: any) => {
            const savingsPercent = maxCommission - plan.commissionRate;
            const savingsValue = (salesEstimate * savingsPercent) / 100;
            return (
              <div key={plan.id} className="bg-white p-4 rounded-xl shadow-sm text-center border border-neutral-100">
                <div className="text-sm text-neutral-500 mb-1">توفير عمولات في "{plan.name}"</div>
                <div className="text-2xl font-bold text-success-600 flex items-center justify-center gap-1">
                  + <AnimatedNumber value={savingsValue} /> <span className="text-sm font-normal">ج.م</span>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Monthly/Yearly Toggle */}
      <div className="flex justify-center items-center gap-3 mb-10">
        <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-brand-900' : 'text-neutral-400'}`}>شهري</span>
        <button 
          className="relative w-14 h-8 bg-brand-100 rounded-full p-1 cursor-pointer transition-colors"
          style={{ background: isYearly ? 'var(--brand-500)' : 'var(--neutral-300)' }}
          onClick={() => setIsYearly(!isYearly)}
          aria-label="تبديل الدفع السنوي"
        >
          <motion.div 
            className="w-6 h-6 bg-white rounded-full shadow-sm"
            animate={{ x: isYearly ? -24 : 0 }}
            transition={motionTokens.easing.spring}
          />
        </button>
        <span className={`text-sm font-medium transition-colors flex items-center gap-2 ${isYearly ? 'text-brand-900' : 'text-neutral-400'}`}>
          سنوي
          <span className="text-xs bg-accent-100 text-accent-600 px-2 py-0.5 rounded-full font-bold" style={{ backgroundColor: 'var(--accent-light)' }}>
            وفر شهرين
          </span>
        </span>
      </div>

      {/* Pricing Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-6 items-end mb-16" 
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}
      >
        {plans?.map((plan: any, index: number) => {
          const isCurrent = activePlanId === plan.id;
          const isRecommended = index === 1; // Assume middle plan is recommended
          const originalPrice = parseFloat(plan.priceMonthly);
          const currentMonthly = hasPromo ? Math.max(0, originalPrice - parseFloat(plan.discountAmount || '0')) : originalPrice;
          
          // Yearly calculation logic (10 months instead of 12 for standard discount)
          const displayedPrice = isYearly ? currentMonthly * 10 : currentMonthly;
          
          return (
            <motion.div 
              key={plan.id} 
              variants={itemVariants}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className={`bg-white rounded-2xl relative flex flex-col overflow-hidden transition-shadow ${isRecommended ? 'z-10' : 'z-0'}`}
              style={{
                border: isRecommended ? '2px solid var(--brand-400)' : '1px solid var(--border-color)',
                boxShadow: isRecommended ? '0 12px 32px -8px rgba(201, 95, 52, 0.2)' : 'var(--shadow-sm)',
                transform: isRecommended ? 'translateY(-12px)' : 'none',
                minHeight: isRecommended ? '105%' : '100%',
              }}
            >
              {isCurrent && (
                <div className="absolute top-0 right-0 bg-neutral-900 text-white px-4 py-1.5 rounded-bl-xl text-xs font-semibold z-20 shadow-sm">
                  باقتك الحالية
                </div>
              )}
              
              <div className="p-6 md:p-8 flex flex-col flex-1 relative z-10">
                <div className="mb-6">
                  <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                  <p className="text-neutral-500 text-sm h-10">{plan.description || (isRecommended ? 'المعادلة المثالية بين المبيعات العالية والعمولة المنخفضة.' : 'الأفضل للبدء واختبار السوق.')}</p>
                </div>
                
                {/* Commission as the primary metric */}
                <div className="mb-8 p-4 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-brand-900">عمولة المبيعات</span>
                  <div className="text-3xl font-bold text-brand-600 tracking-tighter">
                    {plan.commissionRate}<span className="text-xl">%</span>
                  </div>
                </div>
                
                {/* Secondary metric: Price */}
                <div className="mb-8">
                  {originalPrice === 0 ? (
                    <span className="text-3xl font-bold text-neutral-900">مجاناً للأبد</span>
                  ) : (
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-neutral-900 tracking-tighter">
                        <AnimatedNumber value={displayedPrice} />
                      </span>
                      <span className="text-neutral-500 font-medium">
                        ج.م / {isYearly ? 'سنوياً' : 'شهرياً'}
                      </span>
                    </div>
                  )}
                  {hasPromo && !isYearly && originalPrice > 0 && (
                    <div className="text-sm text-neutral-400 line-through mt-1">{originalPrice} ج.م قبل الخصم</div>
                  )}
                  {isYearly && originalPrice > 0 && (
                    <div className="text-sm text-success-600 font-medium mt-1">توفير {currentMonthly * 2} ج.م بالدفع السنوي</div>
                  )}
                </div>
                
                <div className="space-y-4 mb-8 flex-1 text-sm text-neutral-600">
                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 shrink-0" />
                    <span>رفع حتى <strong>{plan.productLimit ? `${plan.productLimit} منتج` : 'عدد غير محدود من المنتجات'}</strong></span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 shrink-0" />
                    <span>إضافة <strong>{plan.imageLimitPerProduct} صور</strong> لكل منتج</span>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 shrink-0" />
                    <span>تحويل الأرباح كل <strong>{plan.payoutCycleDays} أيام</strong></span>
                  </div>
                  {plan.autoShippingEnabled && (
                    <div className="flex gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-brand-400 mt-2 shrink-0" />
                      <span>ربط آلي مع شركات الشحن</span>
                    </div>
                  )}
                </div>
                
                <button 
                  className={`btn w-full justify-center h-12 text-base transition-all ${
                    isCurrent 
                      ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed border-transparent' 
                      : isRecommended 
                        ? 'btn-primary shadow-lg shadow-brand-500/20' 
                        : 'bg-white border-2 border-brand-200 text-brand-700 hover:border-brand-500'
                  }`}
                  disabled={isCurrent || subscribeMutation.isPending}
                  onClick={() => {
                    if (window.confirm(`هل أنت متأكد من الاشتراك في باقة ${plan.name} بـ ${displayedPrice} ج.م ${isYearly ? 'سنوياً' : 'شهرياً'}؟`)) {
                      subscribeMutation.mutate(plan.id);
                    }
                  }}
                >
                  {subscribeMutation.isPending ? 'جاري التحويل...' : isCurrent ? 'باقتك الحالية' : (originalPrice === 0 ? 'ابدأ مجاناً' : 'اشترك الآن')}
                </button>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Contextual Section */}
      <div className="card bg-white p-8 md:p-12 mb-16 text-center max-w-4xl mx-auto border-neutral-200 shadow-sm">
        <h2 className="text-2xl font-bold mb-4">ليه نسبة العمولة أهم من أي ميزة تانية؟</h2>
        <p className="text-neutral-600 text-lg leading-relaxed mx-auto">
          الاشتراك الشهري هو تكلفة ثابتة، لكن العمولة بتكبر مع كل مبيعة. لما تختار باقة بعمولة أقل، أنت بتضمن إن مكسبك من كل أوردر بيكبر. في التجارة الإلكترونية، <strong>كل 1% توفير في العمولة بيعني آلاف الجنيهات أرباح صافية</strong> ليك آخر السنة. إحنا صممنا الباقات عشان تكون شريك في نجاحك، مش عبء عليك.
        </p>
      </div>

      {/* FAQ Section */}
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-bold mb-8 text-center">أسئلة شائعة</h2>
        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className={`border rounded-xl transition-colors duration-300 ${expandedFaq === idx ? 'border-brand-300 bg-brand-50/30' : 'border-neutral-200 bg-white hover:border-brand-200'}`}
            >
              <button 
                className="w-full flex items-center justify-between p-5 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-xl"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                <span className="font-semibold text-neutral-800">{faq.q}</span>
                <motion.div
                  animate={{ rotate: expandedFaq === idx ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  className="text-brand-500"
                >
                  <ChevronDown size={20} />
                </motion.div>
              </button>
              <AnimatePresence initial={false}>
                {expandedFaq === idx && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <div className="p-5 pt-0 text-neutral-600 leading-relaxed border-t border-brand-100/50 mt-2">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
