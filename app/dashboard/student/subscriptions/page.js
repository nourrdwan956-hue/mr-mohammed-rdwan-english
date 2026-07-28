// app/dashboard/student/subscriptions/page.js
// ================================================================
// 📋 صفحة اشتراكاتي – عرض جميع الكورسات المشترك فيها الطالب
// ================================================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';
import Link from 'next/link';

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
// 🌊 مكون الحدود الموجية (Wave Border)
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
    <div className={`relative rounded-3xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-3xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// مكون بطاقة الاشتراك
// ================================================================
const SubscriptionCard = ({ subscription, onManageDevices, styles, language, isDark }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const [isHovered, setIsHovered] = useState(false);
  const handleColorChange = (newColor) => setColor(newColor);

  const isActive = subscription.is_active;
  const accessTypeMap = {
    paid: { label: language === 'ar' ? 'مدفوع' : 'Paid', icon: Icons.CreditCard, color: 'text-blue-400' },
    code: { label: language === 'ar' ? 'كود شحن' : 'Access Code', icon: Icons.Key, color: 'text-purple-400' },
    free: { label: language === 'ar' ? 'مجاني' : 'Free', icon: Icons.Gift, color: 'text-green-400' },
  };
  const typeInfo = accessTypeMap[subscription.access_type] || accessTypeMap.free;
  const TypeIcon = typeInfo.icon;

  const expiresAt = subscription.expires_at
    ? new Date(subscription.expires_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : language === 'ar' ? 'غير محدد' : 'N/A';

  const isExpired = subscription.expires_at && new Date(subscription.expires_at) < new Date();

  const statusColor = isExpired
    ? 'text-red-400 bg-red-400/10 border-red-400/30'
    : isActive
    ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30'
    : 'text-gray-400 bg-gray-400/10 border-gray-400/30';

  const statusLabel = isExpired
    ? language === 'ar' ? 'منتهي' : 'Expired'
    : isActive
    ? language === 'ar' ? 'نشط' : 'Active'
    : language === 'ar' ? 'غير نشط' : 'Inactive';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-5 flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${color.bg}`}>
                <Icons.BookOpen className={`h-6 w-6 ${color.text}`} />
              </div>
              <div>
                <h3 className={`text-lg font-bold ${styles.text}`}>
                  {subscription.courses?.title || language === 'ar' ? 'كورس' : 'Course'}
                </h3>
                <p className={`text-sm ${styles.subtext}`}>
                  {subscription.courses?.teacher?.full_name || language === 'ar' ? 'المعلم' : 'Teacher'}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className={`text-xs px-2.5 py-0.5 rounded-full border ${statusColor}`}>
                {statusLabel}
              </span>
              <span className={`text-xs ${typeInfo.color} flex items-center gap-1`}>
                <TypeIcon className="h-3.5 w-3.5" />
                {typeInfo.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className={`p-2 rounded-xl ${styles.card} border ${styles.border} text-center`}>
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'الأجهزة' : 'Devices'}</p>
              <p className={`font-bold ${styles.text}`}>{subscription.max_devices || 2}</p>
            </div>
            <div className={`p-2 rounded-xl ${styles.card} border ${styles.border} text-center`}>
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'النوع' : 'Type'}</p>
              <p className={`font-bold ${styles.text}`}>{subscription.access_type === 'paid' ? '💳' : subscription.access_type === 'code' ? '🎫' : '🎁'}</p>
            </div>
            <div className={`p-2 rounded-xl ${styles.card} border ${styles.border} text-center col-span-2 sm:col-span-1`}>
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'ينتهي' : 'Expires'}</p>
              <p className={`font-bold ${isExpired ? 'text-red-400' : styles.text}`}>{expiresAt}</p>
            </div>
            <div className={`p-2 rounded-xl ${styles.card} border ${styles.border} text-center col-span-2 sm:col-span-1`}>
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'التفعيل' : 'Activated'}</p>
              <p className={`font-bold ${styles.text}`}>
                {new Date(subscription.activated_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
                  month: 'short', day: 'numeric',
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-color)]">
            <Link
              href={`/dashboard/student/courses/${subscription.course_id}`}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-blue-500/30 text-sm text-center"
            >
              <Icons.Eye className="h-4 w-4 inline mr-1.5" />
              {language === 'ar' ? 'متابعة الكورس' : 'View Course'}
            </Link>
            <button
              onClick={() => onManageDevices(subscription.course_id)}
              className="px-4 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition text-sm font-bold flex items-center gap-1.5"
            >
              <Icons.Monitor className="h-4 w-4" />
              {language === 'ar' ? 'الأجهزة' : 'Devices'}
            </button>
          </div>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// الصفحة الرئيسية – اشتراكاتي
// ================================================================
export default function StudentSubscriptionsPage() {
  const router = useRouter();
  const { theme, language, styles } = useTheme();
  const isDark = theme === 'dark';

  const [subscriptions, setSubscriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // all, active, expired

  // ألوان متغيرة للرأس
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  // ===== جلب البيانات =====
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('course_subscriptions')
        .select(`
          *,
          courses:course_id (
            id,
            title,
            cover_image,
            teacher:teacher_id (full_name)
          )
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err) {
      console.error('Error fetching subscriptions:', err);
      setError(language === 'ar' ? 'فشل تحميل الاشتراكات' : 'Failed to load subscriptions');
      toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [router, language]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // ===== الفلترة =====
  const filteredSubscriptions = useMemo(() => {
    if (filter === 'all') return subscriptions;
    if (filter === 'active') {
      return subscriptions.filter(s => s.is_active && (!s.expires_at || new Date(s.expires_at) > new Date()));
    }
    if (filter === 'expired') {
      return subscriptions.filter(s => !s.is_active || (s.expires_at && new Date(s.expires_at) <= new Date()));
    }
    return subscriptions;
  }, [subscriptions, filter]);

  // ===== الإحصائيات =====
  const stats = useMemo(() => {
    const total = subscriptions.length;
    const active = subscriptions.filter(s => s.is_active && (!s.expires_at || new Date(s.expires_at) > new Date())).length;
    const expired = subscriptions.filter(s => !s.is_active || (s.expires_at && new Date(s.expires_at) <= new Date())).length;
    const paid = subscriptions.filter(s => s.access_type === 'paid').length;
    const code = subscriptions.filter(s => s.access_type === 'code').length;
    return { total, active, expired, paid, code };
  }, [subscriptions]);

  const handleManageDevices = (courseId) => {
    router.push(`/dashboard/student/devices?courseId=${courseId}`);
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`text-sm ${styles.subtext}`}>
            {language === 'ar' ? 'جاري تحميل اشتراكاتك...' : 'Loading your subscriptions...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center p-4 ${styles.bg}`}>
        <div className={`max-w-md w-full p-8 rounded-3xl ${styles.card} border ${styles.border} text-center shadow-2xl`}>
          <div className="inline-flex p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.XCircle className="h-12 w-12 text-red-400" />
          </div>
          <h2 className={`text-xl font-bold ${styles.text} mt-4`}>
            {language === 'ar' ? 'حدث خطأ' : 'Error'}
          </h2>
          <p className={`${styles.subtext} mt-2`}>{error}</p>
          <button
            onClick={fetchSubscriptions}
            className="mt-6 px-6 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition"
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
        className="fixed -top-60 -right-60 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[900px] h-[900px] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ===== رأس الصفحة ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-black ${styles.text}`}>
                {language === 'ar' ? '📋 اشتراكاتي' : '📋 My Subscriptions'}
              </h1>
              <p className={`text-base ${styles.subtext} mt-1`}>
                {language === 'ar'
                  ? `لديك ${stats.total} اشتراك (${stats.active} نشط، ${stats.expired} منتهي)`
                  : `You have ${stats.total} subscription(s) (${stats.active} active, ${stats.expired} expired)`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={fetchSubscriptions}
                className={`p-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition`}
                title={language === 'ar' ? 'تحديث' : 'Refresh'}
              >
                <Icons.RefreshCw className="h-5 w-5 text-blue-400" />
              </button>
              <button
                onClick={() => router.push('/dashboard/student')}
                className={`px-4 py-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition text-sm font-bold ${styles.text}`}
              >
                <Icons.ArrowLeft className="h-4 w-4 inline mr-1" />
                {language === 'ar' ? 'الرئيسية' : 'Home'}
              </button>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== إحصائيات سريعة ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold ${styles.text}`}>{stats.total}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
          </div>
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold text-emerald-400`}>{stats.active}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'نشط' : 'Active'}</p>
          </div>
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold text-red-400`}>{stats.expired}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'منتهي' : 'Expired'}</p>
          </div>
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold text-blue-400`}>{stats.paid}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'مدفوع' : 'Paid'}</p>
          </div>
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold text-purple-400`}>{stats.code}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'كود' : 'Code'}</p>
          </div>
        </div>

        {/* ===== فلترة ===== */}
        <div className="flex flex-wrap gap-2">
          {['all', 'active', 'expired'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition ${
                filter === f
                  ? 'bg-blue-500/20 text-blue-500 border border-blue-500/30'
                  : `${styles.card} border ${styles.border} ${styles.subtext} hover:border-blue-400/50`
              }`}
            >
              {f === 'all'
                ? language === 'ar' ? 'الكل' : 'All'
                : f === 'active'
                ? language === 'ar' ? 'نشطة' : 'Active'
                : language === 'ar' ? 'منتهية' : 'Expired'}
            </button>
          ))}
        </div>

        {/* ===== قائمة الاشتراكات ===== */}
        {filteredSubscriptions.length === 0 ? (
          <div className={`text-center py-20 ${styles.card} border ${styles.border} rounded-3xl`}>
            <Icons.Inbox className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <h3 className={`text-2xl font-bold ${styles.text}`}>
              {filter === 'all'
                ? (language === 'ar' ? 'لا توجد اشتراكات' : 'No subscriptions')
                : filter === 'active'
                ? (language === 'ar' ? 'لا توجد اشتراكات نشطة' : 'No active subscriptions')
                : (language === 'ar' ? 'لا توجد اشتراكات منتهية' : 'No expired subscriptions')}
            </h3>
            <p className={`text-base ${styles.subtext} mt-2`}>
              {filter === 'all'
                ? (language === 'ar' ? 'اشترك في كورس مدفوع أو استخدم كود شحن' : 'Subscribe to a paid course or use an access code')
                : filter === 'active'
                ? (language === 'ar' ? 'يمكنك الاشتراك في كورس جديد من صفحة الكورسات' : 'You can subscribe to a new course from the courses page')
                : (language === 'ar' ? 'لا توجد اشتراكات منتهية' : 'No expired subscriptions')}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => router.push('/dashboard/student/courses')}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-105 transition shadow-2xl shadow-yellow-400/30"
              >
                {language === 'ar' ? 'استعرض الكورسات' : 'Browse Courses'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSubscriptions.map((sub) => (
              <SubscriptionCard
                key={sub.id}
                subscription={sub}
                onManageDevices={handleManageDevices}
                styles={styles}
                language={language}
                isDark={isDark}
              />
            ))}
          </div>
        )}

        {/* ===== روابط سريعة ===== */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { href: '/dashboard/student', icon: Icons.Home, label: language === 'ar' ? 'الرئيسية' : 'Home' },
            { href: '/dashboard/student/courses', icon: Icons.Book, label: language === 'ar' ? 'الكورسات' : 'Courses' },
            { href: '/dashboard/student/devices', icon: Icons.Monitor, label: language === 'ar' ? 'الأجهزة' : 'Devices' },
            { href: '/dashboard/student/payment-history', icon: Icons.Receipt, label: language === 'ar' ? 'المدفوعات' : 'Payments' },
            { href: '/dashboard/student/profile', icon: Icons.User, label: language === 'ar' ? 'حسابي' : 'Profile' },
            { href: '/dashboard/student/support', icon: Icons.Headphones, label: language === 'ar' ? 'الدعم' : 'Support' },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition group`}
            >
              <item.icon className="h-5 w-5 text-blue-500 group-hover:scale-110 transition" />
              <span className={`text-xs font-bold ${styles.text}`}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}