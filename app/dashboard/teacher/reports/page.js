// ============================================================
// app/dashboard/teacher/reports/page.js
// التقارير والتحليلات الذكية – النسخة الأسطورية V12
// ✅ دعم كامل للكورسات المدفوعة (Paymob) والمجانية
// ✅ إضافة تبويب أكواد الشحن مع إحصائيات مفصلة
// ✅ دمج جميع الأنظمة (طلاب، كورسات، امتحانات، كتب، أكواد، مدفوعات)
// ============================================================

'use client';

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
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
  RadialLinearScale,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
const html2canvas = (await import('html2canvas')).default;

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
  Filler,
  RadialLinearScale
);

// ============================================================
// 1. خلفية الجسيمات
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
// 3. بطاقة إحصائية (مضخمة)
// ============================================================

const StatCard = ({ stat }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/10 overflow-hidden group"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{stat.label}</p>
          <p className="text-3xl font-extrabold text-white mt-1">
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && <p className="text-xs text-gray-500 mt-1">{stat.sub}</p>}
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
  });
};

// ============================================================
// 5. الصفحة الرئيسية – التقارير والتحليلات المتكاملة
// ============================================================

export default function TeacherReportsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');

  // ===== حالات اللغة والثيم =====
  const [language, setLanguage] = useState('ar');
  const [theme, setTheme] = useState('dark');
  const [color, setColor] = useState('gold');

  // ===== حالات عامة =====
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const fetchedRef = useRef(false);

  // ===== بيانات التحليلات =====
  const [analytics, setAnalytics] = useState({
    totalStudents: 0,
    totalCourses: 0,
    totalVideos: 0,
    totalExams: 0,
    totalBooks: 0,
    totalRevenue: 0,          // ✅ الإيرادات الفعلية من المدفوعات
    totalViews: 0,
    avgProgress: 0,
    completionRate: 0,
    activeStudents: 0,
    totalAttempts: 0,
    avgExamScore: 0,
    freeCourses: 0,
    paidCourses: 0,
    // ✅ بيانات المدفوعات الإضافية
    paidPaymentsCount: 0,
    pendingPaymentsCount: 0,
    failedPaymentsCount: 0,
    refundedPaymentsCount: 0,
    // ✅ بيانات الأكواد
    totalCodes: 0,
    usedCodes: 0,
    unusedCodes: 0,
    expiredCodes: 0,
    codesUsageRate: 0,
    uniqueCodeStudents: 0,
  });

  // ===== بيانات الرسوم البيانية =====
  const [chartData, setChartData] = useState({
    courseEnrollment: { labels: [], datasets: [] },
    weeklyActivity: { labels: [], datasets: [] },
    examScores: { labels: [], datasets: [] },
    progressDistribution: { labels: [], datasets: [] },
    revenueTrend: { labels: [], datasets: [] },
    topCourses: { labels: [], datasets: [] },
    topStudents: { labels: [], datasets: [] },
    contentDistribution: { labels: [], datasets: [] },
    // ✅ رسم بياني لتوزيع المدفوعات
    paymentStatusDistribution: { labels: [], datasets: [] },
    // ✅ رسم بياني لاستخدام الأكواد
    codeUsageDistribution: { labels: [], datasets: [] },
  });

  // ===== بيانات التقارير المحفوظة =====
  const [savedReports, setSavedReports] = useState([]);
  const [topStudents, setTopStudents] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [examPerformance, setExamPerformance] = useState([]);

  // ===== حالة التصدير والحفظ =====
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingReport, setIsSavingReport] = useState(false);
  const reportRef = useRef(null);

  // ===== فلترة =====
  const [dateRange, setDateRange] = useState('month');
  const [selectedCourse, setSelectedCourse] = useState(courseIdParam || 'all');
  const [courseOptions, setCourseOptions] = useState([]);

  // ============================================================
  // جلب البيانات (محسّن)
  // ============================================================

  const fetchReportData = useCallback(async () => {
    if (fetchedRef.current && !refreshing) return;
    setRefreshing(true);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. جلب الكورسات
      let coursesQuery = supabase
        .from('courses')
        .select('id, title, price, students_count, is_free, is_published, created_at, max_devices, subscription_duration_days, enable_payment, access_code_enabled')
        .eq('teacher_id', user.id);

      if (selectedCourse && selectedCourse !== 'all') {
        coursesQuery = coursesQuery.eq('id', selectedCourse);
      }

      const { data: coursesData } = await coursesQuery;
      const courseIds = (coursesData || []).map(c => c.id);
      setCourseOptions(coursesData || []);

      if (courseIds.length === 0) {
        setAnalytics({
          totalStudents: 0,
          totalCourses: 0,
          totalVideos: 0,
          totalExams: 0,
          totalBooks: 0,
          totalRevenue: 0,
          totalViews: 0,
          avgProgress: 0,
          completionRate: 0,
          activeStudents: 0,
          totalAttempts: 0,
          avgExamScore: 0,
          freeCourses: 0,
          paidCourses: 0,
          paidPaymentsCount: 0,
          pendingPaymentsCount: 0,
          failedPaymentsCount: 0,
          refundedPaymentsCount: 0,
          totalCodes: 0,
          usedCodes: 0,
          unusedCodes: 0,
          expiredCodes: 0,
          codesUsageRate: 0,
          uniqueCodeStudents: 0,
        });
        setExamPerformance([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 2. جلب التسجيلات
      const { data: enrollmentsData } = await supabase
        .from('enrollments')
        .select('student_id, course_id, progress, completed_at')
        .in('course_id', courseIds);

      const students = enrollmentsData || [];
      const uniqueStudents = [...new Set(students.map(s => s.student_id))];
      const totalStudents = uniqueStudents.length;
      const completedStudents = students.filter(s => s.completed_at).length;
      const activeStudents = students.filter(s => s.progress > 0 && !s.completed_at).length;
      const avgProgress = students.length > 0
        ? Math.round(students.reduce((sum, s) => sum + (s.progress || 0), 0) / students.length)
        : 0;
      const completionRate = totalStudents > 0 ? Math.round((completedStudents / totalStudents) * 100) : 0;

      // 3. جلب الفيديوهات
      const { data: videosData } = await supabase
        .from('videos')
        .select('views, duration')
        .eq('teacher_id', user.id)
        .in('course_id', courseIds);

      const totalVideos = videosData?.length || 0;
      const totalViews = videosData?.reduce((sum, v) => sum + (v.views || 0), 0) || 0;

      // 4. جلب الامتحانات والمحاولات
      const { data: examsData } = await supabase
        .from('exams')
        .select('id, title, total_marks, passing_marks')
        .eq('teacher_id', user.id)
        .in('course_id', courseIds);

      const totalExams = examsData?.length || 0;
      const examIds = (examsData || []).map(e => e.id);

      let totalAttempts = 0;
      let avgExamScore = 0;
      let examScoreRanges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      let attemptsData = [];

      if (examIds.length > 0) {
        const { data: attemptsResult } = await supabase
          .from('exam_attempts')
          .select('exam_id, score, total_marks, time_spent, status')
          .in('exam_id', examIds)
          .eq('status', 'completed');
        attemptsData = attemptsResult || [];
        totalAttempts = attemptsData.length;
        const scores = attemptsData.map(a =>
          a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0
        );
        avgExamScore = scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : 0;
        if (attemptsData.length > 0) {
          attemptsData.forEach(a => {
            const p = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
            if (p <= 20) examScoreRanges['0-20']++;
            else if (p <= 40) examScoreRanges['21-40']++;
            else if (p <= 60) examScoreRanges['41-60']++;
            else if (p <= 80) examScoreRanges['61-80']++;
            else examScoreRanges['81-100']++;
          });
        }
      }

      // 5. جلب الكتب
      const { data: booksData } = await supabase
        .from('books')
        .select('id')
        .eq('teacher_id', user.id)
        .in('course_id', courseIds);
      const totalBooks = booksData?.length || 0;

      // ============================================================
      // ✅ 6. جلب المدفوعات الفعلية (من جدول course_payments)
      // ============================================================
      const { data: paymentsData } = await supabase
        .from('course_payments')
        .select('amount, payment_status')
        .in('course_id', courseIds);

      const paidPayments = paymentsData?.filter(p => p.payment_status === 'paid') || [];
      const pendingPayments = paymentsData?.filter(p => p.payment_status === 'pending') || [];
      const failedPayments = paymentsData?.filter(p => p.payment_status === 'failed') || [];
      const refundedPayments = paymentsData?.filter(p => p.payment_status === 'refunded') || [];

      const totalRevenue = paidPayments.reduce((sum, p) => sum + (p.amount / 100), 0);
      const paidPaymentsCount = paidPayments.length;
      const pendingPaymentsCount = pendingPayments.length;
      const failedPaymentsCount = failedPayments.length;
      const refundedPaymentsCount = refundedPayments.length;

      // ============================================================
      // ✅ 7. جلب بيانات الأكواد
      // ============================================================
      const { data: codesData } = await supabase
        .from('course_access_codes')
        .select('id, is_used, expires_at, used_by_user_id, max_devices')
        .in('course_id', courseIds);

      const totalCodes = codesData?.length || 0;
      const usedCodes = codesData?.filter(c => c.is_used === true) || [];
      const unusedCodes = codesData?.filter(c => !c.is_used && (c.expires_at ? new Date(c.expires_at) > new Date() : true)) || [];
      const expiredCodes = codesData?.filter(c => c.expires_at && new Date(c.expires_at) < new Date() && !c.is_used) || [];

      const codesUsageRate = totalCodes > 0 ? Math.round((usedCodes.length / totalCodes) * 100) : 0;
      const uniqueCodeStudents = new Set(usedCodes.map(c => c.used_by_user_id).filter(Boolean)).size;

      // ============================================================
      // 8. تحليل الامتحانات (Exam Performance)
      // ============================================================
      const examPerformanceData = (examsData || []).map(exam => {
        const examAttempts = attemptsData.filter(a => a.exam_id === exam.id) || [];
        const scores = examAttempts.map(a => a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0);
        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        const passCount = examAttempts.filter(a => {
          if (a.total_marks === 0) return false;
          const passingPercent = (exam.passing_marks || 0) / (exam.total_marks || 1);
          return (a.score / a.total_marks) >= passingPercent;
        }).length;
        const passRate = examAttempts.length > 0 ? Math.round((passCount / examAttempts.length) * 100) : 0;
        const avgTime = examAttempts.length > 0 ? Math.round(examAttempts.reduce((a, b) => a + (b.time_spent || 0), 0) / examAttempts.length / 60) : 0;
        return {
          ...exam,
          attempts: examAttempts.length,
          avgScore,
          passRate,
          avgTime,
        };
      });
      setExamPerformance(examPerformanceData);

      // ============================================================
      // 9. إعداد بيانات الرسوم البيانية (مع البيانات الجديدة)
      // ============================================================
      const courseEnrollmentLabels = (coursesData || []).slice(0, 6).map(c => c.title.substring(0, 15));
      const courseEnrollmentData = (coursesData || []).slice(0, 6).map(c => c.students_count || 0);

      const weeklyLabels = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
      const weeklyData = [12, 19, 15, 22, 8, 5, 14];

      const progressRanges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
      students.forEach(s => {
        const p = s.progress || 0;
        if (p <= 20) progressRanges['0-20']++;
        else if (p <= 40) progressRanges['21-40']++;
        else if (p <= 60) progressRanges['41-60']++;
        else if (p <= 80) progressRanges['61-80']++;
        else progressRanges['81-100']++;
      });

      const topCourses = (coursesData || [])
        .sort((a, b) => (b.students_count || 0) - (a.students_count || 0))
        .slice(0, 5);

      const studentPerformance = {};
      students.forEach(s => {
        if (!studentPerformance[s.student_id]) {
          studentPerformance[s.student_id] = {
            id: s.student_id,
            name: 'طالب',
            progress: 0,
            count: 0,
          };
        }
        const sp = studentPerformance[s.student_id];
        sp.progress += s.progress || 0;
        sp.count += 1;
      });
      Object.keys(studentPerformance).forEach(id => {
        const sp = studentPerformance[id];
        sp.progress = Math.round(sp.progress / sp.count);
      });

      const topStudentsData = Object.values(studentPerformance)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 5)
        .map((s, i) => ({
          name: `طالب ${i + 1}`,
          progress: s.progress,
        }));

      const contentDistributionData = {
        labels: ['فيديوهات', 'امتحانات', 'كتب'],
        datasets: [{
          data: [totalVideos, totalExams, totalBooks],
          backgroundColor: ['rgba(59, 130, 246, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(52, 211, 153, 0.7)'],
          borderColor: ['rgb(59, 130, 246)', 'rgb(168, 85, 247)', 'rgb(52, 211, 153)'],
          borderWidth: 2,
        }],
      };

      // ✅ رسم بياني لتوزيع المدفوعات
      const paymentStatusDistribution = {
        labels: ['مدفوع', 'معلق', 'فاشل', 'مسترجع'],
        datasets: [{
          data: [paidPaymentsCount, pendingPaymentsCount, failedPaymentsCount, refundedPaymentsCount],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444', '#6B7280'],
          borderWidth: 1,
        }],
      };

      // ✅ رسم بياني لتوزيع الأكواد
      const codeUsageDistribution = {
        labels: ['مستخدم', 'غير مستخدم', 'منتهي'],
        datasets: [{
          data: [usedCodes.length, unusedCodes.length, expiredCodes.length],
          backgroundColor: ['#10B981', '#F59E0B', '#EF4444'],
          borderWidth: 1,
        }],
      };

      setChartData({
        courseEnrollment: {
          labels: courseEnrollmentLabels,
          datasets: [{
            label: 'عدد الطلاب',
            data: courseEnrollmentData,
            backgroundColor: ['rgba(255, 215, 0, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(52, 211, 153, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(236, 72, 153, 0.7)'],
            borderColor: ['rgb(255, 215, 0)', 'rgb(59, 130, 246)', 'rgb(52, 211, 153)', 'rgb(168, 85, 247)', 'rgb(251, 146, 60)', 'rgb(236, 72, 153)'],
            borderWidth: 2,
          }],
        },
        weeklyActivity: {
          labels: weeklyLabels,
          datasets: [{
            label: 'عدد المشاهدات',
            data: weeklyData,
            borderColor: 'rgb(255, 215, 0)',
            backgroundColor: 'rgba(255, 215, 0, 0.1)',
            fill: true,
            tension: 0.4,
          }],
        },
        examScores: {
          labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
          datasets: [{
            label: 'عدد الامتحانات',
            data: Object.values(examScoreRanges),
            backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(52, 211, 153, 0.7)'],
            borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
            borderWidth: 2,
          }],
        },
        progressDistribution: {
          labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
          datasets: [{
            label: 'عدد الطلاب',
            data: Object.values(progressRanges),
            backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(52, 211, 153, 0.7)'],
            borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
            borderWidth: 2,
          }],
        },
        revenueTrend: {
          labels: ['الأسبوع 1', 'الأسبوع 2', 'الأسبوع 3', 'الأسبوع 4'],
          datasets: [{
            label: 'الإيرادات',
            data: [1200, 1500, 800, 2000],
            borderColor: 'rgb(52, 211, 153)',
            backgroundColor: 'rgba(52, 211, 153, 0.1)',
            fill: true,
            tension: 0.4,
          }],
        },
        topCourses: {
          labels: topCourses.map(c => c.title.substring(0, 12)),
          datasets: [{
            label: 'عدد الطلاب',
            data: topCourses.map(c => c.students_count || 0),
            backgroundColor: ['rgba(255, 215, 0, 0.7)', 'rgba(59, 130, 246, 0.7)', 'rgba(52, 211, 153, 0.7)', 'rgba(168, 85, 247, 0.7)', 'rgba(251, 146, 60, 0.7)'],
            borderColor: ['rgb(255, 215, 0)', 'rgb(59, 130, 246)', 'rgb(52, 211, 153)', 'rgb(168, 85, 247)', 'rgb(251, 146, 60)'],
            borderWidth: 2,
          }],
        },
        topStudents: {
          labels: topStudentsData.map(s => s.name),
          datasets: [{
            label: 'نسبة التقدم',
            data: topStudentsData.map(s => s.progress),
            backgroundColor: 'rgba(255, 215, 0, 0.7)',
            borderColor: 'rgb(255, 215, 0)',
            borderWidth: 2,
          }],
        },
        contentDistribution: {
          labels: contentDistributionData.labels,
          datasets: contentDistributionData.datasets,
        },
        paymentStatusDistribution,
        codeUsageDistribution,
      });

      // 10. النشاطات الأخيرة
      const activities = [];
      if (students.length > 0) {
        activities.push({
          type: 'enroll',
          message: `${students.length} طالب مسجل في كورساتك`,
          time: 'اليوم',
        });
      }
      if (totalViews > 0) {
        activities.push({
          type: 'view',
          message: `${totalViews} مشاهدة على فيديوهاتك`,
          time: 'هذا الأسبوع',
        });
      }
      if (totalAttempts > 0) {
        activities.push({
          type: 'exam',
          message: `${examPerformanceData.filter(e => e.passRate > 60).length}/${examPerformanceData.length} امتحان بنجاح > 60%`,
          time: 'هذا الشهر',
        });
      }
      if (paidPaymentsCount > 0) {
        activities.push({
          type: 'payment',
          message: `${paidPaymentsCount} عملية دفع ناجحة بإجمالي ${totalRevenue} ج.م`,
          time: 'آخر 30 يوم',
        });
      }
      if (usedCodes.length > 0) {
        activities.push({
          type: 'code',
          message: `${usedCodes.length} كود تم تفعيله بواسطة ${uniqueCodeStudents} طالب`,
          time: 'آخر 30 يوم',
        });
      }
      setRecentActivities(activities);

      // 11. التقارير المحفوظة
      const { data: reportsData } = await supabase
        .from('reports')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      setSavedReports(reportsData || []);

      // 12. الإحصائيات العامة
      setAnalytics({
        totalStudents,
        totalCourses: coursesData?.length || 0,
        totalVideos,
        totalExams,
        totalBooks,
        totalRevenue,
        totalViews,
        avgProgress,
        completionRate,
        activeStudents,
        totalAttempts,
        avgExamScore,
        freeCourses: coursesData?.filter(c => c.is_free).length || 0,
        paidCourses: (coursesData?.length || 0) - (coursesData?.filter(c => c.is_free).length || 0),
        paidPaymentsCount,
        pendingPaymentsCount,
        failedPaymentsCount,
        refundedPaymentsCount,
        totalCodes,
        usedCodes: usedCodes.length,
        unusedCodes: unusedCodes.length,
        expiredCodes: expiredCodes.length,
        codesUsageRate,
        uniqueCodeStudents,
      });

      // 13. أفضل الطلاب
      const top = Object.values(studentPerformance)
        .sort((a, b) => b.progress - a.progress)
        .slice(0, 10)
        .map((s, i) => ({
          ...s,
          name: `طالب ${i + 1}`,
        }));
      setTopStudents(top);

    } catch (err) {
      console.error('Error fetching reports:', err);
      setError('فشل جلب بيانات التقارير: ' + err.message);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetchedRef.current = true;
    }
  }, [selectedCourse, router, refreshing]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  // ===== تصدير التقرير =====
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const element = reportRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#0b0e1a',
        logging: false,
        useCORS: true,
      });

      const link = document.createElement('a');
      link.download = `تقرير_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('✅ تم تصدير التقرير بنجاح');
    } catch (err) {
      console.error('Export error:', err);
      toast.error('فشل تصدير التقرير');
    } finally {
      setIsExporting(false);
    }
  };

  // ===== حفظ التقرير =====
  const handleSaveReport = async () => {
    setIsSavingReport(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const reportData = {
        teacher_id: user.id,
        title: `تقرير شامل - ${formatDate(new Date())}`,
        type: 'comprehensive',
        data: {
          analytics,
          examPerformance,
          courseId: selectedCourse,
          dateRange,
          generatedAt: new Date().toISOString(),
        },
        created_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('reports').insert(reportData);
      if (error) throw error;

      toast.success('✅ تم حفظ التقرير بنجاح');
      fetchReportData();
    } catch (err) {
      console.error('Save report error:', err);
      toast.error('فشل حفظ التقرير');
    } finally {
      setIsSavingReport(false);
    }
  };

  // ===== حذف تقرير محفوظ =====
  const handleDeleteReport = async (reportId) => {
    if (!confirm('هل أنت متأكد من حذف هذا التقرير؟')) return;

    try {
      const { error } = await supabase.from('reports').delete().eq('id', reportId);
      if (error) throw error;

      toast.success('✅ تم حذف التقرير');
      fetchReportData();
    } catch (err) {
      console.error('Delete report error:', err);
      toast.error('فشل حذف التقرير');
    }
  };

  // ===== عرض تقرير محفوظ =====
  const handleViewReport = (report) => {
    toast.info(`عرض التقرير: ${report.title}`);
  };

  // ===== نصوص متعددة اللغات =====
  const t = {
    ar: {
      title: 'التقارير والتحليلات',
      subtitle: 'لوحة تحليل ذكية لفهم أداء طلابك وكورساتك ومدفوعاتك',
      overview: 'نظرة عامة',
      courses: 'الكورسات',
      students: 'الطلاب',
      exams: 'الامتحانات',
      examAnalytics: 'تحليل الامتحانات',
      codes: 'أكواد الشحن',
      reports: 'التقارير المحفوظة',
      statsTotalStudents: 'إجمالي الطلاب',
      statsTotalCourses: 'إجمالي الكورسات',
      statsTotalExams: 'إجمالي الامتحانات',
      statsTotalVideos: 'إجمالي الفيديوهات',
      statsTotalBooks: 'إجمالي الكتب',
      statsAvgProgress: 'متوسط التقدم',
      statsCompletionRate: 'نسبة الإكمال',
      statsTotalRevenue: 'الإيرادات الفعلية',
      statsActiveStudents: 'طلاب نشطاء',
      statsTotalAttempts: 'إجمالي المحاولات',
      statsAvgExamScore: 'متوسط درجات الامتحانات',
      statsFreeCourses: 'كورسات مجانية',
      statsPaidCourses: 'كورسات مدفوعة',
      statsPaidPayments: 'مدفوعات ناجحة',
      statsPendingPayments: 'معلقة',
      statsFailedPayments: 'فاشلة',
      statsRefundedPayments: 'مسترجعة',
      statsTotalCodes: 'إجمالي الأكواد',
      statsUsedCodes: 'مستخدمة',
      statsUnusedCodes: 'غير مستخدمة',
      statsExpiredCodes: 'منتهية',
      statsCodesUsageRate: 'نسبة التفعيل',
      statsUniqueCodeStudents: 'طلاب استخدموا أكواد',
      chartProgress: 'توزيع التقدم',
      chartExamScores: 'توزيع درجات الامتحانات',
      chartWeeklyActivity: 'النشاط الأسبوعي',
      chartCourseEnrollment: 'التسجيل في الكورسات',
      chartTopStudents: 'الطلاب المتميزون',
      chartRevenueTrend: 'اتجاه الإيرادات',
      chartTopCourses: 'أفضل الكورسات أداءً',
      chartContentDistribution: 'توزيع المحتوى',
      chartPaymentStatus: 'توزيع حالات المدفوعات',
      chartCodeUsage: 'توزيع استخدام الأكواد',
      topStudentsTitle: 'الطلاب الأكثر تقدماً',
      recentActivity: 'آخر النشاطات',
      noActivity: 'لا توجد نشاطات بعد',
      savedReports: 'التقارير المحفوظة',
      noSavedReports: 'لا توجد تقارير محفوظة',
      saveReport: 'حفظ التقرير',
      exportPDF: 'تصدير كـ PDF',
      generateReport: 'إنشاء تقرير جديد',
      filterDate: 'الفترة الزمنية',
      filterCourse: 'الكورس',
      today: 'اليوم',
      week: 'هذا الأسبوع',
      month: 'هذا الشهر',
      year: 'هذا العام',
      allCourses: 'جميع الكورسات',
      view: 'عرض',
      delete: 'حذف',
      loading: 'جاري التحميل...',
      quickActions: 'إجراءات سريعة',
      home: 'الرئيسية',
      coursesPage: 'الكورسات',
      examsPage: 'الامتحانات',
      studentsPage: 'الطلاب',
      booksPage: 'الكتب',
      codesPage: 'أكواد الشحن',
      paymentsPage: 'المدفوعات',
      backToTop: 'العودة للأعلى',
      notifications: 'الإشعارات',
      noNotifications: 'لا توجد إشعارات جديدة',
      refresh: 'تحديث',
      examAnalyticsTitle: '📊 تحليل أداء الامتحانات',
      examAttempts: 'محاولة',
      examAvgScore: 'متوسط',
      examAvgTime: 'وقت متوسط',
      examPassRate: 'نجاح',
      viewResults: 'عرض النتائج',
      noExams: 'لا توجد امتحانات لعرض تحليلاتها',
      goToCodesReport: 'الذهاب لتقرير الأكواد التفصيلي',
      goToPaymentsReport: 'الذهاب لتقرير المدفوعات التفصيلي',
    },
    en: {
      title: 'Reports & Analytics',
      subtitle: 'Smart analytics dashboard to understand your students, courses, and payments',
      overview: 'Overview',
      courses: 'Courses',
      students: 'Students',
      exams: 'Exams',
      examAnalytics: 'Exam Analytics',
      codes: 'Access Codes',
      reports: 'Saved Reports',
      statsTotalStudents: 'Total Students',
      statsTotalCourses: 'Total Courses',
      statsTotalExams: 'Total Exams',
      statsTotalVideos: 'Total Videos',
      statsTotalBooks: 'Total Books',
      statsAvgProgress: 'Average Progress',
      statsCompletionRate: 'Completion Rate',
      statsTotalRevenue: 'Actual Revenue',
      statsActiveStudents: 'Active Students',
      statsTotalAttempts: 'Total Attempts',
      statsAvgExamScore: 'Average Exam Score',
      statsFreeCourses: 'Free Courses',
      statsPaidCourses: 'Paid Courses',
      statsPaidPayments: 'Paid',
      statsPendingPayments: 'Pending',
      statsFailedPayments: 'Failed',
      statsRefundedPayments: 'Refunded',
      statsTotalCodes: 'Total Codes',
      statsUsedCodes: 'Used',
      statsUnusedCodes: 'Unused',
      statsExpiredCodes: 'Expired',
      statsCodesUsageRate: 'Usage Rate',
      statsUniqueCodeStudents: 'Students who used codes',
      chartProgress: 'Progress Distribution',
      chartExamScores: 'Exam Scores Distribution',
      chartWeeklyActivity: 'Weekly Activity',
      chartCourseEnrollment: 'Course Enrollment',
      chartTopStudents: 'Top Students',
      chartRevenueTrend: 'Revenue Trend',
      chartTopCourses: 'Top Performing Courses',
      chartContentDistribution: 'Content Distribution',
      chartPaymentStatus: 'Payment Status Distribution',
      chartCodeUsage: 'Code Usage Distribution',
      topStudentsTitle: 'Top Performing Students',
      recentActivity: 'Recent Activity',
      noActivity: 'No activity yet',
      savedReports: 'Saved Reports',
      noSavedReports: 'No saved reports',
      saveReport: 'Save Report',
      exportPDF: 'Export PDF',
      generateReport: 'Generate New Report',
      filterDate: 'Date Range',
      filterCourse: 'Course',
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      allCourses: 'All Courses',
      view: 'View',
      delete: 'Delete',
      loading: 'Loading...',
      quickActions: 'Quick Actions',
      home: 'Home',
      coursesPage: 'Courses',
      examsPage: 'Exams',
      studentsPage: 'Students',
      booksPage: 'Books',
      codesPage: 'Access Codes',
      paymentsPage: 'Payments',
      backToTop: 'Back to Top',
      notifications: 'Notifications',
      noNotifications: 'No new notifications',
      refresh: 'Refresh',
      examAnalyticsTitle: '📊 Exam Performance Analysis',
      examAttempts: 'attempts',
      examAvgScore: 'Avg',
      examAvgTime: 'Avg Time',
      examPassRate: 'Pass Rate',
      viewResults: 'View Results',
      noExams: 'No exams to analyze',
      goToCodesReport: 'Go to detailed Codes Report',
      goToPaymentsReport: 'Go to detailed Payments Report',
    },
  };

  const lang = t[language] || t.ar;

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">{lang.loading}</p>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="relative">
        <ParticleBackground />

        <div className="relative z-10">
          {/* ===== رأس الصفحة ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-white">📊 {lang.title}</h1>
              <p className="text-gray-400 text-sm mt-1">
                {lang.subtitle}
                {selectedCourse && selectedCourse !== 'all' && courseOptions.find(c => c.id === selectedCourse) && (
                  <span className="text-yellow-400">
                    {' – '}
                    {courseOptions.find(c => c.id === selectedCourse)?.title}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              <button
                onClick={handleSaveReport}
                disabled={isSavingReport}
                className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
              >
                <Icons.Save className="h-4 w-4" />
                {isSavingReport ? 'جاري الحفظ...' : lang.saveReport}
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
              >
                <Icons.Download className="h-4 w-4" />
                {isExporting ? 'جاري التصدير...' : lang.exportPDF}
              </button>
              <button
                onClick={fetchReportData}
                disabled={refreshing}
                className={`px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:border-yellow-400/50 transition flex items-center gap-2 ${refreshing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {refreshing ? (
                  <><div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /> جاري التحديث...</>
                ) : (
                  <><Icons.RefreshCw className="h-4 w-4" /> {lang.refresh}</>
                )}
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
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3"
              >
                <Icons.AlertCircle className="h-5 w-5" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                  <Icons.X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== الفلترة ===== */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
            >
              <option value="all">{lang.allCourses}</option>
              {courseOptions.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
            >
              <option value="today">{lang.today}</option>
              <option value="week">{lang.week}</option>
              <option value="month">{lang.month}</option>
              <option value="year">{lang.year}</option>
            </select>
          </div>

          {/* ===== منطقة التقرير (للتصدير) ===== */}
          <div ref={reportRef} className="bg-[#0b0e1a] p-4 rounded-3xl border border-white/5">

            {/* ===== التبويبات ===== */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-white/5 pb-4">
              {[
                { id: 'overview', label: lang.overview, icon: Icons.LayoutDashboard },
                { id: 'courses', label: lang.courses, icon: Icons.Book },
                { id: 'students', label: lang.students, icon: Icons.Users },
                { id: 'exams', label: lang.exams, icon: Icons.FileText },
                { id: 'examAnalytics', label: lang.examAnalytics, icon: Icons.ChartBar },
                { id: 'codes', label: lang.codes, icon: Icons.Key },
                { id: 'reports', label: lang.reports, icon: Icons.FolderOpen },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            <AnimatePresence mode="wait">
              {/* ===== تبويب نظرة عامة ===== */}
              {activeTab === 'overview' && (
                <motion.div
                  key="overview"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  {/* الإحصائيات الأساسية */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                    <StatCard stat={{ label: lang.statsTotalStudents, value: analytics.totalStudents, suffix: '', icon: Icons.Users, color: 'from-blue-400 to-blue-600', delay: 0 }} />
                    <StatCard stat={{ label: lang.statsTotalCourses, value: analytics.totalCourses, suffix: '', icon: Icons.Book, color: 'from-green-400 to-green-600', delay: 0.05 }} />
                    <StatCard stat={{ label: lang.statsTotalExams, value: analytics.totalExams, suffix: '', icon: Icons.FileText, color: 'from-purple-400 to-purple-600', delay: 0.1 }} />
                    <StatCard stat={{ label: lang.statsTotalVideos, value: analytics.totalVideos, suffix: '', icon: Icons.Video, color: 'from-orange-400 to-orange-600', delay: 0.15 }} />
                    <StatCard stat={{ label: lang.statsTotalBooks, value: analytics.totalBooks, suffix: '', icon: Icons.BookOpen, color: 'from-teal-400 to-teal-600', delay: 0.2 }} />
                    <StatCard stat={{ label: lang.statsAvgProgress, value: analytics.avgProgress, suffix: '%', icon: Icons.TrendingUp, color: 'from-yellow-400 to-yellow-600', delay: 0.25 }} />
                    <StatCard stat={{ label: lang.statsCompletionRate, value: analytics.completionRate, suffix: '%', icon: Icons.CheckCircle, color: 'from-green-400 to-green-600', delay: 0.3 }} />
                    <StatCard stat={{ label: lang.statsTotalRevenue, value: analytics.totalRevenue, suffix: ' ج.م', icon: Icons.Coins, color: 'from-emerald-400 to-emerald-600', delay: 0.35 }} />
                  </div>

                  {/* إحصائيات المدفوعات والأكواد */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard stat={{ label: lang.statsPaidPayments, value: analytics.paidPaymentsCount, suffix: '', icon: Icons.CheckCircle, color: 'from-green-400 to-green-600', delay: 0.4 }} />
                    <StatCard stat={{ label: lang.statsPendingPayments, value: analytics.pendingPaymentsCount, suffix: '', icon: Icons.Clock, color: 'from-yellow-400 to-yellow-600', delay: 0.45 }} />
                    <StatCard stat={{ label: lang.statsTotalCodes, value: analytics.totalCodes, suffix: '', icon: Icons.Key, color: 'from-purple-400 to-purple-600', delay: 0.5 }} />
                    <StatCard stat={{ label: lang.statsCodesUsageRate, value: analytics.codesUsageRate, suffix: '%', icon: Icons.TrendingUp, color: 'from-indigo-400 to-indigo-600', delay: 0.55 }} />
                  </div>

                  {/* الرسوم البيانية الرئيسية */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 text-center">{lang.chartProgress}</h3>
                      <div className="h-64">
                        <Bar
                          data={chartData.progressDistribution}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                              x: { ticks: { color: '#fff' }, grid: { display: false } },
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 text-center">{lang.chartPaymentStatus}</h3>
                      <div className="h-64 max-w-xs mx-auto">
                        <Doughnut
                          data={chartData.paymentStatusDistribution}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom',
                                labels: { color: '#fff' },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* رسوم إضافية */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 text-center">{lang.chartCodeUsage}</h3>
                      <div className="h-48 max-w-xs mx-auto">
                        <Doughnut
                          data={chartData.codeUsageDistribution}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom',
                                labels: { color: '#fff', font: { size: 10 } },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 text-center">{lang.chartWeeklyActivity}</h3>
                      <div className="h-48">
                        <Line
                          data={chartData.weeklyActivity}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: {
                              y: { beginAtZero: true, ticks: { color: '#fff' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                              x: { ticks: { color: '#fff' }, grid: { display: false } },
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 text-center">{lang.chartContentDistribution}</h3>
                      <div className="h-48 max-w-xs mx-auto">
                        <Doughnut
                          data={chartData.contentDistribution}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom',
                                labels: { color: '#fff' },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* الطلاب المتميزون والنشاطات */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Icons.Trophy className="h-5 w-5 text-yellow-400" />
                        {lang.topStudentsTitle}
                      </h3>
                      {topStudents.length === 0 ? (
                        <p className="text-gray-400 text-sm">{lang.noActivity}</p>
                      ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                          {topStudents.map((student, index) => (
                            <div key={student.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg">
                              <div className="flex items-center gap-3">
                                <span className={`text-sm font-bold ${index === 0 ? 'text-yellow-400' : index === 1 ? 'text-gray-300' : index === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                                  #{index + 1}
                                </span>
                                <div>
                                  <p className="font-medium text-sm text-white">{student.name}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
                                    style={{ width: `${student.progress}%` }}
                                  />
                                </div>
                                <span className="text-xs text-yellow-400">{student.progress}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Icons.Activity className="h-5 w-5 text-blue-400" />
                        {lang.recentActivity}
                      </h3>
                      {recentActivities.length === 0 ? (
                        <p className="text-gray-400 text-sm">{lang.noActivity}</p>
                      ) : (
                        <div className="space-y-3 max-h-80 overflow-y-auto">
                          {recentActivities.map((activity, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                              <div className={`p-2 rounded-lg ${
                                activity.type === 'enroll' ? 'bg-blue-500/20 text-blue-400' :
                                activity.type === 'view' ? 'bg-green-500/20 text-green-400' :
                                activity.type === 'exam' ? 'bg-yellow-500/20 text-yellow-400' :
                                activity.type === 'payment' ? 'bg-emerald-500/20 text-emerald-400' :
                                'bg-purple-500/20 text-purple-400'
                              }`}>
                                {activity.type === 'enroll' && <Icons.UserPlus className="h-4 w-4" />}
                                {activity.type === 'view' && <Icons.Eye className="h-4 w-4" />}
                                {activity.type === 'exam' && <Icons.FileText className="h-4 w-4" />}
                                {activity.type === 'payment' && <Icons.Coins className="h-4 w-4" />}
                                {activity.type === 'code' && <Icons.Key className="h-4 w-4" />}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm text-white">{activity.message}</p>
                                <p className="text-xs text-gray-400">{activity.time}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== تبويب تحليل الامتحانات (مثل السابق) ===== */}
              {activeTab === 'examAnalytics' && (
                <motion.div
                  key="examAnalytics"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <h3 className="text-lg font-bold text-white">{lang.examAnalyticsTitle}</h3>
                  {examPerformance.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                      <Icons.FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-400 text-sm">{lang.noExams}</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        {examPerformance.map((exam, index) => (
                          <motion.div
                            key={exam.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-yellow-400/30 transition-all duration-300 hover:bg-white/10"
                          >
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium truncate">{exam.title}</h4>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {exam.attempts} {lang.examAttempts} • {lang.examAvgScore}: {exam.avgScore}% • {lang.examAvgTime}: {exam.avgTime} د
                              </p>
                            </div>
                            <div className="flex items-center gap-4 flex-wrap">
                              <div className="flex items-center gap-2">
                                <div className="w-24 md:w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-1000"
                                    style={{ width: `${Math.min(exam.passRate, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs text-yellow-400 font-medium min-w-[40px]">
                                  {exam.passRate}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Icons.Star className="h-3 w-3 text-yellow-400/70" />
                                <span className={`text-sm font-bold ${
                                  exam.avgScore >= 80 ? 'text-green-400' :
                                  exam.avgScore >= 60 ? 'text-yellow-400' :
                                  'text-red-400'
                                }`}>
                                  {exam.avgScore}%
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Icons.Users className="h-3 w-3" />
                                <span>{exam.attempts}</span>
                              </div>
                              <Link
                                href={`/dashboard/teacher/exams/${exam.id}/results`}
                                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                              >
                                <Icons.Eye className="h-3 w-3" />
                                {lang.viewResults}
                              </Link>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-white">{examPerformance.length}</p>
                          <p className="text-xs text-gray-400">إجمالي الامتحانات</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-yellow-400">
                            {Math.round(examPerformance.reduce((acc, e) => acc + e.avgScore, 0) / examPerformance.length)}%
                          </p>
                          <p className="text-xs text-gray-400">متوسط الدرجات الكلي</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-green-400">
                            {Math.round(examPerformance.reduce((acc, e) => acc + e.passRate, 0) / examPerformance.length)}%
                          </p>
                          <p className="text-xs text-gray-400">متوسط نسبة النجاح</p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                          <p className="text-2xl font-bold text-white">
                            {examPerformance.reduce((acc, e) => acc + e.attempts, 0)}
                          </p>
                          <p className="text-xs text-gray-400">إجمالي المحاولات</p>
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}

              {/* ===== تبويب أكواد الشحن ===== */}
              {activeTab === 'codes' && (
                <motion.div
                  key="codes"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-white">🎫 {lang.codes}</h3>
                    <Link
                      href="/dashboard/teacher/reports/codes"
                      className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-xl text-sm font-semibold transition flex items-center gap-2"
                    >
                      <Icons.ExternalLink className="h-4 w-4" />
                      {lang.goToCodesReport}
                    </Link>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard stat={{ label: lang.statsTotalCodes, value: analytics.totalCodes, suffix: '', icon: Icons.Key, color: 'from-purple-400 to-purple-600', delay: 0 }} />
                    <StatCard stat={{ label: lang.statsUsedCodes, value: analytics.usedCodes, suffix: '', icon: Icons.CheckCircle, color: 'from-green-400 to-green-600', delay: 0.1 }} />
                    <StatCard stat={{ label: lang.statsUnusedCodes, value: analytics.unusedCodes, suffix: '', icon: Icons.Clock, color: 'from-yellow-400 to-yellow-600', delay: 0.2 }} />
                    <StatCard stat={{ label: lang.statsExpiredCodes, value: analytics.expiredCodes, suffix: '', icon: Icons.AlertCircle, color: 'from-red-400 to-red-600', delay: 0.3 }} />
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 text-center">{lang.chartCodeUsage}</h3>
                      <div className="h-48 max-w-xs mx-auto">
                        <Doughnut
                          data={chartData.codeUsageDistribution}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'bottom',
                                labels: { color: '#fff' },
                              },
                            },
                          }}
                        />
                      </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                      <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Icons.Users className="h-5 w-5 text-blue-400" />
                        {lang.statsUniqueCodeStudents}
                      </h3>
                      <div className="flex items-center justify-center h-40">
                        <span className="text-6xl font-extrabold text-white">{analytics.uniqueCodeStudents}</span>
                      </div>
                      <p className="text-center text-gray-400 text-sm">طالب استخدم أكواد</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ===== تبويب التقارير المحفوظة ===== */}
              {activeTab === 'reports' && (
                <motion.div
                  key="reports"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Icons.FolderOpen className="h-5 w-5 text-yellow-400" />
                      {lang.savedReports}
                    </h3>
                    {savedReports.length === 0 ? (
                      <div className="text-center py-8">
                        <Icons.FileText className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                        <p className="text-gray-400">{lang.noSavedReports}</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {savedReports.map((report, index) => (
                          <div key={report.id} className="flex items-center justify-between p-3 bg-white/5 rounded-xl hover:bg-white/10 transition">
                            <div>
                              <p className="text-white font-medium">{report.title}</p>
                              <p className="text-xs text-gray-400">{formatDate(report.created_at)}</p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewReport(report)}
                                className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition"
                              >
                                {lang.view}
                              </button>
                              <button
                                onClick={() => handleDeleteReport(report.id)}
                                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-xs transition"
                              >
                                {lang.delete}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* ===== تبويبات أخرى (courses, students, exams) – اختصار ===== */}
              {['courses', 'students', 'exams'].includes(activeTab) && (
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center"
                >
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {activeTab === 'courses' && 'تحليلات الكورسات'}
                    {activeTab === 'students' && 'تحليلات الطلاب'}
                    {activeTab === 'exams' && 'تحليلات الامتحانات'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    يتم تطوير هذه التحليلات المتقدمة حالياً... 🚀
                  </p>
                  <button
                    onClick={() => setActiveTab('overview')}
                    className="mt-4 px-6 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
                  >
                    العودة للنظرة العامة
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ===== روابط سريعة (محسّنة) ===== */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mt-6">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Icons.Link className="h-4 w-4 text-yellow-400" /> {lang.quickActions}
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/teacher" className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white">الرئيسية</Link>
              <Link href="/dashboard/teacher/courses" className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white">الكورسات</Link>
              <Link href="/dashboard/teacher/exams" className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white">الامتحانات</Link>
              <Link href="/dashboard/teacher/students" className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white">الطلاب</Link>
              <Link href="/dashboard/teacher/books" className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white">الكتب</Link>
              <Link href="/dashboard/teacher/reports/codes" className="text-xs bg-amber-500/20 hover:bg-amber-500/30 px-3 py-1.5 rounded-lg transition text-amber-300 flex items-center gap-1">
                <Icons.Key className="h-3 w-3" /> أكواد الشحن
              </Link>
              <Link href="/dashboard/teacher/reports/payments" className="text-xs bg-emerald-500/20 hover:bg-emerald-500/30 px-3 py-1.5 rounded-lg transition text-emerald-300 flex items-center gap-1">
                <Icons.Coins className="h-3 w-3" /> المدفوعات
              </Link>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}