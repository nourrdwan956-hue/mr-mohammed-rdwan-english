'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import NotificationDrawer from '@/app/dashboard/student/components/NotificationDrawer';

// ================================================================
// دوال IndexedDB للملاحظات
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
// دوال مساعدة محسنة
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
// 1. عداد متحرك
// ================================================================
const AnimatedCounter = ({ value, duration = 1.2, suffix = '' }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
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
  }, [value, duration]);
  return <motion.span animate={{ scale: [1, 1.04, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>{count}{suffix}</motion.span>;
};

// ================================================================
// 2. عداد أيام الانضمام
// ================================================================
const MembershipCounter = ({ days, styles, language }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, type: 'spring', stiffness: 200 }}
      className={`px-6 py-4 rounded-2xl border ${styles.border} backdrop-blur-sm shadow-xl text-center min-w-[140px] ${styles.card}`}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="text-4xl font-black text-blue-600 dark:text-blue-400"
      >
        {days}
      </motion.div>
      <div className="text-xs font-medium text-blue-600/80 dark:text-blue-400/80 mt-0.5">
        {language === 'ar' ? 'يوم في المنصة' : 'Days on platform'}
      </div>
      <div className={`text-[10px] ${styles.subtext} mt-1`}>
        {language === 'ar' ? 'رحلة تعلم مستمرة 🚀' : 'Continuous learning journey 🚀'}
      </div>
    </motion.div>
  );
};

// ================================================================
// 3. ألوان البطاقات
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
// 4. مكون الحدود الموجية
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
          if (onColorChange) {
            onColorChange(newColor);
          }
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
      <div
        className="absolute inset-0 rounded-3xl"
        style={gradientStyle}
      />
      <div className="relative z-10 h-full w-full rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// 5. بطاقة إحصائية
// ================================================================
const LargeStatCard = ({ icon: Icon, label, value, styles, delay = 0 }) => {
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [isHovered, setIsHovered] = useState(false);

  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.04 }}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-7 flex items-center justify-between gap-5">
          <div>
            <p className={`text-base font-medium ${styles.subtext} mb-1`}>{label}</p>
            <p className={`text-4xl font-black ${styles.text}`}>
              <AnimatedCounter value={value} />
            </p>
          </div>
          <motion.div
            animate={isHovered ? { scale: 1.3, rotate: 12 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={`p-4 rounded-2xl ${color.bg} shadow-xl`}
          >
            <Icon className={`h-12 w-12 ${color.text}`} />
          </motion.div>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// 6. بطاقة كورس
// ================================================================
const LargeCourseCard = ({ course, progress, styles, theme, language }) => {
  const router = useRouter();
  const [color, setColor] = useState(CARD_COLORS[1]);
  const [isHovered, setIsHovered] = useState(false);

  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -6 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative cursor-pointer"
      onClick={() => router.push(`/dashboard/student/courses/${course.id}`)}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <motion.div
                animate={isHovered ? { scale: 1.25, rotate: [0, -8, 8, -8, 0] } : { scale: 1 }}
                transition={{ duration: 0.5 }}
                className={`h-16 w-16 rounded-2xl ${color.bg} flex items-center justify-center shadow-lg`}
              >
                <Icons.BookOpen className={`h-8 w-8 ${color.text}`} />
              </motion.div>
              <div className="flex-1 min-w-0">
                <h4 className={`text-xl font-bold truncate ${styles.text}`}>{course.title}</h4>
                <p className={`text-sm ${styles.subtext}`}>{course.category || (language === 'ar' ? 'كورس' : 'Course')}</p>
              </div>
            </div>
            <motion.div
              animate={isHovered ? { x: 15, opacity: 1 } : { x: 0, opacity: 0.6 }}
              className={`${color.text}`}
            >
              <Icons.ArrowRight className="h-6 w-6" />
            </motion.div>
          </div>

          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className={styles.subtext}>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
              <span className={`${color.text} font-bold`}>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                className={`h-full bg-gradient-to-r ${color.text} rounded-full`}
              />
            </div>
          </div>

          {isHovered && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-4 right-4 flex gap-1 z-20"
            >
              <span className={`px-4 py-1.5 rounded-full ${color.bg} ${color.text} text-sm font-bold backdrop-blur-sm border ${color.border}`}>
                {progress >= 100 ? '✅ مكتمل' : progress >= 50 ? '🚀 متقدم' : '📖 جديد'}
              </span>
            </motion.div>
          )}
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// 7. بطاقة الإعلانات
// ================================================================
const SuperAnnouncements = ({ announcements, styles, language }) => {
  const [expanded, setExpanded] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = announcements.length;
  const [color, setColor] = useState(CARD_COLORS[2]);
  const [isHovered, setIsHovered] = useState(false);

  const handleColorChange = (newColor) => setColor(newColor);

  if (totalPages === 0) {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
        <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
          <div className="p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Icons.Megaphone className={`h-5 w-5 ${color.text}`} />
              <h3 className={`text-lg font-bold ${styles.text}`}>{language === 'ar' ? 'الإعلانات' : 'Announcements'}</h3>
            </div>
            <div className="text-center py-6">
              <Icons.Megaphone className={`h-16 w-16 ${styles.subtext} mx-auto mb-3`} />
              <p className={`text-sm ${styles.subtext}`}>{language === 'ar' ? 'لا توجد إعلانات حالياً' : 'No announcements yet'}</p>
            </div>
            <div className={`flex items-start gap-2 p-3 rounded-xl ${color.bg} border ${color.border}`}>
              <Icons.Lightbulb className={`h-5 w-5 ${color.text} mt-0.5 flex-shrink-0`} />
              <p className={`text-xs ${styles.subtext}`}>
                {language === 'ar'
                  ? 'خصص 30 دقيقة يومياً للمراجعة، وستلاحظ الفرق بعد شهر!'
                  : 'Dedicate 30 min daily to revision and see the difference!'}
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

  const variants = {
    enter: (direction) => ({ x: direction > 0 ? 300 : -300, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (direction) => ({ x: direction > 0 ? -300 : 300, opacity: 0 }),
  };

  const toggleExpand = () => setExpanded(!expanded);

  const truncateText = (text, maxLength = 80) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderAnnouncementPreview = () => {
    const announcement = announcements[currentPage];
    return (
      <div className={`flex items-start gap-3 p-4 rounded-xl border ${styles.border} backdrop-blur-sm cursor-pointer transition ${styles.card} hover:bg-white/10 dark:hover:bg-white/5`}>
        <div className={`rounded-xl ${color.bg} ${color.text} flex-shrink-0 p-2.5`}>
          <Icons.Megaphone className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-base font-bold ${styles.text} mb-1`}>{announcement.title}</h4>
          <p className={`text-sm ${styles.subtext} leading-relaxed`}>
            {truncateText(announcement.body, 100)}
            {announcement.body.length > 100 && (
              <span className={`${color.text} font-medium mr-1`}>
                {language === 'ar' ? '...اقرأ المزيد' : '...read more'}
              </span>
            )}
          </p>
          <p className={`text-xs ${styles.subtext} mt-1`}>
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
      <div className={`flex items-start gap-5 p-6 rounded-xl border ${styles.border} backdrop-blur-sm ${styles.card}`}>
        <div className={`rounded-xl ${color.bg} ${color.text} flex-shrink-0 p-4`}>
          <Icons.Megaphone className="h-10 w-10" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`text-2xl font-bold ${styles.text} mb-3`}>{announcement.title}</h4>
          <p className={`text-lg ${styles.subtext} leading-relaxed whitespace-pre-wrap`}>{announcement.body}</p>
          <p className={`text-sm ${styles.subtext} mt-4`}>
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
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative"
      >
        <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
          <motion.div
            animate={isHovered ? { scale: 1.02 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Icons.Megaphone className={`h-5 w-5 ${color.text}`} />
                <h3 className={`text-lg font-bold ${styles.text}`}>{language === 'ar' ? 'الإعلانات' : 'Announcements'}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                  {currentPage + 1} / {totalPages}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={(e) => { e.stopPropagation(); handlePrev(); }}
                  className={`p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition ${color.text}`}
                >
                  <Icons.ChevronRight className="h-4 w-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleNext(); }}
                  className={`p-1.5 rounded-lg hover:bg-white/10 dark:hover:bg-white/5 transition ${color.text}`}
                >
                  <Icons.ChevronLeft className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div onClick={toggleExpand} className="cursor-pointer">
              {renderAnnouncementPreview()}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-1.5 mt-3">
                {Array.from({ length: totalPages }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={(e) => { e.stopPropagation(); setDirection(idx > currentPage ? 1 : -1); setCurrentPage(idx); }}
                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentPage ? `w-5 ${color.bg}` : `w-1.5 ${styles.subtext}`}`}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </WaveBorderCard>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-md p-4"
            onClick={() => setExpanded(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl border ${color.border} shadow-2xl p-6 ${styles.card}`}
              onClick={(e) => e.stopPropagation()}
            >
              <button onClick={() => setExpanded(false)} className={`absolute top-4 right-4 p-2 rounded-full bg-white/10 dark:bg-white/5 hover:bg-white/20 dark:hover:bg-white/10 transition ${color.text}`}>
                <Icons.X className="h-8 w-8" />
              </button>
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <Icons.Megaphone className={`h-8 w-8 ${color.text}`} />
                  <h2 className={`text-3xl font-bold ${styles.text}`}>{language === 'ar' ? 'الإعلانات' : 'Announcements'}</h2>
                  <span className={`text-sm px-3 py-1 rounded-full ${color.bg} ${color.text}`}>{currentPage + 1} / {totalPages}</span>
                </div>
                {renderAnnouncementFull()}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between gap-4">
                    <button onClick={handlePrev} className={`p-2 rounded-xl bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 transition ${color.text}`}>
                      <Icons.ChevronRight className="h-8 w-8" />
                    </button>
                    <div className="flex gap-2">
                      {Array.from({ length: totalPages }).map((_, idx) => (
                        <button key={idx} onClick={() => { setDirection(idx > currentPage ? 1 : -1); setCurrentPage(idx); }}
                          className={`h-2 rounded-full transition-all ${idx === currentPage ? `w-8 ${color.bg}` : `w-2 ${styles.subtext}`}`} />
                      ))}
                    </div>
                    <button onClick={handleNext} className={`p-2 rounded-xl bg-white/5 dark:bg-white/5 hover:bg-white/10 dark:hover:bg-white/10 transition ${color.text}`}>
                      <Icons.ChevronLeft className="h-8 w-8" />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ================================================================
// 8. بطاقة الملاحظة
// ================================================================
const LargeNoteCard = ({ latestNote, language, styles, theme }) => {
  const router = useRouter();
  const [color, setColor] = useState(CARD_COLORS[4]);
  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      onClick={() => router.push('/dashboard/student/notes')}
      className="relative cursor-pointer"
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2.5 rounded-xl ${color.bg}`}>
              <Icons.StickyNote className={`h-6 w-6 ${color.text}`} />
            </div>
            <h3 className={`text-xl font-bold ${styles.text}`}>{language === 'ar' ? 'آخر ملاحظة' : 'Recent Note'}</h3>
          </div>
          {latestNote ? (
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <span className="text-3xl">{latestNote.emoji || '📝'}</span>
                <p className={`text-base ${styles.text} line-clamp-3 leading-relaxed`}>{latestNote.note}</p>
              </div>
              <p className={`text-sm ${styles.subtext}`}>
                {new Date(latestNote.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                {latestNote.pinned && ' 📌 مثبتة'}
              </p>
            </div>
          ) : (
            <p className={`text-base ${styles.subtext}`}>{language === 'ar' ? 'لا توجد ملاحظات. اضف واحدة!' : 'No notes yet. Add one!'}</p>
          )}
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// 9. شريط المعلومات اليومية
// ================================================================
const LanguageTipCarousel = ({ language, styles }) => {
  const tips = [
    { ar: 'اللغة الإنجليزية هي اللغة الرسمية في 67 دولة حول العالم.', en: 'English is the official language in 67 countries worldwide.' },
    { ar: 'أكثر الكلمات استخداماً في الإنجليزية هي "the" – تظهر في كل جملة تقريباً!', en: 'The most common word in English is "the" – it appears in almost every sentence!' },
    { ar: 'اللغة الإنجليزية تحتوي على 26 حرفاً فقط، ولكنها تضم أكثر من 500,000 كلمة!', en: 'English has only 26 letters, but it contains over 500,000 words!' },
    { ar: 'أطول كلمة في الإنجليزية هي "pneumonoultramicroscopicsilicovolcanoconiosis" – وتشير إلى مرض رئوي.', en: 'The longest word in English is "pneumonoultramicroscopicsilicovolcanoconiosis" – a lung disease.' },
    { ar: 'كلمة "set" لها أكثر من 430 معنى مختلف في قاموس أكسفورد!', en: 'The word "set" has over 430 different meanings in the Oxford Dictionary!' },
    { ar: 'أقصر جملة مكتملة في الإنجليزية هي "I am" – وتحتوي على فاعل وفعل ومفعول به ضمنياً.', en: 'The shortest complete sentence in English is "I am" – it has a subject, verb, and implied object.' },
    { ar: 'كلمة "Goodbye" جاءت من عبارة "God be with you" التي اختصرت عبر الزمن.', en: 'The word "Goodbye" comes from "God be with you" shortened over time.' },
    { ar: 'اللغة الإنجليزية تتغير باستمرار – يتم إضافة حوالي 1000 كلمة جديدة كل عام!', en: 'English is constantly evolving – about 1000 new words are added every year!' },
    { ar: 'أول قاموس إنجليزي كتبه صامويل جونسون عام 1755 واستغرق 9 سنوات لإكماله.', en: 'The first English dictionary was written by Samuel Johnson in 1755 and took 9 years to complete.' },
    { ar: 'كلمة "queue" هي الكلمة الوحيدة التي تنطق كما لو كانت حرفاً واحداً (Q).', en: 'The word "queue" is the only word that is pronounced as if it were a single letter (Q).' },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [color, setColor] = useState(CARD_COLORS[5]);
  const totalTips = tips.length;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % totalTips);
    }, 12000);
    return () => clearInterval(interval);
  }, [totalTips]);

  const tip = tips[currentIndex];
  const tipText = language === 'ar' ? tip.ar : tip.en;

  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      key={currentIndex}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="p-5">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${color.bg} flex-shrink-0`}>
              <Icons.Lightbulb className={`h-7 w-7 ${color.text}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-bold ${styles.subtext} uppercase tracking-wider mb-1`}>
                💡 {language === 'ar' ? 'معلومة إنجليزية اليوم' : 'English Fact of the Day'}
              </p>
              <p className={`text-lg ${styles.text} leading-relaxed`}>{tipText}</p>
              <div className="flex gap-1.5 mt-3">
                {Array.from({ length: totalTips }).map((_, idx) => (
                  <span
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-500 ${
                      idx === currentIndex ? `w-6 ${color.bg}` : `w-2 ${styles.subtext}`
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
};

// ================================================================
// الصفحة الرئيسية
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

  // --- حالات الإشعارات الجديدة ---
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [teacherId, setTeacherId] = useState(null);

  // دوال جلب البيانات
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

  const fetchData = useCallback(async (userId) => {
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

      // جلب حالة الإشعارات من قاعدة البيانات
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

      // تحديد معرف المعلم من أول كورس
      if (validEnrolls.length > 0 && validEnrolls[0].courses?.teacher_id) {
        setTeacherId(validEnrolls[0].courses.teacher_id);
      }

      const [compVids, attemptedExams] = await Promise.all([
        supabase.from('watch_history').select('id', { count: 'exact', head: true }).eq('student_id', userId).eq('completed', true),
        supabase.from('exam_attempts').select('score, total_marks').eq('student_id', userId)
      ]);
      const totalExams = attemptedExams.data?.length || 0;

      setStats({
        coursesEnrolled: validEnrolls.length,
        completedVideos: compVids.count || 0,
        totalExamsTaken: totalExams,
        xp: profile.xp || 0,
        streak: profile.streak || 0,
        rank: profile.rank || 1,
      });

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

      // جلب الإعلانات مع الإعجابات
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

      if (annError) {
        console.error('خطأ في جلب الإعلانات:', annError);
      }

      const processedAnns = (anns || []).map(ann => {
        const likes = ann.announcement_likes || [];
        const totalLikes = likes.length;
        const userLiked = likes.some(like => like.student_id === userId);
        return {
          ...ann,
          total_likes: totalLikes,
          user_liked: userLiked,
          announcement_likes: undefined,
        };
      });
      setAnnouncements(processedAnns);

      // جلب الرسائل من المعلم
      if (teacherId) {
        const { data: msgs, error: msgError } = await supabase
          .from('messages')
          .select('*')
          .eq('receiver_id', userId)
          .eq('sender_id', teacherId)
          .order('created_at', { ascending: false })
          .limit(20);

        if (msgError) {
          console.error('خطأ في جلب الرسائل:', msgError);
        } else {
          setMessages(msgs || []);
        }
      }

      const note = await getLatestNote();
      setLatestNote(note);

    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [language, ensureValidFullName, teacherId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { window.location.href = '/login'; return; }
      await fetchData(authUser.id);
    })();
  }, [fetchData]);

  // دوال التحكم في الإشعارات
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
      prev.map(a =>
        a.id === annId
          ? { ...a, user_liked: liked, total_likes: totalLikes }
          : a
      )
    );
  }, []);

  const handleUpdateMessages = useCallback((newMsg) => {
    setMessages(prev => [newMsg, ...prev]);
  }, []);

  if (loading) return (
    <div className={`h-full w-full flex items-center justify-center ${styles.bg}`}>
      <div className="relative">
        <div className="w-20 h-20 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full shadow-2xl shadow-blue-500/50"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className={`w-full min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية متحركة شفافة */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-60 -right-60 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[900px] h-[900px] bg-green-500/5 dark:bg-green-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 px-6 sm:px-8 py-8 space-y-8 max-w-7xl mx-auto">
        {/* ===== رأس الصفحة المعدل ===== */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 200 }}
          className={`flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 p-8 rounded-3xl border ${styles.border} backdrop-blur-sm shadow-xl ${styles.card}`}
        >
          <div className="flex items-center gap-5">
            <motion.div
              whileHover={{ scale: 1.1, rotate: 6 }}
              className="relative h-24 w-24 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-extrabold text-4xl shadow-2xl shadow-blue-500/40 dark:shadow-blue-400/20 overflow-hidden ring-4 ring-blue-500/20 dark:ring-blue-400/10"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <span>{(user?.full_name?.[0] || (language === 'ar' ? 'ط' : 'S')).toUpperCase()}</span>
              )}
              <span className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-emerald-500 border-2 border-white dark:border-gray-800" />
            </motion.div>
            <div>
              <h1 className={`text-4xl md:text-5xl font-black ${styles.text}`}>
                {language === 'ar' ? 'مرحباً' : 'Welcome'}{', '}
                <motion.span
                  animate={{ backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'] }}
                  transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                  className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-blue-500 to-blue-400 dark:from-blue-300 dark:via-blue-400 dark:to-blue-300 bg-[length:300%_auto]"
                >
                  {user?.full_name || (language === 'ar' ? 'طالب' : 'Student')}
                </motion.span>
              </h1>
              <p className={`text-lg ${styles.subtext} opacity-80 mt-1`}>
                {language === 'ar' ? 'كل يوم فرصة جديدة للتعلم!' : 'Every day is a new chance to learn!'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <MembershipCounter days={daysSinceJoin} styles={styles} language={language} />

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!notificationsEnabled) {
                  toast.error('الإشعارات معطلة. قم بتفعيلها أولاً.');
                  return;
                }
                setIsDrawerOpen(true);
              }}
              className={`relative p-3 rounded-2xl border ${styles.border} ${styles.card} hover:border-yellow-500/50 transition-all duration-300`}
            >
              <Icons.Bell className={`h-6 w-6 ${notificationsEnabled ? 'text-yellow-500' : 'text-gray-500'}`} />
              {notificationsEnabled && (() => {
                const unreadMessages = messages.filter(m => m.sender_id === teacherId && !m.is_read).length;
                const totalUnread = unreadMessages + announcements.filter(a => a.is_published).length;
                if (totalUnread > 0) {
                  return (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-lg animate-pulse">
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* بطاقات الإحصائيات */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              <LargeStatCard icon={Icons.BookOpen} label={language === 'ar' ? 'كورسات' : 'Courses'} value={stats.coursesEnrolled} styles={styles} delay={0} />
              <LargeStatCard icon={Icons.Video} label={language === 'ar' ? 'فيديوهات' : 'Videos'} value={stats.completedVideos} styles={styles} delay={0.1} />
              <LargeStatCard icon={Icons.FileQuestion} label={language === 'ar' ? 'امتحانات' : 'Exams'} value={stats.totalExamsTaken} styles={styles} delay={0.2} />
            </div>

            {/* كورساتي النشطة */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="flex justify-between items-center mb-5">
                <h2 className={`text-2xl font-black ${styles.text} flex items-center gap-3`}>
                  <Icons.BookOpen className="h-8 w-8 text-green-600 dark:text-green-400" />
                  {language === 'ar' ? 'كورساتي النشطة' : 'Active Courses'}
                </h2>
                <Link href="/dashboard/student/courses" className={`text-base font-bold ${styles.subtext} hover:text-green-600 dark:hover:text-green-400 transition`}>
                  {language === 'ar' ? 'عرض الكل' : 'View all'}
                </Link>
              </div>
              {courses.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {courses.slice(0, 4).map(course => {
                    const progress = enrollments.find(e => e.course_id === course.id)?.progress || 0;
                    return <LargeCourseCard key={course.id} course={course} progress={progress} styles={styles} theme={theme} language={language} />;
                  })}
                </div>
              ) : (
                <p className={`text-lg ${styles.subtext} text-center py-10`}>
                  {language === 'ar' ? 'لا توجد كورسات مسجلة' : 'No courses enrolled yet'}
                </p>
              )}
            </motion.div>

            {/* امتحانات قادمة + نشاط حديث */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <WaveBorderCard initialColor="blue">
                  <div className="p-6">
                    <h2 className={`text-2xl font-black ${styles.text} flex items-center gap-3`}>
                      <Icons.AlarmClock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                      {language === 'ar' ? 'الامتحانات القادمة' : 'Upcoming Exams'}
                    </h2>
                    <div className="space-y-3">
                      {upcomingExams.length > 0 ? upcomingExams.map(exam => (
                        <div key={exam.id} className={`flex items-center justify-between p-4 rounded-2xl ${styles.card} border ${styles.border} backdrop-blur-sm`}>
                          <span className={`text-base font-medium ${styles.text}`}>{exam.title}</span>
                          <Link href={`/dashboard/student/exams/${exam.id}`} className="text-blue-600 dark:text-blue-400 px-5 py-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-xl text-sm font-bold hover:bg-blue-500/20 dark:hover:bg-blue-400/20 transition">
                            {language === 'ar' ? 'دخول' : 'Enter'}
                          </Link>
                        </div>
                      )) : <p className={`text-base ${styles.subtext}`}>{language === 'ar' ? 'لا توجد امتحانات قادمة' : 'No upcoming exams'}</p>}
                    </div>
                  </div>
                </WaveBorderCard>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <WaveBorderCard initialColor="orange">
                  <div className="p-6">
                    <h3 className={`text-2xl font-black ${styles.text} flex items-center gap-3`}>
                      <Icons.Activity className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                      {language === 'ar' ? 'نشاط حديث' : 'Recent Activity'}
                    </h3>
                    <div className="space-y-3">
                      {recentActivity.map((act, i) => (
                        <div key={i} className={`flex items-center gap-3 text-base ${styles.subtext}`}>
                          {act.type === 'video' ? <Icons.Video className="h-6 w-6 text-blue-500 dark:text-blue-400" /> : <Icons.FileText className="h-6 w-6 text-emerald-500 dark:text-emerald-400" />}
                          <span className="flex-1 truncate font-medium">{act.title}</span>
                          <span className="text-sm whitespace-nowrap opacity-70">{timeAgo(act.date, language)}</span>
                        </div>
                      ))}
                      {recentActivity.length === 0 && <p className={`text-base ${styles.subtext}`}>{language === 'ar' ? 'لا يوجد نشاط' : 'No activity'}</p>}
                    </div>
                  </div>
                </WaveBorderCard>
              </motion.div>
            </div>
          </div>

          {/* العمود الأيمن */}
          <div className="space-y-8">
            <LargeNoteCard latestNote={latestNote} language={language} styles={styles} theme={theme} />
            <SuperAnnouncements announcements={announcements} styles={styles} language={language} />
          </div>
        </div>

        {/* روابط سريعة */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {[
            { href: '/dashboard/student/courses', icon: Icons.Search, label: { ar: 'كورسات', en: 'Courses' } },
            { href: '/dashboard/student/support', icon: Icons.HelpCircle, label: { ar: 'دعم', en: 'Support' } },
            { href: '/dashboard/student/progress', icon: Icons.TrendingUp, label: { ar: 'تقدّم', en: 'Progress' } },
            { href: '/dashboard/student/profile', icon: Icons.User, label: { ar: 'حسابي', en: 'Profile' } },
            { href: '/dashboard/student/study-schedule', icon: Icons.Calendar, label: { ar: 'جدول', en: 'Schedule' } },
            { href: '/dashboard/student/notes', icon: Icons.StickyNote, label: { ar: 'ملاحظات', en: 'Notes' } },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className={`flex flex-col items-center gap-3 p-6 rounded-2xl border ${styles.border} ${styles.card} hover:border-blue-500/50 dark:hover:border-blue-400/50 transition-all duration-300 group hover:-translate-y-2 hover:shadow-2xl`}>
              <item.icon className={`h-10 w-10 text-blue-600 dark:text-blue-400 group-hover:scale-110 group-hover:rotate-6 transition-transform`} />
              <span className={`text-base font-bold ${styles.text}`}>{item.label[language]}</span>
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