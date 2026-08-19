// app/(auth)/register/5/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// ✅ دالة تفكيك الصف الدراسي
// ================================================================
function parseGrade(gradeText) {
  if (!gradeText) return { stage: '', level: '' };
  const text = gradeText.trim();
  let stage = '';
  let level = '';

  if (text.includes('ابتدائي')) stage = 'ابتدائي';
  else if (text.includes('إعدادي')) stage = 'إعدادي';
  else if (text.includes('ثانوي')) stage = 'ثانوي';

  const levelMap = {
    'الأول': '1', 'الثاني': '2', 'الثالث': '3',
    'الرابع': '4', 'الخامس': '5', 'السادس': '6',
  };
  for (const [arabic, num] of Object.entries(levelMap)) {
    if (text.includes(arabic)) { level = num; break; }
  }

  return { stage, level };
}

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
    const particleCount = 100;
    const colors = theme === 'dark'
      ? ['rgba(255, 215, 0, 0.15)', 'rgba(255, 200, 0, 0.10)', 'rgba(255, 180, 0, 0.05)']
      : ['rgba(200, 180, 0, 0.08)', 'rgba(180, 160, 0, 0.05)', 'rgba(150, 130, 0, 0.03)'];

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
        const r = p.radius + Math.sin(p.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        particles.forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 130) {
            const alpha = 0.06 * (1 - dist / 130);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = theme === 'dark'
              ? `rgba(255, 215, 0, ${alpha})`
              : `rgba(200, 180, 0, ${alpha})`;
            ctx.lineWidth = 0.6;
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
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
      />
    </div>
  );
};

// ================================================================
// 3. بطاقة التحقق (حالة التحميل) – متجاوبة
// ================================================================
const LoadingCard = ({ styles }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center py-4 sm:py-8"
  >
    <div className="relative w-16 h-16 sm:w-24 sm:h-24 mx-auto">
      <div className="absolute inset-0 rounded-full border-4 border-yellow-400/20" />
      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-yellow-400 animate-spin" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icons.User className="h-6 w-6 sm:h-10 sm:w-10 text-yellow-400" />
      </div>
    </div>
    <h3 className={`text-lg sm:text-xl font-bold ${styles.text} mt-4 sm:mt-6`}>جاري إنشاء حسابك</h3>
    <p className={`${styles.subtext} text-xs sm:text-sm mt-1.5 sm:mt-2`}>نقوم بإعداد كل شيء لاستقبالك...</p>
    <div className="flex items-center justify-center gap-2 sm:gap-3 mt-4 sm:mt-6">
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.15s' }} />
      <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }} />
    </div>
  </motion.div>
);

// ================================================================
// 4. بطاقة النجاح (حالة النجاح) – متجاوبة
// ================================================================
const SuccessCard = ({ userData, styles }) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fullName = `${userData?.firstName || ''} ${userData?.secondName || ''} ${userData?.thirdName || ''} ${userData?.lastName || ''}`.trim();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="text-center"
    >
      {/* أيقونة النجاح */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
        className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-green-500/20 border-2 border-green-400/30 flex items-center justify-center"
      >
        <Icons.CheckCircle className="h-8 w-8 sm:h-10 sm:w-10 text-green-400" />
      </motion.div>

      <h3 className={`text-xl sm:text-2xl font-bold ${styles.text} mt-3 sm:mt-4`}>🎉 تم إنشاء الحساب بنجاح!</h3>
      <p className={`${styles.subtext} text-xs sm:text-sm mt-1.5 sm:mt-2`}>
        مرحباً بك <span className="text-yellow-400 font-semibold">{fullName || 'الطالب'}</span> في منصة محمد رضوان
      </p>

      {/* صندوق الملخص */}
      <div className={`mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl ${styles.card} border ${styles.border} text-right`}>
        <p className={`text-[10px] sm:text-xs font-semibold ${styles.subtext} mb-2 sm:mb-3`}>📋 ملخص الحساب</p>
        <div className="space-y-1 text-xs sm:text-sm">
          <div className="flex justify-between">
            <span className={styles.subtext}>الاسم</span>
            <span className={styles.text}>{fullName || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className={styles.subtext}>البريد الإلكتروني</span>
            <span className={styles.text}>{userData?.email || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className={styles.subtext}>المدرسة</span>
            <span className={styles.text}>{userData?.school || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className={styles.subtext}>الصف الدراسي</span>
            <span className={styles.text}>{userData?.grade || '—'}</span>
          </div>
        </div>
      </div>

      {/* عد تنازلي */}
      <p className={`text-xs sm:text-sm ${styles.subtext} mt-3 sm:mt-4`}>
        سيتم توجيهك إلى لوحة التحكم خلال <span className="text-yellow-400 font-bold">{countdown}</span> ثانية
      </p>

      <div className="w-full max-w-xs h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mx-auto mt-2 sm:mt-3">
        <motion.div
          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: 5, ease: 'linear' }}
        />
      </div>

      <Link
        href="/dashboard/student"
        className="mt-4 sm:mt-6 inline-block px-6 py-2 sm:px-8 sm:py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
      >
        <Icons.ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
        الذهاب إلى لوحة التحكم
      </Link>
    </motion.div>
  );
};

// ================================================================
// 5. بطاقة الخطأ (حالة الفشل) – متجاوبة
// ================================================================
const ErrorCard = ({ error, onRetry, onBack, styles }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9 }}
    animate={{ opacity: 1, scale: 1 }}
    className="text-center"
  >
    <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-full bg-red-500/20 border-2 border-red-400/30 flex items-center justify-center">
      <Icons.AlertCircle className="h-8 w-8 sm:h-10 sm:w-10 text-red-400" />
    </div>
    <h3 className={`text-lg sm:text-xl font-bold ${styles.text} mt-3 sm:mt-4`}>❌ فشل إنشاء الحساب</h3>
    <div className={`mt-2 sm:mt-3 p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/30 ${styles.subtext} text-xs sm:text-sm`}>
      <Icons.AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 inline ml-1 sm:ml-2 text-red-400" />
      {error || 'حدث خطأ غير متوقع، يرجى المحاولة مرة أخرى'}
    </div>
    <div className="flex flex-wrap gap-2 sm:gap-3 justify-center mt-4 sm:mt-6">
      <button
        onClick={onRetry}
        className="px-4 py-2 sm:px-6 sm:py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition font-semibold flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
      >
        <Icons.RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        إعادة المحاولة
      </button>
      <button
        onClick={onBack}
        className="px-4 py-2 sm:px-6 sm:py-2.5 bg-white/10 dark:bg-white/5 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base"
      >
        <Icons.ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        العودة للتسجيل
      </button>
    </div>
    {error?.includes('مسجل بالفعل') && (
      <Link href="/login" className="mt-3 sm:mt-4 inline-block text-yellow-400 hover:underline text-xs sm:text-sm">
        🚪 اذهب إلى تسجيل الدخول
      </Link>
    )}
  </motion.div>
);

// ================================================================
// 6. الصفحة الرئيسية – الخطوة الخامسة (الإكمال) – متجاوبة
// ================================================================
export default function RegisterStep5() {
  const router = useRouter();
  const { theme, styles } = useTheme();

  const [status, setStatus] = useState('loading');
  const [error, setError] = useState('');
  const [userData, setUserData] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const tips = [
    'نحن نجهز حسابك لتجربة تعليمية فريدة',
    'ستتمكن قريباً من الوصول إلى جميع الكورسات',
    'منصتنا توفر لك محتوى تعليمياً متكاملاً',
    'يمكنك البدء في التعلم فور اكتمال التسجيل',
    'جميع بياناتك محمية بأعلى معايير الأمان',
  ];
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    setIsMounted(true);
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // ===== إنشاء الحساب =====
  useEffect(() => {
    if (!isMounted) return;

    const createAccount = async () => {
      try {
        const data = localStorage.getItem('registerData');
        if (!data) {
          router.replace('/register');
          return;
        }

        const parsed = JSON.parse(data);
        setUserData(parsed);

        const fullName = `${parsed.firstName || ''} ${parsed.secondName || ''} ${parsed.thirdName || ''} ${parsed.lastName || ''}`.trim();

        if (!parsed.email || !parsed.password) {
          setError('بيانات غير مكتملة. يرجى العودة لبداية التسجيل');
          setStatus('error');
          return;
        }

        // ✅ إنشاء الحساب في Supabase Auth
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: parsed.email,
          password: parsed.password,
          options: {
            data: {
              name: fullName, // تأكد إن دي name زي ما اتفقنا
              phone: parsed.phone || '',
              parent_phone: parsed.parentPhone || '',
              school: parsed.school || '',
              grade: parsed.grade || '',
              governorate: parsed.governorate || '',
              // تم مسح سطر الـ role من هنا لأنه بيتعارض مع حماية الـ Database
            },
          },
        });

        if (signUpError) {
          console.error('SignUp error:', signUpError);
          if (signUpError.message.includes('User already registered')) {
            setError('هذا البريد الإلكتروني مسجل بالفعل. يرجى تسجيل الدخول.');
          } else {
            setError(signUpError.message || 'حدث خطأ أثناء إنشاء الحساب');
          }
          setStatus('error');
          return;
        }

        if (!authData.user) {
          setError('فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.');
          setStatus('error');
          return;
        }

        // ✅ تفكيك الصف الدراسي
        const { stage, level } = parseGrade(parsed.grade || '');

        // ✅ حفظ بيانات إضافية في جدول profiles (مع grade_stage و grade_level)
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: authData.user.id,
            full_name: fullName,
            phone: parsed.phone || '',
            parent_phone: parsed.parentPhone || '',
            school: parsed.school || '',
            grade: parsed.grade || '',
            grade_stage: stage,
            grade_level: level,
            governorate: parsed.governorate || '',
            role: 'student',
          }, { onConflict: 'id' });

        if (profileError) {
          console.error('Profile error:', profileError);
        }

        // ✅ تنظيف البيانات المؤقتة
        localStorage.removeItem('registerData');
        localStorage.removeItem('otpData');

        toast.success('✅ تم إنشاء الحساب بنجاح!');
        setStatus('success');

        setTimeout(() => {
          router.push('/dashboard/student');
        }, 5000);

      } catch (err) {
        console.error('Unexpected error:', err);
        setError(err.message || 'حدث خطأ غير متوقع');
        setStatus('error');
      }
    };

    createAccount();
  }, [router, isMounted]);

  const handleRetry = () => {
    setRetryCount(retryCount + 1);
    setError('');
    setStatus('loading');
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  const handleBackToStart = () => {
    localStorage.removeItem('registerData');
    router.push('/register');
  };

  if (!isMounted) {
    return (
      <div className={`min-h-screen w-full ${styles.bg} ${styles.text} flex items-center justify-center`}>
        <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
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
        <div className="text-center mb-4 sm:mb-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex p-2.5 sm:p-3 rounded-2xl bg-yellow-400/10 dark:bg-yellow-400/10 mb-2 sm:mb-3"
          >
            <Icons.CheckCircle className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 dark:text-yellow-400" />
          </motion.div>
          <h2 className={`text-xl sm:text-2xl font-bold ${styles.text}`}>إكمال التسجيل</h2>
          <p className={`text-xs sm:text-sm ${styles.subtext} mt-0.5 sm:mt-1`}>
            {status === 'loading' && 'جاري إنشاء حسابك...'}
            {status === 'success' && '🎉 تم إنشاء الحساب بنجاح!'}
            {status === 'error' && '❌ فشل إنشاء الحساب'}
          </p>
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 mt-1.5 text-[10px] sm:text-xs text-yellow-400">
            <Icons.ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>الخطوة 5 من 5</span>
          </div>
        </div>

        <ProgressBar currentStep={5} totalSteps={5} />

        <div className={`${styles.card} border ${styles.border} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all duration-500 min-h-[320px] sm:min-h-[400px] flex items-center justify-center`}>
          <AnimatePresence mode="wait">
            {status === 'loading' && (
              <LoadingCard key="loading" styles={styles} />
            )}
            {status === 'success' && (
              <SuccessCard key="success" userData={userData} styles={styles} />
            )}
            {status === 'error' && (
              <ErrorCard
                key="error"
                error={error}
                onRetry={handleRetry}
                onBack={handleBackToStart}
                styles={styles}
              />
            )}
          </AnimatePresence>
        </div>

        {status === 'loading' && (
          <div className="mt-3 sm:mt-4 text-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`text-xs sm:text-sm ${styles.subtext}`}
              >
                💡 {tips[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        <div className="mt-3 sm:mt-4 text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          <span>🔒 جميع البيانات مشفرة • خطوة 5 من 5</span>
        </div>
      </motion.div>
    </div>
  );
}