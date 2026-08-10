'use client';

// ================================================================
// 💬 المسار: app/dashboard/assistant/support/[id]/page.js
// صفحة تفاصيل الدعم – المحادثة الكاملة مع إجراءات المساعد
// ✅ النسخة المعدلة – تسمح بالوصول للتذاكر المعينة للمعلم
// ================================================================

import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
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

export default function AssistantSupportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id;
  const { theme, styles } = useTheme();

  const [assistant, setAssistant] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const messagesEndRef = useRef(null);

  // ----- جلب البيانات -----
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

      // جلب التذكرة المحددة عبر API
      const res = await fetch(`/api/assistant/support?id=${ticketId}`, {
        headers: { 'x-assistant-id': assistantData.id },
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'فشل جلب التذكرة');
      }
      const data = await res.json();
      if (!data.success) throw new Error('فشل جلب التذكرة');

      const ticketsArray = data.tickets || [];
      if (ticketsArray.length === 0) {
        throw new Error('التذكرة غير موجودة');
      }
      const ticketData = ticketsArray[0];
      
      // ✅ التحقق الموسع للصلاحية:
      // - إذا كانت التذكرة معينة للمساعد نفسه (assigned_to = assistant.id)
      // - أو غير معينة (assigned_to = null)
      // - أو معينة للمعلم الذي يتبعه المساعد (assigned_to = assistant.teacher_id)
      const isAssignedToAssistant = ticketData.assigned_to === assistantData.id;
      const isUnassigned = ticketData.assigned_to === null;
      const isAssignedToTeacher = ticketData.assigned_to === assistantData.teacher_id;

      if (!isAssignedToAssistant && !isUnassigned && !isAssignedToTeacher) {
        toast.error('غير مصرح لك بمشاهدة هذه التذكرة');
        router.push('/dashboard/assistant/support');
        return;
      }

      setTicket(ticketData);

      // جلب الردود
      const { data: repliesData, error: repliesError } = await supabase
        .from('ticket_replies')
        .select('*, sender:profiles(full_name)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      if (repliesError) {
        console.error('Replies error:', repliesError);
      } else {
        setReplies(repliesData || []);
      }

    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(err.message || 'فشل تحميل التفاصيل');
    } finally {
      setLoading(false);
    }
  }, [ticketId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime للردود
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`assistant-ticket-detail-${ticketId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_replies', filter: `ticket_id=eq.${ticketId}` }, (payload) => {
        const newReply = payload.new;
        supabase.from('profiles').select('full_name').eq('id', newReply.sender_id).single().then(({ data }) => {
          setReplies(prev => [...prev, { ...newReply, sender: data }]);
          setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  // ----- إجراءات -----
  // ✅ تم تعديل هذه الدالة لاستخدام API بدلاً من الكتابة المباشرة
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!newReply.trim() || !assistant) return;
    setSending(true);
    try {
      // استدعاء API بدلاً من الكتابة المباشرة
      const res = await fetch('/api/assistant/support/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assistant-id': assistant.id,
        },
        body: JSON.stringify({
          ticketId: ticketId,
          message: newReply.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشل إرسال الرد');
      }

      // تحديث الواجهة بإضافة الرد الجديد
      if (data.reply) {
        // جلب اسم المرسل (المساعد)
        const senderName = assistant.display_name || assistant.full_name || 'مساعد';
        const newReplyObj = {
          ...data.reply,
          sender: { full_name: senderName },
        };
        setReplies(prev => [...prev, newReplyObj]);
        // تحديث حالة التذكرة إذا تغيرت
        if (ticket.status === 'open') {
          setTicket(prev => ({ ...prev, status: 'in_progress' }));
        }
      }

      setNewReply('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      toast.success('تم إرسال الرد بنجاح');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'فشل إرسال الرد');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setUpdating(true);
    const { error } = await supabase.from('tickets').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', ticketId);
    if (!error) setTicket(prev => ({ ...prev, status: newStatus }));
    else toast.error('فشل تغيير الحالة');
    setUpdating(false);
  };

  const handlePriorityChange = async (newPriority) => {
    setUpdating(true);
    const { error } = await supabase.from('tickets').update({ priority: newPriority, updated_at: new Date().toISOString() }).eq('id', ticketId);
    if (!error) setTicket(prev => ({ ...prev, priority: newPriority }));
    else toast.error('فشل تغيير الأولوية');
    setUpdating(false);
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه التذكرة نهائياً؟')) return;
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (error) { toast.error('فشل الحذف'); return; }
    toast.success('تم حذف التذكرة');
    router.push('/dashboard/assistant/support');
  };

  const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) return (
    <AssistantLayout><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /></div></AssistantLayout>
  );

  if (!ticket) return null;

  const statusInfo = STATUS_MAP[ticket.status];
  const priorityInfo = PRIORITY_MAP[ticket.priority];

  return (
    <AssistantLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} flex flex-col`} dir="rtl">
        {/* الهيدر */}
        <div className={`sticky top-0 z-20 ${styles.card} border-b ${styles.border} backdrop-blur-md px-4 py-3 flex items-center gap-3`}>
          <button onClick={() => router.push('/dashboard/assistant/support')} className={`p-2 rounded-xl hover:bg-white/5 ${styles.subtext}`}><Icons.ArrowRight className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-sm font-bold truncate ${styles.text}`}>{ticket.subject}</h1>
            <div className="flex items-center gap-2 text-[10px] mt-0.5">
              <span className={`px-1.5 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>{statusInfo.label}</span>
              <span className={priorityInfo.color}>{priorityInfo.label}</span>
              <span className={styles.subtext}>{ticket.support_type === 'technical' ? 'شكوى فنية' : 'سؤال أكاديمي'}</span>
              {!ticket.assigned_to && <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded-full">غير مخصصة</span>}
              {ticket.assigned_to === assistant?.teacher_id && <span className="text-[10px] bg-blue-400/20 text-blue-400 px-1.5 py-0.5 rounded-full">معينة للمعلم</span>}
            </div>
          </div>
          <button onClick={() => router.push('/dashboard/assistant')} className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-lg text-xs">لوحة التحكم</button>
        </div>

        <div className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            {/* معلومات التذكرة */}
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5 mb-4`}>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold">
                  {ticket.student?.full_name?.charAt(0) || 'ط'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-base font-bold ${styles.text}`}>{ticket.student?.full_name}</p>
                  <p className={`text-xs ${styles.subtext}`}>{ticket.student?.email}</p>
                  <p className={`text-sm ${styles.subtext} mt-1`}>{ticket.description}</p>
                  {ticket.course?.title && <span className="text-xs text-blue-400">{ticket.course.title}</span>}
                  <p className="text-[10px] text-gray-500 mt-2">{formatDate(ticket.created_at)}</p>
                </div>
              </div>
            </div>

            {/* الردود */}
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5 mb-4`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4`}>الردود ({replies.length})</h3>
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {replies.length === 0 ? (
                  <p className={`text-xs ${styles.subtext} text-center py-8`}>لا توجد ردود بعد. كن أول من يرد!</p>
                ) : (
                  replies.map(reply => {
                    const isAssistantUser = reply.sender_id === assistant?.id;
                    return (
                      <motion.div key={reply.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isAssistantUser ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 ${isAssistantUser ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-[var(--border-color)]' : `${styles.card} border ${styles.border}`}`}>
                          {!isAssistantUser && <p className="text-[10px] font-semibold text-blue-400 mb-1">{reply.sender?.full_name || 'طالب'}</p>}
                          <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                          <p className="text-[10px] mt-2 opacity-60">{formatDate(reply.created_at)}</p>
                        </div>
                      </motion.div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* مربع الرد */}
            {ticket.status !== 'closed' && (
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-4`}>
                <form onSubmit={handleSendReply} className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      value={newReply}
                      onChange={e => setNewReply(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(e); } }}
                      rows={2}
                      placeholder="اكتب ردك..."
                      className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none resize-none`}
                    />
                  </div>
                  <button type="submit" disabled={!newReply.trim() || sending}
                    className="p-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold hover:scale-105 transition disabled:opacity-50">
                    {sending ? <Icons.Loader2 className="h-5 w-5 animate-spin" /> : <Icons.Send className="h-5 w-5" />}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* العمود الجانبي: الإجراءات */}
          <div className="lg:col-span-1 space-y-4">
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-4`}>
              <h4 className={`text-sm font-bold ${styles.text} mb-3`}>الإجراءات</h4>
              {(!assistant || hasPermission(permissions, 'tickets', 'can_edit') || hasPermission(permissions, 'support', 'can_edit')) && (
                <div className="mb-4">
                  <label className="text-xs text-gray-400 mb-1 block">الحالة</label>
                  <select value={ticket.status} onChange={e => handleStatusChange(e.target.value)}
                    className={`w-full p-2 ${styles.input} border ${styles.border} rounded-lg text-sm`}>
                    <option value="open">مفتوحة</option><option value="in_progress">قيد المعالجة</option>
                    <option value="resolved">محلولة</option><option value="closed">مغلقة</option>
                  </select>
                </div>
              )}
              {(!assistant || hasPermission(permissions, 'tickets', 'can_edit') || hasPermission(permissions, 'support', 'can_edit')) && (
                <div className="mb-4">
                  <label className="text-xs text-gray-400 mb-1 block">الأولوية</label>
                  <select value={ticket.priority} onChange={e => handlePriorityChange(e.target.value)}
                    className={`w-full p-2 ${styles.input} border ${styles.border} rounded-lg text-sm`}>
                    <option value="low">منخفضة</option><option value="medium">متوسطة</option>
                    <option value="high">عالية</option><option value="urgent">عاجلة</option>
                  </select>
                </div>
              )}
              {(!assistant || hasPermission(permissions, 'tickets', 'can_delete') || hasPermission(permissions, 'support', 'can_delete')) && (
                <button onClick={handleDelete} className="w-full p-2 rounded-lg bg-red-500/10 text-red-400 text-sm mb-2">حذف التذكرة</button>
              )}
            </div>

            {/* روابط سريعة */}
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-4`}>
              <h4 className={`text-sm font-bold ${styles.text} mb-3`}>روابط سريعة</h4>
              <Link href={`/dashboard/assistant/messages/${ticket.student_id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm mb-1">
                <Icons.Mail className="h-4 w-4 text-blue-400" /> مراسلة الطالب
              </Link>
              <Link href={`/dashboard/assistant/notes/${ticket.student_id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm mb-1">
                <Icons.StickyNote className="h-4 w-4 text-purple-400" /> إضافة ملاحظة
              </Link>
              <Link href={`/dashboard/assistant/announcements/new?student=${ticket.student_id}`} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/5 text-sm">
                <Icons.Megaphone className="h-4 w-4 text-yellow-400" /> إرسال إعلان
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AssistantLayout>
  );
}