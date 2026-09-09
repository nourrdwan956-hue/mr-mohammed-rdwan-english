// app/(auth)/register/3/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { toast } from 'react-hot-toast';

// ================================================================
// 1. خلفية الجسيمات (محسّنة)
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
// 2. شريط التقدم (مصغر على الهواتف)
// ================================================================
const ProgressBar = ({ currentStep, totalSteps = 5 }) => {
  const progress = (currentStep / totalSteps) * 100;
  return (
    <div className="w-full h-1 sm:h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-4 sm:mb-6">
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
// 3. نصائح ذكية (مصغرة على الهواتف)
// ================================================================
const SmartTips = ({ tips }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % tips.length), 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 dark:from-yellow-400/10 dark:to-yellow-600/5 border border-yellow-400/20 text-sm text-gray-700 dark:text-gray-300 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-400/10 cursor-pointer">
      <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-xl bg-yellow-400/20 dark:bg-yellow-400/20">
        <Icons.Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 dark:text-yellow-400" />
      </div>
      <div>
        <p className="text-[10px] sm:text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-0.5">💡 نصيحة ذكية</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-xs sm:text-sm leading-relaxed"
          >
            {tips[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ================================================================
// 4. حقل الإدخال المحسّن (متجاوب + Select)
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
  options = [],
  isSelect = false,
  maxLength,
}) => {
  const { styles } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const hasError = error && isTouched;

  return (
    <div>
      <label className={`block text-xs sm:text-sm font-medium ${styles.label} mb-1 sm:mb-1.5`} htmlFor={name}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative group">
        {Icon && (
          <div className={`absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 transition-all duration-300 z-10 ${
            isFocused ? 'text-yellow-400 scale-110' : 'text-gray-400'
          }`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
        {isSelect ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            className={`w-full p-2.5 sm:p-3 ${Icon ? 'pr-9 sm:pr-11' : 'pr-3 sm:pr-4'} ${styles.input} border ${
              hasError ? 'border-red-400' : isFocused ? 'border-yellow-400 shadow-lg shadow-yellow-400/10' : 'border-gray-200 dark:border-white/20'
            } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition-all duration-300 appearance-none text-sm sm:text-base`}
          >
            <option value="" className="bg-gray-50 dark:bg-[#0b0e1a] text-gray-400 dark:text-gray-400">
              {placeholder || 'اختر...'}
            </option>
            {options.map((opt) => (
              <option 
                key={opt} 
                value={opt} 
                className="bg-white dark:bg-[#0b0e1a] text-gray-900 dark:text-white py-2"
              >
                {opt}
              </option>
            ))}
          </select>
        ) : (
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
            className={`w-full p-2.5 sm:p-3 ${Icon ? 'pr-9 sm:pr-11' : 'pr-3 sm:pr-4'} ${styles.input} border ${
              hasError ? 'border-red-400' : isFocused ? 'border-yellow-400 shadow-lg shadow-yellow-400/10' : 'border-gray-200 dark:border-white/20'
            } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm sm:text-base`}
          />
        )}
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
            className="text-red-400 text-[10px] sm:text-xs mt-0.5 sm:mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// 5. الصفحة الرئيسية – الخطوة الثالثة (متجاوبة)
// ================================================================
export default function RegisterStep3() {
  const router = useRouter();
  const { theme, styles } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  const [formData, setFormData] = useState({
    school: '',
    grade: '',
    governorate: '',
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // بيانات المحافظات والصفوف
  const governorates = [
    'القاهرة', 'الإسكندرية', 'الجيزة', 'الشرقية', 'الدقهلية', 'المنوفية',
    'القليوبية', 'كفر الشيخ', 'الغربية', 'الأقصر', 'أسوان', 'أسيوط',
    'البحيرة', 'بني سويف', 'جنوب سيناء', 'دمياط', 'سوهاج', 'قنا',
    'مطروح', 'المنيا', 'الإسماعيلية', 'السويس', 'بورسعيد', 'شمال سيناء',
    'الفيوم', 'البحر الأحمر', 'الوادي الجديد',
  ];

  const grades = [
    'الصف الأول الابتدائي', 'الصف الثاني الابتدائي', 'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي', 'الصف الخامس الابتدائي', 'الصف السادس الابتدائي',
    'الصف الأول الإعدادي', 'الصف الثاني الإعدادي', 'الصف الثالث الإعدادي',
    'الصف الأول الثانوي', 'الصف الثاني الثانوي', 'الصف الثالث الثانوي',
  ];

  // نصائح ذكية
  const tips = [
    'اختر المدرسة التي تدرس فيها حالياً',
    'حدد صفك الدراسي بدقة لظهور المحتوى المناسب لك',
    'المحافظة تساعد في تحديد الفعاليات القريبة منك',
    'يمكنك تحديث هذه البيانات لاحقاً من الملف الشخصي',
    'جميع البيانات محمية ولا تُشارك مع أي طرف ثالث',
  ];

  // التحقق من وجود بيانات الخطوات السابقة
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('registerData');
        if (!saved) {
          router.replace('/register');
          return;
        }
        
        const parsed = JSON.parse(saved);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.school.trim()) newErrors.school = 'اسم المدرسة مطلوب';
    if (!formData.grade.trim()) newErrors.grade = 'الصف الدراسي مطلوب';
    if (!formData.governorate.trim()) newErrors.governorate = 'المحافظة مطلوبة';
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
        ...formData,
      }));
      toast.success('✅ تم حفظ البيانات التعليمية');
      await new Promise((resolve) => setTimeout(resolve, 400));
      router.push('/register/4');
    } catch (err) {
      toast.error('❌ حدث خطأ، يرجى المحاولة مرة أخرى');
    } finally {
      setIsSubmitting(false);
    }
  };

  // عرض حالة التحميل
  if (isLoading) {
    return (
      <div className={`min-h-screen w-full ${styles.bg} ${styles.text} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className={`text-xs sm:text-sm ${styles.subtext}`}>جاري التحقق من البيانات...</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return null;
  }

  return (
    <div key={theme} className={`min-h-screen w-full ${styles.bg} ${styles.text} relative overflow-hidden flex items-center justify-center p-3 sm:p-4`}>
      <ParticleBackground theme={theme} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* العنوان */}
        <div className="text-center mb-4 sm:mb-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex p-2.5 sm:p-3 rounded-2xl bg-yellow-400/10 dark:bg-yellow-400/10 mb-2 sm:mb-3"
          >
            <Icons.School className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 dark:text-yellow-400" />
          </motion.div>
          <h2 className={`text-xl sm:text-2xl font-bold ${styles.text}`}>البيانات التعليمية</h2>
          <p className={`text-xs sm:text-sm ${styles.subtext} mt-0.5 sm:mt-1`}>أدخل معلومات مدرستك وصفك الدراسي</p>
        </div>

        <ProgressBar currentStep={3} totalSteps={5} />

        <div className={`${styles.card} border ${styles.border} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all duration-500`}>
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <FormInput
              name="school"
              label="اسم المدرسة"
              type="text"
              value={formData.school}
              onChange={handleChange}
              error={errors.school}
              placeholder="مدرسة ... الثانوية"
              icon={Icons.Building}
              required
            />

            <FormInput
              name="grade"
              label="الصف الدراسي"
              value={formData.grade}
              onChange={handleChange}
              error={errors.grade}
              placeholder="اختر الصف الدراسي..."
              icon={Icons.BookOpen}
              options={grades}
              isSelect
              required
            />

            <FormInput
              name="governorate"
              label="المحافظة"
              value={formData.governorate}
              onChange={handleChange}
              error={errors.governorate}
              placeholder="اختر المحافظة..."
              icon={Icons.MapPin}
              options={governorates}
              isSelect
              required
            />

            <SmartTips tips={tips} />

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2">
              <button
                type="button"
                onClick={() => router.push('/register/2')}
                className="order-2 sm:order-1 w-full sm:flex-1 py-3 sm:py-3.5 bg-white/10 dark:bg-white/5 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
              >
                <Icons.ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>السابق</span>
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="order-1 sm:order-2 w-full sm:flex-1 py-3 sm:py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <span>التالي</span>
                    <Icons.ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={() => router.push('/register/2')}
              className="text-yellow-600 dark:text-yellow-400 hover:underline font-medium transition-colors"
            >
              العودة إلى الخطوة السابقة
            </button>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          <span>🔒 جميع البيانات مشفرة • خطوة 3 من 5</span>
        </div>
      </motion.div>
    </div>
  );
}