// app/dashboard/student/courses/[id]/progress/page.js
// ================================================================
// 🏛️ صفحة تقدم الكورس – متجاوبة بالكامل ومضغوطة
// ✅ تصغير الأحجام والهوامش والأيقونات
// ✅ الحفاظ على جميع الوظائف (إحصائيات، نصائح، رسوم بيانية، شارات)
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
// ألوان البطاقات (نظام Wave Border)
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
// 🌊 Wave Border Card – مضغوط
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
// ⏱️ دوال مساعدة
// ================================================================
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (dateString, language) => {
  return new Date(dateString).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
};

const parseDurationToSeconds = (durationStr) => {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return 0;
};

// ================================================================
// 🧠 توليد النصائح الذكية (مضغوط)
// ================================================================
function generateSmartTips(stats, language) {
  const tips = [];
  const {
    videosAbove70,
    totalVideos,
    avgScore,
    attemptedExams,
    totalExams,
    passedExams,
    watchTimeSeconds,
    totalDurationSeconds,
    overallWatchPercent,
  } = stats;

  if (overallWatchPercent < 10 && attemptedExams === 0) {
    tips.push({
      icon: Icons.Rocket,
      title: language === 'ar' ? '🚀 ابدأ رحلتك!' : '🚀 Start your journey!',
      description: language === 'ar'
        ? 'لسه مبدأتش في الكورس! خصص وقت يومي للمشاهدة.'
        : 'You haven\'t started yet! Dedicate daily time to watch.',
      color: 'blue',
    });
  }

  if (overallWatchPercent < 30 && overallWatchPercent > 0) {
    tips.push({
      icon: Icons.Eye,
      title: language === 'ar' ? '📺 استمر في المشاهدة' : '📺 Keep watching',
      description: language === 'ar'
        ? 'لسه في بداية الطريق. حاول تشاهد يومياً عشان تلمّ بالمادة.'
        : 'You\'re at the beginning. Try to watch daily.',
      color: 'yellow',
    });
  }

  if (attemptedExams > 0 && avgScore < 50) {
    tips.push({
      icon: Icons.AlertTriangle,
      title: language === 'ar' ? '⚠️ درجاتك ضعيفة!' : '⚠️ Low scores!',
      description: language === 'ar'
        ? 'درجاتك أقل من ٥٠٪! راجع المادة وتواصل مع معلمك.'
        : 'Your scores are below 50%! Review and contact your teacher.',
      color: 'red',
    });
  }

  if (overallWatchPercent > 60 && avgScore < 60 && attemptedExams > 0) {
    tips.push({
      icon: Icons.Brain,
      title: language === 'ar' ? '🧠 فهم مش مشاهدة' : '🧠 Understanding, not watching',
      description: language === 'ar'
        ? 'شاهدت جزء كبير، لكن درجاتك مش عالية. ركز في الفهم.'
        : 'You watched a lot, but scores aren\'t high. Focus on understanding.',
      color: 'orange',
    });
  }

  if (avgScore >= 50 && avgScore < 70 && attemptedExams > 0) {
    tips.push({
      icon: Icons.TrendingUp,
      title: language === 'ar' ? '📈 تحسّن مستواك' : '📈 Improve your level',
      description: language === 'ar'
        ? 'أداؤك متوسط. راجع الأسئلة اللي غلطت فيها.'
        : 'Average performance. Review wrong answers.',
      color: 'yellow',
    });
  }

  if (avgScore >= 80 && attemptedExams > 0) {
    tips.push({
      icon: Icons.Crown,
      title: language === 'ar' ? '👑 أداء ممتاز!' : '👑 Excellent!',
      description: language === 'ar'
        ? 'ماشاء الله! مستواك ممتاز، استمر في التحدي.'
        : 'Excellent performance! Keep challenging yourself.',
      color: 'green',
    });
  }

  if (tips.length === 0) {
    tips.push({
      icon: Icons.Smile,
      title: language === 'ar' ? '😊 أنت في الطريق الصحيح' : '😊 You\'re on track',
      description: language === 'ar'
        ? 'استمر بنفس الوتيرة، وستحقق نتائج رائعة قريباً!'
        : 'Keep up the pace, you\'ll achieve great results soon!',
      color: 'blue',
    });
  }

  return tips;
}

// ================================================================
// 🎯 مكون شريط التقدم الدائري – مضغوط
// ================================================================
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
        <motion.circle cx={size/2} cy={size/2} r={radius} stroke={`url(#grad-${color})`} strokeWidth={strokeWidth} fill="none" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
        <defs>
          <linearGradient id={`grad-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={c1} /><stop offset="100%" stopColor={c2} />
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

// ================================================================
// 📊 شريط تقدم خطي – مضغوط
// ================================================================
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
          className={`h-full bg-gradient-to-r ${colors[color]} rounded-full shadow-lg shadow-${color}-500/20`}
        />
      </div>
    </div>
  );
};

// ================================================================
// 🎬 بطاقة فيديو – مضغوطة
// ================================================================
const VideoProgressCard = ({ video, history, styles, language }) => {
  const progress = history?.progress || 0;
  const isCompleted = progress >= 90;
  const isMastered = progress >= 70;
  const watchedAt = history?.watched_at;
  const [color, setColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setColor(newColor);

  let statusText = language === 'ar' ? 'لم يشاهد' : 'Not watched';
  let statusColor = 'text-gray-400';
  if (isCompleted) { statusText = language === 'ar' ? '✅ مكتمل' : '✅ Completed'; statusColor = 'text-green-400'; }
  else if (isMastered) { statusText = language === 'ar' ? '⭐ متقن' : '⭐ Mastered'; statusColor = 'text-yellow-400'; }
  else if (progress > 0) { statusText = `${Math.round(progress)}%`; statusColor = color.text; }

  return (
    <WaveBorderCard initialColor={color.name} onColorChange={handleColorChange}>
      <div className={`p-2 sm:p-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 transition min-h-[56px] sm:min-h-[64px]`}>
        <div className={`relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isCompleted ? 'bg-green-400/20' : isMastered ? 'bg-yellow-400/20' : progress > 0 ? `bg-${color.name}-400/20` : 'bg-gray-400/10'
        }`}>
          {isCompleted ? <Icons.CheckCircle className="h-5 w-5 sm:h-5 sm:w-5 text-green-500" />
            : isMastered ? <Icons.Star className="h-5 w-5 sm:h-5 sm:w-5 text-yellow-400" />
            : progress > 0 ? <Icons.Play className={`h-5 w-5 sm:h-5 sm:w-5 ${color.text}`} />
            : <Icons.Play className="h-5 w-5 sm:h-5 sm:w-5 text-gray-400" />}
          {progress > 0 && !isCompleted && (
            <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" className="stroke-current text-gray-200 dark:text-white/10" strokeWidth="2.5" />
              <circle cx="18" cy="18" r="15" fill="none" className={`stroke-current ${color.text}`} strokeWidth="2.5" strokeDasharray={`${(progress/100) * 94.2} 94.2`} strokeLinecap="round" />
            </svg>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <Link href={`/watch/${video.id}`} className={`text-xs sm:text-sm font-bold ${styles.text} hover:${color.text} transition line-clamp-1`}>
            {video.title}
          </Link>
          {video.duration && <span className={`text-[9px] sm:text-[10px] ${styles.subtext} mr-1.5`}>{video.duration}</span>}
        </div>

        <div className="text-right flex-shrink-0 w-full sm:w-auto">
          <span className={`text-[10px] sm:text-xs font-bold ${statusColor}`}>{statusText}</span>
          {watchedAt && <p className="text-[8px] sm:text-[9px] text-gray-400 mt-0.5">{formatDate(watchedAt, language)}</p>}
        </div>
      </div>
    </WaveBorderCard>
  );
};

// ================================================================
// 📝 بطاقة امتحان – مضغوطة
// ================================================================
const ExamProgressCard = ({ exam, attempt, styles, language }) => {
  const attempted = !!attempt;
  const score = attempt ? Math.round((attempt.score / attempt.total_marks) * 100) : 0;
  const passed = score >= (exam.passing_marks || 50);
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

// ================================================================
// 🏅 شارة تحفيزية – مضغوطة
// ================================================================
const BadgeItem = ({ icon: Icon, label, earned, color, styles }) => {
  const [cardColor, setCardColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const handleColorChange = (newColor) => setCardColor(newColor);

  return (
    <WaveBorderCard initialColor={cardColor.name} onColorChange={handleColorChange}>
      <div className={`p-2 sm:p-3 text-center ${earned ? '' : 'opacity-40'}`}>
        <Icon className={`h-6 w-6 sm:h-7 sm:w-7 mx-auto mb-0.5 sm:mb-1 ${earned ? `text-${color}-500` : 'text-gray-400'}`} />
        <p className={`text-[8px] sm:text-[10px] font-bold ${earned ? styles.text : styles.subtext}`}>{label}</p>
      </div>
    </WaveBorderCard>
  );
};

// ================================================================
// 📄 الصفحة الرئيسية – تقدم الكورس (النسخة المضغوطة)
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
  const [stats, setStats] = useState({
    totalVideos: 0,
    watchedVideos: 0,
    videosAbove70: 0,
    completedVideos: 0,
    totalExams: 0,
    attemptedExams: 0,
    passedExams: 0,
    totalWatchTime: 0,
    averageScore: 0,
    overallWatchPercent: 0,
  });
  const [overallProgress, setOverallProgress] = useState(0);
  const [engagementIndex, setEngagementIndex] = useState(0);
  const [activeSection, setActiveSection] = useState('overview');
  const [smartTips, setSmartTips] = useState([]);
  const [chartData, setChartData] = useState(null);
  const fetchedRef = useRef(false);
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/login'); return; }

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
          .single();
        if (teacherData) {
          setTeacher(teacherData);
          courseData.teacher = teacherData;
        }
      }

      const [vidRes, exRes] = await Promise.all([
        supabase.from('videos').select('*').eq('course_id', id).order('created_at', { ascending: true }),
        supabase.from('exams').select('*').eq('course_id', id).order('created_at', { ascending: true }),
      ]);
      const videosData = vidRes.data || [];
      const examsData = exRes.data || [];
      setVideos(videosData);
      setExams(examsData);

      const videoIds = videosData.map(v => v.id);
      const examIds = examsData.map(e => e.id);

      let watchMap = {};
      let totalWatchSec = 0;
      let totalDurationSec = 0;
      if (videoIds.length > 0) {
        const { data: wh } = await supabase
          .from('watch_history')
          .select('*')
          .eq('student_id', user.id)
          .in('video_id', videoIds);

        wh?.forEach(h => {
          const existing = watchMap[h.video_id];
          if (!existing || (h.progress || 0) > (existing.progress || 0)) {
            watchMap[h.video_id] = h;
          }
        });

        videosData.forEach(v => {
          const dur = parseDurationToSeconds(v.duration);
          totalDurationSec += dur;
          const wh = watchMap[v.id];
          if (wh) {
            const watched = wh.watched_seconds || 0;
            totalWatchSec += Math.min(watched, dur);
          }
        });
      }
      setWatchHistory(watchMap);

      let attemptMap = {};
      if (examIds.length > 0) {
        const { data: attempts } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('student_id', user.id)
          .in('exam_id', examIds)
          .order('created_at', { ascending: false });

        attempts?.forEach(a => {
          if (!attemptMap[a.exam_id]) {
            attemptMap[a.exam_id] = a;
          }
        });
      }
      setExamAttempts(attemptMap);

      let watchedVideos = 0;
      let videosAbove70 = 0;
      let completedVideos = 0;
      Object.values(watchMap).forEach(h => {
        const p = h.progress || 0;
        if (p > 0) watchedVideos++;
        if (p >= 70) videosAbove70++;
        if (p >= 90) completedVideos++;
      });

      const attemptedExams = Object.keys(attemptMap).length;
      let avgScore = 0;
      let passedExams = 0;
      let scoreSum = 0;
      Object.values(attemptMap).forEach(a => {
        const pct = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
        scoreSum += pct;
        const exam = examsData.find(e => e.id === a.exam_id);
        if (pct >= (exam?.passing_marks || 50)) passedExams++;
      });
      if (attemptedExams > 0) avgScore = Math.round(scoreSum / attemptedExams);

      const overallWatchPercent = totalDurationSec > 0 ? (totalWatchSec / totalDurationSec) * 100 : 0;

      const newStats = {
        totalVideos: videosData.length,
        watchedVideos,
        videosAbove70,
        completedVideos,
        totalExams: examsData.length,
        attemptedExams,
        passedExams,
        totalWatchTime: totalWatchSec,
        averageScore: avgScore,
        overallWatchPercent,
      };
      setStats(newStats);

      const videoWeight = videosData.length > 0 ? (videosAbove70 / videosData.length) * 0.6 : 0;
      const examWeight = examsData.length > 0 ? (passedExams / examsData.length) * 0.4 : 0;
      const overall = Math.round((videoWeight + examWeight) * 100);
      setOverallProgress(Math.min(overall, 100));

      const engVideo = videosData.length > 0 ? (videosAbove70 / videosData.length) * 0.5 : 0;
      const engScore = attemptedExams > 0 ? (avgScore / 100) * 0.3 : 0;
      const engAttempt = examsData.length > 0 ? (attemptedExams / examsData.length) * 0.2 : 0;
      setEngagementIndex(Math.round((engVideo + engScore + engAttempt) * 100));

      const tips = generateSmartTips({
        videosAbove70,
        totalVideos: videosData.length,
        avgScore,
        attemptedExams,
        totalExams: examsData.length,
        passedExams,
        watchTimeSeconds: totalWatchSec,
        totalDurationSeconds: totalDurationSec,
        overallWatchPercent,
      }, language);
      setSmartTips(tips);

      if (videosData.length > 0 || examsData.length > 0) {
        setChartData({
          labels: [language === 'ar' ? 'الفيديوهات' : 'Videos', language === 'ar' ? 'الامتحانات' : 'Exams'],
          datasets: [
            {
              label: language === 'ar' ? 'الإنجاز' : 'Achievement',
              data: [
                videosData.length > 0 ? Math.round((videosAbove70 / videosData.length) * 100) : 0,
                examsData.length > 0 ? Math.round((passedExams / examsData.length) * 100) : 0,
              ],
              backgroundColor: ['rgba(251, 191, 36, 0.7)', 'rgba(52, 211, 153, 0.7)'],
              borderColor: ['#fbbf24', '#22c55e'],
              borderWidth: 2,
              borderRadius: 6,
            }
          ],
        });
      }

    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل تحميل التقدم' : 'Failed to load progress');
    } finally {
      setLoading(false);
    }
  }, [id, language, router]);

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

  if (loading) return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"/>
    </div>
  );

  if (!course) return (
    <div className={`h-full w-full flex items-center justify-center p-3 ${styles.bg}`}>
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

  const sections = [
    { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview', icon: Icons.LayoutDashboard },
    { id: 'videos', label: language === 'ar' ? 'الفيديوهات' : 'Videos', icon: Icons.Video, count: stats.totalVideos },
    { id: 'exams', label: language === 'ar' ? 'الامتحانات' : 'Exams', icon: Icons.FileQuestion, count: stats.totalExams },
  ];

  return (
    <div className={`w-full min-h-screen ${styles.bg}`}>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 space-y-4 sm:space-y-5">
        {/* ===== رأس الصفحة – مضغوط ===== */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <Link href={`/dashboard/student/courses/${id}`} className={`text-[10px] sm:text-xs ${styles.subtext} hover:text-blue-500 transition flex items-center gap-1 mb-0.5`}>
                  <Icons.ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> {course.title}
                </Link>
                <h1 className={`text-xl sm:text-2xl md:text-3xl font-black ${styles.text}`}>
                  {language === 'ar' ? 'تقدّمك الذكي' : 'Smart Progress'}
                </h1>
                <p className={`text-[9px] sm:text-[10px] ${styles.subtext} mt-0.5`}>
                  {language === 'ar' ? 'مبني على الإتقان (≥70%) والنجاح في الامتحانات' : 'Based on mastery (≥70%) and exam success'}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <CircularProgress percentage={overallProgress} size={70} strokeWidth={6} styles={styles} color="blue" label={language==='ar'?'التقدم':'Progress'} />
                <CircularProgress percentage={engagementIndex} size={70} strokeWidth={6} styles={styles} color="purple" label={language==='ar'?'الالتزام':'Engagement'} />
              </div>
            </div>

            {/* إحصائيات سريعة – مضغوطة */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                <Icons.Video className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 mx-auto mb-0.5" />
                <p className={`text-sm sm:text-base font-bold ${styles.text}`}>{stats.videosAbove70}/{stats.totalVideos}</p>
                <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'فيديوهات متقنة' : 'Mastered Videos'}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                <Icons.Award className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-500 mx-auto mb-0.5" />
                <p className={`text-sm sm:text-base font-bold ${styles.text}`}>{stats.passedExams}/{stats.totalExams}</p>
                <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'امتحانات ناجحة' : 'Passed Exams'}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                <Icons.Clock className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500 mx-auto mb-0.5" />
                <p className={`text-sm sm:text-base font-bold ${styles.text}`}>{formatTime(stats.totalWatchTime)}</p>
                <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'وقت المشاهدة' : 'Watch Time'}</p>
              </div>
              <div className={`p-2 sm:p-3 rounded-lg ${styles.card} border ${styles.border} text-center`}>
                <Icons.TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 mx-auto mb-0.5" />
                <p className={`text-sm sm:text-base font-bold ${styles.text}`}>{stats.averageScore}%</p>
                <p className={`text-[8px] sm:text-[10px] ${styles.subtext}`}>{language === 'ar' ? 'متوسط الدرجات' : 'Avg Score'}</p>
              </div>
            </div>

            {/* أشرطة تقدم رئيسية – مضغوطة */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              <div className={`p-2.5 sm:p-3 rounded-lg ${styles.card} border ${styles.border} space-y-2`}>
                <h3 className={`text-xs sm:text-sm font-bold ${styles.text} flex items-center gap-1.5`}>
                  <Icons.Video className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-blue-500" /> {language==='ar'?'إتقان الفيديوهات':'Video Mastery'}
                </h3>
                <LinearProgress value={stats.videosAbove70} max={stats.totalVideos} styles={styles} color="blue" label={language==='ar'?'متقنة (≥70%)':'Mastered (≥70%)'} />
                <LinearProgress value={stats.completedVideos} max={stats.totalVideos} styles={styles} color="green" label={language==='ar'?'مكتملة (≥90%)':'Completed (≥90%)'} />
              </div>
              <div className={`p-2.5 sm:p-3 rounded-lg ${styles.card} border ${styles.border} space-y-2`}>
                <h3 className={`text-xs sm:text-sm font-bold ${styles.text} flex items-center gap-1.5`}>
                  <Icons.FileQuestion className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-emerald-500" /> {language==='ar'?'أداء الامتحانات':'Exam Performance'}
                </h3>
                <LinearProgress value={stats.attemptedExams} max={stats.totalExams} styles={styles} color="orange" label={language==='ar'?'تم حلها':'Attempted'} />
                <LinearProgress value={stats.passedExams} max={stats.totalExams} styles={styles} color="green" label={language==='ar'?'ناجحة':'Passed'} />
              </div>
            </div>
          </div>
        </WaveBorderCard>

        {/* ===== النصائح الذكية – مضغوطة ===== */}
        {smartTips.length > 0 && (
          <div className="space-y-2 sm:space-y-3">
            <h2 className={`text-base sm:text-lg font-black ${styles.text} flex items-center gap-1.5 sm:gap-2`}>
              <Icons.Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
              {language === 'ar' ? '🧠 نصائح مخصصة' : 'Personalized Tips'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              {smartTips.map((tip, idx) => {
                const Icon = tip.icon;
                const colorMap = {
                  blue: 'bg-blue-500/20 border-blue-400/30 text-blue-600 dark:text-blue-400',
                  green: 'bg-green-500/20 border-green-400/30 text-green-600 dark:text-green-400',
                  yellow: 'bg-yellow-500/20 border-yellow-400/30 text-yellow-600 dark:text-yellow-400',
                  red: 'bg-red-500/20 border-red-400/30 text-red-600 dark:text-red-400',
                  purple: 'bg-purple-500/20 border-purple-400/30 text-purple-600 dark:text-purple-400',
                  orange: 'bg-orange-500/20 border-orange-400/30 text-orange-600 dark:text-orange-400',
                };
                const bg = colorMap[tip.color] || colorMap.blue;
                return (
                  <motion.div key={idx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: idx * 0.06 }}>
                    <WaveBorderCard initialColor={tip.color}>
                      <div className={`p-2.5 sm:p-3 rounded-lg border ${bg} backdrop-blur-sm`}>
                        <div className="flex items-start gap-2 sm:gap-3">
                          <div className={`p-1.5 sm:p-2 rounded-lg ${bg}`}>
                            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                          </div>
                          <div className="flex-1">
                            <h4 className={`text-xs sm:text-sm font-bold ${styles.text}`}>{tip.title}</h4>
                            <p className={`text-[9px] sm:text-[10px] ${styles.subtext} mt-0.5 leading-relaxed`}>{tip.description}</p>
                          </div>
                        </div>
                      </div>
                    </WaveBorderCard>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== تبويب الأقسام – مضغوط ===== */}
        <div className="flex gap-1 border-b-2 border-gray-200 dark:border-white/10 pb-1.5 overflow-x-auto no-scrollbar">
          {sections.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSection(s.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all whitespace-nowrap ${
                activeSection === s.id
                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 shadow-lg shadow-blue-500/10 scale-105'
                  : `${styles.subtext} hover:bg-gray-100 dark:hover:bg-white/5`
              }`}
            >
              <s.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              {s.label}
              {s.count !== undefined && (
                <span className={`text-[8px] sm:text-[10px] rounded-full px-1.5 py-0.5 sm:px-2 sm:py-0.5 ${activeSection === s.id ? 'bg-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-gray-200 dark:bg-white/10'}`}>{s.count}</span>
              )}
            </button>
          ))}
        </div>

        {/* ===== محتوى التبويب – مضغوط ===== */}
        <AnimatePresence mode="wait">
          {activeSection === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4 sm:space-y-5">
              {/* رسم بياني */}
              {chartData && (
                <div className={`p-3 sm:p-4 rounded-2xl ${styles.card} border ${styles.border}`}>
                  <h3 className={`text-sm sm:text-base font-bold ${styles.text} mb-3`}>{language === 'ar' ? '📊 ملخص الإنجاز' : 'Achievement Summary'}</h3>
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

              {/* شارات – مضغوطة */}
              <div className={`p-3 sm:p-4 rounded-2xl ${styles.card} border ${styles.border}`}>
                <h3 className={`text-sm sm:text-base font-bold ${styles.text} mb-2`}>{language === 'ar' ? '🏅 شاراتك' : 'Your Badges'}</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {stats.videosAbove70 === stats.totalVideos && stats.totalVideos > 0 && (
                    <BadgeItem icon={Icons.Medal} label={language === 'ar' ? '🎖️ متقن' : 'Mastery'} earned={true} color="yellow" styles={styles} />
                  )}
                  {stats.passedExams >= 1 && (
                    <BadgeItem icon={Icons.Award} label={language === 'ar' ? '✅ ناجح' : 'Passed'} earned={true} color="green" styles={styles} />
                  )}
                  {stats.totalWatchTime > 3600 && (
                    <BadgeItem icon={Icons.Clock} label={language === 'ar' ? '⏳ مجتهد' : 'Dedicated'} earned={true} color="blue" styles={styles} />
                  )}
                  {overallProgress === 100 && (
                    <BadgeItem icon={Icons.Crown} label={language === 'ar' ? '👑 متميز' : 'Champion'} earned={true} color="purple" styles={styles} />
                  )}
                </div>
                {stats.totalVideos === 0 && stats.totalExams === 0 && (
                  <p className={`text-xs sm:text-sm ${styles.subtext} text-center py-3`}>{language === 'ar' ? 'أكمل الفيديوهات والامتحانات لكسب الشارات!' : 'Complete videos and exams to earn badges!'}</p>
                )}
              </div>
            </motion.div>
          )}

          {activeSection === 'videos' && (
            <motion.div key="videos" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 sm:space-y-3">
              {videos.length > 0 ? videos.map(v => (
                <VideoProgressCard key={v.id} video={v} history={watchHistory[v.id]} styles={styles} language={language} />
              )) : (
                <p className={`text-xs sm:text-sm ${styles.subtext} text-center py-8`}>{language === 'ar' ? 'لا توجد فيديوهات' : 'No videos yet'}</p>
              )}
            </motion.div>
          )}

          {activeSection === 'exams' && (
            <motion.div key="exams" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2 sm:space-y-3">
              {exams.length > 0 ? exams.map(e => (
                <ExamProgressCard key={e.id} exam={e} attempt={examAttempts[e.id]} styles={styles} language={language} />
              )) : (
                <p className={`text-xs sm:text-sm ${styles.subtext} text-center py-8`}>{language === 'ar' ? 'لا توجد امتحانات' : 'No exams yet'}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}