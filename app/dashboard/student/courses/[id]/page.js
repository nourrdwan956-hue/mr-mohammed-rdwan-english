// app/dashboard/student/courses/[id]/page.js
// ================================================================
// 🏛️ صفحة تفاصيل الكورس – متجاوبة بالكامل ومضغوطة (نسخة محسّنة)
// ✅ تصغير الأحجام والهوامش والأيقونات بشكل ديناميكي
// ✅ الحفاظ على جميع الوظائف (التحقق من الوصول، الاشتراك، التبويبات، إلخ)
// ✅ منع أي تجاوز أو تقطيع على جميع الشاشات
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
// ألوان البطاقات المتغيرة (مضغوطة)
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
// 🌊 مكون الحدود الموجية (Wave Border) – مضغوط ومتجاوب
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
    padding: '2px', // ✅ تصغير padding الحواف
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={`relative rounded-2xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-2xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-2xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
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
  if (hours > 0) return language === 'ar' ? `${hours} س ${minutes} د` : `${hours}h ${minutes}m`;
  return language === 'ar' ? `${minutes} د` : `${minutes}m`;
};

const formatDate = (dateString, language) => {
  return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
};

// ================================================================
// مكونات فرعية مضغوطة
// ================================================================

const TabButton = ({ active, onClick, icon: Icon, label, count, styles }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-2 py-1.5 sm:px-2.5 sm:py-2 rounded-lg text-[9px] sm:text-xs font-bold transition-all duration-300 whitespace-nowrap ${
      active ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 scale-105' : `${styles.subtext} hover:bg-gray-100 dark:hover:bg-white/5`
    }`}
  >
    <Icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
    <span className="hidden xs:inline">{label}</span>
    {count !== undefined && (
      <span className={`text-[8px] rounded-full px-1.5 py-0.5 sm:px-2 sm:py-0.5 ${active ? 'bg-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-gray-200 dark:bg-white/10'}`}>{count}</span>
    )}
  </button>
);

// ================================================================
// مكون دائرة التقدم – مضغوطة ومتجاوبة
// ================================================================
const CircularProgress = ({ percentage, size = 60, strokeWidth = 5, label, styles }) => {
  // تحديد الحجم بناءً على عرض الشاشة
  const [responsiveSize, setResponsiveSize] = useState(size);
  useEffect(() => {
    const updateSize = () => {
      const w = window.innerWidth;
      if (w < 480) setResponsiveSize(44);
      else if (w < 640) setResponsiveSize(48);
      else if (w < 768) setResponsiveSize(52);
      else setResponsiveSize(size);
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [size]);

  const s = responsiveSize;
  const sw = Math.max(3, strokeWidth * (s / 60));

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={s} height={s} className="transform -rotate-90">
        <circle cx={s/2} cy={s/2} r={s/2 - sw/2} className="stroke-current text-gray-200 dark:text-white/10" strokeWidth={sw} fill="none" />
        <motion.circle cx={s/2} cy={s/2} r={s/2 - sw/2} stroke="url(#grad)" strokeWidth={sw} fill="none" strokeLinecap="round"
          strokeDasharray={(s/2 - sw/2) * 2 * Math.PI}
          initial={{ strokeDashoffset: (s/2 - sw/2) * 2 * Math.PI }}
          animate={{ strokeDashoffset: (s/2 - sw/2) * 2 * Math.PI * (1 - percentage/100) }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#FACC15"/><stop offset="100%" stopColor="#D97706"/></linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-[8px] sm:text-[10px] md:text-xs font-extrabold ${styles.text}`}>{Math.round(percentage)}%</span>
        {label && <span className={`text-[6px] sm:text-[7px] ${styles.subtext} -mt-0.5`}>{label}</span>}
      </div>
    </div>
  );
};

// ================================================================
// مكونات عناصر المحتوى – مضغوطة ومتجاوبة
// ================================================================

const VideoItem = ({ video, bookmarked, onToggleBookmark, styles, language, watched }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-2 sm:p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 hover:border-${color.name}-400/50 transition group relative min-h-[50px] sm:min-h-[56px]`}>
        {watched && (
          <div className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 bg-green-500/20 text-green-400 rounded-full p-0.5">
            <Icons.CheckCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-current" />
          </div>
        )}
        <div className="relative flex-shrink-0">
          <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${watched ? 'bg-green-400/10' : 'bg-blue-400/10'} flex items-center justify-center`}>
            <Icons.Play className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${watched ? 'text-green-500' : `text-${color.name}-500`}`} />
          </div>
          {video.duration && (
            <span className="absolute -bottom-0.5 -right-0.5 bg-black/80 text-white text-[6px] px-1 py-0.5 rounded font-mono">
              {video.duration}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/watch/${video.id}`} className={`text-[10px] sm:text-sm font-bold ${styles.text} hover:text-${color.name}-500 transition line-clamp-1`}>
            {video.title}
          </Link>
          {video.description && <p className={`text-[8px] sm:text-[10px] ${styles.subtext} line-clamp-1 mt-0.5`}>{video.description}</p>}
        </div>
        <button onClick={() => onToggleBookmark(video.id)} className={`p-1.5 rounded-lg transition ${bookmarked ? `text-${color.name}-500 bg-${color.name}-400/10` : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-400/5'}`}>
          <Icons.Bookmark className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${bookmarked ? 'fill-current' : ''}`} />
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
      <div className={`p-2 sm:p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 hover:border-${color.name}-400/50 transition min-h-[50px] sm:min-h-[56px]`}>
        <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg ${attempted ? 'bg-blue-400/10' : 'bg-emerald-400/10'} flex items-center justify-center flex-shrink-0`}>
          <Icons.FileText className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${attempted ? 'text-blue-500' : 'text-emerald-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/dashboard/student/exams/${exam.id}`} className={`text-[10px] sm:text-sm font-bold ${styles.text} hover:text-${color.name}-500 transition line-clamp-1`}>
            {exam.title}
          </Link>
          {exam.duration_minutes && <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{exam.duration_minutes} {language==='ar'?'دقيقة':'min'}</p>}
          {attempted && score !== undefined && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`text-[8px] sm:text-[10px] font-bold ${score >= (exam.passing_marks || 50) ? 'text-green-400' : 'text-red-400'}`}>
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
      <div className={`p-2 sm:p-2.5 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 hover:border-${color.name}-400/50 transition min-h-[50px] sm:min-h-[56px]`}>
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-purple-400/10 flex items-center justify-center flex-shrink-0">
          <Icons.BookOpen className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/dashboard/student/books/${book.id}`} className={`text-[10px] sm:text-sm font-bold ${styles.text} hover:text-${color.name}-500 transition line-clamp-1`}>
            {book.title}
          </Link>
        </div>
      </div>
    </WaveBorderCard>
  );
};

// ================================================================
// صفحة تفاصيل الكورس – نسخة مضغوطة بالكامل ومتجاوبة
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

  // ===== حالات جديدة للتحكم في الوصول =====
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

      // ===== التحقق من صلاحية الوصول للكورس المدفوع =====
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

      // إنشاء enrollment تلقائياً إذا كان هناك اشتراك نشط ولم يكن مسجلاً
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

  // ===== دالة الاشتراك =====
  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(language==='ar'?'سجل الدخول':'Login'); return; }

      // التحقق من وجود اشتراك نشط أولاً
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
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`text-[10px] sm:text-xs ${styles.subtext}`}>
            {isCheckingAccess
              ? (language === 'ar' ? 'جاري التحقق من الصلاحية...' : 'Verifying access...')
              : (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
            }
          </p>
        </div>
      </div>
    );
  }

  // ===== شاشة رفض الوصول =====
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
      <div className={`min-h-screen flex items-center justify-center ${styles.bg} p-3`}>
        <div className={`max-w-sm w-full p-4 sm:p-6 rounded-2xl ${styles.card} border ${styles.border} text-center shadow-2xl`}>
          <div className="inline-flex p-2.5 sm:p-3 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.Lock className="h-8 w-8 sm:h-10 sm:w-10 text-red-400" />
          </div>
          <h2 className={`text-base sm:text-lg font-extrabold ${styles.text} mt-3`}>
            {language === 'ar' ? '🚫 وصول ممنوع' : '🚫 Access Denied'}
          </h2>
          <p className={`text-xs sm:text-sm ${styles.subtext} mt-1.5 leading-relaxed`}>{message}</p>
          <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 justify-center mt-4">
            <button
              onClick={() => router.back()}
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-yellow-400 text-black font-bold rounded-lg hover:bg-yellow-500 transition shadow-lg shadow-yellow-400/20 text-[10px] sm:text-xs"
            >
              {language === 'ar' ? 'العودة' : 'Go Back'}
            </button>
            {accessReason === 'no_subscription' && (
              <button
                onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)}
                className="px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition shadow-lg shadow-blue-500/30 text-[10px] sm:text-xs"
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
    <div className={`w-full min-h-screen ${styles.bg} overflow-x-hidden`}>
      <div className="max-w-7xl mx-auto px-2 sm:px-4 py-2 sm:py-4 space-y-3 sm:space-y-5">
        {/* ===== هيدر الكورس مع Wave Border – مضغوط ومتجاوب ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-2 sm:p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
              {/* صورة الكورس */}
              <div className="lg:col-span-1">
                <div className="aspect-video rounded-lg overflow-hidden bg-gradient-to-br from-gray-800/50 to-gray-900/50 border border-[var(--border-color)] relative shadow-xl">
                  {course.cover_image ? (
                    <img
                      src={course.cover_image}
                      alt={course.title}
                      className="w-full h-full object-contain bg-black/10"
                    />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Icons.BookOpen className="h-10 w-10 sm:h-14 sm:w-14 text-gray-600" />
                    </div>
                  )}
                  {enrolled && (
                    <div className="absolute bottom-1 left-1 sm:bottom-2 sm:left-2 bg-black/60 backdrop-blur-md rounded-lg px-1 py-0.5 sm:px-2 sm:py-1 text-[8px] sm:text-[10px] font-bold text-white flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${progress === 100 ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                      {progress === 100 ? (language === 'ar' ? 'مكتمل' : 'Completed') : `${Math.round(progress)}%`}
                    </div>
                  )}
                </div>
              </div>

              {/* معلومات الكورس */}
              <div className="lg:col-span-2 space-y-2 sm:space-y-3">
                <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                  <span className={`px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold ${course.is_free||course.price===0?'bg-green-500/20 text-green-400':'bg-blue-500/20 text-blue-400'} backdrop-blur-sm border border-current/20`}>
                    {course.is_free||course.price===0? (language==='ar'?'مجاني':'Free') : `${course.price} ج.م`}
                  </span>
                  <span className="px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-400/20">
                    {course.grade_stage==='primary'? (language==='ar'?'ابتدائي':'Primary') : course.grade_stage==='middle'? (language==='ar'?'إعدادي':'Middle') : (language==='ar'?'ثانوي':'High')}
                    {course.grade_level && ` ${language==='ar'?'صف':'G'} ${course.grade_level}`}
                  </span>
                </div>

                <h1 className={`text-lg sm:text-2xl md:text-3xl font-extrabold ${styles.text} leading-tight break-words`}>{course.title}</h1>

                {teacher && (
                  <div className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-400/10">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xs sm:text-base shadow-lg">
                      {teacher.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className={`text-xs sm:text-base font-bold ${styles.text}`}>{teacher.full_name}</p>
                      <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language==='ar'?'المعلم':'Teacher'}{teacher.email ? ` • ${teacher.email}` : ''}</p>
                    </div>
                  </div>
                )}

                {course.description && (
                  <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border}`}>
                    <h4 className={`text-[10px] sm:text-sm font-bold ${styles.text} mb-0.5`}>{language==='ar'?'وصف الكورس':'Description'}</h4>
                    <p className={`text-[9px] sm:text-xs ${styles.subtext} leading-relaxed line-clamp-3`}>{course.description}</p>
                  </div>
                )}

                {totalDuration > 0 && (
                  <div className="flex items-center gap-1 sm:gap-2 text-[9px] sm:text-xs">
                    <Icons.Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-500" />
                    <span className={styles.subtext}>{formatDuration(totalDuration, language)} {language==='ar'?'محتوى':'content'}</span>
                  </div>
                )}

                {/* لوحة تحكم مصغرة – مضغوطة جداً */}
                {enrolled && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-3">
                    <div className={`p-1.5 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={videosProgress} size={50} strokeWidth={4} styles={styles} />
                      <p className={`text-[7px] sm:text-[10px] mt-0.5 ${styles.subtext}`}>{language==='ar'?'فيديوهات':'Videos'} ({completedVideos}/{totalVideos})</p>
                    </div>
                    <div className={`p-1.5 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={examsProgress} size={50} strokeWidth={4} styles={styles} />
                      <p className={`text-[7px] sm:text-[10px] mt-0.5 ${styles.subtext}`}>{language==='ar'?'امتحانات':'Exams'} ({attemptedExams}/{totalExams})</p>
                    </div>
                    <div className={`p-1.5 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                      <CircularProgress percentage={progress} size={50} strokeWidth={4} styles={styles} />
                      <p className={`text-[7px] sm:text-[10px] mt-0.5 ${styles.subtext}`}>{language==='ar'?'التقدم':'Overall'}</p>
                    </div>
                    {lastWatched && (
                      <div className={`p-1.5 sm:p-3 rounded-lg ${styles.card} border ${styles.border} flex flex-col justify-center`}>
                        <p className={`text-[7px] sm:text-[10px] ${styles.subtext}`}>{language==='ar'?'آخر مشاهدة':'Last'}</p>
                        <Link href={`/watch/${lastWatched.video_id}`} className={`text-[8px] sm:text-[10px] font-bold text-blue-500 hover:underline line-clamp-1 mt-0.5`}>{lastWatched.video?.title || 'فيديو'}</Link>
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 sm:gap-3 pt-1">
                  {enrolled ? (
                    <>
                      <Link href={`/dashboard/student/courses/${id}/progress`} className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-[9px] sm:text-xs hover:scale-105 transition shadow-lg shadow-blue-500/30 flex items-center gap-1">
                        <Icons.ArrowLeft className="h-2.5 w-2.5 sm:h-3.5 sm:w-3.5" />
                        {language==='ar'?'متابعة التعلم':'Continue'}
                      </Link>
                    </>
                  ) : (
                    // ===== قسم الكورس غير المشترك (مضغوط) =====
                    <div className="w-full text-center py-2 sm:py-4">
                      <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 justify-center">
                        {course.is_free || course.price === 0 ? (
                          <button onClick={handleEnroll} disabled={enrolling} className="px-3 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:scale-105 transition shadow-lg shadow-green-500/30 text-[9px] sm:text-xs">
                            {enrolling ? (language==='ar'?'جاري...':'Loading...') : (language==='ar'?'ابدأ الآن 🚀':'Start Now 🚀')}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)} className="px-3 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition shadow-lg shadow-blue-500/30 text-[9px] sm:text-xs">
                              {language==='ar'?'💳 اشتراك':'💳 Subscribe'}
                            </button>
                            <button onClick={handleEnroll} disabled={enrolling} className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 font-bold rounded-lg hover:scale-105 transition border border-gray-500/30 text-[9px] sm:text-xs">
                              {enrolling ? (language==='ar'?'جاري...':'Loading...') : (language==='ar'?'🔑 كود':'🔑 Code')}
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
            <div className="flex gap-1 border-b-2 border-gray-200 dark:border-white/10 pb-1 overflow-x-auto no-scrollbar">
              <TabButton active={activeTab==='videos'} onClick={()=>setActiveTab('videos')} icon={Icons.Video} label={language==='ar'?'فيديوهات':'Videos'} count={totalVideos} styles={styles}/>
              <TabButton active={activeTab==='exams'} onClick={()=>setActiveTab('exams')} icon={Icons.FileQuestion} label={language==='ar'?'امتحانات':'Exams'} count={totalExams} styles={styles}/>
              <TabButton active={activeTab==='books'} onClick={()=>setActiveTab('books')} icon={Icons.Book} label={language==='ar'?'كتب':'Books'} count={books.length} styles={styles}/>
              <TabButton 
                active={activeTab==='academic'} 
                onClick={() => {
                  router.push(`/dashboard/student/support/academic?course=${id}`);
                }} 
                icon={Icons.MessageCircle} 
                label={language==='ar'?'سؤال':'Q'} 
                styles={styles}
              />
            </div>
            <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} className="space-y-2 sm:space-y-3">
              {contentLoading ? (
                <div className="flex justify-center py-8 sm:py-12"><div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"/></div>
              ) : (
                <>
                  {activeTab==='videos' && (
                    <div className="space-y-2 sm:space-y-3">
                      {videos.length>0 ? videos.map(v=>(
                        <VideoItem key={v.id} video={v} bookmarked={!!bookmarks[v.id]} onToggleBookmark={toggleBookmark} styles={styles} language={language} watched={!!watchedVideos[v.id]}/>
                      )) : <p className={`text-xs sm:text-sm ${styles.subtext}`}>{language==='ar'?'لا توجد فيديوهات':'No videos yet'}</p>}
                    </div>
                  )}
                  {activeTab==='exams' && (
                    <div className="space-y-2 sm:space-y-3">
                      {exams.length>0 ? exams.map(e=>(
                        <ExamItem key={e.id} exam={e} styles={styles} language={language} attempted={!!examAttempts[e.id]?.attempted} score={examAttempts[e.id]?.score}/>
                      )) : <p className={`text-xs sm:text-sm ${styles.subtext}`}>{language==='ar'?'لا توجد امتحانات':'No exams yet'}</p>}
                    </div>
                  )}
                  {activeTab==='books' && (
                    <div className="space-y-2 sm:space-y-3">
                      {books.length>0 ? books.map(b=>(
                        <BookItem key={b.id} book={b} styles={styles} language={language}/>
                      )) : <p className={`text-xs sm:text-sm ${styles.subtext}`}>{language==='ar'?'لا توجد كتب':'No books yet'}</p>}
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}

        {!enrolled && (
          // ===== عرض القفل للكورسات غير المشترك فيها (مضغوط) =====
          <div className="text-center py-6 sm:py-12 border-2 border-dashed border-gray-300 dark:border-white/10 rounded-2xl">
            <Icons.Lock className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-1.5"/>
            <h3 className={`text-sm sm:text-lg font-bold ${styles.text} mb-0.5`}>
              {course.is_free ? (language==='ar'?'ابدأ التعلم مجاناً':'Start learning for free') : (language==='ar'?'اشترك للوصول للمحتوى':'Enroll to access content')}
            </h3>
            <p className={`text-[9px] sm:text-xs ${styles.subtext} max-w-lg mx-auto px-3`}>
              {course.is_free
                ? (language==='ar' ? 'هذا الكورس مجاني! يمكنك البدء فوراً.' : 'This course is free! You can start right away.')
                : (language==='ar'
                    ? 'بعد الاشتراك ستتمكن من مشاهدة الفيديوهات وحل الامتحانات وتحميل الكتب'
                    : 'After enrolling you can watch videos, take exams, download books')
              }
            </p>
            {course.is_free ? (
              <button onClick={handleEnroll} disabled={enrolling} className="mt-2 px-4 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-bold rounded-lg hover:scale-105 transition shadow-lg shadow-green-500/30 text-[9px] sm:text-xs">
                {enrolling ? (language==='ar'?'جاري...':'Loading...') : (language==='ar'?'ابدأ الآن 🚀':'Start Now 🚀')}
              </button>
            ) : (
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-3 justify-center mt-2">
                <button onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)} className="px-3 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-lg hover:scale-105 transition shadow-lg shadow-blue-500/30 text-[9px] sm:text-xs">
                  {language==='ar'?'💳 اشتراك':'💳 Subscribe'}
                </button>
                <button onClick={handleEnroll} disabled={enrolling} className="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-gray-500/20 to-gray-600/20 text-gray-400 font-bold rounded-lg hover:scale-105 transition border border-gray-500/30 text-[9px] sm:text-xs">
                  {enrolling ? (language==='ar'?'جاري...':'Loading...') : (language==='ar'?'🔑 كود':'🔑 Code')}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ===== كورسات ذات صلة (مضغوطة) ===== */}
        {relatedCourses.length>0 && (
          <div>
            <h2 className={`text-sm sm:text-base font-bold ${styles.text} mb-2 flex items-center gap-1.5`}>
              <Icons.Grid3X3 className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500"/> {language==='ar'?'كورسات ذات صلة':'Related Courses'}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {relatedCourses.map(rc=>(
                <Link key={rc.id} href={`/dashboard/student/courses/${rc.id}`} className={`p-2 sm:p-3 rounded-lg border ${styles.border} ${styles.card} hover:border-blue-400/50 transition group`}>
                  <div className="flex items-center gap-2 sm:gap-3 mb-1">
                    <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <Icons.BookOpen className="h-3.5 w-3.5 sm:h-5 sm:w-5 text-blue-500 group-hover:scale-110 transition"/>
                    </div>
                    <span className={`text-[10px] sm:text-sm font-bold ${styles.text} line-clamp-1`}>{rc.title}</span>
                  </div>
                  {rc.teacher && <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{rc.teacher.full_name}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 480px) {
          .xs\\:inline { display: inline; }
        }
      `}</style>
    </div>
  );
}