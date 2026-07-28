'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '@/lib/hooks/useTheme';
// ✅ الجديد (الصحيح)
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  Key,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Filter,
  Search,
  Download,
  RefreshCw,
  Calendar,
  BarChart3,
  PieChart,
  TrendingUp,
  TrendingDown,
  Users,
  Link as LinkIcon,
  Eye,
  Plus,
  Trash2,
  Edit,
  ChevronDown,
  ChevronUp,
  Copy,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, subDays, subMonths, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ar } from 'date-fns/locale';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// ============================================================
// مكونات مساعدة
// ============================================================

const WaveBorderCard = ({ children, className, isDark }) => (
  <div className={`relative overflow-hidden rounded-2xl border ${isDark ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200/50 bg-white/30'} backdrop-blur-xl shadow-xl ${className}`}>
    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-amber-500/5 to-amber-600/5" />
    <div className="relative z-10 p-6">{children}</div>
  </div>
);

const StatCard = ({ icon: Icon, label, value, subValue, color, isDark, delay }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    className={`relative ${isDark ? 'bg-gray-800/30' : 'bg-white/30'} backdrop-blur-sm border ${isDark ? 'border-gray-700/50' : 'border-gray-200/50'} rounded-xl p-4 hover:shadow-2xl hover:shadow-amber-500/10 transition-all`}
  >
    <div className="flex items-start justify-between">
      <div>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>{label}</p>
        <p className={`text-2xl font-extrabold ${isDark ? 'text-white' : 'text-gray-800'} mt-1`}>{value}</p>
        {subValue && <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{subValue}</p>}
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-20`}>
        <Icon className={`h-5 w-5 ${isDark ? 'text-white' : 'text-gray-800'}`} />
      </div>
    </div>
    <div className="mt-3 h-1 w-full bg-gray-200/20 rounded-full overflow-hidden">
      <motion.div
        className={`h-full bg-gradient-to-r ${color} rounded-full`}
        initial={{ width: 0 }}
        animate={{ width: '70%' }}
        transition={{ duration: 1 }}
      />
    </div>
  </motion.div>
);

// ============================================================
// الصفحة الرئيسية: تقرير أكواد الشحن
// ============================================================

export default function TeacherCodesReportPage() {
  const { isDark } = useTheme();
  const supabase = createClient();
  const fetchedRef = useRef(false);

  // حالات عامة
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [codes, setCodes] = useState([]);
  const [courses, setCourses] = useState([]);
  const [usageLogs, setUsageLogs] = useState([]);

  // فلاتر
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all, used, unused, expired
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [searchTerm, setSearchTerm] = useState('');

  // إحصائيات
  const [stats, setStats] = useState({
    total: 0,
    used: 0,
    unused: 0,
    expired: 0,
    usageRate: 0,
    totalDevices: 0,
    uniqueStudents: 0,
    recentUsage: [],
    usageByMonth: [],
    usageByCourse: [],
  });

  // ============================================================
  // جلب البيانات
  // ============================================================

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('يرجى تسجيل الدخول');
        return;
      }

      // 1. جلب جميع كورسات المعلم
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      if (!coursesData || coursesData.length === 0) {
        setCodes([]);
        setUsageLogs([]);
        setStats({
          total: 0,
          used: 0,
          unused: 0,
          expired: 0,
          usageRate: 0,
          totalDevices: 0,
          uniqueStudents: 0,
          recentUsage: [],
          usageByMonth: [],
          usageByCourse: [],
        });
        setLoading(false);
        return;
      }

      const courseIds = coursesData.map(c => c.id);

      // 2. جلب الأكواد
      const { data: codesData, error: codesError } = await supabase
        .from('course_access_codes')
        .select(`
          *,
          course:course_id (title),
          used_by:used_by_user_id (full_name, email)
        `)
        .in('course_id', courseIds)
        .order('generated_at', { ascending: false });

      if (codesError) throw codesError;
      setCodes(codesData || []);

      // 3. جلب سجلات الاستخدام (للتحليلات)
      const { data: logsData, error: logsError } = await supabase
        .from('code_usage_logs')
        .select(`
          *,
          code:code_id (code, course_id),
          student:student_id (full_name, email)
        `)
        .in('code_id', (codesData || []).map(c => c.id))
        .order('used_at', { ascending: false });

      if (logsError) throw logsError;
      setUsageLogs(logsData || []);

      // ============================================================
      // حساب الإحصائيات
      // ============================================================

      const allCodes = codesData || [];
      const usedCodes = allCodes.filter(c => c.is_used === true);
      const unusedCodes = allCodes.filter(c => c.is_used === false && (c.expires_at ? new Date(c.expires_at) > new Date() : true));
      const expiredCodes = allCodes.filter(c => c.expires_at && new Date(c.expires_at) < new Date() && c.is_used === false);

      const total = allCodes.length;
      const used = usedCodes.length;
      const unused = unusedCodes.length;
      const expired = expiredCodes.length;
      const usageRate = total > 0 ? Math.round((used / total) * 100) : 0;

      // عدد الأجهزة المسموح بها (مجموع max_devices)
      const totalDevices = allCodes.reduce((acc, c) => acc + (c.max_devices || 1), 0);

      // عدد الطلاب الفريدين الذين استخدموا أكواد
      const uniqueStudents = new Set(usedCodes.map(c => c.used_by_user_id).filter(Boolean)).size;

      // آخر 10 استخدامات
      const recentUsage = (logsData || []).slice(0, 10).map(log => ({
        code: log.code?.code || 'غير معروف',
        student: log.student?.full_name || 'طالب',
        course: coursesData.find(c => c.id === log.code?.course_id)?.title || 'غير معروف',
        usedAt: log.used_at,
        device: log.device_fingerprint?.slice(0, 12) || '',
      }));

      // استخدام الأكواد حسب الشهر (آخر 6 أشهر)
      const monthMap = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const m = format(subMonths(now, i), 'MMM yyyy', { locale: ar });
        monthMap[m] = 0;
      }
      (logsData || []).forEach(log => {
        const d = new Date(log.used_at);
        const key = format(d, 'MMM yyyy', { locale: ar });
        if (monthMap[key] !== undefined) {
          monthMap[key] += 1;
        }
      });
      const usageByMonth = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

      // توزيع الاستخدام حسب الكورس
      const courseMap = {};
      usedCodes.forEach(c => {
        const title = c.course?.title || 'غير معروف';
        if (!courseMap[title]) courseMap[title] = 0;
        courseMap[title] += 1;
      });
      const usageByCourse = Object.entries(courseMap).map(([course, count]) => ({ course, count }));

      setStats({
        total,
        used,
        unused,
        expired,
        usageRate,
        totalDevices,
        uniqueStudents,
        recentUsage,
        usageByMonth,
        usageByCourse,
      });

    } catch (err) {
      console.error('Error loading codes report:', err);
      setError('فشل تحميل التقرير: ' + err.message);
      toast.error('حدث خطأ أثناء تحميل التقرير');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadData();
  }, [loadData]);

  // ============================================================
  // التصفية والبحث
  // ============================================================

  const filteredCodes = useMemo(() => {
    let result = codes;

    if (selectedCourseId !== 'all') {
      result = result.filter(c => c.course_id === selectedCourseId);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'used') result = result.filter(c => c.is_used === true);
      else if (statusFilter === 'unused') result = result.filter(c => c.is_used === false && (c.expires_at ? new Date(c.expires_at) > new Date() : true));
      else if (statusFilter === 'expired') result = result.filter(c => c.expires_at && new Date(c.expires_at) < new Date() && c.is_used === false);
    }

    if (dateRange.from && dateRange.to) {
      result = result.filter(c => {
        const d = new Date(c.generated_at);
        return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
      });
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.course?.title?.toLowerCase().includes(q) ||
        c.used_by?.full_name?.toLowerCase().includes(q)
      );
    }

    return result;
  }, [codes, selectedCourseId, statusFilter, dateRange, searchTerm]);

  // ============================================================
  // بيانات الرسوم البيانية
  // ============================================================

  const chartStatusDistribution = {
    labels: ['مستخدم', 'غير مستخدم', 'منتهي'],
    datasets: [
      {
        data: [stats.used, stats.unused, stats.expired],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 1,
      },
    ],
  };

  const chartUsageByMonth = {
    labels: stats.usageByMonth.map(item => item.month),
    datasets: [
      {
        label: 'عدد الأكواد المستخدمة',
        data: stats.usageByMonth.map(item => item.count),
        borderColor: '#FACC15',
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#FACC15',
      },
    ],
  };

  const chartUsageByCourse = {
    labels: stats.usageByCourse.map(item => item.course),
    datasets: [
      {
        label: 'عدد الأكواد المستخدمة',
        data: stats.usageByCourse.map(item => item.count),
        backgroundColor: ['#FACC15', '#D97706', '#F59E0B', '#FBBF24', '#FCD34D', '#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#EF4444'],
        borderWidth: 1,
      },
    ],
  };

  // ============================================================
  // التصدير (CSV)
  // ============================================================

  const exportCSV = () => {
    if (filteredCodes.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    const headers = ['الكود', 'الكورس', 'الحالة', 'المستخدم', 'تاريخ التوليد', 'تاريخ الاستخدام', 'تاريخ الانتهاء', 'الأجهزة المسموحة', 'ملاحظات'];
    const rows = filteredCodes.map(c => [
      c.code,
      c.course?.title || 'غير معروف',
      c.is_used ? 'مستخدم' : (c.expires_at && new Date(c.expires_at) < new Date() ? 'منتهي' : 'غير مستخدم'),
      c.used_by?.full_name || '-',
      format(new Date(c.generated_at), 'dd/MM/yyyy HH:mm'),
      c.used_at ? format(new Date(c.used_at), 'dd/MM/yyyy HH:mm') : '-',
      c.expires_at ? format(new Date(c.expires_at), 'dd/MM/yyyy') : '-',
      c.max_devices || 1,
      c.notes || '-',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_الأكواد_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('تم تصدير التقرير بنجاح');
  };

  // ============================================================
  // نسخ الكود
  // ============================================================

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ الكود');
  };

  // ============================================================
  // التصميم
  // ============================================================

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>جاري تحميل تقرير الأكواد...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* العنوان وشريط الإجراءات */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              🎫 تقرير أكواد الشحن
            </h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              تحليل شامل لأكواد الشحن المستخدمة وغير المستخدمة
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={loadData}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition flex items-center gap-2 ${isDark ? 'border-gray-700 hover:bg-gray-800 text-gray-300' : 'border-gray-200 hover:bg-gray-100 text-gray-600'}`}
            >
              <RefreshCw className="h-4 w-4" /> تحديث
            </button>
            <button
              onClick={exportCSV}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 flex items-center gap-2 transition"
            >
              <Download className="h-4 w-4" /> تصدير CSV
            </button>
          </div>
        </div>

        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={Key}
            label="إجمالي الأكواد"
            value={stats.total}
            subValue={`${stats.usageRate}% مستخدمة`}
            color="from-amber-400 to-amber-600"
            isDark={isDark}
            delay={0}
          />
          <StatCard
            icon={CheckCircle}
            label="مستخدمة"
            value={stats.used}
            subValue={`من ${stats.total}`}
            color="from-green-400 to-green-600"
            isDark={isDark}
            delay={0.1}
          />
          <StatCard
            icon={Clock}
            label="غير مستخدمة"
            value={stats.unused}
            subValue={`صالحة`}
            color="from-yellow-400 to-yellow-600"
            isDark={isDark}
            delay={0.2}
          />
          <StatCard
            icon={AlertCircle}
            label="منتهية"
            value={stats.expired}
            subValue={`انتهت صلاحيتها`}
            color="from-red-400 to-red-600"
            isDark={isDark}
            delay={0.3}
          />
        </div>

        {/* بطاقات إضافية */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            icon={Users}
            label="طلاب استخدموا أكواد"
            value={stats.uniqueStudents}
            subValue={`طالب فريد`}
            color="from-blue-400 to-blue-600"
            isDark={isDark}
            delay={0.4}
          />
          <StatCard
            icon={TrendingUp}
            label="إجمالي الأجهزة المسموحة"
            value={stats.totalDevices}
            subValue={`جهاز`}
            color="from-purple-400 to-purple-600"
            isDark={isDark}
            delay={0.5}
          />
          <StatCard
            icon={BarChart3}
            label="نسبة التفعيل"
            value={`${stats.usageRate}%`}
            subValue={stats.usageRate > 50 ? '👍 جيد' : '👎 منخفض'}
            color="from-indigo-400 to-indigo-600"
            isDark={isDark}
            delay={0.6}
          />
        </div>

        {/* الفلاتر */}
        <WaveBorderCard isDark={isDark} className="p-4">
          <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
            <div className="flex-1 w-full md:w-auto flex flex-wrap items-center gap-2">
              <Filter className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className={`px-3 py-2 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-200 text-gray-800'} text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition`}
              >
                <option value="all">جميع الكورسات</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className={`px-3 py-2 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-200 text-gray-800'} text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition`}
              >
                <option value="all">جميع الحالات</option>
                <option value="used">مستخدم</option>
                <option value="unused">غير مستخدم</option>
                <option value="expired">منتهي</option>
              </select>
              <input
                type="date"
                value={format(dateRange.from, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange({ ...dateRange, from: new Date(e.target.value) })}
                className={`px-3 py-2 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-200 text-gray-800'} text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition`}
              />
              <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>إلى</span>
              <input
                type="date"
                value={format(dateRange.to, 'yyyy-MM-dd')}
                onChange={(e) => setDateRange({ ...dateRange, to: new Date(e.target.value) })}
                className={`px-3 py-2 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700 text-white' : 'bg-white/50 border-gray-200 text-gray-800'} text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition`}
              />
            </div>
            <div className="relative w-full md:w-auto">
              <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
              <input
                type="text"
                placeholder="بحث عن كود أو طالب..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`w-full md:w-48 pl-9 pr-3 py-2 rounded-xl border ${isDark ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-400' : 'bg-white/50 border-gray-200 text-gray-800 placeholder-gray-500'} text-sm focus:ring-2 focus:ring-amber-500/50 outline-none transition`}
              />
            </div>
            <div className="text-sm text-gray-500">
              {filteredCodes.length} كود
            </div>
          </div>
        </WaveBorderCard>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <WaveBorderCard isDark={isDark}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-4 text-center`}>
                توزيع الأكواد حسب الحالة
              </h3>
              <div className="h-56">
                <Doughnut
                  data={chartStatusDistribution}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: isDark ? '#fff' : '#333', font: { size: 10 } },
                      },
                    },
                  }}
                />
              </div>
            </WaveBorderCard>
          </div>
          <div className="lg:col-span-2">
            <WaveBorderCard isDark={isDark}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-4 text-center`}>
                استخدام الأكواد شهرياً
              </h3>
              <div className="h-56">
                <Line
                  data={chartUsageByMonth}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `${ctx.parsed.y} كود`,
                        },
                      },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: isDark ? '#fff' : '#333' },
                        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                      },
                      x: {
                        ticks: { color: isDark ? '#fff' : '#333' },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </WaveBorderCard>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <WaveBorderCard isDark={isDark}>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-4 text-center`}>
              توزيع الاستخدام حسب الكورس
            </h3>
            <div className="h-56">
              <Bar
                data={chartUsageByCourse}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      callbacks: {
                        label: (ctx) => `${ctx.parsed.y} كود`,
                      },
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: { color: isDark ? '#fff' : '#333' },
                      grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                    },
                    x: {
                      ticks: { color: isDark ? '#fff' : '#333', font: { size: 10 } },
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>
          </WaveBorderCard>

          {/* آخر الاستخدامات */}
          <WaveBorderCard isDark={isDark}>
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
              <Clock className="h-5 w-5 text-amber-400" />
              آخر الاستخدامات
            </h3>
            {stats.recentUsage.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>لا توجد استخدامات حتى الآن</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stats.recentUsage.map((item, index) => (
                  <div key={index} className={`flex items-center justify-between p-2 rounded-lg ${isDark ? 'bg-gray-800/30' : 'bg-white/30'} border ${isDark ? 'border-gray-700/30' : 'border-gray-200/30'}`}>
                    <div>
                      <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                        {item.code}
                      </p>
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {item.student} • {item.course}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                        {format(new Date(item.usedAt), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </p>
                      <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        جهاز: {item.device}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </WaveBorderCard>
        </div>

        {/* جدول الأكواد */}
        <WaveBorderCard isDark={isDark}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              قائمة الأكواد ({filteredCodes.length})
            </h3>
          </div>
          <div className="overflow-x-auto">
            {filteredCodes.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>لا توجد أكواد تطابق الفلاتر</p>
            ) : (
              <table className="w-full text-sm">
                <thead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <tr>
                    <th className="text-right py-2 px-3">الكود</th>
                    <th className="text-right py-2 px-3">الكورس</th>
                    <th className="text-right py-2 px-3">الحالة</th>
                    <th className="text-right py-2 px-3">المستخدم</th>
                    <th className="text-right py-2 px-3">تاريخ التوليد</th>
                    <th className="text-right py-2 px-3">تاريخ الانتهاء</th>
                    <th className="text-right py-2 px-3">الأجهزة</th>
                    <th className="text-right py-2 px-3">الإجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCodes.map((code, index) => {
                    const status = code.is_used
                      ? { label: 'مستخدم', color: 'bg-green-500/20 text-green-400' }
                      : (code.expires_at && new Date(code.expires_at) < new Date())
                        ? { label: 'منتهي', color: 'bg-red-500/20 text-red-400' }
                        : { label: 'غير مستخدم', color: 'bg-yellow-500/20 text-yellow-400' };
                    return (
                      <tr key={code.id} className={`border-b ${isDark ? 'border-gray-700/50' : 'border-gray-100'} hover:bg-white/5 transition`}>
                        <td className="py-2 px-3 font-mono text-xs">{code.code}</td>
                        <td className="py-2 px-3">{code.course?.title || 'غير معروف'}</td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-2 px-3">{code.used_by?.full_name || '-'}</td>
                        <td className="py-2 px-3 text-xs">
                          {format(new Date(code.generated_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </td>
                        <td className="py-2 px-3 text-xs">
                          {code.expires_at ? format(new Date(code.expires_at), 'dd/MM/yyyy', { locale: ar }) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">{code.max_devices || 1}</td>
                        <td className="py-2 px-3">
                          <button
                            onClick={() => copyCode(code.code)}
                            className="p-1.5 hover:bg-amber-500/20 rounded-lg transition text-amber-400"
                            title="نسخ الكود"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </WaveBorderCard>
      </div>
    </div>
  );
}