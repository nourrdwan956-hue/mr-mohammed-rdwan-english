// app/dashboard/student/layout.js
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
// ✅ استيراد فردي للأيقونات بدلاً من تحميل المكتبة بأكملها
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
} from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// عناصر القائمة الجانبية مع أيقونات محددة
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
// الشريط الجانبي – تم تصغير الأيقونات مع xs:
// ================================================================
const Sidebar = ({ user, language, toggleLanguage, theme, toggleTheme, styles, pathname, onLogout, isOpen, onToggle, isMobile, isTablet }) => {
  const isActive = (path) => pathname === path;
  const isRTL = language === 'ar';
  const sidebarPosition = isRTL ? 'right-0' : 'left-0';
  const borderSide = isRTL ? 'border-l' : 'border-r';
  const sidebarWidth = isMobile ? 'w-[260px]' : isTablet ? 'w-60' : 'w-68';

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {(isMobile || isTablet) && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-20 lg:hidden"
            />
          )}

          <motion.aside
            initial={{ x: isMobile || isTablet ? (isRTL ? 60 : -60) : 0, opacity: isMobile || isTablet ? 0 : 1 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: isMobile || isTablet ? (isRTL ? 60 : -60) : 0, opacity: isMobile || isTablet ? 0 : 1 }}
            transition={{ type: 'spring', stiffness: 350, damping: 30 }}
            className={`fixed ${sidebarPosition} top-0 h-full ${sidebarWidth} z-30 ${borderSide} border-[var(--border-color)] backdrop-blur-2xl shadow-2xl`}
            style={{ backgroundColor: 'rgba(var(--bg-primary-rgb), 0.92)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

            {(isMobile || isTablet) && (
              <button
                onClick={onToggle}
                className="absolute top-3 right-3 z-50 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
              </button>
            )}

            {/* رأس الشريط */}
            <div className="relative z-10 p-3 xs:p-4 flex items-center gap-2 xs:gap-3 border-b border-[var(--border-color)]">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className={`h-9 w-9 xs:h-10 xs:w-10 sm:h-11 sm:w-11 rounded-xl overflow-hidden shadow-lg flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-base xs:text-lg font-bold`}
              >
                {user?.avatar_url ? (
                  <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span>{user?.full_name?.charAt(0) || (language === 'ar' ? 'ط' : 'S')}</span>
                )}
              </motion.div>
              <div className="flex-1 min-w-0">
                <h2 className={`text-xs xs:text-sm sm:text-base font-bold truncate ${styles.text}`}>
                  {user?.full_name || (language === 'ar' ? 'طالب' : 'Student')}
                </h2>
                <p className={`text-[8px] xs:text-[10px] ${styles.subtext} truncate opacity-70`}>{user?.email}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className={`text-[7px] xs:text-[8px] ${styles.subtext}`}>{language === 'ar' ? 'متصل' : 'Online'}</span>
                </div>
              </div>
            </div>

            {/* روابط القائمة */}
            <nav className="relative z-10 flex-1 py-2 xs:py-3 px-2 space-y-0.5 xs:space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item, index) => {
                const active = isActive(item.path);
                const colors = getIconColor(item.color, active);
                return (
                  <Link key={item.id} href={item.path} onClick={() => (isMobile || isTablet) && onToggle()}>
                    <motion.div
                      initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      whileHover={{ scale: 1.02, x: isRTL ? -3 : 3 }}
                      className={`relative flex items-center gap-2 xs:gap-3 px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg transition-all duration-300 group ${
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
                      <div className={`relative z-10 p-1 xs:p-1.5 rounded-lg transition-colors ${active ? colors.bg : 'bg-white/5'} group-hover:scale-110 transition-transform`}>
                        <item.icon className={`h-4 w-4 xs:h-4.5 xs:w-4.5 sm:h-5 sm:w-5 ${active ? colors.text : 'text-gray-400'}`} />
                      </div>
                      <span className="relative z-10 text-[10px] xs:text-xs sm:text-sm font-medium">{item.label[language] || item.label.ar}</span>
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

            {/* الأسفل */}
            <div className="relative z-10 p-3 xs:p-4 border-t border-[var(--border-color)] space-y-1.5 xs:space-y-2">
              <Link href="/dashboard/student/profile" onClick={() => (isMobile || isTablet) && onToggle()}>
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-center gap-2 xs:gap-3 px-2 xs:px-3 py-1.5 xs:py-2 rounded-lg transition-all ${
                    pathname === '/dashboard/student/profile' 
                      ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' 
                      : `${styles.subtext} hover:bg-white/5`
                  }`}
                >
                  <User className="h-3.5 w-3.5 xs:h-4 xs:w-4" />
                  <span className="text-[10px] xs:text-xs font-medium">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
                </motion.div>
              </Link>
              
              <div className="flex items-center gap-1 xs:gap-1.5">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleLanguage}
                  className="flex-1 flex items-center justify-center gap-1 xs:gap-1.5 px-2 py-1.5 xs:py-2 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/10 transition-all text-[9px] xs:text-[10px] font-medium"
                >
                  <Globe className="h-3 w-3 xs:h-3.5 xs:w-3.5 text-blue-500" />
                  <span>{language === 'ar' ? 'EN' : 'AR'}</span>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={toggleTheme}
                  className="flex-1 flex items-center justify-center px-2 py-1.5 xs:py-2 rounded-lg bg-white/5 hover:bg-blue-500/10 border border-white/10 transition-all"
                >
                  {theme === 'dark' ? <Sun className="h-3 w-3 xs:h-3.5 xs:w-3.5 text-yellow-400" /> : <Moon className="h-3 w-3 xs:h-3.5 xs:w-3.5 text-blue-500" />}
                </motion.button>
              </div>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-1.5 xs:gap-2 px-3 py-1.5 xs:py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all font-medium text-[9px] xs:text-[10px]"
              >
                <LogOut className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
                <span>{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
              </motion.button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
};

// ================================================================
// شريط التنقل السفلي للجوال – أيقونات أصغر
// ================================================================
const MobileBottomNav = ({ language, pathname, styles }) => {
  const isActive = (path) => pathname === path;

  return (
    <motion.nav
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-20 px-1 xs:px-2 pb-1.5 pt-1 backdrop-blur-2xl border-t border-[var(--border-color)] shadow-2xl"
      style={{ backgroundColor: 'rgba(var(--bg-primary-rgb), 0.88)' }}
    >
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = isActive(item.path);
          const colors = getIconColor(item.color, active);
          return (
            <Link key={item.id} href={item.path}>
              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center gap-0.5 px-0.5 py-1 rounded-lg transition-all min-w-[44px] ${
                  active ? 'scale-105' : styles.subtext
                }`}
              >
                <div className={`p-0.5 xs:p-1 rounded-lg ${active ? colors.bg : ''}`}>
                  <item.icon className={`h-3.5 w-3.5 xs:h-4 xs:w-4 ${active ? colors.text : 'text-gray-400'}`} />
                </div>
                <span className="text-[7px] xs:text-[8px] font-medium leading-tight">{item.label[language] || item.label.ar}</span>
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
};

// ================================================================
// التخطيط الرئيسي – خلفيات مخفضة الاستهلاك
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
  
  const isExamPage = pathname?.startsWith('/dashboard/student/exams/') && !pathname?.endsWith('/result');

  useEffect(() => {
    const detectDevice = () => {
      const width = window.innerWidth;
      const mobile = width < 640;
      const tablet = width >= 640 && width < 1024;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      
      const savedPreference = localStorage.getItem('sidebarOpen');
      if (mobile || tablet) {
        setSidebarOpen(savedPreference === 'true');
      } else {
        setSidebarOpen(savedPreference !== 'false');
      }
    };

    detectDevice();
    window.addEventListener('resize', detectDevice);
    return () => window.removeEventListener('resize', detectDevice);
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      const newState = !prev;
      localStorage.setItem('sidebarOpen', newState.toString());
      return newState;
    });
  }, []);

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

  const handleLogout = async () => {
    await supabase.auth.signOut();
    sessionStorage.clear();
    localStorage.removeItem('registerData');
    toast.success(language === 'ar' ? 'تم تسجيل الخروج' : 'Logged out successfully');
    router.replace('/login');
  };

  if (loading) return (
    <div className="h-dvh w-full flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 xs:w-12 xs:h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-6 h-6 xs:w-8 xs:h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl shadow-blue-500/30"
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
  const getMainMargin = () => {
    if (isExamPage) return '';
    if (isMobile || isTablet) return '';
    if (!sidebarOpen) return '';
    return isRTL ? 'lg:mr-72' : 'lg:ml-72';
  };

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="h-dvh w-full flex flex-col overflow-hidden">
      {/* خلفية مخفضة الاستهلاك */}
      <div className="fixed inset-0 -z-10 bg-[var(--bg-primary)]">
        <motion.div
          animate={{ x: ['-3%', '3%', '-3%'], y: ['-3%', '3%', '-3%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 right-0 w-[300px] h-[300px] xs:w-[400px] xs:h-[400px] bg-blue-500/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: ['3%', '-3%', '3%'], y: ['3%', '-3%', '3%'] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-0 left-0 w-[400px] h-[400px] xs:w-[500px] xs:h-[500px] bg-green-500/5 rounded-full blur-3xl"
        />
      </div>

      {/* زر التحكم في الشريط الجانبي */}
      {!isExamPage && (
        <button
          onClick={toggleSidebar}
          className={`fixed z-40 p-1.5 xs:p-2 rounded-lg bg-white/10 backdrop-blur-lg border border-white/20 shadow-lg hover:bg-white/20 transition-all ${
            isRTL ? 'right-2 xs:right-3' : 'left-2 xs:left-3'
          } ${isMobile || isTablet ? 'bottom-14 xs:bottom-16' : 'top-2 xs:top-3'}`}
          title={sidebarOpen ? (language === 'ar' ? 'إخفاء القائمة' : 'Hide Menu') : (language === 'ar' ? 'إظهار القائمة' : 'Show Menu')}
        >
          {sidebarOpen ? (
            <PanelRightClose className={`h-3.5 w-3.5 xs:h-4 xs:w-4 ${isRTL ? 'rotate-180' : ''}`} />
          ) : (
            <PanelRightOpen className={`h-3.5 w-3.5 xs:h-4 xs:w-4 ${isRTL ? 'rotate-180' : ''}`} />
          )}
        </button>
      )}

      {/* الشريط الجانبي */}
      {!isExamPage && (
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
        />
      )}

      {/* المحتوى الرئيسي */}
      <main
        className={`flex-1 overflow-y-auto pb-16 xs:pb-16 lg:pb-0 ${getMainMargin()}`}
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* شريط التنقل السفلي */}
      {!isExamPage && (isMobile || isTablet) && (
        <MobileBottomNav language={language} pathname={pathname} styles={styles} />
      )}
    </div>
  );
}