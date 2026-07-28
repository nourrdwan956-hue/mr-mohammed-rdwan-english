// app/dashboard/teacher/page.js
// لوحة تحكم المعلم – نسخة محسنة التصميم مع بنك الأسئلة + الدعم + المساعدين
// ✅ تم التعديل لاستخدام الثيم واللغة المركزيين من useTheme
// ✅ تم استبدال أيقونة "م" بالشعار الجديد في مكانين

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useTheme } from '@/lib/hooks/useTheme';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// ============================================================
// 1. خلفية الجسيمات التفاعلية
// ============================================================

const InteractiveParticles = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null });
  const particlesRef = useRef([]);
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const particleCount = 70;
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        r: Math.random() * 2.5 + 0.5,
        baseOpacity: Math.random() * 0.25 + 0.05,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
        color: Math.random() > 0.5 ? 'gold' : 'white',
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const time = Date.now() * 0.001;

      particlesRef.current.forEach((p, i) => {
        p.x += p.vx + Math.sin(time * 0.3 + p.phase) * 0.15;
        p.y += p.vy + Math.cos(time * 0.4 + p.phase) * 0.15;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mouseRef.current.x !== null ? mouseRef.current.x - p.x : 0;
        const dy = mouseRef.current.y !== null ? mouseRef.current.y - p.y : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let opacity = p.baseOpacity;
        let radius = p.r;
        if (dist < 150) {
          const influence = 1 - dist / 150;
          opacity += influence * 0.5;
          radius += influence * 2.5;
        }

        const pulse = Math.sin(time * p.pulseSpeed + p.phase) * 0.15 + 0.85;
        const finalOpacity = Math.min(opacity * pulse, 0.9);

        const color = p.color === 'gold' ? `rgba(255, 215, 0, ${finalOpacity})` : `rgba(255, 255, 255, ${finalOpacity * 0.5})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        for (let j = i + 1; j < particlesRef.current.length; j++) {
          const p2 = particlesRef.current[j];
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist2 < 130) {
            const alpha = 0.06 * (1 - dist2 / 130);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      animationRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ============================================================
// 2. عداد متحرك
// ============================================================

const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = target / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="font-extrabold tracking-tight">
      {count}{suffix}
    </span>
  );
};

// ============================================================
// 3. بطاقة إحصائية (مطورة مع دعم الألوان والسمات)
// ============================================================

const StatCard = ({ stat, theme }) => {
  const [isHovered, setIsHovered] = useState(false);
  const isDark = theme === 'dark';

  const bgCard = isDark ? 'bg-[#1e2433]' : 'bg-white';
  const borderCard = isDark ? 'border-gray-700/50' : 'border-gray-200';
  const textLabel = isDark ? 'text-gray-300' : 'text-gray-600';
  const textValue = isDark ? 'text-white' : 'text-gray-900';
  const textSub = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.01 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative ${bgCard} backdrop-blur-sm border ${borderCard} rounded-2xl p-5 hover:border-yellow-400/60 transition-all duration-500 hover:shadow-xl hover:shadow-yellow-400/10 overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-700`} />
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/0 via-yellow-400/10 to-yellow-400/0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-1000" />
      <div className="relative z-10 flex items-start justify-between">
        <div className="space-y-1">
          <p className={`text-sm font-medium ${textLabel}`}>{stat.label}</p>
          <p className={`text-2xl md:text-3xl font-extrabold ${textValue} mt-1`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && <p className={`text-xs ${textSub} mt-1`}>{stat.sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 group-hover:scale-110 transition-all duration-500`}>
          <stat.icon className="h-6 w-6 text-white drop-shadow-md" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: isHovered ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ============================================================
// 4. الشريط الجانبي (مع إضافة بنك الأسئلة والدعم والمساعدين)
// ============================================================

const Sidebar = ({
  userRole,
  userName,
  pathname,
  isOpen,
  onClose,
  stats,
  pendingTasks,
  theme,
}) => {
  const isDark = theme === 'dark';
  const navItems = [
    { name: 'الرئيسية', icon: Icons.Home, href: `/dashboard/${userRole}`, badge: null },
    { name: 'الكورسات', icon: Icons.BookOpen, href: `/dashboard/${userRole}/courses`, badge: stats.totalCourses > 0 ? stats.totalCourses : null },
    { name: 'الفيديوهات', icon: Icons.Video, href: `/dashboard/${userRole}/videos`, badge: stats.totalVideos > 0 ? stats.totalVideos : null },
    { name: 'الامتحانات', icon: Icons.FileText, href: `/dashboard/${userRole}/exams`, badge: stats.totalExams > 0 ? stats.totalExams : null },
    { name: 'الكتب', icon: Icons.Book, href: `/dashboard/${userRole}/books`, badge: stats.totalBooks > 0 ? stats.totalBooks : null },
    { name: 'بنك الأسئلة', icon: Icons.ClipboardList, href: `/dashboard/${userRole}/question-bank`, badge: stats.totalQuestions > 0 ? stats.totalQuestions : null },
    { name: 'الدعم', icon: Icons.HelpCircle, href: `/dashboard/${userRole}/support`, badge: 'جديد' },
  ];

  if (userRole === 'teacher') {
    navItems.push(
      { name: 'المساعدين', icon: Icons.Users, href: '/dashboard/teacher/assistants', badge: 'جديد' },
      { name: 'الطلاب', icon: Icons.Users, href: '/dashboard/teacher/students', badge: stats.totalStudents > 0 ? stats.totalStudents : null },
      { name: 'التقارير', icon: Icons.BarChart, href: '/dashboard/teacher/reports', badge: null }
    );
  } else {
    navItems.push(
      { name: 'تقدمي', icon: Icons.TrendingUp, href: '/dashboard/student/progress', badge: null },
      { name: 'شهاداتي', icon: Icons.GraduationCap, href: '/dashboard/student/certificates', badge: null }
    );
  }

  const isActive = (href) => {
    if (href === `/dashboard/${userRole}`) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <motion.aside
      initial={{ x: '100%' }}
      animate={{ x: isOpen ? 0 : '100%' }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed inset-y-0 right-0 z-50 w-80 ${isDark ? 'bg-[#0d111f]' : 'bg-gray-50'} border-l ${isDark ? 'border-gray-700/50' : 'border-gray-200'} flex flex-col shadow-2xl shadow-black/40 lg:relative lg:translate-x-0 lg:shadow-none lg:w-72 lg:flex-shrink-0`}
    >
      {/* ✅ الشعار والمستخدم – استبدال الحرف الأول بالشعار الجديد */}
      <div className={`p-5 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full overflow-hidden shadow-lg shadow-yellow-400/20 flex-shrink-0">
            <img
              src="/images/logo.png"
              alt="محمد رضوان"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate text-lg`}>{userName || 'مستخدم'}</p>
            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{userRole === 'teacher' ? 'معلم' : 'طالب'}</p>
          </div>
        </div>
      </div>

      {/* إحصائيات سريعة */}
      <div className={`p-4 grid grid-cols-3 gap-2 border-b ${isDark ? 'border-gray-700/50' : 'border-gray-200'} ${isDark ? 'bg-white/5' : 'bg-gray-100/50'}`}>
        <div className="text-center">
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>الكورسات</p>
          <p className="text-lg font-bold text-yellow-400">{stats.totalCourses}</p>
        </div>
        <div className="text-center">
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>الطلاب</p>
          <p className="text-lg font-bold text-yellow-400">{stats.totalStudents}</p>
        </div>
        <div className="text-center">
          <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>التقدم</p>
          <p className="text-lg font-bold text-yellow-400">{stats.avgProgress}%</p>
        </div>
      </div>

      {/* قائمة التنقل */}
      <nav className={`flex-1 overflow-y-auto p-3 space-y-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onClose}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-sm group ${
                active
                  ? 'bg-yellow-400/10 text-yellow-400 shadow-lg shadow-yellow-400/5'
                  : isDark
                  ? 'hover:bg-white/5 hover:text-white'
                  : 'hover:bg-gray-200 hover:text-gray-900'
              }`}
            >
              <item.icon className={`h-5 w-5 ${active ? 'text-yellow-400' : isDark ? 'text-gray-400 group-hover:text-white' : 'text-gray-600 group-hover:text-gray-900'}`} />
              <span className="flex-1 font-medium">{item.name}</span>
              {item.badge !== null && (
                <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                  active ? 'bg-yellow-400/20 text-yellow-300' : isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-200 text-gray-700'
                }`}>
                  {item.badge}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="activeIndicator"
                  className="h-1 w-6 rounded-full bg-yellow-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}

        {/* المهام العاجلة */}
        {pendingTasks && pendingTasks.length > 0 && (
          <div className={`mt-6 pt-4 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'}`}>
            <p className={`text-[10px] uppercase tracking-wider ${isDark ? 'text-gray-500' : 'text-gray-500'} px-4 mb-3 font-semibold`}>📋 مهام عاجلة</p>
            {pendingTasks.slice(0, 3).map((task, idx) => (
              <Link
                key={idx}
                href={task.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs transition ${
                  task.priority === 'high' ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400' :
                  task.priority === 'medium' ? 'bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400' :
                  'bg-green-500/10 hover:bg-green-500/20 text-green-400'
                }`}
              >
                <task.icon className="h-4 w-4" />
                <span className="truncate font-medium">{task.title}</span>
              </Link>
            ))}
          </div>
        )}
      </nav>

      {/* أسفل الشريط الجانبي */}
      <div className={`p-4 border-t ${isDark ? 'border-gray-700/50' : 'border-gray-200'} space-y-2`}>
        <Link
          href="/dashboard/settings"
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 hover:text-yellow-400 transition-all duration-300 ${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm font-medium`}
          onClick={onClose}
        >
          <Icons.Settings className="h-5 w-5" />
          <span>الإعدادات</span>
        </Link>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            window.location.href = '/login';
          }}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-white/5 hover:text-red-400 transition-all duration-300 ${isDark ? 'text-gray-300' : 'text-gray-700'} text-sm font-medium w-full`}
        >
          <Icons.LogOut className="h-5 w-5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </motion.aside>
  );
};

// ============================================================
// 5. مكونات أخرى
// ============================================================

const QuickActionCard = ({ icon: Icon, label, href, color, description, badge, theme }) => {
  const isDark = theme === 'dark';
  return (
    <Link
      href={href}
      className={`group relative ${isDark ? 'bg-[#1e2433]' : 'bg-white'} backdrop-blur-sm border ${isDark ? 'border-gray-700/50' : 'border-gray-200'} rounded-2xl p-5 hover:border-yellow-400/60 transition-all duration-500 hover:shadow-xl hover:shadow-yellow-400/10 hover:bg-white/10 overflow-hidden`}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/0 via-yellow-400/5 to-yellow-400/0 opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-1000" />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
          <Icon className="h-5 w-5 text-white drop-shadow-md" />
        </div>
        <div className="flex-1">
          <h3 className={`${isDark ? 'text-white' : 'text-gray-900'} font-bold text-base`}>{label}</h3>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm leading-relaxed`}>{description}</p>
        </div>
        <Icons.ArrowLeft className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-600'} group-hover:text-yellow-400 group-hover:translate-x-1 transition-all`} />
      </div>
      {badge && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/30 font-bold">
            {badge}
          </span>
        </div>
      )}
    </Link>
  );
};

const ActivityItem = ({ activity, theme }) => {
  const isDark = theme === 'dark';
  const iconMap = {
    enroll: { icon: Icons.UserPlus, color: 'text-blue-400', bg: 'bg-blue-400/20' },
    view: { icon: Icons.Eye, color: 'text-green-400', bg: 'bg-green-400/20' },
    exam: { icon: Icons.FileText, color: 'text-yellow-400', bg: 'bg-yellow-400/20' },
    complete: { icon: Icons.CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/20' },
    info: { icon: Icons.Info, color: 'text-gray-400', bg: 'bg-gray-400/20' },
  };
  const info = iconMap[activity.type] || iconMap.info;
  const Icon = info.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 ${isDark ? 'bg-white/5' : 'bg-gray-100/70'} rounded-xl hover:bg-white/10 transition-all duration-300`}
    >
      <div className={`p-2 rounded-lg ${info.bg} ${info.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1">
        <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{activity.message}</p>
        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{activity.time}</p>
      </div>
    </motion.div>
  );
};

// ============================================================
// 6. الصفحة الرئيسية – النسخة النهائية مع بنك الأسئلة والدعم والمساعدين
// ============================================================

export default function TeacherDashboardPage() {
  const router = useRouter();
  const { theme, language, styles } = useTheme();

  const [color, setColor] = useState('gold');
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalVideos: 0,
    totalExams: 0,
    totalBooks: 0,
    totalQuestions: 0,
    totalRevenue: 0,
    avgProgress: 0,
    completionRate: 0,
    activeStudents: 0,
    totalViews: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [chartData, setChartData] = useState({
    progressDistribution: { labels: [], datasets: [] },
    courseDistribution: { labels: [], datasets: [] },
    revenueTrend: { labels: [], datasets: [] },
  });

  const colorOptions = [
    { name: 'ذهبي', value: 'gold', color: '#c9a84c' },
    { name: 'أزرق', value: 'blue', color: '#4a8fe0' },
    { name: 'أخضر', value: 'green', color: '#38b27a' },
    { name: 'أحمر', value: 'red', color: '#e05a5a' },
    { name: 'بنفسجي', value: 'purple', color: '#9b6bcc' },
  ];

  const getColorClass = () => {
    const colors = {
      gold: 'from-yellow-400 to-yellow-600',
      blue: 'from-blue-400 to-blue-600',
      green: 'from-green-400 to-green-600',
      red: 'from-red-400 to-red-600',
      purple: 'from-purple-400 to-purple-600',
    };
    return colors[color] || colors.gold;
  };
  const colorClass = getColorClass();

  const t = {
    ar: {
      welcome: 'مرحباً أيها المعلم',
      subtitle: 'نظرة عامة على أداء منصتك التعليمية',
      stats: {
        courses: 'الكورسات',
        students: 'الطلاب',
        videos: 'الفيديوهات',
        exams: 'الامتحانات',
        books: 'الكتب',
        questions: 'الأسئلة',
        revenue: 'الإيرادات',
        avgProgress: 'متوسط التقدم',
        completion: 'نسبة الإكمال',
      },
      quickActions: 'الوصول السريع',
      createCourse: 'إنشاء كورس',
      uploadVideo: 'رفع فيديو',
      createExam: 'إنشاء امتحان',
      createBook: 'إنشاء كتاب',
      questionBank: 'بنك الأسئلة',
      studentsAffairs: 'الدعم',
      studentsAffairsDesc: 'شكاوى فنية وأسئلة أكاديمية',
      topStudents: 'الطلاب الأكثر تقدماً',
      upcomingExams: 'الامتحانات القادمة',
      recentActivity: 'آخر النشاطات',
      pendingTasks: 'المهام العاجلة',
      viewAll: 'عرض الكل',
      noData: 'لا توجد بيانات',
      noExams: 'لا توجد امتحانات قادمة',
      noStudents: 'لا يوجد طلاب مسجلين بعد',
      noActivity: 'لا توجد نشاطات',
      backToTop: 'العودة للأعلى',
      quickLinks: 'روابط سريعة',
    },
    en: {
      welcome: 'Welcome, Teacher',
      subtitle: 'Overview of your educational platform performance',
      stats: {
        courses: 'Courses',
        students: 'Students',
        videos: 'Videos',
        exams: 'Exams',
        books: 'Books',
        questions: 'Questions',
        revenue: 'Revenue',
        avgProgress: 'Average Progress',
        completion: 'Completion Rate',
      },
      quickActions: 'Quick Access',
      createCourse: 'Create Course',
      uploadVideo: 'Upload Video',
      createExam: 'Create Exam',
      createBook: 'Create Book',
      questionBank: 'Question Bank',
      studentsAffairs: 'Support',
      studentsAffairsDesc: 'Technical issues and academic questions',
      topStudents: 'Top Students',
      upcomingExams: 'Upcoming Exams',
      recentActivity: 'Recent Activity',
      pendingTasks: 'Pending Tasks',
      viewAll: 'View All',
      noData: 'No data',
      noExams: 'No upcoming exams',
      noStudents: 'No students enrolled yet',
      noActivity: 'No activity',
      backToTop: 'Back to Top',
      quickLinks: 'Quick Links',
    },
  };

  const lang = t[language] || t.ar;

  // جلب بيانات لوحة التحكم
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // الكورسات
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, price, students_count, is_free, is_published, created_at')
        .eq('teacher_id', user.id);

      const courseIds = coursesData?.map(c => c.id) || [];
      const totalCourses = coursesData?.length || 0;

      // ===== حساب totalStudents من جدول enrollments =====
      let totalStudents = 0;
      if (courseIds.length > 0) {
        const { data: enrollmentsData, error: enrollError } = await supabase
          .from('enrollments')
          .select('student_id')
          .in('course_id', courseIds);

        if (!enrollError && enrollmentsData) {
          // عدد الطلاب المميزين (Unique students)
          const uniqueStudents = new Set(enrollmentsData.map(e => e.student_id));
          totalStudents = uniqueStudents.size;
        }
      }

      // حساب الإيرادات (نستخدم students_count من الكورسات – لا يتغير)
      const totalRevenue = coursesData?.reduce((acc, c) => {
        if (c.is_free) return acc;
        return acc + (c.price * (c.students_count || 0));
      }, 0) || 0;

      // الفيديوهات
      const { count: totalVideos } = await supabase
        .from('videos')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user.id);

      // الامتحانات
      const { count: totalExams } = await supabase
        .from('exams')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user.id);

      // الكتب
      const { count: totalBooks } = await supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user.id);

      // الأسئلة (من جدول question_banks - جمع)
      const { count: totalQuestions } = await supabase
        .from('question_banks')
        .select('id', { count: 'exact', head: true })
        .eq('teacher_id', user.id);

      // التقدم والمشاهدات
      let avgProgress = 0;
      let completionRate = 0;
      let activeStudents = 0;
      let totalViews = 0;

      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('progress, completed_at')
          .in('course_id', courseIds);

        if (enrollments && enrollments.length > 0) {
          const progresses = enrollments.map(e => e.progress || 0);
          avgProgress = Math.round(progresses.reduce((a, b) => a + b, 0) / progresses.length);
          const completed = enrollments.filter(e => e.completed_at).length;
          completionRate = Math.round((completed / enrollments.length) * 100);
          activeStudents = enrollments.filter(e => e.progress > 0 && !e.completed_at).length;
        }

        const { data: viewsData } = await supabase
          .from('videos')
          .select('views')
          .in('course_id', courseIds);
        if (viewsData) {
          totalViews = viewsData.reduce((sum, v) => sum + (v.views || 0), 0);
        }
      }

      // الطلاب الأكثر تقدماً
      let topStudentsData = [];
      if (courseIds.length > 0) {
        const { data: topEnrollments } = await supabase
          .from('enrollments')
          .select(`
            student_id,
            progress,
            profiles:student_id (full_name)
          `)
          .in('course_id', courseIds)
          .order('progress', { ascending: false })
          .limit(5);

        if (topEnrollments) {
          topStudentsData = topEnrollments.map((e) => ({
            id: e.student_id,
            name: e.profiles?.full_name || 'طالب',
            progress: e.progress || 0,
          }));
        }
      }
      setTopStudents(topStudentsData);

      // جلب الامتحانات القادمة (بدون students_count)
      const now = new Date().toISOString();
      const { data: upcoming, error: upcomingError } = await supabase
        .from('exams')
        .select('id, title, start_date')
        .eq('teacher_id', user.id)
        .eq('is_published', true)
        .gte('start_date', now)
        .order('start_date', { ascending: true })
        .limit(3);

      if (upcomingError) {
        console.error('Error fetching upcoming exams:', upcomingError);
        setUpcomingExams([]);
      } else {
        setUpcomingExams(upcoming || []);
      }

      // المهام العاجلة
      const tasks = [];
      if (totalCourses === 0) tasks.push({ title: 'أنشئ أول كورس لك', icon: Icons.Plus, href: '/dashboard/teacher/courses/new', priority: 'high' });
      if (totalVideos === 0) tasks.push({ title: 'أضف فيديو تعليمي', icon: Icons.Video, href: '/dashboard/teacher/videos/new', priority: 'medium' });
      if (totalExams === 0) tasks.push({ title: 'أنشئ امتحاناً لطلابك', icon: Icons.FileText, href: '/dashboard/teacher/exams/new', priority: 'medium' });
      if (totalBooks === 0) tasks.push({ title: 'أنشئ كتاباً تفاعلياً', icon: Icons.BookOpen, href: '/dashboard/teacher/books/new', priority: 'low' });
      if (totalQuestions === 0) tasks.push({ title: 'أنشئ بنك أسئلة', icon: Icons.ClipboardList, href: '/dashboard/teacher/question-bank', priority: 'medium' });
      if (tasks.length === 0) tasks.push({ title: 'كل شيء على ما يرام! استمر في التميز', icon: Icons.Trophy, href: '#', priority: 'low' });
      setPendingTasks(tasks);

      // النشاطات الأخيرة
      const activities = [];
      if (totalStudents > 0) activities.push({ type: 'enroll', message: `${totalStudents} طالب مسجل في كورساتك`, time: 'اليوم' });
      if (totalViews > 0) activities.push({ type: 'view', message: `${totalViews} مشاهدة على فيديوهاتك`, time: 'هذا الأسبوع' });
      if (totalExams > 0) activities.push({ type: 'exam', message: `لديك ${totalExams} امتحان منشور`, time: 'هذا الشهر' });
      if (totalQuestions > 0) activities.push({ type: 'info', message: `${totalQuestions} سؤال في بنك الأسئلة`, time: 'آخر تحديث' });
      if (completionRate > 0) activities.push({ type: 'complete', message: `نسبة الإكمال ${completionRate}%`, time: 'آخر تحديث' });
      if (activities.length === 0) activities.push({ type: 'info', message: 'ابدأ بإضافة محتوى إلى منصتك', time: 'الآن' });
      setRecentActivities(activities);

      // بيانات الرسوم البيانية
      const progressRanges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('progress')
          .in('course_id', courseIds);
        if (enrollments) {
          enrollments.forEach(e => {
            const p = e.progress || 0;
            if (p <= 20) progressRanges['0-20']++;
            else if (p <= 40) progressRanges['21-40']++;
            else if (p <= 60) progressRanges['41-60']++;
            else if (p <= 80) progressRanges['61-80']++;
            else progressRanges['81-100']++;
          });
        }
      }

      const published = coursesData?.filter(c => c.is_published).length || 0;
      const drafts = totalCourses - published;

      const revenueTrend = {
        labels: ['أسبوع 1', 'أسبوع 2', 'أسبوع 3', 'أسبوع 4'],
        data: [Math.floor(totalRevenue * 0.2), Math.floor(totalRevenue * 0.3), Math.floor(totalRevenue * 0.25), Math.floor(totalRevenue * 0.25)],
      };

      setChartData({
        progressDistribution: {
          labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
          datasets: [{
            label: 'عدد الطلاب',
            data: Object.values(progressRanges),
            backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(52, 211, 153, 0.7)'],
            borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
            borderWidth: 2,
          }],
        },
        courseDistribution: {
          labels: ['منشور', 'مسودة'],
          datasets: [{
            data: [published, drafts],
            backgroundColor: ['rgba(74, 222, 128, 0.8)', 'rgba(156, 163, 175, 0.8)'],
            borderColor: ['rgb(74, 222, 128)', 'rgb(156, 163, 175)'],
            borderWidth: 2,
          }],
        },
        revenueTrend: {
          labels: revenueTrend.labels,
          datasets: [{
            label: 'الإيرادات (ج.م)',
            data: revenueTrend.data,
            borderColor: 'rgb(52, 211, 153)',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            fill: true,
            tension: 0.4,
          }],
        },
      });

      setStats({
        totalCourses,
        totalStudents,
        totalVideos: totalVideos || 0,
        totalExams: totalExams || 0,
        totalBooks: totalBooks || 0,
        totalQuestions: totalQuestions || 0,
        totalRevenue,
        avgProgress,
        completionRate,
        activeStudents,
        totalViews,
      });

    } catch (err) {
      console.error('Error fetching dashboard:', err);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const changeColor = (colorValue) => {
    setColor(colorValue);
    setIsColorMenuOpen(false);
  };
  const toggleSidebar = () => setSidebarOpen(!sidebarOpen);

  // إعداد بيانات الإحصائيات
  const statsData = [
    { id: 1, label: lang.stats.courses, value: stats.totalCourses, suffix: '', icon: Icons.BookOpen, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: lang.stats.students, value: stats.totalStudents, suffix: '', icon: Icons.Users, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: lang.stats.videos, value: stats.totalVideos, suffix: '', icon: Icons.Video, color: 'from-yellow-400 to-yellow-600', delay: 0.2 },
    { id: 4, label: lang.stats.exams, value: stats.totalExams, suffix: '', icon: Icons.FileText, color: 'from-purple-400 to-purple-600', delay: 0.3 },
    { id: 5, label: lang.stats.books, value: stats.totalBooks, suffix: '', icon: Icons.Book, color: 'from-orange-400 to-orange-600', delay: 0.4 },
    { id: 6, label: lang.stats.questions, value: stats.totalQuestions, suffix: '', icon: Icons.ClipboardList, color: 'from-amber-400 to-amber-600', delay: 0.45 },
    { id: 7, label: lang.stats.revenue, value: stats.totalRevenue, suffix: ' ج.م', icon: Icons.CreditCard, color: 'from-emerald-400 to-emerald-600', delay: 0.5 },
    { id: 8, label: lang.stats.avgProgress, value: stats.avgProgress, suffix: '%', icon: Icons.TrendingUp, color: 'from-amber-400 to-amber-600', delay: 0.6 },
    { id: 9, label: lang.stats.completion, value: stats.completionRate, suffix: '%', icon: Icons.CheckCircle, color: 'from-teal-400 to-teal-600', delay: 0.7 },
  ];

  const themeStyles = theme === 'dark'
    ? { bg: 'bg-[#0b0e1a]', text: 'text-white', card: 'bg-white/5', border: 'border-gray-700/50' }
    : { bg: 'bg-gray-50', text: 'text-gray-900', card: 'bg-white', border: 'border-gray-200' };

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-screen ${themeStyles.bg}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className={`text-sm font-medium ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${themeStyles.bg} relative flex flex-row`}>
      <InteractiveParticles />

      {/* الشريط الجانبي */}
      <Sidebar
        userRole="teacher"
        userName="محمد رضوان"
        pathname="/dashboard/teacher"
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        stats={stats}
        pendingTasks={pendingTasks}
        theme={theme}
      />

      {/* المحتوى الرئيسي */}
      <div className={`flex-1 ${themeStyles.text} overflow-x-hidden`}>
        <header className={`sticky top-0 z-40 ${theme === 'dark' ? 'bg-[#0b0e1a]/95' : 'bg-gray-50/95'} backdrop-blur-xl border-b ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} px-4 md:px-8 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <button onClick={toggleSidebar} className="lg:hidden text-current hover:text-yellow-400 transition">
              <Icons.Menu className="h-6 w-6" />
            </button>
            <h2 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              {lang.welcome}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <button onClick={() => setIsColorMenuOpen(!isColorMenuOpen)} className={`p-2.5 rounded-xl ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10' : 'bg-gray-200 hover:bg-gray-300'} transition`}>
                <Icons.Palette className="h-5 w-5" />
              </button>
              <AnimatePresence>
                {isColorMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className={`absolute left-0 mt-2 p-3 ${theme === 'dark' ? 'bg-[#1a1f2e] border-gray-700/50' : 'bg-white border-gray-200'} border rounded-2xl shadow-2xl flex gap-2 z-50`}
                  >
                    {colorOptions.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => changeColor(c.value)}
                        className={`w-8 h-8 rounded-full transition hover:scale-110 ${color === c.value ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#1a1f2e]' : ''}`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {/* ✅ استبدال أيقونة "م" بالشعار الجديد في الهيدر */}
            <div className="h-9 w-9 rounded-full overflow-hidden shadow-lg flex-shrink-0">
              <img
                src="/images/logo.png"
                alt="محمد رضوان"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </header>

        {/* المحتوى */}
        <main className="p-4 md:p-8 space-y-8">
          {/* الترحيب */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-2"
          >
            <h1 className={`text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient`}>
              {lang.welcome} 👋
            </h1>
            <p className={`text-base ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} max-w-2xl`}>{lang.subtitle}</p>
          </motion.div>

          {/* الإحصائيات */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9 gap-5">
            {statsData.map((stat) => (
              <StatCard key={stat.id} stat={stat} theme={theme} />
            ))}
          </div>

          {/* الشبكة الرئيسية */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* الوصول السريع */}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                <h2 className={`text-xl font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Icons.Rocket className="h-6 w-6 text-yellow-400" /> {lang.quickActions}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <QuickActionCard
                    icon={Icons.Plus}
                    label={lang.createCourse}
                    description="أضف كورساً تعليمياً جديداً"
                    href="/dashboard/teacher/courses/new"
                    color="from-blue-400 to-blue-600"
                    theme={theme}
                  />
                  <QuickActionCard
                    icon={Icons.Upload}
                    label={lang.uploadVideo}
                    description="أضف فيديو تعليمي جديد"
                    href="/dashboard/teacher/videos/new"
                    color="from-green-400 to-green-600"
                    theme={theme}
                  />
                  <QuickActionCard
                    icon={Icons.FileText}
                    label={lang.createExam}
                    description="صمم امتحاناً لطلابك"
                    href="/dashboard/teacher/exams/new"
                    color="from-purple-400 to-purple-600"
                    theme={theme}
                  />
                  <QuickActionCard
                    icon={Icons.BookOpen}
                    label={lang.createBook}
                    description="أضف كتاباً تفاعلياً جديداً"
                    href="/dashboard/teacher/books/new"
                    color="from-orange-400 to-orange-600"
                    theme={theme}
                  />
                  <QuickActionCard
                    icon={Icons.ClipboardList}
                    label={lang.questionBank}
                    description="إدارة بنوك الأسئلة والأسئلة"
                    href="/dashboard/teacher/question-bank"
                    color="from-yellow-400 to-yellow-600"
                    badge={stats.totalQuestions > 0 ? `${stats.totalQuestions} سؤال` : null}
                    theme={theme}
                  />
                  <QuickActionCard
                    icon={Icons.HelpCircle}
                    label={lang.studentsAffairs}
                    description={lang.studentsAffairsDesc}
                    href="/dashboard/teacher/support"
                    color="from-cyan-400 to-blue-600"
                    badge="جديد"
                    theme={theme}
                  />
                  <Link
                    href="/dashboard/teacher/assistants"
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 text-center hover:border-yellow-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/10 group"
                  >
                    <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 text-white group-hover:scale-110 transition">
                      <Icons.Users className="h-6 w-6 text-purple-400" />
                    </div>
                    <h3 className="text-white font-semibold mt-3">المساعدين</h3>
                    <p className="text-gray-400 text-xs mt-1">إدارة فريق العمل</p>
                    <span className="mt-2 inline-block text-[10px] bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full">جديد</span>
                  </Link>
                </div>
              </motion.div>

              {/* المهام العاجلة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`${theme === 'dark' ? 'bg-[#1e2433]' : 'bg-white'} backdrop-blur-sm border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}
              >
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Icons.ClipboardList className="h-6 w-6 text-yellow-400" /> {lang.pendingTasks}
                </h3>
                <div className="space-y-3">
                  {pendingTasks.map((task, idx) => (
                    <Link
                      key={idx}
                      href={task.href}
                      className={`flex items-center gap-3 p-4 rounded-xl transition-all duration-300 ${
                        task.priority === 'high' ? 'bg-red-500/10 hover:bg-red-500/20 border border-red-500/20' :
                        task.priority === 'medium' ? 'bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/20' :
                        'bg-green-500/10 hover:bg-green-500/20 border border-green-500/20'
                      }`}
                    >
                      <task.icon className={`h-6 w-6 ${
                        task.priority === 'high' ? 'text-red-400' :
                        task.priority === 'medium' ? 'text-yellow-400' :
                        'text-green-400'
                      }`} />
                      <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'} flex-1`}>{task.title}</span>
                      <Icons.ArrowLeft className="h-5 w-5 text-gray-400 group-hover:text-yellow-400 transition" />
                    </Link>
                  ))}
                </div>
              </motion.div>

              {/* الطلاب المتميزون */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`${theme === 'dark' ? 'bg-[#1e2433]' : 'bg-white'} backdrop-blur-sm border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Icons.Trophy className="h-6 w-6 text-yellow-400" /> {lang.topStudents}
                  </h3>
                  <Link href="/dashboard/teacher/students" className="text-sm font-medium text-yellow-400 hover:text-yellow-300 transition">
                    {lang.viewAll} →
                  </Link>
                </div>
                {topStudents.length === 0 ? (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{lang.noStudents}</p>
                ) : (
                  <div className="space-y-3">
                    {topStudents.map((student, idx) => (
                      <div key={`${student.id}-${idx}`} className={`flex items-center justify-between p-3 ${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'} rounded-xl hover:bg-white/10 transition`}>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-yellow-400">#{idx + 1}</span>
                          <span className={`text-sm font-medium ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{student.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full" style={{ width: `${student.progress}%` }} />
                          </div>
                          <span className="text-xs font-bold text-yellow-400">{student.progress}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </div>

            <div className="space-y-8">
              {/* رسم بياني توزيع الكورسات */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className={`${theme === 'dark' ? 'bg-[#1e2433]' : 'bg-white'} backdrop-blur-sm border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}
              >
                <h3 className={`text-lg font-bold mb-4 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>توزيع الكورسات</h3>
                <div className="max-w-xs mx-auto">
                  <Doughnut
                    data={chartData.courseDistribution}
                    options={{
                      responsive: true,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: theme === 'dark' ? '#fff' : '#333', font: { weight: 'bold' } },
                        },
                      },
                    }}
                  />
                </div>
              </motion.div>

              {/* رسم بياني اتجاه الإيرادات */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className={`${theme === 'dark' ? 'bg-[#1e2433]' : 'bg-white'} backdrop-blur-sm border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}
              >
                <h3 className={`text-lg font-bold mb-4 text-center ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>اتجاه الإيرادات</h3>
                <div className="h-48">
                  <Line
                    data={chartData.revenueTrend}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: { color: theme === 'dark' ? '#fff' : '#333', font: { weight: 'bold' } },
                          grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                        },
                        x: {
                          ticks: { color: theme === 'dark' ? '#fff' : '#333', font: { weight: 'bold' } },
                          grid: { display: false },
                        },
                      },
                    }}
                  />
                </div>
              </motion.div>

              {/* الامتحانات القادمة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`${theme === 'dark' ? 'bg-[#1e2433]' : 'bg-white'} backdrop-blur-sm border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}
              >
                <div className="flex justify-between items-center mb-4">
                  <h3 className={`text-lg font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                    <Icons.Calendar className="h-6 w-6 text-yellow-400" /> {lang.upcomingExams}
                  </h3>
                  <Link href="/dashboard/teacher/exams" className="text-sm font-medium text-yellow-400 hover:text-yellow-300 transition">
                    {lang.viewAll} →
                  </Link>
                </div>
                {upcomingExams.length === 0 ? (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{lang.noExams}</p>
                ) : (
                  <div className="space-y-3">
                    {upcomingExams.map((exam) => (
                      <div key={exam.id} className={`${theme === 'dark' ? 'bg-white/5' : 'bg-gray-100'} border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-xl p-4 hover:border-yellow-400/30 transition`}>
                        <p className={`font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{exam.title}</p>
                        <div className={`flex justify-between text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} mt-1`}>
                          <span>{new Date(exam.start_date).toLocaleDateString('ar-EG')}</span>
                          <span></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>

              {/* النشاطات الأخيرة */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`${theme === 'dark' ? 'bg-[#1e2433]' : 'bg-white'} backdrop-blur-sm border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}
              >
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
                  <Icons.Activity className="h-6 w-6 text-blue-400" /> {lang.recentActivity}
                </h3>
                {recentActivities.length === 0 ? (
                  <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>{lang.noActivity}</p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {recentActivities.map((act, idx) => (
                      <ActivityItem key={idx} activity={act} theme={theme} />
                    ))}
                  </div>
                )}
              </motion.div>
            </div>
          </div>

          {/* روابط سريعة */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className={`${theme === 'dark' ? 'bg-[#1e2433]' : 'bg-white'} backdrop-blur-sm border ${theme === 'dark' ? 'border-gray-700/50' : 'border-gray-200'} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}
          >
            <h3 className={`text-base font-bold mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              <Icons.Link className="h-5 w-5 text-yellow-400" /> {lang.quickLinks}
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/teacher/courses" className={`text-sm font-medium ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg transition`}>الكورسات</Link>
              <Link href="/dashboard/teacher/videos" className={`text-sm font-medium ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg transition`}>الفيديوهات</Link>
              <Link href="/dashboard/teacher/exams" className={`text-sm font-medium ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg transition`}>الامتحانات</Link>
              <Link href="/dashboard/teacher/books" className={`text-sm font-medium ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg transition`}>الكتب</Link>
              <Link href="/dashboard/teacher/question-bank" className={`text-sm font-bold ${theme === 'dark' ? 'bg-yellow-400/10 hover:bg-yellow-400/20 text-yellow-300' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-700'} px-4 py-2 rounded-lg border border-yellow-400/30 transition`}>بنك الأسئلة</Link>
              <Link href="/dashboard/teacher/support" className={`text-sm font-bold ${theme === 'dark' ? 'bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-300' : 'bg-cyan-100 hover:bg-cyan-200 text-cyan-700'} px-4 py-2 rounded-lg border border-cyan-400/30 transition`}>
                الدعم
              </Link>
              <Link href="/dashboard/teacher/assistants" className={`text-sm font-bold ${theme === 'dark' ? 'bg-blue-400/10 hover:bg-blue-400/20 text-blue-300' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'} px-4 py-2 rounded-lg border border-blue-400/30 transition`}>المساعدين</Link>
              <Link href="/dashboard/teacher/students" className={`text-sm font-medium ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg transition`}>الطلاب</Link>
              <Link href="/dashboard/teacher/reports" className={`text-sm font-medium ${theme === 'dark' ? 'bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'} px-4 py-2 rounded-lg transition`}>التقارير</Link>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}