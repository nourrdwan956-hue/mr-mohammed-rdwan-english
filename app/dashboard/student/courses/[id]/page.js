// app/dashboard/student/courses/[id]/page.js
// ================================================================
// 🏛️ صفحة تفاصيل الكورس – نسخة متطورة
// ✅ التقدم يعتمد فقط على الامتحانات المجتازة
// ✅ أيقونات صغيرة (h-3 w-3) في كل مكان
// ✅ عبارات تحفيزية بالعامية المصرية
// ✅ معالجة الأخطاء بشكل كامل (بدون 406 أو ReferenceError)
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Play,
  CheckCircle,
  Bookmark,
  FileText,
  BookOpen,
  Clock,
  ArrowLeft,
  Lock,
  Grid3X3,
  Video,
  FileQuestion,
  Book,
  MessageCircle,
  ArrowDown,
  ArrowUp,
  Award,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { checkCourseAccess } from '@/lib/course-access';

// ================================================================
// 1. ألوان البطاقات
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10' },
  { name: 'red', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  return available.length ? available[Math.floor(Math.random() * available.length)] : CARD_COLORS[0];
};

// ================================================================
// 2. Wave Border Card (محسن)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange }) => {
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const intervalTime = isMobile ? 200 : 50;
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
    padding: '2px',
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
// 3. دوال مساعدة
// ================================================================
const formatDuration = (totalSeconds, language) => {
  if (!totalSeconds || totalSeconds === 0) return language === 'ar' ? 'غير محدد' : 'N/A';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return language === 'ar' ? `${hours}س ${minutes}د` : `${hours}h ${minutes}m`;
  return language === 'ar' ? `${minutes}د` : `${minutes}m`;
};

// ================================================================
// 4. عبارات تحفيزية بالعامية المصرية
// ================================================================
const getMotivationalMessage = (percentage, attemptedExams, totalExams, language) => {
  if (attemptedExams === 0) {
    return language === 'ar'
      ? '📘 لسه مبدأتش تحل امتحانات! ابدأ دلوقتي وورينا شطارتك'
      : '📘 You haven\'t started exams yet! Start now!';
  }
  if (percentage === 0 && attemptedExams > 0) {
    return language === 'ar'
      ? '📚 عادي يا بطل، كلنا بنتعلم من الأخطاء. راجع المادة وحاول تاني'
      : '📚 It\'s okay, we all learn from mistakes. Review and try again';
  }
  if (percentage >= 80) {
    return language === 'ar'
      ? '🌟 يا عبقري! أنت طالع عن السحاب! كمل على كده وهتبقى الأول'
      : '🌟 Genius! You\'re off the charts! Keep it up!';
  } else if (percentage >= 60) {
    return language === 'ar'
      ? '⭐ ماشي حالك يا نجم، شد حيلك شوية وهتوصل للقمة'
      : '⭐ You\'re doing great, push a bit more!';
  } else if (percentage >= 40) {
    return language === 'ar'
      ? '📈 في تقدم ملحوظ! استمر ولا تيأس، النجاح قريب'
      : '📈 Noticeable progress! Keep going!';
  } else {
    return language === 'ar'
      ? '💪 أنت أقوى مما تظن! ركز على اللي فاتك، وربنا معاك'
      : '💪 You\'re stronger than you think! Focus on what you missed';
  }
};

// ================================================================
// 5. مكونات العرض – أيقونات صغيرة جداً
// ================================================================

// ✅ TabButton – أيقونة h-3 w-3
const TabButton = ({ active, onClick, icon: Icon, label, count, styles }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1 px-1.5 py-1 rounded-lg text-[9px] sm:text-[10px] font-bold transition-all duration-300 whitespace-nowrap ${
      active ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 scale-105' : `${styles.subtext} hover:bg-gray-100 dark:hover:bg-white/5`
    }`}
  >
    <Icon className="h-3 w-3" />
    <span className="hidden xs:inline">{label}</span>
    {count !== undefined && (
      <span className={`text-[7px] rounded-full px-1 py-0.5 ${active ? 'bg-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-gray-200 dark:bg-white/10'}`}>{count}</span>
    )}
  </button>
);

// ✅ CircularProgress – حجم 44 بكسل
const CircularProgress = ({ percentage, size = 44, strokeWidth = 3, label, styles }) => {
  const s = size;
  const sw = Math.max(2, strokeWidth);
  const radius = (s - sw) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={s} height={s} className="transform -rotate-90">
        <circle cx={s/2} cy={s/2} r={radius} className="stroke-current text-gray-200 dark:text-white/10" strokeWidth={sw} fill="none" />
        <motion.circle
          cx={s/2} cy={s/2} r={radius}
          stroke="url(#grad)"
          strokeWidth={sw}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FACC15" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-[9px] sm:text-[10px] font-extrabold">{Math.round(percentage)}%</span>
        {label && <span className="text-[5px] sm:text-[6px] text-gray-400 -mt-0.5">{label}</span>}
      </div>
    </div>
  );
};

// ✅ VideoItem – أيقونة h-3 w-3
const VideoItem = memo(({ video, bookmarked, onToggleBookmark, styles, language }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  return (
    <WaveBorderCard initialColor={color.name} onColorChange={setColor}>
      <div className="p-1.5 flex items-center gap-1.5 hover:border-blue-400/50 transition group relative min-h-[36px]">
        <div className="flex-shrink-0">
          <div className="w-6 h-6 rounded-lg bg-blue-400/10 flex items-center justify-center">
            <Play className="h-3 w-3 text-blue-500" />
          </div>
          {video.duration && (
            <span className="absolute -bottom-0.5 -right-0.5 bg-black/80 text-white text-[5px] px-1 py-0.5 rounded font-mono">
              {video.duration}
            </span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/watch/${video.id}`} className="text-[9px] sm:text-[10px] font-bold hover:text-blue-500 transition line-clamp-1">
            {video.title}
          </Link>
        </div>
        <button onClick={() => onToggleBookmark(video.id)} className="p-0.5 rounded-lg transition text-gray-400 hover:text-yellow-500">
          <Bookmark className={`h-2.5 w-2.5 ${bookmarked ? 'fill-yellow-500 text-yellow-500' : ''}`} />
        </button>
      </div>
    </WaveBorderCard>
  );
});
VideoItem.displayName = 'VideoItem';

// ✅ ExamItem – أيقونة h-3 w-3
const ExamItem = memo(({ exam, styles, language, attempted, score, passed }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  return (
    <WaveBorderCard initialColor={color.name} onColorChange={setColor}>
      <div className="p-1.5 flex items-center gap-1.5 hover:border-blue-400/50 transition min-h-[36px]">
        <div className={`w-6 h-6 rounded-lg ${attempted ? (passed ? 'bg-green-400/10' : 'bg-red-400/10') : 'bg-blue-400/10'} flex items-center justify-center flex-shrink-0`}>
          <FileText className={`h-3 w-3 ${attempted ? (passed ? 'text-green-500' : 'text-red-500') : 'text-blue-500'}`} />
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/dashboard/student/exams/${exam.id}`} className="text-[9px] sm:text-[10px] font-bold hover:text-blue-500 transition line-clamp-1">
            {exam.title}
          </Link>
          {attempted && score !== undefined && (
            <div className="flex items-center gap-1">
              <span className={`text-[7px] sm:text-[8px] font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {score}% • {passed ? '✅ ناجح' : '❌ راسب'}
              </span>
            </div>
          )}
        </div>
      </div>
    </WaveBorderCard>
  );
});
ExamItem.displayName = 'ExamItem';

// ✅ BookItem – أيقونة h-3 w-3
const BookItem = memo(({ book, styles, language }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  return (
    <WaveBorderCard initialColor={color.name} onColorChange={setColor}>
      <div className="p-1.5 flex items-center gap-1.5 hover:border-blue-400/50 transition min-h-[36px]">
        <div className="w-6 h-6 rounded-lg bg-purple-400/10 flex items-center justify-center flex-shrink-0">
          <BookOpen className="h-3 w-3 text-purple-500" />
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/dashboard/student/books/${book.id}`} className="text-[9px] sm:text-[10px] font-bold hover:text-purple-500 transition line-clamp-1">
            {book.title}
          </Link>
        </div>
      </div>
    </WaveBorderCard>
  );
});
BookItem.displayName = 'BookItem';

// ✅ OrderToggleButton – أيقونة h-3 w-3
const OrderToggleButton = ({ order, onToggle, styles, language }) => {
  const isDesc = order === 'desc';
  const Icon = isDesc ? ArrowDown : ArrowUp;
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-lg text-[8px] font-semibold transition-all duration-200 border ${
        isDesc
          ? 'border-yellow-400/60 bg-yellow-400/20 text-yellow-400'
          : 'border-blue-400/50 bg-blue-400/10 text-blue-400'
      }`}
    >
      <Icon className="h-2.5 w-2.5" />
      <span className="hidden xs:inline">{isDesc ? 'الأحدث' : 'الأقدم'}</span>
    </button>
  );
};

// ✅ MotivationalCard – أيقونة h-4 w-4
const MotivationalCard = ({ message, icon: Icon, styles, color = 'yellow' }) => {
  const colorMap = {
    yellow: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400',
    green: 'border-green-400/30 bg-green-400/10 text-green-400',
    blue: 'border-blue-400/30 bg-blue-400/10 text-blue-400',
    red: 'border-red-400/30 bg-red-400/10 text-red-400',
    purple: 'border-purple-400/30 bg-purple-400/10 text-purple-400',
  };
  const bgClass = colorMap[color] || colorMap.yellow;
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={`p-1.5 rounded-lg border ${bgClass} backdrop-blur-sm flex items-start gap-1.5`}
    >
      <Icon className="h-4 w-4 flex-shrink-0 mt-0.5" />
      <p className="text-[9px] sm:text-[10px] font-medium leading-relaxed">{message}</p>
    </motion.div>
  );
};

// ================================================================
// 6. الصفحة الرئيسية
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
  const [examAttempts, setExamAttempts] = useState({});
  const [totalDuration, setTotalDuration] = useState(0);
  const fetchedRef = useRef(false);

  const [videoOrder, setVideoOrder] = useState('desc');
  const [examOrder, setExamOrder] = useState('desc');
  const [bookOrder, setBookOrder] = useState('desc');

  const [accessDenied, setAccessDenied] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  // ===== إحصائيات الامتحانات (التقدم الحقيقي) =====
  const examStats = useMemo(() => {
    const total = exams.length;
    if (total === 0) return { total, attempted: 0, passed: 0, avgScore: 0, percentage: 0 };

    let attemptedCount = 0;
    let passedCount = 0;
    let scoreSum = 0;

    exams.forEach(exam => {
      const attempt = examAttempts[exam.id];
      if (attempt && attempt.attempted) {
        attemptedCount++;
        scoreSum += attempt.score || 0;
        if (attempt.passed) passedCount++;
      }
    });

    const avgScore = attemptedCount > 0 ? Math.round(scoreSum / attemptedCount) : 0;
    const percentage = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    return { total, attempted: attemptedCount, passed: passedCount, avgScore, percentage };
  }, [exams, examAttempts]);

  const motivationalMessage = useMemo(() => {
    return getMotivationalMessage(examStats.percentage, examStats.attempted, examStats.total, language);
  }, [examStats, language]);

  const studentLevel = useMemo(() => {
    const p = examStats.percentage;
    if (p >= 80) return 'green';
    if (p >= 50) return 'yellow';
    if (p > 0) return 'blue';
    return 'red';
  }, [examStats.percentage]);

  // ===== جلب المحتوى (معدل لإصلاح الأخطاء) =====
  const fetchContent = useCallback(async () => {
    if (!id) return;
    setContentLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const [vidRes, exRes, bkRes] = await Promise.all([
        supabase.from('videos').select('*').eq('course_id', id).order('created_at', { ascending: videoOrder === 'asc' }),
        supabase.from('exams').select('*').eq('course_id', id).order('created_at', { ascending: examOrder === 'asc' }),
        supabase.from('books').select('*').eq('course_id', id).order('created_at', { ascending: bookOrder === 'asc' }),
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

      // ✅ جلب محاولات الامتحانات فقط (بدون watch_history)
      if (user && enrollment) {
        const examIds = exRes.data?.map(e => e.id) || [];
        if (examIds.length > 0) {
          const { data: attempts, error: attemptsError } = await supabase
            .from('exam_attempts')
            .select('exam_id, score, total_marks, passed')
            .eq('student_id', user.id)
            .in('exam_id', examIds)
            .eq('status', 'completed');

          if (attemptsError) {
            console.warn('⚠️ Error fetching attempts:', attemptsError);
          }

          // ✅ تعريف attemptMap داخل هذا النطاق
          const attemptMap = {};
          attempts?.forEach(a => {
            const existing = attemptMap[a.exam_id];
            if (!existing || a.score > existing.score) {
              const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0;
              attemptMap[a.exam_id] = {
                attempted: true,
                score: pct,
                passed: a.passed === true || pct >= (exRes.data?.find(e => e.id === a.exam_id)?.passing_marks || 0),
              };
            }
          });
          setExamAttempts(attemptMap);
        }
      }
    } catch (err) {
      console.error('❌ Error fetching content:', err);
      toast.error(language === 'ar' ? 'فشل تحميل المحتوى' : 'Failed to load content');
    } finally {
      setContentLoading(false);
    }
  }, [id, enrollment, videoOrder, examOrder, bookOrder, language]);

  // ===== جلب بيانات الكورس =====
  const fetchCourseData = useCallback(async () => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // ✅ استخدام maybeSingle() لتجنب 406
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: user.id,
          email: user.email,
          full_name: user.email?.split('@')[0] || 'طالب',
          role: 'student',
          created_at: new Date().toISOString(),
        });
      }

      // ✅ استخدام maybeSingle() لتجنب 406
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*, teacher:teacher_id(full_name, email)')
        .eq('id', id)
        .maybeSingle();

      if (courseError || !courseData) {
        toast.error(language === 'ar' ? 'الكورس غير موجود' : 'Course not found');
        setLoading(false);
        return;
      }

      setCourse(courseData);
      setTeacher(courseData.teacher);

      // التحقق من صلاحية الوصول
      if (courseData && !courseData.is_free && courseData.price > 0) {
        setIsCheckingAccess(true);
        const accessResult = await checkCourseAccess(courseData.id, user.id);
        setIsCheckingAccess(false);
        if (!accessResult.allowed) {
          setAccessDenied(true);
          setAccessReason(accessResult.reason || 'default');
          setLoading(false);
          return;
        }
      }

      // ✅ استخدام maybeSingle() لتجنب 406
      const { data: enrollData } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .maybeSingle();

      setEnrollment(enrollData);

      // التحقق من اشتراك نشط
      const { data: subscription } = await supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (subscription && !enrollData) {
        await supabase
          .from('enrollments')
          .insert({ student_id: user.id, course_id: id, progress: 0 });
        await fetchContent();
        setEnrollment({ progress: 0 });
        setActiveTab('videos');
      }

      if (enrollData) {
        await fetchContent();
      }

      // جلب كورسات ذات صلة
      if (courseData.grade_stage && courseData.grade_level) {
        const { data: related } = await supabase
          .from('courses')
          .select('*, teacher:teacher_id(full_name)')
          .eq('grade_stage', courseData.grade_stage)
          .eq('grade_level', courseData.grade_level)
          .neq('id', id)
          .order('created_at', { ascending: false })
          .limit(3);

        setRelatedCourses(related || []);
      }

      const stored = localStorage.getItem('videoBookmarks');
      if (stored) setBookmarks(JSON.parse(stored));
    } catch (err) {
      console.error('❌ Error fetching course:', err);
      toast.error(language === 'ar' ? 'فشل تحميل الكورس' : 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [id, language, router, fetchContent]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchCourseData();
  }, [fetchCourseData]);

  useEffect(() => {
    if (enrollment && id) fetchContent();
  }, [videoOrder, examOrder, bookOrder]);

  // ===== الاشتراك =====
  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(language === 'ar' ? 'سجل الدخول أولاً' : 'Please login');
        return;
      }

      // التحقق من اشتراك نشط
      const { data: subscription } = await supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .eq('is_active', true)
        .maybeSingle();

      if (subscription) {
        const { data: existing } = await supabase
          .from('enrollments')
          .select('*')
          .eq('student_id', user.id)
          .eq('course_id', id)
          .maybeSingle();

        if (existing) {
          setEnrollment(existing);
          await fetchContent();
          toast.success(language === 'ar' ? 'أنت مشترك بالفعل' : 'Already enrolled');
          setActiveTab('videos');
          return;
        }

        await supabase
          .from('enrollments')
          .insert({ student_id: user.id, course_id: id, progress: 0 });
        setEnrollment({ progress: 0 });
        toast.success(language === 'ar' ? 'تم الاشتراك!' : 'Enrolled!');
        await fetchContent();
        setActiveTab('videos');
        return;
      }

      if (!course.is_free && course.price > 0) {
        toast.info(language === 'ar' ? 'هذا الكورس مدفوع' : 'This course is paid');
        router.push(`/dashboard/student/courses/${id}/payment`);
        return;
      }

      // كورس مجاني
      const { data: existing } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .maybeSingle();

      if (existing) {
        setEnrollment(existing);
        await fetchContent();
        toast.success(language === 'ar' ? 'أنت مشترك بالفعل' : 'Already enrolled');
        setActiveTab('videos');
        return;
      }

      await supabase
        .from('enrollments')
        .insert({ student_id: user.id, course_id: id, progress: 0 });
      setEnrollment({ progress: 0 });
      toast.success(language === 'ar' ? 'تم الاشتراك!' : 'Enrolled!');
      await fetchContent();
      setActiveTab('videos');
    } catch (err) {
      console.error('❌ Enroll error:', err);
      toast.error(language === 'ar' ? 'فشل الاشتراك' : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const toggleBookmark = (videoId) => {
    const updated = { ...bookmarks };
    if (updated[videoId]) delete updated[videoId];
    else updated[videoId] = true;
    setBookmarks(updated);
    localStorage.setItem('videoBookmarks', JSON.stringify(updated));
  };

  const toggleVideoOrder = () => setVideoOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  const toggleExamOrder = () => setExamOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  const toggleBookOrder = () => setBookOrder(prev => prev === 'desc' ? 'asc' : 'desc');

  // ===== شاشات التحميل =====
  if (loading || isCheckingAccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-[10px] sm:text-xs text-gray-400">
            {isCheckingAccess ? 'جاري التحقق...' : 'جاري التحميل...'}
          </p>
        </div>
      </div>
    );
  }

  if (accessDenied) {
    const messages = {
      no_subscription: 'هذا الكورس مدفوع. يرجى الاشتراك أولاً.',
      max_devices: 'تجاوزت الحد الأقصى للأجهزة المسموح بها.',
      expired: 'انتهت صلاحية اشتراكك.',
      default: 'لا يمكنك الوصول إلى هذا الكورس.',
    };
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg} p-3`}>
        <div className="max-w-xs w-full p-4 rounded-2xl bg-card border text-center shadow-2xl">
          <Lock className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <h2 className="text-base font-extrabold">🚫 وصول ممنوع</h2>
          <p className="text-xs text-gray-400 mt-1">{messages[accessReason] || messages.default}</p>
          <button onClick={() => router.back()} className="mt-3 px-4 py-1.5 bg-yellow-400 text-black font-bold rounded-lg text-xs">
            العودة
          </button>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <p className="text-sm text-gray-400">الكورس غير موجود</p>
      </div>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <div className={`w-full min-h-screen ${styles.bg} overflow-x-hidden`}>
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-1.5 space-y-2">

        {/* ===== هيدر الكورس ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-2 sm:p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {/* الصورة */}
              <div className="md:col-span-1">
                <div className="aspect-video rounded-lg overflow-hidden bg-gray-800/50 border relative">
                  {course.cover_image ? (
                    <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <BookOpen className="h-8 w-8 text-gray-600" />
                    </div>
                  )}
                  {enrollment && (
                    <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-md rounded-lg px-1.5 py-0.5 flex items-center gap-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${examStats.percentage === 100 ? 'bg-green-400' : 'bg-yellow-400 animate-pulse'}`} />
                      <span className="text-[8px] font-bold text-white">
                        {examStats.percentage === 100 ? 'مكتمل' : `${Math.round(examStats.percentage)}%`}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* المعلومات */}
              <div className="md:col-span-2 space-y-1.5">
                <div className="flex flex-wrap items-center gap-1">
                  <span className={`px-1.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-bold ${course.is_free ? 'bg-green-500/20 text-green-400' : 'bg-blue-500/20 text-blue-400'}`}>
                    {course.is_free ? 'مجاني' : `${course.price} ج.م`}
                  </span>
                  <span className="px-1.5 py-0.5 rounded-full text-[7px] sm:text-[8px] font-bold bg-purple-500/10 text-purple-400">
                    {course.grade_stage === 'primary' ? 'ابتدائي' : course.grade_stage === 'middle' ? 'إعدادي' : 'ثانوي'}
                    {course.grade_level && ` صف ${course.grade_level}`}
                  </span>
                </div>

                <h1 className="text-base sm:text-xl md:text-2xl font-extrabold leading-tight">{course.title}</h1>

                {teacher && (
                  <div className="flex items-center gap-1.5 p-1.5 rounded-lg bg-blue-500/5 border border-blue-400/10">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-[8px]">
                      {teacher.full_name?.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-[10px] sm:text-xs font-bold truncate">{teacher.full_name}</p>
                  </div>
                )}

                {course.description && (
                  <div className="p-1.5 rounded-lg bg-card border">
                    <p className="text-[9px] sm:text-[10px] line-clamp-2">{course.description}</p>
                  </div>
                )}

                {totalDuration > 0 && (
                  <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-gray-400">
                    <Clock className="h-2.5 w-2.5" />
                    <span>{formatDuration(totalDuration, language)} محتوى</span>
                  </div>
                )}

                {/* ===== لوحة التقدم (امتحانات فقط) ===== */}
                {enrollment && (
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
                      <div className="p-1 rounded-lg bg-card border text-center">
                        <CircularProgress percentage={examStats.percentage} size={40} strokeWidth={3} styles={styles} />
                        <p className="text-[6px] sm:text-[7px] text-gray-400 mt-0.5">
                          اجتياز ({examStats.passed}/{examStats.total})
                        </p>
                      </div>
                      <div className="p-1 rounded-lg bg-card border text-center flex flex-col justify-center">
                        <p className="text-sm font-extrabold">{examStats.attempted}</p>
                        <p className="text-[6px] sm:text-[7px] text-gray-400">تم حلها</p>
                      </div>
                      <div className="p-1 rounded-lg bg-card border text-center flex flex-col justify-center">
                        <p className="text-sm font-extrabold">{examStats.avgScore}%</p>
                        <p className="text-[6px] sm:text-[7px] text-gray-400">المتوسط</p>
                      </div>
                      <div className="p-1 rounded-lg bg-card border text-center flex flex-col justify-center">
                        <p className="text-sm font-extrabold">{examStats.total}</p>
                        <p className="text-[6px] sm:text-[7px] text-gray-400">إجمالي</p>
                      </div>
                    </div>

                    <MotivationalCard
                      message={motivationalMessage}
                      icon={examStats.percentage >= 80 ? Award : examStats.percentage >= 50 ? TrendingUp : AlertCircle}
                      styles={styles}
                      color={studentLevel}
                    />

                    <Link
                      href={`/dashboard/student/courses/${id}/progress`}
                      className="inline-flex items-center gap-0.5 text-[8px] sm:text-[9px] font-bold text-yellow-400 hover:text-yellow-300 transition"
                    >
                      📊 عرض التقدم التفصيلي →
                    </Link>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 pt-0.5">
                  {enrollment ? (
                    <Link
                      href={`/dashboard/student/courses/${id}/progress`}
                      className="px-2 py-0.5 rounded-lg bg-blue-500 text-white font-bold text-[8px] sm:text-[9px] hover:scale-105 transition flex items-center gap-0.5"
                    >
                      <ArrowLeft className="h-2.5 w-2.5" /> متابعة
                    </Link>
                  ) : (
                    <div className="w-full text-center py-1.5">
                      <div className="flex flex-col sm:flex-row gap-1 justify-center">
                        {course.is_free ? (
                          <button onClick={handleEnroll} disabled={enrolling} className="px-2.5 py-0.5 bg-green-500 text-white font-bold rounded-lg text-[8px] sm:text-[9px]">
                            {enrolling ? 'جاري...' : 'ابدأ الآن 🚀'}
                          </button>
                        ) : (
                          <>
                            <button onClick={() => router.push(`/dashboard/student/courses/${id}/payment`)} className="px-2.5 py-0.5 bg-blue-500 text-white font-bold rounded-lg text-[8px] sm:text-[9px]">
                              💳 اشتراك
                            </button>
                            <button onClick={handleEnroll} disabled={enrolling} className="px-2.5 py-0.5 bg-gray-500/20 text-gray-400 font-bold rounded-lg text-[8px] sm:text-[9px] border border-gray-500/30">
                              {enrolling ? 'جاري...' : '🔑 كود'}
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
        {enrollment && (
          <>
            <div className="flex gap-0.5 border-b-2 pb-0.5 overflow-x-auto no-scrollbar">
              <TabButton active={activeTab === 'videos'} onClick={() => setActiveTab('videos')} icon={Video} label="فيديوهات" count={videos.length} styles={styles} />
              <TabButton active={activeTab === 'exams'} onClick={() => setActiveTab('exams')} icon={FileQuestion} label="امتحانات" count={exams.length} styles={styles} />
              <TabButton active={activeTab === 'books'} onClick={() => setActiveTab('books')} icon={Book} label="كتب" count={books.length} styles={styles} />
              <TabButton active={activeTab === 'academic'} onClick={() => router.push(`/dashboard/student/support/academic?course=${id}`)} icon={MessageCircle} label="سؤال" styles={styles} />
            </div>

            <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
              {contentLoading ? (
                <div className="flex justify-center py-4">
                  <div className="w-5 h-5 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                </div>
              ) : (
                <>
                  {activeTab === 'videos' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400">{videos.length} فيديو</span>
                        <OrderToggleButton order={videoOrder} onToggle={toggleVideoOrder} styles={styles} language={language} />
                      </div>
                      <div className="space-y-1">
                        {videos.length > 0 ? videos.map(v => (
                          <VideoItem key={v.id} video={v} bookmarked={!!bookmarks[v.id]} onToggleBookmark={toggleBookmark} styles={styles} language={language} />
                        )) : (
                          <p className="text-[9px] sm:text-[10px] text-gray-400 text-center py-2">لا توجد فيديوهات</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'exams' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400">{exams.length} امتحان</span>
                        <OrderToggleButton order={examOrder} onToggle={toggleExamOrder} styles={styles} language={language} />
                      </div>
                      <div className="space-y-1">
                        {exams.length > 0 ? exams.map(e => {
                          const attempt = examAttempts[e.id];
                          return (
                            <ExamItem
                              key={e.id}
                              exam={e}
                              styles={styles}
                              language={language}
                              attempted={attempt?.attempted || false}
                              score={attempt?.score}
                              passed={attempt?.passed || false}
                            />
                          );
                        }) : (
                          <p className="text-[9px] sm:text-[10px] text-gray-400 text-center py-2">لا توجد امتحانات</p>
                        )}
                      </div>
                    </div>
                  )}

                  {activeTab === 'books' && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] sm:text-[10px] font-bold text-gray-400">{books.length} كتاب</span>
                        <OrderToggleButton order={bookOrder} onToggle={toggleBookOrder} styles={styles} language={language} />
                      </div>
                      <div className="space-y-1">
                        {books.length > 0 ? books.map(b => (
                          <BookItem key={b.id} book={b} styles={styles} language={language} />
                        )) : (
                          <p className="text-[9px] sm:text-[10px] text-gray-400 text-center py-2">لا توجد كتب</p>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </>
        )}

        {!enrollment && (
          <div className="text-center py-4 border-2 border-dashed rounded-xl">
            <Lock className="h-6 w-6 text-gray-400 mx-auto mb-1" />
            <h3 className="text-sm font-bold">اشترك للوصول للمحتوى</h3>
            <p className="text-[9px] text-gray-400 max-w-md mx-auto px-3">
              بعد الاشتراك ستتمكن من مشاهدة الفيديوهات وحل الامتحانات وتحميل الكتب
            </p>
          </div>
        )}

        {/* ===== كورسات ذات صلة ===== */}
        {relatedCourses.length > 0 && (
          <div>
            <h2 className="text-xs sm:text-sm font-bold mb-1 flex items-center gap-0.5">
              <Grid3X3 className="h-3 w-3 text-blue-500" /> كورسات ذات صلة
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
              {relatedCourses.map(rc => (
                <Link key={rc.id} href={`/dashboard/student/courses/${rc.id}`} className="p-1.5 rounded-lg border hover:border-blue-400/50 transition">
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <BookOpen className="h-3 w-3 text-blue-500" />
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-bold line-clamp-1">{rc.title}</span>
                  </div>
                  {rc.teacher && <p className="text-[7px] sm:text-[8px] text-gray-400 mt-0.5">{rc.teacher.full_name}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @media (max-width: 480px) { .xs\\:inline { display: inline; } }
      `}</style>
    </div>
  );
}