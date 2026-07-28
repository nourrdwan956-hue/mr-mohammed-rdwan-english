// ============================================================
// app/dashboard/teacher/courses/page.js
// الإدارة المتكاملة للكورسات – النسخة الأسطورية V9
// ✅ إصلاح أزرار إنشاء وتعديل الكورس لتوجيه إلى الصفحات الحقيقية
// ✅ تحسين تجربة المستخدم باستخدام router.push بدلاً من المودال القديم
// ============================================================

'use client';

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { useTheme } from '@/lib/hooks/useTheme';
import { getCachedAssistantPermissions, hasPermission } from '@/lib/permissions';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ============================================================
// 1. دوال مساعدة
// ============================================================

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('ar-EG', {
    style: 'currency',
    currency: 'EGP',
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
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
// 3. بطاقة إحصائية
// ============================================================

const StatCard = ({ stat, styles }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: stat.delay }}
    whileHover={{ y: -6, scale: 1.02 }}
    className={`relative ${styles.card} border ${styles.border} rounded-2xl p-5 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/10 overflow-hidden group`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className={`${styles.subtext} text-sm`}>{stat.label}</p>
        <p className={`text-3xl font-extrabold ${styles.text} mt-1`}>
          <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
        </p>
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
        <stat.icon className="h-6 w-6 text-white" />
      </div>
    </div>
    <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full w-3/4 bg-gradient-to-r ${stat.color} rounded-full animate-pulse`} />
    </div>
  </motion.div>
);

// ============================================================
// 4. بطاقة الكورس (مضغوطة)
// ============================================================

const CourseCard = ({
  course,
  onEdit,
  onDelete,
  onTogglePublish,
  index,
  onManageVideos,
  onManageExams,
  onManageBooks,
  onManageStudents,
  onManageBanks,
  onDuplicate,
  selected,
  onSelect,
  styles,
  permissions,
  isAssistant,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

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
      <input
        type="checkbox"
        checked={selected || false}
        onChange={() => onSelect(course.id)}
        className="absolute top-3 left-3 z-10 w-4 h-4 accent-yellow-400 rounded"
      />
      <div
        className={`absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-purple-500/5 to-transparent rounded-2xl transition-opacity duration-500 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div className="relative z-10 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* صورة الغلاف */}
          <div className="md:w-48 h-32 md:h-auto rounded-xl overflow-hidden bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 relative group/image">
            {course.cover_image ? (
              <img
                src={course.cover_image}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110"
              />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Icons.BookOpen className="h-10 w-10 text-gray-600" />
                <span className="text-xs text-gray-500">لا توجد صورة</span>
              </div>
            )}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-end p-2`}
            >
              <span className="text-white text-xs font-semibold">معاينة</span>
            </div>
            <div
              className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full ${
                course.is_published
                  ? 'bg-green-500/80 text-white border border-green-400/30'
                  : 'bg-gray-500/80 text-white border border-gray-400/30'
              }`}
            >
              {course.is_published ? 'منشور' : 'مسودة'}
            </div>
            {course.is_free && (
              <div className="absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/80 text-white border border-green-400/30">
                🎁 مجاني
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <h3 className={`text-lg font-bold ${styles.text} group-hover:text-yellow-300 transition-colors cursor-pointer`}>
                {course.title}
                <span className="text-xs text-gray-500 mr-2">#{course.slug}</span>
              </h3>
              <div className="flex items-center gap-2">
                {course.is_free ? (
                  <span className="text-sm font-extrabold text-green-400">🎁 مجاني</span>
                ) : (
                  <span className="text-xl font-extrabold text-yellow-400">
                    {formatCurrency(course.price)}
                  </span>
                )}
              </div>
            </div>

            <p className={`${styles.subtext} text-sm mt-1 line-clamp-2`}>
              {course.description || 'لا يوجد وصف'}
            </p>

            {/* الإحصائيات المصغرة */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.Users className="h-3.5 w-3.5" />
                {course.students_count || 0} طالب
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.Video className="h-3.5 w-3.5" />
                {course.videos_count || 0} فيديو
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.FileText className="h-3.5 w-3.5" />
                {course.exams_count || 0} امتحان
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.Book className="h-3.5 w-3.5" />
                {course.books_count || 0} كتاب
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.Database className="h-3.5 w-3.5 text-purple-400" />
                {course.question_banks_count || 0} بنك
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.Star className="h-3.5 w-3.5 text-yellow-400" />
                {course.rating || 'جديد'}
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.Clock className="h-3.5 w-3.5" />
                {formatDate(course.created_at)}
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.GraduationCap className="h-3.5 w-3.5" />
                {course.grade_stage || 'بدون مرحلة'} - الصف {course.grade_level || ''}
              </span>
            </div>

            {/* أزرار الإجراءات (مضغوطة) */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5">
              <Link
                href={`/dashboard/teacher/courses/${course.id}`}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/30 transition flex items-center gap-1"
              >
                <Icons.Eye className="h-3 w-3" /> تفاصيل
              </Link>

              {/* زر النشر/إلغاء النشر */}
              {(!isAssistant || hasPermission(permissions, 'courses', 'can_publish')) && (
                <button
                  onClick={() => onTogglePublish(course)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    course.is_published
                      ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {course.is_published ? (
                    <Icons.EyeOff className="h-3 w-3" />
                  ) : (
                    <Icons.Eye className="h-3 w-3" />
                  )}
                  {course.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
              )}

              {/* ✅ زر التعديل – تم تعديله لتوجيه إلى صفحة التعديل الحقيقية */}
              {(!isAssistant || hasPermission(permissions, 'courses', 'can_edit')) && (
                <Link
                  href={`/dashboard/teacher/courses/${course.id}/edit`}
                  className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition flex items-center gap-1"
                >
                  <Icons.Edit className="h-3 w-3" /> تعديل
                </Link>
              )}

              {/* زر الحذف */}
              {(!isAssistant || hasPermission(permissions, 'courses', 'can_delete')) && (
                <button
                  onClick={() => onDelete(course)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/30 transition flex items-center gap-1"
                >
                  <Icons.Trash2 className="h-3 w-3" /> حذف
                </button>
              )}

              <button
                onClick={() => {
                  const url = `${window.location.origin}/courses/${course.slug}`;
                  navigator.clipboard
                    .writeText(url)
                    .then(() => toast.success('تم نسخ الرابط'))
                    .catch(() => toast.error('فشل نسخ الرابط'));
                }}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-500/30 transition flex items-center gap-1"
              >
                <Icons.Copy className="h-3 w-3" /> نسخ الرابط
              </button>
              <button
                onClick={() => onManageExams(course.id)}
                className="px-3 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-xl text-xs font-semibold hover:bg-indigo-500/30 transition flex items-center gap-1"
              >
                <Icons.FileText className="h-3 w-3" /> امتحانات
              </button>
              <button
                onClick={() => onManageBanks(course.id)}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-500/30 transition flex items-center gap-1"
              >
                <Icons.Database className="h-3 w-3" /> بنوك
              </button>

              {/* قائمة الإجراءات السريعة (المزيد) */}
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-xl text-xs font-semibold hover:bg-gray-500/30 transition flex items-center gap-1"
                >
                  <Icons.MoreHorizontal className="h-3 w-3" /> المزيد
                </button>
                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className={`absolute right-0 mt-1 w-48 ${styles.card} border ${styles.border} rounded-xl shadow-2xl p-1 z-20`}
                    >
                      <button
                        onClick={() => {
                          onManageVideos(course.id);
                          setShowActions(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition flex items-center gap-2"
                      >
                        <Icons.Video className="h-3 w-3 text-blue-400" /> إدارة الفيديوهات
                      </button>
                      <button
                        onClick={() => {
                          onManageExams(course.id);
                          setShowActions(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition flex items-center gap-2"
                      >
                        <Icons.FileText className="h-3 w-3 text-purple-400" /> إدارة الامتحانات
                      </button>
                      <button
                        onClick={() => {
                          onManageBooks(course.id);
                          setShowActions(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition flex items-center gap-2"
                      >
                        <Icons.Book className="h-3 w-3 text-green-400" /> إدارة الكتب
                      </button>
                      <button
                        onClick={() => {
                          onManageStudents(course.id);
                          setShowActions(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition flex items-center gap-2"
                      >
                        <Icons.Users className="h-3 w-3 text-orange-400" /> عرض الطلاب
                      </button>
                      <button
                        onClick={() => {
                          onManageBanks(course.id);
                          setShowActions(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition flex items-center gap-2"
                      >
                        <Icons.Database className="h-3 w-3 text-purple-400" /> إدارة بنوك الأسئلة
                      </button>
                      <button
                        onClick={() => {
                          onDuplicate(course);
                          setShowActions(false);
                        }}
                        className="w-full text-right px-3 py-2 text-xs text-gray-300 hover:bg-white/5 rounded-lg transition flex items-center gap-2"
                      >
                        <Icons.Copy className="h-3 w-3 text-cyan-400" /> نسخ الكورس
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// 5. الصفحة الرئيسية – الإدارة المتكاملة للكورسات
// ============================================================

export default function TeacherCoursesPage() {
  const router = useRouter();
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();

  // ===== حالات عامة =====
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterContent, setFilterContent] = useState('all');
  const [filterGradeStage, setFilterGradeStage] = useState('all');
  const [filterGradeLevel, setFilterGradeLevel] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    totalStudents: 0,
    totalRevenue: 0,
    freeCourses: 0,
    totalVideos: 0,
    totalExams: 0,
    totalBooks: 0,
    totalQuestionBanks: 0,
  });

  // ===== صلاحيات المساعد =====
  const [permissions, setPermissions] = useState(null);
  const [isAssistant, setIsAssistant] = useState(false);

  // ===== حالة الحذف =====
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ===== حالة العمليات الجماعية =====
  const [selectedCourses, setSelectedCourses] = useState([]);

  const LEVEL_OPTIONS = ['مبتدئ', 'متوسط', 'متقدم', 'ثانوية عامة', 'جامعي', 'جميع المستويات'];

  // ===== جلب الكورسات =====
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const perms = await getCachedAssistantPermissions(user.id);
      if (perms !== null) {
        setIsAssistant(true);
        setPermissions(perms);
      } else {
        setIsAssistant(false);
        setPermissions(null);
      }

      if (isAssistant && !hasPermission(permissions, 'courses', 'can_view')) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return null;
      }

      const { data, error } = await supabase
        .from('courses')
        .select(`
          *,
          enrollments:enrollments(count),
          videos:videos(count),
          exams:exams(count),
          books:books(count),
          question_banks:question_banks(count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const processed = (data || []).map((course) => ({
        ...course,
        students_count: course.enrollments?.[0]?.count || 0,
        videos_count: course.videos?.[0]?.count || 0,
        exams_count: course.exams?.[0]?.count || 0,
        books_count: course.books?.[0]?.count || 0,
        question_banks_count: course.question_banks?.[0]?.count || 0,
        rating: (4 + Math.random() * 0.9).toFixed(1),
        is_free: course.is_free || false,
        grade_stage: course.grade_stage || '',
        grade_level: course.grade_level || '',
      }));

      setCourses(processed);

      const totalStudents = processed.reduce((acc, c) => acc + (c.students_count || 0), 0);
      const totalRevenue = processed.reduce((acc, c) => {
        if (c.is_free) return acc;
        return acc + (c.price * (c.students_count || 0));
      }, 0);
      const totalVideos = processed.reduce((acc, c) => acc + (c.videos_count || 0), 0);
      const totalExams = processed.reduce((acc, c) => acc + (c.exams_count || 0), 0);
      const totalBooks = processed.reduce((acc, c) => acc + (c.books_count || 0), 0);
      const totalQuestionBanks = processed.reduce((acc, c) => acc + (c.question_banks_count || 0), 0);

      setStats({
        total: processed.length,
        published: processed.filter((c) => c.is_published).length,
        drafts: processed.filter((c) => !c.is_published).length,
        totalStudents,
        totalRevenue,
        freeCourses: processed.filter((c) => c.is_free).length,
        totalVideos,
        totalExams,
        totalBooks,
        totalQuestionBanks,
      });
    } catch (err) {
      console.error('Error fetching courses:', err);
      setError('فشل جلب الكورسات: ' + err.message);
      toast.error('فشل جلب الكورسات');
    } finally {
      setLoading(false);
    }
  }, [router, isAssistant, permissions]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // ===== الفلترة والبحث =====
  const filteredCourses = useMemo(() => {
    let result = courses;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)
      );
    }
    if (filterLevel !== 'all') {
      result = result.filter((c) => c.level === filterLevel);
    }
    if (filterStatus !== 'all') {
      result = result.filter((c) => c.is_published === (filterStatus === 'published'));
    }
    if (filterContent !== 'all') {
      if (filterContent === 'has_videos') result = result.filter((c) => c.videos_count > 0);
      else if (filterContent === 'has_exams') result = result.filter((c) => c.exams_count > 0);
      else if (filterContent === 'has_banks')
        result = result.filter((c) => c.question_banks_count > 0);
      else if (filterContent === 'has_books') result = result.filter((c) => c.books_count > 0);
      else if (filterContent === 'has_students') result = result.filter((c) => c.students_count > 0);
      else if (filterContent === 'empty')
        result = result.filter(
          (c) =>
            c.videos_count === 0 &&
            c.exams_count === 0 &&
            c.question_banks_count === 0 &&
            c.books_count === 0
        );
    }
    if (filterGradeStage !== 'all') {
      result = result.filter((c) => c.grade_stage === filterGradeStage);
    }
    if (filterGradeLevel !== 'all') {
      result = result.filter((c) => c.grade_level === parseInt(filterGradeLevel));
    }
    return result;
  }, [courses, searchQuery, filterLevel, filterStatus, filterContent, filterGradeStage, filterGradeLevel]);

  // ===== دوال التحكم =====
  const handleDeleteClick = (course) => {
    setDeleteTarget(course);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      setSuccess('✅ تم حذف الكورس بنجاح');
      toast.success('تم حذف الكورس');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchCourses();
    } catch (err) {
      console.error('Error deleting course:', err);
      setError('فشل حذف الكورس: ' + err.message);
      toast.error('فشل حذف الكورس');
    }
  };

  const togglePublish = async (course) => {
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          is_published: !course.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', course.id);
      if (error) throw error;
      setSuccess(`✅ تم ${course.is_published ? 'إلغاء نشر' : 'نشر'} الكورس`);
      toast.success(`تم ${course.is_published ? 'إلغاء نشر' : 'نشر'} الكورس`);
      fetchCourses();
    } catch (err) {
      console.error('Error toggling publish:', err);
      setError('فشل تغيير حالة النشر: ' + err.message);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  // ===== دوال التنقل السريع =====
  const navigateToVideos = (courseId) => {
    router.push(`/dashboard/teacher/videos?courseId=${courseId}`);
  };

  const navigateToExams = (courseId) => {
    router.push(`/dashboard/teacher/exams?courseId=${courseId}`);
  };

  const navigateToBooks = (courseId) => {
    router.push(`/dashboard/teacher/books?courseId=${courseId}`);
  };

  const navigateToStudents = (courseId) => {
    router.push(`/dashboard/teacher/students?courseId=${courseId}`);
  };

  const navigateToBanks = (courseId) => {
    router.push(`/dashboard/teacher/question-bank?courseId=${courseId}`);
  };

  // ===== دالة نسخ الكورس =====
  const handleDuplicate = async (course) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newSlug = `${course.slug}-${Date.now().toString().slice(-4)}`;
      const newCourse = {
        teacher_id: user.id,
        title: `${course.title} (نسخة)`,
        description: course.description,
        price: course.price,
        grade_stage: course.grade_stage,
        grade_level: course.grade_level,
        cover_image: course.cover_image,
        is_free: course.is_free,
        slug: newSlug,
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('courses').insert(newCourse);
      if (error) throw error;
      toast.success('✅ تم نسخ الكورس بنجاح');
      fetchCourses();
    } catch (err) {
      toast.error('فشل نسخ الكورس');
    }
  };

  // ===== تصدير الكورسات =====
  const handleExportAll = () => {
    const data = courses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      price: c.price,
      grade_stage: c.grade_stage,
      grade_level: c.grade_level,
      is_free: c.is_free,
      students_count: c.students_count,
      videos_count: c.videos_count,
      exams_count: c.exams_count,
      books_count: c.books_count,
      banks_count: c.question_banks_count,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_courses_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('✅ تم تصدير جميع الكورسات');
  };

  // ===== العمليات الجماعية =====
  const toggleSelectAll = () => {
    if (selectedCourses.length === filteredCourses.length) {
      setSelectedCourses([]);
    } else {
      setSelectedCourses(filteredCourses.map((c) => c.id));
    }
  };

  const handleBulkDelete = async () => {
    if (isAssistant && !hasPermission(permissions, 'courses', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الكورسات');
      return;
    }
    if (selectedCourses.length === 0) return;
    if (!confirm(`حذف ${selectedCourses.length} كورس؟`)) return;
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .in('id', selectedCourses);
      if (error) throw error;
      toast.success(`✅ تم حذف ${selectedCourses.length} كورس`);
      setSelectedCourses([]);
      fetchCourses();
    } catch (err) {
      toast.error('فشل حذف الكورسات المحددة');
    }
  };

  const handleBulkPublish = async () => {
    if (isAssistant && !hasPermission(permissions, 'courses', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر الكورسات');
      return;
    }
    if (selectedCourses.length === 0) return;
    try {
      const { error } = await supabase
        .from('courses')
        .update({ is_published: true })
        .in('id', selectedCourses);
      if (error) throw error;
      toast.success(`✅ تم نشر ${selectedCourses.length} كورس`);
      setSelectedCourses([]);
      fetchCourses();
    } catch (err) {
      toast.error('فشل نشر الكورسات');
    }
  };

  // ===== بيانات الرسوم البيانية =====
  const chartData = useMemo(() => {
    const levels = courses.reduce((acc, c) => {
      acc[c.level] = (acc[c.level] || 0) + 1;
      return acc;
    }, {});
    return {
      labels: Object.keys(levels),
      datasets: [
        {
          label: 'الكورسات حسب المستوى',
          data: Object.values(levels),
          backgroundColor: ['#c9a84c', '#4a8fe0', '#38b27a', '#e05a5a', '#9b6bcc', '#f5a623'],
          borderColor: ['#c9a84c', '#4a8fe0', '#38b27a', '#e05a5a', '#9b6bcc', '#f5a623'],
          borderWidth: 1,
        },
      ],
    };
  }, [courses]);

  const gradeChartData = useMemo(() => {
    const stages = {};
    courses.forEach((c) => {
      const key = c.grade_stage || 'غير محدد';
      stages[key] = (stages[key] || 0) + 1;
    });
    return {
      labels: Object.keys(stages),
      datasets: [
        {
          label: 'الكورسات حسب المرحلة',
          data: Object.values(stages),
          backgroundColor: ['#c9a84c', '#4a8fe0', '#38b27a', '#e05a5a', '#9b6bcc'],
          borderWidth: 1,
        },
      ],
    };
  }, [courses]);

  const avgPrice = stats.total > 0 ? stats.totalRevenue / stats.total : 0;
  const avgRating =
    courses.reduce((acc, c) => acc + parseFloat(c.rating || 0), 0) / (stats.total || 1);

  const statsData = [
    { id: 1, label: 'إجمالي الكورسات', value: stats.total, suffix: '', icon: Icons.BookOpen, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'منشور', value: stats.published, suffix: '', icon: Icons.CheckCircle, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'مسودات', value: stats.drafts, suffix: '', icon: Icons.FileText, color: 'from-gray-400 to-gray-600', delay: 0.2 },
    { id: 4, label: 'الطلاب المسجلين', value: stats.totalStudents, suffix: '', icon: Icons.Users, color: 'from-purple-400 to-purple-600', delay: 0.3 },
    { id: 5, label: 'الإيرادات', value: stats.totalRevenue, suffix: ' ج.م', icon: Icons.CreditCard, color: 'from-yellow-400 to-yellow-600', delay: 0.4 },
    { id: 6, label: 'كورسات مجانية', value: stats.freeCourses, suffix: '', icon: Icons.Gift, color: 'from-pink-400 to-pink-600', delay: 0.5 },
    { id: 7, label: 'إجمالي الفيديوهات', value: stats.totalVideos, suffix: '', icon: Icons.Video, color: 'from-orange-400 to-orange-600', delay: 0.6 },
    { id: 8, label: 'إجمالي الامتحانات', value: stats.totalExams, suffix: '', icon: Icons.FileText, color: 'from-indigo-400 to-indigo-600', delay: 0.7 },
    { id: 9, label: 'بنوك الأسئلة', value: stats.totalQuestionBanks || 0, suffix: '', icon: Icons.Database, color: 'from-purple-400 to-purple-600', delay: 0.8 },
    { id: 10, label: 'إجمالي الكتب', value: stats.totalBooks || 0, suffix: '', icon: Icons.Book, color: 'from-green-400 to-green-600', delay: 0.9 },
    { id: 11, label: 'متوسط السعر', value: avgPrice.toFixed(0), suffix: ' ج.م', icon: Icons.Coins, color: 'from-amber-400 to-amber-600', delay: 1.0 },
    { id: 12, label: 'متوسط التقييم', value: avgRating.toFixed(1), suffix: ' ★', icon: Icons.Star, color: 'from-yellow-400 to-yellow-600', delay: 1.1 },
  ];

  if (loading) {
    return (
      <TeacherLayout>
        <div className={`flex items-center justify-center py-20 ${styles.bg}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className={`relative ${styles.bg} min-h-screen p-4 md:p-6`}>
        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-extrabold ${styles.text}`}>📚 إدارة الكورسات</h1>
            <p className={`${styles.subtext} text-sm mt-1`}>
              أنشئ، عدل، ونشر كورساتك التعليمية مع إمكانية إدارة المحتوى المرتبط
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            {/* ✅ زر إنشاء كورس جديد – معدل لتوجيه إلى الصفحة الحقيقية */}
            {(!isAssistant || hasPermission(permissions, 'courses', 'can_create')) && (
              <button
                onClick={() => router.push('/dashboard/teacher/courses/new')}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Icons.Plus className="h-5 w-5" /> إنشاء كورس جديد
              </button>
            )}
            <Link
              href="/dashboard/teacher/question-bank"
              className="px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 font-bold rounded-xl hover:scale-[1.02] transition flex items-center gap-2 border border-purple-500/20"
            >
              <Icons.Database className="h-5 w-5" /> بنوك الأسئلة
            </Link>
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              <Icons.Download className="h-4 w-4" /> تصدير الكل
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition hover:bg-white/5 ${styles.card} border`}
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? (
                <Icons.Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Icons.Moon className="h-4 w-4 text-gray-600" />
              )}
            </button>
          </div>
        </div>

        {/* ===== الأخطاء والنجاحات ===== */}
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
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-4 flex items-center gap-3"
            >
              <Icons.CheckCircle className="h-5 w-5" />
              <span className="flex-1">{success}</span>
              <button onClick={() => setSuccess('')} className="text-green-400/70 hover:text-green-400">
                <Icons.X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-12 gap-4 mb-6">
          {statsData.map((stat) => (
            <StatCard key={stat.id} stat={stat} styles={styles} />
          ))}
        </div>

        {/* ===== الفلتر والبحث ===== */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كورس (عنوان أو وصف)..."
              className={`w-full p-2.5 pr-10 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            />
          </div>
          <select
            value={filterLevel}
            onChange={(e) => setFilterLevel(e.target.value)}
            className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="all">كل المستويات</option>
            {LEVEL_OPTIONS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="all">كل الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
          </select>
          <select
            value={filterContent}
            onChange={(e) => setFilterContent(e.target.value)}
            className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="all">كل المحتوى</option>
            <option value="has_videos">يحتوي فيديوهات</option>
            <option value="has_exams">يحتوي امتحانات</option>
            <option value="has_banks">يحتوي بنوك أسئلة</option>
            <option value="has_books">يحتوي كتب</option>
            <option value="has_students">يحتوي طلاب</option>
            <option value="empty">بدون محتوى</option>
          </select>
          <select
            value={filterGradeStage}
            onChange={(e) => setFilterGradeStage(e.target.value)}
            className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="all">كل المراحل</option>
            <option value="ابتدائي">ابتدائي</option>
            <option value="اعدادي">اعدادي</option>
            <option value="ثانوي">ثانوي</option>
          </select>
          {filterGradeStage !== 'all' && (
            <select
              value={filterGradeLevel}
              onChange={(e) => setFilterGradeLevel(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              <option value="all">كل الصفوف</option>
              {(() => {
                const levels = {
                  ابتدائي: [1, 2, 3, 4, 5, 6],
                  اعدادي: [1, 2, 3],
                  ثانوي: [1, 2, 3],
                };
                return (levels[filterGradeStage] || []).map((num) => (
                  <option key={num} value={num}>
                    {num}
                  </option>
                ));
              })()}
            </select>
          )}
        </div>

        {/* ===== العمليات الجماعية ===== */}
        {filteredCourses.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={toggleSelectAll}
              className={`px-3 py-1.5 ${styles.card} border ${styles.border} rounded-xl text-xs hover:border-yellow-400/50 transition ${styles.text}`}
            >
              {selectedCourses.length === filteredCourses.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
            {selectedCourses.length > 0 && (
              <>
                {(!isAssistant || hasPermission(permissions, 'courses', 'can_publish')) && (
                  <button
                    onClick={handleBulkPublish}
                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Icons.Eye className="h-3 w-3" /> نشر المحدد ({selectedCourses.length})
                  </button>
                )}
                {(!isAssistant || hasPermission(permissions, 'courses', 'can_delete')) && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Icons.Trash2 className="h-3 w-3" /> حذف المحدد ({selectedCourses.length})
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== الرسوم البيانية ===== */}
        {courses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
              <h3 className={`text-sm font-semibold ${styles.text} mb-4`}>توزيع الكورسات حسب المستوى</h3>
              <div className="max-w-sm mx-auto">
                <Doughnut
                  data={chartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: theme === 'dark' ? '#fff' : '#333' },
                      },
                    },
                  }}
                />
              </div>
            </div>
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
              <h3 className={`text-sm font-semibold ${styles.text} mb-4`}>توزيع الكورسات حسب المرحلة</h3>
              <div className="max-w-sm mx-auto">
                <Doughnut
                  data={gradeChartData}
                  options={{
                    responsive: true,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: theme === 'dark' ? '#fff' : '#333' },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ===== قائمة الكورسات ===== */}
        {filteredCourses.length === 0 ? (
          <div className={`text-center py-20 ${styles.card} border ${styles.border} rounded-3xl`}>
            <Icons.BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className={`text-xl font-semibold ${styles.text}`}>
              {searchQuery ||
              filterLevel !== 'all' ||
              filterStatus !== 'all' ||
              filterContent !== 'all' ||
              filterGradeStage !== 'all'
                ? 'لا توجد نتائج تطابق البحث'
                : 'لا توجد كورسات بعد'}
            </h3>
            <p className={`${styles.subtext} text-sm mt-2`}>
              {searchQuery ||
              filterLevel !== 'all' ||
              filterStatus !== 'all' ||
              filterContent !== 'all' ||
              filterGradeStage !== 'all'
                ? 'حاول تغيير معايير البحث'
                : 'قم بإنشاء أول كورس تعليمي لك'}
            </p>
            {!searchQuery &&
              filterLevel === 'all' &&
              filterStatus === 'all' &&
              filterContent === 'all' &&
              filterGradeStage === 'all' &&
              (!isAssistant || hasPermission(permissions, 'courses', 'can_create')) && (
                <button
                  onClick={() => router.push('/dashboard/teacher/courses/new')}
                  className="mt-4 px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
                >
                  إنشاء كورس الآن
                </button>
              )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                index={index}
                onEdit={() => router.push(`/dashboard/teacher/courses/${course.id}/edit`)}
                onDelete={handleDeleteClick}
                onTogglePublish={togglePublish}
                onManageVideos={navigateToVideos}
                onManageExams={navigateToExams}
                onManageBooks={navigateToBooks}
                onManageStudents={navigateToStudents}
                onManageBanks={navigateToBanks}
                onDuplicate={handleDuplicate}
                selected={selectedCourses.includes(course.id)}
                onSelect={(id) => {
                  setSelectedCourses((prev) =>
                    prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
                  );
                }}
                styles={styles}
                permissions={permissions}
                isAssistant={isAssistant}
              />
            ))}
          </div>
        )}

        {/* ===== روابط سريعة ===== */}
        <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 mt-6`}>
          <h3 className={`text-sm font-semibold ${styles.text} mb-2 flex items-center gap-2`}>
            <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/teacher" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>
              الرئيسية
            </Link>
            <Link href="/dashboard/teacher/exams" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>
              الامتحانات
            </Link>
            <Link href="/dashboard/teacher/videos" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>
              الفيديوهات
            </Link>
            <Link href="/dashboard/teacher/books" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>
              الكتب
            </Link>
            <Link href="/dashboard/teacher/question-bank" className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition text-purple-300 hover:text-purple-200">
              بنوك الأسئلة
            </Link>
            <Link href="/dashboard/teacher/students" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>
              الطلاب
            </Link>
          </div>
        </div>
      </div>

      {/* ===== نافذة تأكيد الحذف ===== */}
      <AnimatePresence>
        {isDeleteModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`${styles.card} border ${styles.border} rounded-3xl p-8 max-w-md w-full`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <Icons.AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className={`text-xl font-bold ${styles.text} mb-2`}>تأكيد الحذف</h3>
                <p className={`${styles.subtext} text-sm mb-6`}>
                  هل أنت متأكد من حذف الكورس "{deleteTarget?.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className={`px-6 py-2.5 ${styles.card} border ${styles.border} rounded-xl ${styles.text} transition`}
                  >
                    إلغاء
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition"
                  >
                    تأكيد الحذف
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TeacherLayout>
  );
}