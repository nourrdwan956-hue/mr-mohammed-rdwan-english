'use client';

// ================================================================
// 📋 سجل نشاط المساعد – إصدار متطور V5 (مع useAssistantData)
// ================================================================
// الميزات:
// - استخدام useAssistantData للحصول على بيانات المساعد
// - عرض جميع نشاطات المساعد مع الوقت والتاريخ والتفاصيل
// - فلترة حسب نوع النشاط، الوحدة، الفترة الزمنية
// - بحث عن النشاطات
// - إحصائيات سريعة
// - عرض تفاصيل كل نشاط مع رابط للعنصر المرتبط إن وجد
// - دعم كامل للوضعين الفاتح والداكن مع وضوح تام للخطوط
// - Glassmorphism فاخر وأنيميشن سلس
// - تصدير البيانات (نسخ أو تنزيل CSV)
// - دعم الترجمة العربية والإنجليزية
// - منع التحميل اللانهائي
// ================================================================
import React from 'react';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// 1. الترجمات
// ================================================================
const translations = {
  ar: {
    title: '📋 سجل النشاطات',
    subtitle: 'جميع الإجراءات التي قمت بها',
    back: 'العودة',
    searchPlaceholder: 'ابحث عن نشاط (نوع، وحدة، تفاصيل، معرف)...',
    allActions: 'كل الأنشطة',
    allModules: 'كل الوحدات',
    allDates: 'كل الفترات',
    today: 'اليوم',
    week: 'آخر 7 أيام',
    month: 'آخر 30 يوم',
    year: 'آخر سنة',
    copy: 'نسخ',
    exportCSV: 'تصدير CSV',
    refresh: 'تحديث',
    noResults: 'لا توجد نتائج تطابق البحث',
    noLogs: 'لا توجد نشاطات مسجلة',
    tryChangeFilters: 'حاول تغيير معايير البحث',
    totalActivities: 'إجمالي النشاطات',
    copiedSuccess: '✅ تم نسخ البيانات',
    exportSuccess: '✅ تم تصدير البيانات بنجاح',
    exportFailed: 'فشل تصدير البيانات',
    fetchFailed: 'فشل جلب البيانات',
    loading: 'جاري تحميل سجل النشاطات...',
    noData: 'لا توجد بيانات للتصدير',
    // ترجمات الإجراءات
    action_view: 'عرض',
    action_create: 'إنشاء',
    action_edit: 'تعديل',
    action_delete: 'حذف',
    action_publish: 'نشر',
    action_unpublish: 'إلغاء النشر',
    action_archive: 'أرشفة',
    action_unarchive: 'إلغاء الأرشفة',
    action_login: 'تسجيل دخول',
    action_logout: 'تسجيل خروج',
    action_send: 'إرسال',
    action_reply: 'رد',
    // ترجمات الوحدات
    module_courses: 'الكورسات',
    module_videos: 'الفيديوهات',
    module_exams: 'الامتحانات',
    module_books: 'الكتب',
    module_question_bank: 'بنك الأسئلة',
    module_tickets: 'التذاكر',
    module_announcements: 'الإعلانات',
    module_notes: 'ملاحظات الطلاب',
    module_messages: 'المراسلات',
    module_students_affairs: 'شؤون الطلاب',
    module_assistants: 'المساعدين',
    module_permissions: 'الصلاحيات',
    module_auth: 'المصادقة',
  },
  en: {
    title: '📋 Activity Log',
    subtitle: 'All your actions',
    back: 'Back',
    searchPlaceholder: 'Search activity (type, module, details, id)...',
    allActions: 'All Actions',
    allModules: 'All Modules',
    allDates: 'All Periods',
    today: 'Today',
    week: 'Last 7 Days',
    month: 'Last 30 Days',
    year: 'Last Year',
    copy: 'Copy',
    exportCSV: 'Export CSV',
    refresh: 'Refresh',
    noResults: 'No results match your search',
    noLogs: 'No activities recorded',
    tryChangeFilters: 'Try changing your search criteria',
    totalActivities: 'Total Activities',
    copiedSuccess: '✅ Data copied successfully',
    exportSuccess: '✅ Data exported successfully',
    exportFailed: 'Failed to export data',
    fetchFailed: 'Failed to fetch data',
    loading: 'Loading activity log...',
    noData: 'No data to export',
    action_view: 'View',
    action_create: 'Create',
    action_edit: 'Edit',
    action_delete: 'Delete',
    action_publish: 'Publish',
    action_unpublish: 'Unpublish',
    action_archive: 'Archive',
    action_unarchive: 'Unarchive',
    action_login: 'Login',
    action_logout: 'Logout',
    action_send: 'Send',
    action_reply: 'Reply',
    module_courses: 'Courses',
    module_videos: 'Videos',
    module_exams: 'Exams',
    module_books: 'Books',
    module_question_bank: 'Question Bank',
    module_tickets: 'Tickets',
    module_announcements: 'Announcements',
    module_notes: 'Student Notes',
    module_messages: 'Messages',
    module_students_affairs: 'Students Affairs',
    module_assistants: 'Assistants',
    module_permissions: 'Permissions',
    module_auth: 'Authentication',
  },
};

// ================================================================
// 2. عداد متحرك
// ================================================================
const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
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
  }, [isVisible, target, duration]);

  return <span ref={ref} className="font-extrabold">{count}{suffix}</span>;
};

// ================================================================
// 3. بطاقة إحصائية
// ================================================================
const StatCard = ({ stat, styles }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative ${styles.card} border ${styles.border} rounded-2xl p-5 ${styles.hover} transition-all duration-300 hover:shadow-2xl ${styles.shadow} overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`${styles.subtext} text-sm font-medium`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1 tracking-tight`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && (
            <p className={`text-xs ${styles.subtext} mt-1 opacity-70`}>{stat.sub}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: hovered ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ================================================================
// 4. حقل الإدخال للبحث
// ================================================================
const SearchInput = ({ value, onChange, placeholder, styles }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Icons.Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-300 ${
        isFocused ? 'text-purple-400' : 'text-gray-400'
      }`} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`w-full p-2.5 pr-11 ${styles.input} border ${
          isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : 'border-gray-200 dark:border-white/20'
        } rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm`}
      />
    </div>
  );
};

// ================================================================
// 5. مكون فلترة
// ================================================================
const FilterSelect = ({ value, onChange, options, styles }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition appearance-none text-sm min-w-[120px]`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

// ================================================================
// 6. دالة مساعدة لاستخراج نص مقروء من details (كائن أو نص)
// ================================================================
const getDetailsText = (details, t) => {
  if (!details) return '';
  if (typeof details === 'string') {
    try {
      const parsed = JSON.parse(details);
      // إذا كان كائنًا، نحاول تحويله إلى نص
      if (typeof parsed === 'object') {
        // محاولة استخراج معلومات مفيدة
        if (parsed.reason) return parsed.reason;
        if (parsed.login_at) return `تسجيل دخول في ${new Date(parsed.login_at).toLocaleString()}`;
        if (parsed.logout_at) return `تسجيل خروج في ${new Date(parsed.logout_at).toLocaleString()}`;
        if (parsed.bank_id && parsed.question_id) {
          return `أضاف سؤالاً (ID: ${parsed.question_id}) في البنك (ID: ${parsed.bank_id})`;
        }
        if (parsed.bank_id) return `البنك (ID: ${parsed.bank_id})`;
        if (parsed.question_id) return `السؤال (ID: ${parsed.question_id})`;
        // إذا لم نتعرف على شيء، نعرض JSON مختصر
        return JSON.stringify(parsed).slice(0, 100) + (JSON.stringify(parsed).length > 100 ? '...' : '');
      }
      return parsed;
    } catch (e) {
      // ليس JSON، نعيد النص كما هو
      return details;
    }
  }
  if (typeof details === 'object') {
    // محاولة استخراج معلومات مفيدة من الكائن
    if (details.reason) return details.reason;
    if (details.login_at) return `تسجيل دخول في ${new Date(details.login_at).toLocaleString()}`;
    if (details.logout_at) return `تسجيل خروج في ${new Date(details.logout_at).toLocaleString()}`;
    if (details.bank_id && details.question_id) {
      return `أضاف سؤالاً (ID: ${details.question_id}) في البنك (ID: ${details.bank_id})`;
    }
    if (details.bank_id) return `البنك (ID: ${details.bank_id})`;
    if (details.question_id) return `السؤال (ID: ${details.question_id})`;
    return JSON.stringify(details).slice(0, 100) + (JSON.stringify(details).length > 100 ? '...' : '');
  }
  return String(details);
};

// ================================================================
// 7. عنصر السجل الفردي
// ================================================================
const LogItem = ({ log, styles, t }) => {
  const [isHovered, setIsHovered] = useState(false);

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(
      t?.lang === 'ar' ? 'ar-EG' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' }
    );
  };

  // تحديد الأيقونة واللون حسب نوع الإجراء
  const getActionConfig = (action) => {
    const configs = {
      view: { icon: Icons.Eye, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-400/20' },
      create: { icon: Icons.Plus, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-400/20' },
      edit: { icon: Icons.Edit, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-400/20' },
      delete: { icon: Icons.Trash2, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-400/20' },
      publish: { icon: Icons.Megaphone, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-400/20' },
      unpublish: { icon: Icons.EyeOff, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-400/20' },
      archive: { icon: Icons.Archive, color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-400/20' },
      unarchive: { icon: Icons.FolderOpen, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-400/20' },
      login: { icon: Icons.LogIn, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-400/20' },
      logout: { icon: Icons.LogOut, color: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-400/20' },
      send: { icon: Icons.Send, color: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-400/20' },
      reply: { icon: Icons.MessageSquare, color: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-400/20' },
    };
    return configs[action] || { icon: Icons.Activity, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-400/20' };
  };

  const config = getActionConfig(log.action);
  const ActionIcon = config.icon;

  // ترجمة نوع الإجراء
  const getActionLabel = (action) => {
    const labels = {
      view: t.action_view || 'عرض',
      create: t.action_create || 'إنشاء',
      edit: t.action_edit || 'تعديل',
      delete: t.action_delete || 'حذف',
      publish: t.action_publish || 'نشر',
      unpublish: t.action_unpublish || 'إلغاء النشر',
      archive: t.action_archive || 'أرشفة',
      unarchive: t.action_unarchive || 'إلغاء الأرشفة',
      login: t.action_login || 'تسجيل دخول',
      logout: t.action_logout || 'تسجيل خروج',
      send: t.action_send || 'إرسال',
      reply: t.action_reply || 'رد',
    };
    return labels[action] || action;
  };

  // ترجمة الوحدة
  const getModuleLabel = (module) => {
    const labels = {
      courses: t.module_courses || 'الكورسات',
      videos: t.module_videos || 'الفيديوهات',
      exams: t.module_exams || 'الامتحانات',
      books: t.module_books || 'الكتب',
      question_bank: t.module_question_bank || 'بنك الأسئلة',
      tickets: t.module_tickets || 'التذاكر',
      announcements: t.module_announcements || 'الإعلانات',
      notes: t.module_notes || 'ملاحظات الطلاب',
      messages: t.module_messages || 'المراسلات',
      students_affairs: t.module_students_affairs || 'شؤون الطلاب',
      assistants: t.module_assistants || 'المساعدين',
      permissions: t.module_permissions || 'الصلاحيات',
      auth: t.module_auth || 'المصادقة',
    };
    return labels[module] || module;
  };

  // معالجة details ليكون نصاً
  const detailsText = getDetailsText(log.details, t);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative ${styles.card} border ${styles.border} rounded-xl p-4 ${styles.hover} transition-all duration-300 hover:shadow-lg ${styles.shadow} ${
        isHovered ? `border-${config.color.split('-')[1]}-400/30` : ''
      }`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-xl ${config.bg} ${config.border} flex-shrink-0 transition-all duration-300 ${
          isHovered ? 'scale-110' : ''
        }`}>
          <ActionIcon className={`h-5 w-5 ${config.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-sm font-semibold ${styles.text}`}>
              {getActionLabel(log.action)}
            </span>
            <span className="text-xs bg-white/5 px-2 py-0.5 rounded-full border border-white/10 text-gray-400">
              {getModuleLabel(log.module)}
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Icons.Clock className="h-3 w-3" />
              {formatDate(log.created_at)}
            </span>
            {log.ip_address && (
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <Icons.Wifi className="h-3 w-3" />
                {log.ip_address}
              </span>
            )}
          </div>
          {detailsText && (
            <p className={`text-sm ${styles.subtext} mt-1.5 whitespace-pre-wrap leading-relaxed`}>
              {detailsText}
            </p>
          )}
          {log.target_id && (
            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
              <Icons.Link className="h-3 w-3" />
              المعرف: {log.target_id}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 self-start">
          <span className={`text-[8px] px-1.5 py-0.5 rounded-full ${config.bg} ${config.border} ${config.color} opacity-60`}>
            {log.action}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 8. الصفحة الرئيسية
// ================================================================
export default function AssistantLogsPage() {
  const router = useRouter();
  const { theme, toggleTheme, styles, language } = useTheme();
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();
  const t = translations[language] || translations.ar;

  // ===== حالات البيانات =====
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== حالات البحث والفلترة =====
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterModule, setFilterModule] = useState('all');
  const [filterDate, setFilterDate] = useState('all');

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    total: 0,
    actions: {},
    modules: {},
  });

  // ===== جلب البيانات =====
  const fetchLogs = useCallback(async () => {
    if (!assistant?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: logsData, error: logsError } = await supabase
        .from('assistant_logs')
        .select('*')
        .eq('assistant_id', assistant.id)
        .order('created_at', { ascending: false });

      if (logsError) throw logsError;

      setLogs(logsData || []);

      // حساب الإحصائيات
      const total = logsData?.length || 0;
      const actions = {};
      const modules = {};

      logsData?.forEach(log => {
        actions[log.action] = (actions[log.action] || 0) + 1;
        modules[log.module] = (modules[log.module] || 0) + 1;
      });

      setStats({ total, actions, modules });
    } catch (err) {
      console.error('❌ Error fetching logs:', err);
      toast.error(t.fetchFailed);
    } finally {
      setLoading(false);
    }
  }, [assistant?.id, t]);

  useEffect(() => {
    if (!assistantLoading && assistant) {
      fetchLogs();
    } else if (!assistantLoading && !assistant) {
      setLoading(false);
    }
  }, [assistantLoading, assistant, fetchLogs]);

  // ===== الفلترة والبحث =====
  const filteredLogs = useMemo(() => {
    if (!logs.length) return [];

    let result = [...logs];

    // بحث
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(log =>
        log.action?.toLowerCase().includes(q) ||
        log.module?.toLowerCase().includes(q) ||
        log.details?.toLowerCase().includes(q) ||
        log.target_id?.toLowerCase().includes(q)
      );
    }

    // فلترة حسب نوع الإجراء
    if (filterAction !== 'all') {
      result = result.filter(log => log.action === filterAction);
    }

    // فلترة حسب الوحدة
    if (filterModule !== 'all') {
      result = result.filter(log => log.module === filterModule);
    }

    // فلترة حسب الفترة الزمنية
    if (filterDate !== 'all') {
      const now = new Date();
      let cutoff = new Date();
      switch (filterDate) {
        case 'today':
          cutoff.setHours(0, 0, 0, 0);
          break;
        case 'week':
          cutoff.setDate(now.getDate() - 7);
          break;
        case 'month':
          cutoff.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          cutoff.setFullYear(now.getFullYear() - 1);
          break;
        default:
          cutoff = null;
      }
      if (cutoff) {
        result = result.filter(log => new Date(log.created_at) >= cutoff);
      }
    }

    return result;
  }, [logs, searchQuery, filterAction, filterModule, filterDate]);

  // ===== تصدير البيانات =====
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error(t.noData);
      return;
    }

    try {
      const headers = ['التاريخ', 'نوع النشاط', 'الوحدة', 'التفاصيل', 'المعرف', 'IP'];
      const rows = filteredLogs.map(log => [
        new Date(log.created_at).toLocaleString('ar-EG'),
        log.action,
        log.module,
        getDetailsText(log.details, t),
        log.target_id || '',
        log.ip_address || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `سجل_النشاطات_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast.success(t.exportSuccess);
    } catch (err) {
      console.error('❌ Export error:', err);
      toast.error(t.exportFailed);
    }
  };

  // ===== نسخ البيانات =====
  const handleCopy = () => {
    if (filteredLogs.length === 0) {
      toast.error(t.noData);
      return;
    }

    try {
      const text = filteredLogs.map(log => {
        const date = new Date(log.created_at).toLocaleString('ar-EG');
        return `${date} | ${log.action} | ${log.module} | ${getDetailsText(log.details, t)}`;
      }).join('\n');

      navigator.clipboard.writeText(text);
      toast.success(t.copiedSuccess);
    } catch (err) {
      console.error('❌ Copy error:', err);
      toast.error(t.exportFailed);
    }
  };

  // ===== خيارات الفلترة =====
  const actionOptions = [
    { value: 'all', label: t.allActions },
    ...Object.keys(stats.actions).map(action => ({
      value: action,
      label: action,
    })),
  ];

  const moduleOptions = [
    { value: 'all', label: t.allModules },
    ...Object.keys(stats.modules).map(module => ({
      value: module,
      label: module,
    })),
  ];

  const dateOptions = [
    { value: 'all', label: t.allDates },
    { value: 'today', label: t.today },
    { value: 'week', label: t.week },
    { value: 'month', label: t.month },
    { value: 'year', label: t.year },
  ];

  // ===== إحصائيات البطاقات =====
  const statsData = [
    {
      id: 'total',
      label: t.totalActivities,
      value: stats.total,
      icon: Icons.Activity,
      color: 'from-blue-400 to-blue-600',
      delay: 0,
    },
    ...Object.entries(stats.actions)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([action, count], index) => ({
        id: action,
        label: action,
        value: count,
        icon: Icons.Circle,
        color: ['from-purple-400 to-purple-600', 'from-green-400 to-green-600', 'from-orange-400 to-orange-600'][index] || 'from-gray-400 to-gray-600',
        delay: (index + 1) * 0.1,
      })),
  ];

  // ===== حالة التحميل =====
  if (assistantLoading || loading) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
            </div>
          </div>
          <p className={`text-sm ${styles.subtext} animate-pulse`}>{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="text-center">
          <Icons.History className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${styles.text}`}>لم يتم العثور على البيانات</h2>
          <button
            onClick={() => router.push('/dashboard/assistant')}
            className="mt-4 px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition"
          >
            العودة للوحة التحكم
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Icons.History className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className={`text-3xl font-extrabold ${styles.text}`}>{t.title}</h1>
                <p className={`text-sm ${styles.subtext} mt-1 flex flex-wrap items-center gap-2`}>
                  {t.subtitle} • {filteredLogs.length} نشاط
                  {assistant && (
                    <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-400/20">
                      {assistant.display_name || assistant.full_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${styles.card} border ${styles.border} hover:border-purple-400/50`}
            >
              {theme === 'dark' ? (
                <Icons.Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Icons.Moon className="h-5 w-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={handleCopy}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-1 ${styles.card} border ${styles.border} hover:border-purple-400/50`}
            >
              <Icons.Copy className="h-4 w-4" /> {t.copy}
            </button>
            <button
              onClick={handleExportCSV}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-1 ${styles.card} border ${styles.border} hover:border-purple-400/50`}
            >
              <Icons.Download className="h-4 w-4" /> {t.exportCSV}
            </button>
            <button
              onClick={fetchLogs}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-1 ${styles.card} border ${styles.border} hover:border-purple-400/50`}
            >
              <Icons.RefreshCw className="h-4 w-4" /> {t.refresh}
            </button>
            <button
              onClick={() => router.push('/dashboard/assistant')}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-1 ${styles.card} border ${styles.border} hover:border-purple-400/50`}
            >
              <Icons.ArrowRight className="h-4 w-4" /> {t.back}
            </button>
          </div>
        </div>

        {/* ===== الإحصائيات ===== */}
        {statsData.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statsData.map((stat) => (
              <StatCard key={stat.id} stat={stat} styles={styles} />
            ))}
          </div>
        )}

        {/* ===== البحث والفلترة ===== */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 flex-wrap">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={t.searchPlaceholder}
            styles={styles}
          />
          <FilterSelect
            value={filterAction}
            onChange={setFilterAction}
            options={actionOptions}
            styles={styles}
          />
          <FilterSelect
            value={filterModule}
            onChange={setFilterModule}
            options={moduleOptions}
            styles={styles}
          />
          <FilterSelect
            value={filterDate}
            onChange={setFilterDate}
            options={dateOptions}
            styles={styles}
          />
        </div>

        {/* ===== قائمة السجلات ===== */}
        {filteredLogs.length === 0 ? (
          <div className={`${styles.card} border ${styles.border} rounded-3xl p-12 text-center`}>
            <Icons.History className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className={`text-xl font-semibold ${styles.text}`}>
              {searchQuery || filterAction !== 'all' || filterModule !== 'all' || filterDate !== 'all'
                ? t.noResults
                : t.noLogs}
            </h3>
            <p className={`${styles.subtext} text-sm mt-2`}>
              {searchQuery || filterAction !== 'all' || filterModule !== 'all' || filterDate !== 'all'
                ? t.tryChangeFilters
                : ''}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <LogItem key={log.id} log={log} styles={styles} t={t} />
            ))}
          </div>
        )}

        {/* ===== تذييل ===== */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className={`text-[10px] ${styles.subtext} opacity-60`}>
            © 2026 منصة محمد رضوان • جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}