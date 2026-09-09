// ============================================================
// components/TeacherLayout.jsx
// النسخة الأسطورية V6 – تباين عالٍ جداً لجهة المعلم
// ✅ خلفيات أعمق، نصوص أوضح، تباين فائق في الفاتح والداكن
// ✅ زر الثيم يؤثر على كامل الشاشة عبر CSS Variables
// ✅ عناصر تفاعلية ذات تباين عالٍ
// ============================================================

'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { getCachedAssistantPermissions } from '@/lib/permissions';
import { useTheme } from '@/lib/hooks/useTheme';

const navLinks = [
  { href: '/dashboard/teacher', label: 'الرئيسية', icon: Icons.Home, module: null },
  { href: '/dashboard/teacher/courses', label: 'الكورسات', icon: Icons.Book, module: 'courses' },
  { href: '/dashboard/teacher/videos', label: 'الفيديوهات', icon: Icons.Video, module: 'videos' },
  { href: '/dashboard/teacher/exams', label: 'الامتحانات', icon: Icons.FileText, module: 'exams' },
  { href: '/dashboard/teacher/books', label: 'الكتب', icon: Icons.BookOpen, module: 'books' },
  { href: '/dashboard/teacher/question-bank', label: 'بنك الأسئلة', icon: Icons.ClipboardList, module: 'question-bank' },
  { href: '/dashboard/teacher/announcements', label: 'الإعلانات', icon: Icons.Megaphone, module: 'announcements' },
  { href: '/dashboard/teacher/messages', label: 'المراسلات', icon: Icons.Mail, module: 'messages' },
  { href: '/dashboard/teacher/notes', label: 'الملاحظات', icon: Icons.StickyNote, module: 'notes' },
  { href: '/dashboard/teacher/support', label: 'الدعم', icon: Icons.HelpCircle, badge: 'جديد', module: 'support' },
  { href: '/dashboard/teacher/assistants', label: 'المساعدين', icon: Icons.Users, badge: 'جديد', module: 'assistants' },
  { href: '/dashboard/teacher/students', label: 'الطلاب', icon: Icons.Users, module: 'students' },
  { href: '/dashboard/teacher/reports', label: 'التقارير', icon: Icons.BarChart, module: 'reports' },
];

export function TeacherLayout({ children }) {
  const pathname = usePathname();
  const { theme, toggleTheme, styles } = useTheme();
  const isDark = theme === 'dark';

  const [permissions, setPermissions] = useState([]);
  const [isAssistant, setIsAssistant] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserAndPermissions = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);
      const perms = await getCachedAssistantPermissions(user.id);
      if (perms !== null) {
        setIsAssistant(true);
        setPermissions(perms);
      }
    };
    fetchUserAndPermissions();
  }, []);

  const hasPermission = (module, permission) => {
    if (!isAssistant) return true;
    const perm = permissions.find(p => p.module === module);
    if (!perm) return false;
    if (perm.can_manage) return true;
    return perm[permission] || false;
  };

  const visibleLinks = navLinks.filter(link => {
    if (!isAssistant) return true;
    if (!link.module) return true;
    return hasPermission(link.module, 'can_view');
  });

  // =============================================================
  // 🔥 تباين عالٍ جداً – ألوان حادة وواضحة
  // =============================================================
  const bgColor = isDark ? 'bg-[#080b12]' : 'bg-[#e8edf3]'; // أغمق / أفتح
  const textColor = isDark ? 'text-white' : 'text-[#0a0a0f]';
  const subTextColor = isDark ? 'text-gray-300' : 'text-gray-700';
  const borderColor = isDark ? 'border-white/20' : 'border-gray-300';
  const headerBg = isDark ? 'bg-[#080b12]/98 backdrop-blur-xl' : 'bg-white/98 backdrop-blur-xl';
  const cardBg = isDark ? 'bg-white/10' : 'bg-white';
  const hoverBg = isDark ? 'hover:bg-white/20' : 'hover:bg-gray-200';
  const activeBg = isDark ? 'bg-yellow-400/40' : 'bg-yellow-400/25';
  const activeText = isDark ? 'text-yellow-300' : 'text-yellow-700';
  const shadowColor = isDark ? 'shadow-yellow-400/30' : 'shadow-yellow-400/40';
  const footerBorder = isDark ? 'border-white/20' : 'border-gray-300';
  const footerText = isDark ? 'text-gray-400' : 'text-gray-500';

  // =============================================================
  // تطبيق CSS Variables لتغطية كامل الشاشة
  // =============================================================
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', isDark ? '#080b12' : '#e8edf3');
    root.style.setProperty('--text-primary', isDark ? '#ffffff' : '#0a0a0f');
    root.style.setProperty('--text-secondary', isDark ? '#d1d5db' : '#374151');
    root.style.setProperty('--border-color', isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)');
  }, [isDark]);

  return (
    <div className={`min-h-screen ${bgColor} ${textColor} transition-colors duration-300`}>
      {/* ===== الهيدر ===== */}
      <header className={`fixed top-0 left-0 right-0 z-50 ${headerBg} border-b ${borderColor} shadow-2xl transition-colors duration-300`}>
        <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <Link href="/dashboard/teacher" className="flex items-center gap-3 group">
            <div className={`h-10 w-10 rounded-full overflow-hidden shadow-lg ${shadowColor} group-hover:scale-105 transition`}>
              <img src="/images/logo.png" alt="محمد رضوان" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent leading-none">
                محمد رضوان
              </h1>
              <p className={`text-[9px] ${subTextColor} leading-none mt-0.5`}>منصة تعليمية احترافية</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium overflow-x-auto max-w-[70%]">
            {visibleLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 whitespace-nowrap relative ${
                    isActive
                      ? `${activeBg} ${activeText} shadow-lg ${shadowColor}`
                      : `${subTextColor} ${hoverBg}`
                  }`}
                >
                  <link.icon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate max-w-[80px] font-medium">{link.label}</span>
                  {link.badge && (
                    <span className="text-[10px] bg-yellow-400/30 text-yellow-300 px-2 py-0.5 rounded-full mr-1 font-bold">
                      {link.badge}
                    </span>
                  )}
                  {isActive && (
                    <motion.span
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            {/* زر تبديل الثيم – تباين عالٍ */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${hoverBg} ${subTextColor} hover:${textColor} border ${borderColor}`}
              title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {isDark ? (
                <Icons.Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Icons.Moon className="h-5 w-5 text-gray-800" />
              )}
            </button>

            {/* زر الخروج – تباين عالٍ */}
            <Link
              href="/logout"
              className={`px-4 py-2 bg-red-500/40 hover:bg-red-500/50 text-red-200 rounded-xl text-sm font-semibold transition flex items-center gap-2 flex-shrink-0 border border-red-500/30`}
            >
              <Icons.LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">خروج</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ===== المحتوى ===== */}
      <main className="pt-20 px-4 md:px-6 max-w-7xl mx-auto pb-10">
        {children}
      </main>

      {/* ===== الفوتر ===== */}
      <footer className={`border-t ${footerBorder} py-4 text-center text-[10px] ${footerText}`}>
        &copy; 2026 منصة محمد رضوان – جميع الحقوق محفوظة
      </footer>
    </div>
  );
}