'use client';

// ================================================================
// 🛠️ المسار: app/dashboard/teacher/support/technical/page.js
// قائمة الشكاوى الفنية للمعلم – النسخة المتطورة V4.0
// ================================================================
// الميزات:
// - عرض كل الشكاوى الفنية مع فلترة متقدمة (حالة، أولوية، كورس، بحث).
// - إحصائيات حية: عدد الشكاوى المفتوحة، المعلقة، المحلولة.
// - إجراءات سريعة لكل شكوى: تغيير الحالة، رد، حظر/فك حظر، حذف.
// - تنبيه منبثق لتأكيد الحظر/الحذف.
// - دعم Realtime (تحديث مباشر عند تغير البيانات).
// - عرض الطالب المحظور بوضوح.
// - روابط سريعة لملف الطالب والمراسلة.
// - تصميم متجاوب مع الثيم الفاتح والداكن.
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { getCachedAssistantPermissions, hasPermission } from '@/lib/permissions';

// ----- useTheme محلي -----
const useTheme = () => {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('teacherTechTheme') || 'dark'; } catch { return 'dark'; } });
  useEffect(() => { localStorage.setItem('teacherTechTheme', theme); document.documentElement.className = theme; }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const styles = {
    dark: { bg: 'bg-[#0b0e1a]', text: 'text-white', subtext: 'text-gray-300', card: 'bg-white/5 backdrop-blur-sm border-white/10', input: 'bg-white/10 border-white/20 text-white placeholder-gray-300', hover: 'hover:border-yellow-400/50', border: 'border-white/10' },
    light: { bg: 'bg-gray-50', text: 'text-gray-900', subtext: 'text-gray-700', card: 'bg-white/90 backdrop-blur-sm border-gray-200', input: 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400', hover: 'hover:border-yellow-400/70', border: 'border-gray-200' },
  };
  return { theme, toggleTheme, styles: styles[theme] };
};

// ----- ثوابت الحالات والأولويات -----
const STATUS_MAP = {
  open: { label: 'مفتوحة', color: 'text-red-400', bg: 'bg-red-400/10', border: 'border-red-400/20' },
  in_progress: { label: 'قيد المعالجة', color: 'text-yellow-400', bg: 'bg-yellow-400/10', border: 'border-yellow-400/20' },
  resolved: { label: 'محلولة', color: 'text-green-400', bg: 'bg-green-400/10', border: 'border-green-400/20' },
  closed: { label: 'مغلقة', color: 'text-gray-400', bg: 'bg-gray-400/10', border: 'border-gray-400/20' },
};

const PRIORITY_MAP = {
  low: { label: 'منخفضة', color: 'text-blue-400' },
  medium: { label: 'متوسطة', color: 'text-yellow-400' },
  high: { label: 'عالية', color: 'text-orange-400' },
  urgent: { label: 'عاجلة', color: 'text-red-400' },
};

export default function TechnicalComplaintsPage() {
  const router = useRouter();
  const { theme, toggleTheme, styles } = useTheme();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [courses, setCourses] = useState([]);
  const [permissions, setPermissions] = useState(null);
  const [isAssistant, setIsAssistant] = useState(false);

  // فلترة وبحث
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // مودال التأكيد (حظر / حذف)
  const [confirmModal, setConfirmModal] = useState(null); // { type, id, title }

  // ----- جلب البيانات -----
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const perms = await getCachedAssistantPermissions(u.id);
      if (perms !== null) { setIsAssistant(true); setPermissions(perms); }
      else setIsAssistant(false);

      if (isAssistant && !hasPermission(perms, 'tickets', 'can_view')) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // جلب الشكاوى الفنية
      const { data: ticketData, error } = await supabase
        .from('tickets')
        .select('*, student:profiles!tickets_student_id_fkey(full_name, email), course:courses(title)')
        .eq('assigned_to', u.id)
        .eq('support_type', 'technical')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // جلب قائمة المحظورين
      const { data: bans } = await supabase.from('support_bans')
        .select('student_id')
        .eq('teacher_id', u.id)
        .is('unbanned_at', null);
      const bannedIds = new Set((bans || []).map(b => b.student_id));

      const processed = (ticketData || []).map(t => ({
        ...t,
        is_banned: bannedIds.has(t.student_id),
      }));
      setComplaints(processed);

      // الكورسات للفلترة
      const { data: courseData } = await supabase.from('courses').select('id, title').eq('teacher_id', u.id);
      setCourses(courseData || []);

    } catch (err) {
      console.error(err);
      toast.error('فشل جلب الشكاوى');
    } finally {
      setLoading(false);
    }
  }, [router, isAssistant, permissions]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('tech-complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `assigned_to=eq.${user.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchData]);

  // ----- إجراءات -----
  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase.from('tickets').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { toast.error('فشل تغيير الحالة'); return; }
    toast.success('تم تحديث الحالة');
    fetchData();
  };

  const handleToggleBan = async (complaint) => {
    const studentId = complaint.student_id;
    const isBanned = complaint.is_banned;
    if (isBanned) {
      const { error } = await supabase.from('support_bans')
        .update({ unbanned_at: new Date().toISOString() })
        .eq('teacher_id', user.id).eq('student_id', studentId).is('unbanned_at', null);
      if (error) { toast.error('فشل فك الحظر'); return; }
      toast.success('تم فك الحظر');
    } else {
      const { error } = await supabase.from('support_bans')
        .insert({ teacher_id: user.id, student_id: studentId });
      if (error) { toast.error('فشل الحظر'); return; }
      toast.success('تم حظر الطالب');
    }
    fetchData();
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from('tickets').delete().eq('id', id);
    if (error) { toast.error('فشل الحذف'); return; }
    toast.success('تم حذف الشكوى');
    fetchData();
  };

  const confirmAction = (type, id, title) => {
    setConfirmModal({ type, id, title });
  };

  // ----- فلترة وبحث -----
  const filteredComplaints = useMemo(() => {
    let result = complaints;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c => c.subject?.toLowerCase().includes(q) || c.student?.full_name?.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') result = result.filter(c => c.status === filterStatus);
    if (filterPriority !== 'all') result = result.filter(c => c.priority === filterPriority);
    if (filterCourse !== 'all') result = result.filter(c => c.course_id === filterCourse);

    // ترتيب
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'priority') {
      const order = { urgent: 0, high: 1, medium: 2, low: 3 };
      result.sort((a, b) => (order[a.priority] || 2) - (order[b.priority] || 2));
    }
    return result;
  }, [complaints, search, filterStatus, filterPriority, filterCourse, sortBy]);

  const stats = useMemo(() => {
    const open = complaints.filter(c => c.status === 'open').length;
    const inProgress = complaints.filter(c => c.status === 'in_progress').length;
    const resolved = complaints.filter(c => c.status === 'resolved' || c.status === 'closed').length;
    return { total: complaints.length, open, inProgress, resolved };
  }, [complaints]);

  const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <TeacherLayout><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /></div></TeacherLayout>
  );

  return (
    <TeacherLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} p-4 md:p-6`}>
        <div className="max-w-7xl mx-auto">
          {/* الهيدر */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
                🛠️ الشكاوى الفنية
              </h1>
              <p className={`${styles.subtext} text-sm mt-1`}>إدارة المشكلات التقنية الواردة من الطلاب</p>
            </div>
            <div className="flex gap-3 mt-3 md:mt-0">
              <button onClick={toggleTheme} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}>{theme === 'dark' ? <Icons.Sun className="h-5 w-5 text-yellow-400" /> : <Icons.Moon className="h-5 w-5 text-gray-600" />}</button>
              <button onClick={fetchData} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}><Icons.RefreshCw className="h-5 w-5" /></button>
              {isAssistant && <button onClick={() => router.push('/dashboard/assistant')} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm">العودة للوحة التحكم</button>}
            </div>
          </div>

          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'الإجمالي', value: stats.total, icon: Icons.Ticket, color: 'text-blue-400' },
              { label: 'مفتوحة', value: stats.open, icon: Icons.AlertCircle, color: 'text-red-400' },
              { label: 'قيد المعالجة', value: stats.inProgress, icon: Icons.Clock, color: 'text-yellow-400' },
              { label: 'محلولة', value: stats.resolved, icon: Icons.CheckCircle, color: 'text-green-400' },
            ].map((s, idx) => (
              <div key={idx} className={`${styles.card} border ${styles.border} rounded-xl p-3 flex items-center gap-2`}>
                <s.icon className={`h-5 w-5 ${s.color}`} />
                <div><p className="text-lg font-bold">{s.value}</p><p className="text-xs text-gray-400">{s.label}</p></div>
              </div>
            ))}
          </div>

          {/* فلترة وبحث */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن طالب أو موضوع..." className={`w-full p-2.5 pr-10 ${styles.input} border ${styles.border} rounded-xl`} />
            </div>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
              <option value="all">جميع الحالات</option>
              <option value="open">مفتوحة</option><option value="in_progress">قيد المعالجة</option>
              <option value="resolved">محلولة</option><option value="closed">مغلقة</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
              <option value="all">جميع الأولويات</option>
              <option value="low">منخفضة</option><option value="medium">متوسطة</option>
              <option value="high">عالية</option><option value="urgent">عاجلة</option>
            </select>
            <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
              <option value="all">جميع الكورسات</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
              <option value="newest">الأحدث</option><option value="oldest">الأقدم</option><option value="priority">الأولوية</option>
            </select>
          </div>

          {/* قائمة الشكاوى */}
          {filteredComplaints.length === 0 ? (
            <div className="text-center py-20"><Icons.Wrench className="h-16 w-16 text-gray-500 mx-auto mb-4" /><p className="text-lg">لا توجد شكاوى فنية</p></div>
          ) : (
            <div className="space-y-3">
              {filteredComplaints.map(complaint => {
                const statusInfo = STATUS_MAP[complaint.status];
                const priorityInfo = PRIORITY_MAP[complaint.priority];
                return (
                  <motion.div key={complaint.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} whileHover={{ y: -2 }}
                    className={`${styles.card} border ${styles.border} rounded-2xl p-4 transition cursor-pointer`}
                    onClick={() => router.push(`/dashboard/teacher/support/${complaint.id}`)}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>{statusInfo.label}</span>
                          <span className={`text-[10px] ${priorityInfo.color}`}>{priorityInfo.label}</span>
                          {complaint.is_banned && <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full">محظور</span>}
                          <span className="text-[10px] text-gray-500">{formatDate(complaint.created_at)}</span>
                        </div>
                        <p className="font-bold truncate">{complaint.subject}</p>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className={styles.subtext}><Icons.User className="h-3 w-3 inline ml-1" />{complaint.student?.full_name}</span>
                          {complaint.course?.title && <span className={styles.subtext}><Icons.Book className="h-3 w-3 inline ml-1" />{complaint.course.title}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {/* تغيير الحالة سريع */}
                        {(!isAssistant || hasPermission(permissions, 'tickets', 'can_edit')) && (
                          <select value={complaint.status} onChange={e => handleStatusChange(complaint.id, e.target.value)}
                            className={`text-xs p-1.5 ${styles.input} border ${styles.border} rounded-lg`}>
                            <option value="open">مفتوحة</option><option value="in_progress">قيد المعالجة</option>
                            <option value="resolved">محلولة</option><option value="closed">مغلقة</option>
                          </select>
                        )}
                        {/* حظر / فك حظر */}
                        {!isAssistant && (
                          <button onClick={() => confirmAction(complaint.is_banned ? 'unban' : 'ban', complaint.id, complaint.subject)}
                            className={`text-xs px-3 py-1.5 rounded-lg ${complaint.is_banned ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            {complaint.is_banned ? 'فك الحظر' : 'حظر'}
                          </button>
                        )}
                        {/* حذف */}
                        {(!isAssistant || hasPermission(permissions, 'tickets', 'can_delete')) && (
                          <button onClick={() => confirmAction('delete', complaint.id, complaint.subject)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400"><Icons.Trash2 className="h-4 w-4" /></button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* مودال تأكيد */}
      <AnimatePresence>
        {confirmModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className={`${styles.card} border ${styles.border} rounded-2xl p-6 max-w-md w-full mx-4`} onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">
                {confirmModal.type === 'delete' ? 'حذف الشكوى' : confirmModal.type === 'ban' ? 'حظر الطالب' : 'فك الحظر'}
              </h3>
              <p className="text-sm mb-4">{confirmModal.type === 'delete' ? 'هل أنت متأكد من حذف هذه الشكوى نهائياً؟' : confirmModal.type === 'ban' ? 'سيتم منع الطالب من إرسال شكاوى وأسئلة جديدة.' : 'سيتم السماح للطالب بإرسال الشكاوى والأسئلة مرة أخرى.'}</p>
              <div className="flex gap-3">
                <button onClick={() => {
                  if (confirmModal.type === 'delete') handleDelete(confirmModal.id);
                  else if (confirmModal.type === 'ban') handleToggleBan(complaints.find(c => c.id === confirmModal.id));
                  else if (confirmModal.type === 'unban') handleToggleBan(complaints.find(c => c.id === confirmModal.id));
                  setConfirmModal(null);
                }} className="flex-1 py-2 bg-red-500 text-white rounded-lg">تأكيد</button>
                <button onClick={() => setConfirmModal(null)} className="flex-1 py-2 bg-gray-500/20 rounded-lg">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TeacherLayout>
  );
}