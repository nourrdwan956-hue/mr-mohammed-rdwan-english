'use client';

// ================================================================
// 📁 app/dashboard/assistant/page.js
// 🎯 لوحة تحكم المساعد الرئيسية – النسخة المتطورة V3
// ================================================================
// - دعم كامل للثيم (فاتح/داكن) عبر CSS Variables
// - استخدام ThemeProvider و useTheme
// - إحصائيات متحركة، رسم بياني، نشاطات، إجراءات سريعة
// - تصميم Glassmorphism فاخر مع أنيميشن متقدمة
// ================================================================

import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import {
  LayoutDashboard,
  BookOpen,
  Video,
  FileText,
  Book,
  Database,
  Users,
  Clock,
  History,
  BarChart3,
  Zap,
  Shield,
  ChevronLeft,
  Sun,
  Moon,
  HelpCircle,
  Megaphone,
  Mail,
  StickyNote,
  Grid,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
// ✅ استيراد useTheme من المسار الموحد
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// تسجيل مكونات Chart.js
// ================================================================
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

// ================================================================
// 🧮 مكون عداد متحرك
// ================================================================
const AnimatedCounter = ({ target, suffix = '', duration = 1500, prefix = '' }) => {
  const [count, setCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
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
  }, [visible, target, duration]);

  return (
    <span ref={ref} className="font-extrabold tracking-tight">
      {prefix}
      {count}
      {suffix}
    </span>
  );
};

// ================================================================
// 📊 بطاقة الإحصاء (معدلة لاستخدام styles)
// ================================================================
const StatCard = ({ stat, styles }) => {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay || 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative rounded-2xl p-5 transition-all duration-300 ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm ${styles.subtext}`}>
            {stat.label}
          </p>
          <p className={`text-2xl font-extrabold mt-1 ${styles.text}`}>
            <AnimatedCounter target={stat.value} />
          </p>
        </div>
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}
        >
          <stat.icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{
            width: hover
              ? '100%'
              : `${Math.min((stat.value / (stat.max || 100)) * 100, 100)}%`,
          }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </motion.div>
  );
};

// ================================================================
// ⚡ الإجراء السريع (معدل لاستخدام styles)
// ================================================================
const QuickAction = ({ action, styles, onClick }) => {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: action.delay || 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onClick(action.path)}
      className={`relative rounded-2xl p-5 cursor-pointer transition-all duration-300 overflow-hidden ${styles.card} border ${styles.border} hover:border-yellow-400/50 hover:shadow-lg hover:shadow-yellow-400/10`}
    >
      <div className="flex items-center gap-4">
        <div
          className={`p-3 rounded-xl bg-gradient-to-br ${action.color} bg-opacity-20 flex-shrink-0`}
        >
          <action.icon className="w-6 h-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className={`text-base font-bold ${styles.text}`}>
            {action.label}
          </h3>
          <p className={`text-sm ${styles.subtext}`}>
            {action.description}
          </p>
        </div>
        <ChevronLeft
          className={`w-5 h-5 ${styles.subtext} transition-transform duration-300 ${hover ? 'translate-x-1' : ''}`}
        />
      </div>
      {action.count !== undefined && (
        <div className="absolute top-3 right-3 text-xs bg-yellow-400/20 text-yellow-400 px-2 py-1 rounded-full">
          {action.count}
        </div>
      )}
    </motion.div>
  );
};

// ================================================================
// 📄 الصفحة الرئيسية
// ================================================================
export default function AssistantDashboardPage() {
  const router = useRouter();
  const { theme, styles } = useTheme(); // ✅ استخدام الثيم الموحد

  // حالات الصفحة
  const [loading, setLoading] = useState(true);
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [stats, setStats] = useState({});
  const [logs, setLogs] = useState([]);
  const [chartData, setChartData] = useState(null);
  const fetched = useRef(false);

  // ===== جلب البيانات =====
  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;

    const fetchData = async () => {
      try {
        const sessionData = sessionStorage.getItem('assistantData');
        if (!sessionData) {
          router.replace('/assistant-login');
          return;
        }

        const parsed = JSON.parse(sessionData);
        const res = await fetch('/api/assistant/dashboard-data', {
          headers: { 'x-assistant-id': parsed.id },
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'فشل جلب البيانات');
        if (!data.success) throw new Error('فشل جلب البيانات');

        setAssistant(data.assistant);
        setPermissions(data.permissions || []);
        setStats(data.stats || {});
        setLogs(data.logs || []);
        sessionStorage.setItem('assistantData', JSON.stringify(data.assistant));

        // ===== إعداد الرسم البياني =====
        const labels = [];
        const values = [];
        const s = data.stats || {};
        if (s.courses > 0) { labels.push('كورسات'); values.push(s.courses); }
        if (s.videos > 0) { labels.push('فيديوهات'); values.push(s.videos); }
        if (s.exams > 0) { labels.push('امتحانات'); values.push(s.exams); }
        if (s.books > 0) { labels.push('كتب'); values.push(s.books); }
        if (s.questionBanks > 0) { labels.push('بنوك أسئلة'); values.push(s.questionBanks); }
        if (s.support > 0) { labels.push('دعم'); values.push(s.support); }

        if (labels.length > 0) {
          const colors = [
            'rgba(59, 130, 246, 0.8)',
            'rgba(168, 85, 247, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(251, 146, 60, 0.8)',
            'rgba(6, 182, 212, 0.8)',
          ];
          setChartData({
            labels,
            datasets: [
              {
                label: 'المحتوى التعليمي',
                data: values,
                backgroundColor: colors.slice(0, values.length),
                borderColor: colors
                  .slice(0, values.length)
                  .map((c) => c.replace('0.8', '1')),
                borderWidth: 2,
                borderRadius: 8,
              },
            ],
          });
        }
      } catch (err) {
        console.error('❌ Dashboard error:', err);
        toast.error(err.message || 'حدث خطأ أثناء تحميل البيانات');
        router.replace('/assistant-login');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router]);

  // ===== دوال التحقق من الصلاحيات =====
  const hasView = (module) => {
    const perm = permissions.find((p) => p.module === module);
    return perm?.can_view || perm?.can_manage || false;
  };

  // ===== تجهيز بيانات الإحصائيات (باستخدام الوحدات الجديدة) =====
  const statsData = useMemo(() => {
    const items = [];
    if (hasView('courses'))
      items.push({
        label: 'الكورسات',
        value: stats.courses || 0,
        icon: BookOpen,
        color: 'from-blue-400 to-blue-600',
        delay: 0,
        max: 50,
      });
    if (hasView('videos'))
      items.push({
        label: 'الفيديوهات',
        value: stats.videos || 0,
        icon: Video,
        color: 'from-purple-400 to-purple-600',
        delay: 0.1,
        max: 50,
      });
    if (hasView('exams'))
      items.push({
        label: 'الامتحانات',
        value: stats.exams || 0,
        icon: FileText,
        color: 'from-red-400 to-red-600',
        delay: 0.2,
        max: 50,
      });
    if (hasView('books'))
      items.push({
        label: 'الكتب',
        value: stats.books || 0,
        icon: Book,
        color: 'from-green-400 to-green-600',
        delay: 0.3,
        max: 50,
      });
    if (hasView('question_bank'))
      items.push({
        label: 'بنوك الأسئلة',
        value: stats.questionBanks || 0,
        icon: Database,
        color: 'from-orange-400 to-orange-600',
        delay: 0.4,
        max: 50,
      });
    if (hasView('support'))
      items.push({
        label: 'الدعم',
        value: stats.support || 0,
        icon: HelpCircle,
        color: 'from-yellow-400 to-yellow-600',
        delay: 0.5,
        max: 50,
      });
    return items;
  }, [permissions, stats]);

  // ===== الإجراءات السريعة (باستخدام الوحدات الجديدة) =====
  const quickActions = useMemo(() => {
    const actions = [];
    if (hasView('courses'))
      actions.push({
        label: 'الكورسات',
        description: 'إدارة الكورسات',
        icon: BookOpen,
        color: 'from-blue-400 to-blue-600',
        path: '/dashboard/assistant/courses',
        delay: 0,
        count: stats.courses || 0,
      });
    if (hasView('videos'))
      actions.push({
        label: 'الفيديوهات',
        description: 'إدارة الفيديوهات',
        icon: Video,
        color: 'from-purple-400 to-purple-600',
        path: '/dashboard/assistant/videos',
        delay: 0.1,
        count: stats.videos || 0,
      });
    if (hasView('exams'))
      actions.push({
        label: 'الامتحانات',
        description: 'إدارة الامتحانات',
        icon: FileText,
        color: 'from-red-400 to-red-600',
        path: '/dashboard/assistant/exams',
        delay: 0.2,
        count: stats.exams || 0,
      });
    if (hasView('books'))
      actions.push({
        label: 'الكتب',
        description: 'إدارة الكتب',
        icon: Book,
        color: 'from-green-400 to-green-600',
        path: '/dashboard/assistant/books',
        delay: 0.3,
        count: stats.books || 0,
      });
    if (hasView('question_bank'))
      actions.push({
        label: 'بنوك الأسئلة',
        description: 'إدارة بنوك الأسئلة',
        icon: Database,
        color: 'from-orange-400 to-orange-600',
        path: '/dashboard/assistant/question-bank',
        delay: 0.4,
        count: stats.questionBanks || 0,
      });
    if (hasView('support'))
      actions.push({
        label: 'الدعم',
        description: 'الشكاوى والأسئلة',
        icon: HelpCircle,
        color: 'from-yellow-400 to-yellow-600',
        path: '/dashboard/assistant/support',
        delay: 0.5,
        count: stats.support || 0,
      });
    if (hasView('announcements'))
      actions.push({
        label: 'الإعلانات',
        description: 'إدارة الإعلانات',
        icon: Megaphone,
        color: 'from-pink-400 to-pink-600',
        path: '/dashboard/assistant/announcements',
        delay: 0.6,
        count: stats.announcements || 0,
      });
    if (hasView('messages'))
      actions.push({
        label: 'المراسلات',
        description: 'الرسائل الخاصة',
        icon: Mail,
        color: 'from-emerald-400 to-emerald-600',
        path: '/dashboard/assistant/messages',
        delay: 0.7,
        count: stats.messages || 0,
      });
    if (hasView('notes'))
      actions.push({
        label: 'الملاحظات',
        description: 'ملاحظات المعلم',
        icon: StickyNote,
        color: 'from-amber-400 to-amber-600',
        path: '/dashboard/assistant/notes',
        delay: 0.8,
        count: stats.notes || 0,
      });
    return actions;
  }, [permissions, stats]);

  // ===== خيارات الرسم البياني (يعتمد على الثيم) =====
  const isDark = theme === 'dark';
  const barOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: isDark ? '#e5e7eb' : '#1f2937',
            font: { size: 11, family: 'Cairo' },
            padding: 15,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            color: isDark ? '#9ca3af' : '#6b7280',
            stepSize: 1,
            font: { size: 10 },
          },
          grid: {
            color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          },
        },
        x: {
          ticks: {
            color: isDark ? '#9ca3af' : '#6b7280',
            font: { size: 10 },
          },
          grid: { display: false },
        },
      },
    }),
    [isDark]
  );

  // ===== التنقل =====
  const navigate = (path) => router.push(path);

  // ===== حالة التحميل =====
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg} ${styles.text}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${styles.subtext}`}>جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // ===== عرض المحتوى =====
  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">لوحة التحكم</h1>
            <p className={`text-sm ${styles.subtext}`}>
              مرحباً {assistant?.display_name || assistant?.full_name || 'المساعد'}
            </p>
          </div>
          <button
            onClick={() => { /* toggleTheme ستأتي من الـ Layout */ }}
            className={`mt-3 md:mt-0 p-2.5 rounded-xl transition-all ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            aria-label="تبديل الثيم"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600" />
            )}
          </button>
        </div>

        {/* ===== الإحصائيات ===== */}
        {statsData.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            {statsData.map((stat) => (
              <StatCard key={stat.label} stat={stat} styles={styles} />
            ))}
          </div>
        ) : (
          <div className={`rounded-2xl p-8 text-center mb-8 ${styles.card} border ${styles.border}`}>
            <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>لا توجد صلاحيات لعرض الإحصائيات</p>
          </div>
        )}

        {/* ===== الرسم البياني والنشاطات ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* الرسم البياني */}
          {chartData ? (
            <div className={`lg:col-span-2 rounded-2xl p-5 ${styles.card} border ${styles.border}`}>
              <h3 className="text-base font-bold mb-3 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-yellow-400" />
                توزيع المحتوى
              </h3>
              <div className="h-56">
                <Bar data={chartData} options={barOptions} />
              </div>
            </div>
          ) : (
            <div className={`lg:col-span-2 rounded-2xl p-8 text-center ${styles.card} border ${styles.border}`}>
              <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>لا توجد بيانات كافية للرسم البياني</p>
            </div>
          )}

          {/* النشاطات الأخيرة */}
          <div className={`rounded-2xl p-5 ${styles.card} border ${styles.border}`}>
            <h3 className="text-base font-bold mb-3 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              آخر النشاطات
            </h3>
            {logs.length === 0 ? (
              <div className="text-center py-8">
                <History className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className={`text-sm ${styles.subtext}`}>لا توجد نشاطات حديثة</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {logs.map((log) => (
                  <div
                    key={log.id}
                    className={`flex items-center gap-3 p-2 rounded-xl ${styles.hoverBg || 'hover:bg-white/5'}`}
                  >
                    <div className="w-8 h-8 rounded-full bg-yellow-400/10 flex items-center justify-center">
                      <History className="w-4 h-4 text-yellow-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{log.action}</p>
                      <p className={`text-[10px] ${styles.subtext}`}>
                        {new Date(log.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {logs.length > 0 && (
              <Link
                href="/dashboard/assistant/logs"
                className="text-xs text-yellow-400 hover:underline block mt-2 text-center"
              >
                عرض الكل →
              </Link>
            )}
          </div>
        </div>

        {/* ===== الخدمات الرئيسية (بطاقات مميزة للوحدات الأربع الجديدة) ===== */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Grid className="w-5 h-5 text-yellow-400" />
            الخدمات الرئيسية
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                label: 'الدعم', 
                icon: HelpCircle, 
                desc: 'إدارة الشكاوى والأسئلة', 
                path: '/dashboard/assistant/support', 
                color: 'from-yellow-400 to-orange-500' 
              },
              { 
                label: 'المراسلات', 
                icon: Mail, 
                desc: 'الرسائل الخاصة مع الطلاب', 
                path: '/dashboard/assistant/messages', 
                color: 'from-emerald-400 to-teal-500' 
              },
              { 
                label: 'الإعلانات', 
                icon: Megaphone, 
                desc: 'إرسال الإعلانات للطلاب', 
                path: '/dashboard/assistant/announcements', 
                color: 'from-pink-400 to-rose-500' 
              },
              { 
                label: 'الملاحظات', 
                icon: StickyNote, 
                desc: 'ملاحظات خاصة عن الطلاب', 
                path: '/dashboard/assistant/notes', 
                color: 'from-amber-400 to-yellow-500' 
              },
            ].map((item) => (
              <Link key={item.path} href={item.path}>
                <motion.div
                  whileHover={{ scale: 1.03, y: -4 }}
                  className={`relative rounded-2xl p-6 ${styles.card} border ${styles.border} hover:border-yellow-400/50 transition-all duration-300 cursor-pointer overflow-hidden group`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className={`p-4 rounded-2xl bg-gradient-to-br ${item.color} bg-opacity-20 mb-3`}>
                      <item.icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className={`text-lg font-bold ${styles.text}`}>{item.label}</h3>
                    <p className={`text-sm ${styles.subtext} mt-1`}>{item.desc}</p>
                  </div>
                </motion.div>
              </Link>
            ))}
          </div>
        </div>

        {/* ===== الإجراءات السريعة ===== */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            الإجراءات السريعة
          </h2>
          {quickActions.length === 0 ? (
            <div className={`rounded-2xl p-8 text-center ${styles.card} border ${styles.border}`}>
              <Shield className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>لا توجد صلاحيات متاحة</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action) => (
                <QuickAction
                  key={action.path}
                  action={action}
                  styles={styles}
                  onClick={navigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}