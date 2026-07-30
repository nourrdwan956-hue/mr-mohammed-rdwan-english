// app/dashboard/student/courses/[id]/devices/page.js
// ================================================================
// 📱 أجهزة الكورس – عرض وإدارة الأجهزة المسجلة لكورس معين (نسخة متجاوبة)
// ================================================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';
import Link from 'next/link';
import { getDeviceFingerprint } from '@/lib/device-fingerprint';

// ================================================================
// ألوان البطاقات المتغيرة
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
// مكون بطاقة الجهاز – متجاوب
// ================================================================
const DeviceCard = ({ device, isCurrentDevice, onDelete, styles, language, isDark }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const [isHovered, setIsHovered] = useState(false);
  const handleColorChange = (newColor) => setColor(newColor);

  const deviceName = device.device_name || (language === 'ar' ? 'جهاز غير معروف' : 'Unknown device');
  const firstUsed = new Date(device.first_used_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const lastUsed = new Date(device.last_used_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -3 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
          <div className={`p-2.5 sm:p-3 rounded-xl ${color.bg} flex-shrink-0`}>
            <Icons.Laptop className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ${color.text}`} />
          </div>
          <div className="flex-1 min-w-0 w-full sm:w-auto">
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
              <h3 className={`text-sm sm:text-base font-bold ${styles.text} truncate`}>{deviceName}</h3>
              {device.is_primary && (
                <span className="text-[8px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 whitespace-nowrap">
                  {language === 'ar' ? 'أساسي' : 'Primary'}
                </span>
              )}
              {isCurrentDevice && (
                <span className="text-[8px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 whitespace-nowrap">
                  {language === 'ar' ? '✓ هذا الجهاز' : '✓ This device'}
                </span>
              )}
              {!device.is_active && (
                <span className="text-[8px] sm:text-xs px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full bg-red-400/20 text-red-400 border border-red-400/30 whitespace-nowrap">
                  {language === 'ar' ? 'معطل' : 'Inactive'}
                </span>
              )}
            </div>
            <div className={`flex flex-wrap gap-x-3 sm:gap-x-4 gap-y-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs ${styles.subtext}`}>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Icons.Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {language === 'ar' ? 'أول استخدام' : 'First'}: {firstUsed}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Icons.Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                {language === 'ar' ? 'آخر استخدام' : 'Last'}: {lastUsed}
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <Icons.Fingerprint className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ID: {device.device_fingerprint.substring(0, 8)}...
              </span>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col gap-2 flex-shrink-0 self-start sm:self-center">
            {device.is_active && !isCurrentDevice && (
              <button
                onClick={() => onDelete(device.id)}
                className={`p-1.5 sm:p-2 rounded-lg transition ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
                title={language === 'ar' ? 'إزالة الجهاز' : 'Remove device'}
              >
                <Icons.Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            )}
            {isCurrentDevice && (
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Icons.Check className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
            )}
          </div>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// الصفحة الرئيسية – أجهزة الكورس (متجاوبة بالكامل)
// ================================================================
export default function CourseDevicesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;
  const { theme, language, styles } = useTheme();
  const isDark = theme === 'dark';

  const [course, setCourse] = useState(null);
  const [devices, setDevices] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentFingerprint, setCurrentFingerprint] = useState('');
  const [deleting, setDeleting] = useState(null);

  // ألوان متغيرة للرأس
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. جلب بيانات الكورس
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('title, is_free, price, max_devices, subscription_duration_days, teacher_id')
        .eq('id', courseId)
        .single();

      if (courseError || !courseData) {
        setError(language === 'ar' ? 'الكورس غير موجود' : 'Course not found');
        setLoading(false);
        return;
      }
      setCourse(courseData);

      // 2. جلب الاشتراك الحالي للطالب في هذا الكورس
      const { data: subData, error: subError } = await supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData || null);

      // 3. جلب بصمة الجهاز الحالي
      const fingerprint = await getDeviceFingerprint();
      setCurrentFingerprint(fingerprint);

      // 4. جلب الأجهزة المسجلة لهذا الكورس
      const { data: devicesData, error: devicesError } = await supabase
        .from('course_devices')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('first_used_at', { ascending: false });

      if (devicesError) throw devicesError;
      setDevices(devicesData || []);

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
      toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [courseId, router, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== حذف جهاز =====
  const deleteDevice = async (deviceId) => {
    if (deleting) return;
    setDeleting(deviceId);

    try {
      const { error } = await supabase
        .from('course_devices')
        .update({ is_active: false })
        .eq('id', deviceId);

      if (error) throw error;

      toast.success(language === 'ar' ? '✅ تم إلغاء تنشيط الجهاز' : '✅ Device deactivated');
      setDevices(prev => prev.filter(d => d.id !== deviceId));
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل حذف الجهاز' : 'Failed to remove device');
    } finally {
      setDeleting(null);
    }
  };

  // ===== حساب الإحصائيات =====
  const stats = useMemo(() => {
    const total = devices.length;
    const maxDevices = subscription?.max_devices || course?.max_devices || 2;
    const isFull = total >= maxDevices;
    return { total, maxDevices, isFull };
  }, [devices, subscription, course]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`text-xs sm:text-sm ${styles.subtext}`}>
            {language === 'ar' ? 'جاري تحميل الأجهزة...' : 'Loading devices...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
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
            onClick={fetchData}
            className="mt-4 sm:mt-6 px-5 py-2.5 sm:px-6 sm:py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition text-sm sm:text-base"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

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

      <div className="relative z-10 max-w-6xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-5 sm:space-y-6 md:space-y-8">
        {/* ===== رأس الصفحة – متجاوب ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-4 sm:p-5 md:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black ${styles.text}`}>
                {language === 'ar' ? '📱 أجهزة الكورس' : '📱 Course Devices'}
              </h1>
              <p className={`text-xs sm:text-sm md:text-base ${styles.subtext} mt-0.5 sm:mt-1 truncate max-w-[200px] sm:max-w-none`}>
                {course?.title || (language === 'ar' ? 'الكورس' : 'Course')}
              </p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={fetchData}
                className={`p-1.5 sm:p-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition`}
                title={language === 'ar' ? 'تحديث' : 'Refresh'}
              >
                <Icons.RefreshCw className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              </button>
              <button
                onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition text-[10px] sm:text-sm font-bold ${styles.text}`}
              >
                <Icons.ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1" />
                {language === 'ar' ? 'العودة للكورس' : 'Back to Course'}
              </button>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== إحصائيات سريعة – متجاوبة ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className={`p-4 sm:p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <Icons.Monitor className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-500 mx-auto mb-1 sm:mb-2" />
            <p className={`text-2xl sm:text-3xl font-bold ${styles.text}`}>{stats.total}</p>
            <p className={`text-[10px] sm:text-sm ${styles.subtext}`}>{language === 'ar' ? 'الأجهزة المسجلة' : 'Registered Devices'}</p>
          </div>
          <div className={`p-4 sm:p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <Icons.CheckCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-emerald-500 mx-auto mb-1 sm:mb-2" />
            <p className={`text-2xl sm:text-3xl font-bold ${styles.text}`}>{stats.maxDevices}</p>
            <p className={`text-[10px] sm:text-sm ${styles.subtext}`}>{language === 'ar' ? 'الحد الأقصى' : 'Maximum Devices'}</p>
          </div>
          <div className={`p-4 sm:p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <Icons.AlertCircle className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ${stats.isFull ? 'text-red-500' : 'text-yellow-500'} mx-auto mb-1 sm:mb-2`} />
            <p className={`text-2xl sm:text-3xl font-bold ${stats.isFull ? 'text-red-400' : 'text-yellow-400'}`}>
              {stats.isFull ? (language === 'ar' ? 'مكتمل' : 'Full') : (language === 'ar' ? 'متاح' : 'Available')}
            </p>
            <p className={`text-[10px] sm:text-sm ${styles.subtext}`}>
              {stats.isFull
                ? (language === 'ar' ? 'الحد الأقصى للأجهزة' : 'Maximum reached')
                : (language === 'ar' ? `${stats.maxDevices - stats.total} جهاز متاح` : `${stats.maxDevices - stats.total} devices available`)}
            </p>
          </div>
        </div>

        {/* ===== قائمة الأجهزة ===== */}
        {devices.length === 0 ? (
          <div className={`text-center py-16 sm:py-20 ${styles.card} border ${styles.border} rounded-2xl sm:rounded-3xl`}>
            <Icons.Monitor className="h-14 w-14 sm:h-16 sm:w-16 md:h-20 md:w-20 text-gray-500 mx-auto mb-3 sm:mb-4" />
            <h3 className={`text-xl sm:text-2xl font-bold ${styles.text}`}>
              {language === 'ar' ? 'لا توجد أجهزة مسجلة' : 'No devices registered'}
            </h3>
            <p className={`text-sm sm:text-base ${styles.subtext} mt-1 sm:mt-2 max-w-md mx-auto`}>
              {language === 'ar'
                ? 'قم بمشاهدة فيديو من هذا الكورس لتسجيل جهازك تلقائياً.'
                : 'Watch a video from this course to register your device automatically.'}
            </p>
            <button
              onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
              className="mt-4 sm:mt-6 px-6 py-2.5 sm:px-8 sm:py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-105 transition shadow-2xl shadow-yellow-400/30 text-sm sm:text-base"
            >
              {language === 'ar' ? 'الذهاب إلى الكورس' : 'Go to Course'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5 sm:space-y-3">
            {devices.map((device) => {
              const isCurrent = device.device_fingerprint === currentFingerprint;
              return (
                <DeviceCard
                  key={device.id}
                  device={device}
                  isCurrentDevice={isCurrent}
                  onDelete={deleteDevice}
                  styles={styles}
                  language={language}
                  isDark={isDark}
                />
              );
            })}
          </div>
        )}

        {/* ===== معلومات إضافية – متجاوبة ===== */}
        <WaveBorderCard initialColor={CARD_COLORS[4].name}>
          <div className="p-4 sm:p-5 md:p-6">
            <h3 className={`text-sm sm:text-base font-bold ${styles.text} mb-2 sm:mb-3 flex items-center gap-2`}>
              <Icons.Info className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
              {language === 'ar' ? '📌 معلومات الأجهزة' : '📌 Device Information'}
            </h3>
            <ul className={`text-xs sm:text-sm ${styles.subtext} space-y-1.5 sm:space-y-2`}>
              <li className="flex items-start gap-2">
                <Icons.Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {language === 'ar'
                  ? 'يتم تسجيل جهازك تلقائياً عند مشاهدة أي فيديو من هذا الكورس.'
                  : 'Your device is automatically registered when you watch any video from this course.'}
              </li>
              <li className="flex items-start gap-2">
                <Icons.Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {language === 'ar'
                  ? `الحد الأقصى للأجهزة هو ${stats.maxDevices} لهذا الكورس.`
                  : `The maximum number of devices is ${stats.maxDevices} for this course.`}
              </li>
              <li className="flex items-start gap-2">
                <Icons.Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {language === 'ar'
                  ? 'يمكنك حذف جهاز قديم لتسجيل جهاز جديد بدلاً منه.'
                  : 'You can remove an old device to register a new one instead.'}
              </li>
              <li className="flex items-start gap-2">
                <Icons.Check className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                {language === 'ar'
                  ? 'الجهاز الذي تستخدمه حالياً مميز بعلامة ✓ ولا يمكن حذفه.'
                  : 'The device you are currently using is marked with ✓ and cannot be removed.'}
              </li>
            </ul>
          </div>
        </WaveBorderCard>

        {/* ===== روابط سريعة – متجاوبة ===== */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
          {[
            { href: `/dashboard/student/courses/${courseId}`, icon: Icons.Book, label: language === 'ar' ? 'الكورس' : 'Course' },
            { href: '/dashboard/student/courses', icon: Icons.Search, label: language === 'ar' ? 'كورسات' : 'Courses' },
            { href: '/dashboard/student/devices', icon: Icons.Monitor, label: language === 'ar' ? 'كل الأجهزة' : 'All Devices' },
            { href: '/dashboard/student/subscriptions', icon: Icons.Receipt, label: language === 'ar' ? 'اشتراكاتي' : 'Subscriptions' },
            { href: '/dashboard/student/profile', icon: Icons.User, label: language === 'ar' ? 'حسابي' : 'Profile' },
            { href: '/dashboard/student/support', icon: Icons.Headphones, label: language === 'ar' ? 'الدعم' : 'Support' },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 sm:gap-1 p-2 sm:p-2.5 md:p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition group`}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 group-hover:scale-110 transition" />
              <span className={`text-[8px] sm:text-[10px] md:text-xs font-bold ${styles.text}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}