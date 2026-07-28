// app/(auth)/assistant-login/page.js
'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
// 2. مكون حقل الإدخال
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
  autoComplete = 'off',
  onToggleVisibility,
  showPassword,
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
          autoComplete={autoComplete}
          className={`w-full p-3 ${Icon ? 'pr-11' : 'pr-4'} ${styles.input} border ${
            hasError ? 'border-red-400' : isFocused ? 'border-yellow-400 shadow-lg shadow-yellow-400/10' : 'border-gray-200 dark:border-white/20'
          } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
        />
        {onToggleVisibility && (
          <button
            type="button"
            onClick={onToggleVisibility}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-400 transition-colors"
          >
            {showPassword ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
          </button>
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
// 4. الصفحة الرئيسية
// ================================================================
export default function AssistantLoginPage() {
  const router = useRouter();
  const { theme, toggleTheme, styles } = useTheme();

  const [formData, setFormData] = useState({
    password: '',
    accessCode: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAccessCode, setShowAccessCode] = useState(false);

  const tips = [
    'كلمة المرور ورمز الأمان يصدران من المعلم الرئيسي',
    'رمز الأمان مكون من 10 خانات (أحرف كبيرة وأرقام)',
    'يمكنك طلب إعادة تعيين البيانات من المعلم إذا نسيتها',
    'جميع جلسات المساعدين مسجلة ومراقبة لأمان المنصة',
    'تأكد من كتابة رمز الأمان بالشكل الصحيح (حساس لحالة الأحرف)',
  ];

  const togglePassword = () => setShowPassword(!showPassword);
  const toggleAccessCode = () => setShowAccessCode(!showAccessCode);

  const validate = () => {
    const newErrors = {};
    if (!formData.password.trim()) {
      newErrors.password = 'كلمة المرور مطلوبة';
    } else if (formData.password.length < 8) {
      newErrors.password = 'كلمة المرور يجب أن تكون 8 خانات على الأقل';
    }
    if (!formData.accessCode.trim()) {
      newErrors.accessCode = 'رمز الأمان مطلوب';
    } else if (formData.accessCode.length < 6) {
      newErrors.accessCode = 'رمز الأمان يجب أن يكون 6 خانات على الأقل';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});

    try {
      // إرسال البيانات إلى API
      const response = await fetch('/api/assistant-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: formData.password.trim(),
          accessCode: formData.accessCode.trim().toUpperCase(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل تسجيل الدخول');
      }

      // حفظ بيانات المساعد في Session Storage
      sessionStorage.setItem('assistantData', JSON.stringify(data.assistant));

      toast.success(`✅ مرحباً بك ${data.assistant.display_name || data.assistant.full_name}`);
      
      // التوجيه إلى لوحة التحكم
      router.push('/dashboard/assistant');

    } catch (err) {
      console.error('Login error:', err);
      setErrors({ general: err.message || 'فشل تسجيل الدخول، تحقق من البيانات وحاول مرة أخرى' });
      toast.error(err.message || 'فشل تسجيل الدخول');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (errors[name]) setErrors({ ...errors, [name]: '' });
    if (errors.general) setErrors({ ...errors, general: '' });
  };

  return (
    <div key={theme} className={`min-h-screen w-full ${styles.bg} ${styles.text} relative overflow-hidden flex items-center justify-center p-4`}>
      <ParticleBackground theme={theme} />

      {/* زر تبديل الثيم */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2.5 rounded-xl bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-gray-200 dark:border-white/10 hover:border-yellow-400/50 transition-all duration-300"
        aria-label="تبديل الثيم"
      >
        {theme === 'dark' ? (
          <Icons.Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          <Icons.Moon className="h-5 w-5 text-gray-600" />
        )}
      </button>

      {/* زر العودة للمنصة */}
      <button
        onClick={() => router.push('/')}
        className="fixed top-4 left-4 z-50 flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors"
        aria-label="العودة للمنصة"
      >
        <Icons.ArrowRight className="h-4 w-4" />
        <span>العودة للمنصة</span>
      </button>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-lg relative z-10"
      >
        {/* شعار المنصة */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex p-3 rounded-2xl bg-purple-500/10 dark:bg-purple-500/10 mb-3"
          >
            <Icons.Users className="h-10 w-10 text-purple-500 dark:text-purple-400" />
          </motion.div>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-purple-400 to-purple-600 dark:from-purple-300 dark:to-purple-500 bg-clip-text text-transparent">
            دخول المساعد
          </h1>
          <p className={`text-sm ${styles.subtext} mt-1`}>
            أدخل كلمة المرور ورمز الأمان الخاصين بك
          </p>
          <span className="inline-block mt-2 text-[10px] bg-purple-500/10 text-purple-400 px-3 py-0.5 rounded-full border border-purple-400/20">
            <Icons.Shield className="h-3 w-3 inline ml-1" /> بيئة آمنة
          </span>
        </div>

        {/* بطاقة تسجيل الدخول */}
        <div className={`${styles.card} border ${styles.border} rounded-3xl p-8 shadow-2xl backdrop-blur-xl transition-all duration-500`}>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* كلمة المرور */}
            <FormInput
              name="password"
              label="كلمة المرور"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="••••••••••"
              icon={Icons.Key}
              required
              autoComplete="off"
              onToggleVisibility={togglePassword}
              showPassword={showPassword}
            />

            {/* رمز الأمان */}
            <FormInput
              name="accessCode"
              label="رمز الأمان"
              type={showAccessCode ? 'text' : 'password'}
              value={formData.accessCode}
              onChange={handleChange}
              error={errors.accessCode}
              placeholder="••••••••••"
              icon={Icons.Shield}
              required
              autoComplete="off"
              onToggleVisibility={toggleAccessCode}
              showPassword={showAccessCode}
            />

            {/* خطأ عام */}
            <AnimatePresence>
              {errors.general && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm"
                >
                  <Icons.AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{errors.general}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* نصائح ذكية */}
            <SmartTips tips={tips} />

            {/* زر تسجيل الدخول */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التحقق...
                </>
              ) : (
                <>
                  <Icons.LogIn className="h-5 w-5" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </form>

          {/* روابط إضافية */}
          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <span>هل نسيت البيانات؟ </span>
            <button
              onClick={() => toast.info('يرجى التواصل مع المعلم المسؤول لإعادة تعيين البيانات')}
              className="text-purple-600 dark:text-purple-400 hover:underline font-medium transition-colors"
            >
              تواصل مع المعلم
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
          <span>🔒 جميع البيانات مشفرة • تسجيل دخول آمن للمساعدين</span>
        </div>
      </motion.div>
    </div>
  );
}