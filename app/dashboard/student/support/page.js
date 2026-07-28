'use client';
// ================================================================
// 🆘 المسار: app/dashboard/student/support/page.js
// مركز الدعم الشامل للطالب – نسخة فاخرة مع أيقونات واضحة
// ================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// الثوابت والترجمات
// ================================================================
const SUPPORT_TYPES = {
  technical: {
    label: { ar: 'شكوى فنية', en: 'Technical Complaint' },
    icon: Icons.Wrench,
    color: 'from-red-500 to-orange-600',
    description: {
      ar: 'إذا كنت تواجه مشكلة تقنية في المنصة، مثل فيديو لا يعمل، خطأ في الامتحان، أو صعوبة في التصفح. سنقوم بمساعدتك في أسرع وقت.',
      en: 'If you are facing a technical issue on the platform, such as a non-working video, exam error, or browsing difficulties. We will help you ASAP.'
    }
  },
  academic: {
    label: { ar: 'سؤال أكاديمي', en: 'Academic Question' },
    icon: Icons.BookOpen,
    color: 'from-blue-500 to-indigo-600',
    description: {
      ar: 'إذا كان لديك استفسار دراسي حول مادة اللغة الإنجليزية، أو أي سؤال متعلق بالمنهج. معلمك سيجيبك مباشرة.',
      en: 'If you have an academic inquiry about the English subject or any curriculum-related question. Your teacher will answer directly.'
    }
  }
};

const STATUS_MAP = {
  open: { ar: 'بانتظار الرد', en: 'Pending', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  in_progress: { ar: 'تم الرد', en: 'Answered', color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  resolved: { ar: 'محلولة', en: 'Resolved', color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  closed: { ar: 'مغلقة', en: 'Closed', color: 'text-gray-500', bg: 'bg-gray-500/10', border: 'border-gray-500/20' },
};

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
// عداد متحرك
// ================================================================
const AnimatedCounter = ({ target, duration = 1000, styles }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = target / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
          }, 16);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref} className="font-extrabold">{count}</span>;
};

// ================================================================
// المكون الرئيسي – نسخة فاخرة مع أيقونات واضحة
// ================================================================
export default function StudentSupportHub() {
  const router = useRouter();
  const { theme, language, styles } = useTheme();
  const isArabic = language === 'ar';

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [filter, setFilter] = useState('all');
  const [greeting, setGreeting] = useState('');

  const [techColor, setTechColor] = useState(CARD_COLORS[2]); // برتقالي
  const [acadColor, setAcadColor] = useState(CARD_COLORS[0]); // أزرق

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) { router.push('/login'); return; }
      setUser(currentUser);

      const { data: tickets, error: ticketsError } = await supabase
        .from('tickets')
        .select('*')
        .eq('student_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (ticketsError) throw ticketsError;
      setRequests(tickets || []);

      const { data: bans, error: bansError } = await supabase
        .from('support_bans')
        .select('*')
        .eq('student_id', currentUser.id)
        .is('unbanned_at', null)
        .maybeSingle();

      if (bansError) console.error('Error checking ban:', bansError);
      else if (bans) { setIsBanned(true); setBanInfo(bans); }
      else { setIsBanned(false); setBanInfo(null); }
    } catch (err) {
      console.error('Error fetching support data:', err);
      toast.error(isArabic ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [router, isArabic]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (language === 'ar') {
      if (hour < 12) setGreeting('صباح الخير');
      else if (hour < 18) setGreeting('مساء الخير');
      else setGreeting('مساء الخير');
    } else {
      if (hour < 12) setGreeting('Good Morning');
      else if (hour < 18) setGreeting('Good Afternoon');
      else setGreeting('Good Evening');
    }
  }, [language]);

  const filteredRequests = useMemo(() => {
    let result = [...requests];
    if (filter === 'open') result = result.filter(r => r.status === 'open' || r.status === 'in_progress');
    else if (filter === 'resolved') result = result.filter(r => r.status === 'resolved' || r.status === 'closed');
    else if (filter === 'technical') result = result.filter(r => r.support_type === 'technical');
    else if (filter === 'academic') result = result.filter(r => r.support_type === 'academic');
    return result;
  }, [requests, filter]);

  const stats = useMemo(() => {
    const pending = requests.filter(r => r.status === 'open').length;
    const answered = requests.filter(r => r.status === 'in_progress').length;
    const resolved = requests.filter(r => r.status === 'resolved').length;
    return { pending, answered, resolved, total: requests.length };
  }, [requests]);

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const getStatusInfo = (status) => STATUS_MAP[status] || STATUS_MAP.open;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} p-6 md:p-8`} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-7xl mx-auto space-y-10">
        {/* ---------- Header فاخر ---------- */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 200 }}
          className="text-center"
        >
          <h1 className="text-5xl md:text-6xl font-black">
            {greeting}،{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 dark:from-blue-300 dark:via-blue-400 dark:to-blue-500 bg-[length:300%] animate-gradient">
              {isArabic ? 'كيف نقدر نساعدك؟' : 'how can we help?'}
            </span>
          </h1>
          <p className={`${styles.subtext} text-lg mt-4 max-w-2xl mx-auto`}>
            {isArabic
              ? 'مركز الدعم الفني والأكاديمي. اختر نوع المساعدة وسنعاود الرد في أقرب وقت.'
              : 'Technical and academic support hub. Choose the type of help you need and we will respond shortly.'}
          </p>
        </motion.div>

        {/* ---------- تنبيه الحظر ---------- */}
        <AnimatePresence>
          {isBanned && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <WaveBorderCard initialColor="red">
                <div className="p-6 flex items-start gap-5 backdrop-blur-sm">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <Icons.AlertTriangle className="h-8 w-8 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-red-400 text-xl">
                      {isArabic ? 'تم حظرك من إرسال الشكاوى والأسئلة' : 'You have been banned from submitting requests'}
                    </h3>
                    <p className="text-base text-red-300 mt-1">
                      {isArabic
                        ? 'يرجى التواصل مع معلمك مباشرة لحل المشكلة. هذا القرار خاص بالمعلم.'
                        : 'Please contact your teacher directly to resolve this issue. This decision is at the teacher\'s discretion.'}
                    </p>
                    {banInfo?.banned_at && (
                      <p className="text-sm text-red-400/70 mt-2">
                        {isArabic ? 'تاريخ الحظر: ' : 'Banned since: '}
                        {new Date(banInfo.banned_at).toLocaleDateString(isArabic ? 'ar-EG' : 'en-US', {
                          year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    )}
                  </div>
                  <Icons.ShieldOff className="h-12 w-12 text-red-400/50 flex-shrink-0" />
                </div>
              </WaveBorderCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- إحصائيات سريعة ---------- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {[
            { label: isArabic ? 'الطلبات' : 'Total', value: stats.total, color: 'text-blue-500 dark:text-blue-400', icon: Icons.Inbox },
            { label: isArabic ? 'معلقة' : 'Pending', value: stats.pending, color: 'text-amber-500 dark:text-amber-400', icon: Icons.Clock },
            { label: isArabic ? 'تم الرد' : 'Answered', value: stats.answered, color: 'text-purple-500 dark:text-purple-400', icon: Icons.MessageCircle },
            { label: isArabic ? 'محلولة' : 'Resolved', value: stats.resolved, color: 'text-green-500 dark:text-green-400', icon: Icons.CheckCircle },
          ].map((stat, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className={`${styles.card} border ${styles.border} rounded-2xl p-6 flex items-center gap-4 shadow-lg hover:shadow-xl transition`}
            >
              <stat.icon className={`h-8 w-8 ${stat.color}`} />
              <div>
                <p className="text-3xl font-black"><AnimatedCounter target={stat.value} styles={styles} /></p>
                <p className={`text-sm ${styles.subtext}`}>{stat.label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* ---------- بطاقات الخيارات الرئيسية (أيقونات واضحة) ---------- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {Object.entries(SUPPORT_TYPES).map(([type, info]) => {
            const IconComponent = info.icon;
            const isTech = type === 'technical';
            const currentColor = isTech ? techColor : acadColor;
            const setColor = isTech ? setTechColor : setAcadColor;

            return (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={!isBanned ? { scale: 1.02, y: -6 } : {}}
                whileTap={!isBanned ? { scale: 0.98 } : {}}
                transition={{ type: 'spring', stiffness: 200 }}
              >
                <WaveBorderCard
                  initialColor={currentColor.name}
                  onColorChange={setColor}
                >
                  <button
                    disabled={isBanned}
                    onClick={() => {
                      if (!isBanned) router.push(`/dashboard/student/support/${type}`);
                    }}
                    className={`w-full text-right p-8 transition-all duration-300 ${
                      isBanned ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-5">
                        {/* أيقونة مع خلفية واضحة وتباين عالٍ */}
                        <div className="flex items-center gap-4">
                          <div className={`p-4 rounded-2xl bg-gradient-to-br ${info.color} shadow-lg`}>
                            <IconComponent className="h-10 w-10 text-white drop-shadow-lg" />
                          </div>
                          <span className={`text-2xl font-bold ${styles.text}`}>
                            {info.label[language]}
                          </span>
                        </div>
                        <Icons.ArrowLeft className={`h-7 w-7 ${styles.subtext} group-hover:translate-x-1 transition-transform`} />
                      </div>
                      <p className={`${styles.subtext} text-base leading-relaxed flex-1 pr-4`}>
                        {info.description[language]}
                      </p>
                      <div className={`mt-5 h-1 w-full bg-gradient-to-r ${info.color} rounded-full transform origin-right scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
                      {isBanned && (
                        <div className="mt-4 flex items-center gap-2 text-sm text-red-400">
                          <Icons.Lock className="h-4 w-4" />
                          {isArabic ? 'محظور' : 'Banned'}
                        </div>
                      )}
                    </div>
                  </button>
                </WaveBorderCard>
              </motion.div>
            );
          })}
        </div>

        {/* ---------- طلباتي السابقة ---------- */}
        <div>
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <h2 className="text-3xl font-bold flex items-center gap-3">
              <Icons.Clock className="h-8 w-8 text-blue-500 dark:text-blue-400" />
              {isArabic ? 'طلباتي السابقة' : 'My Previous Requests'}
            </h2>
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', ar: 'الكل', en: 'All' },
                { key: 'open', ar: 'معلقة', en: 'Pending' },
                { key: 'resolved', ar: 'محلولة', en: 'Resolved' },
                { key: 'technical', ar: 'فنية', en: 'Technical' },
                { key: 'academic', ar: 'أكاديمية', en: 'Academic' }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setFilter(f.key)}
                  className={`px-4 py-1.5 text-sm rounded-full border transition ${
                    filter === f.key
                      ? 'bg-blue-500/20 border-blue-500 text-blue-500 dark:text-blue-400'
                      : `${styles.card} ${styles.border} ${styles.subtext}`
                  }`}
                >
                  {isArabic ? f.ar : f.en}
                </button>
              ))}
            </div>
          </div>

          {filteredRequests.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`text-center py-20 ${styles.card} rounded-3xl border ${styles.border}`}
            >
              <Icons.Inbox className="h-20 w-20 text-gray-500 mx-auto mb-5" />
              <p className="text-2xl font-bold">{isArabic ? 'لا توجد طلبات' : 'No requests yet'}</p>
              <p className={`${styles.subtext} text-base mt-2`}>
                {isArabic
                  ? 'عندما ترسل شكوى أو سؤال، ستظهر هنا.'
                  : 'When you submit a complaint or question, it will appear here.'}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-5">
              {filteredRequests.map((req, idx) => {
                const statusInfo = getStatusInfo(req.status);
                const typeInfo = SUPPORT_TYPES[req.support_type] || SUPPORT_TYPES.technical;
                const TypeIcon = typeInfo.icon;
                const cardColor = CARD_COLORS[idx % CARD_COLORS.length];
                return (
                  <motion.div
                    key={req.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.01, borderColor: 'rgba(59,130,246,0.4)' }}
                    onClick={() => router.push(`/dashboard/student/support/${req.id}`)}
                    className={`${styles.card} border ${styles.border} rounded-2xl p-6 cursor-pointer hover:shadow-xl transition group`}
                  >
                    <div className="flex items-start gap-5">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${typeInfo.color} bg-opacity-20 flex-shrink-0`}>
                        <TypeIcon className={`h-7 w-7 ${cardColor.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-2">
                          <span className={`text-sm px-3 py-0.5 rounded-full ${statusInfo.bg} ${statusInfo.color} ${statusInfo.border} border`}>
                            {statusInfo[language]}
                          </span>
                          <span className={`text-sm ${styles.subtext}`}>
                            {typeInfo.label[language]}
                          </span>
                          {req.replies && req.replies.length > 0 && (
                            <span className="text-sm text-blue-500 dark:text-blue-400 flex items-center gap-1">
                              <Icons.MessageSquare className="h-4 w-4" />
                              {req.replies.length}
                            </span>
                          )}
                        </div>
                        <h3 className={`text-xl font-bold ${styles.text} truncate`}>{req.subject}</h3>
                        <p className={`text-sm ${styles.subtext} mt-1`}>{formatDate(req.created_at)}</p>
                      </div>
                      <Icons.ChevronLeft className={`h-6 w-6 ${styles.subtext} flex-shrink-0 mt-2 group-hover:translate-x-1 transition-transform`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}