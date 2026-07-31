// app/dashboard/teacher/courses/[id]/codes/manage/page.js
// ================================================================
// 🎫 إدارة الأكواد – للمعلم لمتابعة وإدارة أكواد الشحن
// ================================================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';
import Link from 'next/link';
import { TeacherLayout } from '@/components/TeacherLayout';

// ================================================================
// ألوان البطاقات المتغيرة
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20' },
  { name: 'red', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 dark:bg-red-400/10', border: 'border-red-400/30 dark:border-red-400/20' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  if (available.length === 0) return CARD_COLORS[0];
  return available[Math.floor(Math.random() * available.length)];
};

// ================================================================
// 🌊 مكون الحدود الموجية (Wave Border)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange }) => {
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMounted.current) return;
      setRotation(prev => {
        const newRot = prev + 2;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, 50);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [onColorChange]);

  const waveColors = [
    `rgba(59, 130, 246, 0.6)`,
    `rgba(37, 99, 235, 0.3)`,
    `rgba(96, 165, 250, 0.5)`,
    `rgba(59, 130, 246, 0.7)`,
    `rgba(37, 99, 235, 0.2)`,
  ];

  const gradientStyle = {
    background: `conic-gradient(from ${rotation}deg, ${waveColors.join(', ')})`,
    borderRadius: '1.5rem',
    padding: '3px',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-3xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// مكون صف الكود
// ================================================================
const CodeRow = ({ code, index, onRevoke, onResend, styles, language, isDark }) => {
  const [color, setColor] = useState(CARD_COLORS[index % CARD_COLORS.length]);
  const [isHovered, setIsHovered] = useState(false);
  const [resending, setResending] = useState(false);
  const handleColorChange = (newColor) => setColor(newColor);

  const isUsed = code.is_used;
  const isExpired = code.expires_at && new Date(code.expires_at) < new Date();
  const isActive = code.is_active;

  const statusMap = {
    used: { label: language === 'ar' ? '✅ مستخدم' : '✅ Used', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
    unused: { label: language === 'ar' ? '📌 غير مستخدم' : '📌 Unused', color: 'text-blue-400', bg: 'bg-blue-400/10', border: 'border-blue-400/30' },
    expired: { label: language === 'ar' ? '⏰ منتهي' : '⏰ Expired', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
    revoked: { label: language === 'ar' ? '🚫 ملغي' : '🚫 Revoked', color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30' },
  };

  let statusKey = 'unused';
  if (!isActive) statusKey = 'revoked';
  else if (isExpired) statusKey = 'expired';
  else if (isUsed) statusKey = 'used';
  const status = statusMap[statusKey];

  const usedBy = code.used_by_user_id
    ? code.profiles?.full_name || (language === 'ar' ? 'طالب' : 'Student')
    : language === 'ar' ? '—' : '—';

  const createdAt = new Date(code.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
  const expiresAt = code.expires_at
    ? new Date(code.expires_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
      })
    : language === 'ar' ? 'غير محدد' : 'N/A';

  const handleResend = async (e) => {
    e.stopPropagation();
    if (resending || !code.is_active || code.is_used) return;
    setResending(true);
    try {
      // هنا يمكن إضافة منطق إعادة إرسال الكود عبر البريد الإلكتروني
      // مؤقتاً نقوم بنسخ الكود إلى الحافظة كحل سريع
      await navigator.clipboard.writeText(code.code);
      toast.success(language === 'ar' ? '✅ تم نسخ الكود إلى الحافظة' : '✅ Code copied to clipboard');
      if (onResend) onResend(code.id);
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل نسخ الكود' : 'Failed to copy code');
    } finally {
      setResending(false);
    }
  };

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div
        className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`font-mono text-lg font-bold ${styles.text}`}>{code.code}</span>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${status.bg} ${status.color} ${status.border} border`}>
              {status.label}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
            <span className={styles.subtext}>
              <Icons.User className="h-3.5 w-3.5 inline mr-1" />
              {usedBy}
            </span>
            <span className={styles.subtext}>
              <Icons.Calendar className="h-3.5 w-3.5 inline mr-1" />
              {language === 'ar' ? 'أنشئ:' : 'Created:'} {createdAt}
            </span>
            <span className={styles.subtext}>
              <Icons.Clock className="h-3.5 w-3.5 inline mr-1" />
              {language === 'ar' ? 'ينتهي:' : 'Expires:'} {expiresAt}
            </span>
            {/* ====== ✅ عرض max_devices ====== */}
            {code.max_devices && (
              <span className={styles.subtext}>
                <Icons.Monitor className="h-3.5 w-3.5 inline mr-1" />
                {language === 'ar' ? 'الأجهزة:' : 'Devices:'} {code.max_devices}
              </span>
            )}
            {code.notes && (
              <span className={`text-xs ${styles.subtext} italic`}>
                📝 {code.notes}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {code.is_active && !code.is_used && !code.expires_at && (
            <button
              onClick={handleResend}
              disabled={resending}
              className={`p-2 rounded-lg transition ${resending ? 'opacity-50 cursor-wait' : 'hover:bg-blue-500/20 text-blue-400'}`}
              title={language === 'ar' ? 'نسخ الكود' : 'Copy code'}
            >
              {resending ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : <Icons.Copy className="h-4 w-4" />}
            </button>
          )}
          {code.is_active && !code.is_used && (
            <button
              onClick={() => onRevoke(code.id)}
              className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition"
              title={language === 'ar' ? 'إلغاء الكود' : 'Revoke code'}
            >
              <Icons.XCircle className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </WaveBorderCard>
  );
};

// ================================================================
// الصفحة الرئيسية – إدارة الأكواد
// ================================================================
export default function TeacherManageCodesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;
  const { theme, language, styles } = useTheme();
  const isDark = theme === 'dark';

  // ===== حالات الصفحة =====
  const [course, setCourse] = useState(null);
  const [codes, setCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [revoking, setRevoking] = useState(null);
  const [stats, setStats] = useState({
    total: 0,
    used: 0,
    unused: 0,
    expired: 0,
    revoked: 0,
  });

  // ===== ألوان متغيرة للرأس =====
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. جلب بيانات الكورس (للتحقق من الملكية)
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('title, teacher_id')
        .eq('id', courseId)
        .single();

      if (courseError || !courseData) {
        setError(language === 'ar' ? 'الكورس غير موجود' : 'Course not found');
        setLoading(false);
        return;
      }

      if (courseData.teacher_id !== user.id) {
        setError(language === 'ar' ? 'غير مصرح لك بمشاهدة هذا الكورس' : 'You are not authorized to view this course');
        setLoading(false);
        return;
      }

      setCourse(courseData);

      // 2. جلب الأكواد
      const { data: codesData, error: codesError } = await supabase
        .from('course_access_codes')
        .select('*, profiles:used_by_user_id(full_name, email)')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false });

      if (codesError) throw codesError;
      setCodes(codesData || []);

      // 3. حساب الإحصائيات
      const total = codesData?.length || 0;
      const used = codesData?.filter(c => c.is_used).length || 0;
      const unused = codesData?.filter(c => !c.is_used && c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date())).length || 0;
      const expired = codesData?.filter(c => c.expires_at && new Date(c.expires_at) < new Date()).length || 0;
      const revoked = codesData?.filter(c => !c.is_active).length || 0;

      setStats({ total, used, unused, expired, revoked });

    } catch (err) {
      console.error('Error fetching codes:', err);
      setError(language === 'ar' ? 'فشل تحميل الأكواد' : 'Failed to load codes');
      toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [courseId, router, language]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== فلترة الأكواد =====
  const filteredCodes = useMemo(() => {
    let result = codes;
    if (filterStatus !== 'all') {
      result = result.filter(c => {
        if (filterStatus === 'used') return c.is_used;
        if (filterStatus === 'unused') return !c.is_used && c.is_active && (!c.expires_at || new Date(c.expires_at) > new Date());
        if (filterStatus === 'expired') return c.expires_at && new Date(c.expires_at) < new Date();
        if (filterStatus === 'revoked') return !c.is_active;
        return true;
      });
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.profiles?.full_name?.toLowerCase().includes(q) ||
        c.profiles?.email?.toLowerCase().includes(q) ||
        c.notes?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [codes, filterStatus, searchTerm]);

  // ===== إلغاء كود =====
  const revokeCode = async (codeId) => {
    if (revoking) return;
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء هذا الكود؟' : 'Are you sure you want to revoke this code?')) return;

    setRevoking(codeId);
    try {
      const { error } = await supabase
        .from('course_access_codes')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', codeId);

      if (error) throw error;

      toast.success(language === 'ar' ? '✅ تم إلغاء الكود' : '✅ Code revoked');
      // تحديث القائمة
      setCodes(prev => prev.map(c => c.id === codeId ? { ...c, is_active: false } : c));
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل إلغاء الكود' : 'Failed to revoke code');
    } finally {
      setRevoking(null);
    }
  };

  // ===== تصدير الأكواد كـ CSV =====
  const exportCSV = useCallback(() => {
    if (codes.length === 0) {
      toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const headers = ['الكود', 'الحالة', 'المستخدم', 'البريد الإلكتروني', 'تاريخ الإنشاء', 'تاريخ الانتهاء', 'ملاحظات', 'الأجهزة'];
    const rows = codes.map(c => [
      c.code,
      c.is_used ? 'مستخدم' : c.is_active ? 'غير مستخدم' : 'ملغي',
      c.profiles?.full_name || '',
      c.profiles?.email || '',
      new Date(c.created_at).toLocaleDateString('ar-EG'),
      c.expires_at ? new Date(c.expires_at).toLocaleDateString('ar-EG') : 'غير محدد',
      c.notes || '',
      c.max_devices || 2,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `اكواد_${course?.title || courseId}_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(language === 'ar' ? '✅ تم تصدير البيانات' : '✅ Data exported');
  }, [codes, course, language]);

  // ===== شاشة التحميل =====
  if (loading) {
    return (
      <TeacherLayout>
        <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  // ===== عرض الخطأ =====
  if (error) {
    return (
      <TeacherLayout>
        <div className={`min-h-screen flex items-center justify-center p-4 ${styles.bg}`}>
          <div className={`max-w-md w-full p-8 rounded-3xl ${styles.card} border ${styles.border} text-center shadow-2xl`}>
            <div className="inline-flex p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
              <Icons.XCircle className="h-12 w-12 text-red-400" />
            </div>
            <h2 className={`text-xl font-bold ${styles.text} mt-4`}>
              {language === 'ar' ? 'حدث خطأ' : 'Error'}
            </h2>
            <p className={`${styles.subtext} mt-2`}>{error}</p>
            <button
              onClick={fetchData}
              className="mt-6 px-6 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition"
            >
              {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
            </button>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  // ================================================================
  // التصميم الرئيسي
  // ================================================================
  return (
    <TeacherLayout>
      <div className={`min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
        {/* خلفية متحركة */}
        <motion.div
          animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
          transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
          className="fixed -top-60 -right-60 w-[800px] h-[800px] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none"
        />
        <motion.div
          animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
          transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
          className="fixed -bottom-60 -left-60 w-[900px] h-[900px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* ===== رأس الصفحة مع Wave Border ===== */}
          <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
            <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className={`text-3xl sm:text-4xl font-black ${styles.text}`}>
                  {language === 'ar' ? '🎫 إدارة الأكواد' : '🎫 Code Management'}
                </h1>
                <p className={`text-base ${styles.subtext} mt-1`}>
                  {course?.title || (language === 'ar' ? 'الكورس' : 'Course')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/teacher/courses/${courseId}/codes`}
                  className="px-4 py-2 rounded-xl bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 transition flex items-center gap-2 text-sm font-bold"
                >
                  <Icons.Plus className="h-4 w-4" />
                  {language === 'ar' ? 'توليد أكواد جديدة' : 'Generate New Codes'}
                </Link>
                <button
                  onClick={fetchData}
                  className={`p-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition`}
                  title={language === 'ar' ? 'تحديث' : 'Refresh'}
                >
                  <Icons.RefreshCw className="h-5 w-5 text-blue-400" />
                </button>
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 transition flex items-center gap-2 text-sm font-bold"
                >
                  <Icons.Download className="h-4 w-4" />
                  {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
                </button>
                <button
                  onClick={() => router.push(`/dashboard/teacher/courses/${courseId}`)}
                  className={`px-4 py-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition text-sm font-bold ${styles.text}`}
                >
                  <Icons.ArrowLeft className="h-4 w-4 inline mr-1" />
                  {language === 'ar' ? 'العودة للكورس' : 'Back to Course'}
                </button>
              </div>
            </div>
          </WaveBorderCard>

          {/* ===== إحصائيات سريعة ===== */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
              <p className={`text-2xl font-bold ${styles.text}`}>{stats.total}</p>
              <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'إجمالي' : 'Total'}</p>
            </div>
            <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
              <p className={`text-2xl font-bold text-emerald-400`}>{stats.used}</p>
              <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'مستخدمة' : 'Used'}</p>
            </div>
            <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
              <p className={`text-2xl font-bold text-blue-400`}>{stats.unused}</p>
              <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'متاحة' : 'Available'}</p>
            </div>
            <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
              <p className={`text-2xl font-bold text-red-400`}>{stats.expired}</p>
              <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'منتهية' : 'Expired'}</p>
            </div>
            <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
              <p className={`text-2xl font-bold text-gray-400`}>{stats.revoked}</p>
              <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'ملغية' : 'Revoked'}</p>
            </div>
          </div>

          {/* ===== فلترة وبحث ===== */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'ابحث عن كود أو طالب...' : 'Search code or student...'}
                className={`w-full p-3 pr-10 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition`}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition`}
            >
              <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
              <option value="used">{language === 'ar' ? 'مستخدمة' : 'Used'}</option>
              <option value="unused">{language === 'ar' ? 'متاحة' : 'Available'}</option>
              <option value="expired">{language === 'ar' ? 'منتهية' : 'Expired'}</option>
              <option value="revoked">{language === 'ar' ? 'ملغية' : 'Revoked'}</option>
            </select>
          </div>

          {/* ===== قائمة الأكواد ===== */}
          {filteredCodes.length === 0 ? (
            <div className={`text-center py-16 ${styles.card} border ${styles.border} rounded-3xl`}>
              <Icons.Key className="h-20 w-20 text-gray-500 mx-auto mb-4" />
              <h3 className={`text-2xl font-bold ${styles.text}`}>
                {searchTerm || filterStatus !== 'all'
                  ? (language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results')
                  : (language === 'ar' ? 'لا توجد أكواد' : 'No codes yet')}
              </h3>
              <p className={`text-base ${styles.subtext} mt-2`}>
                {searchTerm || filterStatus !== 'all'
                  ? (language === 'ar' ? 'جرب تغيير معايير البحث' : 'Try changing search criteria')
                  : (language === 'ar' ? 'يمكنك توليد أكواد جديدة من زر "توليد أكواد جديدة"' : 'You can generate new codes using "Generate New Codes" button')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCodes.map((code, idx) => (
                <CodeRow
                  key={code.id}
                  code={code}
                  index={idx}
                  onRevoke={revokeCode}
                  styles={styles}
                  language={language}
                  isDark={isDark}
                />
              ))}
            </div>
          )}

          {/* ===== روابط سريعة ===== */}
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {[
              { href: `/dashboard/teacher/courses/${courseId}`, icon: Icons.Book, label: language === 'ar' ? 'الكورس' : 'Course' },
              { href: `/dashboard/teacher/courses/${courseId}/edit`, icon: Icons.Edit, label: language === 'ar' ? 'تعديل' : 'Edit' },
              { href: `/dashboard/teacher/courses/${courseId}/codes`, icon: Icons.Plus, label: language === 'ar' ? 'توليد أكواد' : 'Generate Codes' },
              { href: `/dashboard/teacher/courses/${courseId}/payment-logs`, icon: Icons.Receipt, label: language === 'ar' ? 'المدفوعات' : 'Payments' },
              { href: '/dashboard/teacher', icon: Icons.Home, label: language === 'ar' ? 'الرئيسية' : 'Home' },
              { href: '/dashboard/teacher/courses', icon: Icons.List, label: language === 'ar' ? 'قائمة الكورسات' : 'Courses List' },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition group`}
              >
                <item.icon className="h-5 w-5 text-blue-500 group-hover:scale-110 transition" />
                <span className={`text-xs font-bold ${styles.text}`}>{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}