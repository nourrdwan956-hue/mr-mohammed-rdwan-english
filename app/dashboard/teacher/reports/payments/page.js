'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  Filter,
  Search,
  Download,
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink
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
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isWithinInterval } from 'date-fns';
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
// مكونات مساعدة (مشتركة)
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
// الصفحة الرئيسية: تقرير المدفوعات
// ============================================================

export default function TeacherPaymentsReportPage() {
  const { isDark } = useTheme();
  const supabase = supabase;
  const fetchedRef = useRef(false);

  // حالات عامة
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [courses, setCourses] = useState([]);
  const [payments, setPayments] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('all');
  const [dateRange, setDateRange] = useState({ from: subDays(new Date(), 30), to: new Date() });
  const [statusFilter, setStatusFilter] = useState('all'); // all, paid, pending, failed, refunded

  // إحصائيات محسوبة
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPayments: 0,
    paidCount: 0,
    pendingCount: 0,
    failedCount: 0,
    refundedCount: 0,
    uniqueStudents: 0,
    avgPayment: 0,
    revenueByCourse: [],
    revenueByMonth: [],
    recentPayments: [],
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
        .select('id, title, is_free, price')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);

      // إذا لم تكن هناك كورسات
      if (!coursesData || coursesData.length === 0) {
        setStats({
          totalRevenue: 0,
          totalPayments: 0,
          paidCount: 0,
          pendingCount: 0,
          failedCount: 0,
          refundedCount: 0,
          uniqueStudents: 0,
          avgPayment: 0,
          revenueByCourse: [],
          revenueByMonth: [],
          recentPayments: [],
        });
        setPayments([]);
        setSubscriptions([]);
        setLoading(false);
        return;
      }

      const courseIds = coursesData.map(c => c.id);

      // 2. جلب المدفوعات لكل هذه الكورسات
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('course_payments')
        .select(`
          *,
          course:course_id (title),
          student:student_id (full_name, email)
        `)
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;
      setPayments(paymentsData || []);

      // 3. جلب الاشتراكات النشطة (لحساب عدد الطلاب الفريدين)
      const { data: subsData, error: subsError } = await supabase
        .from('course_subscriptions')
        .select('student_id, course_id, access_type')
        .in('course_id', courseIds)
        .eq('is_active', true);

      if (subsError) throw subsError;
      setSubscriptions(subsData || []);

      // ============================================================
      // حساب الإحصائيات
      // ============================================================

      const allPayments = paymentsData || [];
      const paid = allPayments.filter(p => p.payment_status === 'paid');
      const pending = allPayments.filter(p => p.payment_status === 'pending');
      const failed = allPayments.filter(p => p.payment_status === 'failed');
      const refunded = allPayments.filter(p => p.payment_status === 'refunded');
      const totalRevenue = paid.reduce((sum, p) => sum + (p.amount / 100), 0);
      const uniqueStudents = new Set(subsData?.map(s => s.student_id) || []).size;

      // الإيرادات حسب الكورس
      const revenueMap = {};
      paid.forEach(p => {
        const courseTitle = p.course?.title || 'غير معروف';
        if (!revenueMap[courseTitle]) revenueMap[courseTitle] = 0;
        revenueMap[courseTitle] += p.amount / 100;
      });
      const revenueByCourse = Object.entries(revenueMap).map(([course, amount]) => ({ course, amount }));

      // الإيرادات الشهرية (آخر 6 أشهر)
      const monthMap = {};
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const m = format(subMonths(now, i), 'MMM yyyy', { locale: ar });
        monthMap[m] = 0;
      }
      paid.forEach(p => {
        const d = new Date(p.paid_at || p.created_at);
        const key = format(d, 'MMM yyyy', { locale: ar });
        if (monthMap[key] !== undefined) {
          monthMap[key] += p.amount / 100;
        }
      });
      const revenueByMonth = Object.entries(monthMap).map(([month, amount]) => ({ month, amount }));

      // آخر 10 مدفوعات
      const recentPayments = allPayments.slice(0, 10).map(p => ({
        id: p.id,
        student: p.student?.full_name || 'طالب',
        course: p.course?.title || 'كورس',
        amount: p.amount / 100,
        status: p.payment_status,
        date: p.paid_at || p.created_at,
        transaction_id: p.transaction_id,
      }));

      setStats({
        totalRevenue,
        totalPayments: allPayments.length,
        paidCount: paid.length,
        pendingCount: pending.length,
        failedCount: failed.length,
        refundedCount: refunded.length,
        uniqueStudents,
        avgPayment: paid.length > 0 ? totalRevenue / paid.length : 0,
        revenueByCourse,
        revenueByMonth,
        recentPayments,
      });

    } catch (err) {
      console.error('Error loading report:', err);
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
  // بيانات التصفية
  // ============================================================

  const filteredPayments = useMemo(() => {
    let result = payments;
    if (selectedCourseId !== 'all') {
      result = result.filter(p => p.course_id === selectedCourseId);
    }
    if (statusFilter !== 'all') {
      result = result.filter(p => p.payment_status === statusFilter);
    }
    // تصفية حسب التاريخ
    if (dateRange.from && dateRange.to) {
      result = result.filter(p => {
        const d = new Date(p.created_at);
        return isWithinInterval(d, { start: dateRange.from, end: dateRange.to });
      });
    }
    return result;
  }, [payments, selectedCourseId, statusFilter, dateRange]);

  // ============================================================
  // تحضير بيانات الرسوم البيانية
  // ============================================================

  const chartRevenueByMonth = {
    labels: stats.revenueByMonth.map(item => item.month),
    datasets: [
      {
        label: 'الإيرادات (ج.م)',
        data: stats.revenueByMonth.map(item => item.amount),
        borderColor: '#FACC15',
        backgroundColor: 'rgba(250, 204, 21, 0.1)',
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#FACC15',
      },
    ],
  };

  const chartRevenueByCourse = {
    labels: stats.revenueByCourse.map(item => item.course),
    datasets: [
      {
        data: stats.revenueByCourse.map(item => item.amount),
        backgroundColor: [
          '#FACC15', '#D97706', '#F59E0B', '#FBBF24', '#FCD34D',
          '#EC4899', '#8B5CF6', '#3B82F6', '#10B981', '#EF4444'
        ],
        borderWidth: 1,
      },
    ],
  };

  const chartStatusDistribution = {
    labels: ['مدفوع', 'معلق', 'فاشل', 'مسترجع'],
    datasets: [
      {
        data: [stats.paidCount, stats.pendingCount, stats.failedCount, stats.refundedCount],
        backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
        borderWidth: 1,
      },
    ],
  };

  // ============================================================
  // التصدير (CSV)
  // ============================================================

  const exportCSV = () => {
    if (filteredPayments.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }
    const headers = ['الطالب', 'الكورس', 'المبلغ (ج.م)', 'الحالة', 'التاريخ', 'معرف العملية'];
    const rows = filteredPayments.map(p => [
      p.student?.full_name || 'غير معروف',
      p.course?.title || 'غير معروف',
      (p.amount / 100).toFixed(2),
      p.payment_status,
      format(new Date(p.created_at), 'dd/MM/yyyy HH:mm'),
      p.transaction_id || '',
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `تقرير_المدفوعات_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    toast.success('تم تصدير التقرير بنجاح');
  };

  // ============================================================
  // التصميم
  // ============================================================

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>جاري تحميل التقرير...</p>
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
              📊 التقرير المالي
            </h1>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              نظرة شاملة على إيراداتك ومدفوعاتك
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
            icon={DollarSign}
            label="إجمالي الإيرادات"
            value={`${stats.totalRevenue.toFixed(2)} ج.م`}
            subValue={`من ${stats.paidCount} مدفوعات`}
            color="from-amber-400 to-amber-600"
            isDark={isDark}
            delay={0}
          />
          <StatCard
            icon={Users}
            label="الطلاب المدفوعين"
            value={stats.uniqueStudents}
            subValue={`متوسط الدفع: ${stats.avgPayment.toFixed(2)} ج.م`}
            color="from-blue-400 to-blue-600"
            isDark={isDark}
            delay={0.1}
          />
          <StatCard
            icon={Clock}
            label="مدفوعات معلقة"
            value={stats.pendingCount}
            subValue={`${stats.totalPayments} إجمالي`}
            color="from-yellow-400 to-yellow-600"
            isDark={isDark}
            delay={0.2}
          />
          <StatCard
            icon={CheckCircle}
            label="ناجحة"
            value={stats.paidCount}
            subValue={`${stats.failedCount} فاشلة`}
            color="from-green-400 to-green-600"
            isDark={isDark}
            delay={0.3}
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
                <option value="paid">مدفوع</option>
                <option value="pending">معلق</option>
                <option value="failed">فاشل</option>
                <option value="refunded">مسترجع</option>
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
            <div className="text-sm text-gray-500">
              {filteredPayments.length} عملية
            </div>
          </div>
        </WaveBorderCard>

        {/* الرسوم البيانية */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <WaveBorderCard isDark={isDark}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-4`}>
                الإيرادات الشهرية
              </h3>
              <div className="h-64">
                <Line
                  data={chartRevenueByMonth}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                      tooltip: {
                        callbacks: {
                          label: (ctx) => `${ctx.parsed.y} ج.م`,
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
          <div>
            <WaveBorderCard isDark={isDark}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-4`}>
                توزيع الإيرادات حسب الكورس
              </h3>
              <div className="h-64">
                <Doughnut
                  data={chartRevenueByCourse}
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <WaveBorderCard isDark={isDark}>
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-4`}>
                توزيع الحالات
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
              <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'} mb-4 flex items-center gap-2`}>
                <BarChart3 className="h-5 w-5 text-amber-400" />
                آخر المدفوعات
              </h3>
              <div className="overflow-x-auto">
                {stats.recentPayments.length === 0 ? (
                  <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>لا توجد مدفوعات حتى الآن</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                      <tr>
                        <th className="text-right py-2 px-3">الطالب</th>
                        <th className="text-right py-2 px-3">الكورس</th>
                        <th className="text-right py-2 px-3">المبلغ</th>
                        <th className="text-right py-2 px-3">الحالة</th>
                        <th className="text-right py-2 px-3">التاريخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentPayments.map((p, i) => (
                        <tr key={p.id} className={`border-b ${isDark ? 'border-gray-700/50' : 'border-gray-100'} hover:bg-white/5 transition`}>
                          <td className="py-2 px-3">{p.student}</td>
                          <td className="py-2 px-3">{p.course}</td>
                          <td className="py-2 px-3">{p.amount.toFixed(2)} ج.م</td>
                          <td className="py-2 px-3">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                              ${p.status === 'paid' ? 'bg-green-500/20 text-green-400' : ''}
                              ${p.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                              ${p.status === 'failed' ? 'bg-red-500/20 text-red-400' : ''}
                              ${p.status === 'refunded' ? 'bg-gray-500/20 text-gray-400' : ''}
                            `}>
                              {p.status === 'paid' ? 'مدفوع' : p.status === 'pending' ? 'معلق' : p.status === 'failed' ? 'فاشل' : 'مسترجع'}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-xs">
                            {format(new Date(p.date), 'dd/MM/yyyy HH:mm', { locale: ar })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </WaveBorderCard>
          </div>
        </div>

        {/* جدول جميع المدفوعات (مع التصفية) */}
        <WaveBorderCard isDark={isDark}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              سجل المدفوعات ({filteredPayments.length})
            </h3>
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {filteredPayments.length} عملية
            </span>
          </div>
          <div className="overflow-x-auto">
            {filteredPayments.length === 0 ? (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>لا توجد مدفوعات تطابق الفلاتر</p>
            ) : (
              <table className="w-full text-sm">
                <thead className={`${isDark ? 'text-gray-400' : 'text-gray-600'} border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
                  <tr>
                    <th className="text-right py-2 px-3">#</th>
                    <th className="text-right py-2 px-3">الطالب</th>
                    <th className="text-right py-2 px-3">الكورس</th>
                    <th className="text-right py-2 px-3">المبلغ</th>
                    <th className="text-right py-2 px-3">الحالة</th>
                    <th className="text-right py-2 px-3">التاريخ</th>
                    <th className="text-right py-2 px-3">معرف العملية</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((p, index) => (
                    <tr key={p.id} className={`border-b ${isDark ? 'border-gray-700/50' : 'border-gray-100'} hover:bg-white/5 transition`}>
                      <td className="py-2 px-3 text-gray-500">{index + 1}</td>
                      <td className="py-2 px-3">{p.student?.full_name || 'غير معروف'}</td>
                      <td className="py-2 px-3">{p.course?.title || 'غير معروف'}</td>
                      <td className="py-2 px-3">{(p.amount / 100).toFixed(2)} ج.م</td>
                      <td className="py-2 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium
                          ${p.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : ''}
                          ${p.payment_status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                          ${p.payment_status === 'failed' ? 'bg-red-500/20 text-red-400' : ''}
                          ${p.payment_status === 'refunded' ? 'bg-gray-500/20 text-gray-400' : ''}
                        `}>
                          {p.payment_status === 'paid' ? 'مدفوع' : p.payment_status === 'pending' ? 'معلق' : p.payment_status === 'failed' ? 'فاشل' : 'مسترجع'}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {format(new Date(p.created_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-500">{p.transaction_id || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </WaveBorderCard>
      </div>
    </div>
  );
}