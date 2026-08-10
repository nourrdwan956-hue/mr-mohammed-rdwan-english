// ================================================================
// 📁 app/dashboard/assistant/support/page.js
// ✅ النسخة النهائية المعدلة – تعتمد على الـ API الجديد
// ================================================================

'use client';

import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { hasPermission } from '@/lib/permissions';
import { useTheme } from '@/lib/hooks/useTheme';

// ===== عداد متحرك =====
const AnimatedCounter = ({ target }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0; const step = target / (1500 / 16);
        const timer = setInterval(() => { start += step; if (start >= target) { setCount(target); clearInterval(timer); } else setCount(Math.floor(start)); }, 16);
        return () => clearInterval(timer);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref} className="font-extrabold">{count}</span>;
};

// ===== بطاقة إحصائية =====
const StatCard = ({ icon: Icon, label, value, color, styles, delay = 0, suffix = '' }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay }} whileHover={{ scale: 1.02 }}
    className={`relative p-4 rounded-2xl border ${styles.border} ${styles.card} transition-shadow`}>
    <div className="flex items-center justify-between gap-2">
      <div>
        <p className={`text-xs font-medium ${styles.subtext} mb-0.5`}>{label}</p>
        <p className={`text-xl font-extrabold ${styles.text}`}><AnimatedCounter target={value} />{suffix}</p>
      </div>
      <div className={`p-2 rounded-lg bg-gradient-to-br ${color} bg-opacity-20`}><Icon className="h-5 w-5 text-white/90" /></div>
    </div>
  </motion.div>
);

export default function AssistantSupportHubPage() {
  const router = useRouter();
  const { theme, styles } = useTheme();
  const [assistant, setAssistant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);

  // بيانات حية
  const [technicalTickets, setTechnicalTickets] = useState([]);
  const [academicTickets, setAcademicTickets] = useState([]);
  const [stats, setStats] = useState({
    technicalOpen: 0,
    academicOpen: 0,
    avgResponseHours: 0,
    resolvedToday: 0,
  });

  // ===== جلب الصلاحيات من sessionStorage أو API =====
  const fetchPermissions = useCallback(async (assistantId) => {
    // 1. محاولة من sessionStorage
    let perms = [];
    const permsStored = sessionStorage.getItem('assistantPermissions');
    if (permsStored) {
      try {
        perms = JSON.parse(permsStored);
        if (Array.isArray(perms) && perms.length > 0) {
          console.log('✅ صلاحيات من sessionStorage');
          return perms;
        }
      } catch (e) {}
    }

    // 2. محاولة من API
    try {
      const res = await fetch('/api/assistant-data', {
        headers: { 'x-assistant-id': assistantId },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.permissions) {
          perms = data.permissions;
          sessionStorage.setItem('assistantPermissions', JSON.stringify(perms));
          console.log('✅ صلاحيات من API');
          return perms;
        }
      }
    } catch (err) {
      console.warn('⚠️ فشل جلب الصلاحيات من API:', err);
    }

    // 3. صلاحيات افتراضية (للحالات الطارئة)
    console.warn('⚠️ استخدام صلاحيات افتراضية');
    toast.error('تعذر جلب الصلاحيات، يرجى تسجيل الخروج والدخول مرة أخرى');
    return [];
  }, []);

  // ===== جلب البيانات الأولية باستخدام الـ API الجديد =====
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const stored = sessionStorage.getItem('assistantData');
      if (!stored) {
        router.push('/assistant-login');
        return;
      }
      const assistantData = JSON.parse(stored);
      setAssistant(assistantData);

      // جلب الصلاحيات
      const perms = await fetchPermissions(assistantData.id);
      setPermissions(perms);

      const canView = hasPermission(perms, 'tickets', 'can_view');
      if (!canView) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // جلب جميع التذاكر (بدون type) للحصول على الإحصائيات
      const res = await fetch('/api/assistant/support', {
        headers: { 'x-assistant-id': assistantData.id },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'فشل جلب البيانات');
      }
      const data = await res.json();
      if (!data.success) throw new Error('فشل جلب البيانات');

      // فصل التذاكر حسب النوع
      const techTickets = data.tickets?.filter(t => t.support_type === 'technical') || [];
      const acadTickets = data.tickets?.filter(t => t.support_type === 'academic') || [];

      setTechnicalTickets(techTickets);
      setAcademicTickets(acadTickets);

      // الإحصائيات
      const now = new Date();
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const technicalOpen = techTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
      const academicOpen = acadTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
      const resolvedToday = data.tickets?.filter(t => 
        (t.status === 'resolved' || t.status === 'closed') && new Date(t.updated_at).toISOString() >= todayStart
      ).length || 0;

      // حساب متوسط وقت الرد
      let totalResponseHours = 0, responseCount = 0;
      for (const ticket of data.tickets || []) {
        if (ticket.first_reply_at) {
          totalResponseHours += (new Date(ticket.first_reply_at) - new Date(ticket.created_at)) / (1000 * 60 * 60);
          responseCount++;
        }
      }
      const avgResponseHours = responseCount > 0 ? Math.round(totalResponseHours / responseCount) : 0;

      setStats({
        technicalOpen,
        academicOpen,
        avgResponseHours,
        resolvedToday,
      });

    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(err.message || 'فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [router, fetchPermissions]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // Realtime اشتراك (يستخدم supabase مباشرة، لكنه يستدعي fetchInitialData عند التغيير)
  useEffect(() => {
    if (!assistant) return;
    const ticketsChannel = supabase
      .channel('assistant-support-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `assigned_to=eq.${assistant.id}` }, 
        () => fetchInitialData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
    };
  }, [assistant, fetchInitialData]);

  const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <AssistantLayout>
      <div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /></div>
    </AssistantLayout>
  );

  return (
    <AssistantLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} p-4 md:p-6`}>
        <div className="max-w-7xl mx-auto">
          {/* الهيدر */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col md:flex-row md:items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent">
                🛡️ مركز الدعم المتكامل
              </h1>
              <p className={`${styles.subtext} text-sm mt-1`}>إدارة الشكاوى والأسئلة – كل شيء في مكان واحد</p>
            </div>
            <div className="flex gap-3 mt-3 md:mt-0">
              <button onClick={fetchInitialData} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}><Icons.RefreshCw className="h-5 w-5" /></button>
              <button onClick={() => router.push('/dashboard/assistant')} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm">العودة للوحة التحكم</button>
            </div>
          </motion.div>

          {/* إحصائيات متقدمة */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={Icons.Wrench} label="شكاوى فنية مفتوحة" value={stats.technicalOpen} color="from-red-400 to-orange-600" styles={styles} delay={0} />
            <StatCard icon={Icons.BookOpen} label="أسئلة أكاديمية مفتوحة" value={stats.academicOpen} color="from-blue-400 to-indigo-600" styles={styles} delay={0.1} />
            <StatCard icon={Icons.Clock} label="متوسط الرد (ساعة)" value={stats.avgResponseHours} color="from-green-400 to-emerald-600" styles={styles} delay={0.2} />
            <StatCard icon={Icons.CheckCircle} label="تم حلها اليوم" value={stats.resolvedToday} color="from-purple-400 to-violet-600" styles={styles} delay={0.3} />
          </div>

          {/* بطاقات الأقسام الرئيسية */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <Link href="/dashboard/assistant/support/technical" className={`group relative overflow-hidden rounded-2xl p-6 ${styles.card} border ${styles.border} hover:border-red-400/50 transition-all duration-500`}>
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-orange-600/10 opacity-0 group-hover:opacity-100 transition" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-red-400 to-orange-600"><Icons.Wrench className="h-8 w-8 text-white" /></div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">الشكاوى الفنية</h2>
                  <p className={`text-sm ${styles.subtext} mt-1`}>مشاكل تقنية (فيديو، امتحان، تصفح)</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-red-400">{stats.technicalOpen} مفتوحة</span>
                    <span className="text-xs text-gray-500">|</span>
                    <span className="text-xs text-gray-400">{technicalTickets.length} إجمالي</span>
                  </div>
                </div>
                <Icons.ArrowLeft className="h-6 w-6 text-gray-400 group-hover:translate-x-1 transition" />
              </div>
            </Link>

            <Link href="/dashboard/assistant/support/academic" className={`group relative overflow-hidden rounded-2xl p-6 ${styles.card} border ${styles.border} hover:border-blue-400/50 transition-all duration-500`}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-indigo-600/10 opacity-0 group-hover:opacity-100 transition" />
              <div className="relative z-10 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600"><Icons.BookOpen className="h-8 w-8 text-white" /></div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold">الأسئلة الأكاديمية</h2>
                  <p className={`text-sm ${styles.subtext} mt-1`}>استفسارات حول المنهج</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-bold text-blue-400">{stats.academicOpen} مفتوحة</span>
                    <span className="text-xs text-gray-500">|</span>
                    <span className="text-xs text-gray-400">{academicTickets.length} إجمالي</span>
                  </div>
                </div>
                <Icons.ArrowLeft className="h-6 w-6 text-gray-400 group-hover:translate-x-1 transition" />
              </div>
            </Link>
          </div>

          {/* آخر الشكاوى والأسئلة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold ${styles.text} flex items-center gap-2`}><Icons.AlertTriangle className="h-5 w-5 text-red-400" /> شكاوى فنية</h3>
                <Link href="/dashboard/assistant/support/technical" className="text-xs text-yellow-400">عرض الكل</Link>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {technicalTickets.slice(0, 5).map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-2 hover:bg-white/5 rounded-lg text-sm`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.subject}</p>
                      <p className={`text-xs ${styles.subtext}`}>{t.student?.full_name} • {formatDate(t.created_at)}</p>
                    </div>
                    <Link href={`/dashboard/assistant/support/${t.id}`} className="text-yellow-400 text-xs ml-2">رد</Link>
                  </div>
                ))}
                {technicalTickets.length === 0 && <p className={`text-xs ${styles.subtext} text-center py-4`}>لا توجد شكاوى</p>}
              </div>
            </div>

            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-bold ${styles.text} flex items-center gap-2`}><Icons.MessageCircle className="h-5 w-5 text-blue-400" /> أسئلة أكاديمية</h3>
                <Link href="/dashboard/assistant/support/academic" className="text-xs text-yellow-400">عرض الكل</Link>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {academicTickets.slice(0, 5).map(t => (
                  <div key={t.id} className={`flex items-center justify-between p-2 hover:bg-white/5 rounded-lg text-sm`}>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.subject}</p>
                      <p className={`text-xs ${styles.subtext}`}>{t.student?.full_name} • {formatDate(t.created_at)}</p>
                    </div>
                    <Link href={`/dashboard/assistant/support/${t.id}`} className="text-yellow-400 text-xs ml-2">رد</Link>
                  </div>
                ))}
                {academicTickets.length === 0 && <p className={`text-xs ${styles.subtext} text-center py-4`}>لا توجد أسئلة</p>}
              </div>
            </div>
          </div>

          {/* أزرار سريعة */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <Link href="/dashboard/assistant/announcements" className={`flex items-center gap-2 p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-yellow-400/50 transition text-sm`}>
              <Icons.Megaphone className="h-5 w-5 text-yellow-400" /> الإعلانات
            </Link>
            <Link href="/dashboard/assistant/messages" className={`flex items-center gap-2 p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-yellow-400/50 transition text-sm`}>
              <Icons.Mail className="h-5 w-5 text-blue-400" /> المراسلات
            </Link>
            <Link href="/dashboard/assistant/notes" className={`flex items-center gap-2 p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-yellow-400/50 transition text-sm`}>
              <Icons.StickyNote className="h-5 w-5 text-purple-400" /> الملاحظات
            </Link>
            <Link href="/dashboard/assistant" className={`flex items-center gap-2 p-3 rounded-xl ${styles.card} border ${styles.border} hover:border-yellow-400/50 transition text-sm`}>
              <Icons.LayoutDashboard className="h-5 w-5 text-green-400" /> لوحة التحكم
            </Link>
          </div>
        </div>
      </div>
    </AssistantLayout>
  );
}