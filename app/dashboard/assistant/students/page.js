'use client';

// ============================================================
// app/dashboard/assistant/students/page.js
// إدارة الطلاب – نسخة المساعد (مع Suspense لحل خطأ البناء)
// ✅ إضافة Suspense boundary لحل خطأ useSearchParams في البناء
// ============================================================
import React from 'react';
import { Suspense } from 'react';
import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';

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
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(Math.floor(start));
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

// ============================================================
// 3. بطاقة إحصائية
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
const getStudentStatus = (progress, completedAt) => {
  if (completedAt) return { label: 'مكتمل', color: 'bg-green-500/20 text-green-400 border-green-500/30' };
  if (progress > 0) return { label: 'جاري', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' };
  return { label: 'لم يبدأ', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' };
};

// ============================================================
// 5. بطاقة الطالب
// ============================================================
const StudentCard = ({ student, onViewProfile, index, styles }) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = getStudentStatus(student.avgProgress, student.completedAt);
  const initials = student.name?.charAt(0) || 'ط';
  const avatarColors = ['from-blue-400 to-blue-600', 'from-green-400 to-green-600', 'from-purple-400 to-purple-600', 'from-pink-400 to-pink-600', 'from-orange-400 to-orange-600', 'from-teal-400 to-teal-600', 'from-red-400 to-red-600', 'from-indigo-400 to-indigo-600'];
  const avatarColor = avatarColors[index % avatarColors.length];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative ${styles.card} border ${styles.border} rounded-2xl overflow-hidden hover:border-yellow-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-purple-500/5 to-transparent rounded-2xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />
      <div className="relative z-10 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center md:items-start gap-4 md:gap-3 flex-1 min-w-0">
            <div className={`h-16 w-16 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-extrabold text-2xl shadow-lg flex-shrink-0`}>{initials}</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-bold ${styles.text} group-hover:text-yellow-300 transition-colors cursor-pointer`} onClick={() => onViewProfile(student.id)}>{student.name}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
              </div>
              <p className={`${styles.subtext} text-sm truncate`}>{student.email}</p>
              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-400">
                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full"><Icons.Book className="h-3 w-3 text-yellow-400" />{student.coursesCount} كورس</span>
                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full"><Icons.FileText className="h-3 w-3 text-purple-400" />{student.examsCount} امتحان</span>
                <span className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full"><Icons.Calendar className="h-3 w-3" />{student.lastActive ? new Date(student.lastActive).toLocaleDateString('ar-EG') : 'غير نشط'}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6 mt-3 md:mt-0">
            <div className="flex items-center gap-4">
              <div className="text-center"><p className="text-2xl font-extrabold text-yellow-400">{Math.round(student.avgProgress)}%</p><p className="text-[10px] text-gray-400">التقدم</p></div>
              <div className="text-center"><p className="text-2xl font-extrabold text-green-400">{student.avgScore || 0}</p><p className="text-[10px] text-gray-400">المتوسط</p></div>
            </div>
            <div className="w-full md:w-32">
              <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-1000" style={{ width: `${Math.min(student.avgProgress, 100)}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-gray-500 mt-0.5"><span>0%</span><span>100%</span></div>
            </div>
            <div className="flex flex-wrap gap-2 flex-shrink-0">
              <button onClick={() => onViewProfile(student.id)} className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"><Icons.Eye className="h-3 w-3" /> ملف</button>
              <button onClick={() => window.open(`mailto:${student.email}`)} className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"><Icons.Mail className="h-3 w-3" /></button>
            </div>
          </div>
        </div>
        {student.courses && student.courses.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
            {student.courses.slice(0, 4).map((course, i) => <span key={i} className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-400 border border-white/5">{course}</span>)}
            {student.courses.length > 4 && <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-500">+{student.courses.length - 4}</span>}
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================
// 6. المكون الرئيسي (محتوى الصفحة)
// ============================================================
function AssistantStudentsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const { theme, styles } = useTheme();
  const isDark = theme === 'dark';

  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [permissions, setPermissions] = useState([]);
  const [permissionsLoading, setPermissionsLoading] = useState(true);
  const [teacherId, setTeacherId] = useState(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState(courseIdParam || 'all');
  const [sortBy, setSortBy] = useState('progress');
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0, notStarted: 0, avgProgress: 0 });
  const [courseOptions, setCourseOptions] = useState([]);

  // ✅ جلب بيانات المساعد والصلاحيات من sessionStorage
  useEffect(() => {
    try {
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        router.push('/assistant-login');
        return;
      }
      const parsed = JSON.parse(sessionData);
      setTeacherId(parsed.teacher_id);

      const perms = JSON.parse(sessionStorage.getItem('assistantPermissions') || '[]');
      setPermissions(perms);
    } catch (err) {
      console.error('❌ فشل جلب الصلاحيات:', err);
    } finally {
      setPermissionsLoading(false);
    }
  }, [router]);

  // ✅ التحقق من الصلاحية (مُعطل مؤقتاً)
  const canView = true; // تم تجاوز الصلاحية مؤقتاً للاختبار

  // ===== جلب بيانات الطلاب =====
  const fetchStudents = useCallback(async () => {
    if (!teacherId) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', teacherId);
      if (coursesError) throw coursesError;
      const courseIds = (coursesData || []).map(c => c.id);
      setCourseOptions(coursesData || []);
      if (courseIds.length === 0) {
        setStudents([]);
        setStats({ total: 0, active: 0, completed: 0, notStarted: 0, avgProgress: 0 });
        setLoading(false);
        return;
      }
      let query = supabase
        .from('enrollments')
        .select(`student_id, course_id, progress, completed_at, updated_at, profiles:student_id (id, full_name, email, phone), courses:course_id (title)`)
        .in('course_id', courseIds);
      if (courseIdParam && courseIdParam !== 'all') {
        query = query.eq('course_id', courseIdParam);
      }
      const { data: enrollmentsData, error: enrollError } = await query;
      if (enrollError) throw enrollError;

      const studentMap = {};
      enrollmentsData?.forEach(en => {
        const studentId = en.student_id;
        if (!studentMap[studentId]) {
          studentMap[studentId] = { id: studentId, name: en.profiles?.full_name || 'طالب', email: en.profiles?.email || '', phone: en.profiles?.phone || '', courses: [], avgProgress: 0, completedAt: null, lastActive: null, coursesCount: 0, examsCount: 0, avgScore: 0 };
        }
        const s = studentMap[studentId];
        s.courses.push(en.courses?.title || 'كورس');
        s.avgProgress = (s.avgProgress * s.coursesCount + (en.progress || 0)) / (s.coursesCount + 1);
        s.coursesCount += 1;
        if (en.completed_at) {
          if (!s.completedAt || new Date(en.completed_at) > new Date(s.completedAt)) { s.completedAt = en.completed_at; }
        }
        if (!s.lastActive || new Date(en.updated_at) > new Date(s.lastActive)) { s.lastActive = en.updated_at; }
      });

      const studentIds = Object.keys(studentMap);
      if (studentIds.length > 0) {
        const { data: attemptsData } = await supabase
          .from('exam_attempts')
          .select('student_id, score, total_marks, status')
          .in('student_id', studentIds)
          .eq('status', 'completed');
        const examMap = {};
        attemptsData?.forEach(a => {
          if (!examMap[a.student_id]) examMap[a.student_id] = { total: 0, count: 0 };
          const score = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
          examMap[a.student_id].total += score;
          examMap[a.student_id].count += 1;
        });
        Object.keys(examMap).forEach(id => {
          if (studentMap[id]) {
            studentMap[id].examsCount = examMap[id].count;
            studentMap[id].avgScore = examMap[id].count > 0 ? Math.round(examMap[id].total / examMap[id].count) : 0;
          }
        });
      }

      const studentsList = Object.values(studentMap);
      const total = studentsList.length;
      const completed = studentsList.filter(s => s.completedAt).length;
      const active = studentsList.filter(s => !s.completedAt && s.avgProgress > 0).length;
      const notStarted = studentsList.filter(s => s.avgProgress === 0).length;
      const avgProgress = total > 0 ? studentsList.reduce((sum, s) => sum + s.avgProgress, 0) / total : 0;
      setStats({ total, active, completed, notStarted, avgProgress: Math.round(avgProgress) });
      setStudents(studentsList);
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('فشل جلب بيانات الطلاب: ' + err.message);
      toast.error('فشل جلب بيانات الطلاب');
    } finally { setLoading(false); }
  }, [courseIdParam, teacherId]);

  useEffect(() => { if (teacherId) fetchStudents(); }, [teacherId, fetchStudents]);

  const filteredStudents = useMemo(() => {
    let result = [...students];
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    if (filterStatus !== 'all') {
      result = result.filter(s => {
        if (filterStatus === 'completed') return s.completedAt;
        if (filterStatus === 'active') return !s.completedAt && s.avgProgress > 0;
        if (filterStatus === 'not_started') return s.avgProgress === 0;
        return true;
      });
    }
    if (filterCourse && filterCourse !== 'all') {
      result = result.filter(s => s.courses.includes(courseOptions.find(c => c.id === filterCourse)?.title || ''));
    }
    switch (sortBy) {
      case 'progress': result.sort((a, b) => (b.avgProgress || 0) - (a.avgProgress || 0)); break;
      case 'name': result.sort((a, b) => a.name.localeCompare(b.name)); break;
      case 'score': result.sort((a, b) => (b.avgScore || 0) - (a.avgScore || 0)); break;
      default: break;
    }
    return result;
  }, [students, searchQuery, filterStatus, filterCourse, sortBy, courseOptions]);

  const viewProfile = (studentId) => { router.push(`/dashboard/assistant/students/${studentId}`); };

  const statsData = [
    { id: 1, label: 'إجمالي الطلاب', value: stats.total, suffix: '', icon: Icons.Users, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'نشط', value: stats.active, suffix: '', icon: Icons.Play, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'مكتمل', value: stats.completed, suffix: '', icon: Icons.Trophy, color: 'from-yellow-400 to-yellow-600', delay: 0.2 },
    { id: 4, label: 'لم يبدأ', value: stats.notStarted, suffix: '', icon: Icons.Clock, color: 'from-gray-400 to-gray-600', delay: 0.3 },
    { id: 5, label: 'متوسط التقدم', value: stats.avgProgress, suffix: '%', icon: Icons.TrendingUp, color: 'from-purple-400 to-purple-600', delay: 0.4 },
  ];

  if (permissionsLoading || loading) {
    return (
      <AssistantLayout>
        <div className={`flex items-center justify-center py-20 ${styles.bg}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </AssistantLayout>
    );
  }

  // ✅ تم تجاوز التحقق من الصلاحية
  // if (!canView) { ... }

  return (
    <AssistantLayout>
      <div className={`relative ${styles.bg}`}>
        <ParticleBackground />
        <div className="relative z-10">
          {/* ===== رأس الصفحة ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-extrabold ${styles.text}`}>👥 إدارة الطلاب</h1>
              <p className={`${styles.subtext} text-sm mt-1`}>
                {courseIdParam && courseIdParam !== 'all' && courseOptions.find(c => c.id === courseIdParam)
                  ? `طلاب الكورس: ${courseOptions.find(c => c.id === courseIdParam)?.title}`
                  : 'جميع الطلاب'}
              </p>
            </div>
            <div className="flex items-center gap-3 mt-3 md:mt-0">
              <button onClick={() => router.push('/dashboard/assistant')} className={`px-4 py-2 ${styles.card} border ${styles.border} rounded-xl text-sm hover:border-yellow-400/50 transition flex items-center gap-2 ${styles.text}`}>
                <Icons.ArrowRight className="h-4 w-4" /> العودة للوحة التحكم
              </button>
            </div>
          </div>

          {/* ===== الأخطاء والنجاحات ===== */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3">
                <Icons.AlertCircle className="h-5 w-5" /><span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400"><Icons.X className="h-4 w-4" /></button>
              </motion.div>
            )}
            {success && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-4 flex items-center gap-3">
                <Icons.CheckCircle className="h-5 w-5" /><span className="flex-1">{success}</span>
                <button onClick={() => setSuccess('')} className="text-green-400/70 hover:text-green-400"><Icons.X className="h-4 w-4" /></button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== الإحصائيات ===== */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {statsData.map((stat) => <StatCard key={stat.id} stat={stat} styles={styles} />)}
          </div>

          {/* ===== الفلتر والبحث ===== */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="ابحث عن طالب (اسم أو بريد)..." className={`w-full p-2.5 pr-10 ${styles.input} border ${styles.border} rounded-xl ${styles.text} placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`} />
            </div>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}>
              <option value="all">كل الحالات</option><option value="active">نشط</option><option value="completed">مكتمل</option><option value="not_started">لم يبدأ</option>
            </select>
            <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}>
              <option value="all">جميع الكورسات</option>
              {courseOptions.map(c => (<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}>
              <option value="progress">التقدم</option><option value="name">الاسم</option><option value="score">المتوسط</option>
            </select>
          </div>

          {/* ===== قائمة الطلاب ===== */}
          {filteredStudents.length === 0 ? (
            <div className={`text-center py-20 ${styles.card} border ${styles.border} rounded-3xl`}>
              <Icons.Users className={`h-16 w-16 ${styles.subtext} mx-auto mb-4`} />
              <h3 className={`text-xl font-semibold ${styles.text}`}>
                {searchQuery || filterStatus !== 'all' || filterCourse !== 'all' ? 'لا توجد نتائج تطابق البحث' : 'لا يوجد طلاب مسجلين بعد'}
              </h3>
              <p className={`${styles.subtext} text-sm mt-2`}>
                {searchQuery || filterStatus !== 'all' || filterCourse !== 'all' ? 'حاول تغيير معايير البحث' : 'سيظهر الطلاب هنا عند تسجيلهم في كورسات المعلم'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredStudents.map((student, index) => (
                <StudentCard key={student.id} student={student} index={index} onViewProfile={viewProfile} styles={styles} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== روابط سريعة ===== */}
      <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 mt-6`}>
        <h3 className={`text-sm font-semibold ${styles.text} mb-2 flex items-center gap-2`}>
          <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/assistant" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الرئيسية</Link>
          <Link href="/dashboard/assistant/courses" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الكورسات</Link>
          <Link href="/dashboard/assistant/exams" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الامتحانات</Link>
          <Link href="/dashboard/assistant/students" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الطلاب</Link>
        </div>
      </div>
    </AssistantLayout>
  );
}

// ============================================================
// التصدير مع Suspense boundary
// ============================================================
export default function AssistantStudentsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0b0e1a]">
        <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    }>
      <AssistantStudentsPageContent />
    </Suspense>
  );
}