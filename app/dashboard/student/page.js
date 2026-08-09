// app/dashboard/student/page.js
// ================================================================
// 🏛️ الصفحة الرئيسية للطالب – نسخة فائقة السرعة على الموبايل، وفاخرة على الديسكتوب
// ✅ تعطيل جميع تأثيرات التهنيج على الهواتف (backdrop-filter, animations, scale)
// ✅ تقليص حجم العناصر بشكل ذكي مع بقاء الأيقونات واضحة
// ✅ الحفاظ على الأنيميشن الفاخر على الأجهزة الكبيرة (hover, scale, glow)
// ✅ استخدام React.memo و useMemo لتحسين الأداء
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
// ✅ استيراد فردي للأيقونات لتقليل حجم الباندل
import {
  BookOpen,
  Video,
  FileQuestion,
  Bell,
  AlarmClock,
  Activity,
  Megaphone,
  Lightbulb,
  StickyNote,
  Search,
  HelpCircle,
  TrendingUp,
  User,
  Calendar,
  ArrowRight,
  X,
  ChevronRight,
  ChevronLeft,
} from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationDrawer from '@/app/dashboard/student/components/NotificationDrawer';

// ================================================================
// دوال IndexedDB للملاحظات (بدون تغيير)
// ================================================================
const NOTES_DB_NAME = 'StudentNotesDB_V4';
const NOTES_DB_VERSION = 4;
const NOTES_STORE_NAME = 'notes';

function openNotesDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(NOTES_DB_NAME, NOTES_DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(NOTES_STORE_NAME)) {
        const store = db.createObjectStore(NOTES_STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
        store.createIndex('pinned', 'pinned', { unique: false });
        store.createIndex('color', 'color', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getLatestNote() {
  try {
    const db = await openNotesDB();
    const transaction = db.transaction(NOTES_STORE_NAME, 'readonly');
    const store = transaction.objectStore(NOTES_STORE_NAME);
    const allNotes = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    if (!allNotes.length) return null;
    const pinned = allNotes.filter(n => n.pinned);
    const target = pinned.length > 0
      ? pinned.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0]
      : allNotes.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return target;
  } catch { return null; }
}

// ================================================================
// دوال مساعدة (بدون تغيير)
// ================================================================
function timeAgo(dateString, language = 'ar') {
  if (!dateString) return language === 'ar' ? 'الآن' : 'just now';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return language === 'ar' ? 'تاريخ غير صحيح' : 'invalid date';
  const now = new Date();
  const diffMs = now - date;
  if (diffMs < 0) return language === 'ar' ? 'الآن' : 'just now';
  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return language === 'ar' ? 'الآن' : 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return language === 'ar' ? `منذ ${minutes} دقيقة` : `${minutes} minutes ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return language === 'ar' ? `منذ ${hours} ساعة` : `${hours} hours ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return language === 'ar' ? `منذ ${days} يوم` : `${days} days ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return language === 'ar' ? `منذ ${months} شهر` : `${months} months ago`;
  }
  const years = Math.floor(months / 12);
  if (years > 5) {
    return date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  return language === 'ar' ? `منذ ${years} سنة` : `${years} years ago`;
}

function getDaysSinceJoin(createdAt) {
  if (!createdAt) return 0;
  const joinDate = new Date(createdAt);
  if (isNaN(joinDate.getTime())) return 0;
  const now = new Date();
  const diffTime = Math.abs(now - joinDate);
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// ================================================================
// 0. Hook للكشف عن الأجهزة التي تدعم hover (وتعطيله على الموبايل)
// ================================================================
function useHoverable() {
  const [isHoverable, setIsHoverable] = useState(false);
  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover)');
    setIsHoverable(mediaQuery.matches);
    const handler = (e) => setIsHoverable(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);
  return isHoverable;
}

// ================================================================
// 1. عداد متحرك (يُبطل على الموبايل)
// ================================================================
const AnimatedCounter = memo(({ value, duration = 1.2, suffix = '' }) => {
  const [count, setCount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    // على الموبايل نعرض القيمة مباشرة بدون أنيميشن
    if (isMobile) {
      setCount(parseInt(value, 10) || 0);
      return;
    }
    let start = 0;
    const end = parseInt(value, 10) || 0;
    if (end === 0) return;
    const increment = end / (duration * 60);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 1000 / 60);
    return () => clearInterval(timer);
  }, [value, duration, isMobile]);

  // ✅ على الموبايل نزيل تأثير الـ scale
  if (isMobile) {
    return <span>{count}{suffix}</span>;
  }

  return <motion.span animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>{count}{suffix}</motion.span>;
});
AnimatedCounter.displayName = 'AnimatedCounter';

// ================================================================
// 2. عداد أيام الانضمام – مصغر ومبسط على الموبايل
// ================================================================
const MembershipCounter = memo(({ days, styles, language }) => {
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <motion.div
      initial={!isMobile ? { opacity: 0, scale: 0.9 } : {}}
      animate={{ opacity: 1, scale: 1 }}
      transition={!isMobile ? { duration: 0.5, type: 'spring', stiffness: 200 } : {}}
      className={`px-2 xs:px-3 py-1.5 xs:py-2 rounded-xl border ${styles.border} shadow-sm text-center min-w-[60px] xs:min-w-[80px] ${styles.card}`}
      style={{
        // على الموبايل نزيل backdrop-blur
        backdropFilter: isMobile ? 'none' : 'blur(4px)',
        WebkitBackdropFilter: isMobile ? 'none' : 'blur(4px)',
      }}
    >
      <div className="text-lg xs:text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
        {days}
      </div>
      <div className="text-[6px] xs:text-[8px] sm:text-[10px] font-medium text-blue-600/80 dark:text-blue-400/80 mt-0.5">
        {language === 'ar' ? 'يوم' : 'Days'}
      </div>
    </motion.div>
  );
});
MembershipCounter.displayName = 'MembershipCounter';

// ================================================================
// 3. ألوان البطاقات (بدون تغيير)
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
// 4. مكون الحدود الموجية – محسّن للموبايل (200ms, بدون backdrop)
// ================================================================
const WaveBorderCard = memo(({ children, className = '', initialColor = 'blue', onColorChange }) => {
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);
  const [isMobile, setIsMobile] = useState(false);

  // كشف الموبايل
  useEffect(() => {
    const checkMobile = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    // ✅ على الموبايل نبطئ الحركة جداً (200ms) أو نوقفها تماماً إذا أردنا
    // هنا نتركها تعمل ببطء شديد للحفاظ على بعض الجمال
    const intervalTime = isMobile ? 300 : 80;
    const interval = setInterval(() => {
      if (!isMounted.current) return;
      setRotation(prev => {
        const step = isMobile ? 1 : 2;
        const newRot = prev + step;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, intervalTime);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [isMobile, onColorChange]);

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
    padding: '2px', // تصغير الحواف على الموبايل
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={`relative rounded-xl sm:rounded-2xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-xl sm:rounded-2xl" style={gradientStyle} />
      <div 
        className="relative z-10 h-full w-full rounded-xl sm:rounded-2xl border border-[var(--border-color)]"
        style={{
          // ✅ على الموبايل نزيل backdrop-blur تماماً، ونستخدم خلفية صلبة
          backgroundColor: isMobile ? 'var(--bg-card)' : 'var(--bg-card)',
          backdropFilter: isMobile ? 'none' : 'blur(6px)',
          WebkitBackdropFilter: isMobile ? 'none' : 'blur(6px)',
        }}
      >
        {children}
      </div>
    </div>
  );
});
WaveBorderCard.displayName = 'WaveBorderCard';

// ================================================================
// 5. بطاقة إحصائية – مع تعطيل hover على الموبايل
// ================================================================
const LargeStatCard = memo(({ icon: Icon, label, value, styles, delay = 0 }) => {
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [isHovered, setIsHovered] = useState(false);
  const isHoverable = useHoverable();

  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      onMouseEnter={() => isHoverable && setIsHovered(true)}
      onMouseLeave={() => isHoverable && setIsHovered(false)}
      whileHover={isHoverable ? { scale: 1.02 } : {}}
      className="h-full"
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-2 xs:p-3 sm:p-4 flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={`text-[8px] xs:text-[10px] sm:text-xs font-medium ${styles.subtext} mb-0.5 truncate`}>{label}</p>
            <p className={`text-lg xs:text-xl sm:text-2xl font-black ${styles.text}`}>
              <AnimatedCounter value={value} />
            </p>
          </div>
          <motion.div
            animate={isHovered ? { scale: 1.1, rotate: 4 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={`p-1.5 xs:p-2 rounded-xl ${color.bg} shadow-sm flex-shrink-0`}
          >
            <Icon className={`h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 ${color.text}`} />
          </motion.div>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
});
LargeStatCard.displayName = 'LargeStatCard';

// ================================================================
// 6. بطاقة كورس – مع تعطيل hover على الموبايل
// ================================================================
const LargeCourseCard = memo(({ course, progress, styles, theme, language }) => {
  const router = useRouter();
  const [color, setColor] = useState(CARD_COLORS[1]);
  const [isHovered, setIsHovered] = useState(false);
  const isHoverable = useHoverable();

  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      whileHover={isHoverable ? { scale: 1.015, y: -3 } : {}}
      onMouseEnter={() => isHoverable && setIsHovered(true)}
      onMouseLeave={() => isHoverable && setIsHovered(false)}
      className="relative cursor-pointer h-full"
      onClick={() => router.push(`/dashboard/student/courses/${course.id}`)}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-2 xs:p-3 sm:p-4">
          <div className="flex items-start justify-between mb-1.5 xs:mb-2">
            <div className="flex items-center gap-1.5 xs:gap-2 min-w-0 flex-1">
              <motion.div
                animate={isHovered ? { scale: 1.1, rotate: [0, -4, 4, -4, 0] } : { scale: 1 }}
                transition={{ duration: 0.3 }}
                className={`h-8 w-8 xs:h-10 xs:w-10 sm:h-12 sm:w-12 rounded-lg xs:rounded-xl ${color.bg} flex items-center justify-center shadow-sm flex-shrink-0`}
              >
                <BookOpen className={`h-4 w-4 xs:h-5 xs:w-5 sm:h-6 sm:w-6 ${color.text}`} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-[10px] xs:text-xs sm:text-sm font-bold truncate ${styles.text}`}>{course.title}</h4>
                <p className={`text-[8px] xs:text-[10px] ${styles.subtext} truncate`}>{course.category || (language === 'ar' ? 'كورس' : 'Course')}</p>
              </div>
            </div>
            <motion.div
              animate={isHovered ? { x: 6, opacity: 1 } : { x: 0, opacity: 0.5 }}
              className={`${color.text} flex-shrink-0 hidden xs:block`}
            >
              <ArrowRight className="h-3 w-3 xs:h-4 xs:w-4" />
            </motion.div>
          </div>

          <div className="mt-1.5 xs:mt-2">
            <div className="flex justify-between text-[8px] xs:text-[10px] sm:text-xs mb-0.5 xs:mb-1">
              <span className={styles.subtext}>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
              <span className={`${color.text} font-bold`}>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1 xs:h-1.5 sm:h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${color.text} rounded-full`}
              />
            </div>
          </div>

          {isHovered && isHoverable && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              className="absolute bottom-2 right-2 z-10"
            >
              <span className={`px-1.5 xs:px-2 py-0.5 rounded-full ${color.bg} ${color.text} text-[6px] xs:text-[8px] sm:text-[10px] font-bold border ${color.border}`}>
                {progress >= 100 ? '✅ مكتمل' : progress >= 50 ? '🚀 متقدم' : '📖 جديد'}
              </span>
            </motion.div>
          )}
        </div>
      </WaveBorderCard>
    </motion.div>
  );
});
LargeCourseCard.displayName = 'LargeCourseCard';

// ================================================================
// 7. بطاقة الإعلانات – مع تحسينات للموبايل
// ================================================================
const SuperAnnouncements = memo(({ announcements, styles, language }) => {
  const [expanded, setExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = announcements.length;
  const [color, setColor] = useState(CARD_COLORS[2]);
  const [isHovered, setIsHovered] = useState(false);
  const isHoverable = useHoverable();

  const handleColorChange = (newColor) => setColor(newColor);

  if (totalPages === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
          <div className="p-2 xs:p-3 space-y-2">
            <div className="flex items-center gap-1 xs:gap-1.5">
              <Megaphone className={`h-3 w-3 xs:h-3.5 xs:w-3.5 ${color.text}`} />
              <h3 className={`text-xs xs:text-sm font-bold ${styles.text}`}>{language === 'ar' ? 'الإعلانات' : 'Announcements'}</h3>
            </div>
            <div className="text-center py-2 xs:py-3">
              <Megaphone className={`h-8 w-8 xs:h-10 xs:w-10 ${styles.subtext} mx-auto mb-1`} />
              <p className={`text-[10px] xs:text-xs ${styles.subtext}`}>{language === 'ar' ? 'لا توجد إعلانات' : 'No announcements'}</p>
            </div>
            <div className={`flex items-start gap-1.5 xs:gap-2 p-2 rounded-lg ${color.bg} border ${color.border}`}>
              <Lightbulb className={`h-3 w-3 xs:h-3.5 xs:w-3.5 ${color.text} mt-0.5 flex-shrink-0`} />
              <p className={`text-[8px] xs:text-[10px] ${styles.subtext}`}>
                {language === 'ar' ? 'خصص 30 دقيقة يومياً للمراجعة!' : '30 min daily revision!'}
              </p>
            </div>
          </div>
        </WaveBorderCard>
      </motion.div>
    );
  }

  const nextPage = () => setCurrentPage((prev) => (prev + 1) % totalPages);
  const prevPage = () => setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
  const [direction, setDirection] = useState(0);

  const handleNext = () => { setDirection(1); nextPage(); };
  const handlePrev = () => { setDirection(-1); prevPage(); };

  const toggleExpand = () => setExpanded(!expanded);

  const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderAnnouncementPreview = () => {
    const announcement = announcements[currentPage];
    return (
      <div className={`flex items-start gap-1.5 xs:gap-2 p-2 rounded-lg border ${styles.border} cursor-pointer transition ${styles.card}`}>
        <div className={`rounded-lg ${color.bg} ${color.text} flex-shrink-0 p-1`}>
          <Megaphone className="h-3 w-3 xs:h-3.5 xs:w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-[10px] xs:text-xs font-bold ${styles.text} mb-0.5`}>{announcement.title}</h4>
          <p className={`text-[8px] xs:text-[10px] ${styles.subtext} leading-relaxed`}>
            {truncateText(announcement.body, 60)}
          </p>
          <p className={`text-[6px] xs:text-[8px] ${styles.subtext} mt-0.5`}>
            {new Date(announcement.created_at).toLocaleDateString(
              language === 'ar' ? 'ar-EG' : 'en-US',
              { month: 'short', day: 'numeric' }
            )}
          </p>
        </div>
      </div>
    );
  };

  const renderAnnouncementFull = () => {
    const announcement = announcements[currentPage];
    return (
      <div className={`flex items-start gap-2 xs:gap-3 p-3 xs:p-4 rounded-lg border ${styles.border} ${styles.card}`}>
        <div className={`rounded-lg ${color.bg} ${color.text} flex-shrink-0 p-1.5 xs:p-2`}>
          <Megaphone className="h-5 w-5 xs:h-6 xs:w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-sm xs:text-base font-bold ${styles.text} mb-1`}>{announcement.title}</h4>
          <p className={`text-xs xs:text-sm ${styles.subtext} leading-relaxed whitespace-pre-wrap`}>{announcement.body}</p>
          <p className={`text-[8px] xs:text-[10px] ${styles.subtext} mt-2`}>
            {new Date(announcement.created_at).toLocaleDateString(
              language === 'ar' ? 'ar-EG' : 'en-US',
              { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }
            )}
          </p>
        </div>
      </div>
    );
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onMouseEnter={() => isHoverable && setIsHovered(true)}
        onMouseLeave={() => isHoverable && setIsHovered(false)}
        className="relative"
      >
        <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
          <motion.div
            animate={isHovered && isHoverable ? { scale: 1.01 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="p-2 xs:p-3"
          >
            <div className="flex items-center justify-between mb-1 xs:mb-1.5">
              <div className="flex items-center gap-1">
                <Megaphone className={`h-3 w-3 xs:h-3.5 xs:w-3.5 ${color.text}`} />
                <h3 className={`text-[10px] xs:text-xs sm:text-sm font-bold ${styles.text}`}>{language === 'ar' ? 'الإعلانات' : 'Announcements'}</h3>
                <span className={`text-[6px] xs:text-[8px] px-1 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                  {currentPage + 1}/{totalPages}
                </span>
              </div>
              <div className="flex items-center gap-0.5">
                <button onClick={handlePrev} className={`p-0.5 rounded hover:bg-white/10 transition ${color.text}`}>
                  <ChevronRight className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
                </button>
                <button onClick={handleNext} className={`p-0.5 rounded hover:bg-white/10 transition ${color.text}`}>
                  <ChevronLeft className="h-2.5 w-2.5 xs:h-3 xs:w-3" />
                </button>
              </div>
            </div>

            <div onClick={toggleExpand} className="cursor-pointer">
              {renderAnnouncementPreview()}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-1 mt-1.5">
                {Array.from({ length: Math.min(totalPages, 5) }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={`h-1 rounded-full transition-all duration-300 ${idx === currentPage ? `w-2 xs:w-3 ${color.bg}` : `w-1 ${styles.subtext}`}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </WaveBorderCard>
      </motion.div>

      {/* المودال عند التوسيع */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 xs:p-4"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`relative w-full max-w-2xl max-h-[80vh] overflow-y-auto rounded-xl border ${color.border} shadow-xl p-3 xs:p-4 ${styles.card}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setExpanded(false)} className={`absolute top-2 right-2 p-1 rounded-full bg-white/10 hover:bg-white/20 transition ${color.text}`}>
                <X className="h-4 w-4 xs:h-5 xs:w-5" />
              </button>
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <Megaphone className={`h-4 w-4 xs:h-5 xs:w-5 ${color.text}`} />
                  <h2 className={`text-lg xs:text-xl font-bold ${styles.text}`}>{language === 'ar' ? 'الإعلانات' : 'Announcements'}</h2>
                  <span className={`text-[8px] xs:text-[10px] px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>{currentPage+1}/{totalPages}</span>
                </div>
                {renderAnnouncementFull()}
                <div className="flex justify-center gap-2">
                  <button onClick={handlePrev} className={`p-1 rounded ${color.text} hover:bg-white/10`}>
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <button onClick={handleNext} className={`p-1 rounded ${color.text} hover:bg-white/10`}>
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});
SuperAnnouncements.displayName = 'SuperAnnouncements';

// ================================================================
// 8. بطاقة الملاحظة – مع تعطيل hover على الموبايل
// ================================================================
const LargeNoteCard = memo(({ latestNote, language, styles, theme }) => {
  const router = useRouter();
  const [color, setColor] = useState(CARD_COLORS[4]);
  const [isHovered, setIsHovered] = useState(false);
  const isHoverable = useHoverable();

  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      whileHover={isHoverable ? { scale: 1.015, y: -2 } : {}}
      onMouseEnter={() => isHoverable && setIsHovered(true)}
      onMouseLeave={() => isHoverable && setIsHovered(false)}
      onClick={() => router.push('/dashboard/student/notes')}
      className="relative cursor-pointer h-full"
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-2 xs:p-3 sm:p-4">
          <div className="flex items-center gap-1 xs:gap-1.5 mb-1 xs:mb-1.5">
            <div className={`p-1 rounded-lg ${color.bg}`}>
              <StickyNote className={`h-3 w-3 xs:h-3.5 xs:w-3.5 sm:h-4 sm:w-4 ${color.text}`} />
            </div>
            <h3 className={`text-[10px] xs:text-xs sm:text-sm font-bold ${styles.text}`}>{language === 'ar' ? 'آخر ملاحظة' : 'Recent Note'}</h3>
          </div>
          {latestNote ? (
            <div className="space-y-1">
              <div className="flex items-start gap-1.5">
                <span className="text-lg xs:text-xl">{latestNote.emoji || '📝'}</span>
                <p className={`text-[10px] xs:text-xs ${styles.text} line-clamp-3 leading-relaxed`}>{latestNote.note}</p>
              </div>
              <p className={`text-[8px] xs:text-[10px] ${styles.subtext}`}>
                {new Date(latestNote.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'short', day: 'numeric' })}
                {latestNote.pinned && ' 📌'}
              </p>
            </div>
          ) : (
            <p className={`text-[10px] xs:text-xs ${styles.subtext}`}>{language === 'ar' ? 'لا توجد ملاحظات' : 'No notes'}</p>
          )}
        </div>
      </WaveBorderCard>
    </motion.div>
  );
});
LargeNoteCard.displayName = 'LargeNoteCard';

// ================================================================
// 9. شريط المعلومات اليومية – مبسط على الموبايل
// ================================================================
const LanguageTipCarousel = memo(({ language, styles }) => {
  const tips = [
    { ar: 'اللغة الإنجليزية هي اللغة الرسمية في 67 دولة حول العالم.', en: 'English is the official language in 67 countries.' },
    { ar: 'أكثر الكلمات استخداماً في الإنجليزية هي "the" – تظهر في كل جملة تقريباً!', en: 'The most common word in English is "the".' },
    { ar: 'اللغة الإنجليزية تحتوي على 26 حرفاً فقط، ولكنها تضم أكثر من 500,000 كلمة!', en: 'English has 26 letters, but over 500,000 words!' },
    { ar: 'أطول كلمة في الإنجليزية هي "pneumonoultramicroscopicsilicovolcanoconiosis" – تشير إلى مرض رئوي.', en: 'Longest word: pneumonoultramicroscopicsilicovolcanoconiosis.' },
    { ar: 'كلمة "set" لها أكثر من 430 معنى مختلف في قاموس أكسفورد!', en: '"set" has over 430 meanings in Oxford Dictionary!' },
    { ar: 'أقصر جملة مكتملة في الإنجليزية هي "I am" – تحتوي على فاعل وفعل.', en: 'Shortest sentence: "I am".' },
    { ar: 'كلمة "Goodbye" جاءت من عبارة "God be with you" التي اختصرت.', en: '"Goodbye" comes from "God be with you".' },
    { ar: 'اللغة الإنجليزية تتغير باستمرار – يتم إضافة حوالي 1000 كلمة جديدة كل عام!', en: 'About 1000 new words added every year!' },
    { ar: 'أول قاموس إنجليزي كتبه صامويل جونسون عام 1755 واستغرق 9 سنوات.', en: 'First English dictionary took 9 years (1755).' },
    { ar: 'كلمة "queue" هي الكلمة الوحيدة التي تنطق كما لو كانت حرفاً واحداً (Q).', en: '"queue" is pronounced like the letter Q.' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [color, setColor] = useState(CARD_COLORS[5]);
  const totalTips = tips.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalTips);
    }, 10000);
    return () => clearInterval(interval);
  }, [totalTips]);

  const tip = tips[currentIndex];
  const tipText = language === 'ar' ? tip.ar : tip.en;

  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      key={currentIndex}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-2 xs:p-3 sm:p-4">
          <div className="flex items-start gap-1.5 xs:gap-2">
            <div className={`p-1 rounded-lg ${color.bg} flex-shrink-0`}>
              <Lightbulb className={`h-3.5 w-3.5 xs:h-4 xs:w-4 sm:h-5 sm:w-5 ${color.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-[6px] xs:text-[8px] font-bold ${styles.subtext} uppercase tracking-wider mb-0.5`}>
                💡 {language === 'ar' ? 'معلومة اليوم' : 'Fact'}
              </p>
              <p className={`text-[10px] xs:text-xs sm:text-sm ${styles.text} leading-relaxed`}>{tipText}</p>
              <div className="flex gap-1 mt-1.5">
                {Array.from({ length: Math.min(totalTips, 5) }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-1 rounded-full transition-all duration-500 ${
                      idx === currentIndex ? `w-2 xs:w-3 ${color.bg}` : `w-1 ${styles.subtext}`
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
});
LanguageTipCarousel.displayName = 'LanguageTipCarousel';

// ================================================================
// 10. نظام التخزين المؤقت (Cache) مع انتهاء صلاحية 5 دقائق
// ================================================================
const CACHE_KEY = 'dashboard_data_cache';
const CACHE_EXPIRY_MS = 5 * 60 * 1000;

function getCachedData() {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCachedData(data) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (e) {}
}

// ================================================================
// الصفحة الرئيسية – نسخة فائقة السرعة على الموبايل
// ================================================================
export default function StudentDashboard() {
  const { theme, styles, language } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [upcomingExams, setUpcomingExams] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [latestNote, setLatestNote] = useState(null);
  const [stats, setStats] = useState({
    coursesEnrolled: 0, completedVideos: 0, totalExamsTaken: 0,
    xp: 0, streak: 0, rank: 1,
  });
  const [loading, setLoading] = useState(true);
  const [daysSinceJoin, setDaysSinceJoin] = useState(0);
  const fetchedRef = useRef(false);
  const cacheUsedRef = useRef(false);

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [teacherId, setTeacherId] = useState(null);

  // دوال جلب البيانات (نفسها بدون تغيير)
  const looksLikeEmailOrUsername = (text) => {
    if (!text) return true;
    if (text.includes('@')) return true;
    if (!/[\u0600-\u06FF\s]/.test(text) && !/\s/.test(text)) return true;
    return false;
  };

  const ensureValidFullName = useCallback(async (userId, currentProfile, authMetadata) => {
    if (currentProfile?.full_name && !looksLikeEmailOrUsername(currentProfile.full_name)) {
      return currentProfile;
    }
    const metaName = authMetadata?.full_name;
    if (metaName && !looksLikeEmailOrUsername(metaName)) {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({ id: userId, full_name: metaName, role: 'student' }, { onConflict: 'id' });
      if (!updateError) {
        return { ...currentProfile, full_name: metaName };
      }
    }
    return currentProfile;
  }, []);

  const fetchData = useCallback(async (userId, useCache = true) => {
    if (useCache) {
      const cached = getCachedData();
      if (cached && cached.userId === userId) {
        const { user: cachedUser, enrollments: cachedEnrolls, courses: cachedCourses,
                upcomingExams: cachedExams, recentActivity: cachedActivity,
                announcements: cachedAnns, messages: cachedMsgs, latestNote: cachedNote,
                stats: cachedStats, daysSinceJoin: cachedDays, notificationsEnabled: cachedNotif,
                teacherId: cachedTeacherId } = cached;
        setUser(cachedUser);
        setEnrollments(cachedEnrolls || []);
        setCourses(cachedCourses || []);
        setUpcomingExams(cachedExams || []);
        setRecentActivity(cachedActivity || []);
        setAnnouncements(cachedAnns || []);
        setMessages(cachedMsgs || []);
        setLatestNote(cachedNote || null);
        setStats(cachedStats || { coursesEnrolled: 0, completedVideos: 0, totalExamsTaken: 0, xp: 0, streak: 0, rank: 1 });
        setDaysSinceJoin(cachedDays || 0);
        setNotificationsEnabled(cachedNotif ?? true);
        setTeacherId(cachedTeacherId || null);
        setLoading(false);
        cacheUsedRef.current = true;
        return true;
      }
    }

    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const authMetadata = authUser?.user_metadata || {};

      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        const newProfile = {
          id: userId,
          full_name: authMetadata.full_name || '',
          email: authUser?.email || '',
          role: 'student',
          created_at: new Date().toISOString(),
        };
        const { data: inserted } = await supabase
          .from('profiles')
          .upsert(newProfile, { onConflict: 'id' })
          .select('*')
          .single();
        if (inserted) profile = inserted;
        else profile = newProfile;
      }

      profile = await ensureValidFullName(userId, profile, authMetadata);
      setUser(profile);
      setNotificationsEnabled(profile?.notifications_enabled ?? true);

      const joinDays = getDaysSinceJoin(profile?.created_at || profile?.updated_at || new Date().toISOString());
      setDaysSinceJoin(joinDays);

      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('*, courses(*)')
        .eq('student_id', userId)
        .eq('courses.is_published', true);
      const validEnrolls = enrolls?.filter(e => e.courses) || [];
      setEnrollments(validEnrolls);
      setCourses(validEnrolls.map(e => e.courses));

      if (validEnrolls.length > 0 && validEnrolls[0].courses?.teacher_id) {
        setTeacherId(validEnrolls[0].courses.teacher_id);
      }

      const [compVids, attemptedExams] = await Promise.all([
        supabase.from('watch_history').select('id', { count: 'exact', head: true }).eq('student_id', userId).eq('completed', true),
        supabase.from('exam_attempts').select('score, total_marks').eq('student_id', userId)
      ]);
      const totalExams = attemptedExams.data?.length || 0;

      const newStats = {
        coursesEnrolled: validEnrolls.length,
        completedVideos: compVids.count || 0,
        totalExamsTaken: totalExams,
        xp: profile.xp || 0,
        streak: profile.streak || 0,
        rank: profile.rank || 1,
      };
      setStats(newStats);

      if (validEnrolls.length) {
        const courseIds = validEnrolls.map(e => e.course_id);
        const { data: exams } = await supabase
          .from('exams')
          .select('*')
          .in('course_id', courseIds)
          .gte('start_date', new Date().toISOString())
          .order('start_date', { ascending: true })
          .limit(5);
        setUpcomingExams(exams || []);
      }

      const [recentWatch, examAttempts] = await Promise.all([
        supabase.from('watch_history').select('id, progress, completed, watched_at, video:videos(title)').eq('student_id', userId).order('watched_at', { ascending: false }).limit(5),
        supabase.from('exam_attempts').select('id, score, total_marks, created_at, exam:exams(title)').eq('student_id', userId).order('created_at', { ascending: false }).limit(5)
      ]);
      const videoActivity = (recentWatch.data || []).map(v => ({ type: 'video', title: v.video?.title || 'فيديو', date: v.watched_at }));
      const examActivity = (examAttempts.data || []).map(e => ({ type: 'exam', title: e.exam?.title || 'امتحان', date: e.created_at }));
      const allActivity = [...videoActivity, ...examActivity].filter(item => item.date).sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
      setRecentActivity(allActivity);

      const { data: anns, error: annError } = await supabase
        .from('announcements')
        .select(`
          *,
          course:courses(title),
          announcement_likes!left ( student_id )
        `)
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(10);

      const processedAnns = (anns || []).map(ann => {
        const likes = ann.announcement_likes || [];
        const totalLikes = likes.length;
        const userLiked = likes.some(like => like.student_id === userId);
        return { ...ann, total_likes: totalLikes, user_liked: userLiked, announcement_likes: undefined };
      });
      setAnnouncements(processedAnns);

      const teacherIdFromState = validEnrolls.length > 0 && validEnrolls[0].courses?.teacher_id;
      let msgs = [];
      if (teacherIdFromState) {
        const { data: msgsData } = await supabase
          .from('messages')
          .select('*')
          .eq('receiver_id', userId)
          .eq('sender_id', teacherIdFromState)
          .order('created_at', { ascending: false })
          .limit(20);
        if (msgsData) msgs = msgsData;
      }
      setMessages(msgs);

      const note = await getLatestNote();
      setLatestNote(note);

      const cacheData = {
        userId,
        user: profile,
        enrollments: validEnrolls,
        courses: validEnrolls.map(e => e.courses),
        upcomingExams: upcomingExams.length > 0 ? upcomingExams : [],
        recentActivity: allActivity,
        announcements: processedAnns,
        messages: msgs,
        latestNote: note,
        stats: newStats,
        daysSinceJoin: joinDays,
        notificationsEnabled: profile?.notifications_enabled ?? true,
        teacherId: teacherIdFromState || null,
      };
      setCachedData(cacheData);
      setLoading(false);
      return true;
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
      setLoading(false);
      return false;
    }
  }, [language, ensureValidFullName]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { window.location.href = '/login'; return; }
      await fetchData(authUser.id, true);
    })();
  }, [fetchData]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        (async () => {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          if (authUser) await fetchData(authUser.id, false);
        })();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchData, loading]);

  const toggleNotifications = useCallback(async () => {
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    setIsDrawerOpen(false);
    try {
      const res = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications_enabled: newState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التحديث');
      toast.success(data.message);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'حدث خطأ، حاول مرة أخرى');
      setNotificationsEnabled(!newState);
    }
  }, [notificationsEnabled]);

  const handleUpdateAnnouncements = useCallback((annId, liked, totalLikes) => {
    setAnnouncements(prev =>
      prev.map(a => a.id === annId ? { ...a, user_liked: liked, total_likes: totalLikes } : a)
    );
  }, []);

  const handleUpdateMessages = useCallback((newMsg) => {
    setMessages(prev => [newMsg, ...prev]);
  }, []);

  if (loading) return (
    <div className={`h-full w-full flex items-center justify-center ${styles.bg}`}>
      <div className="relative">
        <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-6 h-6 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl shadow-blue-500/50"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية متحركة – تُعطّل على الموبايل */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-60 -right-60 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl pointer-events-none hidden sm:block"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[700px] h-[700px] bg-green-500/5 rounded-full blur-3xl pointer-events-none hidden sm:block"
      />

      <div className="relative z-10 px-2 xs:px-3 sm:px-4 md:px-6 py-2 xs:py-3 sm:py-4 md:py-6 space-y-3 xs:space-y-4 sm:space-y-5 max-w-7xl mx-auto">
        {/* ===== رأس الصفحة – مبسط على الموبايل ===== */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className={`flex flex-col md:flex-row md:items-center md:justify-between gap-2 xs:gap-3 p-3 xs:p-4 sm:p-5 rounded-xl sm:rounded-2xl border ${styles.border} shadow-sm ${styles.card}`}
          style={{
            backdropFilter: 'none', // نزيل الزجاج على الموبايل
          }}
        >
          <div className="flex items-center gap-2 xs:gap-3">
            <motion.div
              whileHover={{ scale: 1.04, rotate: 3 }}
              className="relative h-12 w-12 xs:h-14 xs:w-14 sm:h-16 sm:w-16 rounded-lg xs:rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-base xs:text-lg sm:text-2xl shadow-md overflow-hidden ring-2 ring-blue-500/20"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.full_name?.[0] || (language === 'ar' ? 'ط' : 'S')).toUpperCase()}</span>
              )}
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 xs:h-4 xs:w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800" />
            </motion.div>
            <div>
              <h1 className={`text-base xs:text-xl sm:text-2xl md:text-3xl font-black ${styles.text}`}>
                {language === 'ar' ? 'مرحباً' : 'Welcome'}{', '}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-300 dark:to-blue-400">
                  {user?.full_name || (language === 'ar' ? 'طالب' : 'Student')}
                </span>
              </h1>
              <p className={`text-[8px] xs:text-[10px] sm:text-xs ${styles.subtext} opacity-70 mt-0.5`}>
                {language === 'ar' ? 'كل يوم فرصة جديدة للتعلم!' : 'Every day is a new chance to learn!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 xs:gap-2 self-end md:self-center">
            <MembershipCounter days={daysSinceJoin} styles={styles} language={language} />

            <motion.button
              whileTap={{ scale: 0.92 }}
              onClick={() => {
                if (!notificationsEnabled) {
                  toast.error('الإشعارات معطلة');
                  return;
                }
                setIsDrawerOpen(true);
              }}
              className={`relative p-1.5 xs:p-2 rounded-lg border ${styles.border} ${styles.card} transition-all duration-300`}
            >
              <Bell className={`h-3.5 w-3.5 xs:h-4 xs:w-4 ${notificationsEnabled ? 'text-yellow-500' : 'text-gray-400'}`} />
              {notificationsEnabled && (() => {
                const unreadMessages = messages.filter(m => m.sender_id === teacherId && !m.is_read).length;
                const totalUnread = unreadMessages + announcements.filter(a => a.is_published).length;
                if (totalUnread > 0) {
                  return (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[6px] xs:text-[8px] font-bold rounded-full h-3 w-3 xs:h-3.5 xs:w-3.5 flex items-center justify-center shadow-lg">
                      {totalUnread > 9 ? '9+' : totalUnread}
                    </span>
                  );
                }
                return null;
              })()}
            </motion.button>
          </div>
        </motion.div>

        {/* ===== شريط المعلومات اليومية ===== */}
        <LanguageTipCarousel language={language} styles={styles} />

        {/* ===== الشبكة الرئيسية ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 xs:gap-4 sm:gap-5">
          <div className="lg:col-span-2 space-y-3 xs:space-y-4 sm:space-y-5">
            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 xs:gap-3">
              <LargeStatCard icon={BookOpen} label={language === 'ar' ? 'كورسات' : 'Courses'} value={stats.coursesEnrolled} styles={styles} delay={0} />
              <LargeStatCard icon={Video} label={language === 'ar' ? 'فيديوهات' : 'Videos'} value={stats.completedVideos} styles={styles} delay={0.05} />
              <LargeStatCard icon={FileQuestion} label={language === 'ar' ? 'امتحانات' : 'Exams'} value={stats.totalExamsTaken} styles={styles} delay={0.1} />
            </div>

            {/* كورساتي النشطة */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-1.5 xs:mb-2">
                <h2 className={`text-sm xs:text-base sm:text-xl font-black ${styles.text} flex items-center gap-1.5`}>
                  <BookOpen className="h-4 w-4 xs:h-5 xs:w-5 text-green-600 dark:text-green-400" />
                  {language === 'ar' ? 'كورساتي' : 'My Courses'}
                </h2>
                <Link href="/dashboard/student/courses" className={`text-[8px] xs:text-[10px] sm:text-sm font-bold ${styles.subtext} hover:text-green-600 transition`}>
                  {language === 'ar' ? 'عرض الكل' : 'View all'}
                </Link>
              </div>
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 xs:gap-3">
                  {courses.slice(0, 4).map(course => {
                    const progress = enrollments.find(e => e.course_id === course.id)?.progress || 0;
                    return <LargeCourseCard key={course.id} course={course} progress={progress} styles={styles} theme={theme} language={language} />;
                  })}
                </div>
              ) : (
                <p className={`text-xs xs:text-sm ${styles.subtext} text-center py-3 xs:py-4`}>
                  {language === 'ar' ? 'لا توجد كورسات مسجلة' : 'No courses enrolled yet'}
                </p>
              )}
            </motion.div>

            {/* امتحانات قادمة + نشاط حديث */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 xs:gap-4">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <WaveBorderCard initialColor="blue">
                  <div className="p-2 xs:p-3 sm:p-4">
                    <h2 className={`text-sm xs:text-base sm:text-lg font-black ${styles.text} flex items-center gap-1.5`}>
                      <AlarmClock className="h-4 w-4 xs:h-5 xs:w-5 text-blue-600 dark:text-blue-400" />
                      {language === 'ar' ? 'الامتحانات القادمة' : 'Upcoming Exams'}
                    </h2>
                    <div className="space-y-1.5 xs:space-y-2 mt-1.5">
                      {upcomingExams.length > 0 ? upcomingExams.slice(0, 3).map(exam => (
                        <div key={exam.id} className={`flex items-center justify-between p-1.5 xs:p-2 rounded-lg ${styles.card} border ${styles.border}`}>
                          <span className={`text-[10px] xs:text-xs font-medium ${styles.text} truncate`}>{exam.title}</span>
                          <Link href={`/dashboard/student/exams/${exam.id}`} className="text-blue-600 dark:text-blue-400 px-1.5 xs:px-2 py-0.5 xs:py-1 bg-blue-500/10 rounded-lg text-[8px] xs:text-[10px] font-bold hover:bg-blue-500/20 transition">
                            {language === 'ar' ? 'دخول' : 'Enter'}
                          </Link>
                        </div>
                      )) : <p className={`text-[10px] xs:text-xs ${styles.subtext}`}>{language === 'ar' ? 'لا توجد امتحانات' : 'No exams'}</p>}
                    </div>
                  </div>
                </WaveBorderCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <WaveBorderCard initialColor="orange">
                  <div className="p-2 xs:p-3 sm:p-4">
                    <h3 className={`text-sm xs:text-base sm:text-lg font-black ${styles.text} flex items-center gap-1.5`}>
                      <Activity className="h-4 w-4 xs:h-5 xs:w-5 text-orange-600 dark:text-orange-400" />
                      {language === 'ar' ? 'نشاط حديث' : 'Recent'}
                    </h3>
                    <div className="space-y-1.5 xs:space-y-2 mt-1.5">
                      {recentActivity.slice(0, 3).map((act, i) => (
                        <div key={i} className={`flex items-center gap-1.5 xs:gap-2 text-[10px] xs:text-xs ${styles.subtext}`}>
                          {act.type === 'video' ? <Video className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-blue-500" /> : <FileQuestion className="h-3.5 w-3.5 xs:h-4 xs:w-4 text-emerald-500" />}
                          <span className="flex-1 truncate font-medium">{act.title}</span>
                          <span className="text-[7px] xs:text-[9px] whitespace-nowrap opacity-60">{timeAgo(act.date, language)}</span>
                        </div>
                      ))}
                      {recentActivity.length === 0 && <p className={`text-[10px] xs:text-xs ${styles.subtext}`}>{language === 'ar' ? 'لا يوجد نشاط' : 'No activity'}</p>}
                    </div>
                  </div>
                </WaveBorderCard>
              </motion.div>
            </div>
          </div>

          {/* العمود الأيمن */}
          <div className="space-y-3 xs:space-y-4 sm:space-y-5">
            <LargeNoteCard latestNote={latestNote} language={language} styles={styles} theme={theme} />
            <SuperAnnouncements announcements={announcements} styles={styles} language={language} />
          </div>
        </div>

        {/* روابط سريعة – مصغرة جداً على الموبايل */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 xs:gap-2 sm:gap-3">
          {[
            { href: '/dashboard/student/courses', icon: Search, label: { ar: 'كورسات', en: 'Courses' } },
            { href: '/dashboard/student/support', icon: HelpCircle, label: { ar: 'دعم', en: 'Support' } },
            { href: '/dashboard/student/progress', icon: TrendingUp, label: { ar: 'تقدّم', en: 'Progress' } },
            { href: '/dashboard/student/profile', icon: User, label: { ar: 'حسابي', en: 'Profile' } },
            { href: '/dashboard/student/study-schedule', icon: Calendar, label: { ar: 'جدول', en: 'Schedule' } },
            { href: '/dashboard/student/notes', icon: StickyNote, label: { ar: 'ملاحظات', en: 'Notes' } },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-0.5 xs:gap-1 p-2 xs:p-3 rounded-lg border ${styles.border} ${styles.card} transition-all duration-200 group hover:border-blue-500/40`}
            >
              <item.icon className={`h-4 w-4 xs:h-5 xs:w-5 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform`} />
              <span className={`text-[7px] xs:text-[9px] sm:text-xs font-bold ${styles.text} text-center`}>{item.label[language]}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* ===== درج الإشعارات ===== */}
      <NotificationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        announcements={announcements}
        messages={messages}
        studentId={user?.id}
        teacherId={teacherId}
        notificationsEnabled={notificationsEnabled}
        onToggleNotifications={toggleNotifications}
        onUpdateAnnouncements={handleUpdateAnnouncements}
        onUpdateMessages={handleUpdateMessages}
      />
    </div>
  );
}