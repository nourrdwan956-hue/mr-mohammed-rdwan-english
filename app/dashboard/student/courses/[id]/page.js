// app/dashboard/student/courses/[id]/page.js
// ================================================================
// 🏛️ صفحة تفاصيل الكورس – متجاوبة بالكامل مع الحفاظ على أنظمة الأمان
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// 🔐 استيراد دوال الأمان (بدون تعديل)
// ================================================================
import { checkCourseAccess, checkSubscriptionOnly } from '@/lib/course-access';
import { getDeviceFingerprint } from '@/lib/device-fingerprint';

// ================================================================
// 📱 Hook للكشف عن حجم الشاشة (نفس الملف السابق)
// ================================================================
const useDeviceSize = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsDesktop(width >= 1024);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return { isMobile, isTablet, isDesktop };
};

// ================================================================
// 🎨 ألوان البطاقات (نفس النظام)
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  return available.length ? available[Math.floor(Math.random() * available.length)] : CARD_COLORS[0];
};

// ================================================================
// 🌊 Wave Border Card محسّن (نفس تحسينات الملف السابق)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange, intensity = 1 }) => {
  const { isMobile } = useDeviceSize();
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const intervalMs = isMobile ? 200 : 50;
    const step = isMobile ? 0.5 : 2;

    intervalRef.current = setInterval(() => {
      if (!isMounted.current) return;
      setRotation(prev => {
        const newRot = prev + step * intensity;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, intervalMs);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onColorChange, intensity, isMobile]);

  const borderStyle = isMobile
    ? { borderColor: color.border.replace('border-', ''), borderWidth: '2px', borderRadius: '1.5rem' }
    : {
        background: `conic-gradient(from ${rotation}deg, rgba(59,130,246,0.6), rgba(37,99,235,0.3), rgba(96,165,250,0.5), rgba(59,130,246,0.7), rgba(37,99,235,0.2))`,
        borderRadius: '1.5rem',
        padding: '3px',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      };

  return (
    <div className={`relative rounded-2xl sm:rounded-3xl overflow-hidden group ${className}`}>
      {!isMobile && (
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl" style={borderStyle} />
      )}
      <div
        className={`relative z-10 h-full w-full rounded-2xl sm:rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)] transition-all duration-300 group-hover:shadow-2xl ${
          isMobile ? `border-2 ${color.border}` : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
};

// ================================================================
// 📊 دوال مساعدة (بدون تغيير)
// ================================================================
const formatDuration = (totalSeconds, language) => {
  if (!totalSeconds || totalSeconds === 0) return language === 'ar' ? 'غير محدد' : 'N/A';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return language === 'ar' ? `${hours} ساعة ${minutes} دقيقة` : `${hours}h ${minutes}m`;
  return language === 'ar' ? `${minutes} دقيقة` : `${minutes}m`;
};

const formatDate = (dateString, language) => {
  return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

// ================================================================
// 🧩 مكونات فرعية – محسّنة ومتجاوبة
// ================================================================

const TabButton = React.memo(({ active, onClick, icon: Icon, label, count, styles }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm md:text-base font-bold transition-all duration-300 whitespace-nowrap ${
      active ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 scale-105' : `${styles.subtext} hover:bg-gray-100 dark:hover:bg-white/5`
    }`}
  >
    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
    <span>{label}</span>
    {count !== undefined && (
      <span className={`text-[8px] sm:text-xs rounded-full px-1.5 py-0.5 sm:px-2 sm:py-0.5 ${active ? 'bg-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-gray-200 dark:bg-white/10'}`}>{count}</span>
    )}
  </button>
));
TabButton.displayName = 'TabButton';

// ================================================================
// 🔵 دائرة التقدم – متجاوبة
// ================================================================
const CircularProgress = React.memo(({ percentage, size = 80, strokeWidth = 6, label, styles }) => {
  const { isMobile } = useDeviceSize();
  const responsiveSize = isMobile ? Math.min(size, 56) : size;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={responsiveSize} height={responsiveSize} className="transform -rotate-90">
        <circle
          cx={responsiveSize/2}
          cy={responsiveSize/2}
          r={responsiveSize/2 - strokeWidth/2}
          className="stroke-current text-gray-200 dark:text-white/10"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <motion.circle
          cx={responsiveSize/2}
          cy={responsiveSize/2}
          r={responsiveSize/2 - strokeWidth/2}
          stroke="url(#grad)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={(responsiveSize/2 - strokeWidth/2) * 2 * Math.PI}
          initial={{ strokeDashoffset: (responsiveSize/2 - strokeWidth/2) * 2 * Math.PI }}
          animate={{ strokeDashoffset: (responsiveSize/2 - strokeWidth/2) * 2 * Math.PI * (1 - percentage/100) }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FACC15"/>
            <stop offset="100%" stopColor="#D97706"/>
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-sm sm:text-base md:text-lg font-extrabold ${styles.text}`}>{Math.round(percentage)}%</span>
        {label && <span className={`text-[7px] sm:text-xs ${styles.subtext} -mt-0.5`}>{label}</span>}
      </div>
    </div>
  );
});
CircularProgress.displayName = 'CircularProgress';

// ================================================================
// 🎬 عناصر المحتوى – متجاوبة
// ================================================================

const VideoItem = React.memo(({ video, bookmarked, onToggleBookmark, styles, language, watched }) => {
  const [color, setColor] = useState(() => getRandomColor());
  const handleColorChange = useCallback((newColor) => setColor(newColor), []);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-3 sm:p-3.5 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 hover:border-${color.name}-400/50 transition group relative min-h-[60px] sm:min-h-[70px]`}>
        {watched && (
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-green-500/20 text-green-400 rounded-full p-0.5 sm:p-1">
            <Icons.CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 fill-current" />
          </div>
        )}
        <div className="relative flex-shrink-0">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg ${watched ? 'bg-green-400/10' : 'bg-blue-400/10'} flex items-center justify-center`}>
            <Icons.Play className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${watched ? 'text-green-500' : `text-${color.name}-500`}`} />
          </div>
          {video.duration && (
            <span className="absolute -bottom-0.5 -right-0.5 bg-black/80 text-white text-[7px] sm:text-[10px] px-1 py-0.5 rounded-md font-mono">
              {video.duration}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/watch/${video.id}`} className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} hover:text-${color.name}-500 transition line-clamp-1`}>
            {video.title}
          </Link>
          {video.description && <p className={`text-xs sm:text-sm ${styles.subtext} line-clamp-1 sm:line-clamp-2 mt-0.5`}>{video.description}</p>}
        </div>
        <button
          onClick={() => onToggleBookmark(video.id)}
          className={`p-1.5 sm:p-2 rounded-lg transition ${bookmarked ? `text-${color.name}-500 bg-${color.name}-400/10` : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-400/5'}`}
        >
          <Icons.Bookmark className={`h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 ${bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </WaveBorderCard>
  );
});
VideoItem.displayName = 'VideoItem';

const ExamItem = React.memo(({ exam, styles, language, attempted, score }) => {
  const [color, setColor] = useState(() => getRandomColor());
  const handleColorChange = useCallback((newColor) => setColor(newColor), []);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-3 sm:p-3.5 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 hover:border-${color.name}-400/50 transition min-h-[60px] sm:min-h-[70px]`}>
        <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg ${attempted ? 'bg-blue-400/10' : 'bg-emerald-400/10'} flex items-center justify-center flex-shrink-0`}>
          <Icons.FileText className={`h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 ${attempted ? 'text-blue-500' : 'text-emerald-500'}`} />
        </div>
        <div className="flex-1">
          <Link href={`/dashboard/student/exams/${exam.id}`} className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} hover:text-${color.name}-500 transition`}>
            {exam.title}
          </Link>
          {exam.duration_minutes && (
            <p className={`text-xs sm:text-sm ${styles.subtext}`}>{exam.duration_minutes} {language === 'ar' ? 'دقيقة' : 'min'}</p>
          )}
          {attempted && score !== undefined && (
            <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5">
              <span className={`text-xs sm:text-sm font-bold ${score >= (exam.passing_marks || 50) ? 'text-green-400' : 'text-red-400'}`}>
                {score}% • {score >= (exam.passing_marks || 50) ? (language === 'ar' ? '✅ ناجح' : '✅ Passed') : (language === 'ar' ? '❌ راسب' : '❌ Failed')}
              </span>
            </div>
          )}
        </div>
      </div>
    </WaveBorderCard>
  );
});
ExamItem.displayName = 'ExamItem';

const BookItem = React.memo(({ book, styles, language }) => {
  const [color, setColor] = useState(() => getRandomColor());
  const handleColorChange = useCallback((newColor) => setColor(newColor), []);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-3 sm:p-3.5 md:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2.5 sm:gap-4 hover:border-${color.name}-400/50 transition min-h-[60px] sm:min-h-[70px]`}>
        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg bg-purple-400/10 flex items-center justify-center flex-shrink-0">
          <Icons.BookOpen className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-purple-500" />
        </div>
        <div className="flex-1">
          <Link href={`/dashboard/student/books/${book.id}`} className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} hover:text-${color.name}-500 transition`}>
            {book.title}
          </Link>
        </div>
      </div>
    </WaveBorderCard>
  );
});
BookItem.displayName = 'BookItem';

// ================================================================
// 🏠 الصفحة الرئيسية – تفاصيل الكورس
// ================================================================
export default function StudentCourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { theme, styles, language } = useTheme();
  const { isMobile } = useDeviceSize();

  // ===== حالات البيانات =====
  const [course, setCourse] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [videos, setVideos] = useState([]);
  const [exams, setExams] = useState([]);
  const [books, setBooks] = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('videos');
  const [bookmarks, setBookmarks] = useState({});
  const [enrolling, setEnrolling] = useState(false);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [watchedVideos, setWatchedVideos] = useState({});
  const [examAttempts, setExamAttempts] = useState({});
  const [lastWatched, setLastWatched] = useState(null);
  const [totalDuration, setTotalDuration] = useState(0);
  const [userProfile, setUserProfile] = useState(null);
  const fetchedRef = useRef(false);
  const abortControllerRef = useRef(null);

  // ===== حالات الأمان (🔐 بدون تغيير) =====
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  // ===== ألوان الهيدر =====
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  // ===== دالة ensureProfile (بدون تغيير) =====
  const ensureProfile = useCallback(async (userId, userEmail) => {
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    if (!existingProfile) {
      const { error: insertError } = await supabase.from('profiles').insert({
        id: userId,
        email: userEmail,
        full_name: userEmail?.split('@')[0] || 'طالب',
        role: 'student',
        created_at: new Date().toISOString(),
      });
      if (insertError) {
        console.error('Failed to create profile:', insertError);
        return false;
      }
    }
    return true;
  }, []);

  // ===== جلب المحتوى (بدون تغيير في المنطق) =====
  const fetchContent = useCallback(async () => {
    if (!id) return;
    setContentLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const [vidRes, exRes, bkRes] = await Promise.all([
        supabase.from('videos').select('*').eq('course_id', id).order('created_at', { ascending: true }),
        supabase.from('exams').select('*').eq('course_id', id).order('created_at', { ascending: true }),
        supabase.from('books').select('*').eq('course_id', id).order('created_at', { ascending: true }),
      ]);

      setVideos(vidRes.data || []);
      setExams(exRes.data || []);
      setBooks(bkRes.data || []);

      const totalSecs = (vidRes.data || []).reduce((sum, v) => {
        if (v.duration) {
          const parts = v.duration.split(':');
          if (parts.length === 2) return sum + parseInt(parts[0]) * 60 + parseInt(parts[1]);
          if (parts.length === 3) return sum + parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
        }
        return sum;
      }, 0);
      setTotalDuration(totalSecs);

      if (user && enrollment) {
        const videoIds = vidRes.data?.map(v => v.id) || [];
        const examIds = exRes.data?.map(e => e.id) || [];

        if (videoIds.length > 0) {
          const { data: watched } = await supabase
            .from('watch_history')
            .select('video_id')
            .eq('student_id', user.id)
            .in('video_id', videoIds)
            .eq('completed', true);
          const watchedMap = {};
          watched?.forEach(w => watchedMap[w.video_id] = true);
          setWatchedVideos(watchedMap);

          const { data: lastW } = await supabase
            .from('watch_history')
            .select('*, video:videos(title)')
            .eq('student_id', user.id)
            .in('video_id', videoIds)
            .order('watched_at', { ascending: false })
            .limit(1)
            .single();
          if (lastW) setLastWatched(lastW);
        }

        if (examIds.length > 0) {
          const { data: attempts } = await supabase
            .from('exam_attempts')
            .select('exam_id, score, total_marks')
            .eq('student_id', user.id)
            .in('exam_id', examIds);
          const attemptMap = {};
          attempts?.forEach(a => {
            attemptMap[a.exam_id] = {
              attempted: true,
              score: Math.round((a.score / a.total_marks) * 100)
            };
          });
          setExamAttempts(attemptMap);
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error('Error fetching content:', err);
    } finally {
      setContentLoading(false);
    }
  }, [id, enrollment]);

  // ===== جلب بيانات الكورس مع التحقق من الصلاحية (🔐 الأمان محفوظ) =====
  const fetchCourseData = useCallback(async () => {
    if (!id) return;
    abortControllerRef.current = new AbortController();

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      await ensureProfile(user.id, user.email);
      setUserProfile({ id: user.id, email: user.email });

      // جلب الكورس
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*, teacher:teacher_id(full_name, email)')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      if (!courseData) throw new Error('الكورس غير موجود');
      setCourse(courseData);
      setTeacher(courseData.teacher);

      // ================================================================
      // 🔐 التحقق من صلاحية الوصول للكورسات المدفوعة (بدون تعديل)
      // ================================================================
      if (courseData && !courseData.is_free && courseData.price > 0) {
        setIsCheckingAccess(true);
        try {
          const { data: { user: currentUser } } = await supabase.auth.getUser();
          if (currentUser) {
            const accessResult = await checkCourseAccess(courseData.id, currentUser.id);
            if (!accessResult.allowed) {
              setAccessDenied(true);
              setAccessReason(accessResult.reason);
              setLoading(false);
              setIsCheckingAccess(false);
              return;
            }
          }
        } catch (err) {
          console.error('Access check error:', err);
        } finally {
          setIsCheckingAccess(false);
        }
      }

      // جلب الاشتراكات
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .maybeSingle();
      setEnrollment(enrollData);

      // ================================================================
      // 🆕 إنشاء enrollment تلقائي إذا كان هناك اشتراك نشط
      // ================================================================
      const { data: subscription } = await supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (subscription && !enrollData) {
        const { error: enrollError } = await supabase
          .from('enrollments')
          .insert({ student_id: user.id, course_id: id, progress: 0 });
        if (!enrollError) {
          await fetchContent();
          setEnrollment({ progress: 0 });
          setActiveTab('videos');
        }
      }

      if (enrollData) await fetchContent();

      // كورسات ذات صلة
      if (courseData.grade_stage && courseData.grade_level) {
        const { data: related } = await supabase
          .from('courses')
          .select('*, teacher:teacher_id(full_name)')
          .eq('grade_stage', courseData.grade_stage)
          .eq('grade_level', courseData.grade_level)
          .neq('id', id)
          .limit(3);
        setRelatedCourses(related || []);
      }

      // جلب الإشارات المرجعية
      const stored = localStorage.getItem('videoBookmarks');
      if (stored) setBookmarks(JSON.parse(stored));

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      toast.error(language === 'ar' ? 'فشل تحميل الكورس' : 'Failed to load course');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [id, language, router, fetchContent, ensureProfile]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchCourseData();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchCourseData]);

  // ================================================================
  // 🎯 دالة الاشتراك (مع التحقق من الاشتراك الحالي) – بدون تغيير في المنطق
  // ================================================================
  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(language === 'ar' ? 'سجل الدخول' : 'Login');
        return;
      }

      // ✅ التحقق من وجود اشتراك نشط
      const { data: existingSub } = await supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingSub) {
        const { data: existing } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('course_id', id)
          .maybeSingle();
        if (existing) {
          setEnrollment(existing);
          await fetchContent();
          toast.success(language === 'ar' ? 'أنت مشترك بالفعل، تم تحميل المحتوى' : 'Already enrolled, content loaded');
          setActiveTab('videos');
          return;
        }

        const { error: insertError } = await supabase
          .from('enrollments')
          .insert({ student_id: user.id, course_id: id, progress: 0 });
        if (insertError) throw insertError;
        setEnrollment({ progress: 0 });
        toast.success(language === 'ar' ? 'تم الاشتراك! سيظهر المحتوى الآن' : 'Enrolled! Content will appear.');
        await fetchContent();
        setActiveTab('videos');
        return;
      }

      if (!course.is_free && course.price > 0) {
        toast.info(language === 'ar' ? 'هذا الكورس مدفوع. يرجى الاشتراك أولاً.' : 'This course is paid. Please subscribe first.');
        router.push(`/dashboard/student/courses/${id}/payment`);
        return;
      }

      const profileOk = await ensureProfile(user.id, user.email);
      if (!profileOk) throw new Error('profile_creation_failed');

      const { data: existing } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .maybeSingle();
      if (existing) {
        setEnrollment(existing);
        await fetchContent();
        toast.success(language === 'ar' ? 'أنت مشترك بالفعل، تم تحميل المحتوى' : 'Already enrolled, content loaded');
        setActiveTab('videos');
        return;
      }

      const { error: insertError } = await supabase
        .from('enrollments')
        .insert({ student_id: user.id, course_id: id, progress: 0 });
      if (insertError) throw insertError;

      setEnrollment({ progress: 0 });
      toast.success(language === 'ar' ? 'تم الاشتراك! سيظهر المحتوى الآن' : 'Enrolled! Content will appear.');
      await fetchContent();
      setActiveTab('videos');

    } catch (err) {
      console.error(err);
      if (err.message === 'profile_creation_failed') {
        toast.error(language === 'ar' ? 'فشل إنشاء الملف الشخصي. يرجى المحاولة لاحقاً.' : 'Profile creation failed. Try again later.');
      } else {
        toast.error(language === 'ar' ? 'فشل الاشتراك. حاول مرة أخرى.' : 'Enrollment failed. Try again.');
      }
    } finally {
      setEnrolling(false);
    }
  };

  // ===== دالة الإشارات المرجعية =====
  const toggleBookmark = useCallback((videoId) => {
    const updated = { ...bookmarks };
    if (updated[videoId]) delete updated[videoId];
    else updated[videoId] = true;
    setBookmarks(updated);
    localStorage.setItem('videoBookmarks', JSON.stringify(updated));
  }, [bookmarks]);

  // ===== حساب التقدم =====
  const progress = enrollment?.progress || 0;
  const enrolled = !!enrollment;
  const completedVideos = Object.keys(watchedVideos).length;
  const totalVideos = videos.length;
  const videosProgress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
  const attemptedExams = Object.keys(examAttempts).length;
  const totalExams = exams.length;
  const examsProgress = totalExams > 0 ? (attemptedExams / totalExams) * 100 : 0;

  // ===== شاشات التحميل والتحقق =====
  if (loading || isCheckingAccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-14 sm:h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`text-xs sm:text-sm ${styles.subtext}`}>
            {isCheckingAccess
              ? (language === 'ar' ? 'جاري التحقق من الصلاحية...' : 'Verifying access...')
              : (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
            }
          </p>
        </div>
      </div>
    );
  }

  // ================================================================
  // 🚫 شاشة رفض الوصول (بدون تغيير – نفس الرسائل)
  // ================================================================
  if (accessDenied) {
    const messages = {
      no_subscription: language === 'ar'
        ? 'هذا الكورس مدفوع. يرجى الاشتراك أولاً للوصول إلى المحتوى.'
        : 'This course is paid. Please subscribe first to access content.',
      max_devices: language === 'ar'
        ? 'لقد تجاوزت الحد الأقصى للأجهزة المسموح بها لهذا الكورس.'
        : 'You have exceeded the maximum devices allowed for this course.',
      expired: language === 'ar'
        ? 'انتهت صلاحية اشتراكك في هذا الكورس.'
        : 'Your subscription to this course has expired.',
      default: language === 'ar'
        ? 'لا يمكنك الوصول إلى هذا الكورس. يرجى التواصل مع الدعم.'
        : 'You cannot access this course. Please contact support.'
    };
    const message = messages[accessReason] || messages.default;

    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg} p-3 sm:p-4`}>
        <div className={`max-w-md w-full p-5 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl ${styles.card} border ${styles.border} text-center shadow-2xl`}>
          <div className="inline-flex p-3 sm:p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.Lock className="h-10 w-10 sm:h-14 sm:w-14 text-red-400" />
          </div>
          <h2 className={`text-xl sm:text-2xl font-extrabold ${styles.text} mt-3 sm:mt-4`}>
            {language === 'ar' ? '🚫 وصول ممنوع' : '🚫 Access Denied'}
          </h2>
          <p className={`text-sm sm:text-base ${styles.subtext} mt-1.5 sm:mt-2 leading-relaxed`}>{message}</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center mt-4 sm:mt-5">
            <button
              onClick={() => router.back()}
              className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition shadow-lg shadow-yellow-400/20 text-sm sm:text-base"
            >
              {language === 'ar' ? 'العودة' : 'Go Back'}
            </button>
            {accessReason === 'no_subscription' && (
              <button
                onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)}
                className="px-4 py-2.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition shadow-lg shadow-blue-500/30 text-sm sm:text-base"
              >
                {language === 'ar' ? 'الاشتراك الآن' : 'Subscribe Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className={styles.subtext}>{language === 'ar' ? 'الكورس غير موجود' : 'Not found'}</p>
      </div>
    );
  }

  // ================================================================
  // 🏠 التصميم الرئيسي – متجاوب بالكامل مع الحفاظ على الأمان
  // ================================================================
  return (
    <div className={`w-full min-h-screen ${styles.bg}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-5 md:py-7 space-y-4 sm:space-y-6 md:space-y-8">
        {/* ===== هيدر الكورس ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-3.5 sm:p-4 md:p-5 lg:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {/* صورة الكورس */}
              <div className="lg:col-span-1">
                <div className="aspect-video rounded-lg sm:rounded-xl overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-[var(--border-color)] relative shadow-2xl">
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      className="w-full h-full object-contain bg-black/10"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Icons.BookOpen className="h-12 w-12 sm:h-16 sm:w-16 text-gray-600" />
                    </div>
                  )}
                  {enrolled && (
                    <div className="absolute bottom-1.5 left-1.5 sm:bottom-2 sm:left-2 bg-black/60 backdrop-blur-md rounded-lg px-1.5 py-0.5 sm:px-2.5 sm:py-1 text-[8px] sm:text-xs font-bold text-white flex items-center gap-1.5 sm:gap-2">
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${progress === 100 ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                      {progress === 100 ? (language === 'ar' ? 'مكتمل' : 'Completed') : `${Math.round(progress)}%`}
                    </div>
                  )}
                </div>
              </div>

              {/* معلومات الكورس */}
              <div className="lg:col-span-2 space-y-3 sm:space-y-4">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className={`px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[8px] sm:text-xs font-bold ${course.is_free || course.price === 0 ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'} backdrop-blur-sm border border-current/20`}>
                    {course.is_free || course.price === 0 ? (language === 'ar' ? 'مجاني' : 'Free') : `${course.price} ج.م`}
                  </span>
                  <span className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[8px] sm:text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-400/20">
                    {course.grade_stage === 'primary' ? (language === 'ar' ? 'ابتدائي' : 'Primary') :
                     course.grade_stage === 'middle' ? (language === 'ar' ? 'إعدادي' : 'Middle') :
                     (language === 'ar' ? 'ثانوي' : 'High')}
                    {course.grade_level && ` ${language === 'ar' ? 'الصف' : 'Grade'} ${course.grade_level}`}
                  </span>
                </div>

                <h1 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold ${styles.text} leading-tight`}>
                  {course.title}
                </h1>

                {teacher && (
                  <div className="flex items-center gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-400/10">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm sm:text-base md:text-lg shadow-lg">
                      {teacher.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-sm sm:text-base md:text-lg font-bold ${styles.text}`}>{teacher.full_name}</p>
                      <p className={`text-[10px] sm:text-xs ${styles.subtext}`}>
                        {language === 'ar' ? 'المعلم' : 'Teacher'}
                        {teacher.email && ` • ${teacher.email}`}
                      </p>
                    </div>
                  </div>
                )}

                {course.description && (
                  <div className={`p-3 sm:p-4 rounded-lg ${styles.card} border ${styles.border}`}>
                    <h4 className={`text-xs sm:text-sm md:text-base font-bold ${styles.text} mb-1.5 sm:mb-2`}>
                      {language === 'ar' ? 'وصف الكورس' : 'Description'}
                    </h4>
                    <p className={`text-xs sm:text-sm md:text-base ${styles.subtext} leading-relaxed`}>
                      {course.description}
                    </p>
                  </div>
                )}

                {totalDuration > 0 && (
                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm md:text-base">
                    <Icons.Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5 text-blue-500" />
                    <span className={styles.subtext}>{formatDuration(totalDuration, language)} {language === 'ar' ? 'محتوى' : 'content'}</span>
                  </div>
                )}

                {/* لوحة التقدم – متجاوبة */}
                {enrolled && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
                    <div className={`p-2.5 sm:p-3 md:p-4 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={videosProgress} size={isMobile ? 56 : 72} strokeWidth={5} styles={styles} />
                      <p className={`text-[8px] sm:text-xs mt-1.5 sm:mt-2 ${styles.subtext}`}>
                        {language === 'ar' ? 'الفيديوهات' : 'Videos'} ({completedVideos}/{totalVideos})
                      </p>
                    </div>
                    <div className={`p-2.5 sm:p-3 md:p-4 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={examsProgress} size={isMobile ? 56 : 72} strokeWidth={5} styles={styles} />
                      <p className={`text-[8px] sm:text-xs mt-1.5 sm:mt-2 ${styles.subtext}`}>
                        {language === 'ar' ? 'الامتحانات' : 'Exams'} ({attemptedExams}/{totalExams})
                      </p>
                    </div>
                    <div className={`p-2.5 sm:p-3 md:p-4 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={progress} size={isMobile ? 56 : 72} strokeWidth={5} styles={styles} />
                      <p className={`text-[8px] sm:text-xs mt-1.5 sm:mt-2 ${styles.subtext}`}>
                        {language === 'ar' ? 'التقدم العام' : 'Overall'}
                      </p>
                    </div>
                    {lastWatched && (
                      <div className={`p-2.5 sm:p-3 md:p-4 rounded-lg ${styles.card} border ${styles.border} flex flex-col justify-center`}>
                        <p className={`text-[8px] sm:text-xs ${styles.subtext}`}>
                          {language === 'ar' ? 'آخر مشاهدة' : 'Last Watched'}
                        </p>
                        <Link href={`/watch/${lastWatched.video_id}`} className={`text-xs sm:text-sm md:text-base font-bold text-blue-500 hover:underline line-clamp-2 mt-0.5 sm:mt-1`}>
                          {lastWatched.video?.title || 'فيديو'}
                        </Link>
                      </div>
                    )}
                  </div>
                )}

                {/* أزرار الإجراءات */}
                <div className="flex flex-wrap gap-2 sm:gap-3 pt-1.5 sm:pt-2">
                  {enrolled ? (
                    <>
                      <Link
                        href={`/dashboard/student/courses/${id}/progress`}
                        className="px-4 py-2.5 sm:px-5 sm:py-3 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-xs sm:text-sm md:text-base hover:scale-105 transition shadow-2xl shadow-blue-500/30 flex items-center gap-1.5 sm:gap-2"
                      >
                        <Icons.ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        {language === 'ar' ? 'متابعة التعلم' : 'Continue Learning'}
                      </Link>
                    </>
                  ) : (
                    <div className="w-full text-center py-3 sm:py-4 md:py-6">
                      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center">
                        {course.is_free || course.price === 0 ? (
                          <button
                            onClick={handleEnroll}
                            disabled={enrolling}
                            className="px-5 py-2.5 sm:px-6 sm:py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg sm:rounded-xl hover:scale-105 transition shadow-2xl shadow-green-500/30 text-sm sm:text-base md:text-lg"
                          >
                            {enrolling ? (language === 'ar' ? 'جاري...' : 'Loading...') : (language === 'ar' ? 'ابدأ الآن 🚀' : 'Start Now 🚀')}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)}
                              className="px-5 py-2.5 sm:px-6 sm:py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg sm:rounded-xl hover:scale-105 transition shadow-2xl shadow-blue-500/30 text-sm sm:text-base md:text-lg"
                            >
                              {language === 'ar' ? '💳 الاشتراك الآن' : '💳 Subscribe Now'}
                            </button>
                            <button
                              onClick={handleEnroll}
                              disabled={enrolling}
                              className="px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-3.5 bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 font-bold rounded-lg sm:rounded-xl hover:scale-105 transition border border-gray-500/30 text-xs sm:text-sm md:text-base"
                            >
                              {enrolling ? (language === 'ar' ? 'جاري...' : 'Loading...') : (language === 'ar' ? '🔑 لدي كود شحن' : '🔑 I have a code')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== المحتوى (تبويبات) ===== */}
        {enrolled && (
          <>
            <div className="flex gap-1 sm:gap-1.5 border-b-2 border-gray-200 dark:border-white/10 pb-1.5 sm:pb-2 overflow-x-auto no-scrollbar">
              <TabButton
                active={activeTab === 'videos'}
                onClick={() => setActiveTab('videos')}
                icon={Icons.Video}
                label={language === 'ar' ? 'الفيديوهات' : 'Videos'}
                count={totalVideos}
                styles={styles}
              />
              <TabButton
                active={activeTab === 'exams'}
                onClick={() => setActiveTab('exams')}
                icon={Icons.FileQuestion}
                label={language === 'ar' ? 'الامتحانات' : 'Exams'}
                count={totalExams}
                styles={styles}
              />
              <TabButton
                active={activeTab === 'books'}
                onClick={() => setActiveTab('books')}
                icon={Icons.Book}
                label={language === 'ar' ? 'الكتب' : 'Books'}
                count={books.length}
                styles={styles}
              />
              <TabButton
                active={activeTab === 'academic'}
                onClick={() => router.push(`/dashboard/student/support/academic?course=${id}`)}
                icon={Icons.MessageCircle}
                label={language === 'ar' ? 'سؤال أكاديمي' : 'Academic Q'}
                styles={styles}
              />
            </div>

            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2.5 sm:space-y-3"
            >
              {contentLoading ? (
                <div className="flex justify-center py-10 sm:py-16">
                  <div className="w-10 h-10 sm:w-14 sm:h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {activeTab === 'videos' && (
                    <div className="space-y-2.5 sm:space-y-3">
                      {videos.length > 0 ? (
                        videos.map(v => (
                          <VideoItem
                            key={v.id}
                            video={v}
                            bookmarked={!!bookmarks[v.id]}
                            onToggleBookmark={toggleBookmark}
                            styles={styles}
                            language={language}
                            watched={!!watchedVideos[v.id]}
                          />
                        ))
                      ) : (
                        <p className={`text-sm sm:text-base ${styles.subtext}`}>
                          {language === 'ar' ? 'لا توجد فيديوهات' : 'No videos yet'}
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === 'exams' && (
                    <div className="space-y-2.5 sm:space-y-3">
                      {exams.length > 0 ? (
                        exams.map(e => (
                          <ExamItem
                            key={e.id}
                            exam={e}
                            styles={styles}
                            language={language}
                            attempted={!!examAttempts[e.id]?.attempted}
                            score={examAttempts[e.id]?.score}
                          />
                        ))
                      ) : (
                        <p className={`text-sm sm:text-base ${styles.subtext}`}>
                          {language === 'ar' ? 'لا توجد امتحانات' : 'No exams yet'}
                        </p>
                      )}
                    </div>
                  )}

                  {activeTab === 'books' && (
                    <div className="space-y-2.5 sm:space-y-3">
                      {books.length > 0 ? (
                        books.map(b => (
                          <BookItem
                            key={b.id}
                            book={b}
                            styles={styles}
                            language={language}
                          />
                        ))
                      ) : (
                        <p className={`text-sm sm:text-base ${styles.subtext}`}>
                          {language === 'ar' ? 'لا توجد كتب' : 'No books yet'}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}

        {!enrolled && (
          <div className="text-center py-12 sm:py-16 md:py-20 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl sm:rounded-3xl">
            <Icons.Lock className="h-12 w-12 sm:h-16 sm:w-16 md:h-20 md:w-20 text-gray-400 mx-auto mb-2 sm:mb-3" />
            <h3 className={`text-lg sm:text-xl md:text-2xl font-bold ${styles.text} mb-1.5 sm:mb-2`}>
              {course.is_free ? (language === 'ar' ? 'ابدأ التعلم مجاناً' : 'Start learning for free') : (language === 'ar' ? 'اشترك للوصول للمحتوى' : 'Enroll to access content')}
            </h3>
            <p className={`text-sm sm:text-base ${styles.subtext} max-w-lg mx-auto px-3`}>
              {course.is_free
                ? (language === 'ar' ? 'هذا الكورس مجاني! يمكنك البدء فوراً.' : 'This course is free! You can start right away.')
                : (language === 'ar'
                    ? 'بعد الاشتراك ستتمكن من مشاهدة الفيديوهات وحل الامتحانات وتحميل الكتب ومتابعة تقدمك'
                    : 'After enrolling you can watch videos, take exams, download books and track your progress.')
              }
            </p>
            {course.is_free ? (
              <button
                onClick={handleEnroll}
                disabled={enrolling}
                className="mt-3 sm:mt-4 px-5 py-2.5 sm:px-6 sm:py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg sm:rounded-xl hover:scale-105 transition shadow-2xl shadow-green-500/30 text-sm sm:text-base md:text-lg"
              >
                {enrolling ? (language === 'ar' ? 'جاري...' : 'Loading...') : (language === 'ar' ? 'ابدأ الآن 🚀' : 'Start Now 🚀')}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center mt-3 sm:mt-4">
                <button
                  onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)}
                  className="px-5 py-2.5 sm:px-6 sm:py-3 md:px-8 md:py-3.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg sm:rounded-xl hover:scale-105 transition shadow-2xl shadow-blue-500/30 text-sm sm:text-base md:text-lg"
                >
                  {language === 'ar' ? '💳 الاشتراك الآن' : '💳 Subscribe Now'}
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="px-3 py-2.5 sm:px-4 sm:py-3 md:px-5 md:py-3.5 bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 font-bold rounded-lg sm:rounded-xl hover:scale-105 transition border border-gray-500/30 text-xs sm:text-sm md:text-base"
                >
                  {enrolling ? (language === 'ar' ? 'جاري...' : 'Loading...') : (language === 'ar' ? '🔑 لدي كود شحن' : '🔑 I have a code')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== كورسات ذات صلة ===== */}
        {relatedCourses.length > 0 && (
          <div>
            <h2 className={`text-lg sm:text-xl font-bold ${styles.text} mb-2.5 sm:mb-3 flex items-center gap-1.5 sm:gap-2`}>
              <Icons.Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-500" />
              {language === 'ar' ? 'كورسات ذات صلة' : 'Related Courses'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
              {relatedCourses.map(rc => (
                <Link
                  key={rc.id}
                  href={`/dashboard/student/courses/${rc.id}`}
                  className={`p-3 sm:p-4 rounded-lg border ${styles.border} ${styles.card} hover:border-blue-400/50 transition group`}
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Icons.BookOpen className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-500 group-hover:scale-110 transition" />
                    </div>
                    <span className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} line-clamp-1`}>
                      {rc.title}
                    </span>
                  </div>
                  {rc.teacher && (
                    <p className={`text-xs sm:text-sm ${styles.subtext}`}>{rc.teacher.full_name}</p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CSS لإخفاء شريط التمرير للتبويبات */}
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}