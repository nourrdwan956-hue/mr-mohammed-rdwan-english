// app/dashboard/student/courses/[id]/progress/page.js
// ================================================================
// 🏛️ صفحة التقدم الداخلي – تقدم الكورس الحالي فقط
// ✅ يعتمد على الامتحانات المجتازة من إجمالي الامتحانات
// ✅ عرض إحصائيات: عدد الامتحانات، المجتاز، المحلول، المتوسط، النسبة
// ✅ قائمة تفصيلية لكل امتحان مع الدرجة والحالة
// ✅ رسم بياني لدرجات الامتحانات
// ✅ عبارات تحفيزية بالعامية المصرية حسب المستوى
// ✅ أيقونات صغيرة جداً (h-3 w-3) في كل مكان
// ✅ معالجة الأخطاء (لا 406 ولا ReferenceError)
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
const formatDate = (dateString, language) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

// ================================================================
// 4. عبارات تحفيزية بالعامية المصرية (مكررة من الملف السابق)
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
// 5. مكونات العرض – أيقونات صغيرة
// ================================================================

// ✅ دائرة التقدم – حجم 44 بكسل
const CircularProgress = ({ percentage, size = 44, strokeWidth = 3, styles, label }) => {
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

// ✅ شريط تقدم خطي
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
    <div className="space-y-0.5">
      {label && (
        <div className="flex justify-between text-[8px] sm:text-[9px]">
          <span className="text-gray-400">{label}</span>
          {showPercentage && <span className="font-bold text-gray-600 dark:text-gray-300">{Math.round(pct)}%</span>}
        </div>
      )}
      <div className="w-full h-1.5 sm:h-2 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className={`h-full bg-gradient-to-r ${grad} rounded-full`}
        />
      </div>
    </div>
  );
};

// ✅ بطاقة تحفيزية – أيقونة h-4 w-4
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

// ✅ بطاقة الامتحان التفصيلية
const ExamProgressCard = ({ exam, attempt, styles, language }) => {
  const attempted = !!attempt;
  const score = attempt ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;
  const passed = attempt?.passed === true;
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className="p-1.5 flex items-center gap-1.5 transition min-h-[36px]">
        <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${
          attempted ? (passed ? 'bg-green-400/10' : 'bg-red-400/10') : 'bg-gray-400/10'
        }`}>
          {attempted ? (
            passed ? <Icons.Award className="h-3 w-3 text-green-500" /> : <Icons.XCircle className="h-3 w-3 text-red-500" />
          ) : (
            <Icons.FileText className="h-3 w-3 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <Link href={`/dashboard/student/exams/${exam.id}`} className="text-[9px] sm:text-[10px] font-bold hover:text-blue-500 transition line-clamp-1">
            {exam.title}
          </Link>
          <p className="text-[7px] sm:text-[8px] text-gray-400">
            {exam.duration_minutes ? `${exam.duration_minutes} دقيقة` : ''}
            {exam.total_marks ? ` • ${exam.total_marks} درجة` : ''}
            {exam.passing_marks ? ` • نجاح: ${exam.passing_marks}` : ''}
          </p>
        </div>
        <div className="text-right flex-shrink-0">
          {attempted ? (
            <>
              <span className={`text-[9px] sm:text-[10px] font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>{score}%</span>
              <p className={`text-[7px] sm:text-[8px] ${passed ? 'text-green-400' : 'text-red-400'}`}>
                {passed ? '✅ ناجح' : '❌ راسب'}
              </p>
            </>
          ) : (
            <span className="text-[8px] sm:text-[9px] text-gray-400">لم يحل</span>
          )}
          {attempt?.created_at && <p className="text-[6px] sm:text-[7px] text-gray-500">{formatDate(attempt.created_at, language)}</p>}
        </div>
      </div>
    </WaveBorderCard>
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
  const [exams, setExams] = useState([]);
  const [examAttempts, setExamAttempts] = useState({});
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const fetchedRef = useRef(false);

  // ===== إحصائيات الامتحانات =====
  const examStats = useMemo(() => {
    const total = exams.length;
    if (total === 0) return { total, attempted: 0, passed: 0, avgScore: 0, percentage: 0, scores: [] };

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

    return { total, attempted: attemptedCount, passed: passedCount, avgScore, percentage, scores };
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

  const pendingExams = useMemo(() => {
    return exams.filter(e => !examAttempts[e.id]?.attempted);
  }, [exams, examAttempts]);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login');
        return;
      }

      // جلب التسجيل
      const { data: enrollData, error: enrollError } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', id)
        .maybeSingle();

      if (enrollError || !enrollData) {
        toast.error(language === 'ar' ? 'أنت غير مسجل في هذا الكورس' : 'You are not enrolled');
        router.replace(`/dashboard/student/courses/${id}`);
        return;
      }

      // جلب الكورس
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .maybeSingle();

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
          .maybeSingle();
        if (teacherData) setTeacher(teacherData);
      }

      // جلب الامتحانات
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .eq('course_id', id)
        .order('created_at', { ascending: true });

      if (examsError) {
        console.warn('Error fetching exams:', examsError);
      }
      setExams(examsData || []);

      // جلب محاولات الامتحانات
      const examIds = (examsData || []).map(e => e.id);
      const attemptMap = {}; // ✅ تعريف attemptMap هنا

      if (examIds.length > 0) {
        const { data: attempts, error: attemptsError } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('student_id', user.id)
          .in('exam_id', examIds)
          .eq('status', 'completed')
          .order('created_at', { ascending: false });

        if (attemptsError) {
          console.warn('Error fetching attempts:', attemptsError);
        }

        attempts?.forEach(a => {
          const existing = attemptMap[a.exam_id];
          if (!existing || a.score > existing.score) {
            const pct = a.total_marks > 0 ? Math.round((a.score / a.total_marks) * 100) : 0;
            attemptMap[a.exam_id] = {
              attempted: true,
              score: pct,
              passed: a.passed === true || pct >= (examsData?.find(e => e.id === a.exam_id)?.passing_marks || 0),
              total_marks: a.total_marks || 0,
              created_at: a.created_at,
            };
          }
        });
        setExamAttempts(attemptMap);
      }

      // إعداد الرسم البياني
      const examLabels = (examsData || []).map(e => e.title?.substring(0, 12) || 'امتحان');
      const examScores = (examsData || []).map(e => {
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
              backgroundColor: examScores.map(s => s >= 50 ? 'rgba(52, 211, 153, 0.6)' : 'rgba(248, 113, 113, 0.6)'),
              borderColor: examScores.map(s => s >= 50 ? '#22c55e' : '#ef4444'),
              borderWidth: 1,
              borderRadius: 4,
            }
          ],
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching data:', err);
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
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 sm:w-8 sm:h-8 border-3 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-[10px] sm:text-xs text-gray-400">جاري تحميل التقدم...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center p-3 ${styles.bg}`}>
        <div className="text-center">
          <Icons.AlertCircle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <h2 className="text-base font-bold">⚠️ الكورس غير موجود</h2>
          <Link href="/dashboard/student/courses" className="mt-2 inline-block px-3 py-1 bg-yellow-400 text-black font-bold rounded-lg text-xs">
            العودة للكورسات
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
      <div className="max-w-6xl mx-auto px-2 sm:px-4 py-1.5 space-y-2">

        {/* ===== رأس الصفحة ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-2 sm:p-3 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div>
                <Link href={`/dashboard/student/courses/${id}`} className="text-[8px] sm:text-[9px] text-gray-400 hover:text-yellow-400 transition flex items-center gap-0.5">
                  <Icons.ArrowRight className="h-2.5 w-2.5" /> {course.title}
                </Link>
                <h1 className="text-base sm:text-xl md:text-2xl font-black">📊 تقدّمك في الامتحانات</h1>
                <p className="text-[8px] sm:text-[9px] text-gray-400">
                  {language === 'ar'
                    ? `مبني على عدد الامتحانات المجتازة من إجمالي ${examStats.total} امتحان`
                    : `Based on passed exams out of ${examStats.total} total`}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <CircularProgress percentage={examStats.percentage} size={44} strokeWidth={3} styles={styles} label={`${examStats.passed}/${examStats.total}`} />
                <CircularProgress percentage={examStats.avgScore} size={44} strokeWidth={3} styles={styles} label={`${examStats.avgScore}%`} />
              </div>
            </div>

            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              <div className="p-1 rounded-lg bg-card border text-center">
                <Icons.FileQuestion className="h-3 w-3 text-blue-500 mx-auto" />
                <p className="text-sm font-bold">{examStats.total}</p>
                <p className="text-[6px] sm:text-[7px] text-gray-400">إجمالي الامتحانات</p>
              </div>
              <div className="p-1 rounded-lg bg-card border text-center">
                <Icons.CheckCircle className="h-3 w-3 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold">{examStats.passed}</p>
                <p className="text-[6px] sm:text-[7px] text-gray-400">مجتازة</p>
              </div>
              <div className="p-1 rounded-lg bg-card border text-center">
                <Icons.Clock className="h-3 w-3 text-purple-500 mx-auto" />
                <p className="text-sm font-bold">{examStats.attempted}</p>
                <p className="text-[6px] sm:text-[7px] text-gray-400">تم حلها</p>
              </div>
              <div className="p-1 rounded-lg bg-card border text-center">
                <Icons.TrendingUp className="h-3 w-3 text-yellow-500 mx-auto" />
                <p className="text-sm font-bold">{examStats.avgScore}%</p>
                <p className="text-[6px] sm:text-[7px] text-gray-400">المتوسط</p>
              </div>
            </div>

            {/* العبارة التحفيزية + إشعار الامتحانات غير المحلولة */}
            <div className="space-y-1">
              <MotivationalCard
                message={motivationalMessage}
                icon={examStats.percentage >= 80 ? Icons.Trophy : examStats.percentage >= 50 ? Icons.TrendingUp : Icons.AlertCircle}
                styles={styles}
                color={studentLevel}
              />

              {pendingExams.length > 0 && (
                <div className="p-1.5 rounded-lg border border-blue-400/30 bg-blue-400/10 backdrop-blur-sm flex items-start gap-1.5">
                  <Icons.Bell className="h-3 w-3 sm:h-4 w-4 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[8px] sm:text-[9px] font-bold">
                      📌 يوجد {pendingExams.length} امتحان لم تحله بعد
                    </p>
                    <p className="text-[7px] sm:text-[8px] text-gray-400">ادخل وحل الامتحانات عشان تكون متمكن من المادة</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== الرسم البياني ===== */}
        {chartData && (
          <div className="p-2 rounded-xl bg-card border">
            <h3 className="text-[10px] sm:text-xs font-bold mb-1.5">📊 درجات الامتحانات</h3>
            <div className="h-32 sm:h-40">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { position: 'bottom', labels: { color: theme === 'dark' ? '#e2e8f0' : '#334155', font: { size: 8 } } }
                  },
                  scales: {
                    y: { beginAtZero: true, max: 100, ticks: { callback: v => `${v}%`, color: theme === 'dark' ? '#e2e8f0' : '#334155', font: { size: 8 } } },
                    x: { ticks: { color: theme === 'dark' ? '#e2e8f0' : '#334155', font: { size: 7 } } }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ===== قائمة الامتحانات التفصيلية ===== */}
        <div>
          <h2 className="text-[10px] sm:text-xs font-bold mb-1 flex items-center gap-1">
            <Icons.List className="h-3 w-3 text-yellow-400" /> تفاصيل الامتحانات
          </h2>
          <div className="space-y-1">
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
              <p className="text-[9px] sm:text-[10px] text-gray-400 text-center py-2">لا توجد امتحانات في هذا الكورس</p>
            )}
          </div>
        </div>

        {/* ===== أزرار الإجراءات ===== */}
        <div className="flex flex-wrap gap-1 pt-0.5">
          <Link
            href={`/dashboard/student/courses/${id}`}
            className="px-2 py-0.5 rounded-lg bg-yellow-400 text-black font-bold text-[8px] sm:text-[9px] hover:bg-yellow-500 transition flex items-center gap-0.5"
          >
            <Icons.ArrowLeft className="h-2.5 w-2.5" /> العودة للكورس
          </Link>
          {pendingExams.length > 0 && (
            <Link
              href={`/dashboard/student/courses/${id}`}
              className="px-2 py-0.5 rounded-lg bg-blue-500 text-white font-bold text-[8px] sm:text-[9px] hover:scale-105 transition flex items-center gap-0.5"
            >
              <Icons.FileQuestion className="h-2.5 w-2.5" /> حل الامتحانات ({pendingExams.length})
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}