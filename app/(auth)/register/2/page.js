// app/(auth)/register/2/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { toast } from 'react-hot-toast';

// ================================================================
// 1. خلفية الجسيمات
// ================================================================
const ParticleBackground = ({ theme }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const particleCount = 80;
    const colors = theme === 'dark' 
      ? ['rgba(255, 215, 0, 0.12)', 'rgba(255, 200, 0, 0.08)', 'rgba(255, 180, 0, 0.04)']
      : ['rgba(200, 180, 0, 0.06)', 'rgba(180, 160, 0, 0.04)', 'rgba(150, 130, 0, 0.02)'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.pulse += p.pulseSpeed;
        if (p.x < 0 || p.x > width) p.dx *= -1;
        if (p.y < 0 || p.y > height) p.dy *= -1;
        const r = p.radius + Math.sin(p.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        particles.forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = 0.05 * (1 - dist / 120);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = theme === 'dark' 
              ? `rgba(255, 215, 0, ${alpha})` 
              : `rgba(200, 180, 0, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ================================================================
// 2. شريط التقدم
// ================================================================
const ProgressBar = ({ currentStep, totalSteps = 5 }) => {
  const progress = (currentStep / totalSteps) * 100;
  return (
    <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-6">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
      />
    </div>
  );
};

// ================================================================
// 3. نصائح ذكية
// ================================================================
const SmartTips = ({ tips }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % tips.length), 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="flex items-start gap-3 p-4 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 dark:from-yellow-400/10 dark:to-yellow-600/5 border border-yellow-400/20 text-sm text-gray-700 dark:text-gray-300 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-400/10 cursor-pointer">
      <div className="flex-shrink-0 p-2 rounded-xl bg-yellow-400/20 dark:bg-yellow-400/20">
        <Icons.Lightbulb className="h-5 w-5 text-yellow-500 dark:text-yellow-400" />
      </div>
      <div>
        <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-0.5">💡 نصيحة ذكية</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-sm leading-relaxed"
          >
            {tips[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ================================================================
// 4. حقل الإدخال المحسّن
// ================================================================
const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  icon: Icon,
  required = false,
  maxLength,
}) => {
  const { styles } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const hasError = error && isTouched;

  return (
    <div>
      <label className={`block text-sm font-medium ${styles.label} mb-1.5`} htmlFor={name}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative group">
        {Icon && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${
            isFocused ? 'text-yellow-400 scale-110' : 'text-gray-400'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <input
          id={name}
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => { setIsFocused(false); setIsTouched(true); }}
          placeholder={placeholder}
          maxLength={maxLength}
          className={`w-full p-3 ${Icon ? 'pr-11' : 'pr-4'} ${styles.input} border ${
            hasError ? 'border-red-400' : isFocused ? 'border-yellow-400 shadow-lg shadow-yellow-400/10' : 'border-gray-200 dark:border-white/20'
          } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
        />
        {isFocused && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transform scale-x-0 origin-right transition-transform duration-300 group-focus-within:scale-x-100" />
        )}
      </div>
      <AnimatePresence>
        {hasError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-red-400 text-xs mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// 5. الصفحة الرئيسية – الخطوة الثانية (مع حل المشكلة)
// ================================================================
export default function RegisterStep2() {
  const router = useRouter();
  const { theme, styles } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  const [formData, setFormData] = useState({
    phone: '',
    parentPhone: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ التحقق من وجود بيانات الخطوة السابقة (محسّن)
  useEffect(() => {
    // تأخير بسيط للتأكد من أن localStorage جاهز
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('registerData');
        if (!saved) {
          router.replace('/register');
          return;
        }
        
        // محاولة تحليل البيانات
        const parsed = JSON.parse(saved);
        // التأكد من وجود البيانات الأساسية
        if (!parsed.firstName || !parsed.email) {
          router.replace('/register');
          return;
        }
        
        setHasData(true);
        setIsLoading(false);
      } catch (err) {
        console.error('Error checking registration data:', err);
        router.replace('/register');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [router]);

  // نصائح ذكية
  const tips = [
    'استخدم رقم هاتف صحيحاً لتلقي إشعارات المنصة',
    'رقم ولي الأمر مهم للتواصل في الحالات الطارئة',
    'تأكد من أن الرقمين مختلفين لتسهيل التواصل',
    'يمكنك تغيير هذه البيانات لاحقاً من الملف الشخصي',
    'جميع البيانات محمية ولا تُشارك مع أي طرف ثالث',
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const numeric = value.replace(/[^0-9]/g, '');
    setFormData({ ...formData, [name]: numeric });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    const phoneRegex = /^01[0-9]{9}$/;

    if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'رقم الهاتف يجب أن يكون 11 رقماً ويبدأ بـ 01';
    }
    if (!phoneRegex.test(formData.parentPhone)) {
      newErrors.parentPhone = 'رقم ولي الأمر يجب أن يكون 11 رقماً ويبدأ بـ 01';
    }
    if (formData.phone === formData.parentPhone && formData.phone.length === 11) {
      newErrors.parentPhone = 'رقم هاتفك ورقم ولي الأمر يجب أن يكونا مختلفين';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const saved = JSON.parse(localStorage.getItem('registerData') || '{}');
      localStorage.setItem('registerData', JSON.stringify({
        ...saved,
        phone: formData.phone,
        parentPhone: formData.parentPhone,
      }));
      toast.success('✅ تم حفظ بيانات التواصل');
      await new Promise((resolve) => setTimeout(resolve, 400));
      router.push('/register/3');
    } catch (err) {
      toast.error('❌ حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ عرض حالة التحميل
  if (isLoading) {
    return (
      <div className={`min-h-screen w-full ${styles.bg} ${styles.text} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className={`text-sm ${styles.subtext}`}>جاري التحقق من البيانات...</p>
        </div>
      </div>
    );
  }

  // ✅ إذا لم توجد بيانات، لا نعرض شيئاً (سيتم التوجيه تلقائياً)
  if (!hasData) {
    return null;
  }

  return (
    <div key={theme} className={`min-h-screen w-full ${styles.bg} ${styles.text} relative overflow-hidden flex items-center justify-center p-4`}>
      <ParticleBackground theme={theme} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* العنوان */}
        <div className="text-center mb-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex p-3 rounded-2xl bg-yellow-400/10 dark:bg-yellow-400/10 mb-3"
          >
            <Icons.Phone className="h-8 w-8 text-yellow-500 dark:text-yellow-400" />
          </motion.div>
          <h2 className={`text-2xl font-bold ${styles.text}`}>بيانات التواصل</h2>
          <p className={`text-sm ${styles.subtext} mt-1`}>أدخل أرقام التواصل الخاصة بك وولي أمرك</p>
        </div>

        <ProgressBar currentStep={2} totalSteps={5} />

        <div className={`${styles.card} border ${styles.border} rounded-3xl p-8 shadow-2xl backdrop-blur-xl transition-all duration-500`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormInput
              name="phone"
              label="رقم هاتفك"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              error={errors.phone}
              placeholder="٠١٢٣٤٥٦٧٨٩"
              icon={Icons.Phone}
              required
              maxLength={11}
            />

            <FormInput
              name="parentPhone"
              label="رقم هاتف ولي الأمر"
              type="tel"
              value={formData.parentPhone}
              onChange={handleChange}
              error={errors.parentPhone}
              placeholder="٠١٢٣٤٥٦٧٨٩"
              icon={Icons.Users}
              required
              maxLength={11}
            />

            <SmartTips tips={tips} />

            <div className="flex gap-4 pt-2">
              <button
                type="button"
                onClick={() => router.push('/register')}
                className="flex-1 py-3.5 bg-white/10 dark:bg-white/5 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2"
              >
                <Icons.ArrowRight className="h-5 w-5" />
                <span>السابق</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <span>التالي</span>
                    <Icons.ArrowLeft className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={() => router.push('/register')}
              className="text-yellow-600 dark:text-yellow-400 hover:underline font-medium transition-colors"
            >
              العودة إلى الخطوة السابقة
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          <span>🔒 جميع البيانات مشفرة • خطوة 2 من 5</span>
        </div>
      </motion.div>
    </div>
  );
}