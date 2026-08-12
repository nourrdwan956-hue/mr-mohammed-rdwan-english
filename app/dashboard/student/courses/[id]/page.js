// app/dashboard/student/progress/page.js
// ================================================================
// 🏛️ صفحة التقدم العام – نسخة تعتمد على الامتحانات فقط
// ✅ لكل كورس: التقدم = نسبة الامتحانات المجتازة من إجمالي امتحاناته
// ✅ إحصائيات عامة: مجموع الامتحانات، المجتازة، المتوسط العام
// ✅ بطاقات لكل كورس مع تفاصيل الامتحانات والعبارات التحفيزية
// ✅ إشعار بالكورسات التي فيها امتحانات غير محلولة
// ✅ رسم بياني مقارن بين الكورسات
// ✅ خفيفة وسريعة على الموبايل، فخمة على الديسكتوب
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  if (attemptedExams === 0) {
    return language === 'ar'
      ? '📘 لسه مبدأتش تحل امتحانات! ابدأ دلوقتي وورينا شطارتك'
      : '📘 You haven\'t started exams yet! Start now and show your skills';
  }
  if (percentage === 0) {
    return language === 'ar'
      ? '💪 عادي يا بطل، كلنا بنتعلم من الأخطاء. راجع المادة وحاول تاني'
      : '💪 It\'s okay, we all learn from mistakes. Review and try again';
  }
  if (attemptedExams === totalExams && percentage < 100) {
    return language === 'ar'
      ? '🔥 حللت كل الامتحانات! بس لسه في شوية أخطاء، راجعها وهتكون متمكن 100%'
      : '🔥 You solved all exams! But there are some mistakes, review them and you\'ll master it 100%';
  }
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
// 5. مكونات العرض
// ================================================================

// 5.1 دائرة التقدم
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

// 5.2 شريط تقدم خطي
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

// 5.3 بطاقة تحفيزية
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

// 5.4 بطاقة كورس للتقدم العام
const CourseProgressCard = ({ course, stats, styles, language }) => {
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);
  const levelColor = stats.percentage >= 80 ? 'green' : stats.percentage >= 50 ? 'yellow' : stats.percentage > 0 ? 'blue' : 'red';
  const pendingCount = stats.totalExams - stats.attemptedExams;

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className="p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Link href={`/dashboard/student/courses/${course.id}`} className={`text-sm sm:text-base font-bold ${styles.text} hover:text-yellow-400 transition line-clamp-1`}>
            {course.title}
          </Link>
          <span className={`text-[8px] sm:text-[10px] px-1.5 py-0.5 rounded-full border ${levelColor === 'green' ? 'border-green-400/30 bg-green-400/10 text-green-400' : levelColor === 'yellow' ? 'border-yellow-400/30 bg-yellow-400/10 text-yellow-400' : 'border-blue-400/30 bg-blue-400/10 text-blue-400'}`}>
            {stats.percentage}%
          </span>
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <CircularProgress
            percentage={stats.percentage}
            size={56}
            strokeWidth={5}
            styles={styles}
            color={levelColor}
            label={language === 'ar' ? 'اجتياز' : 'Passed'}
            sublabel={`${stats.passedExams}/${stats.totalExams}`}
          />
          <div className="flex-1 space-y-1.5">
            <LinearProgress value={stats.percentage} max={100} styles={styles} color={levelColor} showPercentage={false} />
            <div className="flex justify-between text-[8px] sm:text-[10px]">
              <span className={styles.subtext}>
                {language === 'ar' ? 'المتوسط' : 'Avg'}: <span className={`font-bold ${styles.text}`}>{stats.avgScore}%</span>
              </span>
              <span className={styles.subtext}>
                {language === 'ar' ? 'محلولة' : 'Attempted'}: <span className={`font-bold ${styles.text}`}>{stats.attemptedExams}</span>
              </span>
            </div>
          </div>
        </div>

        {pendingCount > 0 && (
          <div className={`text-[8px] sm:text-[10px] ${styles.subtext} flex items-center gap-1`}>
            <Icons.Bell className="h-3 w-3 text-blue-400" />
            {language === 'ar'
              ? `📌 ${pendingCount} امتحان لم تحله بعد`
              : `📌 ${pendingCount} exam(s) not taken yet`}
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/10">
          <Link
            href={`/dashboard/student/courses/${course.id}/progress`}
            className="text-[8px] sm:text-[10px] px-2 py-0.5 rounded-lg bg-yellow-400/20 text-yellow-400 hover:bg-yellow-400/30 transition"
          >
            {language === 'ar' ? 'تفاصيل' : 'Details'}
          </Link>
          <Link
            href={`/dashboard/student/courses/${course.id}`}
            className="text-[8px] sm:text-[10px] px-2 py-0.5 rounded-lg bg-blue-400/20 text-blue-400 hover:bg-blue-400/30 transition"
          >
            {language === 'ar' ? 'دخول' : 'Enter'}
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
      if (!user) { router.push('/login'); return; }

      // 1. جلب الكورسات المسجل فيها الطالب
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      if (!enrolls || enrolls.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = enrolls.map(e => e.course_id);

      // 2. جلب بيانات الكورسات
      const { data: courses } = await supabase
        .from('courses')
        .select('id, title, teacher_id')
        .in('id', courseIds)
        .eq('is_published', true);

      if (!courses || courses.length === 0) {
        setLoading(false);
        return;
      }

      // 3. جلب أسماء المدرسين
      const teacherIds = courses.map(c => c.teacher_id).filter(Boolean);
      let teachersMap = {};
      if (teacherIds.length) {
        const { data: teachers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', teacherIds);
        teachers.forEach(t => { teachersMap[t.id] = t; });
      }

      const courseMap = {};
      courses.forEach(c => {
        courseMap[c.id] = {
          ...c,
          teacher: teachersMap[c.teacher_id] || null
        };
      });

      // 4. جلب الامتحانات لكل الكورسات
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, title, course_id, total_marks, passing_marks')
        .in('course_id', courseIds);

      const allExams = examsData || [];
      const examIds = allExams.map(e => e.id);

      // 5. جلب محاولات الطالب
      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('student_id', user.id)
        .in('exam_id', examIds)
        .eq('status', 'completed');

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
            const pct = att.total_marks > 0 ? Math.round((att.score / att.total_marks) * 100) : 0;
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
          labels: chartCourses.map(c => c.course.title?.substring(0, 12) || 'كورس'),
          datasets: [
            {
              label: language === 'ar' ? 'نسبة الاجتياز %' : 'Pass Rate %',
              data: chartCourses.map(c => c.percentage),
              backgroundColor: 'rgba(251, 191, 36, 0.7)',
              borderColor: '#fbbf24',
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              label: language === 'ar' ? 'متوسط الدرجة %' : 'Avg Score %',
              data: chartCourses.map(c => c.avgScore),
              backgroundColor: 'rgba(52, 211, 153, 0.7)',
              borderColor: '#22c55e',
              borderWidth: 2,
              borderRadius: 6,
            },
          ],
        });
      }

      setLoading(false);
    } catch (err) {
      console.error(err);
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

  // ===== حالة عدم وجود كورسات =====
  if (globalStats.totalCourses === 0) {
    return (
      <div className={`w-full min-h-screen ${styles.bg} flex items-center justify-center p-4`}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="p-6 rounded-3xl bg-white/5 dark:bg-black/20 border border-white/10 backdrop-blur-sm">
            <Icons.BookOpen className="h-24 w-24 text-gray-500 mx-auto mb-4" />
            <h2 className={`text-2xl font-bold ${styles.text}`}>
              {language === 'ar' ? 'لم تسجل في أي كورس بعد' : 'Not enrolled in any course yet'}
            </h2>
            <p className={`mt-2 ${styles.subtext}`}>
              {language === 'ar' ? 'ابدأ رحلتك التعليمية بالتسجيل في أول كورس لك!' : 'Start your learning journey by enrolling in your first course!'}
            </p>
            <Link href="/dashboard/student/courses" className="mt-6 px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl inline-block hover:scale-105 transition shadow-lg shadow-yellow-400/30">
              {language === 'ar' ? 'استعرض الكورسات' : 'Browse Courses'}
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
        className="fixed -top-60 -right-60 w-[800px] h-[800px] bg-blue-500/5 dark:bg-blue-400/5 rounded-full blur-3xl pointer-events-none"
      />
      <motion.div
        animate={{ x: ['5%', '-5%', '5%'], y: ['5%', '-5%', '5%'] }}
        transition={{ duration: 35, repeat: Infinity, ease: 'linear' }}
        className="fixed -bottom-60 -left-60 w-[900px] h-[900px] bg-green-500/5 dark:bg-green-400/5 rounded-full blur-3xl pointer-events-none"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6">

        {/* ===== رأس الصفحة ===== */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className={`p-4 sm:p-6 rounded-2xl border ${styles.border} backdrop-blur-sm shadow-xl ${styles.card}`}
        >
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl shadow-yellow-400/30">
                <Icons.TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
              </div>
              <div>
                <h1 className={`text-xl sm:text-2xl md:text-3xl font-black ${styles.text}`}>
                  {language === 'ar' ? '📊 تقدمي العام' : '📊 My Overall Progress'}
                </h1>
                <p className={`text-[10px] sm:text-sm ${styles.subtext}`}>
                  {language === 'ar'
                    ? `مبني على الامتحانات من ${globalStats.totalCourses} كورس`
                    : `Based on exams from ${globalStats.totalCourses} courses`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 sm:gap-4">
              <CircularProgress
                percentage={globalStats.overallPercentage}
                size={64}
                strokeWidth={5}
                styles={styles}
                color={globalStats.overallPercentage >= 80 ? 'green' : globalStats.overallPercentage >= 50 ? 'yellow' : 'blue'}
                label={language === 'ar' ? 'إجمالي' : 'Overall'}
                sublabel={`${globalStats.totalPassedExams}/${globalStats.totalExams}`}
              />
              <CircularProgress
                percentage={globalStats.overallAvgScore}
                size={64}
                strokeWidth={5}
                styles={styles}
                color="purple"
                label={language === 'ar' ? 'المتوسط' : 'Average'}
                sublabel={`${globalStats.overallAvgScore}%`}
              />
            </div>
          </div>

          {/* إحصائيات سريعة */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-3 pt-3 border-t border-white/10">
            <div className="text-center">
              <p className={`text-sm sm:text-lg font-bold ${styles.text}`}>{globalStats.totalCourses}</p>
              <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'كورسات' : 'Courses'}</p>
            </div>
            <div className="text-center">
              <p className={`text-sm sm:text-lg font-bold ${styles.text}`}>{globalStats.totalExams}</p>
              <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'امتحانات' : 'Exams'}</p>
            </div>
            <div className="text-center">
              <p className={`text-sm sm:text-lg font-bold text-emerald-400`}>{globalStats.totalPassedExams}</p>
              <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'مجتازة' : 'Passed'}</p>
            </div>
            <div className="text-center">
              <p className={`text-sm sm:text-lg font-bold text-yellow-400`}>{globalStats.totalAttemptedExams}</p>
              <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'محلولة' : 'Attempted'}</p>
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
        </motion.div>

        {/* ===== الرسم البياني ===== */}
        {chartData && (
          <div>
            <h2 className={`text-sm sm:text-base font-bold ${styles.text} mb-3 flex items-center gap-2`}>
              <Icons.BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-purple-400" />
              {language === 'ar' ? 'مقارنة الكورسات' : 'Course Comparison'}
            </h2>
            <WaveBorderCard initialColor="purple">
              <div className="p-3 sm:p-4 h-48 sm:h-60">
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
                          font: { size: 10 }
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
                          font: { size: 9 }
                        }
                      },
                      x: {
                        ticks: {
                          color: theme === 'dark' ? '#e2e8f0' : '#334155',
                          font: { size: 9 }
                        }
                      }
                    }
                  }}
                />
              </div>
            </WaveBorderCard>
          </div>
        )}

        {/* ===== بطاقات الكورسات ===== */}
        <div>
          <h2 className={`text-sm sm:text-base font-bold ${styles.text} mb-3 flex items-center gap-2`}>
            <Icons.BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-green-400" />
            {language === 'ar' ? 'تفاصيل الكورسات' : 'Course Details'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {coursesData.map((item, idx) => (
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