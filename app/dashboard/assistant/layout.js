'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// تعريف الوحدات والأيقونات (نفس السابق مع تحسينات)
// ================================================================
const MODULES = {
  courses: { label: 'الكورسات', icon: Icons.BookOpen, color: 'from-blue-400 to-blue-600' },
  videos: { label: 'الفيديوهات', icon: Icons.Video, color: 'from-purple-400 to-purple-600' },
  exams: { label: 'الامتحانات', icon: Icons.FileText, color: 'from-red-400 to-red-600' },
  books: { label: 'الكتب', icon: Icons.Book, color: 'from-green-400 to-green-600' },
  question_bank: { label: 'بنك الأسئلة', icon: Icons.Database, color: 'from-orange-400 to-orange-600' },
  support: { label: 'الدعم', icon: Icons.HelpCircle, color: 'from-yellow-400 to-yellow-600' },
  announcements: { label: 'الإعلانات', icon: Icons.Megaphone, color: 'from-pink-400 to-pink-600' },
  messages: { label: 'المراسلات', icon: Icons.Mail, color: 'from-emerald-400 to-emerald-600' },
  notes: { label: 'الملاحظات', icon: Icons.StickyNote, color: 'from-amber-400 to-amber-600' },
  students: { label: 'الطلاب', icon: Icons.Users, color: 'from-indigo-400 to-indigo-600' },
};

const hasPermission = (permissions, module, permission = 'can_view') => {
  if (!permissions || permissions.length === 0) return false;
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true;
  return perm[permission] === true;
};

// ===== الشريط الجانبي المحسّن =====
const Sidebar = React.memo(({ isOpen, onClose, assistant, permissions, styles, pathname, unreadCounts, onToggleTheme, theme, isMobile }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const allowedModules = Object.keys(MODULES).filter(module => hasPermission(permissions, module, 'can_view'));

  const handleLogout = () => {
    sessionStorage.removeItem('assistantData');
    sessionStorage.removeItem('assistantPermissions');
    window.location.href = '/assistant-login';
  };

  const handleBackToMain = () => { window.location.href = '/'; };

  return (
    <>
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-xl z-40"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={isMobile ? { x: '100%' } : { x: 0 }}
        animate={isMobile ? { x: isOpen ? 0 : '100%' } : { x: 0 }}
        transition={{ type: 'spring', damping: 30, stiffness: 250 }}
        className={`fixed top-0 right-0 h-full z-50 transition-all duration-300 ${
          isCollapsed ? 'w-16' : 'w-64'
        } ${styles.card} border-l ${styles.border} ${styles.bg} overflow-y-auto flex flex-col shadow-2xl shadow-yellow-400/5`}
        style={{ direction: 'rtl' }}
      >
        {/* الرأس مع زر الثيم */}
        <div className={`flex items-center justify-between p-3 border-b ${styles.border}`}>
          {!isCollapsed && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <Icons.Shield className="h-6 w-6 text-yellow-400" />
              <span className={`font-bold ${styles.text} text-sm`}>محمد رضوان</span>
            </motion.div>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={onToggleTheme}
              className={`p-1.5 rounded-lg transition hover:bg-white/10 ${styles.subtext}`}
              title="تبديل الثيم"
            >
              {theme === 'dark' && <Icons.Moon className="h-4 w-4" />}
              {theme === 'light' && <Icons.Sun className="h-4 w-4 text-yellow-500" />}
              {theme === 'green' && <Icons.Sun className="h-4 w-4 text-emerald-400" />}
            </button>
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`p-1 rounded-lg hover:bg-white/10 transition ${styles.subtext}`}
            >
              {isCollapsed ? <Icons.ChevronLeft className="h-5 w-5" /> : <Icons.ChevronRight className="h-5 w-5" />}
            </button>
            {isMobile && (
              <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/10">
                <Icons.X className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* معلومات المساعد */}
        {assistant && !isCollapsed && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 border-b ${styles.border}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-yellow-400/30 flex-shrink-0 border border-yellow-400/20">
                <img src="/images/logo.png" alt="محمد رضوان" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${styles.text} truncate`}>
                  {assistant.display_name || assistant.full_name || 'مساعد'}
                </p>
                <p className={`text-[10px] ${styles.subtext} truncate`}>
                  {assistant.role === 'chief' && '🔑 رئيس المساعدين'}
                  {assistant.role === 'expert' && '⭐ خبير'}
                  {assistant.role === 'technical' && '🛠️ تقني'}
                  {assistant.role === 'supervisor' && '👀 مشرف'}
                  {assistant.role === 'coordinator' && '📋 منسق'}
                  {assistant.role === 'assistant' && '🤝 مساعد'}
                  {assistant.role === 'intern' && '📚 متدرب'}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* القائمة */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          <Link href="/dashboard/assistant" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
            pathname === '/dashboard/assistant' ? 'bg-yellow-400/20 text-yellow-300 shadow-lg shadow-yellow-400/10' : `${styles.subtext} hover:bg-white/5 hover:text-white`
          }`}>
            <Icons.LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">لوحة التحكم</span>}
          </Link>

          {allowedModules.map(module => {
            const info = MODULES[module];
            const Icon = info.icon;
            const isActive = pathname.includes(`/dashboard/assistant/${module}`);
            const count = unreadCounts?.[module] || 0;
            return (
              <Link key={module} href={`/dashboard/assistant/${module}`} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 relative ${
                isActive ? 'bg-yellow-400/20 text-yellow-300 shadow-lg shadow-yellow-400/10' : `${styles.subtext} hover:bg-white/5 hover:text-white`
              }`}>
                <Icon className={`h-5 w-5 flex-shrink-0 bg-gradient-to-br ${info.color} bg-clip-text text-transparent`} />
                {!isCollapsed && <span className="text-sm font-medium flex-1">{info.label}</span>}
                {count > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full animate-pulse">{count}</span>}
              </Link>
            );
          })}

          <Link href="/dashboard/assistant/profile" className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
            pathname === '/dashboard/assistant/profile' ? 'bg-yellow-400/20 text-yellow-300' : `${styles.subtext} hover:bg-white/5 hover:text-white`
          }`}>
            <Icons.User className="h-5 w-5 flex-shrink-0 text-purple-400" />
            {!isCollapsed && <span className="text-sm font-medium">الملف الشخصي</span>}
          </Link>
        </nav>

        {/* الأزرار السفلية */}
        <div className={`p-3 border-t ${styles.border} space-y-2`}>
          <button onClick={handleBackToMain} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition hover:bg-blue-500/20 text-blue-400`}>
            <Icons.Home className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">العودة للمنصة الرئيسية</span>}
          </button>
          <button onClick={handleLogout} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition hover:bg-red-500/20 text-red-400`}>
            <Icons.LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">تسجيل الخروج</span>}
          </button>
        </div>
      </motion.aside>
    </>
  );
});

Sidebar.displayName = 'Sidebar';

// ================================================================
// التخطيط الرئيسي (Layout)
// ================================================================
export default function AssistantLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, styles } = useTheme();

  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const assistantData = sessionStorage.getItem('assistantData');
        if (!assistantData) { router.replace('/assistant-login'); return; }
        const parsed = JSON.parse(assistantData);
        setAssistant(parsed);
        const perms = JSON.parse(sessionStorage.getItem('assistantPermissions') || '[]');
        setPermissions(perms);
        // جلب الإشعارات
        try {
          const res = await fetch('/api/assistant/notifications', { headers: { 'x-assistant-id': parsed.id } });
          if (res.ok) { const data = await res.json(); setUnreadCounts(data.counts || {}); }
        } catch {}
      } catch (err) { console.error(err); router.replace('/assistant-login'); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [router]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="text-center"><div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto" />
        <p className={`mt-4 text-sm ${styles.subtext}`}>جاري التحميل...</p></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} transition-colors duration-300 flex`}>
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        assistant={assistant}
        permissions={permissions}
        styles={styles}
        pathname={pathname}
        unreadCounts={unreadCounts}
        onToggleTheme={toggleTheme}
        theme={theme}
        isMobile={isMobile}
      />

      <div className={`flex-1 transition-all duration-300 md:mr-64`}>
        <header className={`sticky top-0 z-30 ${styles.card} border-b ${styles.border} px-4 py-3 flex items-center justify-between backdrop-blur-xl`}>
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 rounded-lg hover:bg-white/5 transition">
              <Icons.Menu className="h-5 w-5" />
            </button>
            <span className={`text-sm font-semibold ${styles.subtext}`}>
              مرحباً، {assistant?.display_name || assistant?.full_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full ${styles.card} border ${styles.border}`}>
              <Icons.Crown className="w-4 h-4 text-yellow-400" />
              <span className={`text-[10px] font-medium ${styles.subtext}`}>المساعد الرئيسي</span>
            </div>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}