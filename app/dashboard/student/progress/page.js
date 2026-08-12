// app/dashboard/student/progress/page.js
// ================================================================
// 🏛️ صفحة التقدم العام – تقدم الطالب في جميع الكورسات
// ✅ يعتمد على الامتحانات فقط (لا علاقة بالفيديوهات)
// ✅ إحصائيات عامة سريعة
// ✅ بطاقات لكل كورس مع تقدمه التفصيلي
// ✅ رسم بياني مقارن بين الكورسات
// ✅ عبارات تحفيزية بالعامية المصرية
// ✅ أيقونات صغيرة جداً (h-3 w-3)
// ✅ شاشة تحميل فاخرة
// ✅ معالجة الأخطاء (لا 406 ولا ReferenceError)
// ✅ خفيف وسريع جداً
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
// 2. Wave Border Card
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
// 3. شاشة تحميل فاخرة
// ================================================================
const LoadingScreen = ({ styles }) => {
  const [colorIndex, setColorIndex] = useState(0);
  const colors = ['#FACC15', '#D97706', '#60A5FA', '#34D399', '#A78BFA'];

  useEffect(() => {
    const interval = setInterval(() => {
      setColorIndex(prev => (prev + 1) % colors.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="relative">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          className="w-16 h-16 rounded-full border-4 border-t-transparent"
          style={{
            borderColor: colors[colorIndex],
            borderTopColor: 'transparent',
            boxShadow: `0 0 30px ${colors[colorIndex]}40`,
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
          className="absolute top-2 left-2 w-12 h-12 rounded-full border-4 border-b-transparent"
          style={{
            borderColor: colors[(colorIndex + 2) % colors.length],
            borderBottomColor: 'transparent',
            boxShadow: `0 0 20px ${colors[(colorIndex + 2) % colors.length]}30`,
          }}
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full"
          style={{ backgroundColor: colors[colorIndex], boxShadow: `0 0 20px ${colors[colorIndex]}` }}
        />
      </div>
      <p className="text-xs text-gray-400 animate-pulse">جاري تحميل التقدم...</p>
    </div>
  );
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

// ✅ دائرة التقدم – حجم 44 بكسل
const CircularProgress = ({ percentage, size = 44, strokeWidth = 3, styles, label, sublabel }) => {
  const s = size;
  const sw = Math.max(2, strokeWidth);
  const radius = (s - sw) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

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
        {sublabel && <span className="text-[5px] sm:text-[6px] text-gray-400">{sublabel}</span>}
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

// ✅ بطاقة كورس للتقدم العام
const CourseProgressCard = ({ course, stats, styles, language }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);
  const levelColor = stats.percentage >= 80 ? 'green' : stats.percentage >= 50 ? 'yellow' : stats.percentage > 0 ? 'blue' : 'red';
  const pendingCount = stats.totalExams - stats.attemptedExams;

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className="p-1.5 sm:p-2 space-y-1">
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/student/courses/${course.id}`} className="text-[9px] sm:text-[10px] font-bold hover:text-yellow-400 transition line-clamp-1">
            {course.title}
          </Link>
          <span className={`text-[7px] sm:text-[8px] px-1 py-0.5 rounded-full border ${
            levelColor === 'green' ? 'border-green-400/30 bg-green-400/10 text-green-400' :
            levelColor === 'yellow' ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400' :
            'border-blue-400/30 bg-blue-400/10 text-blue-400'
          }`}>
            {stats.percentage}%
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <CircularProgress percentage={stats.percentage} size={36} strokeWidth={2.5} styles={styles} label={`${stats.passedExams}/${stats.totalExams}`} />
          <div className="flex-1 space-y-0.5">
            <LinearProgress value={stats.percentage} max={100} styles={styles} color={levelColor} showPercentage={false} />
            <div className="flex justify-between text-[7px] sm:text-[8px]">
              <span className="text-gray-400">المتوسط: <span className="font-bold">{stats.avgScore}%</span></span>
              <span className="text-gray-400">محلولة: <span className="font-bold">{stats.attemptedExams}</span></span>
            </div>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className="text-[7px] sm:text-[8px] text-gray-400 flex items-center gap-0.5">
            <Icons.Bell className="h-2.5 w-2.5 text-blue-400" />
            📌 {pendingCount} امتحان لم تحله بعد
          </div>
        )}

        <div className="flex flex-wrap gap-0.5 pt-0.5 border-t border-white/10">
          <Link href={`/dashboard/student/courses/${course.id}/progress`} className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-lg bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30 transition">
            تفاصيل
          </Link>
          <Link href={`/dashboard/student/courses/${course.id}`} className="text-[7px] sm:text-[8px] px-1.5 py-0.5 rounded-lg bg-blue-400/20 text-blue-400 hover:bg-blue-400/30 transition">
            دخول
          </Link>
        </div>
      </div>
    </WaveBorderCard>
  );
};

// ================================================================
// 6. الصفحة الرئيسية
// ================================================================
export default function StudentProgressPage() {
  const router = useRouter();
  const { theme, styles, language } = useTheme();

  const [loading, setLoading] = useState(true);
  const [coursesData, setCoursesData] = useState([]);
  const [globalStats, setGlobalStats] = useState({
    totalCourses: 0,
    totalExams: 0,
    totalPassedExams: 0,
    totalAttemptedExams: 0,
    overallPercentage: 0,
    overallAvgScore: 0,
  });
  const [chartData, setChartData] = useState(null);
  const [motivationalMessage, setMotivationalMessage] = useState('');
  const fetchedRef = useRef(false);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. جلب الكورسات المسجل فيها الطالب
      const { data: enrolls, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      if (enrollError) {
        console.warn('⚠️ Error fetching enrollments:', enrollError);
      }

      if (!enrolls || enrolls.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = enrolls.map(e => e.course_id);

      // 2. جلب بيانات الكورسات
      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('id, title, teacher_id')
        .in('id', courseIds)
        .eq('is_published', true);

      if (coursesError) {
        console.warn('⚠️ Error fetching courses:', coursesError);
      }

      if (!courses || courses.length === 0) {
        setLoading(false);
        return;
      }

      // 3. جلب أسماء المدرسين
      const teacherIds = courses.map(c => c.teacher_id).filter(Boolean);
      let teachersMap = {};
      if (teacherIds.length) {
        const { data: teachers, error: teachersError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', teacherIds);
        if (!teachersError) {
          teachers.forEach(t => { teachersMap[t.id] = t; });
        }
      }

      const courseMap = {};
      courses.forEach(c => {
        courseMap[c.id] = {
          ...c,
          teacher: teachersMap[c.teacher_id] || null
        };
      });

      // 4. جلب الامتحانات لكل الكورسات
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('id, title, course_id, total_marks, passing_marks')
        .in('course_id', courseIds);

      if (examsError) {
        console.warn('⚠️ Error fetching exams:', examsError);
      }

      const allExams = examsData || [];
      const examIds = allExams.map(e => e.id);

      // 5. جلب محاولات الطالب
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('student_id', user.id)
        .in('exam_id', examIds)
        .eq('status', 'completed');

      if (attemptsError) {
        console.warn('⚠️ Error fetching attempts:', attemptsError);
      }

      // ✅ بناء attemptMap بشكل صحيح
      const attemptMap = {};
      attemptsData?.forEach(a => {
        const existing = attemptMap[a.exam_id];
        if (!existing || a.score > existing.score) {
          attemptMap[a.exam_id] = a;
        }
      });

      // 6. حساب الإحصائيات لكل كورس
      let totalExams = 0;
      let totalPassed = 0;
      let totalAttempted = 0;
      let totalScoreSum = 0;
      let totalScoreCount = 0;

      const processed = courseIds.map(cid => {
        const course = courseMap[cid];
        if (!course) return null;

        const courseExams = allExams.filter(e => e.course_id === cid);
        const total = courseExams.length;
        let attempted = 0;
        let passed = 0;
        let scoreSum = 0;
        const scores = [];

        courseExams.forEach(exam => {
          const att = attemptMap[exam.id];
          if (att) {
            attempted++;
            const totalMarks = att.total_marks || exam.total_marks || 1;
            const score = att.score || 0;
            const pct = totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;
            scoreSum += pct;
            scores.push(pct);
            if (att.passed === true || pct >= (exam.passing_marks || 0)) passed++;
          }
        });

        const avgScore = attempted > 0 ? Math.round(scoreSum / attempted) : 0;
        const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

        totalExams += total;
        totalPassed += passed;
        totalAttempted += attempted;
        totalScoreSum += scoreSum;
        totalScoreCount += attempted;

        return {
          course,
          totalExams: total,
          attemptedExams: attempted,
          passedExams: passed,
          avgScore,
          percentage,
          scores,
        };
      }).filter(Boolean);

      setCoursesData(processed);

      const overallAvg = totalScoreCount > 0 ? Math.round(totalScoreSum / totalScoreCount) : 0;
      const overallPct = totalExams > 0 ? Math.round((totalPassed / totalExams) * 100) : 0;

      setGlobalStats({
        totalCourses: processed.length,
        totalExams,
        totalPassedExams: totalPassed,
        totalAttemptedExams: totalAttempted,
        overallPercentage: overallPct,
        overallAvgScore: overallAvg,
      });

      // 7. العبارة التحفيزية العامة
      const msg = getMotivationalMessage(overallPct, totalAttempted, totalExams, language);
      setMotivationalMessage(msg);

      // 8. الرسم البياني (أول 6 كورسات)
      const chartCourses = processed.slice(0, 6);
      if (chartCourses.length > 0) {
        setChartData({
          labels: chartCourses.map(c => c.course.title?.substring(0, 10) || 'كورس'),
          datasets: [
            {
              label: language === 'ar' ? 'نسبة الاجتياز %' : 'Pass Rate %',
              data: chartCourses.map(c => c.percentage),
              backgroundColor: 'rgba(251, 191, 36, 0.6)',
              borderColor: '#fbbf24',
              borderWidth: 1,
              borderRadius: 4,
            },
            {
              label: language === 'ar' ? 'متوسط الدرجة %' : 'Avg Score %',
              data: chartCourses.map(c => c.avgScore),
              backgroundColor: 'rgba(52, 211, 153, 0.6)',
              borderColor: '#22c55e',
              borderWidth: 1,
              borderRadius: 4,
            },
          ],
        });
      }

      setLoading(false);
    } catch (err) {
      console.error('❌ Error fetching progress data:', err);
      toast.error(language === 'ar' ? 'فشل تحميل التقدم' : 'Failed to load progress');
      setLoading(false);
    }
  }, [router, language]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleFocus = () => { fetchData(); };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [fetchData]);

  // ===== حالة التحميل =====
  if (loading) {
    return (
      <div className={`w-full min-h-screen ${styles.bg}`}>
        <LoadingScreen styles={styles} />
      </div>
    );
  }

  // ===== حالة عدم وجود كورسات =====
  if (globalStats.totalCourses === 0) {
    return (
      <div className={`w-full min-h-screen ${styles.bg} flex items-center justify-center p-3`}>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-xs"
        >
          <div className="p-4 rounded-2xl bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-sm">
            <Icons.BookOpen className="h-12 w-12 text-gray-500 mx-auto mb-2" />
            <h2 className="text-base font-bold">لم تسجل في أي كورس بعد</h2>
            <p className="text-[9px] sm:text-[10px] text-gray-400 mt-1">ابدأ رحلتك التعليمية بالتسجيل في أول كورس لك!</p>
            <Link href="/dashboard/student/courses" className="mt-3 inline-block px-3 py-1 bg-yellow-400 text-black font-bold rounded-lg text-xs hover:scale-105 transition">
              استعرض الكورسات
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <div className={`w-full min-h-screen ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية متحركة شفافة */}
      <motion.div
        animate={{ x: ['-5%', '5%', '-5%'], y: ['-5%', '5%', '-5%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="fixed -top-40 -right-40 w-[500px] h-[500px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-40 -left-40 w-[600px] h-[600px] bg-green-500/5 dark:bg-green-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-6xl mx-auto px-2 sm:px-4 py-1.5 space-y-2">

        {/* ===== رأس الصفحة ===== */}
        <WaveBorderCard initialColor="purple">
          <div className="p-2 sm:p-3 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="p-1 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600">
                  <Icons.TrendingUp className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h1 className="text-base sm:text-xl font-black">📊 تقدمي العام</h1>
                  <p className="text-[8px] sm:text-[9px] text-gray-400">
                    {language === 'ar'
                      ? `مبني على الامتحانات من ${globalStats.totalCourses} كورس`
                      : `Based on exams from ${globalStats.totalCourses} courses`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <CircularProgress percentage={globalStats.overallPercentage} size={40} strokeWidth={2.5} styles={styles} label="إجمالي" sublabel={`${globalStats.totalPassedExams}/${globalStats.totalExams}`} />
                <CircularProgress percentage={globalStats.overallAvgScore} size={40} strokeWidth={2.5} styles={styles} label="المتوسط" sublabel={`${globalStats.overallAvgScore}%`} />
              </div>
            </div>

            {/* إحصائيات سريعة */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1">
              <div className="p-1 rounded-lg bg-card border text-center">
                <Icons.BookOpen className="h-3 w-3 text-blue-500 mx-auto" />
                <p className="text-sm font-bold">{globalStats.totalCourses}</p>
                <p className="text-[6px] sm:text-[7px] text-gray-400">كورسات</p>
              </div>
              <div className="p-1 rounded-lg bg-card border text-center">
                <Icons.FileQuestion className="h-3 w-3 text-purple-500 mx-auto" />
                <p className="text-sm font-bold">{globalStats.totalExams}</p>
                <p className="text-[6px] sm:text-[7px] text-gray-400">امتحانات</p>
              </div>
              <div className="p-1 rounded-lg bg-card border text-center">
                <Icons.CheckCircle className="h-3 w-3 text-emerald-500 mx-auto" />
                <p className="text-sm font-bold">{globalStats.totalPassedExams}</p>
                <p className="text-[6px] sm:text-[7px] text-gray-400">مجتازة</p>
              </div>
              <div className="p-1 rounded-lg bg-card border text-center">
                <Icons.Clock className="h-3 w-3 text-yellow-500 mx-auto" />
                <p className="text-sm font-bold">{globalStats.totalAttemptedExams}</p>
                <p className="text-[6px] sm:text-[7px] text-gray-400">محلولة</p>
              </div>
            </div>

            {/* العبارة التحفيزية العامة */}
            {motivationalMessage && (
              <MotivationalCard
                message={motivationalMessage}
                icon={globalStats.overallPercentage >= 80 ? Icons.Trophy : globalStats.overallPercentage >= 50 ? Icons.TrendingUp : Icons.AlertCircle}
                styles={styles}
                color={globalStats.overallPercentage >= 80 ? 'green' : globalStats.overallPercentage >= 50 ? 'yellow' : 'blue'}
              />
            )}
          </div>
        </WaveBorderCard>

        {/* ===== الرسم البياني ===== */}
        {chartData && (
          <div className="p-2 rounded-xl bg-card border">
            <h2 className="text-[10px] sm:text-xs font-bold mb-1.5 flex items-center gap-1">
              <Icons.BarChart3 className="h-3 w-3 text-purple-400" /> مقارنة الكورسات
            </h2>
            <div className="h-32 sm:h-40">
              <Bar
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        color: theme === 'dark' ? '#e2e8f0' : '#334155',
                        font: { size: 8 }
                      }
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 100,
                      ticks: {
                        callback: v => `${v}%`,
                        color: theme === 'dark' ? '#e2e8f0' : '#334155',
                        font: { size: 8 }
                      }
                    },
                    x: {
                      ticks: {
                        color: theme === 'dark' ? '#e2e8f0' : '#334155',
                        font: { size: 7 }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        )}

        {/* ===== بطاقات الكورسات ===== */}
        <div>
          <h2 className="text-[10px] sm:text-xs font-bold mb-1 flex items-center gap-1">
            <Icons.BookOpen className="h-3 w-3 text-green-400" /> تفاصيل الكورسات
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {coursesData.map((item) => (
              <CourseProgressCard
                key={item.course.id}
                course={item.course}
                stats={{
                  totalExams: item.totalExams,
                  attemptedExams: item.attemptedExams,
                  passedExams: item.passedExams,
                  avgScore: item.avgScore,
                  percentage: item.percentage,
                }}
                styles={styles}
                language={language}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}