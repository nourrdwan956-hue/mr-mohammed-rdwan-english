// app/dashboard/student/courses/[id]/devices/page.js
// ================================================================
// 📱 أجهزة الكورس – عرض وإدارة الأجهزة المسجلة لكورس معين
// ✅ نسخة متجاوبة بالكامل مع تقليص الأحجام للشاشات الصغيرة
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
    padding: '2px',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-2xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-2xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// مكون بطاقة الجهاز – مضغوط ومتجاوب
// ================================================================
const DeviceCard = ({ device, isCurrentDevice, onDelete, styles, language, isDark }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const [isHovered, setIsHovered] = useState(false);
  const handleColorChange = (newColor) => setColor(newColor);

  const deviceName = device.device_name || (language === 'ar' ? 'جهاز غير معروف' : 'Unknown device');
  const firstUsed = new Date(device.first_used_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const lastUsed = new Date(device.last_used_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-3 sm:p-3.5 flex flex-col sm:flex-row items-start gap-2.5 sm:gap-3">
          <div className={`p-2 rounded-lg ${color.bg} flex-shrink-0`}>
            <Icons.Laptop className={`h-5 w-5 sm:h-6 sm:w-6 ${color.text}`} />
          </div>
          <div className="flex-1 min-w-0 w-full">
            <div className="flex flex-wrap items-center gap-1">
              <h3 className={`text-xs sm:text-sm font-bold ${styles.text} truncate`}>{deviceName}</h3>
              {device.is_primary && (
                <span className="text-[7px] sm:text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 whitespace-nowrap">
                  {language === 'ar' ? 'أساسي' : 'Primary'}
                </span>
              )}
              {isCurrentDevice && (
                <span className="text-[7px] sm:text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 whitespace-nowrap">
                  ✓ {language === 'ar' ? 'هذا الجهاز' : 'This device'}
                </span>
              )}
              {!device.is_active && (
                <span className="text-[7px] sm:text-[9px] px-1.5 py-0.5 rounded-full bg-red-400/20 text-red-400 border border-red-400/30 whitespace-nowrap">
                  {language === 'ar' ? 'معطل' : 'Inactive'}
                </span>
              )}
            </div>
            <div className={`flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[8px] sm:text-[10px] ${styles.subtext}`}>
              <span className="flex items-center gap-0.5 whitespace-nowrap">
                <Icons.Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {language === 'ar' ? 'أول' : 'First'}: {firstUsed}
              </span>
              <span className="flex items-center gap-0.5 whitespace-nowrap">
                <Icons.Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {language === 'ar' ? 'آخر' : 'Last'}: {lastUsed}
              </span>
              <span className="flex items-center gap-0.5 whitespace-nowrap hidden xs:inline-flex">
                <Icons.Fingerprint className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {device.device_fingerprint.substring(0, 6)}...
              </span>
            </div>
          </div>
          <div className="flex flex-row sm:flex-col gap-1.5 flex-shrink-0 self-start sm:self-center">
            {/* زر الحذف – معطل للجهاز الأساسي */}
            {device.is_active && !isCurrentDevice && !device.is_primary && (
              <button
                onClick={() => onDelete(device.id)}
                className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
                title={language === 'ar' ? 'إزالة الجهاز' : 'Remove device'}
              >
                <Icons.Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </button>
            )}
            {/* إذا كان الجهاز أساسياً، نعرض أيقونة قفل مع تلميح */}
            {device.is_primary && (
              <div
                className="p-1.5 rounded-lg text-yellow-400"
                title={language === 'ar' ? 'جهاز أساسي لا يمكن حذفه' : 'Primary device cannot be removed'}
              >
                <Icons.Lock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            )}
            {isCurrentDevice && !device.is_primary && (
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Icons.Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
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

  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

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

      const { data: subData, error: subError } = await supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .maybeSingle();

      if (subError) throw subError;
      setSubscription(subData || null);

      const fingerprint = await getDeviceFingerprint();
      setCurrentFingerprint(fingerprint);

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

  const stats = useMemo(() => {
    const total = devices.length;
    const maxDevices = subscription?.max_devices || course?.max_devices || 2;
    const isFull = total >= maxDevices;
    return { total, maxDevices, isFull };
  }, [devices, subscription, course]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`text-xs ${styles.subtext}`}>
            {language === 'ar' ? 'جاري تحميل الأجهزة...' : 'Loading devices...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-3 ${styles.bg}`}>
        <div className={`max-w-sm w-full p-5 rounded-2xl ${styles.card} border ${styles.border} text-center shadow-xl`}>
          <div className="inline-flex p-3 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.XCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className={`text-lg font-bold ${styles.text} mt-3`}>
            {language === 'ar' ? 'حدث خطأ' : 'Error'}
          </h2>
          <p className={`text-sm ${styles.subtext} mt-1`}>{error}</p>
          <button
            onClick={fetchData}
            className="mt-4 px-5 py-2 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition text-sm"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-60 -right-60 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[500px] h-[500px] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-5xl mx-auto px-3 py-4 space-y-4">

        {/* ===== رأس الصفحة – مضغوط ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="min-w-0">
              <h1 className={`text-xl sm:text-2xl font-black ${styles.text}`}>
                {language === 'ar' ? '📱 أجهزة الكورس' : '📱 Course Devices'}
              </h1>
              <p className={`text-xs ${styles.subtext} truncate max-w-[160px] sm:max-w-none`}>
                {course?.title || (language === 'ar' ? 'الكورس' : 'Course')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                className={`p-1.5 rounded-lg ${styles.card} border ${styles.border} hover:border-blue-400/50 transition`}
                title={language === 'ar' ? 'تحديث' : 'Refresh'}
              >
                <Icons.RefreshCw className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
              </button>
              <button
                onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
                className={`px-2.5 py-1.5 rounded-lg ${styles.card} border ${styles.border} hover:border-blue-400/50 transition text-[10px] sm:text-xs font-bold ${styles.text}`}
              >
                <Icons.ArrowLeft className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline mr-1" />
                {language === 'ar' ? 'العودة' : 'Back'}
              </button>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== إحصائيات سريعة – مضغوطة ===== */}
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className={`p-3 rounded-xl ${styles.card} border ${styles.border} text-center`}>
            <Icons.Monitor className="h-5 w-5 sm:h-6 sm:w-6 text-blue-500 mx-auto mb-0.5" />
            <p className={`text-xl sm:text-2xl font-bold ${styles.text}`}>{stats.total}</p>
            <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'المسجلة' : 'Registered'}</p>
          </div>
          <div className={`p-3 rounded-xl ${styles.card} border ${styles.border} text-center`}>
            <Icons.CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500 mx-auto mb-0.5" />
            <p className={`text-xl sm:text-2xl font-bold ${styles.text}`}>{stats.maxDevices}</p>
            <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'الحد الأقصى' : 'Maximum'}</p>
          </div>
          <div className={`p-3 rounded-xl ${styles.card} border ${styles.border} text-center`}>
            <Icons.AlertCircle className={`h-5 w-5 sm:h-6 sm:w-6 ${stats.isFull ? 'text-red-500' : 'text-yellow-500'} mx-auto mb-0.5`} />
            <p className={`text-xl sm:text-2xl font-bold ${stats.isFull ? 'text-red-400' : 'text-yellow-400'}`}>
              {stats.isFull ? (language === 'ar' ? 'مكتمل' : 'Full') : (language === 'ar' ? 'متاح' : 'Avail.')}
            </p>
            <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>
              {stats.isFull
                ? (language === 'ar' ? 'ممتلئ' : 'Full')
                : (language === 'ar' ? `${stats.maxDevices - stats.total} متاح` : `${stats.maxDevices - stats.total} left`)}
            </p>
          </div>
        </div>

        {/* ===== قائمة الأجهزة ===== */}
        {devices.length === 0 ? (
          <div className={`text-center py-10 ${styles.card} border ${styles.border} rounded-2xl`}>
            <Icons.Monitor className="h-12 w-12 sm:h-14 sm:w-14 text-gray-500 mx-auto mb-2" />
            <h3 className={`text-lg sm:text-xl font-bold ${styles.text}`}>
              {language === 'ar' ? 'لا توجد أجهزة' : 'No devices'}
            </h3>
            <p className={`text-xs sm:text-sm ${styles.subtext} mt-1 max-w-sm mx-auto`}>
              {language === 'ar'
                ? 'شاهد فيديو من هذا الكورس لتسجيل جهازك.'
                : 'Watch a video from this course to register your device.'}
            </p>
            <button
              onClick={() => router.push(`/dashboard/student/courses/${courseId}`)}
              className="mt-3 px-5 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-lg hover:scale-105 transition shadow-lg shadow-yellow-400/20 text-sm"
            >
              {language === 'ar' ? 'الذهاب للكورس' : 'Go to Course'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
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

        {/* ===== معلومات إضافية – مضغوطة ===== */}
        <WaveBorderCard initialColor={CARD_COLORS[4].name}>
          <div className="p-3 sm:p-4">
            <h3 className={`text-xs sm:text-sm font-bold ${styles.text} mb-1.5 flex items-center gap-1.5`}>
              <Icons.Info className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400" />
              {language === 'ar' ? '📌 معلومات' : '📌 Info'}
            </h3>
            <ul className={`text-[9px] sm:text-xs ${styles.subtext} space-y-1`}>
              <li className="flex items-start gap-1.5">
                <Icons.Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                {language === 'ar'
                  ? 'يسجل الجهاز تلقائياً عند مشاهدة فيديو.'
                  : 'Device is auto-registered when watching a video.'}
              </li>
              <li className="flex items-start gap-1.5">
                <Icons.Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                {language === 'ar'
                  ? `الحد الأقصى: ${stats.maxDevices} جهاز لهذا الكورس.`
                  : `Max devices: ${stats.maxDevices} for this course.`}
              </li>
              <li className="flex items-start gap-1.5">
                <Icons.Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                {language === 'ar'
                  ? 'يمكنك حذف جهاز قديم لتسجيل جهاز جديد.'
                  : 'Remove an old device to register a new one.'}
              </li>
              <li className="flex items-start gap-1.5">
                <Icons.Check className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-emerald-400 flex-shrink-0 mt-0.5" />
                {language === 'ar'
                  ? 'الجهاز الحالي مميز بـ ✓ ولا يمكن حذفه.'
                  : 'Current device marked with ✓ and cannot be removed.'}
              </li>
            </ul>
          </div>
        </WaveBorderCard>

        {/* ===== روابط سريعة – مضغوطة ===== */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 sm:gap-2">
          {[
            { href: `/dashboard/student/courses/${courseId}`, icon: Icons.Book, label: language === 'ar' ? 'الكورس' : 'Course' },
            { href: '/dashboard/student/courses', icon: Icons.Search, label: language === 'ar' ? 'كورسات' : 'Courses' },
            { href: '/dashboard/student/devices', icon: Icons.Monitor, label: language === 'ar' ? 'كل الأجهزة' : 'All Devices' },
            { href: '/dashboard/student/subscriptions', icon: Icons.Receipt, label: language === 'ar' ? 'اشتراكاتي' : 'Subs' },
            { href: '/dashboard/student/profile', icon: Icons.User, label: language === 'ar' ? 'حسابي' : 'Profile' },
            { href: '/dashboard/student/support', icon: Icons.Headphones, label: language === 'ar' ? 'الدعم' : 'Support' },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-0.5 p-2 rounded-lg ${styles.card} border ${styles.border} hover:border-blue-400/50 transition group`}
            >
              <item.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500 group-hover:scale-110 transition" />
              <span className={`text-[7px] sm:text-[9px] font-bold ${styles.text}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}