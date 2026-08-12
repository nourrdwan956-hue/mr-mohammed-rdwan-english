// app/dashboard/student/courses/[id]/progress/page.js
// ================================================================
// 🏛️ صفحة تقدم الكورس – نسخة متطورة تعتمد على الامتحانات فقط
// ✅ التقدم = عدد الامتحانات المجتازة ÷ إجمالي الامتحانات
// ✅ عرض تفاصيل كل امتحان (درجة، نجاح/رسوب، passing_marks)
// ✅ عرض متوسط الدرجات
// ✅ عبارات تحفيزية بالعامية المصرية حسب المستوى
// ✅ إشعار بالامتحانات غير المحلولة
// ✅ خفيفة وسريعة على الموبايل، فخمة على الديسكتوب
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
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// ================================================================
// 1. ألوان البطاقات (نظام Wave Border)
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
  return available.length ? available[Math.floor(Math.random() * available.length)] : CARD_COLORS[0];
};

// ================================================================
// 2. Wave Border Card (محسن للموبايل)
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
const formatDate = (dateString, language) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ================================================================
// 4. دوال العبارات التحفيزية بالعامية المصرية
// ================================================================
const getMotivationalMessage = (percentage, attemptedExams, totalExams, language) => {
  // إذا لم يحل أي امتحان
  if (attemptedExams === 0) {
    return language === 'ar'
      ? '📘 لسه مبدأتش تحل امتحانات! ابدأ دلوقتي وورينا شطارتك'
      : '📘 You haven\'t started exams yet! Start now and show your skills';
  }

  // إذا كان عدد الامتحانات المجتازة = 0 (لكن حلها)
  if (percentage === 0) {
    return language === 'ar'
      ? '💪 عادي يا بطل، كلنا بنتعلم من الأخطاء. راجع المادة وحاول تاني'
      : '💪 It\'s okay, we all learn from mistakes. Review and try again';
  }

  // إذا كانت كل الامتحانات محلولة لكن نسبة الاجتياز أقل من 100%
  if (attemptedExams === totalExams && percentage < 100) {
    return language === 'ar'
      ? '🔥 حللت كل الامتحانات! بس لسه في شوية أخطاء، راجعها وهتكون متمكن 100%'
      : '🔥 You solved all exams! But there are some mistakes, review them and you\'ll master it 100%';
  }

  // نسبة الاجتياز
  if (percentage >= 80) {
    return language === 'ar'
      ? '🌟 يا عبقري! أداءك خيالي، كمل على كده وهتبقى أسطورة'
      : '🌟 Genius! Your performance is legendary, keep it up!';
  } else if (percentage >= 60) {
    return language === 'ar'
      ? '⭐ ماشي حالك يا نجم، شد حيلك شوية وهتوصل للقمة'
      : '⭐ You\'re doing great, push a bit more and you\'ll reach the top';
  } else if (percentage >= 40) {
    return language === 'ar'
      ? '📈 في تقدم واضح! استمر ولا تيأس، النجاح قريب'
      : '📈 Clear progress! Keep going, success is near';
  } else {
    return language === 'ar'
      ? '💪 أنت أقوى مما تظن! ركز على اللي فاتك، وربنا معاك'
      : '💪 You\'re stronger than you think! Focus on what you missed';
  }
};

// ================================================================
// 5. مكونات عرض العناصر
// ================================================================

// 5.1 شريط تقدم خطي
const LinearProgress = ({ value, max = 100, label, styles, color = 'blue', showPercentage = true }) => {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const colors = {
    blue: 'from-blue-400 to-blue-600',
    yellow: 'from-yellow-400 to-yellow-600',
    green: 'from-green-400 to-green-600',
    purple: 'from-purple-400 to-purple-600',
    orange: 'from-orange-400 to-orange-600',
    red: 'from-red-400 to-red-600',
  };
  const grad = colors[color] || colors.blue;
  return (
    <div className="space-y-0.5 sm:space-y-1">
      {label && (
        <div className="flex justify-between text-[10px] sm:text-xs">
          <span className={styles.subtext}>{label}</span>
          {showPercentage && <span className={`font-bold ${styles.text}`}>{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="w-full h-2 sm:h-2.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${grad} rounded-full shadow-lg shadow-${color}-500/20`}
        />
      </div>
    </div>
  );
};

// 5.2 دائرة التقدم
const CircularProgress = ({ percentage, size = 70, strokeWidth = 6, styles, label, sublabel, color = 'blue' }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;
  const gradients = {
    blue: ['#60A5FA', '#2563EB'],
    yellow: ['#FACC15', '#D97706'],
    green: ['#34D399', '#059669'],
    purple: ['#A78BFA', '#7C3AED'],
    orange: ['#FB923C', '#EA580C'],
    red: ['#F87171', '#DC2626'],
  };
  const [c1, c2] = gradients[color] || gradients.blue;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90 drop-shadow-lg w-[60px] sm:w-[70px] md:w-[80px] h-[60px] sm:h-[70px] md:h-[80px]">
        <circle cx={size/2} cy={size/2} r={radius} className="stroke-current text-gray-200 dark:text-white/10" strokeWidth={strokeWidth} fill="none" />
        <motion.circle
          cx={size/2} cy={size/2} r={radius}
          stroke={`url(#grad-${color})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} />
            <stop offset="100%" stopColor={c2} />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-sm sm:text-base font-black ${styles.text}`}>{Math.round(percentage)}%</span>
        {label && <span className={`text-[7px] sm:text-[10px] ${styles.subtext} -mt-0.5`}>{label}</span>}
        {sublabel && <span className={`text-[6px] sm:text-[9px] ${styles.muted}`}>{sublabel}</span>}
      </div>
    </div>
  );
};

// 5.3 بطاقة الامتحان التفصيلية
const ExamProgressCard = ({ exam, attempt, styles, language }) => {
  const attempted = !!attempt;
  const score = attempt ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;
  const passed = attempt?.passed === true;
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 transition min-h-[56px] sm:min-h-[64px]`}>
        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
          attempted ? (passed ? 'bg-green-400/20' : 'bg-red-400/20') : 'bg-gray-400/10'
        }`}>
          {attempted ? (
            passed ? <Icons.Award className="h-5 w-5 sm:h-5 sm:w-5 text-green-500" /> : <Icons.XCircle className="h-5 w-5 sm:h-5 sm:w-5 text-red-500" />
          ) : (
            <Icons.FileText className="h-5 w-5 sm:h-5 sm:w-5 text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Link href={`/dashboard/student/exams/${exam.id}`} className={`text-xs sm:text-sm font-bold ${styles.text} hover:${color.text} transition line-clamp-1`}>
            {exam.title}
          </Link>
          <p className={`text-[9px] sm:text-[10px] ${styles.subtext}`}>
            {exam.duration_minutes ? `${exam.duration_minutes} ${language === 'ar' ? 'دقيقة' : 'min'}` : ''}
            {exam.total_marks ? ` • ${exam.total_marks} ${language === 'ar' ? 'درجة' : 'marks'}` : ''}
            {exam.passing_marks ? ` • ${language === 'ar' ? 'نجاح:' : 'Pass:'} ${exam.passing_marks}` : ''}
          </p>
        </div>

        <div className="text-right flex-shrink-0 w-full sm:w-auto">
          {attempted ? (
            <>
              <span className={`text-sm sm:text-base font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{score}%</span>
              <p className={`text-[9px] sm:text-[10px] ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {passed ? (language === 'ar' ? '✅ ناجح' : 'Passed') : (language === 'ar' ? '❌ راسب' : 'Failed')}
              </p>
            </>
          ) : (
            <span className="text-xs sm:text-sm text-gray-400">{language === 'ar' ? 'لم يحل' : 'Not taken'}</span>
          )}
          {attempt?.created_at && <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5">{formatDate(attempt.created_at, language)}</p>}
        </div>
      </div>
    </WaveBorderCard>
  );
};

// 5.4 بطاقة تحفيزية
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`p-2 sm:p-3 rounded-xl border ${bgClass} backdrop-blur-sm flex items-start gap-2 sm:gap-3`}
    >
      <Icon className="h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 mt-0.5" />
      <p className={`text-[10px] sm:text-sm font-medium ${styles.text} leading-relaxed`}>{message}</p>
    </motion.div>
  );
};

// ================================================================
// 6. الصفحة الرئيسية
// ================================================================
export default function StudentCourseProgressPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const { theme, styles, language } = useTheme();

  const [course, setCourse] = useState(null);
  const [teacher, setTeacher] = useState(null);
  const [videos, setVideos] = useState([]);
  const [exams, setExams] = useState([]);
  const [watchHistory, setWatchHistory] = useState({});
  const [examAttempts, setExamAttempts] = useState({});
  const [enrollment, setEnrollment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const fetchedRef = useRef(false);

  // ===== إحصائيات الامتحانات المحسوبة =====
  const examStats = useMemo(() => {
    const total = exams.length;
    if (total === 0) return {
      total,
      attempted: 0,
      passed: 0,
      avgScore: 0,
      percentage: 0,
      attemptedExams: 0,
      scores: [],
    };

    let attemptedCount = 0;
    let passedCount = 0;
    let scoreSum = 0;
    const scores = [];

    exams.forEach(exam => {
      const attempt = examAttempts[exam.id];
      if (attempt && attempt.attempted) {
        attemptedCount++;
        const pct = attempt.score || 0;
        scoreSum += pct;
        scores.push(pct);
        if (attempt.passed) passedCount++;
      }
    });

    const avgScore = attemptedCount > 0 ? Math.round(scoreSum / attemptedCount) : 0;
    const percentage = total > 0 ? Math.round((passedCount / total) * 100) : 0;

    return {
      total,
      attempted: attemptedCount,
      passed: passedCount,
      avgScore,
      percentage,
      attemptedExams: attemptedCount,
      scores,
    };
  }, [exams, examAttempts]);

  // ===== العبارة التحفيزية =====
  const motivationalMessage = useMemo(() => {
    return getMotivationalMessage(examStats.percentage, examStats.attempted, examStats.total, language);
  }, [examStats, language]);

  // ===== مستوى الطالب =====
  const studentLevel = useMemo(() => {
    const p = examStats.percentage;
    const attempted = examStats.attempted;
    if (attempted === 0) return 'blue';
    if (p >= 80) return 'green';
    if (p >= 50) return 'yellow';
    return 'red';
  }, [examStats.percentage, examStats.attempted]);

  // ===== إشعار الامتحانات غير المحلولة =====
  const pendingExams = useMemo(() => {
    return exams.filter(e => !examAttempts[e.id]?.attempted);
  }, [exams, examAttempts]);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

      // جلب التسجيل
      const { data: enrollData, error: enrollError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .maybeSingle();

      if (enrollError || !enrollData) {
        toast.error(language === 'ar' ? 'أنت غير مسجل في هذا الكورس' : 'You are not enrolled in this course');
        router.replace(`/dashboard/student/courses/${id}`);
        return;
      }
      setEnrollment(enrollData);

      // جلب الكورس
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError || !courseData) {
        toast.error(language === 'ar' ? 'الكورس غير موجود' : 'Course not found');
        setLoading(false);
        return;
      }
      setCourse(courseData);

      if (courseData.teacher_id) {
        const { data: teacherData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', courseData.teacher_id)
          .single();
        if (teacherData) setTeacher(teacherData);
      }

      // جلب الفيديوهات والامتحانات
      const [vidRes, exRes] = await Promise.all([
        supabase.from('videos').select('*').eq('course_id', id).order('created_at', { ascending: true }),
        supabase.from('exams').select('*').eq('course_id', id).order('created_at', { ascending: true }),
      ]);
      setVideos(vidRes.data || []);
      setExams(exRes.data || []);

      // جلب محاولات الامتحانات
      const examIds = (exRes.data || []).map(e => e.id);
      if (examIds.length > 0) {
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('student_id', user.id)
          .in('exam_id', examIds)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        const attemptMap = {};
        attempts?.forEach(a => {
          const existing = attemptMap[a.exam_id];
          if (!existing || a.score > existing.score) {
            const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0;
            attemptMap[a.exam_id] = {
              attempted: true,
              score: pct,
              passed: a.passed === true || pct >= (exRes.data?.find(e => e.id === a.exam_id)?.passing_marks || 0),
              total_marks: a.total_marks || 0,
              created_at: a.created_at,
            };
          }
        });
        setExamAttempts(attemptMap);
      }

      // جلب سجل المشاهدة (للعرض فقط)
      const videoIds = (vidRes.data || []).map(v => v.id);
      if (videoIds.length > 0) {
        const { data: wh } = await supabase
          .from('watch_history')
          .select('*')
          .eq('student_id', user.id)
          .in('video_id', videoIds);
        const watchMap = {};
        wh?.forEach(h => {
          const existing = watchMap[h.video_id];
          if (!existing || (h.progress || 0) > (existing.progress || 0)) {
            watchMap[h.video_id] = h;
          }
        });
        setWatchHistory(watchMap);
      }

      // إعداد الرسم البياني
      const examLabels = (exRes.data || []).map(e => e.title?.substring(0, 15) || 'امتحان');
      const examScores = (exRes.data || []).map(e => {
        const att = attemptMap[e.id];
        return att ? att.score : 0;
      });
      if (examLabels.length > 0) {
        setChartData({
          labels: examLabels,
          datasets: [
            {
              label: language === 'ar' ? 'الدرجة %' : 'Score %',
              data: examScores,
              backgroundColor: examScores.map(s => s >= 50 ? 'rgba(52, 211, 153, 0.7)' : 'rgba(248, 113, 113, 0.7)'),
              borderColor: examScores.map(s => s >= 50 ? '#22c55e' : '#ef4444'),
              borderWidth: 2,
              borderRadius: 6,
            }
          ],
        });
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل تحميل التقدم' : 'Failed to load progress');
      setLoading(false);
    }
  }, [id, language, router]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, [fetchData]);

  // تحديث عند التركيز
  useEffect(() => {
    const handleFocus = () => { fetchData(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData]);

  // ===== شاشة التحميل =====
  if (loading) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className={`text-xs sm:text-sm ${styles.subtext}`}>
            {language === 'ar' ? 'جاري تحميل التقدم...' : 'Loading progress...'}
          </p>
        </div>
      </div>
    );
  }

  // ===== إذا لم يكن هناك كورس =====
  if (!course) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center p-3 ${styles.bg}`}>
        <div className="text-center max-w-md">
          <Icons.AlertCircle className="h-10 w-10 sm:h-12 sm:w-12 text-red-400 mx-auto mb-2" />
          <h2 className={`text-lg sm:text-xl font-bold ${styles.text}`}>
            {language === 'ar' ? '⚠️ الكورس غير موجود' : '⚠️ Course not found'}
          </h2>
          <p className={`mt-1 text-xs sm:text-sm ${styles.subtext}`}>
            {language === 'ar' ? 'قد يكون الكورس قد أُزيل.' : 'The course may have been removed.'}
          </p>
          <Link href="/dashboard/student/courses" className="mt-3 inline-block px-4 py-1.5 sm:px-5 sm:py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-lg hover:scale-105 transition shadow-lg shadow-yellow-400/30 text-[10px] sm:text-xs">
            {language === 'ar' ? 'العودة للكورسات' : 'Back to Courses'}
          </Link>
        </div>
      </div>
    );
  }

  // ================================================================
  // 7. العرض الرئيسي
  // ================================================================
  return (
    <div className={`w-full min-h-screen ${styles.bg}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-4 sm:space-y-5">
        {/* ===== رأس الصفحة ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <Link href={`/dashboard/student/courses/${id}`} className={`text-[10px] sm:text-xs ${styles.subtext} hover:text-yellow-400 transition flex items-center gap-1 mb-0.5`}>
                  <Icons.ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {course.title}
                </Link>
                <h1 className={`text-xl sm:text-2xl md:text-3xl font-black ${styles.text}`}>
                  {language === 'ar' ? '📊 تقدّمك في الامتحانات' : '📊 Exam Progress'}
                </h1>
                <p className={`text-[9px] sm:text-[10px] ${styles.subtext} mt-0.5`}>
                  {language === 'ar'
                    ? `مبني على عدد الامتحانات المجتازة من إجمالي ${examStats.total} امتحان`
                    : `Based on passed exams out of ${examStats.total} total`}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <CircularProgress
                  percentage={examStats.percentage}
                  size={70}
                  strokeWidth={6}
                  styles={styles}
                  color={studentLevel === 'green' ? 'green' : studentLevel === 'yellow' ? 'yellow' : 'blue'}
                  label={language === 'ar' ? 'اجتياز' : 'Passed'}
                  sublabel={`${examStats.passed}/${examStats.total}`}
                />
                <CircularProgress
                  percentage={examStats.avgScore}
                  size={70}
                  strokeWidth={6}
                  styles={styles}
                  color="purple"
                  label={language === 'ar' ? 'المتوسط' : 'Average'}
                  sublabel={`${examStats.avgScore}%`}
                />
              </div>
            </div>

            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                <Icons.FileQuestion className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mx-auto mb-0.5" />
                <p className={`text-sm sm:text-base font-bold ${styles.text}`}>{examStats.total}</p>
                <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'إجمالي الامتحانات' : 'Total Exams'}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                <Icons.CheckCircle className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 mx-auto mb-0.5" />
                <p className={`text-sm sm:text-base font-bold ${styles.text}`}>{examStats.passed}</p>
                <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'مجتازة' : 'Passed'}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                <Icons.Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mx-auto mb-0.5" />
                <p className={`text-sm sm:text-base font-bold ${styles.text}`}>{examStats.attempted}</p>
                <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'تم حلها' : 'Attempted'}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                <Icons.TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mx-auto mb-0.5" />
                <p className={`text-sm sm:text-base font-bold ${styles.text}`}>{examStats.avgScore}%</p>
                <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'المتوسط' : 'Average'}</p>
              </div>
            </div>

            {/* العبارة التحفيزية + إشعار الامتحانات غير المحلولة */}
            <div className="space-y-2">
              <MotivationalCard
                message={motivationalMessage}
                icon={examStats.percentage >= 80 ? Icons.Trophy : examStats.percentage >= 50 ? Icons.TrendingUp : Icons.AlertCircle}
                styles={styles}
                color={studentLevel}
              />

              {pendingExams.length > 0 && (
                <div className={`p-2 sm:p-3 rounded-xl border border-blue-400/30 bg-blue-400/10 backdrop-blur-sm flex items-start gap-2 sm:gap-3`}>
                  <Icons.Bell className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className={`text-[10px] sm:text-sm font-bold ${styles.text}`}>
                      {language === 'ar'
                        ? `📌 يوجد ${pendingExams.length} امتحان لم تحله بعد`
                        : `📌 You have ${pendingExams.length} exam(s) not taken yet`}
                    </p>
                    <p className={`text-[8px] sm:text-xs ${styles.subtext}`}>
                      {language === 'ar'
                        ? 'ادخل وحل الامتحانات عشان تكون متمكن من المادة'
                        : 'Take the exams to master the material'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== الرسم البياني ===== */}
        {chartData && (
          <div className={`p-3 sm:p-4 rounded-2xl ${styles.card} border ${styles.border}`}>
            <h3 className={`text-sm sm:text-base font-bold ${styles.text} mb-3`}>
              {language === 'ar' ? '📊 درجات الامتحانات' : '📊 Exam Scores'}
            </h3>
            <div className="h-40 sm:h-48 md:h-56">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { color: theme === 'dark' ? '#e2e8f0' : '#334155', font: { size: 9 } } }
                  },
                  scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, color: theme === 'dark' ? '#e2e8f0' : '#334155', font: { size: 9 } } },
                    x: { ticks: { color: theme === 'dark' ? '#e2e8f0' : '#334155', font: { size: 9 } } }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ===== قائمة الامتحانات التفصيلية ===== */}
        <div>
          <h2 className={`text-sm sm:text-base font-bold ${styles.text} mb-2 flex items-center gap-2`}>
            <Icons.List className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
            {language === 'ar' ? 'تفاصيل الامتحانات' : 'Exam Details'}
          </h2>
          <div className="space-y-2 sm:space-y-3">
            {exams.length > 0 ? (
              exams.map(e => (
                <ExamProgressCard
                  key={e.id}
                  exam={e}
                  attempt={examAttempts[e.id]}
                  styles={styles}
                  language={language}
                />
              ))
            ) : (
              <p className={`text-xs sm:text-sm ${styles.subtext} text-center py-8`}>
                {language === 'ar' ? 'لا توجد امتحانات في هذا الكورس' : 'No exams in this course'}
              </p>
            )}
          </div>
        </div>

        {/* ===== أزرار الإجراءات ===== */}
        <div className="flex flex-wrap gap-2 sm:gap-3 pt-2">
          <Link
            href={`/dashboard/student/courses/${id}`}
            className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-yellow-400 text-black font-bold text-[10px] sm:text-xs hover:bg-yellow-500 transition shadow-lg shadow-yellow-400/20 flex items-center gap-1"
          >
            <Icons.ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            {language === 'ar' ? 'العودة للكورس' : 'Back to Course'}
          </Link>
          {pendingExams.length > 0 && (
            <Link
              href={`/dashboard/student/courses/${id}`}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold text-[10px] sm:text-xs hover:scale-105 transition shadow-lg shadow-blue-500/30 flex items-center gap-1"
            >
              <Icons.FileQuestion className="h-3 w-3 sm:h-4 sm:w-4" />
              {language === 'ar' ? `حل الامتحانات (${pendingExams.length})` : `Take Exams (${pendingExams.length})`}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}