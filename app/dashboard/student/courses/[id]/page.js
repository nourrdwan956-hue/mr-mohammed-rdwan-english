// app/dashboard/student/courses/[id]/page.js
// ================================================================
// 🏛️ صفحة تفاصيل الكورس – متجاوبة بالكامل
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// 📦 استيراد دوال التحقق من الوصول للكورسات المدفوعة
// ================================================================
import { checkCourseAccess, checkSubscriptionOnly } from '@/lib/course-access';
import { getDeviceFingerprint } from '@/lib/device-fingerprint';

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
// 🌊 مكون الحدود الموجية (Wave Border)
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
    <div className={`relative rounded-2xl sm:rounded-3xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-2xl sm:rounded-3xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-2xl sm:rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// ثوابت ودوال مساعدة
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
// مكونات فرعية مكبرة وواضحة – متجاوبة
// ================================================================

const TabButton = ({ active, onClick, icon: Icon, label, count, styles }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 rounded-xl text-sm sm:text-base md:text-lg font-bold transition-all duration-300 whitespace-nowrap ${
      active ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 scale-105' : `${styles.subtext} hover:bg-gray-100 dark:hover:bg-white/5`
    }`}
  >
    <Icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
    <span>{label}</span>
    {count !== undefined && (
      <span className={`text-[10px] sm:text-sm rounded-full px-2 py-0.5 sm:px-3 sm:py-0.5 ${active ? 'bg-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-gray-200 dark:bg-white/10'}`}>{count}</span>
    )}
  </button>
);

// ================================================================
// مكون دائرة التقدم – متجاوب
// ================================================================
const CircularProgress = ({ percentage, size = 80, strokeWidth = 6, label, styles }) => {
  // حجم متجاوب
  const responsiveSize = typeof window !== 'undefined' 
    ? window.innerWidth < 640 ? 60 : window.innerWidth < 768 ? 70 : size
    : size;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={responsiveSize} height={responsiveSize} className="transform -rotate-90">
        <circle cx={responsiveSize/2} cy={responsiveSize/2} r={responsiveSize/2 - strokeWidth/2} className="stroke-current text-gray-200 dark:text-white/10" strokeWidth={strokeWidth} fill="none" />
        <motion.circle cx={responsiveSize/2} cy={responsiveSize/2} r={responsiveSize/2 - strokeWidth/2} stroke="url(#grad)" strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={(responsiveSize/2 - strokeWidth/2) * 2 * Math.PI}
          initial={{ strokeDashoffset: (responsiveSize/2 - strokeWidth/2) * 2 * Math.PI }}
          animate={{ strokeDashoffset: (responsiveSize/2 - strokeWidth/2) * 2 * Math.PI * (1 - percentage/100) }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FACC15"/><stop offset="100%" stopColor="#D97706"/></linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-base sm:text-xl font-extrabold ${styles.text}`}>{Math.round(percentage)}%</span>
        {label && <span className={`text-[8px] sm:text-sm ${styles.subtext} -mt-0.5`}>{label}</span>}
      </div>
    </div>
  );
};

// ================================================================
// مكونات عناصر المحتوى – متجاوبة
// ================================================================

const VideoItem = ({ video, bookmarked, onToggleBookmark, styles, language, watched }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-3 sm:p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 hover:border-${color.name}-400/50 transition group relative min-h-[70px] sm:min-h-[80px]`}>
        {watched && (
          <div className="absolute top-2 right-2 sm:top-3 sm:right-3 bg-green-500/20 text-green-400 rounded-full p-1 sm:p-1.5">
            <Icons.CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
          </div>
        )}
        <div className="relative flex-shrink-0">
          <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl ${watched ? 'bg-green-400/10' : 'bg-blue-400/10'} flex items-center justify-center`}>
            <Icons.Play className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ${watched ? 'text-green-500' : `text-${color.name}-500`}`} />
          </div>
          {video.duration && (
            <span className="absolute -bottom-1 -right-1 bg-black/80 text-white text-[8px] sm:text-xs px-1.5 py-0.5 rounded-md font-mono">
              {video.duration}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/watch/${video.id}`} className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} hover:text-${color.name}-500 transition line-clamp-1`}>
            {video.title}
          </Link>
          {video.description && <p className={`text-xs sm:text-sm ${styles.subtext} line-clamp-2 mt-0.5 sm:mt-1`}>{video.description}</p>}
        </div>
        <button onClick={() => onToggleBookmark(video.id)} className={`p-2 sm:p-3 rounded-xl transition ${bookmarked ? `text-${color.name}-500 bg-${color.name}-400/10` : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-400/5'}`}>
          <Icons.Bookmark className={`h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 ${bookmarked ? 'fill-current' : ''}`} />
        </button>
      </div>
    </WaveBorderCard>
  );
};

const ExamItem = ({ exam, styles, language, attempted, score }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-3 sm:p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 hover:border-${color.name}-400/50 transition min-h-[70px] sm:min-h-[80px]`}>
        <div className={`w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl ${attempted ? 'bg-blue-400/10' : 'bg-emerald-400/10'} flex items-center justify-center flex-shrink-0`}>
          <Icons.FileText className={`h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 ${attempted ? 'text-blue-500' : 'text-emerald-500'}`} />
        </div>
        <div className="flex-1">
          <Link href={`/dashboard/student/exams/${exam.id}`} className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} hover:text-${color.name}-500 transition`}>{exam.title}</Link>
          {exam.duration_minutes && <p className={`text-xs sm:text-sm ${styles.subtext}`}>{exam.duration_minutes} {language==='ar'?'دقيقة':'min'}</p>}
          {attempted && score !== undefined && (
            <div className="flex items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
              <span className={`text-xs sm:text-sm md:text-base font-bold ${score >= (exam.passing_marks || 50) ? 'text-green-400' : 'text-red-400'}`}>
                {score}% • {score >= (exam.passing_marks || 50) ? (language === 'ar' ? 'ناجح' : 'Passed') : (language === 'ar' ? 'راسب' : 'Failed')}
              </span>
            </div>
          )}
        </div>
      </div>
    </WaveBorderCard>
  );
};

const BookItem = ({ book, styles, language }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-3 sm:p-4 md:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 hover:border-${color.name}-400/50 transition min-h-[70px] sm:min-h-[80px]`}>
        <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-purple-400/10 flex items-center justify-center flex-shrink-0">
          <Icons.BookOpen className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-purple-500" />
        </div>
        <div className="flex-1">
          <Link href={`/dashboard/student/books/${book.id}`} className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} hover:text-${color.name}-500 transition`}>{book.title}</Link>
        </div>
      </div>
    </WaveBorderCard>
  );
};

// ================================================================
// صفحة تفاصيل الكورس – نسخة متجاوبة بالكامل
// ================================================================
export default function StudentCourseDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { theme, styles, language } = useTheme();

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

  // ===== حالات جديدة للتحكم في الوصول (الكورسات المدفوعة) =====
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  // ألوان متغيرة للرأس
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  const ensureProfile = useCallback(async (userId, userEmail) => {
    const { data: existingProfile } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
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
          if (parts.length === 2) return sum + parseInt(parts[0])*60 + parseInt(parts[1]);
          if (parts.length === 3) return sum + parseInt(parts[0])*3600 + parseInt(parts[1])*60 + parseInt(parts[2]);
        }
        return sum;
      }, 0);
      setTotalDuration(totalSecs);

      if (user && enrollment) {
        const videoIds = vidRes.data?.map(v => v.id) || [];
        const examIds = exRes.data?.map(e => e.id) || [];

        if (videoIds.length > 0) {
          const { data: watched } = await supabase.from('watch_history').select('video_id').eq('student_id', user.id).in('video_id', videoIds).eq('completed', true);
          const watchedMap = {};
          watched?.forEach(w => watchedMap[w.video_id] = true);
          setWatchedVideos(watchedMap);

          const { data: lastW } = await supabase.from('watch_history').select('*, video:videos(title)').eq('student_id', user.id).in('video_id', videoIds).order('watched_at', { ascending: false }).limit(1).single();
          if (lastW) setLastWatched(lastW);
        }

        if (examIds.length > 0) {
          const { data: attempts } = await supabase.from('exam_attempts').select('exam_id, score, total_marks').eq('student_id', user.id).in('exam_id', examIds);
          const attemptMap = {};
          attempts?.forEach(a => attemptMap[a.exam_id] = { attempted: true, score: Math.round((a.score/a.total_marks)*100) });
          setExamAttempts(attemptMap);
        }
      }
    } catch (err) { console.error('Error fetching content:', err); }
    finally { setContentLoading(false); }
  }, [id, enrollment]);

  const fetchCourseData = useCallback(async () => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      await ensureProfile(user.id, user.email);
      setUserProfile({ id: user.id, email: user.email });

      const { data: courseData, error: courseError } = await supabase
        .from('courses').select('*, teacher:teacher_id(full_name, email)').eq('id', id).single();
      if (courseError) throw courseError;
      if (!courseData) throw new Error('الكورس غير موجود');
      setCourse(courseData);
      setTeacher(courseData.teacher);

      // ================================================================
      // ✅ التحقق من صلاحية الوصول للكورس المدفوع
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

      // جلب الاشتراكات والتسجيلات
      const { data: enrollData } = await supabase.from('enrollments').select('*').eq('student_id', user.id).eq('course_id', id).maybeSingle();
      setEnrollment(enrollData);

      // ================================================================
      // 🆕 إنشاء enrollment تلقائياً إذا كان هناك اشتراك نشط ولم يكن مسجلاً
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

      if (courseData.grade_stage && courseData.grade_level) {
        const { data: related } = await supabase.from('courses').select('*, teacher:teacher_id(full_name)').eq('grade_stage', courseData.grade_stage).eq('grade_level', courseData.grade_level).neq('id', id).limit(3);
        setRelatedCourses(related || []);
      }

      const stored = localStorage.getItem('videoBookmarks');
      if (stored) setBookmarks(JSON.parse(stored));
    } catch (err) { toast.error(language==='ar'?'فشل تحميل الكورس':'Failed'); }
    finally { setLoading(false); }
  }, [id, language, router, fetchContent, ensureProfile]);

  useEffect(() => { if (fetchedRef.current) return; fetchedRef.current = true; fetchCourseData(); }, [fetchCourseData]);

  // ================================================================
  // 🎯 دالة الاشتراك (مع التحقق من الاشتراك الحالي)
  // ================================================================
  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(language==='ar'?'سجل الدخول':'Login'); return; }

      // ✅ التحقق من وجود اشتراك نشط أولاً
      const { data: existingSub } = await supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (existingSub) {
        const { data: existing } = await supabase.from('enrollments').select('*').eq('student_id', user.id).eq('course_id', id).maybeSingle();
        if (existing) {
          setEnrollment(existing);
          await fetchContent();
          toast.success(language==='ar'?'أنت مشترك بالفعل، تم تحميل المحتوى':'Already enrolled, content loaded');
          setActiveTab('videos');
          return;
        }

        const { error: insertError } = await supabase.from('enrollments').insert({ student_id: user.id, course_id: id, progress: 0 });
        if (insertError) throw insertError;
        setEnrollment({ progress: 0 });
        toast.success(language==='ar'?'تم الاشتراك! سيظهر المحتوى الآن':'Enrolled! Content will appear.');
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

      const { data: existing } = await supabase.from('enrollments').select('*').eq('student_id', user.id).eq('course_id', id).maybeSingle();
      if (existing) {
        setEnrollment(existing);
        await fetchContent();
        toast.success(language==='ar'?'أنت مشترك بالفعل، تم تحميل المحتوى':'Already enrolled, content loaded');
        setActiveTab('videos');
        return;
      }

      const { error: insertError } = await supabase.from('enrollments').insert({ student_id: user.id, course_id: id, progress: 0 });
      if (insertError) throw insertError;

      setEnrollment({ progress: 0 });
      toast.success(language==='ar'?'تم الاشتراك! سيظهر المحتوى الآن':'Enrolled! Content will appear.');
      await fetchContent();
      setActiveTab('videos');
    } catch (err) {
      console.error(err);
      if (err.message === 'profile_creation_failed') toast.error(language==='ar'?'فشل إنشاء الملف الشخصي. يرجى المحاولة لاحقاً.':'Profile creation failed. Try again later.');
      else toast.error(language==='ar'?'فشل الاشتراك. حاول مرة أخرى.':'Enrollment failed. Try again.');
    } finally { setEnrolling(false); }
  };

  const toggleBookmark = (videoId) => {
    const updated = { ...bookmarks };
    if (updated[videoId]) delete updated[videoId];
    else updated[videoId] = true;
    setBookmarks(updated);
    localStorage.setItem('videoBookmarks', JSON.stringify(updated));
  };

  const progress = enrollment?.progress || 0;
  const enrolled = !!enrollment;
  const completedVideos = Object.keys(watchedVideos).length;
  const totalVideos = videos.length;
  const videosProgress = totalVideos > 0 ? (completedVideos / totalVideos) * 100 : 0;
  const attemptedExams = Object.keys(examAttempts).length;
  const totalExams = exams.length;
  const examsProgress = totalExams > 0 ? (attemptedExams / totalExams) * 100 : 0;

  // ===== شاشة تحميل أو التحقق من الصلاحية =====
  if (loading || isCheckingAccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
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
  // 🚫 شاشة رفض الوصول (الكورسات المدفوعة)
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
      <div className={`min-h-screen flex items-center justify-center ${styles.bg} p-4`}>
        <div className={`max-w-md w-full p-6 sm:p-8 rounded-2xl sm:rounded-3xl ${styles.card} border ${styles.border} text-center shadow-2xl`}>
          <div className="inline-flex p-3 sm:p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.Lock className="h-12 w-12 sm:h-16 sm:w-16 text-red-400" />
          </div>
          <h2 className={`text-xl sm:text-2xl font-extrabold ${styles.text} mt-4`}>
            {language === 'ar' ? '🚫 وصول ممنوع' : '🚫 Access Denied'}
          </h2>
          <p className={`text-sm sm:text-base ${styles.subtext} mt-2 leading-relaxed`}>{message}</p>
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-center mt-6">
            <button
              onClick={() => router.back()}
              className="px-4 py-2.5 sm:px-6 sm:py-2.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition shadow-lg shadow-yellow-400/20 text-sm sm:text-base"
            >
              {language === 'ar' ? 'العودة' : 'Go Back'}
            </button>
            {accessReason === 'no_subscription' && (
              <button
                onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)}
                className="px-4 py-2.5 sm:px-6 sm:py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg shadow-blue-500/30 text-sm sm:text-base"
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
        <p className={styles.subtext}>{language==='ar'?'الكورس غير موجود':'Not found'}</p>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen ${styles.bg}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-6 sm:space-y-8 md:space-y-10">
        {/* ===== هيدر الكورس مع Wave Border – متجاوب ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-4 sm:p-5 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6 md:gap-8">
              {/* صورة الكورس */}
              <div className="lg:col-span-1">
                <div className="aspect-video rounded-xl sm:rounded-2xl overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-[var(--border-color)] relative shadow-2xl">
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      className="w-full h-full object-contain bg-black/10"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Icons.BookOpen className="h-14 w-14 sm:h-20 sm:w-20 text-gray-600" />
                    </div>
                  )}
                  {enrolled && (
                    <div className="absolute bottom-2 left-2 sm:bottom-3 sm:left-3 bg-black/60 backdrop-blur-md rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 text-[10px] sm:text-sm font-bold text-white flex items-center gap-2">
                      <div className={`w-2 h-2 sm:w-3 sm:h-3 rounded-full ${progress === 100 ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                      {progress === 100 ? (language === 'ar' ? 'مكتمل' : 'Completed') : `${Math.round(progress)}%`}
                    </div>
                  )}
                </div>
              </div>

              {/* معلومات الكورس */}
              <div className="lg:col-span-2 space-y-4 sm:space-y-5 md:space-y-6">
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <span className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold ${course.is_free||course.price===0?'bg-green-500/20 text-green-400':'bg-blue-500/20 text-blue-400'} backdrop-blur-sm border border-current/20`}>
                    {course.is_free||course.price===0? (language==='ar'?'مجاني':'Free') : `${course.price} جنيه`}
                  </span>
                  <span className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-[10px] sm:text-sm font-bold bg-purple-500/10 text-purple-400 border border-purple-400/20">
                    {course.grade_stage==='primary'? (language==='ar'?'ابتدائي':'Primary') : course.grade_stage==='middle'? (language==='ar'?'إعدادي':'Middle') : (language==='ar'?'ثانوي':'High')}
                    {course.grade_level && ` ${language==='ar'?'الصف':'Grade'} ${course.grade_level}`}
                  </span>
                </div>

                <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold ${styles.text} leading-tight`}>{course.title}</h1>

                {teacher && (
                  <div className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-400/10">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-base sm:text-lg md:text-xl shadow-lg">
                      {teacher.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-base sm:text-lg md:text-xl font-bold ${styles.text}`}>{teacher.full_name}</p>
                      <p className={`text-xs sm:text-sm ${styles.subtext}`}>{language==='ar'?'المعلم':'Teacher'}{teacher.email ? ` • ${teacher.email}` : ''}</p>
                    </div>
                  </div>
                )}

                {course.description && (
                  <div className={`p-4 sm:p-5 rounded-xl ${styles.card} border ${styles.border}`}>
                    <h4 className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} mb-2 sm:mb-3`}>{language==='ar'?'وصف الكورس':'Description'}</h4>
                    <p className={`text-xs sm:text-sm md:text-base ${styles.subtext} leading-relaxed`}>{course.description}</p>
                  </div>
                )}

                {totalDuration > 0 && (
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm md:text-base">
                    <Icons.Clock className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-500" />
                    <span className={styles.subtext}>{formatDuration(totalDuration, language)} {language==='ar'?'محتوى':'content'}</span>
                  </div>
                )}

                {/* لوحة تحكم مصغرة – متجاوبة */}
                {enrolled && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className={`p-3 sm:p-4 md:p-5 rounded-xl ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={videosProgress} size={80} strokeWidth={6} styles={styles} />
                      <p className={`text-[10px] sm:text-sm mt-2 sm:mt-3 ${styles.subtext}`}>{language==='ar'?'الفيديوهات':'Videos'} ({completedVideos}/{totalVideos})</p>
                    </div>
                    <div className={`p-3 sm:p-4 md:p-5 rounded-xl ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={examsProgress} size={80} strokeWidth={6} styles={styles} />
                      <p className={`text-[10px] sm:text-sm mt-2 sm:mt-3 ${styles.subtext}`}>{language==='ar'?'الامتحانات':'Exams'} ({attemptedExams}/{totalExams})</p>
                    </div>
                    <div className={`p-3 sm:p-4 md:p-5 rounded-xl ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={progress} size={80} strokeWidth={6} styles={styles} />
                      <p className={`text-[10px] sm:text-sm mt-2 sm:mt-3 ${styles.subtext}`}>{language==='ar'?'التقدم العام':'Overall'}</p>
                    </div>
                    {lastWatched && (
                      <div className={`p-3 sm:p-4 md:p-5 rounded-xl ${styles.card} border ${styles.border} flex flex-col justify-center`}>
                        <p className={`text-[10px] sm:text-sm ${styles.subtext}`}>{language==='ar'?'آخر مشاهدة':'Last Watched'}</p>
                        <Link href={`/watch/${lastWatched.video_id}`} className={`text-xs sm:text-sm md:text-base font-bold text-blue-500 hover:underline line-clamp-2 mt-1 sm:mt-2`}>{lastWatched.video?.title || 'فيديو'}</Link>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-3 sm:gap-4 pt-2 sm:pt-3">
                  {enrolled ? (
                    <>
                      <Link href={`/dashboard/student/courses/${id}/progress`} className="px-5 py-3 sm:px-6 sm:py-3.5 md:px-8 md:py-4 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-sm sm:text-base md:text-lg hover:scale-105 transition shadow-2xl shadow-blue-500/30 flex items-center gap-2">
                        <Icons.ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                        {language==='ar'?'متابعة التعلم':'Continue Learning'}
                      </Link>
                    </>
                  ) : (
                    // ===== قسم الكورس غير المشترك (مع دعم الكورسات المدفوعة) =====
                    <div className="w-full text-center py-5 sm:py-6 md:py-8">
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                        {course.is_free || course.price === 0 ? (
                          <button onClick={handleEnroll} disabled={enrolling} className="px-6 py-3 sm:px-8 sm:py-3.5 md:px-10 md:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl sm:rounded-2xl hover:scale-105 transition shadow-2xl shadow-green-500/30 text-base sm:text-lg md:text-xl">
                            {enrolling ? (language==='ar'?'جاري...':'Loading...') : (language==='ar'?'ابدأ الآن 🚀':'Start Now 🚀')}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)} className="px-6 py-3 sm:px-8 sm:py-3.5 md:px-10 md:py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl sm:rounded-2xl hover:scale-105 transition shadow-2xl shadow-blue-500/30 text-base sm:text-lg md:text-xl">
                              {language==='ar'?'💳 الاشتراك الآن':'💳 Subscribe Now'}
                            </button>
                            <button onClick={handleEnroll} disabled={enrolling} className="px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4 bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 font-bold rounded-xl sm:rounded-2xl hover:scale-105 transition border border-gray-500/30 text-sm sm:text-base md:text-lg">
                              {enrolling ? (language==='ar'?'جاري...':'Loading...') : (language==='ar'?'🔑 لدي كود شحن':'🔑 I have a code')}
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

        {/* ===== المحتوى ===== */}
        {enrolled && (
          <>
            <div className="flex gap-1.5 sm:gap-2 border-b-2 border-gray-200 dark:border-white/10 pb-2 sm:pb-3 overflow-x-auto no-scrollbar">
              <TabButton active={activeTab==='videos'} onClick={()=>setActiveTab('videos')} icon={Icons.Video} label={language==='ar'?'الفيديوهات':'Videos'} count={totalVideos} styles={styles}/>
              <TabButton active={activeTab==='exams'} onClick={()=>setActiveTab('exams')} icon={Icons.FileQuestion} label={language==='ar'?'الامتحانات':'Exams'} count={totalExams} styles={styles}/>
              <TabButton active={activeTab==='books'} onClick={()=>setActiveTab('books')} icon={Icons.Book} label={language==='ar'?'الكتب':'Books'} count={books.length} styles={styles}/>
              
              {/* ✅ تبويب جديد: إرسال سؤال أكاديمي (بدلاً من المراجعات) */}
              <TabButton 
                active={activeTab==='academic'} 
                onClick={() => {
                  router.push(`/dashboard/student/support/academic?course=${id}`);
                }} 
                icon={Icons.MessageCircle} 
                label={language==='ar'?'سؤال أكاديمي':'Academic Q'} 
                styles={styles}
              />
            </div>
            <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="space-y-3 sm:space-y-4">
              {contentLoading ? (
                <div className="flex justify-center py-12 sm:py-20"><div className="w-12 h-12 sm:w-16 sm:h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"/></div>
              ) : (
                <>
                  {activeTab==='videos' && (
                    <div className="space-y-3 sm:space-y-4">
                      {videos.length>0 ? videos.map(v=>(
                        <VideoItem key={v.id} video={v} bookmarked={!!bookmarks[v.id]} onToggleBookmark={toggleBookmark} styles={styles} language={language} watched={!!watchedVideos[v.id]}/>
                      )) : <p className={`text-base sm:text-lg ${styles.subtext}`}>{language==='ar'?'لا توجد فيديوهات':'No videos yet'}</p>}
                    </div>
                  )}
                  {activeTab==='exams' && (
                    <div className="space-y-3 sm:space-y-4">
                      {exams.length>0 ? exams.map(e=>(
                        <ExamItem key={e.id} exam={e} styles={styles} language={language} attempted={!!examAttempts[e.id]?.attempted} score={examAttempts[e.id]?.score}/>
                      )) : <p className={`text-base sm:text-lg ${styles.subtext}`}>{language==='ar'?'لا توجد امتحانات':'No exams yet'}</p>}
                    </div>
                  )}
                  {activeTab==='books' && (
                    <div className="space-y-3 sm:space-y-4">
                      {books.length>0 ? books.map(b=>(
                        <BookItem key={b.id} book={b} styles={styles} language={language}/>
                      )) : <p className={`text-base sm:text-lg ${styles.subtext}`}>{language==='ar'?'لا توجد كتب':'No books yet'}</p>}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}

        {!enrolled && (
          // ===== عرض القفل للكورسات غير المشترك فيها =====
          <div className="text-center py-16 sm:py-20 md:py-28 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl sm:rounded-3xl">
            <Icons.Lock className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 text-gray-400 mx-auto mb-3 sm:mb-4 md:mb-5"/>
            <h3 className={`text-xl sm:text-2xl md:text-3xl font-bold ${styles.text} mb-2 sm:mb-3 md:mb-4`}>
              {course.is_free ? (language==='ar'?'ابدأ التعلم مجاناً':'Start learning for free') : (language==='ar'?'اشترك للوصول للمحتوى':'Enroll to access content')}
            </h3>
            <p className={`text-sm sm:text-base md:text-lg ${styles.subtext} max-w-lg mx-auto px-4`}>
              {course.is_free
                ? (language==='ar' ? 'هذا الكورس مجاني! يمكنك البدء فوراً.' : 'This course is free! You can start right away.')
                : (language==='ar'
                    ? 'بعد الاشتراك ستتمكن من مشاهدة الفيديوهات وحل الامتحانات وتحميل الكتب ومتابعة تقدمك'
                    : 'After enrolling you can watch videos, take exams, download books and track your progress.')
              }
            </p>
            {course.is_free ? (
              <button onClick={handleEnroll} disabled={enrolling} className="mt-4 sm:mt-5 md:mt-6 px-6 py-3 sm:px-8 sm:py-3.5 md:px-10 md:py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-xl sm:rounded-2xl hover:scale-105 transition shadow-2xl shadow-green-500/30 text-base sm:text-lg md:text-xl">
                {enrolling ? (language==='ar'?'جاري...':'Loading...') : (language==='ar'?'ابدأ الآن 🚀':'Start Now 🚀')}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-4 sm:mt-5 md:mt-6">
                <button onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)} className="px-6 py-3 sm:px-8 sm:py-3.5 md:px-10 md:py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl sm:rounded-2xl hover:scale-105 transition shadow-2xl shadow-blue-500/30 text-base sm:text-lg md:text-xl">
                  {language==='ar'?'💳 الاشتراك الآن':'💳 Subscribe Now'}
                </button>
                <button onClick={handleEnroll} disabled={enrolling} className="px-4 py-3 sm:px-5 sm:py-3.5 md:px-6 md:py-4 bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 font-bold rounded-xl sm:rounded-2xl hover:scale-105 transition border border-gray-500/30 text-sm sm:text-base md:text-lg">
                  {enrolling ? (language==='ar'?'جاري...':'Loading...') : (language==='ar'?'🔑 لدي كود شحن':'🔑 I have a code')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== كورسات ذات صلة ===== */}
        {relatedCourses.length>0 && (
          <div>
            <h2 className={`text-xl sm:text-2xl font-bold ${styles.text} mb-3 sm:mb-4 md:mb-5 flex items-center gap-2 sm:gap-3`}>
              <Icons.Grid3X3 className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-500"/> {language==='ar'?'كورسات ذات صلة':'Related Courses'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
              {relatedCourses.map(rc=>(
                <Link key={rc.id} href={`/dashboard/student/courses/${rc.id}`} className={`p-4 sm:p-5 md:p-6 rounded-xl border ${styles.border} ${styles.card} hover:border-blue-400/50 transition group`}>
                  <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Icons.BookOpen className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7 text-blue-500 group-hover:scale-110 transition"/>
                    </div>
                    <span className={`text-sm sm:text-base md:text-lg font-bold ${styles.text} line-clamp-1`}>{rc.title}</span>
                  </div>
                  {rc.teacher && <p className={`text-xs sm:text-sm ${styles.subtext}`}>{rc.teacher.full_name}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* إضافة CSS لإخفاء شريط التمرير للتبويبات */}
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