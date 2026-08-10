'use client';

// ================================================================
// 💬 المسار: app/dashboard/assistant/support/[id]/page.js
// ✅ صفحة التفاصيل – تعرض التذكرة لأي مساعد، وتمنع الرد إذا كانت معينة لآخر
// ================================================================

import { AssistantLayout } from '@/components/AssistantLayout';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { hasPermission } from '@/lib/permissions';
import { useTheme } from '@/lib/hooks/useTheme';

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
  const { styles } = useTheme();

  const [assistant, setAssistant] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [permissions, setPermissions] = useState([]);
  const [canReply, setCanReply] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setNotFound(false);
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

      // 1. جلب التذكرة
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*, student:profiles!tickets_student_id_fkey(full_name, email), course:courses(title, teacher_id)')
        .eq('id', ticketId)
        .single();

      if (ticketError || !ticketData) {
        console.error('Ticket not found:', ticketError);
        setNotFound(true);
        setLoading(false);
        return;
      }

      // 2. التحقق من صلاحية العرض (منطق بسيط)
      // نجيب teacher_id من جدول المساعد
      const { data: assistantInfo } = await supabase
        .from('assistants')
        .select('teacher_id')
        .eq('id', assistantData.id)
        .single();

      if (assistantInfo) {
        const teacherId = assistantInfo.teacher_id;
        const assignedTo = ticketData.assigned_to;

        // إذا كانت معينة لمساعد آخر (ليس المعلم، ليس المساعد الحالي، وليست null)
        const isAssignedToOther = assignedTo !== null 
                                  && assignedTo !== assistantData.id 
                                  && assignedTo !== teacherId;

        // نسمح بعرض التذكرة دائماً، لكن نحدد إمكانية الرد
        setCanReply(!isAssignedToOther && ticketData.status !== 'closed');
      }

      setTicket(ticketData);

      // 3. جلب الردود
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
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [ticketId, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Realtime للردود
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-detail-${ticketId}`)
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

  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!newReply.trim() || !assistant || !canReply) return;
    setSending(true);
    try {
      const res = await fetch('/api/assistant/support/reply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assistant-id': assistant.id,
        },
        body: JSON.stringify({ ticketId, message: newReply.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال الرد');

      if (data.reply) {
        const newReplyObj = {
          ...data.reply,
          sender: data.reply.sender || { full_name: 'المعلم' },
          replied_by_assistant: data.reply.replied_by_assistant || null,
        };
        setReplies(prev => [...prev, newReplyObj]);
        if (ticket.status === 'open') {
          setTicket(prev => ({ ...prev, status: 'in_progress' }));
        }
        setCanReply(true);
      }

      setNewReply('');
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      toast.success('تم إرسال الرد بنجاح');
    } catch (err) {
      toast.error(err.message || 'فشل إرسال الرد');
    } finally {
      setSending(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const { error } = await supabase
      .from('tickets')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    if (!error) setTicket(prev => ({ ...prev, status: newStatus }));
    else toast.error('فشل تغيير الحالة');
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذه التذكرة نهائياً؟')) return;
    const { error } = await supabase.from('tickets').delete().eq('id', ticketId);
    if (error) { toast.error('فشل الحذف'); return; }
    toast.success('تم حذف التذكرة');
    router.push('/dashboard/assistant/support');
  };

  const formatDate = (date) => new Date(date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return (
      <AssistantLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </AssistantLayout>
    );
  }

  if (notFound || !ticket) {
    return (
      <AssistantLayout>
        <div className={`min-h-screen ${styles.bg} ${styles.text} flex items-center justify-center p-4`}>
          <div className="text-center">
            <Icons.TicketX className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">التذكرة غير موجودة</h2>
            <p className={`${styles.subtext} mb-6`}>قد تكون غير تابعة لكورسات هذا المعلم</p>
            <button
              onClick={() => router.push('/dashboard/assistant/support')}
              className="px-6 py-2 bg-yellow-400 text-black font-bold rounded-xl hover:scale-105 transition"
            >
              العودة إلى قائمة الدعم
            </button>
          </div>
        </div>
      </AssistantLayout>
    );
  }

  const statusInfo = STATUS_MAP[ticket.status];
  const priorityInfo = PRIORITY_MAP[ticket.priority];

  // التحقق إذا كانت معينة لمساعد آخر (لا يمكن الرد)
  const isAssignedToOther = ticket.assigned_to !== null 
                            && ticket.assigned_to !== assistant?.id
                            && ticket.assigned_to !== assistant?.teacher_id;

  return (
    <AssistantLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} flex flex-col`} dir="rtl">
        {/* الهيدر */}
        <div className={`sticky top-0 z-20 ${styles.card} border-b ${styles.border} backdrop-blur-md px-4 py-3 flex items-center gap-3`}>
          <button onClick={() => router.push('/dashboard/assistant/support')} className={`p-2 rounded-xl hover:bg-white/5 ${styles.subtext}`}><Icons.ArrowRight className="h-5 w-5" /></button>
          <div className="flex-1 min-w-0">
            <h1 className={`text-sm font-bold truncate ${styles.text}`}>{ticket.subject}</h1>
            <div className="flex items-center gap-2 text-[10px] mt-0.5 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>{statusInfo.label}</span>
              <span className={priorityInfo.color}>{priorityInfo.label}</span>
              <span className={styles.subtext}>{ticket.support_type === 'technical' ? 'شكوى فنية' : 'سؤال أكاديمي'}</span>
              {isAssignedToOther && (
                <span className="text-[10px] bg-green-400/20 text-green-400 px-1.5 py-0.5 rounded-full">معينة لمساعد آخر</span>
              )}
              {!ticket.assigned_to && (
                <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-1.5 py-0.5 rounded-full">غير مخصصة</span>
              )}
              {ticket.assigned_to === assistant?.id && (
                <span className="text-[10px] bg-blue-400/20 text-blue-400 px-1.5 py-0.5 rounded-full">مخصصة لك</span>
              )}
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
                  replies.map((reply) => {
                    const isAssistantReply = reply.replied_by_assistant?.id === assistant?.id;
                    const isSenderAssistant = reply.sender_id === assistant?.id;
                    const isMyReply = isAssistantReply || isSenderAssistant;

                    let displayName = reply.sender?.full_name || 'المعلم';
                    if (reply.replied_by_assistant) {
                      displayName = reply.replied_by_assistant.full_name;
                    }

                    return (
                      <motion.div key={reply.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isMyReply ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl p-4 ${isMyReply ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-[var(--border-color)]' : `${styles.card} border ${styles.border}`}`}>
                          <p className="text-[10px] font-semibold text-blue-400 mb-1">
                            {displayName}
                            {reply.replied_by_assistant && ' (مساعد)'}
                          </p>
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
            {canReply && ticket.status !== 'closed' && (
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

            {!canReply && ticket.status !== 'closed' && (
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 text-center ${styles.subtext}`}>
                <Icons.Lock className="h-5 w-5 inline ml-2 text-yellow-400" />
                هذه التذكرة معينة لمساعد آخر، لا يمكنك الرد عليها (يمكنك مشاهدة الردود فقط)
              </div>
            )}
          </div>

          {/* العمود الجانبي */}
          <div className="lg:col-span-1 space-y-4">
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-4`}>
              <h4 className={`text-sm font-bold ${styles.text} mb-3`}>الإجراءات</h4>
              {hasPermission(permissions, 'tickets', 'can_edit') && (
                <div className="mb-4">
                  <label className="text-xs text-gray-400 mb-1 block">الحالة</label>
                  <select value={ticket.status} onChange={e => handleStatusChange(e.target.value)}
                    className={`w-full p-2 ${styles.input} border ${styles.border} rounded-lg text-sm`}>
                    <option value="open">مفتوحة</option><option value="in_progress">قيد المعالجة</option>
                    <option value="resolved">محلولة</option><option value="closed">مغلقة</option>
                  </select>
                </div>
              )}
              {hasPermission(permissions, 'tickets', 'can_delete') && (
                <button onClick={handleDelete} className="w-full p-2 rounded-lg bg-red-500/10 text-red-400 text-sm">حذف التذكرة</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </AssistantLayout>
  );
}