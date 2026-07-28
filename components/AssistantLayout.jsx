'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// تعريف الوحدات والأيقونات (تشمل الدعم)
// ================================================================
const MODULES = {
  courses: { label: 'الكورسات', icon: Icons.BookOpen, color: 'text-blue-400' },
  videos: { label: 'الفيديوهات', icon: Icons.Video, color: 'text-green-400' },
  exams: { label: 'الامتحانات', icon: Icons.FileText, color: 'text-purple-400' },
  books: { label: 'الكتب', icon: Icons.Book, color: 'text-orange-400' },
  question_bank: { label: 'بنك الأسئلة', icon: Icons.Database, color: 'text-indigo-400' },
  support: { label: 'الدعم', icon: Icons.HelpCircle, color: 'text-yellow-400' },
  announcements: { label: 'الإعلانات', icon: Icons.Megaphone, color: 'text-pink-400' },
  messages: { label: 'المراسلات', icon: Icons.Mail, color: 'text-emerald-400' },
  notes: { label: 'الملاحظات', icon: Icons.StickyNote, color: 'text-amber-400' },
};

// ================================================================
// دالة التحقق من الصلاحية
// ================================================================
const hasPermission = (permissions, module, permission = 'can_view') => {
  if (!permissions || permissions.length === 0) return false;
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true;
  return perm[permission] === true;
};

// ================================================================
// شريط جانبي (Sidebar)
// ================================================================
const Sidebar = ({ isOpen, onClose, assistant, permissions, styles, pathname }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // تصفية الوحدات المسموح بها (بما فيها support)
  const allowedModules = Object.keys(MODULES).filter(module =>
    hasPermission(permissions, module, 'can_view')
  );

  const t = {
    dashboard: 'لوحة التحكم',
    profile: 'الملف الشخصي',
    permissions: 'الصلاحيات',
    logs: 'سجل النشاطات',
    logout: 'تسجيل الخروج',
  };

  return (
    <>
      {/* خلفية مظللة للجوال */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 md:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-0 right-0 h-full z-50 transition-all duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'w-16' : 'w-64'} ${
          styles.card
        } border-l ${styles.border} ${styles.bg} overflow-y-auto flex flex-col`}
      >
        {/* رأس الشريط الجانبي */}
        <div className={`flex items-center justify-between p-4 border-b ${styles.border}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Icons.Shield className="h-6 w-6 text-yellow-400" />
              <span className={`font-bold ${styles.text} text-sm`}>منصة محمد رضوان</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`p-1 rounded-lg hover:bg-white/5 ${styles.subtext}`}
          >
            {isCollapsed ? <Icons.ChevronLeft className="h-5 w-5" /> : <Icons.ChevronRight className="h-5 w-5" />}
          </button>
          <button
            onClick={onClose}
            className="md:hidden p-1 rounded-lg hover:bg-white/5"
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        {/* معلومات المساعد – استبدال الأيقونة بالشعار الجديد */}
        {assistant && !isCollapsed && (
          <div className={`p-4 border-b ${styles.border}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden shadow-lg shadow-yellow-400/20">
                <img
                  src="/images/logo.png"
                  alt="محمد رضوان"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${styles.text} truncate`}>
                  {assistant.display_name || assistant.full_name}
                </p>
                <p className={`text-[10px] ${styles.subtext}`}>
                  {assistant.role === 'chief' && '🔑 رئيس المساعدين'}
                  {assistant.role === 'expert' && '⭐ خبير'}
                  {assistant.role === 'technical' && '🛠️ تقني'}
                  {assistant.role === 'supervisor' && '👀 مشرف'}
                  {assistant.role === 'coordinator' && '📋 منسق'}
                  {assistant.role === 'assistant' && '🤝 مساعد'}
                  {assistant.role === 'intern' && '📚 متدرب'}
                  {' • مستوى '}{assistant.role_level}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* القائمة */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {/* لوحة التحكم */}
          <Link
            href="/dashboard/assistant"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              pathname === '/dashboard/assistant'
                ? 'bg-yellow-400/20 text-yellow-300'
                : `${styles.subtext} hover:bg-white/5 hover:text-white`
            }`}
          >
            <Icons.LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">{t.dashboard}</span>}
          </Link>

          {/* الوحدات المسموح بها */}
          {allowedModules.map((module) => {
            const info = MODULES[module];
            const Icon = info.icon;
            const isActive = pathname.includes(`/dashboard/assistant/${module}`);
            return (
              <Link
                key={module}
                href={`/dashboard/assistant/${module}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
                  isActive
                    ? 'bg-yellow-400/20 text-yellow-300'
                    : `${styles.subtext} hover:bg-white/5 hover:text-white`
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${info.color}`} />
                {!isCollapsed && <span className="text-sm font-medium">{info.label}</span>}
              </Link>
            );
          })}

          {/* روابط إضافية */}
          <Link
            href="/dashboard/assistant/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              pathname === '/dashboard/assistant/profile'
                ? 'bg-yellow-400/20 text-yellow-300'
                : `${styles.subtext} hover:bg-white/5 hover:text-white`
            }`}
          >
            <Icons.User className="h-5 w-5 flex-shrink-0 text-purple-400" />
            {!isCollapsed && <span className="text-sm font-medium">{t.profile}</span>}
          </Link>

          <Link
            href="/dashboard/assistant/permissions"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              pathname === '/dashboard/assistant/permissions'
                ? 'bg-yellow-400/20 text-yellow-300'
                : `${styles.subtext} hover:bg-white/5 hover:text-white`
            }`}
          >
            <Icons.Shield className="h-5 w-5 flex-shrink-0 text-blue-400" />
            {!isCollapsed && <span className="text-sm font-medium">{t.permissions}</span>}
          </Link>

          <Link
            href="/dashboard/assistant/logs"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition ${
              pathname === '/dashboard/assistant/logs'
                ? 'bg-yellow-400/20 text-yellow-300'
                : `${styles.subtext} hover:bg-white/5 hover:text-white`
            }`}
          >
            <Icons.History className="h-5 w-5 flex-shrink-0 text-cyan-400" />
            {!isCollapsed && <span className="text-sm font-medium">{t.logs}</span>}
          </Link>
        </nav>

        {/* زر تسجيل الخروج */}
        <div className={`p-4 border-t ${styles.border}`}>
          <button
            onClick={() => {
              sessionStorage.removeItem('assistantData');
              window.location.href = '/assistant-login';
            }}
            className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl transition hover:bg-red-500/20 text-red-400`}
          >
            <Icons.LogOut className="h-5 w-5 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">{t.logout}</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

// ================================================================
// التخطيط الرئيسي
// ================================================================
export function AssistantLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggleTheme, styles } = useTheme();

  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // جلب بيانات المساعد من sessionStorage
  useEffect(() => {
    try {
      const assistantData = sessionStorage.getItem('assistantData');
      if (!assistantData) {
        router.replace('/assistant-login');
        return;
      }
      const parsed = JSON.parse(assistantData);
      setAssistant(parsed);

      const perms = JSON.parse(sessionStorage.getItem('assistantPermissions') || '[]');
      setPermissions(perms);
    } catch (err) {
      console.error('Error loading assistant data:', err);
      router.replace('/assistant-login');
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${styles.subtext}`}>جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!assistant) {
    return null;
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
      />

      <div className={`flex-1 transition-all duration-300 md:mr-64`}>
        <header className={`sticky top-0 z-30 ${styles.card} border-b ${styles.border} px-4 py-3 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-white/5 transition"
            >
              <Icons.Menu className="h-5 w-5" />
            </button>
            <span className={`text-sm font-semibold ${styles.subtext}`}>
              مرحباً، {assistant.display_name || assistant.full_name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition ${styles.card} border ${styles.border}`}
            >
              {theme === 'dark' ? (
                <Icons.Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Icons.Moon className="h-5 w-5 text-gray-600" />
              )}
            </button>
          </div>
        </header>

        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export default AssistantLayout;