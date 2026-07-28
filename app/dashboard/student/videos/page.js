'use client';
// ================================================================
// 🎬 المسار: app/dashboard/student/videos/page.js
// فيديوهات الطالب – نسخة فاخرة مع Wave Border وألوان متغيرة
// ================================================================

import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import * as Icons from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
// دوال مساعدة
// ================================================================
const parseDurationToSeconds = (duration) => {
  if (!duration) return 0;
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 1 && !isNaN(parts[0])) return parts[0];
  return 0;
};

const formatDate = (date, language = 'ar') => {
  if (!date) return 'غير محدد';
  return new Date(date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getYoutubeId = (url) => {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([^&?]+)/,
    /(?:youtu\.be\/)([^&?]+)/,
    /(?:youtube\.com\/embed\/)([^&?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  if (url.length === 11 && /^[a-zA-Z0-9_-]+$/.test(url)) return url;
  return null;
};

// ================================================================
// مكونات مساعدة
// ================================================================

// عداد متحرك
const AnimatedCounter = ({ target, duration = 1000 }) => {
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

// بطاقة إحصائية
const StatCard = ({ icon: Icon, label, value, color, styles, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay }}
    whileHover={{ scale: 1.03, y: -4 }}
    className={`relative p-5 rounded-2xl border ${styles.border} backdrop-blur-xl overflow-hidden group ${styles.card} transition-shadow shadow-lg`}
  >
    <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${color} rounded-t-2xl`} />
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className={`text-sm font-medium ${styles.subtext} mb-0.5`}>{label}</p>
        <p className={`text-3xl font-black ${styles.text}`}>
          <AnimatedCounter target={value} />
        </p>
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${color} bg-opacity-20 shadow-lg`}>
        <Icon className="h-7 w-7 text-white/90" />
      </div>
    </div>
  </motion.div>
);

// دائرة التقدم
const ProgressCircle = ({ percentage, size = 44, strokeWidth = 4 }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const color = percentage >= 90 ? '#22c55e' : percentage > 0 ? '#fbbf24' : '#4b5563';

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90 w-full h-full">
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#374151" strokeWidth={strokeWidth} fill="transparent" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="transparent"
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-white">{percentage >= 90 ? '✓' : percentage > 0 ? `${Math.round(percentage)}%` : ''}</span>
    </div>
  );
};

// بطاقة فيديو
const VideoCard = ({ video, courseTitle, index, watchProgress, styles, language }) => {
  const [isHovered, setIsHovered] = useState(false);
  const [color, setColor] = useState(CARD_COLORS[index % CARD_COLORS.length]);
  const youtubeId = getYoutubeId(video.video_url) || video.telegram_file_id;
  const thumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null;
  const progress = watchProgress?.[video.id]?.progress || 0;
  const isWatched = watchProgress?.[video.id]?.completed || false;

  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -8 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
        <div className="relative overflow-hidden rounded-3xl">
          {/* صورة مصغرة */}
          <div className="relative aspect-video bg-gradient-to-br from-gray-800/50 to-gray-900/50 overflow-hidden">
            {thumbnail ? (
              <img
                src={thumbnail}
                alt={video.title}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                loading="lazy"
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <Icons.Video className="h-20 w-20 text-gray-600" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition" />

            {/* زر التشغيل */}
            <Link
              href={`/watch/${video.id}`}
              className="absolute inset-0 flex items-center justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.15 }}
                whileTap={{ scale: 0.9 }}
                className={`w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600/80 backdrop-blur flex items-center justify-center transition-all duration-300 shadow-2xl shadow-yellow-400/30`}
              >
                <Icons.Play className="h-8 w-8 text-black ml-1" />
              </motion.div>
            </Link>

            {/* حالة المشاهدة */}
            <div className="absolute top-3 right-3">
              {isWatched ? (
                <div className="bg-green-500/90 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg backdrop-blur border border-green-400/30 flex items-center gap-1">
                  <Icons.Check className="h-3 w-3" /> {language === 'ar' ? 'مكتمل' : 'Completed'}
                </div>
              ) : progress > 0 ? (
                <ProgressCircle percentage={progress} />
              ) : null}
            </div>

            {/* مدة الفيديو */}
            {video.duration && (
              <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur text-white text-xs px-2 py-1 rounded-full">
                {video.duration}
              </div>
            )}
          </div>

          {/* معلومات الفيديو */}
          <div className="p-5">
            <h3 className={`text-lg font-bold ${styles.text} group-hover:${color.text} transition line-clamp-1`}>
              {video.title}
            </h3>

            <div className="flex items-center gap-2 mt-2 text-xs flex-wrap">
              <span className={`flex items-center gap-1 ${styles.border} border px-2 py-0.5 rounded-full ${styles.subtext}`}>
                <Icons.Book className="h-3 w-3" />
                {courseTitle || (language === 'ar' ? 'بدون كورس' : 'No course')}
              </span>
              <span className={`flex items-center gap-1 ${styles.border} border px-2 py-0.5 rounded-full ${styles.subtext}`}>
                <Icons.Eye className="h-3 w-3" />
                {video.views || 0}
              </span>
              <span className={`flex items-center gap-1 ${styles.border} border px-2 py-0.5 rounded-full ${styles.subtext}`}>
                <Icons.Calendar className="h-3 w-3" />
                {formatDate(video.created_at, language)}
              </span>
            </div>

            {video.description && (
              <p className={`text-sm ${styles.subtext} mt-2 line-clamp-2`}>
                {video.description}
              </p>
            )}

            {/* شريط التقدم */}
            {progress > 0 && !isWatched && (
              <div className="mt-3">
                <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                <p className="text-[10px] text-gray-500 mt-0.5">
                  {Math.round(progress)}% {language === 'ar' ? 'تم المشاهدة' : 'watched'}
                </p>
              </div>
            )}

            {/* زر المشاهدة */}
            <div className="mt-4 pt-3 border-t border-[var(--border-color)]">
              <Link
                href={`/watch/${video.id}`}
                className={`w-full inline-block text-center px-4 py-2.5 bg-gradient-to-r from-yellow-400/20 to-yellow-600/20 hover:from-yellow-400/30 hover:to-yellow-600/30 text-yellow-400 rounded-xl text-sm font-bold transition shadow-lg shadow-yellow-400/10`}
              >
                <Icons.Play className="h-4 w-4 inline ml-2" />
                {language === 'ar' ? 'مشاهدة' : 'Watch'}
              </Link>
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
export default function StudentVideosPage() {
  const router = useRouter();
  const { theme, language, styles } = useTheme();
  const isArabic = language === 'ar';

  // حالة البيانات
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState({});
  const [watchProgress, setWatchProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // فلترة وبحث
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');

  // إحصائيات
  const [stats, setStats] = useState({ total: 0, watched: 0, inProgress: 0, totalViews: 0 });

  // قائمة الكورسات للفلترة
  const [courseOptions, setCourseOptions] = useState([]);

  // ألوان متغيرة للبطاقات
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const [statsColor, setStatsColor] = useState(CARD_COLORS[1]);

  // ---------- جلب البيانات ----------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: enrollments, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      if (enrollError) throw enrollError;

      const courseIds = (enrollments || []).map(e => e.course_id);

      if (courseIds.length === 0) {
        setVideos([]);
        setLoading(false);
        return;
      }

      const { data: videosData, error: videosError } = await supabase
        .from('videos')
        .select(`*, courses:course_id (id, title)`)
        .in('course_id', courseIds)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (videosError) throw videosError;

      const videoIds = (videosData || []).map(v => v.id);
      let watchHistory = [];
      if (videoIds.length > 0) {
        const { data } = await supabase
          .from('watch_history')
          .select('video_id, watched_seconds')
          .eq('student_id', user.id)
          .in('video_id', videoIds);
        watchHistory = data || [];
      }

      const progressMap = {};
      watchHistory.forEach(w => {
        const video = videosData.find(v => v.id === w.video_id);
        if (video && video.duration) {
          const total = parseDurationToSeconds(video.duration);
          const pct = total > 0 ? Math.round((w.watched_seconds / total) * 100) : 0;
          progressMap[w.video_id] = { progress: pct, completed: pct >= 90 };
        } else {
          progressMap[w.video_id] = { progress: 0, completed: false };
        }
      });
      setWatchProgress(progressMap);

      const courseMap = {};
      const courseTitles = {};
      (videosData || []).forEach(v => {
        if (v.courses) {
          courseMap[v.course_id] = v.courses;
          courseTitles[v.course_id] = v.courses.title;
        }
      });
      setCourses(courseMap);
      setCourseOptions(Object.values(courseMap));

      setVideos(videosData || []);

      const total = videosData?.length || 0;
      const watched = Object.values(progressMap).filter(p => p.completed).length;
      const inProgress = Object.values(progressMap).filter(p => !p.completed && p.progress > 0).length;
      const totalViews = videosData?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;

      setStats({ total, watched, inProgress, totalViews });

    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('فشل جلب الفيديوهات: ' + err.message);
      toast.error(isArabic ? 'فشل جلب الفيديوهات' : 'Failed to load videos');
    } finally {
      setLoading(false);
    }
  }, [router, isArabic]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---------- الفلترة والبحث ----------
  const filteredVideos = useMemo(() => {
    let result = [...videos];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(v =>
        v.title.toLowerCase().includes(q) ||
        v.description?.toLowerCase().includes(q)
      );
    }
    if (filterCourse !== 'all') {
      result = result.filter(v => v.course_id === filterCourse);
    }
    return result;
  }, [videos, searchTerm, filterCourse]);

  // ---------- الترجمة ----------
  const t = {
    title: isArabic ? '🎬 الفيديوهات' : '🎬 Videos',
    subtitle: isArabic ? 'جميع فيديوهاتك التعليمية في مكان واحد' : 'All your educational videos in one place',
    statsTotal: isArabic ? 'إجمالي الفيديوهات' : 'Total Videos',
    statsWatched: isArabic ? 'مكتملة' : 'Completed',
    statsInProgress: isArabic ? 'قيد المشاهدة' : 'In Progress',
    statsViews: isArabic ? 'إجمالي المشاهدات' : 'Total Views',
    noVideos: isArabic ? 'لا توجد فيديوهات' : 'No videos',
    noVideosSub: isArabic ? 'ستظهر فيديوهات كورساتك هنا' : 'Videos from your courses will appear here',
    search: isArabic ? 'ابحث عن فيديو...' : 'Search videos...',
    filterCourse: isArabic ? 'الكورس' : 'Course',
    allCourses: isArabic ? 'جميع الكورسات' : 'All Courses',
    watch: isArabic ? 'مشاهدة' : 'Watch',
    completed: isArabic ? 'مكتمل' : 'Completed',
    inProgress: isArabic ? 'قيد التقدم' : 'In Progress',
    loading: isArabic ? 'جاري التحميل...' : 'Loading...',
    quickActions: isArabic ? 'إجراءات سريعة' : 'Quick Actions',
    home: isArabic ? 'الرئيسية' : 'Home',
    courses: isArabic ? 'الكورسات' : 'Courses',
    exams: isArabic ? 'الامتحانات' : 'Exams',
    books: isArabic ? 'الكتب' : 'Books',
    dashboard: isArabic ? 'لوحة التحكم' : 'Dashboard',
    backToTop: isArabic ? 'العودة للأعلى' : 'Back to Top',
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`text-base ${styles.subtext}`}>{t.loading}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية متحركة */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-60 -right-60 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[900px] h-[900px] bg-purple-500/5 dark:bg-purple-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 px-6 sm:px-8 py-8 max-w-7xl mx-auto">
        {/* ===== رأس الصفحة ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl md:text-5xl font-black">{t.title}</h1>
                <p className={`text-lg ${styles.subtext} mt-1`}>{t.subtitle}</p>
              </div>
              <Link
                href="/dashboard/student"
                className={`px-6 py-3 rounded-xl ${styles.card} border ${styles.border} hover:border-blue-500/50 transition font-bold flex items-center gap-2`}
              >
                <Icons.ArrowLeft className="h-5 w-5" />
                {t.dashboard}
              </Link>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <StatCard icon={Icons.Video} label={t.statsTotal} value={stats.total} color="from-blue-500 to-blue-600" styles={styles} delay={0} />
          <StatCard icon={Icons.CheckCircle} label={t.statsWatched} value={stats.watched} color="from-green-500 to-green-600" styles={styles} delay={0.1} />
          <StatCard icon={Icons.Clock} label={t.statsInProgress} value={stats.inProgress} color="from-yellow-500 to-yellow-600" styles={styles} delay={0.2} />
          <StatCard icon={Icons.Eye} label={t.statsViews} value={stats.totalViews} color="from-purple-500 to-purple-600" styles={styles} delay={0.3} />
        </div>

        {/* ===== الفلتر والبحث ===== */}
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <div className="relative flex-1">
            <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.search}
              className={`w-full p-3 pr-10 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition text-lg`}
            />
          </div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className={`p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition text-lg min-w-[180px]`}
          >
            <option value="all">{t.allCourses}</option>
            {courseOptions.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>

        {/* ===== قائمة الفيديوهات ===== */}
        {filteredVideos.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl mt-6"
          >
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Icons.Video className="h-12 w-12 text-gray-500" />
            </div>
            <h3 className={`text-2xl font-bold ${styles.text}`}>
              {searchTerm || filterCourse !== 'all' ? (isArabic ? 'لا توجد نتائج' : 'No results') : t.noVideos}
            </h3>
            <p className={`text-base ${styles.subtext} mt-2`}>
              {searchTerm || filterCourse !== 'all' ? (isArabic ? 'جرب تغيير معايير البحث' : 'Try changing search criteria') : t.noVideosSub}
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-6">
            {filteredVideos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                courseTitle={video.courses?.title}
                index={index}
                watchProgress={watchProgress}
                styles={styles}
                language={language}
              />
            ))}
          </div>
        )}

        {/* ===== الإجراءات السريعة ===== */}
        <WaveBorderCard initialColor={CARD_COLORS[4].name}>
          <div className="p-6">
            <h3 className={`text-xl font-bold ${styles.text} flex items-center gap-2 mb-4`}>
              <Icons.Link className="h-6 w-6 text-blue-500" />
              {t.quickActions}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: '/dashboard/student', icon: Icons.Home, label: t.home, color: 'blue' },
                { href: '/dashboard/student/courses', icon: Icons.Book, label: t.courses, color: 'green' },
                { href: '/dashboard/student/exams', icon: Icons.FileText, label: t.exams, color: 'purple' },
                { href: '/dashboard/student/books', icon: Icons.BookOpen, label: t.books, color: 'orange' },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl ${styles.card} border ${styles.border} hover:border-${item.color}-500/50 transition group hover:-translate-y-1`}
                >
                  <item.icon className={`h-8 w-8 text-${item.color}-500 group-hover:scale-110 transition`} />
                  <span className={`text-sm font-bold ${styles.text}`}>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </WaveBorderCard>
      </div>
    </div>
  );
}