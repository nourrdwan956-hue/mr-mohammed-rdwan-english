// app/(auth)/register/page.js
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// 1. خلفية الجسيمات – نسخة أكثر حيوية
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
    const particleCount = 100;
    const colors = theme === 'dark'
      ? ['rgba(255, 215, 0, 0.12)', 'rgba(255, 200, 0, 0.08)', 'rgba(255, 180, 0, 0.04)']
      : ['rgba(200, 180, 0, 0.06)', 'rgba(180, 160, 0, 0.04)', 'rgba(150, 130, 0, 0.02)'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 3 + 1,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
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

        const pulseRadius = p.radius + Math.sin(p.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // خطوط ربط بين الجسيمات القريبة
        particles.forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = 0.06 * (1 - dist / 120);
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
// 2. شريط التقدم – نسخة متطورة
// ================================================================
const ProgressBar = ({ currentStep, totalSteps = 5 }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="space-y-2 mb-4 sm:mb-6">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-gray-500 dark:text-gray-400">التقدم</span>
        <span className="text-yellow-500 dark:text-yellow-400 font-medium">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-1.5 sm:h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
        />
      </div>
    </div>
  );
};

// ================================================================
// 3. نصائح ذكية – نسخة تفاعلية
// ================================================================
const SmartTips = ({ tips }) => {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [tips.length, isPaused]);

  return (
    <div
      className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 dark:from-yellow-400/10 dark:to-yellow-600/5 border border-yellow-400/20 text-sm text-gray-700 dark:text-gray-300 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-400/10 cursor-pointer"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-xl bg-yellow-400/20 dark:bg-yellow-400/20">
        <Icons.Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 dark:text-yellow-400" />
      </div>
      <div>
        <p className="text-[10px] sm:text-xs font-semibold text-yellow-600 dark:text-yellow-400 mb-0.5">💡 نصيحة ذكية</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
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
// 4. حقل الإدخال المحسّن – مع زر إظهار/إخفاء كلمة المرور
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
  disabled = false,
  autoComplete = 'off',
  className = '',
  onBlur: customOnBlur,
  showPassword = false,
  onToggleVisibility,
}) => {
  const { styles } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const inputId = `input-${name}`;

  const handleBlur = (e) => {
    setIsFocused(false);
    setIsTouched(true);
    if (customOnBlur) customOnBlur(e);
  };

  const hasError = error && isTouched;

  // تحديد نوع الإدخال الفعلي
  const inputType = type === 'password' && showPassword ? 'text' : type;

  return (
    <div className={className}>
      <label className={`block text-xs sm:text-sm font-semibold ${styles.label} mb-1`} htmlFor={inputId}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative group">
        {Icon && (
          <div className={`absolute right-2.5 sm:right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${
            isFocused ? 'text-yellow-400 scale-110' : 'text-gray-400'
          }`}>
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
        )}
        <input
          id={inputId}
          type={inputType}
          name={name}
          value={value}
          onChange={onChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          aria-label={label}
          aria-invalid={!!error}
          className={`w-full p-2.5 sm:p-3 ${Icon ? 'pr-9 sm:pr-11' : 'pr-3 sm:pr-4'} ${styles.input} border ${
            hasError ? 'border-red-400' : isFocused ? 'border-yellow-400 shadow-lg shadow-yellow-400/10' : 'border-gray-200 dark:border-white/20'
          } rounded-lg sm:rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm sm:text-base`}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className={`absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 ${styles.subtext} hover:${styles.text} transition`}
          >
            {showPassword ? <Icons.EyeOff className="h-4 w-4 sm:h-5 sm:w-5" /> : <Icons.Eye className="h-4 w-4 sm:h-5 sm:w-5" />}
          </button>
        )}
        {isFocused && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transform scale-x-0 origin-right transition-transform duration-300 group-focus-within:scale-x-100" />
        )}
      </div>
      <AnimatePresence>
        {hasError && (
          <motion.p
            initial={{ opacity: 0, y: -5, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, y: -5, height: 0 }}
            className="text-red-400 text-[10px] sm:text-xs mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// 5. الصفحة الرئيسية – التسجيل الخطوة الأولى
// ================================================================
export default function RegisterStep1() {
  const router = useRouter();
  const { theme, styles } = useTheme();

  const [formData, setFormData] = useState({
    firstName: '',
    secondName: '',
    thirdName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailExists, setEmailExists] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, label: '', color: '' });

  // قائمة النصائح (ثابتة)
  const tips = useMemo(
    () => [
      'استخدم اسماً عربياً صحيحاً لسهولة التعرف عليك',
      'كلمة المرور القوية تحتوي على أحرف كبيرة وصغيرة وأرقام ورموز',
      'استخدم بريداً إلكترونياً نشطاً لتلقي إشعارات المنصة',
      'يمكنك تسجيل الدخول لاحقاً باستخدام البريد الإلكتروني وكلمة المرور',
      'جميع بياناتك محمية بتقنيات تشفير متطورة',
    ],
    []
  );

  // حقول الأسماء (ثابتة)
  const nameFields = useMemo(
    () => [
      { name: 'firstName', label: 'الاسم الأول', placeholder: 'محمد', icon: Icons.User },
      { name: 'secondName', label: 'الاسم الثاني', placeholder: 'أحمد', icon: Icons.User },
      { name: 'thirdName', label: 'الاسم الثالث', placeholder: 'علي', icon: Icons.User },
      { name: 'lastName', label: 'الاسم الأخير', placeholder: 'حسن', icon: Icons.User },
    ],
    []
  );

  // التحقق من قوة كلمة المرور
  useEffect(() => {
    const password = formData.password;
    if (!password) {
      setPasswordStrength({ score: 0, label: '', color: '' });
      return;
    }
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^a-zA-Z0-9]/.test(password)) score++;
    const labels = ['', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
    const colors = ['', 'text-red-400', 'text-yellow-400', 'text-green-400', 'text-emerald-400'];
    setPasswordStrength({ score, label: labels[score] || '', color: colors[score] || '' });
  }, [formData.password]);

  // التحقق من صحة الاسم العربي
  const isArabic = useCallback((text) => /^[\u0600-\u06FF\s]+$/.test(text), []);

  // التحقق من وجود البريد في Supabase
  const checkEmailExists = useCallback(async (email) => {
    if (!email) return false;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('email')
        .eq('email', email)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    } catch {
      return false;
    }
  }, []);

  // دالة التحقق
  const validate = useCallback(async () => {
    const newErrors = {};
    const nameFieldsList = ['firstName', 'secondName', 'thirdName', 'lastName'];
    nameFieldsList.forEach((field) => {
      const value = formData[field].trim();
      if (!value) {
        newErrors[field] = 'هذا الحقل مطلوب';
      } else if (!isArabic(value)) {
        newErrors[field] = 'يجب أن يحتوي الاسم على أحرف عربية فقط';
      }
    });

    if (!formData.email.trim()) {
      newErrors.email = 'البريد الإلكتروني مطلوب';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'البريد الإلكتروني غير صحيح';
    } else {
      const exists = await checkEmailExists(formData.email.trim());
      if (exists) {
        newErrors.email = 'هذا البريد الإلكتروني مسجل بالفعل';
        setEmailExists(true);
      } else {
        setEmailExists(false);
      }
    }

    if (!formData.password) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 8) {
      newErrors.password = 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    } else if (passwordStrength.score < 2) {
      newErrors.password = 'كلمة المرور ضعيفة، يرجى استخدام أحرف كبيرة وصغيرة وأرقام ورموز';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'كلمة المرور غير متطابقة';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, isArabic, checkEmailExists, passwordStrength.score]);

  // معالجة التغيير في الحقول
  const handleChange = useCallback(
    (e) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
      if (name === 'email') setEmailExists(false);
    },
    [errors]
  );

  // معالجة الإرسال
  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      const isValid = await validate();
      if (!isValid) return;

      setIsSubmitting(true);
      try {
        localStorage.setItem('registerData', JSON.stringify(formData));
        toast.success('✅ تم حفظ البيانات بنجاح!');
        await new Promise((resolve) => setTimeout(resolve, 600));
        router.push('/register/2');
      } catch (err) {
        console.error('Error saving data:', err);
        toast.error('❌ حدث خطأ، يرجى المحاولة مرة أخرى');
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, router]
  );

  return (
    <div key={theme} className={`min-h-screen w-full ${styles.bg} ${styles.text} relative overflow-hidden flex items-center justify-center p-3 sm:p-4`}>
      <ParticleBackground theme={theme} />

      <motion.div
        key={theme}
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* شعار المنصة */}
        <div className="text-center mb-4 sm:mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex p-2 sm:p-3 rounded-2xl bg-yellow-400/10 dark:bg-yellow-400/10 mb-2 sm:mb-3"
          >
            <Icons.GraduationCap className="h-8 w-8 sm:h-10 sm:w-10 text-yellow-500 dark:text-yellow-400" />
          </motion.div>
          <h1 className="text-xl sm:text-3xl font-extrabold bg-gradient-to-r from-yellow-500 to-yellow-700 dark:from-yellow-400 dark:to-yellow-600 bg-clip-text text-transparent">
            منصة محمد رضوان
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">التعليمية المتكاملة</p>
        </div>

        <div className={`${styles.card} border ${styles.border} rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-500`}>
          <div className="text-center mb-4 sm:mb-6">
            <div className="inline-flex p-2 sm:p-3 rounded-2xl bg-yellow-400/10 dark:bg-yellow-400/10 mb-2 sm:mb-3">
              <Icons.User className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-500 dark:text-yellow-400" />
            </div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-white">البيانات الأساسية</h2>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-0.5 sm:mt-1">أدخل اسمك الرباعي وبريدك الإلكتروني</p>
          </div>

          <ProgressBar currentStep={1} totalSteps={5} />

          <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {nameFields.map((field) => (
                <FormInput
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  value={formData[field.name]}
                  onChange={handleChange}
                  error={errors[field.name]}
                  placeholder={field.placeholder}
                  icon={field.icon}
                  required
                  className="col-span-1"
                />
              ))}
            </div>

            <FormInput
              name="email"
              label="البريد الإلكتروني"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="example@email.com"
              icon={Icons.Mail}
              required
              autoComplete="email"
            />

            <div className="space-y-1">
              <FormInput
                name="password"
                label="كلمة المرور"
                type="password"
                value={formData.password}
                onChange={handleChange}
                error={errors.password}
                placeholder="••••••••"
                icon={Icons.Lock}
                required
                autoComplete="new-password"
                showPassword={showPassword}
                onToggleVisibility={() => setShowPassword(!showPassword)}
              />
              {formData.password && (
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        passwordStrength.score === 1 ? 'w-1/4 bg-red-400' :
                        passwordStrength.score === 2 ? 'w-2/4 bg-yellow-400' :
                        passwordStrength.score === 3 ? 'w-3/4 bg-green-400' :
                        passwordStrength.score === 4 ? 'w-full bg-emerald-400' : 'w-0'
                      }`}
                    />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-semibold ${passwordStrength.color}`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>

            <FormInput
              name="confirmPassword"
              label="تأكيد كلمة المرور"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              placeholder="••••••••"
              icon={Icons.Lock}
              required
              autoComplete="new-password"
              showPassword={showConfirmPassword}
              onToggleVisibility={() => setShowConfirmPassword(!showConfirmPassword)}
            />

            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              <Icons.Info className="h-4 w-4 flex-shrink-0" />
              <span>سيتم استخدام هذا البريد لتسجيل الدخول واستعادة كلمة المرور</span>
            </div>

            <SmartTips tips={tips} />

            <button
              type="submit"
              disabled={isSubmitting || emailExists}
              className="w-full py-2.5 sm:py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold rounded-lg sm:rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <span>التالي</span>
                  <Icons.ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            لديك حساب بالفعل؟{' '}
            <button
              onClick={() => router.push('/login')}
              className="text-yellow-600 dark:text-yellow-400 hover:underline font-semibold transition-colors"
            >
              تسجيل الدخول
            </button>
          </div>
        </div>

        <div className="mt-4 sm:mt-6 text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          <span>🔒 جميع البيانات مشفرة • خطوة 1 من 5</span>
        </div>
      </motion.div>
    </div>
  );
}