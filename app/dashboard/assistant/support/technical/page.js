'use client';

// ================================================================
// 🛠️ المسار: app/dashboard/assistant/support/technical/page.js
// قائمة الشكاوى الفنية للمساعد – النسخة المتطورة V4.0
// ================================================================

import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { hasPermission } from '@/lib/permissions';
import { useTheme } from '@/lib/hooks/useTheme';

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

export default function AssistantTechnicalComplaintsPage() {
  const router = useRouter();
  const { theme, styles } = useTheme();
  const [assistant, setAssistant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [courses, setCourses] = useState([]);
  const [permissions, setPermissions] = useState([]);

  // فلترة وبحث
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // مودال التأكيد (حذف فقط)
  const [confirmModal, setConfirmModal] = useState(null);

  // ----- جلب البيانات باستخدام الـ API الجديد -----
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

      // جلب الشكاوى الفنية
      const res = await fetch('/api/assistant/support?type=technical', {
        headers: { 'x-assistant-id': assistantData.id },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'فشل جلب الشكاوى');
      }
      const data = await res.json();
      if (!data.success) throw new Error('فشل جلب الشكاوى');

      setComplaints(data.tickets || []);

      // جلب الكورسات للفلترة
      if (assistantData.teacher_id) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('teacher_id', assistantData.teacher_id);
        setCourses(courseData || []);
      }

    } catch (err) {
      console.error(err);
      toast.error(err.message || 'فشل جلب الشكاوى');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!assistant) return;
    const channel = supabase
      .channel('assistant-tech-complaints')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets', filter: `assigned_to=eq.${assistant.id}` }, () => fetchData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [assistant, fetchData]);

  // ----- إجراءات -----
  const handleStatusChange = async (id, newStatus) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) { toast.error('فشل تغيير الحالة'); return; }
    toast.success('تم تحديث الحالة');
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
    <AssistantLayout><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /></div></AssistantLayout>
  );

  return (
    <AssistantLayout>
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
              <button onClick={fetchData} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}><Icons.RefreshCw className="h-5 w-5" /></button>
              <button onClick={() => router.push('/dashboard/assistant')} className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-xl text-sm">العودة للوحة التحكم</button>
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
                    onClick={() => router.push(`/dashboard/assistant/support/${complaint.id}`)}>
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full border ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border}`}>{statusInfo.label}</span>
                          <span className={`text-[10px] ${priorityInfo.color}`}>{priorityInfo.label}</span>
                          <span className="text-[10px] text-gray-500">{formatDate(complaint.created_at)}</span>
                        </div>
                        <p className="font-bold truncate">{complaint.subject}</p>
                        <div className="flex items-center gap-3 text-xs mt-1">
                          <span className={styles.subtext}><Icons.User className="h-3 w-3 inline ml-1" />{complaint.student?.full_name}</span>
                          {complaint.course?.title && <span className={styles.subtext}><Icons.Book className="h-3 w-3 inline ml-1" />{complaint.course.title}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {(!assistant || hasPermission(permissions, 'tickets', 'can_edit') || hasPermission(permissions, 'support', 'can_edit')) && (
                          <select value={complaint.status} onChange={e => handleStatusChange(complaint.id, e.target.value)}
                            className={`text-xs p-1.5 ${styles.input} border ${styles.border} rounded-lg`}>
                            <option value="open">مفتوحة</option><option value="in_progress">قيد المعالجة</option>
                            <option value="resolved">محلولة</option><option value="closed">مغلقة</option>
                          </select>
                        )}
                        {(!assistant || hasPermission(permissions, 'tickets', 'can_delete') || hasPermission(permissions, 'support', 'can_delete')) && (
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

      {/* مودال تأكيد الحذف فقط */}
      <AnimatePresence>
        {confirmModal && confirmModal.type === 'delete' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmModal(null)}>
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
              className={`${styles.card} border ${styles.border} rounded-2xl p-6 max-w-md w-full mx-4`} onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold mb-2">حذف الشكوى</h3>
              <p className="text-sm mb-4">هل أنت متأكد من حذف هذه الشكوى نهائياً؟</p>
              <div className="flex gap-3">
                <button onClick={() => { handleDelete(confirmModal.id); setConfirmModal(null); }} className="flex-1 py-2 bg-red-500 text-white rounded-lg">تأكيد</button>
                <button onClick={() => setConfirmModal(null)} className="flex-1 py-2 bg-gray-500/20 rounded-lg">إلغاء</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </AssistantLayout>
  );
}