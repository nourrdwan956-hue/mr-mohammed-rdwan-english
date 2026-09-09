// app/dashboard/student/layout.js
// ================================================================
// 🏛️ تخطيط جهة الطالب – نسخة فاخرة، موحدة، وسريعة جداً
// ✅ تقليص المسافة بين الشريط الجانبي والمحتوى إلى أقصى حد
// ✅ زر ثيم متطور (نصف قمر/شمس مع لون ذهبي وتأثير زجاجي)
// ✅ إخفاء الشريط الجانبي في صفحات الامتحانات مع زر تحكم واضح
// ✅ تعطيل كل تأثيرات التهنيج على الموبايل (backdrop-filter, animations, shadows)
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback, memo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  HelpCircle,
  StickyNote,
  Calendar,
  Receipt,
  Monitor,
  CreditCard,
  X,
  User,
  Globe,
  Sun,
  Moon,
  LogOut,
  PanelRightClose,
  PanelRightOpen,
  Menu,
  Sparkles,
} from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// 🧾 عناصر القائمة الجانبية
// ================================================================
const NAV_ITEMS = [
  { id: 'dashboard', label: { ar: 'الرئيسية', en: 'Dashboard' }, path: '/dashboard/student', icon: LayoutDashboard, color: 'blue' },
  { id: 'courses', label: { ar: 'كورساتي', en: 'Courses' }, path: '/dashboard/student/courses', icon: BookOpen, color: 'green' },
  { id: 'progress', label: { ar: 'تقدّمي', en: 'Progress' }, path: '/dashboard/student/progress', icon: TrendingUp, color: 'orange' },
  { id: 'support', label: { ar: 'الدعم', en: 'Support' }, path: '/dashboard/student/support', icon: HelpCircle, color: 'red' },
  { id: 'notes', label: { ar: 'ملاحظاتي', en: 'Notes' }, path: '/dashboard/student/notes', icon: StickyNote, color: 'blue' },
  { id: 'schedule', label: { ar: 'جدول المذاكرة', en: 'Schedule' }, path: '/dashboard/student/study-schedule', icon: Calendar, color: 'green' },
  { id: 'subscriptions', label: { ar: 'اشتراكاتي', en: 'Subscriptions' }, path: '/dashboard/student/subscriptions', icon: Receipt, color: 'purple' },
  { id: 'devices', label: { ar: 'أجهزتي', en: 'My Devices' }, path: '/dashboard/student/devices', icon: Monitor, color: 'teal' },
  { id: 'payment-history', label: { ar: 'سجل المدفوعات', en: 'Payment History' }, path: '/dashboard/student/payment-history', icon: CreditCard, color: 'orange' },
];

const getIconColor = (color, active) => {
  const base = {
    blue: { bg: 'bg-blue-500/15', text: 'text-blue-500', border: 'border-blue-500/30' },
    green: { bg: 'bg-green-500/15', text: 'text-green-500', border: 'border-green-500/30' },
    orange: { bg: 'bg-orange-500/15', text: 'text-orange-500', border: 'border-orange-500/30' },
    red: { bg: 'bg-red-500/15', text: 'text-red-500', border: 'border-red-500/30' },
    purple: { bg: 'bg-purple-500/15', text: 'text-purple-500', border: 'border-purple-500/30' },
    teal: { bg: 'bg-teal-500/15', text: 'text-teal-500', border: 'border-teal-500/30' },
  };
  const c = base[color] || base.blue;
  return active ? c : { bg: 'bg-white/5', text: 'text-gray-400', border: 'border-transparent' };
};

// ================================================================
// 🌗 زر التبديل بين الثيم – نسخة متطورة
// ================================================================
const ThemeToggle = ({ theme, toggleTheme, styles, isMobile }) => {
  const isDark = theme === 'dark';

  return (
    <motion.button
      whileHover={!isMobile ? { scale: 1.05 } : {}}
      whileTap={{ scale: 0.92 }}
      onClick={toggleTheme}
      className={`relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all duration-300 group
        ${isDark 
          ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/10 border-yellow-400/30 text-yellow-400' 
          : 'bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-400/20 text-blue-600'
        } border shadow-sm hover:shadow-md w-full justify-center`}
      title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
    >
      {/* الخلفية الزجاجية */}
      <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 
        ${isDark ? 'bg-yellow-400/5' : 'bg-blue-400/5'} 
        ${!isMobile ? 'backdrop-blur-sm' : ''}`} />

      <div className="relative flex items-center gap-2 z-10">
        {/* الأيقونة المتغيرة مع تأثير */}
        <motion.div
          initial={false}
          animate={{ rotate: isDark ? 360 : 0 }}
          transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
          className="relative"
        >
          {isDark ? (
            <Sun className="h-4 w-4 text-yellow-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" />
          ) : (
            <Moon className="h-4 w-4 text-blue-500 drop-shadow-[0_0_6px_rgba(59,130,246,0.3)]" />
          )}
        </motion.div>

        {/* النص */}
        <span className={`text-[10px] xs:text-xs font-bold ${isDark ? 'text-yellow-400' : 'text-blue-600'}`}>
          {isDark ? (window.navigator.language?.startsWith('ar') ? 'فاتح' : 'Light') : (window.navigator.language?.startsWith('ar') ? 'داكن' : 'Dark')}
        </span>

        {/* شرارة صغيرة (تأثير فاخر) */}
        {!isMobile && (
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4], scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1"
          >
            <Sparkles className={`h-2.5 w-2.5 ${isDark ? 'text-yellow-400/60' : 'text-blue-400/60'}`} />
          </motion.span>
        )}
      </div>
    </motion.button>
  );
};

// ================================================================
// 📱 زر تبديل اللغة – مصغر وأنيق
// ================================================================
const LanguageToggle = ({ language, toggleLanguage, styles, isMobile }) => {
  const isArabic = language === 'ar';

  return (
    <motion.button
      whileHover={!isMobile ? { scale: 1.05 } : {}}
      whileTap={{ scale: 0.92 }}
      onClick={toggleLanguage}
      className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all duration-300 group
        ${isArabic 
          ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-600' 
          : 'bg-purple-500/10 border-purple-400/20 text-purple-600'
        } border shadow-sm hover:shadow-md w-full justify-center`}
      title={isArabic ? 'English' : 'العربية'}
    >
      <div className={`absolute inset-0 rounded-xl transition-opacity duration-300 
        ${isArabic ? 'bg-emerald-400/5' : 'bg-purple-400/5'} 
        ${!isMobile ? 'backdrop-blur-sm' : ''}`} />

      <div className="relative flex items-center gap-1.5 z-10">
        <Globe className={`h-3.5 w-3.5 ${isArabic ? 'text-emerald-500' : 'text-purple-500'}`} />
        <span className={`text-[10px] xs:text-xs font-bold ${isArabic ? 'text-emerald-600' : 'text-purple-600'}`}>
          {isArabic ? 'EN' : 'AR'}
        </span>
      </div>
    </motion.button>
  );
};

// ================================================================
// 🧭 الشريط الجانبي الرئيسي – مع تقليص المسافة بشكل كبير
// ================================================================
const Sidebar = memo(({
  user,
  language,
  toggleLanguage,
  theme,
  toggleTheme,
  styles,
  pathname,
  onLogout,
  isOpen,
  onToggle,
  isMobile,
  isTablet,
  isExamPage
}) => {
  const isActive = (path) => pathname === path;
  const isRTL = language === 'ar';
  const sidebarPosition = isRTL ? 'right-0' : 'left-0';
  const borderSide = isRTL ? 'border-l' : 'border-r';
  // ✅ تقليص العرض بشكل كبير على الديسكتوب (من w-68 إلى w-56 = 224px)
  const sidebarWidth = isMobile ? 'w-[260px]' : isTablet ? 'w-56' : 'w-56';

  // إذا كانت صفحة امتحان، نُخفي الشريط تماماً
  if (isExamPage) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* الخلفية المظللة (للموبايل والتابلت) */}
          {(isMobile || isTablet) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/30 z-20 lg:hidden"
              style={{ backdropFilter: isMobile ? 'none' : 'blur(4px)' }}
            />
          )}

          <motion.aside
            initial={{ x: isMobile || isTablet ? (isRTL ? 60 : -60) : 0, opacity: isMobile || isTablet ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile || isTablet ? (isRTL ? 60 : -60) : 0, opacity: isMobile || isTablet ? 0 : 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className={`fixed ${sidebarPosition} top-0 h-full ${sidebarWidth} z-30 ${borderSide} shadow-2xl overflow-hidden`}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              // ✅ على الموبايل نُزيل أي تأثير زجاجي
              backdropFilter: isMobile ? 'none' : 'blur(12px)',
              WebkitBackdropFilter: isMobile ? 'none' : 'blur(12px)',
            }}
          >
            {/* تدرج خلفية فاخر */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            {/* زر إغلاق (للموبايل والتابلت) */}
            {(isMobile || isTablet) && (
              <button
                onClick={onToggle}
                className="absolute top-3 right-3 z-50 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* ===== رأس الشريط (مضغوط) ===== */}
            <div className="relative z-10 p-3 flex items-center gap-2.5 border-b border-[var(--border-color)]">
              <motion.div
                whileHover={!isMobile ? { scale: 1.05 } : {}}
                className="h-9 w-9 rounded-xl overflow-hidden shadow-md flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-base font-bold"
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.full_name?.charAt(0)?.toUpperCase() || (language === 'ar' ? 'ط' : 'S')}</span>
                )}
              </motion.div>
              <div className="flex-1 min-w-0">
                <h2 className={`text-xs sm:text-sm font-bold truncate ${styles.text}`}>
                  {user?.full_name || (language === 'ar' ? 'طالب' : 'Student')}
                </h2>
                <p className={`text-[8px] ${styles.subtext} truncate opacity-60`}>{user?.email}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className={`text-[7px] ${styles.subtext}`}>{language === 'ar' ? 'متصل' : 'Online'}</span>
                </div>
              </div>
            </div>

            {/* ===== قائمة الروابط ===== */}
            <nav className="relative z-10 flex-1 py-2 px-2 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map((item, index) => {
                const active = isActive(item.path);
                const colors = getIconColor(item.color, active);
                return (
                  <Link key={item.id} href={item.path} onClick={() => (isMobile || isTablet) && onToggle()}>
                    <motion.div
                      initial={{ opacity: 0, x: isRTL ? 10 : -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={!isMobile ? { scale: 1.02, x: isRTL ? -2 : 2 } : {}}
                      className={`relative flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all duration-200 group ${
                        active ? `font-bold shadow-sm ${colors.bg} ${colors.border} border` : `${styles.subtext} hover:bg-white/5`
                      }`}
                    >
                      {active && (
                        <motion.div
                          layoutId="sidebarActive"
                          className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent rounded-lg"
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}
                      <div className={`relative z-10 p-1 rounded-lg transition-colors ${active ? colors.bg : 'bg-white/5'}`}>
                        <item.icon className={`h-4 w-4 ${active ? colors.text : 'text-gray-400'}`} />
                      </div>
                      <span className="relative z-10 text-[10px] xs:text-xs font-medium">{item.label[language] || item.label.ar}</span>
                      {active && (
                        <motion.div
                          layoutId="activeDot"
                          className={`h-1.5 w-1.5 rounded-full ${colors.text} ${isRTL ? 'mr-auto' : 'ml-auto'} relative z-10`}
                        />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </nav>

            {/* ===== الأسفل (الملف الشخصي + الثيم + اللغة + خروج) ===== */}
            <div className="relative z-10 p-3 border-t border-[var(--border-color)] space-y-1.5">
              <Link href="/dashboard/student/profile" onClick={() => (isMobile || isTablet) && onToggle()}>
                <motion.div
                  whileHover={!isMobile ? { scale: 1.02 } : {}}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-all ${
                    pathname === '/dashboard/student/profile'
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                      : `${styles.subtext} hover:bg-white/5`
                  }`}
                >
                  <User className="h-3.5 w-3.5" />
                  <span className="text-[10px] xs:text-xs font-medium">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
                </motion.div>
              </Link>

              {/* ✅ أزرار الثيم واللغة – متطورة ومتجاورة */}
              <div className="grid grid-cols-2 gap-1.5">
                <ThemeToggle theme={theme} toggleTheme={toggleTheme} styles={styles} isMobile={isMobile} />
                <LanguageToggle language={language} toggleLanguage={toggleLanguage} styles={styles} isMobile={isMobile} />
              </div>

              {/* زر تسجيل الخروج */}
              <motion.button
                whileHover={!isMobile ? { scale: 1.02 } : {}}
                whileTap={{ scale: 0.95 }}
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all font-medium text-[9px] xs:text-[10px]"
              >
                <LogOut className="h-3 w-3" />
                <span>{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
              </motion.button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
});

Sidebar.displayName = 'Sidebar';

// ================================================================
// 📱 شريط التنقل السفلي – للجوال فقط (مضغوط جداً)
// ================================================================
const MobileBottomNav = memo(({ language, pathname, styles, isMobile }) => {
  const isActive = (path) => pathname === path;

  return (
    <motion.nav
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 350, damping: 30 }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-1 pb-1.5 pt-1 border-t border-[var(--border-color)] shadow-lg"
      style={{
        backgroundColor: 'var(--bg-card)',
        backdropFilter: isMobile ? 'none' : 'blur(12px)',
        WebkitBackdropFilter: isMobile ? 'none' : 'blur(12px)',
      }}
    >
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = isActive(item.path);
          const colors = getIconColor(item.color, active);
          return (
            <Link key={item.id} href={item.path}>
              <motion.div
                whileTap={{ scale: 0.88 }}
                className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-lg transition-all min-w-[44px] ${
                  active ? 'scale-105' : ''
                }`}
              >
                <div className={`p-0.5 rounded-lg ${active ? colors.bg : ''}`}>
                  <item.icon className={`h-3.5 w-3.5 ${active ? colors.text : 'text-gray-400'}`} />
                </div>
                <span className={`text-[7px] font-medium leading-tight ${active ? styles.text : styles.subtext}`}>
                  {item.label[language] || item.label.ar}
                </span>
                {active && (
                  <motion.div
                    layoutId="mobileIndicator"
                    className={`h-0.5 w-3 rounded-full ${colors.text}`}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>
    </motion.nav>
  );
});

MobileBottomNav.displayName = 'MobileBottomNav';

// ================================================================
// 🏛️ التخطيط الرئيسي
// ================================================================
export default function StudentLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // كشف صفحات الامتحان
  const isExamPage = pathname?.startsWith('/dashboard/student/exams/') && !pathname?.endsWith('/result');

  // ===== كشف حجم الجهاز =====
  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const mobile = width < 640;
      const tablet = width >= 640 && width < 1024;

      setIsMobile(mobile);
      setIsTablet(tablet);

      // على الموبايل والتابلت، نغلق الشريط افتراضياً (إلا إذا كان مخزناً مفتوحاً)
      const savedPreference = localStorage.getItem('sidebarOpen');
      if (mobile || tablet) {
        setSidebarOpen(savedPreference === 'true');
      } else {
        // على الديسكتوب، نفتحه افتراضياً
        setSidebarOpen(savedPreference !== 'false');
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  // ===== تبديل حالة الشريط الجانبي =====
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarOpen', newState.toString());
      return newState;
    });
  }, []);

  // ===== جلب بيانات المستخدم =====
  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    const getUser = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) { router.replace('/login'); return; }
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', authUser.id).single();
        setUser({
          id: authUser.id,
          email: authUser.email,
          full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
          phone: profile?.phone || '',
          grade: profile?.grade || '',
          school: profile?.school || '',
          avatar_url: profile?.avatar_url || '',
        });
      } catch (err) {
        console.error(err);
        toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    getUser();
  }, [router, language]);

  // ===== تسجيل الخروج =====
  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('registerData');
    toast.success(language === 'ar' ? 'تم تسجيل الخروج' : 'Logged out successfully');
    router.replace('/login');
  };

  // ===== شاشة التحميل =====
  if (loading) return (
    <div className="h-dvh w-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl shadow-blue-500/30"
            />
          </div>
        </div>
        <p className={`text-[10px] xs:text-xs font-semibold ${styles.subtext}`}>
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </p>
      </div>
    </div>
  );

  const isRTL = language === 'ar';

  // ===== حساب الهامش للمحتوى =====
  // ✅ تقليص المسافة بشكل كبير (من mr-72 إلى mr-56 = 224px)
  // ✅ الحفاظ على مسافة صغيرة جداً بين الشريط والمحتوى
  const getMainMargin = () => {
    if (isExamPage) return ''; // صفحات الامتحان بدون هامش
    if (isMobile || isTablet) return ''; // الموبايل والتابلت بدون هامش (الشريط منبثق)
    if (!sidebarOpen) return '';
    // ✅ تقليص المسافة من 72 إلى 56 (أي من 288px إلى 224px)
    return isRTL ? 'lg:mr-56' : 'lg:ml-56';
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="h-dvh w-full flex flex-col overflow-hidden">
      {/* ===== خلفية ثابتة (خفيفة جداً على الموبايل) ===== */}
      <div className="fixed inset-0 -z-10" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {!isMobile && (
          <>
            <motion.div
              animate={{ x: ['-3%', '3%', '-3%'], y: ['-3%', '3%', '-3%'] }}
              transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              className="absolute top-0 right-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ x: ['3%', '-3%', '3%'], y: ['3%', '-3%', '3%'] }}
              transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
              className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-green-500/5 rounded-full blur-3xl"
            />
            <motion.div
              animate={{ x: ['0%', '2%', '0%'], y: ['0%', '2%', '0%'] }}
              transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
              className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-yellow-500/5 rounded-full blur-3xl"
            />
          </>
        )}
      </div>

      {/* ===== زر التحكم في الشريط الجانبي (ظاهر دائماً ما عدا صفحات الامتحان) ===== */}
      {!isExamPage && (
        <button
          onClick={toggleSidebar}
          className={`fixed z-40 p-1.5 rounded-xl transition-all duration-300
            ${isMobile || isTablet ? 'bottom-16' : 'top-3'}
            ${isRTL ? 'right-2' : 'left-2'}
            ${sidebarOpen ? 'bg-yellow-400/20 text-yellow-500 border border-yellow-400/30' : 'bg-white/10 border border-white/20 text-gray-400'}
            hover:scale-105 hover:shadow-lg backdrop-blur-sm
          `}
          title={sidebarOpen ? (language === 'ar' ? 'إخفاء القائمة' : 'Hide Menu') : (language === 'ar' ? 'إظهار القائمة' : 'Show Menu')}
        >
          {sidebarOpen ? (
            <PanelRightClose className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          ) : (
            <PanelRightOpen className={`h-3.5 w-3.5 ${isRTL ? 'rotate-180' : ''}`} />
          )}
        </button>
      )}

      {/* ===== زر إظهار القائمة في صفحات الامتحان (للجوال) ===== */}
      {isExamPage && (isMobile || isTablet) && (
        <button
          onClick={toggleSidebar}
          className="fixed z-40 bottom-16 left-2 p-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-400/30 backdrop-blur-sm hover:scale-105 transition-all"
          title={language === 'ar' ? 'إظهار القائمة' : 'Show Menu'}
        >
          <Menu className="h-4 w-4" />
        </button>
      )}

      {/* ===== الشريط الجانبي ===== */}
      <Sidebar
        user={user}
        language={language}
        toggleLanguage={toggleLanguage}
        theme={theme}
        toggleTheme={toggleTheme}
        styles={styles}
        pathname={pathname}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onToggle={toggleSidebar}
        isMobile={isMobile}
        isTablet={isTablet}
        isExamPage={isExamPage}
      />

      {/* ===== المحتوى الرئيسي ===== */}
      <main
        className={`flex-1 overflow-y-auto ${getMainMargin()} transition-all duration-300 ease-in-out`}
        style={{
          backgroundColor: 'var(--bg-primary)',
          // ✅ على الموبايل نضيف padding سفلي لشريط التنقل
          paddingBottom: (isMobile || isTablet) && !isExamPage ? '64px' : '0',
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ===== شريط التنقل السفلي (للموبايل والتابلت فقط) ===== */}
      {!isExamPage && (isMobile || isTablet) && (
        <MobileBottomNav language={language} pathname={pathname} styles={styles} isMobile={isMobile} />
      )}
    </div>
  );
}