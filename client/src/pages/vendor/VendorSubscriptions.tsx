import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api';
import { useToast } from '../../toast';
import { motion, AnimatePresence } from 'framer-motion';
import { motionTokens } from '../../lib/motion-tokens';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { ChevronDown } from 'lucide-react';
import './VendorSubscriptions.css';

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

  useEffect(() => {
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
    <div className="page-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <motion.div 
        animate={{ rotate: 360 }} 
        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        style={{ width: 32, height: 32, border: '4px solid var(--brand-200)', borderTopColor: 'var(--brand-500)', borderRadius: '50%' }}
      />
    </div>
  );

  const activePlanId = currentSub?.data?.planId;
  const plans = plansData?.data || [];
  
  const maxCommission = plans.length > 0 ? Math.max(...plans.map((p: any) => p.commissionRate)) : 0;
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
    <div className="subs-container">
      {/* Promo Banner */}
      <AnimatePresence>
        {hasPromo && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="subs-promo"
          >
            <div className="subs-promo-inner">
              <div className="subs-promo-text">
                <strong>عرض محدود!</strong>
                <p>اشترك الآن واستفد من الخصم الحصري قبل انتهاء العرض.</p>
              </div>
              <div className="subs-promo-timer">
                <div className="subs-timer-box">
                  <span className="subs-timer-num">{String(timeLeft.hours).padStart(2, '0')}</span>
                  <span className="subs-timer-label">ساعة</span>
                </div>
                <span style={{ fontSize: 'var(--font-size-xl)', opacity: 0.5 }}>:</span>
                <div className="subs-timer-box">
                  <span className="subs-timer-num">{String(timeLeft.minutes).padStart(2, '0')}</span>
                  <span className="subs-timer-label">دقيقة</span>
                </div>
                <span style={{ fontSize: 'var(--font-size-xl)', opacity: 0.5 }}>:</span>
                <div className="subs-timer-box">
                  <span className="subs-timer-num">{String(timeLeft.seconds).padStart(2, '0')}</span>
                  <span className="subs-timer-label">ثانية</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="subs-header">
        <h1>
          استثمر في نمو مبيعاتك، <span>مش في العمولات</span>
        </h1>
        <p>
          اختر الباقة اللي تناسب طموحك. وفّر في العمولات كل ما مبيعاتك زادت، واستمتع بمميزات متقدمة بتكبر معاك.
        </p>
      </div>

      {/* Savings Calculator Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: motionTokens.duration.base }}
        className="subs-calc"
      >
        <h3 className="subs-calc-title">
          اكتشف حجم توفيرك الشهري
        </h3>
        
        <div className="subs-calc-slider-wrap">
          <div className="subs-calc-slider-header">
            <span>مبيعاتك المتوقعة شهرياً</span>
            <span className="value">
              <AnimatedNumber value={salesEstimate} format={(v) => Math.round(v).toLocaleString('ar-EG') + ' ج.م'} />
            </span>
          </div>
          <input 
            type="range" 
            min="0" 
            max="200000" 
            step="5000"
            value={salesEstimate} 
            onChange={(e) => setSalesEstimate(Number(e.target.value))}
            className="subs-calc-slider"
            style={{ 
              background: `linear-gradient(to left, var(--brand-500) ${(salesEstimate / 200000) * 100}%, var(--brand-200) ${(salesEstimate / 200000) * 100}%)` 
            }}
          />
          <div className="subs-calc-slider-labels">
            <span>0 ج.م</span>
            <span>+200,000 ج.م</span>
          </div>
        </div>

        <div className="subs-calc-results">
          {plans.slice(1, 3).map((plan: any) => {
            const savingsPercent = maxCommission - plan.commissionRate;
            const savingsValue = (salesEstimate * savingsPercent) / 100;
            return (
              <div key={plan.id} className="subs-calc-result-box">
                <div className="subs-calc-result-label">توفير عمولات في "{plan.name}"</div>
                <div className="subs-calc-result-value">
                  + <AnimatedNumber value={savingsValue} /> <small>ج.م</small>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Monthly/Yearly Toggle */}
      <div className="subs-toggle">
        <span className={`subs-toggle-label ${!isYearly ? 'active' : ''}`}>شهري</span>
        <button 
          className={`subs-toggle-btn ${isYearly ? 'active' : ''}`}
          onClick={() => setIsYearly(!isYearly)}
          aria-label="تبديل الدفع السنوي"
        >
          <motion.div 
            className="subs-toggle-thumb"
            animate={{ x: isYearly ? -32 : 0 }}
            transition={motionTokens.easing.spring}
          />
        </button>
        <span className={`subs-toggle-label ${isYearly ? 'active' : ''}`}>
          سنوي
          <span className="subs-toggle-badge">وفر شهرين</span>
        </span>
      </div>

      {/* Pricing Cards */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="subs-cards"
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
              className={`subs-card ${isRecommended ? 'recommended' : ''}`}
            >
              {isCurrent && (
                <div className="subs-card-badge-current">
                  باقتك الحالية
                </div>
              )}
              
              <div className="subs-card-title">{plan.name}</div>
              <p className="subs-card-desc">
                {plan.description || (isRecommended ? 'المعادلة المثالية بين المبيعات العالية والعمولة المنخفضة.' : 'الأفضل للبدء واختبار السوق.')}
              </p>
              
              {/* Commission as the primary metric */}
              <div className="subs-card-commission">
                <span>عمولة المبيعات</span>
                <strong>
                  {plan.commissionRate}<small>%</small>
                </strong>
              </div>
              
              {/* Secondary metric: Price */}
              <div className="subs-card-price-wrap">
                {originalPrice === 0 ? (
                  <div className="subs-card-price">مجاناً للأبد</div>
                ) : (
                  <>
                    <div className="subs-card-price">
                      <AnimatedNumber value={displayedPrice} />
                      <span className="subs-card-price-period">ج.م / {isYearly ? 'سنوياً' : 'شهرياً'}</span>
                    </div>
                    {hasPromo && !isYearly && originalPrice > 0 && (
                      <div className="subs-card-price-old">{originalPrice} ج.م قبل الخصم</div>
                    )}
                    {isYearly && originalPrice > 0 && (
                      <div className="subs-card-price-save">توفير {currentMonthly * 2} ج.م بالدفع السنوي</div>
                    )}
                  </>
                )}
              </div>
              
              <div className="subs-card-features">
                <div className="subs-card-feature">
                  <div className="subs-card-feature-dot" />
                  <span>رفع حتى <strong>{plan.productLimit ? `${plan.productLimit} منتج` : 'عدد غير محدود من المنتجات'}</strong></span>
                </div>
                <div className="subs-card-feature">
                  <div className="subs-card-feature-dot" />
                  <span>إضافة <strong>{plan.imageLimitPerProduct} صور</strong> لكل منتج</span>
                </div>
                <div className="subs-card-feature">
                  <div className="subs-card-feature-dot" />
                  <span>تحويل الأرباح كل <strong>{plan.payoutCycleDays} أيام</strong></span>
                </div>
                {plan.autoShippingEnabled && (
                  <div className="subs-card-feature">
                    <div className="subs-card-feature-dot" />
                    <span>ربط آلي مع شركات الشحن</span>
                  </div>
                )}
              </div>
              
              <button 
                className={`btn subs-card-btn ${isCurrent ? 'btn-ghost' : isRecommended ? 'btn-primary' : 'btn-secondary'}`}
                disabled={isCurrent || subscribeMutation.isPending}
                onClick={() => {
                  if (window.confirm(`هل أنت متأكد من الاشتراك في باقة ${plan.name} بـ ${displayedPrice} ج.م ${isYearly ? 'سنوياً' : 'شهرياً'}؟`)) {
                    subscribeMutation.mutate(plan.id);
                  }
                }}
              >
                {subscribeMutation.isPending ? 'جاري التحويل...' : isCurrent ? 'باقتك الحالية' : (originalPrice === 0 ? 'ابدأ مجاناً' : 'اشترك الآن')}
              </button>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Contextual Section */}
      <div className="subs-context">
        <h2>ليه نسبة العمولة أهم من أي ميزة تانية؟</h2>
        <p>
          الاشتراك الشهري هو تكلفة ثابتة، لكن العمولة بتكبر مع كل مبيعة. لما تختار باقة بعمولة أقل، أنت بتضمن إن مكسبك من كل أوردر بيكبر. في التجارة الإلكترونية، <strong>كل 1% توفير في العمولة بيعني آلاف الجنيهات أرباح صافية</strong> ليك آخر السنة. إحنا صممنا الباقات عشان تكون شريك في نجاحك، مش عبء عليك.
        </p>
      </div>

      {/* FAQ Section */}
      <div className="subs-faq">
        <h2>أسئلة شائعة</h2>
        <div className="subs-faq-list">
          {faqs.map((faq, idx) => (
            <div key={idx} className={`subs-faq-item ${expandedFaq === idx ? 'active' : ''}`}>
              <button 
                className="subs-faq-btn"
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
              >
                <span>{faq.q}</span>
                <motion.div
                  animate={{ rotate: expandedFaq === idx ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  style={{ color: 'var(--brand-500)' }}
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
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="subs-faq-answer">
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
