'use client';

// ================================================================
// 📁 app/dashboard/assistant/support/page.js
// ✅ النسخة المحسّنة – تبويبات، عرض اسم المساعد، فلترة متقدمة
// ================================================================
import React from 'react';

import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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

// ===== مكون التذكرة في القائمة =====
const TicketCard = ({ ticket, assistantId, styles }) => {
  const statusMap = {
    open: { label: 'مفتوحة', color: 'text-red-400', bg: 'bg-red-400/10' },
    in_progress: { label: 'قيد المعالجة', color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    resolved: { label: 'محلولة', color: 'text-green-400', bg: 'bg-green-400/10' },
    closed: { label: 'مغلقة', color: 'text-gray-400', bg: 'bg-gray-400/10' },
  };
  const priorityMap = {
    low: { label: 'منخفضة', color: 'text-blue-400' },
    medium: { label: 'متوسطة', color: 'text-yellow-400' },
    high: { label: 'عالية', color: 'text-orange-400' },
    urgent: { label: 'عاجلة', color: 'text-red-400' },
  };
  const status = statusMap[ticket.status] || statusMap.open;
  const priority = priorityMap[ticket.priority] || priorityMap.medium;

  const isAssignedToMe = ticket.assigned_to === assistantId;
  const isUnassigned = ticket.assigned_to === null;
  const assignedName = ticket.assigned_to_name || (isUnassigned ? 'غير مخصصة' : 'مساعد آخر');

  return (
    <Link href={`/dashboard/assistant/support/${ticket.id}`}>
      <motion.div whileHover={{ scale: 1.01 }} className={`p-4 rounded-xl ${styles.card} border ${styles.border} hover:border-yellow-400/40 transition-all cursor-pointer`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>{status.label}</span>
              <span className={`text-xs ${priority.color}`}>{priority.label}</span>
              <span className={`text-xs ${styles.subtext}`}>
                {ticket.support_type === 'technical' ? '🛠️ فنية' : '📚 أكاديمية'}
              </span>
              {isAssignedToMe && <span className="text-[10px] bg-blue-400/20 text-blue-400 px-2 py-0.5 rounded-full">مخصصة لي</span>}
              {isUnassigned && <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full">غير مخصصة</span>}
            </div>
            <h3 className={`font-bold ${styles.text} text-sm mt-1 truncate`}>{ticket.subject}</h3>
            <p className={`text-xs ${styles.subtext} truncate`}>
              {ticket.student?.full_name} • {new Date(ticket.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
            <div className="flex items-center gap-3 mt-1 text-xs">
              <span className={styles.subtext}>
                <Icons.User className="inline h-3 w-3 ml-1" />
                المساعد: {assignedName}
              </span>
              {/* ✅ جديد: عدد الردود */}
              <span className={styles.subtext}>
                <Icons.MessageCircle className="inline h-3 w-3 ml-1" />
                {ticket.reply_count || 0}
              </span>
            </div>
          </div>
          <Icons.ArrowLeft className="h-5 w-5 text-gray-400" />
        </div>
      </motion.div>
    </Link>
  );
};

export default function AssistantSupportHubPage() {
  const router = useRouter();
  const { theme, styles } = useTheme();
  const [assistant, setAssistant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState([]);
  const [allTickets, setAllTickets] = useState([]);
  const [stats, setStats] = useState({
    open: 0,
    inProgress: 0,
    resolved: 0,
    unassigned: 0,
    assignedToMe: 0,
    total: 0,
  });

  // ✅ جديد: حالة التبويب المختار والفلترة
  const [activeTab, setActiveTab] = useState('all'); // 'all', 'assignedToMe', 'unassigned', 'closed'
  const [filterType, setFilterType] = useState('all'); // 'all', 'technical', 'academic'
  const [searchTerm, setSearchTerm] = useState('');

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
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
      const permsRes = await fetch('/api/assistant-data', {
        headers: { 'x-assistant-id': assistantData.id },
      });
      const permsData = await permsRes.json();
      let perms = [];
      if (permsRes.ok && permsData.success) {
        perms = permsData.permissions || [];
        sessionStorage.setItem('assistantPermissions', JSON.stringify(perms));
      }
      setPermissions(perms);

      const canView = hasPermission(perms, 'tickets', 'can_view') || hasPermission(perms, 'support', 'can_view');
      if (!canView) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // جلب جميع التذاكر عبر API المعدل
      const res = await fetch('/api/assistant/support', {
        headers: { 'x-assistant-id': assistantData.id },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'فشل جلب البيانات');
      }
      const data = await res.json();
      if (!data.success) throw new Error('فشل جلب البيانات');

      const tickets = data.tickets || [];
      setAllTickets(tickets);

      // تحديث الإحصائيات من الـ API
      if (data.stats) {
        setStats(data.stats);
      } else {
        // حساب يدوي إذا لم تأتِ الإحصائيات
        const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
        const inProgress = tickets.filter(t => t.status === 'in_progress').length;
        const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
        const unassigned = tickets.filter(t => t.assigned_to === null).length;
        const assignedToMe = tickets.filter(t => t.assigned_to === assistantData.id).length;
        setStats({ open, inProgress, resolved, unassigned, assignedToMe, total: tickets.length });
      }

    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(err.message || 'فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime اشتراك
  useEffect(() => {
    if (!assistant) return;
    const ticketsChannel = supabase
      .channel('assistant-support-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(ticketsChannel);
    };
  }, [assistant, fetchData]);

  // ===== فلترة التذاكر حسب التبويب والنوع والبحث =====
  const filteredTickets = useMemo(() => {
    let filtered = allTickets;

    // فلترة حسب التبويب
    if (activeTab === 'assignedToMe') {
      filtered = filtered.filter(t => t.assigned_to === assistant?.id);
    } else if (activeTab === 'unassigned') {
      filtered = filtered.filter(t => t.assigned_to === null);
    } else if (activeTab === 'closed') {
      filtered = filtered.filter(t => t.status === 'closed' || t.status === 'resolved');
    } else {
      // 'all' – نعرض الكل باستثناء المغلقة (اختياري) – لكننا نتركها حسب التبويب
      // سنعرض الكل، لكن يمكن إضافة خيار إظهار المغلقة.
    }

    // فلترة حسب النوع
    if (filterType !== 'all') {
      filtered = filtered.filter(t => t.support_type === filterType);
    }

    // فلترة حسب البحث (في الموضوع أو اسم الطالب)
    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(t =>
        t.subject?.toLowerCase().includes(term) ||
        t.student?.full_name?.toLowerCase().includes(term) ||
        t.description?.toLowerCase().includes(term)
      );
    }

    // ترتيب: الأولوية العالية أولاً، ثم الأحدث
    const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
    filtered.sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    return filtered;
  }, [allTickets, activeTab, filterType, searchTerm, assistant]);

  // ===== عرض محتوى التبويب =====
  const renderTickets = () => {
    if (filteredTickets.length === 0) {
      return (
        <div className={`text-center py-12 ${styles.subtext}`}>
          <Icons.Ticket className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>لا توجد تذاكر تطابق الفلترة</p>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        {filteredTickets.map(ticket => (
          <TicketCard key={ticket.id} ticket={ticket} assistantId={assistant?.id} styles={styles} />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <AssistantLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </AssistantLayout>
    );
  }

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
              <p className={`${styles.subtext} text-sm mt-1`}>جميع التذاكر – شفافية كاملة بين المساعدين</p>
            </div>
            <div className="flex gap-3 mt-3 md:mt-0">
              <button onClick={fetchData} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}>
                <Icons.RefreshCw className="h-5 w-5" />
              </button>
              <button onClick={() => router.push('/dashboard/assistant')} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm">
                العودة للوحة التحكم
              </button>
            </div>
          </motion.div>

          {/* إحصائيات متقدمة */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <StatCard icon={Icons.Inbox} label="جميع التذاكر" value={stats.total || 0} color="from-gray-400 to-gray-600" styles={styles} delay={0} />
            <StatCard icon={Icons.Clock} label="مفتوحة" value={stats.open || 0} color="from-yellow-400 to-amber-600" styles={styles} delay={0.1} />
            <StatCard icon={Icons.User} label="مخصصة لي" value={stats.assignedToMe || 0} color="from-blue-400 to-indigo-600" styles={styles} delay={0.15} />
            <StatCard icon={Icons.Inbox} label="غير مخصصة" value={stats.unassigned || 0} color="from-green-400 to-emerald-600" styles={styles} delay={0.2} />
            <StatCard icon={Icons.CheckCircle} label="محلولة/مغلقة" value={stats.resolved || 0} color="from-purple-400 to-violet-600" styles={styles} delay={0.3} />
          </div>

          {/* ✅ جديد: شريط التبويبات والفلترة */}
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 mb-6`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-4 py-2 rounded-xl text-sm transition ${activeTab === 'all' ? 'bg-yellow-400/20 text-yellow-400' : `${styles.subtext} hover:bg-white/5`}`}
                >
                  <Icons.List className="inline h-4 w-4 ml-1" /> الكل
                </button>
                <button
                  onClick={() => setActiveTab('assignedToMe')}
                  className={`px-4 py-2 rounded-xl text-sm transition ${activeTab === 'assignedToMe' ? 'bg-blue-400/20 text-blue-400' : `${styles.subtext} hover:bg-white/5`}`}
                >
                  <Icons.User className="inline h-4 w-4 ml-1" /> مخصصة لي
                </button>
                <button
                  onClick={() => setActiveTab('unassigned')}
                  className={`px-4 py-2 rounded-xl text-sm transition ${activeTab === 'unassigned' ? 'bg-green-400/20 text-green-400' : `${styles.subtext} hover:bg-white/5`}`}
                >
                  <Icons.Inbox className="inline h-4 w-4 ml-1" /> غير مخصصة
                </button>
                <button
                  onClick={() => setActiveTab('closed')}
                  className={`px-4 py-2 rounded-xl text-sm transition ${activeTab === 'closed' ? 'bg-gray-400/20 text-gray-400' : `${styles.subtext} hover:bg-white/5`}`}
                >
                  <Icons.CheckCircle className="inline h-4 w-4 ml-1" /> مغلقة
                </button>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={`px-3 py-2 ${styles.input} border ${styles.border} rounded-xl text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none`}
                >
                  <option value="all">الكل</option>
                  <option value="technical">فنية</option>
                  <option value="academic">أكاديمية</option>
                </select>
                <div className="relative">
                  <Icons.Search className="absolute right-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="بحث..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={`pr-10 pl-3 py-2 ${styles.input} border ${styles.border} rounded-xl text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none w-40 md:w-56`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* قائمة التذاكر المفلترة */}
          <div className="space-y-3">
            {renderTickets()}
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