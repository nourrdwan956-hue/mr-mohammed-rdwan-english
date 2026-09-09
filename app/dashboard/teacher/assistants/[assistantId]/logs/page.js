'use client';

// ================================================================
// 📋 سجل نشاط المساعد – لوحة المراقبة والتحليل
// المسار: app/dashboard/teacher/assistants/[assistantId]/logs/page.js
// ================================================================
// الميزات:
// - عرض جميع نشاطات المساعد مع تفاصيلها (الوقت، الإجراء، الوحدة، الهدف، IP)
// - إحصائيات سريعة (إجمالي النشاطات، آخر نشاط، النشاطات اليومية، توزيع الإجراءات)
// - فلترة حسب نوع الإجراء (create, edit, delete, view, publish, login, logout)
// - فلترة حسب الوحدة (videos, exams, books, question_bank, courses, support, announcements, messages, notes)
// - فلترة حسب الفترة الزمنية (اليوم، هذا الأسبوع، هذا الشهر، السنة، مخصص)
// - بحث في التفاصيل
// - ترتيب حسب التاريخ (الأحدث/الأقدم)
// - تصدير السجل كـ CSV أو JSON
// - عرض رسوم بيانية لتوزيع النشاطات
// - دعم الوضع الفاتح والداكن
// - ربط كامل بقاعدة البيانات (assistant_logs)
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
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
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// ================================================================
// 1. عداد متحرك
// ================================================================
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

  return <span ref={ref} className="font-extrabold">{count}{suffix}</span>;
};

// ================================================================
// 2. بطاقة إحصائية
// ================================================================
const StatCard = ({ stat, styles }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      className={`${styles.card} border ${styles.border} rounded-2xl p-5 ${styles.hover} transition-all duration-300 hover:shadow-2xl ${styles.shadow}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`${styles.subtext} text-sm`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && <p className={`text-xs ${styles.subtext} mt-0.5 opacity-70`}>{stat.sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 3. مكون صف السجل (Log Row)
// ================================================================
const LogRow = ({ log, index, styles }) => {
  const [expanded, setExpanded] = useState(false);

  const actionLabels = {
    create: 'إنشاء',
    edit: 'تعديل',
    delete: 'حذف',
    view: 'مشاهدة',
    publish: 'نشر',
    login: 'تسجيل دخول',
    logout: 'تسجيل خروج',
  };

  const actionColors = {
    create: 'bg-green-500/20 text-green-400 border-green-400/20',
    edit: 'bg-yellow-500/20 text-yellow-400 border-yellow-400/20',
    delete: 'bg-red-500/20 text-red-400 border-red-400/20',
    view: 'bg-blue-500/20 text-blue-400 border-blue-400/20',
    publish: 'bg-purple-500/20 text-purple-400 border-purple-400/20',
    login: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/20',
    logout: 'bg-gray-500/20 text-gray-400 border-gray-400/20',
  };

  // ✅ قائمة الوحدات المحدثة – النظام الجديد
  const moduleLabels = {
    courses: 'الكورسات',
    videos: 'الفيديوهات',
    exams: 'الامتحانات',
    books: 'الكتب',
    question_bank: 'بنوك الأسئلة',
    support: 'الدعم',
    announcements: 'الإعلانات',
    messages: 'المراسلات',
    notes: 'الملاحظات',
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
  };

  const getTimeSince = (date) => {
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'الآن';
    if (hours < 2) return 'منذ ساعة';
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `منذ ${days} يوم${days > 1 ? 'ين' : ''}`;
    return formatDate(date);
  };

  const actionLabel = actionLabels[log.action] || log.action;
  const actionColor = actionColors[log.action] || actionColors.view;
  const moduleLabel = moduleLabels[log.module] || log.module;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`border-b ${styles.border} hover:bg-white/5 transition cursor-pointer`}
      onClick={() => setExpanded(!expanded)}
    >
      <td className="py-3 px-3 text-center text-gray-500 text-xs">{index + 1}</td>
      <td className="py-3 px-3">
        <span className={`text-[10px] px-2 py-0.5 rounded-full border ${actionColor}`}>
          {actionLabel}
        </span>
      </td>
      <td className="py-3 px-3">
        <span className={`text-xs ${styles.subtext}`}>{moduleLabel}</span>
      </td>
      <td className="py-3 px-3 hidden md:table-cell">
        <span className={`text-xs ${styles.subtext} font-mono`}>
          {log.target_id ? log.target_id.slice(0, 8) : '—'}
        </span>
      </td>
      <td className="py-3 px-3 hidden lg:table-cell">
        <span className={`text-xs ${styles.subtext}`}>{log.ip_address || '—'}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`text-xs ${styles.subtext}`}>{getTimeSince(log.created_at)}</span>
      </td>
      <td className="py-3 px-3 text-center">
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className={`p-1 rounded-lg hover:bg-white/5 transition ${styles.subtext}`}
        >
          <Icons.ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </td>
    </motion.tr>
  );
};

// ================================================================
// 4. مودال تصدير السجل
// ================================================================
const ExportModal = ({ isOpen, onClose, logs, assistantName, styles }) => {
  const [format, setFormat] = useState('csv');
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = logs.map(log => ({
        'التاريخ': new Date(log.created_at).toLocaleString('ar-EG'),
        'الإجراء': log.action,
        'الوحدة': log.module,
        'الهدف': log.target_id || '',
        'عنوان IP': log.ip_address || '',
        'التفاصيل': JSON.stringify(log.details || {}),
      }));

      let content, filename;
      if (format === 'csv') {
        const headers = Object.keys(data[0] || {});
        const rows = [headers.join(',')];
        data.forEach(row => {
          rows.push(headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','));
        });
        content = rows.join('\n');
        filename = `سجل_${assistantName}_${new Date().toISOString().slice(0,10)}.csv`;
      } else {
        content = JSON.stringify(data, null, 2);
        filename = `سجل_${assistantName}_${new Date().toISOString().slice(0,10)}.json`;
      }

      const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('✅ تم تصدير السجل بنجاح');
      onClose();
    } catch (err) {
      toast.error('فشل تصدير السجل');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`${styles.card} border ${styles.border} rounded-3xl p-8 max-w-md w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-2xl font-bold ${styles.text} mb-4`}>📤 تصدير السجل</h3>
        <p className={`${styles.subtext} text-sm mb-4`}>
          اختر صيغة التصدير لسجل نشاط المساعد.
        </p>
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setFormat('csv')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              format === 'csv'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                : `${styles.card} border ${styles.border} hover:${styles.hover}`
            }`}
          >
            CSV
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition ${
              format === 'json'
                ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                : `${styles.card} border ${styles.border} hover:${styles.hover}`
            }`}
          >
            JSON
          </button>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition disabled:opacity-70"
          >
            {exporting ? 'جاري التصدير...' : 'تصدير'}
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 ${styles.card} border ${styles.border} rounded-xl hover:bg-white/5 transition`}
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 5. الصفحة الرئيسية – سجل نشاط المساعد
// ================================================================
export default function AssistantLogsPage() {
  const router = useRouter();
  const params = useParams();
  const assistantId = params.assistantId;
  // ✅ استخدام الثيم المركزي
  const { theme } = useTheme();

  // ✅ بناء أنماط محلية تعتمد على theme
  const styles = theme === 'dark' ? {
    bg: 'bg-[#0b0e1a]',
    text: 'text-white',
    subtext: 'text-gray-300',
    card: 'bg-white/5 backdrop-blur-sm border-white/10',
    input: 'bg-white/10 border-white/20 text-white placeholder-gray-300',
    label: 'text-white',
    hover: 'hover:border-yellow-400/50',
    shadow: 'shadow-yellow-400/10',
    border: 'border-white/10',
  } : {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    subtext: 'text-gray-700',
    card: 'bg-white/90 backdrop-blur-sm border-gray-200',
    input: 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400',
    label: 'text-gray-800',
    hover: 'hover:border-yellow-400/70',
    shadow: 'shadow-yellow-400/30',
    border: 'border-gray-200',
  };

  // ===== حالات البيانات =====
  const [loading, setLoading] = useState(true);
  const [assistant, setAssistant] = useState(null);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState('');

  // ===== حالات الفلترة والبحث =====
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterDate, setFilterDate] = useState('all');
  const [sortOrder, setSortOrder] = useState('desc');

  // ===== حالات إضافية =====
  const [showExportModal, setShowExportModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    thisWeek: 0,
    actionDistribution: {},
    moduleDistribution: {},
  });

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    if (!assistantId) return;
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. جلب بيانات المساعد
      const { data: assistantData, error: assistantError } = await supabase
        .from('assistants')
        .select('id, full_name, display_name, role')
        .eq('id', assistantId)
        .single();

      if (assistantError) throw assistantError;
      if (!assistantData) {
        toast.error('المساعد غير موجود');
        router.push('/dashboard/teacher/assistants');
        return;
      }

      if (assistantData.teacher_id !== user.id) {
        toast.error('غير مصرح لك بمشاهدة هذا السجل');
        router.push('/dashboard/teacher/assistants');
        return;
      }

      setAssistant(assistantData);

      // 2. جلب السجلات
      const { data: logsData, error: logsError } = await supabase
        .from('assistant_logs')
        .select('*')
        .eq('assistant_id', assistantId)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // 3. حساب الإحصائيات
      const total = logsData?.length || 0;
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      const today = logsData?.filter(l => new Date(l.created_at) >= todayStart).length || 0;
      const thisWeek = logsData?.filter(l => new Date(l.created_at) >= weekStart).length || 0;

      const actionDist = {};
      const moduleDist = {};
      logsData?.forEach(l => {
        actionDist[l.action] = (actionDist[l.action] || 0) + 1;
        moduleDist[l.module] = (moduleDist[l.module] || 0) + 1;
      });

      setStats({ total, today, thisWeek, actionDistribution: actionDist, moduleDistribution: moduleDist });

    } catch (err) {
      console.error('Error fetching logs:', err);
      setError('فشل جلب السجلات');
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [assistantId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== الفلترة والبحث =====
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    // البحث
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(l =>
        l.action.toLowerCase().includes(q) ||
        l.module.toLowerCase().includes(q) ||
        l.target_id?.toLowerCase().includes(q) ||
        l.ip_address?.toLowerCase().includes(q) ||
        JSON.stringify(l.details || '').toLowerCase().includes(q)
      );
    }

    // فلترة حسب الإجراء
    if (filterAction !== 'all') {
      result = result.filter(l => l.action === filterAction);
    }

    // فلترة حسب الوحدة
    if (filterModule !== 'all') {
      result = result.filter(l => l.module === filterModule);
    }

    // فلترة حسب التاريخ
    if (filterDate !== 'all') {
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);
      const monthStart = new Date(now);
      monthStart.setMonth(monthStart.getMonth() - 1);
      const yearStart = new Date(now);
      yearStart.setFullYear(yearStart.getFullYear() - 1);

      if (filterDate === 'today') {
        result = result.filter(l => new Date(l.created_at) >= todayStart);
      } else if (filterDate === 'week') {
        result = result.filter(l => new Date(l.created_at) >= weekStart);
      } else if (filterDate === 'month') {
        result = result.filter(l => new Date(l.created_at) >= monthStart);
      } else if (filterDate === 'year') {
        result = result.filter(l => new Date(l.created_at) >= yearStart);
      }
    }

    // ترتيب
    if (sortOrder === 'desc') {
      result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else {
      result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    return result;
  }, [logs, searchQuery, filterAction, filterModule, filterDate, sortOrder]);

  // ===== خيارات الفلترة =====
  const actionOptions = [
    { value: 'all', label: 'جميع الإجراءات' },
    { value: 'create', label: 'إنشاء' },
    { value: 'edit', label: 'تعديل' },
    { value: 'delete', label: 'حذف' },
    { value: 'view', label: 'مشاهدة' },
    { value: 'publish', label: 'نشر' },
    { value: 'login', label: 'تسجيل دخول' },
    { value: 'logout', label: 'تسجيل خروج' },
  ];

  // ✅ قائمة الوحدات المحدثة – النظام الجديد
  const moduleOptions = [
    { value: 'all', label: 'جميع الوحدات' },
    { value: 'courses', label: 'الكورسات' },
    { value: 'videos', label: 'الفيديوهات' },
    { value: 'exams', label: 'الامتحانات' },
    { value: 'books', label: 'الكتب' },
    { value: 'question_bank', label: 'بنوك الأسئلة' },
    { value: 'support', label: 'الدعم' },
    { value: 'announcements', label: 'الإعلانات' },
    { value: 'messages', label: 'المراسلات' },
    { value: 'notes', label: 'الملاحظات' },
  ];

  const dateOptions = [
    { value: 'all', label: 'كل الفترة' },
    { value: 'today', label: 'اليوم' },
    { value: 'week', label: 'هذا الأسبوع' },
    { value: 'month', label: 'هذا الشهر' },
    { value: 'year', label: 'هذا العام' },
  ];

  // ===== دوال مساعدة =====
  const goBack = () => {
    router.push(`/dashboard/teacher/assistants/${assistantId}`);
  };

  // ===== بيانات الرسوم البيانية =====
  const chartData = useMemo(() => {
    const actions = stats.actionDistribution;
    const modules = stats.moduleDistribution;

    // ✅ تحديث خريطة الأسماء للوحدات الجديدة
    const moduleLabelsMap = {
      courses: 'الكورسات',
      videos: 'الفيديوهات',
      exams: 'الامتحانات',
      books: 'الكتب',
      question_bank: 'بنوك الأسئلة',
      support: 'الدعم',
      announcements: 'الإعلانات',
      messages: 'المراسلات',
      notes: 'الملاحظات',
    };

    return {
      action: {
        labels: Object.keys(actions).map(key => ({
          create: 'إنشاء',
          edit: 'تعديل',
          delete: 'حذف',
          view: 'مشاهدة',
          publish: 'نشر',
          login: 'تسجيل دخول',
          logout: 'تسجيل خروج',
        }[key] || key)),
        datasets: [{
          data: Object.values(actions),
          backgroundColor: ['#4ade80', '#facc15', '#f87171', '#60a5fa', '#c084fc', '#22d3ee', '#9ca3af'],
          borderColor: ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#a855f7', '#06b6d4', '#6b7280'],
          borderWidth: 2,
        }],
      },
      module: {
        labels: Object.keys(modules).map(key => moduleLabelsMap[key] || key),
        datasets: [{
          data: Object.values(modules),
          backgroundColor: [
            'rgba(251, 191, 36, 0.7)',
            'rgba(59, 130, 246, 0.7)',
            'rgba(52, 211, 153, 0.7)',
            'rgba(168, 85, 247, 0.7)',
            'rgba(251, 146, 60, 0.7)',
            'rgba(236, 72, 153, 0.7)',
            'rgba(20, 184, 166, 0.7)',
            'rgba(99, 102, 241, 0.7)',
            'rgba(244, 63, 94, 0.7)',
          ],
          borderColor: [
            '#fbbf24', '#3b82f6', '#22c55e', '#a855f7', '#f97316',
            '#ec4899', '#14b8a6', '#6366f1', '#f43f5e',
          ],
          borderWidth: 2,
        }],
      },
    };
  }, [stats]);

  // ===== حالة التحميل =====
  if (loading) {
    return (
      <TeacherLayout>
        <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden`}>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {/* ===== الهيدر ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/teacher/assistants/${assistantId}`}
                  className={`p-2 rounded-xl hover:bg-white/5 transition ${styles.subtext}`}
                >
                  <Icons.ArrowRight className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className={`text-2xl font-extrabold ${styles.text}`}>
                    📋 سجل نشاط {assistant?.display_name || assistant?.full_name}
                  </h1>
                  <p className={`text-sm ${styles.subtext}`}>
                    مراقبة وتحليل جميع نشاطات المساعد
                    <span className="mr-2 text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                      <Icons.History className="h-3 w-3 inline ml-1" /> {logs.length} نشاط
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              {/* ❌ تم حذف زر تبديل الثيم المكرر */}
              <button
                onClick={fetchData}
                className={`p-2 rounded-xl transition ${styles.card} border ${styles.border}`}
                title="تحديث البيانات"
              >
                <Icons.RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                disabled={logs.length === 0}
                className={`px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                  logs.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                <Icons.Download className="h-4 w-4" /> تصدير
              </button>
              <button
                onClick={goBack}
                className={`px-4 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition flex items-center gap-2`}
              >
                <Icons.ArrowRight className="h-4 w-4" /> العودة
              </button>
            </div>
          </div>

          {/* ===== الأخطاء ===== */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3"
              >
                <Icons.AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                  <Icons.X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== الإحصائيات ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard
              stat={{ label: 'إجمالي النشاطات', value: stats.total, suffix: '', icon: Icons.History, color: 'from-blue-400 to-blue-600', delay: 0 }}
              styles={styles}
            />
            <StatCard
              stat={{ label: 'اليوم', value: stats.today, suffix: '', icon: Icons.Calendar, color: 'from-green-400 to-green-600', delay: 0.1 }}
              styles={styles}
            />
            <StatCard
              stat={{ label: 'هذا الأسبوع', value: stats.thisWeek, suffix: '', icon: Icons.Clock, color: 'from-yellow-400 to-yellow-600', delay: 0.2 }}
              styles={styles}
            />
            <StatCard
              stat={{ label: 'آخر نشاط', value: logs.length > 0 ? 'منذ ' + (() => {
                const diff = Date.now() - new Date(logs[0].created_at).getTime();
                const hours = Math.floor(diff / (1000 * 60 * 60));
                if (hours < 1) return 'أقل من ساعة';
                if (hours < 24) return `${hours} ساعة`;
                return `${Math.floor(hours / 24)} يوم`;
              })() : '—', suffix: '', icon: Icons.Activity, color: 'from-purple-400 to-purple-600', delay: 0.3 }}
              styles={styles}
            />
          </div>

          {/* ===== الرسوم البيانية ===== */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>توزيع الإجراءات</h3>
              {Object.keys(stats.actionDistribution).length > 0 ? (
                <div className="h-48 max-w-xs mx-auto">
                  <Doughnut
                    data={chartData.action}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: theme === 'dark' ? '#ccc' : '#333', boxWidth: 10, font: { size: 9 } },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <p className={`text-center ${styles.subtext} py-8`}>لا توجد بيانات كافية</p>
              )}
            </div>
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>توزيع النشاط حسب الوحدة</h3>
              {Object.keys(stats.moduleDistribution).length > 0 ? (
                <div className="h-48 max-w-xs mx-auto">
                  <Doughnut
                    data={chartData.module}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom',
                          labels: { color: theme === 'dark' ? '#ccc' : '#333', boxWidth: 10, font: { size: 9 } },
                        },
                      },
                    }}
                  />
                </div>
              ) : (
                <p className={`text-center ${styles.subtext} py-8`}>لا توجد بيانات كافية</p>
              )}
            </div>
          </div>

          {/* ===== الفلترة والبحث ===== */}
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث في السجل (الإجراء، الوحدة، الهدف، IP، التفاصيل)..."
                className={`w-full p-2.5 pr-10 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
              />
            </div>

            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              {actionOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              {moduleOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              {dateOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
              className={`p-2.5 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition flex items-center gap-1`}
              title={sortOrder === 'desc' ? 'الأحدث أولاً' : 'الأقدم أولاً'}
            >
              <Icons.ArrowUpDown className="h-4 w-4" />
              <span className="text-xs">{sortOrder === 'desc' ? 'الأحدث' : 'الأقدم'}</span>
            </button>
          </div>

          {/* ===== جدول السجلات ===== */}
          <div className={`${styles.card} border ${styles.border} rounded-2xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`border-b ${styles.border}`}>
                  <tr className={`text-xs ${styles.subtext}`}>
                    <th className="text-center py-3 px-3 w-12">#</th>
                    <th className="text-right py-3 px-3">الإجراء</th>
                    <th className="text-right py-3 px-3">الوحدة</th>
                    <th className="text-right py-3 px-3 hidden md:table-cell">الهدف</th>
                    <th className="text-right py-3 px-3 hidden lg:table-cell">IP</th>
                    <th className="text-center py-3 px-3">الوقت</th>
                    <th className="text-center py-3 px-3 w-12">التفاصيل</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12">
                        <Icons.Inbox className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <p className={`${styles.subtext}`}>
                          {searchQuery || filterAction !== 'all' || filterModule !== 'all' || filterDate !== 'all'
                            ? 'لا توجد نتائج تطابق معايير البحث'
                            : 'لا توجد سجلات نشاط لهذا المساعد بعد'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log, index) => (
                      <LogRow key={log.id} log={log} index={index} styles={styles} />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredLogs.length > 0 && (
              <div className={`border-t ${styles.border} p-3 flex justify-between text-xs ${styles.subtext}`}>
                <span>إجمالي: {filteredLogs.length} نشاط</span>
                <span>آخر تحديث: {new Date().toLocaleString('ar-EG')}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== مودال التصدير ===== */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        logs={filteredLogs}
        assistantName={assistant?.display_name || assistant?.full_name || 'مساعد'}
        styles={styles}
      />
    </TeacherLayout>
  );
}