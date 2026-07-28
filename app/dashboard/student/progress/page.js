'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { useRouter } from 'next/navigation';
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
// دوال مساعدة (نفس الموجودة في صفحة الكورس الفردي)
// ================================================================
function parseDurationToSeconds(durationStr) {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
}

function formatSeconds(seconds) {
  if (!seconds || isNaN(seconds)) return '0 دقيقة';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} ساعة ${m} د`;
  return `${m} دقيقة`;
}

// ================================================================
// توليد النصائح الذكية (النسخة المتطورة)
// ================================================================
function generateSmartTips(stats, language) {
  const tips = [];
  const {
    overallWatchPercent,
    avgScore,
    totalVideos,
    watchedVideos,
    totalExams,
    attemptedExams,
    passedExams,
    watchTimeSeconds,
    totalDurationSeconds,
  } = stats;

  if (overallWatchPercent < 10 && attemptedExams === 0) {
    tips.push({
      icon: Icons.Rocket,
      title: language === 'ar' ? '🚀 ابدأ رحلتك!' : '🚀 Start your journey!',
      description: language === 'ar'
        ? 'لسه مبدأتش في الكورس! خصص وقت يومي للمشاهدة، وابدأ بالفيديوهات الأولى.'
        : 'You haven\'t started yet! Dedicate daily time to watch the first videos.',
      color: 'blue',
      action: 'start'
    });
  }

  if (overallWatchPercent < 30 && overallWatchPercent > 0) {
    tips.push({
      icon: Icons.Eye,
      title: language === 'ar' ? '📺 استمر في المشاهدة' : '📺 Keep watching',
      description: language === 'ar'
        ? 'لسه في بداية الطريق. حاول تشاهد ٣٠ دقيقة يومياً عشان تلمّ بالمادة.'
        : 'You\'re at the beginning. Try to watch 30 minutes daily to cover the material.',
      color: 'yellow',
      action: 'focus'
    });
  }

  if (attemptedExams > 0 && avgScore < 50) {
    tips.push({
      icon: Icons.AlertTriangle,
      title: language === 'ar' ? '⚠️ درجاتك ضعيفة جداً!' : '⚠️ Your scores are very low!',
      description: language === 'ar'
        ? 'درجاتك في الامتحانات أقل من ٥٠٪! أنت محتاج تراجع المادة تاني، وتتواصل مع معلمك عشان يعرف المشكلة فين. متستعجلش في الامتحانات الجاية.'
        : 'Your exam scores are below 50%! You need to review the material again and contact your teacher to identify the problem. Don\'t rush the next exams.',
      color: 'red',
      action: 'contact'
    });
  }

  if (overallWatchPercent > 60 && avgScore < 60 && attemptedExams > 0) {
    tips.push({
      icon: Icons.Brain,
      title: language === 'ar' ? '🧠 فهم مش مشاهدة' : '🧠 Understanding, not just watching',
      description: language === 'ar'
        ? 'شاهدت جزء كبير من الكورس، لكن درجاتك مش عالية. ركز في فهم المحتوى، ووقف عند النقاط الصعبة، واسأل معلمك.'
        : 'You watched a lot, but your scores aren\'t high. Focus on understanding, pause at difficult points, and ask your teacher.',
      color: 'orange',
      action: 'understand'
    });
  }

  if (avgScore >= 50 && avgScore < 70 && attemptedExams > 0) {
    tips.push({
      icon: Icons.TrendingUp,
      title: language === 'ar' ? '📈 تحسّن مستواك' : '📈 Improve your level',
      description: language === 'ar'
        ? 'أداؤك في الامتحانات متوسط. راجع الأسئلة اللي غلطت فيها، وركز على الأجزاء اللي حسيتها صعبة.'
        : 'Your performance is average. Review the questions you got wrong and focus on difficult parts.',
      color: 'yellow',
      action: 'improve'
    });
  }

  if (avgScore >= 80 && attemptedExams > 0) {
    tips.push({
      icon: Icons.Crown,
      title: language === 'ar' ? '👑 أداء ممتاز!' : '👑 Excellent performance!',
      description: language === 'ar'
        ? 'ماشاء الله! مستواك ممتاز في الامتحانات. أنت جاهز للمستوى التالي، استمر في التحدي.'
        : 'Mashallah! Your exam performance is excellent. You\'re ready for the next level, keep challenging yourself.',
      color: 'green',
      action: 'advance'
    });
  }

  if (attemptedExams === totalExams && totalExams > 0 && passedExams < totalExams / 2) {
    tips.push({
      icon: Icons.FileQuestion,
      title: language === 'ar' ? '📝 راجع استراتيجية الحل' : '📝 Review your strategy',
      description: language === 'ar'
        ? 'حللت كل الامتحانات لكن النجاح قليل. حاول تفهم طبيعة الأسئلة، وراجع الإجابات الصحيحة.'
        : 'You took all exams but passed few. Try to understand the question patterns and review correct answers.',
      color: 'purple',
      action: 'exam'
    });
  }

  if (tips.length === 0) {
    tips.push({
      icon: Icons.Smile,
      title: language === 'ar' ? '😊 أنت في الطريق الصحيح' : '😊 You\'re on the right track',
      description: language === 'ar'
        ? 'استمر بنفس الوتيرة، وستحقق نتائج رائعة قريباً!'
        : 'Keep up the pace, you\'ll achieve great results soon!',
      color: 'blue',
      action: 'continue'
    });
  }

  return tips;
}

// ================================================================
// ألوان البطاقات (نظام Wave Border)
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20' },
  { name: 'red', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 dark:bg-red-400/10', border: 'border-red-400/30 dark:border-red-400/20' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20' },
  { name: 'pink', text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10 dark:bg-pink-400/10', border: 'border-pink-400/30 dark:border-pink-400/20' },
  { name: 'indigo', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 dark:bg-indigo-400/10', border: 'border-indigo-400/30 dark:border-indigo-400/20' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  if (available.length === 0) return CARD_COLORS[0];
  return available[Math.floor(Math.random() * available.length)];
};

// ================================================================
// Wave Border Card (نفس المكون)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange, intensity = 1 }) => {
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
        const newRot = prev + 2 * intensity;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, 50 / intensity);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [onColorChange, intensity]);

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
      <div className="relative z-10 h-full w-full rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)] transition-all duration-300 group-hover:shadow-2xl">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// Animated Counter
// ================================================================
const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
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
            if (start >= target) { setCount(target); clearInterval(timer); } else setCount(Math.floor(start));
          }, 16);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref} className="font-extrabold">{count}{suffix}</span>;
};

// ================================================================
// Premium Stat Card
// ================================================================
const PremiumStatCard = ({ icon: Icon, label, value, suffix, colorName, styles, delay = 0 }) => {
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === colorName) || CARD_COLORS[0]);
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
        <div className="p-6 flex items-center justify-between gap-4">
          <div>
            <p className={`text-xs font-medium ${styles.subtext} mb-0.5`}>{label}</p>
            <p className={`text-2xl font-black ${styles.text}`}>
              <AnimatedCounter target={value} suffix={suffix || ''} />
            </p>
          </div>
          <motion.div
            animate={isHovered ? { scale: 1.3, rotate: 12 } : { scale: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={`p-3 rounded-2xl ${color.bg} shadow-xl`}
          >
            <Icon className={`h-8 w-8 ${color.text}`} />
          </motion.div>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// بطاقة النصائح الذكية
// ================================================================
const SmartTipCard = ({ tip, styles, language }) => {
  const Icon = tip.icon;
  const bgColorMap = {
    blue: 'bg-blue-500/20 border-blue-400/30 text-blue-600 dark:text-blue-400',
    green: 'bg-green-500/20 border-green-400/30 text-green-600 dark:text-green-400',
    yellow: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-600 dark:text-yellow-400',
    red: 'bg-red-500/20 border-red-400/30 text-red-600 dark:text-red-400',
    purple: 'bg-purple-500/20 border-purple-400/30 text-purple-600 dark:text-purple-400',
    orange: 'bg-orange-500/20 border-orange-400/30 text-orange-600 dark:text-orange-400',
  };
  const bg = bgColorMap[tip.color] || bgColorMap.blue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <WaveBorderCard initialColor={tip.color}>
        <div className={`p-5 rounded-xl border ${bg} backdrop-blur-sm`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${bg}`}>
              <Icon className="h-8 w-8" />
            </div>
            <div className="flex-1">
              <h4 className={`text-lg font-bold ${styles.text}`}>{tip.title}</h4>
              <p className={`text-base ${styles.subtext} mt-1 leading-relaxed`}>{tip.description}</p>
              {(tip.action === 'contact' || tip.action === 'exam' || tip.action === 'advance' || tip.action === 'improve') && (
                <div className="mt-3">
                  <Link
                    href={tip.action === 'contact' ? '/dashboard/student/support/academic' : '/dashboard/student/courses'}
                    className={`text-sm font-bold ${tip.color === 'red' ? 'text-red-500' : 'text-yellow-500'} hover:underline`}
                  >
                    {tip.action === 'contact' ? (language === 'ar' ? '📞 تواصل مع معلمك →' : 'Contact your teacher →') :
                     tip.action === 'exam' ? (language === 'ar' ? '📝 اذهب للامتحانات →' : 'Go to exams →') :
                     (language === 'ar' ? '📖 استكشف المحتوى →' : 'Explore content →')}
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// الصفحة الرئيسية – تقدم ذكي وفاخر (عام)
// ================================================================
export default function StudentProgressPage() {
  const router = useRouter();
  const { theme, styles, language } = useTheme();
  const [loading, setLoading] = useState(true);
  const [globalStats, setGlobalStats] = useState({
    totalCourses: 0,
    totalWatchTimeSec: 0,
    totalDurationSec: 0,
    overallWatchPercent: 0,
    avgScore: 0,
    totalExamsTaken: 0,
    totalExams: 0,
    videosAbove70: 0,
    totalVideos: 0,
    passedExams: 0,
    watchedVideos: 0,
  });
  const [coursesProgress, setCoursesProgress] = useState([]);
  const [chartData, setChartData] = useState(null);
  const [smartTips, setSmartTips] = useState([]);
  const [watchHistoryByDay, setWatchHistoryByDay] = useState([]);
  const fetchedRef = useRef(false);

  // ===== جلب البيانات الذكي (محسن بدون JOIN) =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // 1. جلب التسجيلات
      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', user.id);

      if (!enrolls || enrolls.length === 0) {
        setLoading(false);
        return;
      }

      const courseIds = enrolls.map(e => e.course_id);

      // 2. جلب الكورسات (مع التأكد من النشر)
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, teacher_id')
        .in('id', courseIds)
        .eq('is_published', true);

      if (!coursesData || coursesData.length === 0) {
        setLoading(false);
        return;
      }

      // 3. جلب أسماء المدرسين بشكل منفصل
      const teacherIds = coursesData.map(c => c.teacher_id).filter(Boolean);
      let teachersMap = {};
      if (teacherIds.length) {
        const { data: teachers } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', teacherIds);
        teachers.forEach(t => { teachersMap[t.id] = t; });
      }

      const courseMap = {};
      coursesData.forEach(c => {
        courseMap[c.id] = {
          ...c,
          teacher: teachersMap[c.teacher_id] || null
        };
      });

      // 4. جلب الفيديوهات والامتحانات لكل الكورسات
      const [videosRes, examsRes] = await Promise.all([
        supabase.from('videos').select('id, title, course_id, duration').in('course_id', courseIds),
        supabase.from('exams').select('id, title, course_id, total_marks, passing_marks').in('course_id', courseIds),
      ]);
      const allVideos = videosRes.data || [];
      const allExams = examsRes.data || [];
      const allVideoIds = allVideos.map(v => v.id);
      const allExamIds = allExams.map(e => e.id);

      // 5. جلب سجل المشاهدة والامتحانات
      const [watchRes, attemptsRes] = await Promise.all([
        allVideoIds.length > 0
          ? supabase.from('watch_history')
              .select('video_id, watched_seconds, progress, completed, watched_at')
              .eq('student_id', user.id)
              .in('video_id', allVideoIds)
          : Promise.resolve({ data: [] }),
        allExamIds.length > 0
          ? supabase.from('exam_attempts')
              .select('*')
              .eq('student_id', user.id)
              .in('exam_id', allExamIds)
          : Promise.resolve({ data: [] }),
      ]);

      const watchList = watchRes.data || [];
      const attemptList = attemptsRes.data || [];

      // 6. تجميع بيانات المشاهدة الفريدة (أحدث قيمة لكل فيديو)
      const watchMap = {};
      watchList.forEach(w => {
        if (!watchMap[w.video_id] || (w.watched_seconds || 0) > (watchMap[w.video_id]?.watched_seconds || 0)) {
          watchMap[w.video_id] = w;
        }
      });

      const attemptMap = {};
      attemptList.forEach(a => { attemptMap[a.exam_id] = a; });

      // 7. حساب الإحصائيات لكل كورس
      let globalTotalDuration = 0;
      let globalWatchedDuration = 0;
      let globalTotalExams = allExams.length;
      let globalExamsTaken = 0;
      let globalScoreSum = 0;
      let globalScoreCount = 0;
      let globalVideosAbove70 = 0;
      let globalTotalVideos = allVideos.length;
      let globalWatchedVideos = 0;
      let globalPassedExams = 0;

      const coursesDataProcessed = courseIds.map(cid => {
        const course = courseMap[cid];
        if (!course) return null;

        const courseVideos = allVideos.filter(v => v.course_id === cid);
        const courseExams = allExams.filter(e => e.course_id === cid);

        let totalDur = 0, watchedDur = 0;
        let lastWatchedTitle = null;
        let videosAbove70 = 0;
        let completedVids = 0;
        let watchedVids = 0;

        courseVideos.forEach(v => {
          const durSec = parseDurationToSeconds(v.duration);
          if (durSec <= 0) return;
          totalDur += durSec;
          const wh = watchMap[v.id];
          if (wh) {
            const watchedSec = wh.watched_seconds || 0;
            watchedDur += Math.min(watchedSec, durSec);
            const progress = durSec > 0 ? (Math.min(watchedSec, durSec) / durSec) * 100 : 0;
            if (progress >= 70) videosAbove70++;
            if (progress >= 90) completedVids++;
            if (progress > 0) watchedVids++;
            if (!lastWatchedTitle) lastWatchedTitle = v.title;
          }
        });

        globalTotalDuration += totalDur;
        globalWatchedDuration += watchedDur;
        globalWatchedVideos += watchedVids;

        let examsTaken = 0, examScoreSum = 0, bestScore = 0, worstScore = Infinity, passed = 0;
        let lastExamTitle = null;
        courseExams.forEach(e => {
          const att = attemptMap[e.id];
          if (att) {
            examsTaken++;
            const pct = att.total_marks > 0 ? (att.score / att.total_marks) * 100 : 0;
            examScoreSum += pct;
            if (pct > bestScore) bestScore = pct;
            if (pct < worstScore) worstScore = pct;
            if (pct >= (e.passing_marks || 50)) passed++;
            if (!lastExamTitle) lastExamTitle = e.title;
          }
        });

        if (worstScore === Infinity) worstScore = 0;
        globalExamsTaken += examsTaken;
        globalScoreSum += examScoreSum;
        globalScoreCount += examsTaken;
        globalVideosAbove70 += videosAbove70;
        globalPassedExams += passed;

        const videoPercent = totalDur > 0 ? (watchedDur / totalDur) * 100 : 0;
        const avgExam = examsTaken > 0 ? Math.round(examScoreSum / examsTaken) : 0;

        // مؤشر الالتزام لكل كورس
        const engVideo = courseVideos.length > 0 ? (videosAbove70 / courseVideos.length) * 0.5 : 0;
        const engScore = examsTaken > 0 ? (avgExam / 100) * 0.3 : 0;
        const engAttempt = courseExams.length > 0 ? (examsTaken / courseExams.length) * 0.2 : 0;
        const engagement = Math.round((engVideo + engScore + engAttempt) * 100);

        // التقدم الكلي لكل كورس
        const videoWeight = courseVideos.length > 0 ? (videosAbove70 / courseVideos.length) * 0.6 : 0;
        const examWeight = courseExams.length > 0 ? (passed / courseExams.length) * 0.4 : 0;
        const overall = Math.round((videoWeight + examWeight) * 100);

        return {
          course,
          totalDurationSec: totalDur,
          watchedDurationSec: watchedDur,
          videoProgressPercent: videoPercent,
          videosAbove70,
          totalVideos: courseVideos.length,
          completedVideos: completedVids,
          watchedVideos: watchedVids,
          totalExams: courseExams.length,
          attemptedExams: examsTaken,
          avgExamScore: avgExam,
          bestExamScore: Math.round(bestScore),
          worstExamScore: Math.round(worstScore),
          passedExams: passed,
          lastWatchedVideo: lastWatchedTitle,
          lastExamTitle,
          engagementIndex: engagement,
          overallProgress: Math.min(overall, 100),
        };
      }).filter(Boolean);

      setCoursesProgress(coursesDataProcessed);

      const overallVideoPercent = globalTotalDuration > 0 ? (globalWatchedDuration / globalTotalDuration) * 100 : 0;
      const globalAvgScore = globalScoreCount > 0 ? Math.round(globalScoreSum / globalScoreCount) : 0;

      setGlobalStats({
        totalCourses: coursesDataProcessed.length,
        totalWatchTimeSec: globalWatchedDuration,
        totalDurationSec: globalTotalDuration,
        overallWatchPercent: overallVideoPercent,
        avgScore: globalAvgScore,
        totalExamsTaken: globalExamsTaken,
        totalExams: globalTotalExams,
        videosAbove70: globalVideosAbove70,
        totalVideos: globalTotalVideos,
        passedExams: globalPassedExams,
        watchedVideos: globalWatchedVideos,
      });

      // 8. توليد النصائح الذكية (على المستوى العام)
      const tips = generateSmartTips({
        overallWatchPercent: overallVideoPercent,
        avgScore: globalAvgScore,
        totalVideos: globalTotalVideos,
        watchedVideos: globalWatchedVideos,
        totalExams: globalTotalExams,
        attemptedExams: globalExamsTaken,
        passedExams: globalPassedExams,
        watchTimeSeconds: globalWatchedDuration,
        totalDurationSeconds: globalTotalDuration,
      }, language);
      setSmartTips(tips);

      // 9. بيانات الرسم البياني (أول 6 كورسات)
      const chartCourses = coursesDataProcessed.slice(0, 6);
      if (chartCourses.length > 0) {
        setChartData({
          labels: chartCourses.map(c => c.course?.title?.substring(0, 15) || 'كورس'),
          datasets: [
            {
              label: language === 'ar' ? 'نسبة المشاهدة' : 'Watch %',
              data: chartCourses.map(c => Math.round(c.videoProgressPercent)),
              backgroundColor: 'rgba(251, 191, 36, 0.7)',
              borderColor: '#fbbf24',
              borderWidth: 2,
              borderRadius: 6,
            },
            {
              label: language === 'ar' ? 'متوسط الدرجة' : 'Avg Score',
              data: chartCourses.map(c => c.avgExamScore),
              backgroundColor: 'rgba(52, 211, 153, 0.7)',
              borderColor: '#22c55e',
              borderWidth: 2,
              borderRadius: 6,
            },
          ],
        });
      }

      // 10. توزيع المشاهدة على الأيام (آخر 7 أيام)
      const now = new Date();
      const dayMap = {};
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        dayMap[key] = 0;
      }

      watchList.forEach(w => {
        if (w.watched_at) {
          const dateKey = new Date(w.watched_at).toISOString().split('T')[0];
          if (dayMap.hasOwnProperty(dateKey)) {
            dayMap[dateKey] += (w.watched_seconds || 0);
          }
        }
      });

      const sortedDays = Object.keys(dayMap).sort();
      setWatchHistoryByDay(sortedDays.map(d => ({
        date: d,
        seconds: Math.round(dayMap[d]),
      })));

    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل تحميل التقدم' : 'Failed to load progress');
    } finally {
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

  // ===== عرض التحميل =====
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

  // ===== عرض حالة عدم وجود كورسات =====
  if (globalStats.totalCourses === 0) return (
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

  // ===== الصفحة الرئيسية =====
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* رأس الصفحة */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, type: 'spring', stiffness: 200 }}
          className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-8 rounded-3xl border ${styles.border} backdrop-blur-sm shadow-xl ${styles.card}`}
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-xl shadow-blue-500/30">
              <Icons.TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className={`text-3xl md:text-4xl font-black ${styles.text}`}>
                {language === 'ar' ? 'تقدّمي الذكي' : 'Smart Progress'}
              </h1>
              <p className={`mt-1 ${styles.subtext}`}>
                {language === 'ar' ? 'تحليل ذكي للمشاهدة والامتحانات' : 'Smart analysis of watch time & exams'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 rounded-xl border ${styles.border} ${styles.card} flex items-center gap-2 text-sm`}>
              <Icons.Award className="h-5 w-5 text-yellow-400" />
              <span className={`font-bold ${styles.text}`}>{globalStats.videosAbove70}/{globalStats.totalVideos}</span>
              <span className={styles.subtext}>{language === 'ar' ? 'متقن' : 'Mastered'}</span>
            </div>
            <div className={`px-4 py-2 rounded-xl border ${styles.border} ${styles.card} flex items-center gap-2 text-sm`}>
              <Icons.CheckCircle className="h-5 w-5 text-green-400" />
              <span className={`font-bold ${styles.text}`}>{globalStats.passedExams}/{globalStats.totalExams}</span>
              <span className={styles.subtext}>{language === 'ar' ? 'ناجح' : 'Passed'}</span>
            </div>
          </div>
        </motion.div>

        {/* إحصائيات عامة */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <PremiumStatCard icon={Icons.BookOpen} label={language === 'ar' ? 'كورسات' : 'Courses'} value={globalStats.totalCourses} colorName="yellow" styles={styles} delay={0} />
          <PremiumStatCard icon={Icons.Clock} label={language === 'ar' ? 'وقت المشاهدة' : 'Watch Time'} value={Math.round(globalStats.totalWatchTimeSec / 60)} suffix=" د" colorName="blue" styles={styles} delay={0.1} />
          <PremiumStatCard icon={Icons.Video} label={language === 'ar' ? 'مشاهدة كلية' : 'Overall Watch'} value={Math.round(globalStats.overallWatchPercent)} suffix="%" colorName="purple" styles={styles} delay={0.2} />
          <PremiumStatCard icon={Icons.FileQuestion} label={language === 'ar' ? 'متوسط الدرجات' : 'Avg Score'} value={globalStats.avgScore} suffix="%" colorName="green" styles={styles} delay={0.3} />
          <PremiumStatCard icon={Icons.Star} label={language === 'ar' ? 'فيديوهات متقنة' : 'Mastered Videos'} value={globalStats.videosAbove70} suffix={`/${globalStats.totalVideos}`} colorName="orange" styles={styles} delay={0.4} />
          <PremiumStatCard icon={Icons.Award} label={language === 'ar' ? 'امتحانات مجتازة' : 'Passed Exams'} value={globalStats.passedExams} suffix={`/${globalStats.totalExams}`} colorName="red" styles={styles} delay={0.5} />
        </div>

        {/* النصائح الذكية */}
        <div className="space-y-4">
          <h2 className={`text-2xl font-black ${styles.text} flex items-center gap-3`}>
            <Icons.Lightbulb className="h-7 w-7 text-yellow-400" />
            {language === 'ar' ? 'نصائح مخصصة لك' : 'Personalized Tips'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {smartTips.map((tip, idx) => (
              <SmartTipCard key={idx} tip={tip} styles={styles} language={language} />
            ))}
          </div>
        </div>

        {/* رسم بياني مقارن */}
        {chartData && (
          <div>
            <h2 className={`text-2xl font-black ${styles.text} mb-5 flex items-center gap-3`}>
              <Icons.BarChart3 className="h-7 w-7 text-purple-400" />
              {language === 'ar' ? 'مقارنة الكورسات' : 'Course Comparison'}
            </h2>
            <WaveBorderCard initialColor="purple">
              <div className="p-6 h-80">
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
                          font: { size: 12 }
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
                          font: { size: 11 }
                        }
                      },
                      x: {
                        ticks: {
                          color: theme === 'dark' ? '#e2e8f0' : '#334155',
                          font: { size: 11 }
                        }
                      }
                    }
                  }}
                />
              </div>
            </WaveBorderCard>
          </div>
        )}

        {/* بطاقات الكورسات المتقدمة */}
        <div className="space-y-5">
          <h2 className={`text-2xl font-black ${styles.text} flex items-center gap-3`}>
            <Icons.BookOpen className="h-7 w-7 text-green-400" />
            {language === 'ar' ? 'تفاصيل التقدم لكل كورس' : 'Course Progress Details'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {coursesProgress.map((cp, index) => {
              // لون البطاقة حسب التقدم الكلي
              const colorName = cp.overallProgress >= 70 ? 'green' : cp.overallProgress >= 40 ? 'yellow' : 'red';
              return (
                <motion.div
                  key={cp.course?.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.4 }}
                >
                  <WaveBorderCard initialColor={colorName}>
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className={`text-lg font-bold ${styles.text} flex items-center gap-2`}>
                          <Icons.BookOpen className={`h-6 w-6 text-${colorName}-400`} />
                          {cp.course?.title}
                        </h3>
                        <Link href={`/dashboard/student/courses/${cp.course?.id}/progress`} className={`text-xs text-${colorName}-400 hover:underline font-medium`}>
                          {language === 'ar' ? 'تفاصيل' : 'Details'} →
                        </Link>
                      </div>

                      {/* مؤشر التقدم الكلي + الالتزام */}
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'التقدم' : 'Progress'}</span>
                          <span className={`text-lg font-extrabold text-${colorName}-400`}>{cp.overallProgress}%</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'الالتزام' : 'Engagement'}</span>
                          <span className={`text-lg font-extrabold text-${colorName}-400`}>{cp.engagementIndex}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full mb-4 overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${cp.overallProgress}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className={`h-full rounded-full bg-gradient-to-r from-${colorName}-400 to-${colorName}-600`}
                        />
                      </div>

                      <div className={`mb-4 p-4 rounded-xl bg-${colorName}-500/10 border border-${colorName}-400/20 backdrop-blur-sm`}>
                        <p className={`text-xs font-semibold ${styles.subtext} mb-2 flex items-center gap-1.5`}>
                          <Icons.Video className={`h-4 w-4 text-${colorName}-400`} />
                          {language === 'ar' ? 'الفيديوهات' : 'Videos'}
                        </p>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={styles.subtext}>{language === 'ar' ? 'مشاهدة' : 'Watched'}</span>
                          <span className={`font-bold text-${colorName}-400`}>{Math.round(cp.videoProgressPercent)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full mb-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cp.videoProgressPercent}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full bg-gradient-to-r from-${colorName}-400 to-${colorName}-600`}
                          />
                        </div>
                        <div className={`flex justify-between text-[10px] ${styles.subtext}`}>
                          <span>{formatSeconds(cp.watchedDurationSec)} / {formatSeconds(cp.totalDurationSec)}</span>
                          <span>{language === 'ar' ? `متقن (>70%): ${cp.videosAbove70}/${cp.totalVideos}` : `Mastered: ${cp.videosAbove70}/${cp.totalVideos}`}</span>
                        </div>
                        {cp.lastWatchedVideo && (
                          <p className={`text-[10px] ${styles.subtext} mt-1.5 truncate`}>
                            {language === 'ar' ? 'آخر فيديو: ' : 'Last: '}{cp.lastWatchedVideo}
                          </p>
                        )}
                      </div>

                      <div className={`mb-4 p-4 rounded-xl bg-${colorName}-500/10 border border-${colorName}-400/20 backdrop-blur-sm`}>
                        <p className={`text-xs font-semibold ${styles.subtext} mb-2 flex items-center gap-1.5`}>
                          <Icons.FileQuestion className={`h-4 w-4 text-${colorName}-400`} />
                          {language === 'ar' ? 'الامتحانات' : 'Exams'}
                        </p>
                        <div className="flex justify-between text-xs mb-1">
                          <span className={styles.subtext}>{language === 'ar' ? 'تم حلها' : 'Attempted'}</span>
                          <span className={`font-bold text-${colorName}-400`}>{cp.attemptedExams}/{cp.totalExams}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 dark:bg-white/10 rounded-full mb-1 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${cp.totalExams > 0 ? (cp.attemptedExams / cp.totalExams) * 100 : 0}%` }}
                            transition={{ duration: 1, ease: 'easeOut' }}
                            className={`h-full rounded-full bg-gradient-to-r from-${colorName}-400 to-${colorName}-600`}
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] mt-2">
                          <div>
                            <span className={styles.subtext}>{language === 'ar' ? 'متوسط' : 'Avg'}</span>
                            <p className={`font-bold text-${colorName}-400`}>{cp.avgExamScore}%</p>
                          </div>
                          <div>
                            <span className={styles.subtext}>{language === 'ar' ? 'الأفضل' : 'Best'}</span>
                            <p className="font-bold text-emerald-400">{cp.bestExamScore}%</p>
                          </div>
                          <div>
                            <span className={styles.subtext}>{language === 'ar' ? 'الأقل' : 'Worst'}</span>
                            <p className="font-bold text-red-400">{cp.worstExamScore}%</p>
                          </div>
                        </div>
                        {cp.lastExamTitle && (
                          <p className={`text-[10px] ${styles.subtext} mt-1.5 truncate`}>
                            {language === 'ar' ? 'آخر امتحان: ' : 'Last: '}{cp.lastExamTitle}
                          </p>
                        )}
                      </div>

                      {/* شارات سريعة لكل كورس */}
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cp.videosAbove70 === cp.totalVideos && cp.totalVideos > 0 && (
                          <span className="text-[10px] px-2 py-1 bg-yellow-400/20 text-yellow-600 dark:text-yellow-400 rounded-full border border-yellow-400/30 flex items-center gap-1">
                            <Icons.Medal className="h-3 w-3" /> {language === 'ar' ? 'متقن' : 'Mastery'}
                          </span>
                        )}
                        {cp.passedExams >= 1 && (
                          <span className="text-[10px] px-2 py-1 bg-green-400/20 text-green-600 dark:text-green-400 rounded-full border border-green-400/30 flex items-center gap-1">
                            <Icons.Award className="h-3 w-3" /> {language === 'ar' ? 'ناجح' : 'Passed'}
                          </span>
                        )}
                        {cp.watchedDurationSec > 3600 && (
                          <span className="text-[10px] px-2 py-1 bg-blue-400/20 text-blue-600 dark:text-blue-400 rounded-full border border-blue-400/30 flex items-center gap-1">
                            <Icons.Clock className="h-3 w-3" /> {language === 'ar' ? 'مجتهد' : 'Dedicated'}
                          </span>
                        )}
                        {cp.overallProgress === 100 && (
                          <span className="text-[10px] px-2 py-1 bg-purple-400/20 text-purple-600 dark:text-purple-400 rounded-full border border-purple-400/30 flex items-center gap-1">
                            <Icons.Crown className="h-3 w-3" /> {language === 'ar' ? 'متميز' : 'Champion'}
                          </span>
                        )}
                      </div>
                    </div>
                  </WaveBorderCard>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}