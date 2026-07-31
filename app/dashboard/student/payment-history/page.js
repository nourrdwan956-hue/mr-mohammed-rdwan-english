// app/dashboard/student/payment-history/page.js
// ================================================================
// 💳 سجل المدفوعات – عرض جميع مدفوعات الطالب
// ================================================================

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';
import Link from 'next/link';

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
// مكون صف الدفعة
// ================================================================
const PaymentRow = ({ payment, index, styles, language, isDark }) => {
  const [color, setColor] = useState(CARD_COLORS[index % CARD_COLORS.length]);
  const [isHovered, setIsHovered] = useState(false);
  const handleColorChange = (newColor) => setColor(newColor);

  const statusMap = {
    pending: { label: language === 'ar' ? 'قيد الانتظار' : 'Pending', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/30' },
    paid: { label: language === 'ar' ? 'مدفوع' : 'Paid', color: 'text-emerald-400', bg: 'bg-emerald-400/10', border: 'border-emerald-400/30' },
    failed: { label: language === 'ar' ? 'فشل' : 'Failed', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/30' },
    refunded: { label: language === 'ar' ? 'مسترجع' : 'Refunded', color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/30' },
  };
  const status = statusMap[payment.payment_status] || statusMap.pending;

  const date = new Date(payment.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const courseTitle = payment.courses?.title || (language === 'ar' ? 'كورس' : 'Course');

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div
        className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-all"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-1 min-w-0">
          <Link
            href={`/dashboard/student/courses/${payment.course_id}`}
            className={`font-bold ${styles.text} hover:${color.text} transition`}
          >
            {courseTitle}
          </Link>
          <p className={`text-sm ${styles.subtext}`}>{date}</p>
          <p className={`text-xs ${styles.subtext} mt-0.5`}>
            {language === 'ar' ? 'رقم المعاملة' : 'Transaction'}: {payment.transaction_id || '—'}
          </p>
        </div>
        <div className="flex items-center gap-4 flex-wrap">
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.bg} ${status.color} ${status.border} border`}>
            {status.label}
          </span>
          <span className={`text-lg font-bold ${styles.text}`}>
            {payment.amount / 100} ج.م
          </span>
          {/* ====== ✅ عرض طريقة الدفع مع أيقونة مناسبة ====== */}
          <span className={`text-xs ${styles.subtext}`}>
            {payment.payment_method === 'code' ? (
              <span className="flex items-center gap-1 text-purple-400">
                <Icons.Key className="h-3 w-3" /> كود شحن
              </span>
            ) : payment.payment_method === 'paymob' ? (
              <span className="flex items-center gap-1 text-blue-400">
                <Icons.CreditCard className="h-3 w-3" /> Paymob
              </span>
            ) : (
              payment.payment_method || (language === 'ar' ? 'غير محدد' : 'Unknown')
            )}
          </span>
        </div>
      </div>
    </WaveBorderCard>
  );
};

// ================================================================
// الصفحة الرئيسية – سجل المدفوعات
// ================================================================
export default function StudentPaymentHistoryPage() {
  const router = useRouter();
  const { theme, language, styles } = useTheme();
  const isDark = theme === 'dark';

  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    paid: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
  });

  // ألوان متغيرة للرأس
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  // ===== جلب البيانات (جميع المدفوعات بما فيها code) =====
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // ✅ جلب جميع المدفوعات (بما فيها payment_method = 'code')
      const { data, error } = await supabase
        .from('course_payments')
        .select(`
          *,
          courses:course_id (id, title)
        `)
        .eq('student_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);

      // حساب الإحصائيات
      const total = data?.length || 0;
      const paid = data?.filter(p => p.payment_status === 'paid').length || 0;
      const pending = data?.filter(p => p.payment_status === 'pending').length || 0;
      const failed = data?.filter(p => p.payment_status === 'failed').length || 0;
      const totalAmount = data?.filter(p => p.payment_status === 'paid')
        .reduce((sum, p) => sum + (p.amount / 100), 0) || 0;

      setStats({ total, paid, pending, failed, totalAmount });

    } catch (err) {
      console.error('Error fetching payments:', err);
      setError(language === 'ar' ? 'فشل تحميل المدفوعات' : 'Failed to load payments');
      toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [router, language]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // ===== فلترة =====
  const filteredPayments = useMemo(() => {
    let result = payments;
    if (filterStatus !== 'all') {
      result = result.filter(p => p.payment_status === filterStatus);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(p =>
        p.courses?.title?.toLowerCase().includes(q) ||
        p.transaction_id?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [payments, filterStatus, searchTerm]);

  // ===== تصدير CSV =====
  const exportCSV = useCallback(() => {
    if (payments.length === 0) {
      toast.error(language === 'ar' ? 'لا توجد بيانات للتصدير' : 'No data to export');
      return;
    }

    const headers = ['الكورس', 'المبلغ', 'الحالة', 'طريقة الدفع', 'رقم المعاملة', 'التاريخ'];
    const rows = payments.map(p => [
      p.courses?.title || '',
      `${p.amount / 100} ج.م`,
      p.payment_status,
      p.payment_method || 'Paymob',
      p.transaction_id || '',
      new Date(p.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `مدفوعاتي_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(language === 'ar' ? '✅ تم تصدير البيانات' : '✅ Data exported');
  }, [payments, language]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`text-sm ${styles.subtext}`}>
            {language === 'ar' ? 'جاري تحميل المدفوعات...' : 'Loading payments...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
            onClick={fetchPayments}
            className="mt-6 px-6 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية متحركة */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-60 -right-60 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[900px] h-[900px] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* ===== رأس الصفحة ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className={`text-3xl sm:text-4xl font-black ${styles.text}`}>
                {language === 'ar' ? '💳 سجل المدفوعات' : '💳 Payment History'}
              </h1>
              <p className={`text-base ${styles.subtext} mt-1`}>
                {language === 'ar'
                  ? `إجمالي المدفوعات: ${stats.total} (${stats.paid} مدفوع، ${stats.pending} معلق)`
                  : `Total payments: ${stats.total} (${stats.paid} paid, ${stats.pending} pending)`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={exportCSV}
                className="px-4 py-2 rounded-xl bg-green-500/20 hover:bg-green-500/30 text-green-400 transition flex items-center gap-2 text-sm font-bold"
              >
                <Icons.Download className="h-4 w-4" />
                {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
              </button>
              <button
                onClick={fetchPayments}
                className={`p-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition`}
                title={language === 'ar' ? 'تحديث' : 'Refresh'}
              >
                <Icons.RefreshCw className="h-5 w-5 text-blue-400" />
              </button>
              <button
                onClick={() => router.push('/dashboard/student')}
                className={`px-4 py-2 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-400/50 transition text-sm font-bold ${styles.text}`}
              >
                <Icons.ArrowLeft className="h-4 w-4 inline mr-1" />
                {language === 'ar' ? 'الرئيسية' : 'Home'}
              </button>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== إحصائيات سريعة ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold ${styles.text}`}>{stats.total}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</p>
          </div>
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold text-emerald-400`}>{stats.paid}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'مدفوع' : 'Paid'}</p>
          </div>
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold text-yellow-400`}>{stats.pending}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'معلق' : 'Pending'}</p>
          </div>
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold text-red-400`}>{stats.failed}</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'فشل' : 'Failed'}</p>
          </div>
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border} text-center`}>
            <p className={`text-2xl font-bold text-yellow-400`}>{stats.totalAmount} ج.م</p>
            <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'الإجمالي' : 'Total Amount'}</p>
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
              placeholder={language === 'ar' ? 'ابحث عن كورس...' : 'Search for course...'}
              className={`w-full p-3 pr-10 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition`}
          >
            <option value="all">{language === 'ar' ? 'كل الحالات' : 'All Status'}</option>
            <option value="paid">{language === 'ar' ? 'مدفوع' : 'Paid'}</option>
            <option value="pending">{language === 'ar' ? 'معلق' : 'Pending'}</option>
            <option value="failed">{language === 'ar' ? 'فشل' : 'Failed'}</option>
            <option value="refunded">{language === 'ar' ? 'مسترجع' : 'Refunded'}</option>
          </select>
        </div>

        {/* ===== قائمة المدفوعات ===== */}
        {filteredPayments.length === 0 ? (
          <div className={`text-center py-20 ${styles.card} border ${styles.border} rounded-3xl`}>
            <Icons.Receipt className="h-20 w-20 text-gray-500 mx-auto mb-4" />
            <h3 className={`text-2xl font-bold ${styles.text}`}>
              {searchTerm || filterStatus !== 'all'
                ? (language === 'ar' ? 'لا توجد نتائج مطابقة' : 'No matching results')
                : (language === 'ar' ? 'لا توجد مدفوعات' : 'No payments yet')}
            </h3>
            <p className={`text-base ${styles.subtext} mt-2`}>
              {searchTerm || filterStatus !== 'all'
                ? (language === 'ar' ? 'جرب تغيير معايير البحث' : 'Try changing search criteria')
                : (language === 'ar' ? 'ستظهر هنا جميع مدفوعاتك' : 'All your payments will appear here')}
            </p>
            {!searchTerm && filterStatus === 'all' && (
              <button
                onClick={() => router.push('/dashboard/student/courses')}
                className="mt-6 px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-105 transition shadow-2xl shadow-yellow-400/30"
              >
                {language === 'ar' ? 'استعرض الكورسات' : 'Browse Courses'}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPayments.map((payment, idx) => (
              <PaymentRow
                key={payment.id}
                payment={payment}
                index={idx}
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
            { href: '/dashboard/student', icon: Icons.Home, label: language === 'ar' ? 'الرئيسية' : 'Home' },
            { href: '/dashboard/student/courses', icon: Icons.Book, label: language === 'ar' ? 'الكورسات' : 'Courses' },
            { href: '/dashboard/student/subscriptions', icon: Icons.Receipt, label: language === 'ar' ? 'اشتراكاتي' : 'Subscriptions' },
            { href: '/dashboard/student/devices', icon: Icons.Monitor, label: language === 'ar' ? 'الأجهزة' : 'Devices' },
            { href: '/dashboard/student/profile', icon: Icons.User, label: language === 'ar' ? 'حسابي' : 'Profile' },
            { href: '/dashboard/student/support', icon: Icons.Headphones, label: language === 'ar' ? 'الدعم' : 'Support' },
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
  );
}