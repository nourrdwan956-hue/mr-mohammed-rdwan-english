'use client';

// ================================================================
// 📌 مكون: NotificationDrawer (النسخة المحسّنة)
// درج الإشعارات في منتصف الشاشة مع دعم السحب للإغلاق
// ================================================================
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ----- استخدام الثيم -----
const useTheme = () => {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('studentNotificationTheme') || 'dark'; } 
    catch { return 'dark'; }
  });
  useEffect(() => {
    localStorage.setItem('studentNotificationTheme', theme);
    document.documentElement.className = theme;
  }, [theme]);

  const styles = {
    dark: {
      bg: 'bg-[#0b0e1a]',
      text: 'text-white',
      subtext: 'text-gray-300',
      card: 'bg-white/10 backdrop-blur-xl border-white/10',
      input: 'bg-white/10 border-white/20 text-white placeholder-gray-300',
      hover: 'hover:border-yellow-400/50',
      border: 'border-white/10',
      label: 'text-gray-200',
      drawerBg: 'bg-[#0b0e1a]/95 backdrop-blur-2xl',
    },
    light: {
      bg: 'bg-gray-50',
      text: 'text-gray-900',
      subtext: 'text-gray-700',
      card: 'bg-white/90 backdrop-blur-xl border-gray-200',
      input: 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400',
      hover: 'hover:border-yellow-400/70',
      border: 'border-gray-200',
      label: 'text-gray-700',
      drawerBg: 'bg-white/95 backdrop-blur-2xl',
    },
  };
  return { theme, toggleTheme: () => setTheme(t => t === 'dark' ? 'light' : 'dark'), styles: styles[theme], isDark: theme === 'dark' };
};

// ----- بطاقة الإعلان -----
const AnnouncementItem = ({ announcement, studentId, onLikeToggle, styles }) => {
  const [liked, setLiked] = useState(announcement.user_liked || false);
  const [totalLikes, setTotalLikes] = useState(announcement.total_likes || 0);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const res = await fetch(`/api/announcements/${announcement.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('استجابة غير صالحة من الخادم');
      }

      if (!res.ok) throw new Error(data.error || 'فشل الإعجاب');

      setLiked(data.liked);
      setTotalLikes(data.totalLikes);
      if (onLikeToggle) onLikeToggle(announcement.id, data.liked, data.totalLikes);
      toast.success(data.message);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'حدث خطأ');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
      className={`p-4 rounded-2xl border ${styles.border} ${styles.card} mb-3 transition-all hover:shadow-lg`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`text-base font-bold ${styles.text} truncate`}>{announcement.title}</h4>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border border-yellow-500/30">
              {new Date(announcement.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
            </span>
          </div>
          <p className={`text-sm ${styles.subtext} mt-1 leading-relaxed whitespace-pre-wrap`}>{announcement.body}</p>
          <div className="flex items-center gap-4 mt-3">
            <button
              onClick={handleLike}
              disabled={isProcessing}
              className={`flex items-center gap-1.5 text-sm font-medium transition-all duration-300 ${
                liked 
                  ? 'text-red-500 dark:text-red-400 scale-105' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400'
              }`}
            >
              <motion.div
                animate={liked ? { scale: [1, 1.3, 1] } : { scale: 1 }}
                transition={{ duration: 0.4 }}
              >
                <Icons.Heart className={`h-5 w-5 ${liked ? 'fill-current' : ''}`} />
              </motion.div>
              <span className="text-xs">{totalLikes}</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ----- بطاقة الرسالة مع الرد -----
const MessageItem = ({ message, teacherId, studentId, onReplySent, styles }) => {
  const [replyText, setReplyText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;
    setIsSending(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          sender_id: studentId,
          receiver_id: teacherId,
          body: replyText.trim(),
          is_read: false,
          created_at: new Date().toISOString(),
        })
        .select('*')
        .single();

      if (error) throw error;

      toast.success('✅ تم إرسال الرد');
      setReplyText('');
      setShowReplyBox(false);
      if (onReplySent) onReplySent(data);
    } catch (err) {
      console.error(err);
      toast.error('فشل إرسال الرد');
    } finally {
      setIsSending(false);
    }
  };

  const isTeacher = message.sender_id === teacherId;

  return (
    <motion.div
      initial={{ opacity: 0, x: isTeacher ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className={`flex ${isTeacher ? 'justify-start' : 'justify-end'} mb-3`}
    >
      <div className={`max-w-[85%] rounded-2xl p-3 ${
        isTeacher 
          ? `bg-blue-500/10 dark:bg-blue-400/10 border border-blue-500/20 dark:border-blue-400/20` 
          : `bg-yellow-500/10 dark:bg-yellow-400/10 border border-yellow-500/20 dark:border-yellow-400/20`
      }`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400">
            {isTeacher ? '📚 المعلم' : '👤 أنت'}
          </span>
          <span className="text-[10px] text-gray-400">
            {new Date(message.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className={`text-sm ${styles.text} whitespace-pre-wrap`}>{message.body}</p>
        
        {isTeacher && (
          <div className="mt-2">
            {!showReplyBox ? (
              <button
                onClick={() => setShowReplyBox(true)}
                className="text-xs font-medium text-yellow-500 dark:text-yellow-400 hover:underline flex items-center gap-1"
              >
                <Icons.Reply className="h-3 w-3" /> رد
              </button>
            ) : (
              <form onSubmit={handleSendReply} className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="اكتب ردك..."
                  className={`flex-1 p-2 text-sm ${styles.input} border ${styles.border} rounded-xl`}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={isSending || !replyText.trim()}
                  className="p-2 rounded-xl bg-yellow-500 text-black hover:bg-yellow-600 disabled:opacity-50 transition"
                >
                  <Icons.Send className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowReplyBox(false)}
                  className="p-2 rounded-xl bg-gray-500/20 hover:bg-gray-500/30 transition"
                >
                  <Icons.X className="h-4 w-4" />
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ================================================================
// المكون الرئيسي – درج الإشعارات
// ================================================================
export default function NotificationDrawer({
  isOpen,
  onClose,
  announcements = [],
  messages = [],
  studentId,
  teacherId,
  notificationsEnabled,
  onToggleNotifications,
  onUpdateAnnouncements,
  onUpdateMessages,
}) {
  const { styles, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState('announcements');
  const [localAnnouncements, setLocalAnnouncements] = useState(announcements);
  const [localMessages, setLocalMessages] = useState(messages);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const drawerContentRef = useRef(null);

  useEffect(() => setLocalAnnouncements(announcements), [announcements]);
  useEffect(() => setLocalMessages(messages), [messages]);

  const handleLikeToggle = useCallback((announcementId, liked, totalLikes) => {
    setLocalAnnouncements(prev =>
      prev.map(a =>
        a.id === announcementId
          ? { ...a, user_liked: liked, total_likes: totalLikes }
          : a
      )
    );
    if (onUpdateAnnouncements) {
      onUpdateAnnouncements(announcementId, liked, totalLikes);
    }
  }, [onUpdateAnnouncements]);

  const handleReplySent = useCallback((newMessage) => {
    setLocalMessages(prev => [newMessage, ...prev]);
    if (onUpdateMessages) {
      onUpdateMessages(newMessage);
    }
  }, [onUpdateMessages]);

  const filteredAnnouncements = useMemo(() => {
    return localAnnouncements.filter(a => a.is_published === true);
  }, [localAnnouncements]);

  const unreadCount = useMemo(() => {
    const unreadMessages = localMessages.filter(m => m.sender_id === teacherId && !m.is_read).length;
    return unreadMessages + filteredAnnouncements.length;
  }, [localMessages, filteredAnnouncements, teacherId]);

  // ----- أحداث السحب (swipe) للإغلاق -----
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const rect = drawerContentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const y = touch.clientY - rect.top;
    if (y < 100) {
      setIsDragging(true);
      setDragY(0);
    }
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const rect = drawerContentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const deltaY = touch.clientY - rect.top;
    if (deltaY > 0 && deltaY < 300) {
      setDragY(deltaY);
      drawerContentRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  };

  const handleTouchEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    if (dragY > 150) {
      onClose();
    } else {
      drawerContentRef.current.style.transform = 'translateY(0)';
      setDragY(0);
    }
  };

  // تأثيرات Framer Motion
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 },
  };

  const drawerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: -20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, scale: 0.95, y: -20, transition: { duration: 0.2 } },
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* الخلفية الزجاجية المعتمة */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 bg-black/70 dark:bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />

          {/* حاوية الدرج (توسيط) */}
          <motion.div
            variants={drawerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            {/* المحتوى الفعلي للدرج */}
            <div
              ref={drawerContentRef}
              className={`pointer-events-auto w-full max-w-2xl max-h-[90vh] rounded-3xl shadow-2xl border ${styles.border} overflow-hidden flex flex-col ${styles.drawerBg}`}
              onClick={(e) => e.stopPropagation()}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* رأس النافذة */}
              <div className={`flex items-center justify-between p-5 border-b ${styles.border} flex-shrink-0`}>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Icons.Bell className={`h-7 w-7 ${notificationsEnabled ? 'text-yellow-500' : 'text-gray-500'}`} />
                    {notificationsEnabled && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <h2 className={`text-2xl font-black ${styles.text}`}>
                    {notificationsEnabled ? 'الإشعارات' : 'الإشعارات معطلة 🔕'}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={onToggleNotifications}
                    className={`p-2 rounded-xl transition-all duration-300 ${
                      notificationsEnabled
                        ? 'bg-green-500/20 text-green-500 dark:text-green-400 border border-green-500/30 hover:bg-green-500/30'
                        : 'bg-red-500/20 text-red-500 dark:text-red-400 border border-red-500/30 hover:bg-red-500/30'
                    }`}
                    title={notificationsEnabled ? 'إيقاف الإشعارات' : 'تفعيل الإشعارات'}
                  >
                    {notificationsEnabled ? <Icons.BellRing className="h-5 w-5" /> : <Icons.BellOff className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={onClose}
                    className={`p-3 rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition ${styles.subtext}`}
                  >
                    <Icons.X className="h-7 w-7" />
                  </button>
                </div>
              </div>

              {/* التبويبات */}
              {notificationsEnabled && (
                <div className={`flex border-b ${styles.border} flex-shrink-0 px-5 pt-2`}>
                  <button
                    onClick={() => setActiveTab('announcements')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all relative ${
                      activeTab === 'announcements'
                        ? 'text-yellow-500 dark:text-yellow-400'
                        : styles.subtext
                    }`}
                  >
                    <Icons.Megaphone className="h-4 w-4" />
                    الإعلانات
                    {filteredAnnouncements.length > 0 && (
                      <span className="bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 text-[10px] px-1.5 py-0.5 rounded-full">
                        {filteredAnnouncements.length}
                      </span>
                    )}
                    {activeTab === 'announcements' && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600"
                      />
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('messages')}
                    className={`flex items-center gap-2 px-4 py-3 font-bold text-sm transition-all relative ${
                      activeTab === 'messages'
                        ? 'text-yellow-500 dark:text-yellow-400'
                        : styles.subtext
                    }`}
                  >
                    <Icons.Mail className="h-4 w-4" />
                    الرسائل
                    {localMessages.filter(m => m.sender_id === teacherId && !m.is_read).length > 0 && (
                      <span className="bg-blue-500/20 text-blue-600 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded-full">
                        {localMessages.filter(m => m.sender_id === teacherId && !m.is_read).length}
                      </span>
                    )}
                    {activeTab === 'messages' && (
                      <motion.span
                        layoutId="tab-indicator"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600"
                      />
                    )}
                  </button>
                </div>
              )}

              {/* المحتوى */}
              <div className="flex-1 overflow-y-auto p-5 custom-scrollbar" style={{ direction: 'rtl' }}>
                <AnimatePresence mode="wait">
                  {!notificationsEnabled ? (
                    <motion.div
                      key="disabled"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex flex-col items-center justify-center h-64 text-center"
                    >
                      <Icons.BellOff className="h-20 w-20 text-gray-400 mb-4" />
                      <h3 className={`text-2xl font-bold ${styles.text}`}>الإشعارات معطلة</h3>
                      <p className={`text-base ${styles.subtext} mt-2`}>
                        يمكنك تفعيل الإشعارات من خلال زر الجرس أعلى النافذة.
                      </p>
                    </motion.div>
                  ) : activeTab === 'announcements' ? (
                    <motion.div
                      key="announcements"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      {filteredAnnouncements.length === 0 ? (
                        <div className="text-center py-16">
                          <Icons.Megaphone className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                          <p className={`text-lg ${styles.subtext}`}>لا توجد إعلانات جديدة</p>
                        </div>
                      ) : (
                        filteredAnnouncements.map((ann) => (
                          <AnnouncementItem
                            key={ann.id}
                            announcement={ann}
                            studentId={studentId}
                            onLikeToggle={handleLikeToggle}
                            styles={styles}
                          />
                        ))
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="messages"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.3 }}
                      className="space-y-2"
                    >
                      {localMessages.length === 0 ? (
                        <div className="text-center py-16">
                          <Icons.Inbox className="h-16 w-16 text-gray-400 mx-auto mb-3" />
                          <p className={`text-lg ${styles.subtext}`}>صندوق الوارد فارغ</p>
                        </div>
                      ) : (
                        localMessages.map((msg) => (
                          <MessageItem
                            key={msg.id}
                            message={msg}
                            teacherId={teacherId}
                            studentId={studentId}
                            onReplySent={handleReplySent}
                            styles={styles}
                          />
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* تذييل */}
              <div className={`p-3 text-center border-t ${styles.border} flex-shrink-0`}>
                <span className={`text-[10px] ${styles.subtext} opacity-50`}>
                  {notificationsEnabled
                    ? `📌 ${activeTab === 'announcements' ? filteredAnnouncements.length : localMessages.length} عنصر`
                    : '🔕 الإشعارات موقفة'}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// إضافة ستايل التمرير المخصص
if (typeof document !== 'undefined') {
  const styleEl = document.createElement('style');
  styleEl.innerHTML = `
    .custom-scrollbar::-webkit-scrollbar {
      width: 6px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }
    .dark .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.15);
    }
  `;
  document.head.appendChild(styleEl);
}