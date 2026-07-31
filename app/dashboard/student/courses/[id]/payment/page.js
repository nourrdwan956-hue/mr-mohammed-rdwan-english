// app/dashboard/student/courses/[id]/payment/page.js
// ================================================================
// 💳 صفحة الدفع للطالب – نسخة فاخرة مع Wave Border
// 🔧 ملاحظة: Paymob غير مفعّل حالياً – النظام الحالي هو شراء كود الشحن من المستر
// 🔑 الكود يسمح بجهازين (تم التعديل)
// ================================================================

'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// ألوان البطاقات المتغيرة (نفس نظام الرئيسية)
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20' },
  { name: 'red', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 dark:bg-red-400/10', border: 'border-red-400/30 dark:border-red-400/20' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  if (available.length === 0) return CARD_COLORS[0];
  return available[Math.floor(Math.random() * available.length)];
};

// ================================================================
// 🌊 مكون الحدود الموجية (Wave Border) – متجاوب
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange }) => {
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMounted.current) return;
      setRotation(prev => {
        const newRot = prev + 2;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, 50);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [onColorChange]);

  const waveColors = [
    `rgba(59, 130, 246, 0.6)`,
    `rgba(37, 99, 235, 0.3)`,
    `rgba(96, 165, 250, 0.5)`,
    `rgba(59, 130, 246, 0.7)`,
    `rgba(37, 99, 235, 0.2)`,
  ];

  const gradientStyle = {
    background: `conic-gradient(from ${rotation}deg, ${waveColors.join(', ')})`,
    borderRadius: '1.5rem',
    padding: '3px',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={`relative rounded-2xl sm:rounded-3xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-2xl sm:rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// الصفحة الرئيسية – متجاوبة بالكامل
// ================================================================
export default function CoursePaymentPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;
  const { theme, language, styles } = useTheme();
  const isDark = theme === 'dark';

  // ===== حالات الصفحة =====
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('code');
  const [accessCode, setAccessCode] = useState('');
  const [processing, setProcessing] = useState(false);
  const [alreadyOwns, setAlreadyOwns] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [user, setUser] = useState(null);

  // ===== ألوان متغيرة =====
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const [paymentColor, setPaymentColor] = useState(CARD_COLORS[2]);
  const [codeColor, setCodeColor] = useState(CARD_COLORS[4]);
  const [constructionColor, setConstructionColor] = useState(CARD_COLORS[3]);

  // رقم المستر للتواصل
  const MASTER_PHONE = '01552191172';

  // ===== جلب بيانات الكورس والتحقق من الاشتراك =====
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        setUser(user);

        const { data: courseData, error: courseError } = await supabase
          .from('courses')
          .select('*, teacher:teacher_id(full_name)')
          .eq('id', courseId)
          .single();

        if (courseError || !courseData) {
          setError(language === 'ar' ? 'الكورس غير موجود' : 'Course not found');
          setLoading(false);
          return;
        }

        setCourse(courseData);
        setIsFree(courseData.is_free || courseData.price === 0);

        const { data: sub } = await supabase
          .from('course_subscriptions')
          .select('*')
          .eq('student_id', user.id)
          .eq('course_id', courseId)
          .eq('is_active', true)
          .maybeSingle();

        if (sub) {
          setAlreadyOwns(true);
          setLoading(false);
          return;
        }

        const { data: enroll } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();

        if (enroll && courseData.is_free) {
          setAlreadyOwns(true);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error:', err);
        setError(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
        setLoading(false);
      }
    };

    fetchData();
  }, [courseId, router, language]);

  // ===== تفعيل كود الشحن (باستخدام API) =====
  const handleCodeActivation = async () => {
    if (processing || isFree || !accessCode.trim() || !course) return;
    setProcessing(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(language === 'ar' ? 'يرجى تسجيل الدخول' : 'Please login');
        return;
      }

      // ✅ استخدام API بدلاً من RPC
      const response = await fetch('/api/codes/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: accessCode.trim().toUpperCase(),
          courseId: courseId,
          studentId: user.id
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || (language === 'ar' ? 'فشل تفعيل الكود' : 'Code activation failed'));
      }

      if (data.success) {
        toast.success(data.message || (language === 'ar' ? '✅ تم تفعيل الكود بنجاح' : '✅ Code activated successfully'));
        setTimeout(() => {
          router.push(`/dashboard/student/courses/${courseId}`);
        }, 1500);
      } else {
        toast.error(data.message || (language === 'ar' ? 'فشل تفعيل الكود' : 'Code activation failed'));
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || (language === 'ar' ? 'حدث خطأ أثناء تفعيل الكود' : 'Error activating code'));
    } finally {
      setProcessing(false);
    }
  };

  // ===== إذا كان الكورس مجانياً أو الطالب مشترك بالفعل =====
  if (alreadyOwns || isFree) {
    return (
      <div className={`min-h-screen ${styles.bg} p-4 sm:p-6`}>
        <div className="max-w-3xl mx-auto">
          <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
            <div className="p-6 sm:p-8 text-center">
              <div className="inline-flex p-3 sm:p-4 rounded-full bg-green-500/20 border-2 border-green-500/30 mb-3 sm:mb-4">
                <Icons.CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-400" />
              </div>
              <h1 className={`text-2xl sm:text-3xl font-bold ${styles.text} mb-3 sm:mb-4`}>
                {isFree ? '🎁 كورس مجاني' : language === 'ar' ? '✅ أنت مشترك بالفعل' : '✅ You are already subscribed'}
              </h1>
              <p className={`text-base sm:text-lg ${styles.subtext} mb-4 sm:mb-6`}>
                {isFree
                  ? (language === 'ar' ? 'يمكنك الوصول إلى محتوى الكورس مجاناً' : 'You can access the course content for free')
                  : (language === 'ar' ? 'يمكنك متابعة التعلم في هذا الكورس' : 'You can continue learning in this course')}
              </p>
              <button
                onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
                className="px-6 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl sm:rounded-2xl hover:scale-105 transition shadow-2xl shadow-yellow-400/30 text-base sm:text-lg"
              >
                <Icons.ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 inline mr-2" />
                {language === 'ar' ? 'الذهاب إلى الكورس' : 'Go to Course'}
              </button>
            </div>
          </WaveBorderCard>
        </div>
      </div>
    );
  }

  // ===== شاشة التحميل =====
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  // ===== عرض الخطأ =====
  if (error || !course) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${styles.bg}`}>
        <div className={`max-w-md w-full p-6 sm:p-8 rounded-2xl sm:rounded-3xl ${styles.card} border ${styles.border} text-center shadow-2xl`}>
          <div className="inline-flex p-3 sm:p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.XCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-400" />
          </div>
          <h2 className={`text-lg sm:text-xl font-bold ${styles.text} mt-3 sm:mt-4`}>
            {language === 'ar' ? 'حدث خطأ' : 'Error'}
          </h2>
          <p className={`text-sm sm:text-base ${styles.subtext} mt-1 sm:mt-2`}>{error}</p>
          <button
            onClick={() => router.push('/dashboard/student/courses')}
            className="mt-4 sm:mt-6 px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition text-sm sm:text-base"
          >
            {language === 'ar' ? 'العودة للكورسات' : 'Back to Courses'}
          </button>
        </div>
      </div>
    );
  }

  // ================================================================
  // التصميم الرئيسي – متجاوب بالكامل
  // ================================================================
  return (
    <div className={`min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية متحركة */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-60 -right-60 w-[600px] sm:w-[800px] h-[600px] sm:h-[800px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[700px] sm:w-[900px] h-[700px] sm:h-[900px] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-5 sm:space-y-6 md:space-y-8">
        {/* ===== رأس الصفحة مع Wave Border – متجاوب ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-4 sm:p-5 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black ${styles.text}`}>
                {language === 'ar' ? '💳 الدفع' : '💳 Payment'}
              </h1>
              <p className={`text-xs sm:text-sm md:text-base ${styles.subtext} mt-0.5 sm:mt-1`}>
                {language === 'ar'
                  ? `الاشتراك في كورس "${course.title}"`
                  : `Subscribe to "${course.title}"`}
              </p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
              className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition text-xs sm:text-sm font-bold ${styles.text}`}
            >
              <Icons.ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
              {language === 'ar' ? 'العودة' : 'Back'}
            </button>
          </div>
        </WaveBorderCard>

        {/* ===== معلومات الكورس – متجاوبة ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
          <div className="lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
            {/* تفاصيل الكورس */}
            <WaveBorderCard initialColor={CARD_COLORS[1].name}>
              <div className="p-4 sm:p-5 md:p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 flex items-center justify-center flex-shrink-0">
                      <Icons.BookOpen className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-gray-400" />
                    </div>
                  )}
                  <div>
                    <h2 className={`text-base sm:text-lg md:text-xl font-bold ${styles.text}`}>{course.title}</h2>
                    {course.teacher && (
                      <p className={`text-xs sm:text-sm ${styles.subtext}`}>
                        {language === 'ar' ? 'المعلم' : 'Teacher'}: {course.teacher.full_name}
                      </p>
                    )}
                    {course.description && (
                      <p className={`text-xs sm:text-sm ${styles.subtext} mt-0.5 sm:mt-1 line-clamp-2`}>
                        {course.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-3 sm:mt-4 flex flex-wrap gap-2 sm:gap-3 md:gap-4">
                  <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl ${styles.card} border ${styles.border}`}>
                    <p className={`text-[10px] sm:text-xs ${styles.subtext}`}>{language === 'ar' ? 'السعر' : 'Price'}</p>
                    <p className={`text-lg sm:text-xl md:text-2xl font-bold ${styles.text}`}>
                      {course.is_free || course.price === 0 ? '🎁 مجاني' : `${course.price} ج.م`}
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl ${styles.card} border ${styles.border}`}>
                    <p className={`text-[10px] sm:text-xs ${styles.subtext}`}>{language === 'ar' ? 'المدة' : 'Duration'}</p>
                    <p className={`text-lg sm:text-xl md:text-2xl font-bold ${styles.text}`}>
                      {course.duration || (language === 'ar' ? 'غير محدد' : 'N/A')}
                    </p>
                  </div>
                  <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl ${styles.card} border ${styles.border}`}>
                    <p className={`text-[10px] sm:text-xs ${styles.subtext}`}>{language === 'ar' ? 'الأجهزة' : 'Devices'}</p>
                    <p className={`text-lg sm:text-xl md:text-2xl font-bold ${styles.text}`}>2</p>
                  </div>
                </div>
              </div>
            </WaveBorderCard>

            {/* ===== خيارات الدفع ===== */}
            <div className="space-y-3 sm:space-y-4">
              {/* ================================================================ */}
              {/* 🔧 خيار Paymob – معطل حالياً ويظهر رسالة تحت الإنشاء */}
              {/* ================================================================ */}
              <WaveBorderCard initialColor={constructionColor.name} onColorChange={setConstructionColor}>
                <div className="p-4 sm:p-5 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-orange-500/10 flex-shrink-0">
                        <Icons.Construction className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-orange-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={`text-base sm:text-lg md:text-xl font-bold ${styles.text}`}>
                            {language === 'ar' ? '💳 الدفع عبر Paymob' : '💳 Pay with Paymob'}
                          </h3>
                          <span className="px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-orange-500/20 text-orange-500 text-[8px] sm:text-[10px] md:text-xs font-bold border border-orange-500/30">
                            {language === 'ar' ? '⛔ تحت الإنشاء' : '⛔ Under Construction'}
                          </span>
                        </div>
                        <p className={`text-xs sm:text-sm ${styles.subtext}`}>
                          {language === 'ar' ? 'هذه الخاصية غير متاحة حالياً' : 'This feature is currently unavailable'}
                        </p>
                      </div>
                    </div>
                    <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 border-gray-400">
                      <div className="w-full h-full rounded-full bg-gray-400" />
                    </div>
                  </div>

                  {/* ===== رسالة التفعيل عبر الكود + رقم المستر ===== */}
                  <div className="mt-3 sm:mt-4 p-4 sm:p-5 md:p-6 rounded-xl border-2 border-yellow-400/40 bg-gradient-to-br from-yellow-500/10 via-amber-500/5 to-orange-500/10 backdrop-blur-sm shadow-xl shadow-yellow-500/20">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      <div className="flex-shrink-0 flex items-center justify-center">
                        <div className="p-2 sm:p-3 rounded-full bg-yellow-500/20 border-2 border-yellow-500/40">
                          <Icons.Key className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-yellow-400" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm sm:text-base md:text-lg font-bold ${styles.text}`}>
                          {language === 'ar' 
                            ? '🔑 النظام الحالي: شراء كود الشحن وتفعيله'
                            : '🔑 Current System: Buy and activate access code'}
                        </p>
                        <p className={`text-xs sm:text-sm ${styles.subtext} mt-0.5 sm:mt-1 leading-relaxed`}>
                          {language === 'ar'
                            ? 'للحصول على كود الشحن، تواصل مع المستر محمد رضوان عبر الرقم التالي:'
                            : 'To get an access code, contact Mr. Mohamed Radwan via the number below:'}
                        </p>
                      </div>
                    </div>

                    {/* ===== رقم الهاتف – زر اتصال مباشر ===== */}
                    <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 justify-center">
                      <a
                        href={`tel:${MASTER_PHONE}`}
                        className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold rounded-xl sm:rounded-2xl hover:scale-105 transition-all duration-300 shadow-xl shadow-green-500/40 text-sm sm:text-base md:text-lg"
                      >
                        <Icons.Phone className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className="font-mono tracking-wider">{MASTER_PHONE}</span>
                        <Icons.ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                      </a>
                      <span className={`text-xs sm:text-sm ${styles.subtext}`}>
                        {language === 'ar' ? '📞 اضغط للاتصال المباشر' : '📞 Tap to call directly'}
                      </span>
                    </div>

                    <div className={`mt-2 sm:mt-3 text-center text-[10px] sm:text-xs ${styles.subtext} opacity-70`}>
                      {language === 'ar'
                        ? '⚠️ بعد شراء الكود، أدخله في خانة "كود الشحن" بالأسفل لتفعيل الاشتراك'
                        : '⚠️ After purchasing the code, enter it in the "Access Code" field below to activate'}
                    </div>
                  </div>
                </div>
              </WaveBorderCard>

              {/* ===== خيار كود الشحن – متجاوب ===== */}
              <WaveBorderCard initialColor={codeColor.name} onColorChange={setCodeColor}>
                <div className={`p-4 sm:p-5 md:p-6 cursor-pointer transition ${paymentMethod === 'code' ? 'ring-2 ring-purple-500' : ''}`}
                  onClick={() => setPaymentMethod('code')}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 rounded-xl bg-purple-500/10 flex-shrink-0">
                        <Icons.Key className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ${paymentMethod === 'code' ? 'text-purple-500' : 'text-gray-400'}`} />
                      </div>
                      <div>
                        <h3 className={`text-base sm:text-lg md:text-xl font-bold ${styles.text}`}>
                          {language === 'ar' ? '🎫 استخدام كود شحن' : '🎫 Use Access Code'}
                        </h3>
                        <p className={`text-xs sm:text-sm ${styles.subtext}`}>
                          {language === 'ar' ? 'أدخل الكود الذي حصلت عليه من المستر' : 'Enter the code provided by the teacher'}
                        </p>
                      </div>
                    </div>
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 ${paymentMethod === 'code' ? 'border-purple-500 bg-purple-500' : 'border-gray-400'}`}>
                      {paymentMethod === 'code' && <Icons.Check className="h-3 w-3 sm:h-4 sm:w-4 text-white" />}
                    </div>
                  </div>
                  {paymentMethod === 'code' && (
                    <div className="mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl bg-white/5 border ${styles.border}">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                        <input
                          type="text"
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                          placeholder={language === 'ar' ? 'أدخل الكود (مثال: ABCD-EFG-HIJ)' : 'Enter code (e.g. ABCD-EFG-HIJ)'}
                          className={`flex-1 p-2.5 sm:p-3 ${styles.input} border ${styles.border} rounded-xl text-center font-mono text-base sm:text-lg tracking-widest uppercase`}
                          maxLength={14}
                        />
                        <button
                          onClick={handleCodeActivation}
                          disabled={processing || !accessCode.trim()}
                          className="px-4 py-2.5 sm:px-5 sm:py-3 md:px-6 md:py-3.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg shadow-purple-500/30 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                          {processing ? (
                            <><div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> {language === 'ar' ? 'جاري...' : 'Processing...'}</>
                          ) : (
                            <><Icons.Check className="h-4 w-4 sm:h-5 sm:w-5" /> {language === 'ar' ? 'تفعيل' : 'Activate'}</>
                          )}
                        </button>
                      </div>
                      {/* ✅ النص المعدل: الكود يسمح بجهازين */}
                      <p className={`text-[10px] sm:text-xs ${styles.subtext} mt-1.5 sm:mt-2`}>
                        {language === 'ar'
                          ? '⚠️ الكود صالح لجهازين فقط ولمدة 30 يوماً'
                          : '⚠️ Code is valid for two devices only and expires after 30 days'}
                      </p>
                    </div>
                  )}
                </div>
              </WaveBorderCard>
            </div>
          </div>

          {/* ===== العمود الأيمن: ملخص ومعلومات ===== */}
          <div className="space-y-4 sm:space-y-5 md:space-y-6">
            {/* ملخص الطلب */}
            <WaveBorderCard initialColor={CARD_COLORS[3].name}>
              <div className="p-4 sm:p-5 md:p-6">
                <h3 className={`text-base sm:text-lg font-bold ${styles.text} mb-3 sm:mb-4 flex items-center gap-2`}>
                  <Icons.Receipt className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
                  {language === 'ar' ? 'ملخص الطلب' : 'Order Summary'}
                </h3>
                <div className="space-y-2 sm:space-y-3">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className={styles.subtext}>{language === 'ar' ? 'الكورس' : 'Course'}</span>
                    <span className={`font-bold ${styles.text}`}>{course.title}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className={styles.subtext}>{language === 'ar' ? 'السعر' : 'Price'}</span>
                    <span className={`font-bold ${styles.text}`}>{course.is_free ? 'مجاني' : `${course.price} ج.م`}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className={styles.subtext}>{language === 'ar' ? 'الأجهزة' : 'Devices'}</span>
                    <span className={`font-bold ${styles.text}`}>2</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className={styles.subtext}>{language === 'ar' ? 'المدة' : 'Duration'}</span>
                    <span className={`font-bold ${styles.text}`}>{language === 'ar' ? '30 يوماً' : '30 days'}</span>
                  </div>
                  <div className="pt-2 sm:pt-3 border-t border-[var(--border-color)] flex justify-between text-sm sm:text-base">
                    <span className={`font-bold ${styles.text}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</span>
                    <span className={`text-lg sm:text-xl font-bold text-yellow-400`}>
                      {course.is_free ? '0 ج.م' : `${course.price} ج.م`}
                    </span>
                  </div>
                </div>
              </div>
            </WaveBorderCard>

            {/* معلومات الأمان */}
            <WaveBorderCard initialColor={CARD_COLORS[4].name}>
              <div className="p-4 sm:p-5 md:p-6">
                <h4 className={`text-sm sm:text-base font-bold ${styles.text} mb-2 sm:mb-3 flex items-center gap-2`}>
                  <Icons.Shield className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-400" />
                  {language === 'ar' ? '🔒 بيئة دفع آمنة' : '🔒 Secure Payment'}
                </h4>
                <ul className={`text-[10px] sm:text-xs ${styles.subtext} space-y-1.5 sm:space-y-2`}>
                  <li className="flex items-start gap-2">
                    <Icons.Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {language === 'ar' ? 'جميع المدفوعات مشفرة بأمان' : 'All payments are securely encrypted'}
                  </li>
                  <li className="flex items-start gap-2">
                    <Icons.Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {language === 'ar' ? 'بياناتك محفوظة بسرية تامة' : 'Your data is kept completely confidential'}
                  </li>
                  <li className="flex items-start gap-2">
                    <Icons.Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                    {language === 'ar' ? 'الدعم الفني متاح 24/7' : 'Technical support available 24/7'}
                  </li>
                </ul>
              </div>
            </WaveBorderCard>

            {/* زر مساعدة */}
            <button
              onClick={() => router.push('/dashboard/student/support')}
              className={`w-full py-2.5 sm:py-3 rounded-xl border ${styles.border} ${styles.card} hover:border-blue-400/50 transition text-xs sm:text-sm font-bold ${styles.text}`}
            >
              <Icons.Headphones className="h-4 w-4 sm:h-5 sm:w-5 inline mr-1.5 sm:mr-2 text-blue-400" />
              {language === 'ar' ? '🆘 بحاجة للمساعدة؟' : '🆘 Need help?'}
            </button>
          </div>
        </div>

        {/* ===== روابط سريعة – متجاوبة ===== */}
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
          {[
            { href: '/dashboard/student', icon: Icons.Home, label: language === 'ar' ? 'الرئيسية' : 'Home' },
            { href: '/dashboard/student/courses', icon: Icons.Book, label: language === 'ar' ? 'الكورسات' : 'Courses' },
            { href: '/dashboard/student/support', icon: Icons.Headphones, label: language === 'ar' ? 'الدعم' : 'Support' },
            { href: '/dashboard/student/profile', icon: Icons.User, label: language === 'ar' ? 'حسابي' : 'Profile' },
            { href: '/dashboard/student/notes', icon: Icons.StickyNote, label: language === 'ar' ? 'ملاحظات' : 'Notes' },
          ].map((item, index) => (
            <button
              key={`${item.href}-${index}`}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-2.5 md:p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition group`}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 group-hover:scale-110 transition" />
              <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold ${styles.text}`}>{item.label}</span>
            </button>
          ))}
          <button
            onClick={() => router.back()}
            className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-2.5 md:p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition group`}
          >
            <Icons.ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 group-hover:scale-110 transition" />
            <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold ${styles.text}`}>
              {language === 'ar' ? 'العودة' : 'Back'}
            </span>
          </button>
        </div>
      </div>

      {/* CSS إضافية لدعم line-clamp */}
      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}