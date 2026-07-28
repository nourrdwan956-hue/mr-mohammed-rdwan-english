// app/dashboard/student/layout.js (أو الملف المسمى StudentLayout)
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// عناصر القائمة الجانبية مع ألوان محددة لكل أيقونة
// ✅ تم إصلاح مشكلة 'Devices' -> 'Monitor' أو 'Smartphone'
// ✅ تم التأكد من أن جميع الأيقونات موجودة في lucide-react
// ================================================================
const NAV_ITEMS = [
  { id: 'dashboard', label: { ar: 'الرئيسية', en: 'Dashboard' }, path: '/dashboard/student', icon: Icons.LayoutDashboard, color: 'blue' },
  { id: 'courses', label: { ar: 'كورساتي', en: 'Courses' }, path: '/dashboard/student/courses', icon: Icons.BookOpen, color: 'green' },
  { id: 'progress', label: { ar: 'تقدّمي', en: 'Progress' }, path: '/dashboard/student/progress', icon: Icons.TrendingUp, color: 'orange' },
  { id: 'support', label: { ar: 'الدعم', en: 'Support' }, path: '/dashboard/student/support', icon: Icons.HelpCircle, color: 'red' },
  { id: 'notes', label: { ar: 'ملاحظاتي', en: 'Notes' }, path: '/dashboard/student/notes', icon: Icons.StickyNote, color: 'blue' },
  { id: 'schedule', label: { ar: 'جدول المذاكرة', en: 'Schedule' }, path: '/dashboard/student/study-schedule', icon: Icons.Calendar, color: 'green' },
  { id: 'subscriptions', label: { ar: 'اشتراكاتي', en: 'Subscriptions' }, path: '/dashboard/student/subscriptions', icon: Icons.Receipt, color: 'purple' },
  { id: 'devices', label: { ar: 'أجهزتي', en: 'My Devices' }, path: '/dashboard/student/devices', icon: Icons.Monitor, color: 'teal' },
  { id: 'payment-history', label: { ar: 'سجل المدفوعات', en: 'Payment History' }, path: '/dashboard/student/payment-history', icon: Icons.CreditCard, color: 'orange' },
];

// دالة للحصول على لون الأيقونة حسب القسم
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
// الشريط الجانبي للحاسوب – بدون أي شريط علوي
// ================================================================
const DesktopSidebar = ({ user, language, toggleLanguage, theme, toggleTheme, styles, pathname, onLogout }) => {
  const isActive = (path) => pathname === path;
  const isRTL = language === 'ar';
  const sidebarPosition = isRTL ? 'right-0' : 'left-0';
  const borderSide = isRTL ? 'border-l' : 'border-r';

  return (
    <motion.aside
      initial={{ x: isRTL ? 80 : -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
      className={`hidden lg:flex flex-col fixed ${sidebarPosition} top-0 h-full w-96 z-30 ${borderSide} border-[var(--border-color)] backdrop-blur-2xl shadow-2xl`}
      style={{ backgroundColor: 'rgba(var(--bg-primary-rgb), 0.88)' }}
    >
      {/* خلفية موحدة */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

      {/* رأس الشريط – يحتوي على صورة المستخدم واسمه */}
      <div className="relative z-10 p-6 flex items-center gap-4 border-b border-[var(--border-color)]">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="h-14 w-14 rounded-2xl overflow-hidden shadow-lg flex-shrink-0 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-2xl font-bold"
        >
          {user?.avatar_url ? (
            <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
          ) : (
            <span>{user?.full_name?.charAt(0) || (language === 'ar' ? 'ط' : 'S')}</span>
          )}
        </motion.div>
        <div className="flex-1 min-w-0">
          <h2 className={`text-xl font-bold truncate ${styles.text}`}>
            {user?.full_name || (language === 'ar' ? 'طالب' : 'Student')}
          </h2>
          <p className={`text-xs ${styles.subtext} truncate opacity-70`}>{user?.email}</p>
          <div className="flex items-center gap-1.5 mt-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className={`text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'متصل' : 'Online'}</span>
          </div>
        </div>
      </div>

      {/* روابط القائمة – بحجم أكبر وأيقونات ملونة */}
      <nav className="relative z-10 flex-1 py-6 px-5 space-y-2 overflow-y-auto">
        {NAV_ITEMS.map((item, index) => {
          const active = isActive(item.path);
          const colors = getIconColor(item.color, active);
          return (
            <Link key={item.id} href={item.path}>
              <motion.div
                initial={{ opacity: 0, x: isRTL ? 30 : -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.06 }}
                whileHover={{ scale: 1.02, x: isRTL ? -6 : 6 }}
                className={`relative flex items-center gap-5 px-5 py-4 rounded-2xl transition-all duration-300 group ${
                  active ? `font-bold shadow-lg ${colors.bg} ${colors.border} border` : `${styles.subtext} hover:bg-white/5`
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebarActive"
                    className="absolute inset-0 bg-gradient-to-r from-blue-500/10 via-transparent to-transparent rounded-2xl"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
                <div className={`relative z-10 p-2.5 rounded-xl transition-colors ${active ? colors.bg : 'bg-white/5'} group-hover:scale-110 transition-transform`}>
                  <item.icon className={`h-6 w-6 ${active ? colors.text : 'text-gray-400'}`} />
                </div>
                <span className="relative z-10 text-base font-medium">{item.label[language] || item.label.ar}</span>
                {active && (
                  <motion.div
                    layoutId="activeDot"
                    className={`h-3 w-3 rounded-full ${colors.text} ${isRTL ? 'mr-auto' : 'ml-auto'} relative z-10`}
                  />
                )}
              </motion.div>
            </Link>
          );
        })}
      </nav>

      {/* الأسفل – أزرار التحكم والملف الشخصي */}
      <div className="relative z-10 p-5 border-t border-[var(--border-color)] space-y-3">
        <Link href="/dashboard/student/profile">
          <motion.div
            whileHover={{ scale: 1.02 }}
            className={`flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all ${pathname === '/dashboard/student/profile' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : `${styles.subtext} hover:bg-white/5`}`}
          >
            <Icons.User className="h-5 w-5" />
            <span className="text-sm font-medium">{language === 'ar' ? 'الملف الشخصي' : 'Profile'}</span>
          </motion.div>
        </Link>
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleLanguage}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-blue-500/10 border border-white/10 transition-all text-sm font-medium"
          >
            <Icons.Globe className="h-5 w-5 text-blue-500" />
            <span>{language === 'ar' ? 'EN' : 'AR'}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className="flex-1 flex items-center justify-center px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-blue-500/10 border border-white/10 transition-all"
          >
            {theme === 'dark' ? <Icons.Sun className="h-5 w-5 text-yellow-400" /> : <Icons.Moon className="h-5 w-5 text-blue-500" />}
          </motion.button>
        </div>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all font-medium text-sm"
        >
          <Icons.LogOut className="h-5 w-5" />
          <span>{language === 'ar' ? 'تسجيل الخروج' : 'Logout'}</span>
        </motion.button>
      </div>
    </motion.aside>
  );
};

// ================================================================
// شريط التنقل السفلي للجوال – بألوان محددة
// ================================================================
const MobileBottomNav = ({ language, pathname, styles }) => {
  const isActive = (path) => pathname === path;

  return (
    <motion.nav
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-4 pt-3 backdrop-blur-2xl border-t border-[var(--border-color)] shadow-2xl"
      style={{ backgroundColor: 'rgba(var(--bg-primary-rgb), 0.85)' }}
    >
      <div className="flex justify-around items-center max-w-lg mx-auto">
        {NAV_ITEMS.slice(0, 5).map((item) => {
          const active = isActive(item.path);
          const colors = getIconColor(item.color, active);
          return (
            <Link key={item.id} href={item.path}>
              <motion.div
                whileHover={{ y: -6 }}
                whileTap={{ scale: 0.9 }}
                className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-2xl transition-all min-w-[64px] ${
                  active ? 'scale-110' : styles.subtext
                }`}
              >
                <div className={`p-2 rounded-xl ${active ? colors.bg : ''}`}>
                  <item.icon className={`h-6 w-6 ${active ? colors.text : 'text-gray-400'}`} />
                </div>
                <span className="text-[10px] font-medium">{item.label[language] || item.label.ar}</span>
                {active && (
                  <motion.div
                    layoutId="mobileIndicator"
                    className={`h-1 w-8 rounded-full ${colors.text}`}
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
// مكون التخطيط الرئيسي – بدون أي شريط علوي
// ================================================================
export default function StudentLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const isExamPage = pathname?.startsWith('/dashboard/student/exams/') && !pathname?.endsWith('/result');

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
      } catch (err) { console.error(err); toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data'); }
      finally { setLoading(false); }
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
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl shadow-blue-500/30"
            />
          </div>
        </div>
        <p className={`text-sm font-semibold ${styles.subtext}`}>
          {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}
        </p>
      </div>
    </div>
  );

  const isRTL = language === 'ar';
  const mainMargin = isRTL ? 'lg:mr-96' : 'lg:ml-96';

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} className="h-dvh w-full flex flex-col overflow-hidden">
      {/* خلفية رئيسية */}
      <div className="fixed inset-0 -z-10 bg-[var(--bg-primary)]">
        <motion.div
          animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-3xl"
        />
        <motion.div
          animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
          className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-green-500/5 rounded-full blur-3xl"
        />
      </div>

      {/* المحتوى الرئيسي – بدون أي شريط علوي */}
      <main
        className={`flex-1 overflow-y-auto pb-20 lg:pb-0 ${!isExamPage ? mainMargin : ''}`}
        style={{ backgroundColor: 'var(--bg-primary)' }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.98 }}
            transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            className="h-full w-full"
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* الشريط الجانبي والملاحة السفلية (تظهر في كل الصفحات عدا الامتحانات) */}
      {!isExamPage && (
        <>
          <DesktopSidebar
            user={user}
            language={language}
            toggleLanguage={toggleLanguage}
            theme={theme}
            toggleTheme={toggleTheme}
            styles={styles}
            pathname={pathname}
            onLogout={handleLogout}
          />
          <MobileBottomNav language={language} pathname={pathname} styles={styles} />
        </>
      )}
    </div>
  );
}