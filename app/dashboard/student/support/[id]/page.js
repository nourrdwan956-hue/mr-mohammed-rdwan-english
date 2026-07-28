'use client';
// ================================================================
// 🗨️ المسار: app/dashboard/student/support/[id]/page.js
// صفحة تفاصيل طلب الدعم – نسخة فاخرة مع Wave Border
// ================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useParams } from 'next/navigation';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// ألوان البطاقات المتغيرة (نفس نظام الرئيسية)
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
// مكون الحدود الموجية (Wave Border)
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
// الثوابت
// ================================================================
const STATUS_MAP = {
  open: { ar: 'مفتوحة', en: 'Open', color: 'text-amber-500 dark:text-amber-400', bg: 'bg-amber-500/10 dark:bg-amber-400/10', border: 'border-amber-400/30 dark:border-amber-400/20' },
  in_progress: { ar: 'قيد المعالجة', en: 'In Progress', color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  resolved: { ar: 'محلولة', en: 'Resolved', color: 'text-green-500 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  closed: { ar: 'مغلقة', en: 'Closed', color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-500/10 dark:bg-gray-400/10', border: 'border-gray-400/30 dark:border-gray-400/20' },
};

// ================================================================
// المكون الرئيسي
// ================================================================
export default function StudentSupportDetailPage() {
  const router = useRouter();
  const params = useParams();
  const ticketId = params.id;
  const { theme, language, styles } = useTheme();
  const isArabic = language === 'ar';

  const [user, setUser] = useState(null);
  const [ticket, setTicket] = useState(null);
  const [replies, setReplies] = useState([]);
  const [newReply, setNewReply] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);

  // ألوان متغيرة للبطاقات
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const [inputColor, setInputColor] = useState(CARD_COLORS[3]);

  // ---------- جلب المستخدم ----------
  useEffect(() => {
    (async () => {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);
    })();
  }, [router]);

  // ---------- جلب بيانات التذكرة والردود ----------
  const fetchTicketData = useCallback(async () => {
    if (!ticketId || !user) return;
    setLoading(true);
    try {
      const { data: ticketData, error: ticketError } = await supabase
        .from('tickets')
        .select('*, course:courses(title), assigned:profiles!tickets_assigned_to_fkey(full_name)')
        .eq('id', ticketId)
        .single();

      if (ticketError) throw ticketError;
      if (ticketData.student_id !== user.id) {
        toast.error(isArabic ? 'غير مصرح' : 'Unauthorized');
        router.push('/dashboard/student/support');
        return;
      }
      setTicket(ticketData);

      const { data: repliesData } = await supabase
        .from('ticket_replies')
        .select('*, sender:profiles(full_name)')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      setReplies(repliesData || []);
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? 'فشل التحميل' : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [ticketId, user, router, isArabic]);

  useEffect(() => {
    if (user) fetchTicketData();
  }, [user, fetchTicketData]);

  // ---------- Realtime الردود ----------
  useEffect(() => {
    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-replies-${ticketId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'ticket_replies',
        filter: `ticket_id=eq.${ticketId}`
      }, (payload) => {
        const newReply = payload.new;
        supabase.from('profiles').select('full_name').eq('id', newReply.sender_id).single()
          .then(({ data }) => {
            setReplies(prev => [...prev, { ...newReply, sender: data }]);
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
          });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [ticketId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // ---------- إرسال رد ----------
  const handleSendReply = async (e) => {
    e?.preventDefault();
    if (!newReply.trim() || !user) return;
    setSending(true);
    try {
      const { error } = await supabase.from('ticket_replies').insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message: newReply.trim(),
        created_at: new Date().toISOString(),
      });
      if (error) throw error;
      setNewReply('');
      if (ticket.status === 'resolved' || ticket.status === 'closed') {
        await supabase.from('tickets').update({ status: 'in_progress', updated_at: new Date().toISOString() }).eq('id', ticketId);
        setTicket(prev => ({ ...prev, status: 'in_progress' }));
      }
      scrollToBottom();
    } catch (err) {
      toast.error(isArabic ? 'فشل الإرسال' : 'Send failed');
    } finally {
      setSending(false);
    }
  };

  // ---------- طلب الإغلاق ----------
  const handleResolve = async () => {
    if (!ticket || ticket.status === 'resolved' || ticket.status === 'closed') return;
    try {
      const { error } = await supabase.from('tickets').update({
        status: 'resolved',
        updated_at: new Date().toISOString()
      }).eq('id', ticketId);
      if (error) throw error;
      setTicket(prev => ({ ...prev, status: 'resolved' }));
      toast.success(isArabic ? 'تم إغلاق الطلب' : 'Ticket resolved');
    } catch (err) {
      toast.error(isArabic ? 'فشل الإغلاق' : 'Failed to resolve');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString(isArabic ? 'ar-EG' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const statusInfo = ticket ? STATUS_MAP[ticket.status] : STATUS_MAP.open;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!ticket) return null;

  return (
    <div className={`min-h-screen flex flex-col ${styles.bg} ${styles.text}`} dir={isArabic ? 'rtl' : 'ltr'}>
      {/* ---------- الهيدر مع Wave Border ---------- */}
      <div className="sticky top-0 z-20 px-4 py-3">
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="flex items-center gap-3 p-3">
            <button 
              onClick={() => router.push('/dashboard/student/support')} 
              className={`p-2 rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition ${styles.subtext}`}
            >
              <Icons.ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex-1 min-w-0">
              <h1 className={`text-lg font-bold truncate ${styles.text}`}>{ticket.subject}</h1>
              <div className="flex items-center gap-3 text-xs mt-1 flex-wrap">
                <span className={`px-3 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border font-medium`}>
                  {statusInfo[language]}
                </span>
                <span className={`${styles.subtext} flex items-center gap-1`}>
                  <Icons.Tag className="h-3.5 w-3.5" />
                  {ticket.support_type === 'technical' 
                    ? (isArabic ? 'تقنية' : 'Technical') 
                    : (isArabic ? 'أكاديمية' : 'Academic')}
                </span>
                {ticket.course?.title && (
                  <span className={`${styles.subtext} flex items-center gap-1`}>
                    <Icons.BookOpen className="h-3.5 w-3.5" />
                    {ticket.course.title}
                  </span>
                )}
              </div>
            </div>
            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <button
                onClick={handleResolve}
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-xl bg-green-500/20 dark:bg-green-400/20 text-green-600 dark:text-green-400 hover:bg-green-500/30 dark:hover:bg-green-400/30 transition font-bold"
              >
                <Icons.CheckCircle className="h-5 w-5" />
                {isArabic ? 'تم الحل' : 'Resolve'}
              </button>
            )}
          </div>
        </WaveBorderCard>
      </div>

      {/* ---------- منطقة المحادثة ---------- */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
        {/* الرسالة الأصلية (الوصف) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex justify-end"
        >
          <div className={`max-w-[85%] rounded-2xl p-5 bg-gradient-to-br from-blue-500/20 to-purple-500/20 dark:from-blue-400/10 dark:to-purple-400/10 border ${styles.border} shadow-lg`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-blue-500 dark:text-blue-400">
                {isArabic ? 'وصف المشكلة' : 'Description'}
              </span>
            </div>
            <p className="text-base whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            <p className="text-[11px] mt-3 opacity-60">{formatDate(ticket.created_at)}</p>
          </div>
        </motion.div>

        {/* الردود */}
        <AnimatePresence>
          {replies.map((reply) => {
            const isStudent = reply.sender_id === user?.id;
            return (
              <motion.div
                key={reply.id}
                initial={{ opacity: 0, y: 15, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -15, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className={`flex ${isStudent ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-2xl p-5 shadow-lg ${
                  isStudent
                    ? 'bg-gradient-to-br from-yellow-500/30 to-orange-500/20 dark:from-yellow-400/20 dark:to-orange-400/10 border border-yellow-400/30 dark:border-yellow-400/20'
                    : `${styles.card} border ${styles.border}`
                }`}>
                  {!isStudent && (
                    <div className="flex items-center gap-2 mb-2">
                      <div className="h-6 w-6 rounded-full bg-blue-500/20 dark:bg-blue-400/20 flex items-center justify-center">
                        <Icons.User className="h-3.5 w-3.5 text-blue-500 dark:text-blue-400" />
                      </div>
                      <p className="text-xs font-bold text-blue-500 dark:text-blue-400">
                        {reply.sender?.full_name || (isArabic ? 'المعلم' : 'Teacher')}
                      </p>
                    </div>
                  )}
                  <p className="text-base whitespace-pre-wrap leading-relaxed">{reply.message}</p>
                  <p className="text-[11px] mt-3 opacity-60">{formatDate(reply.created_at)}</p>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* ---------- مربع الرد مع Wave Border ---------- */}
      {ticket.status !== 'closed' && (
        <div className="sticky bottom-0 z-20 px-4 py-3">
          <WaveBorderCard initialColor={inputColor.name} onColorChange={setInputColor}>
            <form onSubmit={handleSendReply} className="flex items-end gap-3 p-3">
              <div className="flex-1 relative">
                <textarea
                  value={newReply}
                  onChange={(e) => setNewReply(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendReply(); } }}
                  rows={1}
                  placeholder={isArabic ? 'اكتب ردك...' : 'Write your reply...'}
                  className={`w-full p-3 pr-12 ${styles.input} border ${styles.border} rounded-2xl focus:ring-2 focus:ring-blue-500/40 dark:focus:ring-blue-400/40 outline-none transition resize-none min-h-[52px] text-base`}
                />
                <div className="absolute bottom-3 right-3 text-[10px] text-gray-400 dark:text-gray-500 pointer-events-none">
                  <kbd className="px-2 py-0.5 bg-white/10 dark:bg-white/5 rounded border border-white/10">↵</kbd>
                </div>
              </div>
              <button
                type="submit"
                disabled={!newReply.trim() || sending}
                className={`p-3.5 rounded-2xl bg-gradient-to-r from-blue-500 to-blue-600 dark:from-blue-400 dark:to-blue-500 text-white font-bold hover:scale-105 transition shadow-lg shadow-blue-500/30 dark:shadow-blue-400/20 disabled:opacity-50`}
              >
                {sending ? <Icons.Loader2 className="h-6 w-6 animate-spin" /> : <Icons.Send className="h-6 w-6" />}
              </button>
            </form>
          </WaveBorderCard>
        </div>
      )}
    </div>
  );
}