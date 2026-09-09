'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { signOut } from '@/lib/auth';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';

// ============================================================
// 1. خلفية الجسيمات (تبقى كما هي)
// ============================================================
const ParticleBackground = () => {
  // ... (نفس الكود السابق) ...
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.2 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(251, 191, 36, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(251, 191, 36, ${0.03 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(draw);
    };
    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ============================================================
// 2. الشريط الجانبي (مُعدل ليحتوي على أزرار اللغة والثيم للطالب)
// ============================================================
const Sidebar = ({ user, userRole, userName, pathname, onClose, isOpen, styles, theme, toggleTheme, language, toggleLanguage }) => {
  const router = useRouter();

  const navItems = [
    { name: 'الرئيسية', icon: Icons.Home, href: `/dashboard/${userRole}` },
    { name: 'الكورسات', icon: Icons.BookOpen, href: `/dashboard/${userRole}/courses` },
    { name: 'الفيديوهات', icon: Icons.Video, href: `/dashboard/${userRole}/videos` },
    { name: 'الامتحانات', icon: Icons.FileText, href: `/dashboard/${userRole}/exams` },
    { name: 'الكتب', icon: Icons.Book, href: `/dashboard/${userRole}/books` },
  ];

  if (userRole === 'teacher') {
    navItems.push(
      { name: 'الطلاب', icon: Icons.Users, href: '/dashboard/teacher/students' },
      { name: 'التقارير', icon: Icons.BarChart, href: '/dashboard/teacher/reports' }
    );
  } else {
    navItems.push(
      { name: 'تقدمي', icon: Icons.TrendingUp, href: '/dashboard/student/progress' },
      { name: 'شهاداتي', icon: Icons.GraduationCap, href: '/dashboard/student/certificates' }
    );
  }

  const isActive = (href) => {
    if (href === `/dashboard/${userRole}`) return pathname === href;
    return pathname.startsWith(href);
  };

  const isRTL = language === 'ar';
  const isStudent = userRole === 'student';

  return (
    <motion.aside
      initial={{ x: isRTL ? '100%' : '-100%' }}
      animate={{ x: isOpen ? 0 : isRTL ? '100%' : '-100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed inset-y-0 ${isRTL ? 'right-0' : 'left-0'} z-50 w-72 border-${isRTL ? 'l' : 'r'} border-[var(--border-color)] flex flex-col shadow-2xl lg:translate-x-0 lg:static lg:shadow-none`}
      style={{ backgroundColor: 'var(--bg-card)', backdropFilter: 'blur(12px)' }}
    >
      <div className="p-6 flex flex-col h-full">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-12 w-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-extrabold text-xl shadow-lg shadow-yellow-400/20">
            {userName?.charAt(0)?.toUpperCase() || 'م'}
          </div>
          <div>
            <p className="font-bold" style={{ color: 'var(--text-primary)' }}>{userName || 'مستخدم'}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{userRole === 'teacher' ? 'معلم' : 'طالب'}</p>
          </div>
        </div>

        <nav className="space-y-1 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm ${
                  active
                    ? 'bg-yellow-400/10 text-yellow-400 shadow-lg shadow-yellow-400/5'
                    : ''
                }`}
                style={{
                  color: active ? undefined : 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--text-secondary)'; }}
              >
                <item.icon className={`h-5 w-5 ${active ? 'text-yellow-400' : ''}`} />
                <span>{item.name}</span>
                {active && (
                  <motion.span
                    layoutId="activeIndicator"
                    className={`${isRTL ? 'mr-auto' : 'ml-auto'} h-1 w-6 rounded-full bg-yellow-400`}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* قسم أزرار اللغة والثيم – يظهر للطالب فقط (لأنه سيتم إخفاء TopBar) */}
        {isStudent && (
          <div className="pt-4 border-t border-[var(--border-color)] space-y-3">
            <div className="flex items-center gap-2">
              <button
                onClick={toggleLanguage}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 hover:bg-yellow-400/10 border border-white/10 transition-all text-sm font-medium"
                style={{ color: 'var(--text-secondary)' }}
              >
                <Icons.Globe className="h-4 w-4 text-yellow-400" />
                <span>{language === 'ar' ? 'EN' : 'AR'}</span>
              </button>
              <button
                onClick={toggleTheme}
                className="flex-1 flex items-center justify-center px-3 py-2.5 rounded-xl bg-white/5 hover:bg-yellow-400/10 border border-white/10 transition-all"
                style={{ color: 'var(--text-secondary)' }}
              >
                {theme === 'dark' ? (
                  <Icons.Sun className="h-4 w-4 text-yellow-400" />
                ) : (
                  <Icons.Moon className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="pt-6 border-t border-[var(--border-color)] space-y-2">
          <button
            onClick={async () => {
              await signOut();
              router.push('/login');
            }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-all duration-300 text-sm w-full"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          >
            <Icons.LogOut className="h-5 w-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </div>
    </motion.aside>
  );
};

// ============================================================
// 3. شريط التنقل العلوي – يظهر فقط للمعلم والمساعد (وليس للطالب)
// ============================================================
const TopBar = ({ userName, userRole, toggleSidebar, theme, toggleTheme, language, toggleLanguage, styles }) => {
  // 🔥 إذا كان المستخدم طالباً، لا نعرض الشريط العلوي نهائياً
  if (userRole === 'student') return null;

  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-xl border-b border-[var(--border-color)] px-4 md:px-6 py-4 flex items-center justify-between"
      style={{ backgroundColor: 'var(--bg-primary)', opacity: 0.9 }}
    >
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="lg:hidden" style={{ color: 'var(--text-primary)' }}>
          <Icons.Menu className="h-6 w-6" />
        </button>
        <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent hidden sm:block">
          لوحة التحكم
        </h2>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-medium hover:bg-yellow-400/10 hover:text-yellow-600 dark:hover:text-yellow-400 transition"
          style={{ color: 'var(--text-secondary)' }}
        >
          <Icons.Globe className="h-4 w-4" />
          <span className="text-[11px] font-semibold">{language === 'ar' ? 'EN' : 'AR'}</span>
        </button>
        <button
          onClick={toggleTheme}
          className="flex items-center justify-center px-2 py-1.5 rounded-lg bg-gray-100 dark:bg-white/5 text-xs font-medium hover:bg-yellow-400/10 transition"
          style={{ color: 'var(--text-secondary)' }}
        >
          {theme === 'dark' ? (
            <Icons.Sun className="h-4 w-4 text-yellow-400" />
          ) : (
            <Icons.Moon className="h-4 w-4" />
          )}
        </button>
        <span className="text-xs hidden sm:block" style={{ color: 'var(--text-muted)' }}>{userName}</span>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-sm">
          {userName?.charAt(0)?.toUpperCase() || 'م'}
        </div>
      </div>
    </header>
  );
};

// ============================================================
// 4. Layout الرئيسي
// ============================================================
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();

  useEffect(() => {
    if (pathname.startsWith('/dashboard/assistant')) {
      setLoading(false);
      return;
    }

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
        setLoading(false);
        if (!user) {
          router.replace('/login');
        }
      } catch (err) {
        setLoading(false);
        router.replace('/login');
      }
    };

    getUser();
  }, [pathname, router]);

  // إعداد CSS Variables حسب الثيم
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    root.style.setProperty('--bg-primary', isDark ? '#0b0e1a' : '#f9fafb');
    root.style.setProperty('--bg-card', isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)');
    root.style.setProperty('--text-primary', isDark ? '#ffffff' : '#111827');
    root.style.setProperty('--text-secondary', isDark ? '#9ca3af' : '#4b5563');
    root.style.setProperty('--text-muted', isDark ? '#6b7280' : '#6b7280');
    root.style.setProperty('--border-color', isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)');
    root.style.setProperty('--gold-primary', '#f59e0b');
  }, [theme]);

  if (pathname.startsWith('/dashboard/assistant')) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p style={{ color: 'var(--text-secondary)' }} className="text-sm">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const userRole = user.user_metadata?.role || 'student';
  const userName = user.user_metadata?.full_name || user.email;

  return (
    <div className={`min-h-screen flex relative ${styles.bg}`} style={{ color: 'var(--text-primary)' }} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <ParticleBackground />

      <Sidebar
        user={user}
        userRole={userRole}
        userName={userName}
        pathname={pathname}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        styles={styles}
        theme={theme}
        toggleTheme={toggleTheme}
        language={language}
        toggleLanguage={toggleLanguage}
      />

      <div className="flex-1 flex flex-col min-h-screen relative z-10">
        <TopBar
          userName={userName}
          userRole={userRole}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          theme={theme}
          toggleTheme={toggleTheme}
          language={language}
          toggleLanguage={toggleLanguage}
          styles={styles}
        />
        <main className="flex-1 p-4 md:p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}