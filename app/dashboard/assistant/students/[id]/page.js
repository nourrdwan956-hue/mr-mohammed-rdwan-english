'use client';

// ============================================================
// app/dashboard/assistant/students/[id]/page.js
// تفاصيل الطالب – نسخة المساعد المتكاملة V9
// ✅ استخدام AssistantLayout
// ✅ استخدام useAssistantData للحصول على assistant و permissions و teacherId
// ✅ التحقق من صلاحية can_view
// ✅ إزالة أي عمليات حذف أو تعديل (عرض فقط)
// ✅ الحفاظ على أزرار التواصل (واتساب، بريد)
// ✅ تغيير مسارات التنقل إلى /dashboard/assistant/
// ✅ دعم كامل للثيم الفاتح والداكن
// ============================================================
import React from 'react';
import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import { hasPermission } from '@/lib/permissions';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
);

// ============================================================
// 1. خلفية الجسيمات (أنيقة)
// ============================================================

const ParticleBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.2 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.03 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(draw);
    };
    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ============================================================
// 2. عداد متحرك
// ============================================================

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
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="font-extrabold">
      {count}{suffix}
    </span>
  );
};

// ============================================================
// 3. بطاقة إحصائية (معدلة لاستخدام الثيم)
// ============================================================

const StatCard = ({ stat, styles }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative ${styles.card} border ${styles.border} rounded-2xl p-5 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/10 overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`${styles.subtext} text-sm`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && <p className={`text-xs ${styles.subtext} mt-1`}>{stat.sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: isHovered ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ============================================================
// 4. دوال مساعدة
// ============================================================

const formatDate = (date) => {
  if (!date) return 'غير محدد';
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatus = (progress, completedAt) => {
  if (completedAt) return { label: 'مكتمل ✅', color: 'text-green-400' };
  if (progress > 0) return { label: 'قيد التقدم ⏳', color: 'text-yellow-400' };
  return { label: 'لم يبدأ ❌', color: 'text-gray-400' };
};

const getGrade = (percentage) => {
  if (percentage >= 90) return { label: 'ممتاز', color: 'text-green-400', emoji: '🌟' };
  if (percentage >= 75) return { label: 'جيد جداً', color: 'text-blue-400', emoji: '⭐' };
  if (percentage >= 60) return { label: 'جيد', color: 'text-yellow-400', emoji: '👍' };
  if (percentage >= 40) return { label: 'مقبول', color: 'text-orange-400', emoji: '📖' };
  return { label: 'ضعيف', color: 'text-red-400', emoji: '💪' };
};

// ============================================================
// 5. مكونات مساعدة (معدلة لاستخدام الثيم)
// ============================================================

// 5.1 مكون بطاقة الكورس
const CourseProgressCard = ({ course, progress, completedAt, styles }) => {
  const status = getStatus(progress, completedAt);
  const isCompleted = progress === 100 || completedAt;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`${styles.card} border ${styles.border} rounded-xl p-4 hover:border-yellow-400/30 transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={`${styles.text} font-medium truncate`}>{course.title}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className={`font-semibold ${status.color}`}>{status.label}</span>
            <span className={styles.subtext}>{progress || 0}%</span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 mr-4">
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-yellow-400 to-yellow-600'}`}
              style={{ width: `${Math.min(progress || 0, 100)}%` }}
            />
          </div>
          <Link
            href={`/dashboard/assistant/courses/${course.id}`}
            className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
          >
            <Icons.Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// 5.2 مكون نتيجة الامتحان
const ExamResultItem = ({ attempt, exam, styles }) => {
  const percentage = attempt.total_marks > 0
    ? (attempt.score / attempt.total_marks) * 100
    : 0;
  const grade = getGrade(percentage);
  const passed = attempt.score >= (exam?.passing_marks || 0);

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`${styles.card} border ${styles.border} rounded-xl p-4 hover:border-yellow-400/30 transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className={`${styles.text} font-medium`}>{exam?.title || 'امتحان'}</h4>
          <p className={`${styles.subtext} text-xs mt-1`}>{formatDate(attempt.completed_at)}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className={`text-sm font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {attempt.score || 0} / {attempt.total_marks || 0}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${grade.color} bg-white/5`}>
            {grade.emoji} {grade.label}
          </span>
          <Link
            href={`/dashboard/assistant/exams/${attempt.exam_id}/results`}
            className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
          >
            <Icons.Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// 5.3 مكون فيديو مشاهد
const VideoWatchItem = ({ video, progress, styles }) => {
  const isCompleted = progress >= 100;

  return (
    <motion.div
      whileHover={{ y: -4 }}
      className={`${styles.card} border ${styles.border} rounded-xl p-4 hover:border-yellow-400/30 transition-all duration-300`}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <h4 className={`${styles.text} font-medium truncate`}>{video.title}</h4>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className={isCompleted ? 'text-green-400' : 'text-yellow-400'}>
              {isCompleted ? '✅ مكتمل' : `${Math.round(progress || 0)}%`}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 mr-4">
          <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-yellow-400 to-yellow-600'}`}
              style={{ width: `${Math.min(progress || 0, 100)}%` }}
            />
          </div>
          <Link
            href={`/watch/${video.id}`}
            target="_blank"
            className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
          >
            <Icons.Eye className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// 6. الصفحة الرئيسية – تفاصيل الطالب للمساعد
// ============================================================

export default function AssistantStudentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const studentId = params.id;

  // ✅ استخدام الثيم المركزي
  const { theme, language, styles } = useTheme();

  // ✅ استخدام بيانات المساعد والصلاحيات
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();
  const teacherId = assistant?.teacher_id;

  // ===== حالات عامة =====
  const [student, setStudent] = useState(null);
  const [profile, setProfile] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [examAttempts, setExamAttempts] = useState([]);
  const [watchHistory, setWatchHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('courses');

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    totalCourses: 0,
    completedCourses: 0,
    avgProgress: 0,
    avgScore: 0,
    totalExams: 0,
    totalVideosWatched: 0,
  });

  // ===== جلب البيانات =====
  const fetchStudentData = useCallback(async () => {
    if (!teacherId || !studentId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. جلب بيانات الطالب الشخصية
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', studentId)
        .single();

      if (profileError) throw profileError;
      if (!profileData) {
        router.push('/dashboard/assistant/students');
        return;
      }

      setProfile(profileData);

      // 2. جلب تسجيلات الطالب في الكورسات (التابعة للمعلم فقط)
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', teacherId);

      const courseIds = (coursesData || []).map(c => c.id);

      let enrollQuery = supabase
        .from('enrollments')
        .select(`
          *,
          courses:course_id (id, title, description, cover_image, price, level)
        `)
        .eq('student_id', studentId);

      if (courseIds.length > 0) {
        enrollQuery = enrollQuery.in('course_id', courseIds);
      }

      const { data: enrollmentsData, error: enrollError } = await enrollQuery;

      if (enrollError) throw enrollError;
      setEnrollments(enrollmentsData || []);

      // 3. جلب محاولات الامتحانات
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          exams:exam_id (id, title, total_marks, passing_marks)
        `)
        .eq('student_id', studentId)
        .eq('status', 'completed')
        .order('completed_at', { ascending: false });

      if (attemptsError) throw attemptsError;
      setExamAttempts(attemptsData || []);

      // 4. جلب سجل المشاهدة
      const { data: watchData, error: watchError } = await supabase
        .from('watch_history')
        .select(`
          *,
          videos:video_id (id, title, duration)
        `)
        .eq('student_id', studentId)
        .order('updated_at', { ascending: false });

      if (watchError) throw watchError;
      setWatchHistory(watchData || []);

      // 5. حساب الإحصائيات
      const totalCourses = enrollmentsData?.length || 0;
      const completedCourses = enrollmentsData?.filter(e => e.completed_at).length || 0;
      const progresses = enrollmentsData?.map(e => e.progress || 0) || [];
      const avgProgress = progresses.length > 0
        ? progresses.reduce((a, b) => a + b, 0) / progresses.length
        : 0;

      const scores = attemptsData?.map(a => a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0) || [];
      const avgScore = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 0;

      const totalExams = attemptsData?.length || 0;
      const totalVideosWatched = watchData?.filter(w => w.completed).length || 0;

      setStats({
        totalCourses,
        completedCourses,
        avgProgress: Math.round(avgProgress),
        avgScore: Math.round(avgScore),
        totalExams,
        totalVideosWatched,
      });

    } catch (err) {
      console.error('Error fetching student data:', err);
      setError('فشل جلب بيانات الطالب: ' + err.message);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [studentId, teacherId, router]);

  useEffect(() => {
    if (studentId && teacherId) fetchStudentData();
  }, [studentId, teacherId, fetchStudentData]);

  // ===== دوال التنقل =====
  const goBack = () => {
    router.push('/dashboard/assistant/students');
  };

  // ===== إعداد بيانات الرسوم البيانية =====
  const chartData = useMemo(() => {
    const ranges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    enrollments.forEach(e => {
      const p = e.progress || 0;
      if (p <= 20) ranges['0-20']++;
      else if (p <= 40) ranges['21-40']++;
      else if (p <= 60) ranges['41-60']++;
      else if (p <= 80) ranges['61-80']++;
      else ranges['81-100']++;
    });

    const examScores = examAttempts.map(a => {
      return a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
    });
    const examRanges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    examScores.forEach(s => {
      if (s <= 20) examRanges['0-20']++;
      else if (s <= 40) examRanges['21-40']++;
      else if (s <= 60) examRanges['41-60']++;
      else if (s <= 80) examRanges['61-80']++;
      else examRanges['81-100']++;
    });

    return {
      progressDistribution: {
        labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
        datasets: [{
          label: 'عدد الكورسات',
          data: Object.values(ranges),
          backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(52, 211, 153, 0.7)'],
          borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
          borderWidth: 2,
        }],
      },
      examDistribution: {
        labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
        datasets: [{
          label: 'عدد الامتحانات',
          data: Object.values(examRanges),
          backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(52, 211, 153, 0.7)'],
          borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
          borderWidth: 2,
        }],
      },
    };
  }, [enrollments, examAttempts]);

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'الكورسات المسجل فيها', value: stats.totalCourses, suffix: '', icon: Icons.Book, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'كورسات مكتملة', value: stats.completedCourses, suffix: '', icon: Icons.CheckCircle, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'متوسط التقدم', value: stats.avgProgress, suffix: '%', icon: Icons.TrendingUp, color: 'from-yellow-400 to-yellow-600', delay: 0.2 },
    { id: 4, label: 'متوسط الدرجات', value: stats.avgScore, suffix: '%', icon: Icons.Star, color: 'from-purple-400 to-purple-600', delay: 0.3 },
    { id: 5, label: 'الامتحانات المكتملة', value: stats.totalExams, suffix: '', icon: Icons.FileText, color: 'from-orange-400 to-orange-600', delay: 0.4 },
    { id: 6, label: 'فيديوهات مكتملة', value: stats.totalVideosWatched, suffix: '', icon: Icons.Video, color: 'from-red-400 to-red-600', delay: 0.5 },
  ];

  // ===== التحقق من الصلاحية =====
  const canView = hasPermission(permissions, 'students', 'can_view') || hasPermission(permissions, 'students', 'can_manage');

  if (assistantLoading || loading) {
    return (
      <AssistantLayout>
        <div className={`flex items-center justify-center py-20 ${styles.bg}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </AssistantLayout>
    );
  }

  if (!canView || !profile) {
    return (
      <AssistantLayout>
        <div className={`text-center py-20 ${styles.bg}`}>
          <Icons.AlertCircle className={`h-16 w-16 ${!profile ? 'text-red-400' : 'text-gray-400'} mx-auto mb-4`} />
          <p className={`text-lg font-bold ${styles.text}`}>{!profile ? 'الطالب غير موجود' : 'غير مصرح لك'}</p>
          <button onClick={goBack} className="text-yellow-400 hover:underline mt-2">العودة</button>
        </div>
      </AssistantLayout>
    );
  }

  const initials = profile.full_name?.charAt(0) || 'ط';

  return (
    <AssistantLayout>
      <div className={`relative ${styles.bg}`}>
        <ParticleBackground />

        <div className="relative z-10">
          {/* ===== شريط التنقل الداخلي ===== */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={goBack}
                className="text-gray-400 hover:text-yellow-400 transition p-1.5"
              >
                <Icons.ArrowRight className="h-5 w-5" />
              </button>
              <h1 className={`text-xl font-extrabold ${styles.text} truncate max-w-[200px] md:max-w-md`}>
                {profile.full_name || 'طالب'}
              </h1>
              <span className={`text-xs ${styles.subtext}`}>#{studentId.slice(0, 8)}</span>
              {assistant && (
                <span className="mr-2 text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  {assistant.display_name || assistant.full_name}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {/* أزرار التواصل – متاحة للمساعد */}
              <button
                onClick={() => window.open(`mailto:${profile.email}`)}
                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Icons.Mail className="h-3 w-3" /> {language === 'ar' ? 'بريد' : 'Email'}
              </button>

              {profile?.phone && (
                <button
                  onClick={() => {
                    let phone = profile.phone.replace(/[^0-9]/g, '');
                    if (!phone.startsWith('2')) phone = '2' + phone;
                    window.open(`https://wa.me/${phone}`, '_blank');
                  }}
                  className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                >
                  <Icons.MessageCircle className="h-3 w-3" /> {language === 'ar' ? 'واتساب طالب' : 'Student WhatsApp'}
                </button>
              )}

              {profile?.parent_phone && (
                <button
                  onClick={() => {
                    let phone = profile.parent_phone.replace(/[^0-9]/g, '');
                    if (!phone.startsWith('2')) phone = '2' + phone;
                    window.open(`https://wa.me/${phone}`, '_blank');
                  }}
                  className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                >
                  <Icons.MessageCircle className="h-3 w-3" /> {language === 'ar' ? 'واتساب ولي أمر' : 'Parent WhatsApp'}
                </button>
              )}

              <button
                onClick={goBack}
                className={`px-3 py-1.5 ${styles.card} border ${styles.border} rounded-xl text-xs hover:border-yellow-400/50 transition flex items-center gap-1 ${styles.text}`}
              >
                <Icons.ArrowRight className="h-3 w-3" /> العودة
              </button>
            </div>
          </div>

          {/* ===== الأخطاء ===== */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 flex items-center gap-3 text-sm"
              >
                <Icons.AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                  <Icons.X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== بطاقة الملف الشخصي ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1">
              <div className={`${styles.card} border ${styles.border} rounded-2xl overflow-hidden hover:border-yellow-400/30 transition-all duration-500`}>
                <div className="p-6 text-center">
                  <div className="h-24 w-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-white font-extrabold text-4xl shadow-lg overflow-hidden">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{initials}</span>
                    )}
                  </div>
                  <h2 className={`text-2xl font-bold ${styles.text} mt-4`}>{profile.full_name || 'طالب'}</h2>
                  <p className={`${styles.subtext} text-sm`}>{profile.email}</p>
                  {profile.phone && (
                    <p className={`${styles.subtext} text-sm mt-1 dir-ltr`}>{profile.phone}</p>
                  )}
                  {profile.parent_name && (
                    <p className={`${styles.subtext} text-sm mt-1`}>
                      {language === 'ar' ? 'ولي الأمر:' : 'Parent:'} {profile.parent_name}
                    </p>
                  )}
                </div>
                <div className={`border-t ${styles.border} p-4`}>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center">
                      <p className={styles.subtext}>الدور</p>
                      <p className={`${styles.text} font-medium`}>{profile.role === 'student' ? 'طالب' : profile.role}</p>
                    </div>
                    <div className="text-center">
                      <p className={styles.subtext}>انضم</p>
                      <p className={`${styles.text} font-medium`}>{formatDate(profile.created_at)}</p>
                    </div>
                    {profile.level && (
                      <div className="text-center">
                        <p className={styles.subtext}>المستوى</p>
                        <p className={`${styles.text} font-medium`}>{profile.level}</p>
                      </div>
                    )}
                    {profile.school && (
                      <div className="text-center">
                        <p className={styles.subtext}>المدرسة</p>
                        <p className={`${styles.text} font-medium`}>{profile.school}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {statsData.map((stat) => <StatCard key={stat.id} stat={stat} styles={styles} />)}
              </div>
            </div>
          </div>

          {/* ===== الرسوم البيانية ===== */}
          {(enrollments.length > 0 || examAttempts.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {enrollments.length > 0 && (
                <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
                  <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>توزيع تقدم الطالب في الكورسات</h3>
                  <div className="h-56">
                    <Bar
                      data={chartData.progressDistribution}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { color: '#fff' },
                            grid: { color: 'rgba(255,255,255,0.05)' },
                          },
                          x: {
                            ticks: { color: '#fff' },
                            grid: { display: false },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
              {examAttempts.length > 0 && (
                <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
                  <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>توزيع نتائج الامتحانات</h3>
                  <div className="h-56">
                    <Bar
                      data={chartData.examDistribution}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: { color: '#fff' },
                            grid: { color: 'rgba(255,255,255,0.05)' },
                          },
                          x: {
                            ticks: { color: '#fff' },
                            grid: { display: false },
                          },
                        },
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== التبويبات ===== */}
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-5 hover:border-yellow-400/30 transition-all duration-500`}>
            <div className="flex flex-wrap gap-2 mb-6 border-b border-white/5 pb-4">
              {[
                { id: 'courses', label: `الكورسات (${enrollments.length})`, icon: Icons.Book },
                { id: 'exams', label: `الامتحانات (${examAttempts.length})`, icon: Icons.FileText },
                { id: 'videos', label: `الفيديوهات (${watchHistory.length})`, icon: Icons.Video },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                      : `${styles.subtext} hover:${styles.text} hover:bg-white/5`
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'courses' && (
                <motion.div
                  key="courses"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {enrollments.length === 0 ? (
                    <div className="text-center py-8">
                      <Icons.Book className={`h-12 w-12 ${styles.subtext} mx-auto mb-2`} />
                      <p className={styles.subtext}>لم يسجل الطالب في أي كورس بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {enrollments.map((enrollment) => (
                        <CourseProgressCard
                          key={enrollment.course_id}
                          course={enrollment.courses}
                          progress={enrollment.progress || 0}
                          completedAt={enrollment.completed_at}
                          styles={styles}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'exams' && (
                <motion.div
                  key="exams"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {examAttempts.length === 0 ? (
                    <div className="text-center py-8">
                      <Icons.FileText className={`h-12 w-12 ${styles.subtext} mx-auto mb-2`} />
                      <p className={styles.subtext}>لم يقم الطالب بأي امتحان بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {examAttempts.map((attempt) => (
                        <ExamResultItem
                          key={attempt.id}
                          attempt={attempt}
                          exam={attempt.exams}
                          styles={styles}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'videos' && (
                <motion.div
                  key="videos"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {watchHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <Icons.Video className={`h-12 w-12 ${styles.subtext} mx-auto mb-2`} />
                      <p className={styles.subtext}>لم يشاهد الطالب أي فيديو بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {watchHistory.map((watch) => (
                        <VideoWatchItem
                          key={watch.id}
                          video={watch.videos}
                          progress={watch.progress || 0}
                          styles={styles}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ===== روابط سريعة ===== */}
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 mt-6`}>
            <h3 className={`text-sm font-semibold ${styles.text} mb-2 flex items-center gap-2`}>
              <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/assistant" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الرئيسية</Link>
              <Link href="/dashboard/assistant/courses" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الكورسات</Link>
              <Link href="/dashboard/assistant/students" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الطلاب</Link>
              <Link href="/dashboard/assistant/exams" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الامتحانات</Link>
            </div>
          </div>
        </div>
      </div>
    </AssistantLayout>
  );
}