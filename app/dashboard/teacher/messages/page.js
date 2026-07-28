'use client';

// ================================================================
// ✉️ المسار: app/dashboard/teacher/messages/page.js
// تم التحديث: دعم الردود الفورية عبر Realtime، عداد الردود غير المقروءة
// ================================================================
import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { getCachedAssistantPermissions, hasPermission } from '@/lib/permissions';

// ----- useTheme محلي -----
const useTheme = () => {
  const [theme, setTheme] = useState(() => { try { return localStorage.getItem('teacherMessagesTheme') || 'dark'; } catch { return 'dark'; } });
  useEffect(() => { localStorage.setItem('teacherMessagesTheme', theme); document.documentElement.className = theme; }, [theme]);
  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  const styles = {
    dark: { bg: 'bg-[#0b0e1a]', text: 'text-white', subtext: 'text-gray-300', card: 'bg-white/5 backdrop-blur-sm border-white/10', input: 'bg-white/10 border-white/20 text-white placeholder-gray-300', hover: 'hover:border-yellow-400/50', border: 'border-white/10', label: 'text-gray-200' },
    light: { bg: 'bg-gray-50', text: 'text-gray-900', subtext: 'text-gray-700', card: 'bg-white/90 backdrop-blur-sm border-gray-200', input: 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400', hover: 'hover:border-yellow-400/70', border: 'border-gray-200', label: 'text-gray-700' },
  };
  return { theme, toggleTheme, styles: styles[theme], isDark: theme === 'dark' };
};

// ----- مكون رسالة (مع إمكانية حذف) -----
const MessageBubble = ({ msg, isTeacher, studentName, onDelete, styles }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
    className={`flex ${isTeacher ? 'justify-end' : 'justify-start'} mb-3`}>
    <div className={`max-w-[80%] rounded-2xl p-3 ${isTeacher ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-[var(--border-color)]' : `${styles.card} border ${styles.border}`}`}>
      {!isTeacher && <p className="text-[10px] font-semibold text-blue-400 mb-1">{studentName || 'طالب'}</p>}
      <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
      <div className="flex items-center justify-end gap-2 mt-1">
        <span className="text-[10px] opacity-60">{new Date(msg.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
        {isTeacher && (
          <button onClick={() => onDelete(msg.id)} className="text-red-400 hover:text-red-300"><Icons.Trash2 className="h-3 w-3" /></button>
        )}
        {/* عرض حالة القراءة للرسائل المرسلة من المعلم */}
        {isTeacher && (
          <span className={`text-[8px] ${msg.is_read ? 'text-green-400' : 'text-gray-500'}`}>
            {msg.is_read ? '✓✓' : '✓'}
          </span>
        )}
      </div>
    </div>
  </motion.div>
);

// ----- مودال رسالة جديدة -----
const NewMessageModal = ({ isOpen, onClose, students, onSend, styles, permissions, isAssistant }) => {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return students;
    const q = search.toLowerCase();
    return students.filter(s => s.full_name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q));
  }, [students, search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selected || !message.trim()) return;
    setSending(true);
    try {
      await onSend(selected, message.trim());
      setMessage('');
      setSelected('');
      onClose();
    } catch { toast.error('فشل الإرسال'); }
    finally { setSending(false); }
  };

  if (!isOpen) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}
        className={`${styles.card} border ${styles.border} rounded-3xl p-6 max-w-md w-full`} onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">✉️ رسالة جديدة</h3>
          <button onClick={onClose} className={`p-2 rounded-xl hover:bg-white/5 ${styles.subtext}`}><Icons.X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن طالب..." className={`w-full p-2.5 ${styles.input} border ${styles.border} rounded-xl`} />
          <div className="max-h-32 overflow-y-auto space-y-1">
            {filtered.map(s => (
              <div key={s.id} onClick={() => setSelected(s.id)} className={`p-2 rounded-lg cursor-pointer ${selected === s.id ? 'bg-yellow-400/20 border-yellow-400/30' : 'hover:bg-white/5'} border ${styles.border}`}>
                <p className={`text-sm ${styles.text}`}>{s.full_name}</p>
                <p className={`text-xs ${styles.subtext}`}>{s.email}</p>
              </div>
            ))}
          </div>
          <textarea value={message} onChange={e => setMessage(e.target.value)} rows={3} placeholder="نص الرسالة..." className={`w-full p-2.5 ${styles.input} border ${styles.border} rounded-xl resize-none`} required />
          {(!isAssistant || hasPermission(permissions, 'messages', 'can_create')) && (
            <button type="submit" disabled={sending || !selected || !message.trim()} className="w-full py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl disabled:opacity-50">
              {sending ? 'جارٍ...' : 'إرسال'}
            </button>
          )}
        </form>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// الصفحة الرئيسية (معدلة)
// ================================================================
export default function MessagesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { theme, toggleTheme, styles } = useTheme();
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [students, setStudents] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [permissions, setPermissions] = useState(null);
  const [isAssistant, setIsAssistant] = useState(false);
  const [searchConv, setSearchConv] = useState('');
  const [viewMode, setViewMode] = useState('list');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // ----- جلب البيانات (مع تحسين حساب الردود غير المقروءة) -----
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: u } } = await supabase.auth.getUser();
      if (!u) { router.push('/login'); return; }
      setUser(u);

      const perms = await getCachedAssistantPermissions(u.id);
      if (perms !== null) { setIsAssistant(true); setPermissions(perms); }
      else setIsAssistant(false);

      if (isAssistant && !hasPermission(perms, 'messages', 'can_view')) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // جلب جميع الرسائل التي تخص المعلم (مرسلة أو مستقبلة)
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${u.id},receiver_id.eq.${u.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // تجميع المحادثات مع حساب الردود غير المقروءة من الطالب
      const convMap = new Map();
      msgs?.forEach(msg => {
        const otherId = msg.sender_id === u.id ? msg.receiver_id : msg.sender_id;
        if (!convMap.has(otherId)) {
          convMap.set(otherId, {
            studentId: otherId,
            lastMessage: msg.body,
            lastDate: msg.created_at,
            unreadFromStudent: 0, // عدد الرسائل غير المقروءة من الطالب للمعلم
            lastMsgIsFromTeacher: msg.sender_id === u.id,
          });
        }
        // تحديث آخر رسالة إذا كانت أحدث
        const existing = convMap.get(otherId);
        if (new Date(msg.created_at) > new Date(existing.lastDate)) {
          existing.lastMessage = msg.body;
          existing.lastDate = msg.created_at;
          existing.lastMsgIsFromTeacher = msg.sender_id === u.id;
        }
        // حساب الردود غير المقروءة (المرسلة من الطالب إلى المعلم ولم يقرأها المعلم)
        if (msg.sender_id !== u.id && msg.receiver_id === u.id && !msg.is_read) {
          existing.unreadFromStudent += 1;
        }
      });

      // جلب أسماء الطلاب
      const studentIds = Array.from(convMap.keys());
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, email').in('id', studentIds);
      const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

      const convArray = Array.from(convMap.entries()).map(([id, data]) => ({
        studentId: id,
        studentName: profileMap.get(id)?.full_name || 'طالب',
        studentEmail: profileMap.get(id)?.email || '',
        ...data,
      }));

      // ترتيب حسب تاريخ آخر رسالة (الأحدث أولاً)
      convArray.sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
      setConversations(convArray);

      // جميع الطلاب للرسالة الجديدة
      const { data: allStudents } = await supabase.from('profiles').select('id, full_name, email').eq('role', 'student');
      setStudents(allStudents || []);

      // فتح محادثة تلقائية إن وجدت في الرابط
      const studentParam = searchParams.get('student');
      if (studentParam && convArray.some(c => c.studentId === studentParam)) {
        const conv = convArray.find(c => c.studentId === studentParam);
        setActiveChat(conv);
        setViewMode('chat');
        await loadMessages(conv.studentId, u.id);
      }

    } catch (err) {
      console.error(err);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [router, searchParams, isAssistant, permissions]);

  // دالة مساعدة لتحميل رسائل محادثة محددة
  const loadMessages = async (studentId, userId) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${userId},receiver_id.eq.${studentId}),and(sender_id.eq.${studentId},receiver_id.eq.${userId})`)
      .order('created_at', { ascending: true });
    setMessages(data || []);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    // تعليم رسائل الطالب كمقروءة (عند فتح المحادثة)
    if (data && data.length > 0) {
      const unreadIds = data.filter(m => m.sender_id === studentId && m.receiver_id === userId && !m.is_read).map(m => m.id);
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ is_read: true }).in('id', unreadIds);
        // تحديث حالة unread في قائمة المحادثات
        setConversations(prev =>
          prev.map(conv =>
            conv.studentId === studentId
              ? { ...conv, unreadFromStudent: 0 }
              : conv
          )
        );
      }
    }
  };

  useEffect(() => { fetchData(); }, [fetchData]);

  // فتح محادثة (مع تحديث حالة القراءة)
  const openChat = async (conv) => {
    if (!user) return;
    setActiveChat(conv);
    setViewMode('chat');
    await loadMessages(conv.studentId, user.id);
  };

  // ----- إرسال رسالة (من المعلم) -----
  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!newMsg.trim() || !activeChat || !user) return;
    setSending(true);

    const body = newMsg.trim();
    setNewMsg('');

    try {
      const { data: inserted, error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: activeChat.studentId,
          body,
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      setMessages(prev => [...prev, inserted]);

      // تحديث قائمة المحادثات (جعلها في الأعلى)
      setConversations(prev => {
        const filtered = prev.filter(c => c.studentId !== activeChat.studentId);
        return [
          {
            ...activeChat,
            lastMessage: body,
            lastDate: inserted.created_at,
            lastMsgIsFromTeacher: true,
            unreadFromStudent: 0, // المعلم يرسل، لا توجد رسائل غير مقروءة من الطالب
          },
          ...filtered,
        ];
      });

      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      console.error('Send error:', err);
      toast.error(`فشل الإرسال: ${err.message || 'خطأ غير معروف'}`);
    } finally {
      setSending(false);
    }
  };

  // ----- حذف رسالة -----
  const deleteMessage = async (msgId) => {
    await supabase.from('messages').delete().eq('id', msgId);
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  // ----- إرسال رسالة جديدة (من المودال) -----
  const sendNewMessage = async (studentId, body) => {
    const { data: inserted, error } = await supabase
      .from('messages')
      .insert({
        sender_id: user.id,
        receiver_id: studentId,
        body,
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (error) {
      console.error('New message error:', error);
      toast.error(`فشل الإرسال: ${error.message}`);
      throw error;
    }

    const student = students.find(s => s.id === studentId);
    const newConv = {
      studentId,
      studentName: student?.full_name || 'طالب',
      studentEmail: student?.email || '',
      lastMessage: body,
      lastDate: inserted.created_at,
      unreadFromStudent: 0,
      lastMsgIsFromTeacher: true,
    };

    setConversations(prev => [newConv, ...prev.filter(c => c.studentId !== studentId)]);
    toast.success('تم الإرسال');
  };

  // ================================================================
  // 🔄 اتصال Realtime المحسّن (للاستماع للرسائل الجديدة من الطلاب)
  // ================================================================
  useEffect(() => {
    if (!user) return;

    // نستمع لأي رسالة جديدة يكون فيها المعلم هو المستقبل أو المرسل (لتحديث الحالة)
    // ولكن الأهم هو الاستماع للرسائل التي يرسلها الطالب إلى المعلم
    const channel = supabase
      .channel('teacher-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`, // فقط الرسائل الموجهة إلى المعلم
        },
        async (payload) => {
          const newMsg = payload.new;
          // إذا كانت المحادثة مفتوحة حالياً، أضف الرسالة وأعلمها كمقروءة فوراً
          if (activeChat && activeChat.studentId === newMsg.sender_id) {
            // إضافة الرسالة إلى الواجهة
            setMessages(prev => [...prev, newMsg]);
            // تعليمها كمقروءة
            await supabase.from('messages').update({ is_read: true }).eq('id', newMsg.id);
            // تحديث حالة القراءة في القائمة
            setConversations(prev =>
              prev.map(conv =>
                conv.studentId === newMsg.sender_id
                  ? { ...conv, unreadFromStudent: 0 }
                  : conv
              )
            );
            setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
            // إشعار صوتي/بصري (toast)
            toast.success(`📩 رد جديد من ${activeChat.studentName}`);
          } else {
            // إذا كانت المحادثة غير مفتوحة، نقوم بتحديث القائمة وإظهار العداد
            const senderId = newMsg.sender_id;
            // جلب اسم الطالب
            const { data: profile } = await supabase.from('profiles').select('full_name').eq('id', senderId).single();
            const studentName = profile?.full_name || 'طالب';

            setConversations(prev => {
              const existing = prev.find(c => c.studentId === senderId);
              if (existing) {
                // تحديث المحادثة الموجودة
                return prev.map(c =>
                  c.studentId === senderId
                    ? {
                        ...c,
                        lastMessage: newMsg.body,
                        lastDate: newMsg.created_at,
                        lastMsgIsFromTeacher: false,
                        unreadFromStudent: (c.unreadFromStudent || 0) + 1,
                      }
                    : c
                ).sort((a, b) => new Date(b.lastDate) - new Date(a.lastDate));
              } else {
                // محادثة جديدة من طالب لم يرسل من قبل
                return [
                  {
                    studentId: senderId,
                    studentName: studentName,
                    studentEmail: '',
                    lastMessage: newMsg.body,
                    lastDate: newMsg.created_at,
                    unreadFromStudent: 1,
                    lastMsgIsFromTeacher: false,
                  },
                  ...prev,
                ];
              }
            });

            toast.success(`📩 رسالة جديدة من ${studentName}`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, activeChat]);

  // ----- فلترة المحادثات -----
  const filteredConversations = useMemo(() => {
    if (!searchConv.trim()) return conversations;
    const q = searchConv.toLowerCase();
    return conversations.filter(c => c.studentName?.toLowerCase().includes(q));
  }, [conversations, searchConv]);

  if (loading) return (
    <TeacherLayout><div className="min-h-screen flex items-center justify-center"><div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /></div></TeacherLayout>
  );

  return (
    <TeacherLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} flex`}>
        {/* قائمة المحادثات */}
        <div className={`${viewMode === 'chat' ? 'hidden md:flex' : 'flex'} md:w-80 w-full flex-col border-l ${styles.border}`}>
          <div className={`p-4 border-b ${styles.border}`}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">✉️ المراسلات</h2>
              <div className="flex gap-2">
                <button onClick={toggleTheme} className={`p-2 rounded-xl ${styles.card} border ${styles.border}`}>{theme === 'dark' ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}</button>
                {(!isAssistant || hasPermission(permissions, 'messages', 'can_create')) && (
                  <button onClick={() => setShowNewModal(true)} className="p-2 rounded-xl bg-yellow-400/20 text-yellow-400"><Icons.Plus className="h-4 w-4" /></button>
                )}
              </div>
            </div>
            <div className="relative">
              <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input value={searchConv} onChange={e => setSearchConv(e.target.value)} placeholder="بحث..." className={`w-full p-2 pr-10 ${styles.input} border ${styles.border} rounded-xl text-sm`} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.map(conv => {
              const isActive = activeChat?.studentId === conv.studentId;
              return (
                <div key={conv.studentId} onClick={() => openChat(conv)}
                  className={`p-3 border-b ${styles.border} cursor-pointer hover:bg-white/5 transition ${isActive ? 'bg-yellow-400/10' : ''}`}>
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold text-sm">
                      {conv.studentName?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <p className="text-sm font-medium truncate">{conv.studentName}</p>
                        <span className="text-[10px] text-gray-400">
                          {new Date(conv.lastDate).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className={`text-xs truncate ${conv.lastMsgIsFromTeacher ? 'text-yellow-500' : 'text-blue-400'}`}>
                          {conv.lastMsgIsFromTeacher ? '📤 ' : '📩 '}{conv.lastMessage}
                        </p>
                        {/* عرض عدد الردود غير المقروءة من الطالب */}
                        {conv.unreadFromStudent > 0 && (
                          <span className="bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 animate-pulse">
                            {conv.unreadFromStudent}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredConversations.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm">لا توجد محادثات</div>
            )}
          </div>
        </div>

        {/* منطقة المحادثة */}
        <div className={`flex-1 flex-col ${viewMode === 'chat' ? 'flex' : 'hidden md:flex'}`}>
          {activeChat ? (
            <>
              <div className={`p-4 border-b ${styles.border} flex items-center gap-3`}>
                <button onClick={() => { setViewMode('list'); setActiveChat(null); }} className="md:hidden p-2"><Icons.ArrowRight className="h-5 w-5" /></button>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold text-sm">{activeChat.studentName?.charAt(0)}</div>
                <div>
                  <p className="font-bold text-sm">{activeChat.studentName}</p>
                  <p className="text-[10px] text-gray-400">{activeChat.studentEmail}</p>
                </div>
                {activeChat.unreadFromStudent > 0 && (
                  <span className="bg-blue-500 text-white text-xs px-2 py-0.5 rounded-full">ردود جديدة</span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.map(msg => (
                  <MessageBubble key={msg.id} msg={msg} isTeacher={msg.sender_id === user.id} studentName={activeChat.studentName} onDelete={deleteMessage} styles={styles} />
                ))}
                <div ref={messagesEndRef} />
              </div>
              <form onSubmit={sendMessage} className={`p-4 border-t ${styles.border} flex gap-2`}>
                <input value={newMsg} onChange={e => setNewMsg(e.target.value)} placeholder="اكتب رسالتك..." className={`flex-1 p-3 ${styles.input} border ${styles.border} rounded-xl`} />
                <button type="submit" disabled={!newMsg.trim() || sending} className="p-3 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black disabled:opacity-50">
                  <Icons.Send className="h-5 w-5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">اختر محادثة لعرضها</div>
          )}
        </div>
      </div>

      {/* مودال رسالة جديدة */}
      <NewMessageModal isOpen={showNewModal} onClose={() => setShowNewModal(false)} students={students} onSend={sendNewMessage} styles={styles} permissions={permissions} isAssistant={isAssistant} />
    </TeacherLayout>
  );
}