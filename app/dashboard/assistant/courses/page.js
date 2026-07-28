// ================================================================
// 📁 app/dashboard/assistant/courses/page.js
// 🎯 إدارة الكورسات للمساعد – النسخة المتطورة V1
// ================================================================
// - مستوحاة من نسخة المعلم مع تحسينات خاصة بالمساعد
// - دعم كامل للصلاحيات (can_view, can_create, can_edit, can_delete, can_publish)
// - دعم الثيم الفاتح/الداكن عبر useTheme
// - استخدام API الشامل لجلب البيانات
// ================================================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BookOpen,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  MoreHorizontal,
  Users,
  Video,
  FileText,
  Book,
  Database,
  Star,
  Clock,
  GraduationCap,
  Gift,
  CheckCircle,
  X,
  AlertCircle,
  AlertTriangle,
  Download,
  Archive,
  RefreshCw,
  Link as LinkIcon,
  CreditCard,
  Coins,
  Sun,
  Moon,
  ChevronDown,
  Filter,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/app/theme/ThemeProvider';
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

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ================================================================
// 🔧 دوال مساعدة
// ================================================================

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

const generateSlug = (text) => {
  return text
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

const hasPermission = (permissions, module, permission) => {
  if (!permissions || permissions.length === 0) return false;
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true;
  return perm[permission] === true;
};

// ================================================================
// 🧮 عداد متحرك
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
    <span ref={ref} className="font-extrabold tracking-tight">
      {count}{suffix}
    </span>
  );
};

// ================================================================
// 📊 بطاقة إحصائية
// ================================================================

const StatCard = ({ stat, isDark }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: stat.delay || 0 }}
    whileHover={{ y: -6, scale: 1.02 }}
    className={`relative rounded-2xl p-5 transition-all duration-300 overflow-hidden group ${
      isDark
        ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
        : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
    }`}
  >
    <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
    <div className="relative z-10 flex items-start justify-between">
      <div>
        <p className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
          {stat.label}
        </p>
        <p className={`text-2xl md:text-3xl font-extrabold mt-1 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
          <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
        </p>
      </div>
      <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
        <stat.icon className="h-5 w-5 text-white" />
      </div>
    </div>
    <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
      <div className={`h-full w-3/4 bg-gradient-to-r ${stat.color} rounded-full animate-pulse`} />
    </div>
  </motion.div>
);

// ================================================================
// 📇 بطاقة الكورس (للمساعد)
// ================================================================

const CourseCard = ({
  course,
  index,
  onEdit,
  onDelete,
  onTogglePublish,
  onManageVideos,
  onManageExams,
  onManageBooks,
  onManageStudents,
  onManageBanks,
  onDuplicate,
  selected,
  onSelect,
  isDark,
  permissions,
}) => {
  const [showActions, setShowActions] = useState(false);
  const canEdit = hasPermission(permissions, 'courses', 'can_edit');
  const canDelete = hasPermission(permissions, 'courses', 'can_delete');
  const canPublish = hasPermission(permissions, 'courses', 'can_publish');
  const canView = hasPermission(permissions, 'courses', 'can_view');

  // إذا لم تكن لديه صلاحية عرض، لا نعرض البطاقة
  if (!canView) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-500 ${
        isDark
          ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
          : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
      } hover:shadow-2xl hover:shadow-yellow-400/10`}
    >
      <input
        type="checkbox"
        checked={selected || false}
        onChange={() => onSelect(course.id)}
        className="absolute top-3 right-3 z-10 w-4 h-4 accent-yellow-400 rounded cursor-pointer"
      />

      <div className="p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* صورة الغلاف */}
          <div className="md:w-40 h-28 md:h-auto rounded-xl overflow-hidden bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 relative group/image">
            {course.cover_image ? (
              <img
                src={course.cover_image}
                alt={course.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110"
              />
            ) : (
              <BookOpen className="h-8 w-8 text-gray-500" />
            )}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-end p-2`}>
              <span className="text-white text-xs font-semibold">معاينة</span>
            </div>
            <div
              className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded-full ${
                course.is_published
                  ? 'bg-green-500/80 text-white border border-green-400/30'
                  : 'bg-gray-500/80 text-white border border-gray-400/30'
              }`}
            >
              {course.is_published ? '✓ منشور' : 'مسودة'}
            </div>
            {course.is_free && (
              <div className="absolute bottom-2 left-2 text-[10px] px-2 py-0.5 rounded-full bg-green-500/80 text-white border border-green-400/30">
                🎁 مجاني
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <h3 className={`text-lg font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'} group-hover:text-yellow-400 transition-colors cursor-pointer`}>
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

            <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
              {course.description || 'لا يوجد وصف'}
            </p>

            {/* الإحصائيات المصغرة */}
            <div className="flex flex-wrap items-center gap-2 mt-3 text-xs text-gray-400">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <Users className="h-3 w-3" /> {course.students_count || 0}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <Video className="h-3 w-3" /> {course.videos_count || 0}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <FileText className="h-3 w-3" /> {course.exams_count || 0}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <Book className="h-3 w-3" /> {course.books_count || 0}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <Database className="h-3 w-3" /> {course.question_banks_count || 0}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <GraduationCap className="h-3 w-3" /> {course.grade_stage || 'بدون'} - {course.grade_level || ''}
              </span>
            </div>

            {/* أزرار الإجراءات */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
              <Link
                href={`/dashboard/assistant/courses/${course.id}`}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/30 transition flex items-center gap-1"
              >
                <Eye className="h-3 w-3" /> تفاصيل
              </Link>

              {canPublish && (
                <button
                  onClick={() => onTogglePublish(course)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    course.is_published
                      ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {course.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {course.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
              )}

              {canEdit && (
                <button
                  onClick={() => onEdit(course)}
                  className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition flex items-center gap-1"
                >
                  <Edit className="h-3 w-3" /> تعديل
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => onDelete(course)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/30 transition flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> حذف
                </button>
              )}

              <button
                onClick={() => {
                  const url = `${window.location.origin}/courses/${course.slug}`;
                  navigator.clipboard.writeText(url).then(() => toast.success('تم نسخ الرابط'));
                }}
                className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-500/30 transition flex items-center gap-1"
              >
                <Copy className="h-3 w-3" /> نسخ الرابط
              </button>

              {/* قائمة المزيد */}
              <div className="relative">
                <button
                  onClick={() => setShowActions(!showActions)}
                  className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-xl text-xs font-semibold hover:bg-gray-500/30 transition flex items-center gap-1"
                >
                  <MoreHorizontal className="h-3 w-3" /> المزيد
                </button>
                <AnimatePresence>
                  {showActions && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -10 }}
                      className={`absolute left-0 bottom-full mb-1 w-48 rounded-xl shadow-2xl p-1 z-20 ${
                        isDark
                          ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                          : 'bg-white border border-gray-200 shadow-lg'
                      }`}
                    >
                      <button
                        onClick={() => { onManageVideos(course.id); setShowActions(false); }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-[var(--text-primary)]"
                      >
                        <Video className="h-3 w-3 text-blue-400" /> إدارة الفيديوهات
                      </button>
                      <button
                        onClick={() => { onManageExams(course.id); setShowActions(false); }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-[var(--text-primary)]"
                      >
                        <FileText className="h-3 w-3 text-purple-400" /> إدارة الامتحانات
                      </button>
                      <button
                        onClick={() => { onManageBooks(course.id); setShowActions(false); }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-[var(--text-primary)]"
                      >
                        <Book className="h-3 w-3 text-green-400" /> إدارة الكتب
                      </button>
                      <button
                        onClick={() => { onManageStudents(course.id); setShowActions(false); }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-[var(--text-primary)]"
                      >
                        <Users className="h-3 w-3 text-orange-400" /> عرض الطلاب
                      </button>
                      <button
                        onClick={() => { onManageBanks(course.id); setShowActions(false); }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-[var(--text-primary)]"
                      >
                        <Database className="h-3 w-3 text-purple-400" /> إدارة بنوك الأسئلة
                      </button>
                      <button
                        onClick={() => { onDuplicate(course); setShowActions(false); }}
                        className="w-full text-right px-3 py-2 text-xs hover:bg-white/5 rounded-lg transition flex items-center gap-2 text-[var(--text-primary)]"
                      >
                        <Copy className="h-3 w-3 text-cyan-400" /> نسخ الكورس
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

// ================================================================
// 📄 الصفحة الرئيسية – إدارة الكورسات للمساعد
// ================================================================

export default function AssistantCoursesPage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  // ===== حالات عامة =====
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterGradeStage, setFilterGradeStage] = useState('all');
  const [filterGradeLevel, setFilterGradeLevel] = useState('all');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);

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

  // ===== حالات النموذج =====
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    grade_stage: '',
    grade_level: '',
    cover_image: '',
    is_free: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // ===== حالة الحذف =====
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ===== حالة العمليات الجماعية =====
  const [selectedCourses, setSelectedCourses] = useState([]);
  const fetched = useRef(false);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // جلب بيانات المساعد من sessionStorage
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        toast.error('الرجاء تسجيل الدخول أولاً');
        router.replace('/assistant-login');
        return;
      }

      const parsed = JSON.parse(sessionData);
      setAssistant(parsed);

      // جلب الصلاحيات من API
      const permsRes = await fetch('/api/assistant-data', {
        headers: { 'x-assistant-id': parsed.id },
      });
      const permsData = await permsRes.json();
      if (permsRes.ok && permsData.success) {
        setPermissions(permsData.permissions || []);
      }

      // التحقق من صلاحية العرض
      if (!hasPermission(permsData.permissions || [], 'courses', 'can_view')) {
        toast.error('ليس لديك صلاحية لعرض الكورسات');
        router.replace('/dashboard/assistant');
        return;
      }

      // جلب الكورسات من API
      const res = await fetch(`/api/assistant/courses?teacher_id=${parsed.teacher_id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل جلب الكورسات');
      }

      const processed = (data.courses || []).map((course) => ({
        ...course,
        students_count: course.students_count || 0,
        videos_count: course.videos_count || 0,
        exams_count: course.exams_count || 0,
        books_count: course.books_count || 0,
        question_banks_count: course.question_banks_count || 0,
        rating: (4 + Math.random() * 0.9).toFixed(1),
        is_free: course.is_free || false,
        grade_stage: course.grade_stage || '',
        grade_level: course.grade_level || '',
      }));

      setCourses(processed);

      // حساب الإحصائيات
      const totalStudents = processed.reduce((acc, c) => acc + (c.students_count || 0), 0);
      const totalRevenue = processed.reduce((acc, c) => {
        if (c.is_free) return acc;
        return acc + ((c.price || 0) * (c.students_count || 0));
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
  }, [router]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchData();
  }, [fetchData]);

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

    if (filterStatus !== 'all') {
      result = result.filter((c) => c.is_published === (filterStatus === 'published'));
    }

    if (filterGradeStage !== 'all') {
      result = result.filter((c) => c.grade_stage === filterGradeStage);
    }

    if (filterGradeLevel !== 'all') {
      result = result.filter((c) => c.grade_level === parseInt(filterGradeLevel));
    }

    return result;
  }, [courses, searchQuery, filterStatus, filterGradeStage, filterGradeLevel]);

  // ===== دوال النموذج =====
  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) setFormErrors({ ...formErrors, [name]: '' });
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'عنوان الكورس مطلوب';
    if (!formData.description.trim()) errors.description = 'الوصف مطلوب';
    if (!formData.is_free && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.price = 'السعر مطلوب (أو اختر مجاني)';
    }
    if (!formData.grade_stage.trim()) errors.grade_stage = 'المرحلة الدراسية مطلوبة';
    if (!formData.grade_level.trim()) errors.grade_level = 'الصف الدراسي مطلوب';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      price: '',
      grade_stage: '',
      grade_level: '',
      cover_image: '',
      is_free: false,
    });
    setEditingCourse(null);
    setIsFormOpen(false);
    setFormErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        toast.error('الرجاء تسجيل الدخول أولاً');
        return;
      }
      const parsed = JSON.parse(sessionData);

      let slug = generateSlug(formData.title.trim());

      const courseData = {
        teacher_id: parsed.teacher_id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.is_free ? 0 : parseFloat(formData.price),
        grade_stage: formData.grade_stage.trim(),
        grade_level: parseInt(formData.grade_level),
        cover_image: formData.cover_image || null,
        is_free: formData.is_free,
        slug: slug,
        is_published: editingCourse?.is_published || false,
        updated_at: new Date().toISOString(),
      };

      const url = editingCourse
        ? `/api/assistant/courses/${editingCourse.id}`
        : '/api/assistant/courses';
      const method = editingCourse ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(courseData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حفظ الكورس');

      setSuccess(editingCourse ? '✅ تم تحديث الكورس بنجاح' : '✅ تم إنشاء الكورس بنجاح');
      toast.success(editingCourse ? 'تم تحديث الكورس' : 'تم إنشاء الكورس');
      resetForm();
      fetchData();
    } catch (err) {
      console.error('Error saving course:', err);
      setError('فشل حفظ الكورس: ' + err.message);
      toast.error('فشل حفظ الكورس');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== دوال التحكم =====
  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      title: course.title,
      description: course.description || '',
      price: course.price?.toString() || '',
      grade_stage: course.grade_stage || '',
      grade_level: course.grade_level?.toString() || '',
      cover_image: course.cover_image || '',
      is_free: course.is_free || false,
    });
    setIsFormOpen(true);
    setError('');
    setSuccess('');
  };

  const handleDeleteClick = (course) => {
    setDeleteTarget(course);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/assistant/courses/${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الكورس');

      setSuccess('✅ تم حذف الكورس بنجاح');
      toast.success('تم حذف الكورس');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting course:', err);
      setError('فشل حذف الكورس: ' + err.message);
      toast.error('فشل حذف الكورس');
    }
  };

  const togglePublish = async (course) => {
    try {
      const res = await fetch(`/api/assistant/courses/${course.id}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !course.is_published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة النشر');

      setSuccess(`✅ تم ${course.is_published ? 'إلغاء نشر' : 'نشر'} الكورس`);
      toast.success(`تم ${course.is_published ? 'إلغاء نشر' : 'نشر'} الكورس`);
      fetchData();
    } catch (err) {
      console.error('Error toggling publish:', err);
      setError('فشل تغيير حالة النشر: ' + err.message);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  // ===== دوال التنقل =====
  const navigateToVideos = (courseId) => {
    router.push(`/dashboard/assistant/videos?courseId=${courseId}`);
  };

  const navigateToExams = (courseId) => {
    router.push(`/dashboard/assistant/exams?courseId=${courseId}`);
  };

  const navigateToBooks = (courseId) => {
    router.push(`/dashboard/assistant/books?courseId=${courseId}`);
  };

  const navigateToStudents = (courseId) => {
    router.push(`/dashboard/assistant/students-affairs?courseId=${courseId}`);
  };

  const navigateToBanks = (courseId) => {
    router.push(`/dashboard/assistant/question-bank?courseId=${courseId}`);
  };

  // ===== دالة نسخ الكورس =====
  const handleDuplicate = async (course) => {
    try {
      const res = await fetch(`/api/assistant/courses/${course.id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل نسخ الكورس');

      toast.success('✅ تم نسخ الكورس بنجاح');
      fetchData();
    } catch (err) {
      toast.error('فشل نسخ الكورس: ' + err.message);
    }
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
    if (!hasPermission(permissions, 'courses', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الكورسات');
      return;
    }
    if (selectedCourses.length === 0) return;
    if (!confirm(`حذف ${selectedCourses.length} كورس؟`)) return;

    try {
      const res = await fetch('/api/assistant/courses/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedCourses }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الكورسات');

      toast.success(`✅ تم حذف ${selectedCourses.length} كورس`);
      setSelectedCourses([]);
      fetchData();
    } catch (err) {
      toast.error('فشل حذف الكورسات المحددة');
    }
  };

  const handleBulkPublish = async () => {
    if (!hasPermission(permissions, 'courses', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر الكورسات');
      return;
    }
    if (selectedCourses.length === 0) return;

    try {
      const res = await fetch('/api/assistant/courses/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: selectedCourses, action: 'publish' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل نشر الكورسات');

      toast.success(`✅ تم نشر ${selectedCourses.length} كورس`);
      setSelectedCourses([]);
      fetchData();
    } catch (err) {
      toast.error('فشل نشر الكورسات');
    }
  };

  // ===== بيانات الرسوم البيانية =====
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

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي الكورسات', value: stats.total, icon: BookOpen, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'منشور', value: stats.published, icon: CheckCircle, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'مسودات', value: stats.drafts, icon: FileText, color: 'from-gray-400 to-gray-600', delay: 0.2 },
    { id: 4, label: 'الطلاب المسجلين', value: stats.totalStudents, icon: Users, color: 'from-purple-400 to-purple-600', delay: 0.3 },
    // ❌ تم حذف سطر الإيرادات
    { id: 6, label: 'كورسات مجانية', value: stats.freeCourses, icon: Gift, color: 'from-pink-400 to-pink-600', delay: 0.5 },
    { id: 7, label: 'الفيديوهات', value: stats.totalVideos, icon: Video, color: 'from-orange-400 to-orange-600', delay: 0.6 },
    { id: 8, label: 'الامتحانات', value: stats.totalExams, icon: FileText, color: 'from-indigo-400 to-indigo-600', delay: 0.7 },
    { id: 9, label: 'بنوك الأسئلة', value: stats.totalQuestionBanks || 0, icon: Database, color: 'from-purple-400 to-purple-600', delay: 0.8 },
    { id: 10, label: 'الكتب', value: stats.totalBooks || 0, icon: Book, color: 'from-green-400 to-green-600', delay: 0.9 },
  ];

  const canCreate = hasPermission(permissions, 'courses', 'can_create');

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>جاري تحميل الكورسات...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">📚 إدارة الكورسات</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
              عرض وإدارة كورسات المعلم {assistant?.full_name ? `- ${assistant.full_name}` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            {canCreate && (
              <button
                onClick={() => {
                  setEditingCourse(null);
                  setFormData({
                    title: '',
                    description: '',
                    price: '',
                    grade_stage: '',
                    grade_level: '',
                    cover_image: '',
                    is_free: false,
                  });
                  setIsFormOpen(true);
                  setError('');
                  setSuccess('');
                }}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" /> إنشاء كورس جديد
              </button>
            )}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
              }`}
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
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
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                <X className="h-4 w-4" />
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
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{success}</span>
              <button onClick={() => setSuccess('')} className="text-green-400/70 hover:text-green-400">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-4 mb-6">
          {statsData.map((stat) => (
            <StatCard key={stat.id} stat={stat} isDark={isDark} />
          ))}
        </div>

        {/* ===== الفلتر والبحث ===== */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن كورس (عنوان أو وصف)..."
              className={`w-full p-2.5 pr-10 rounded-xl border outline-none transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${
              isDark
                ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
            }`}
          >
            <option value="all">كل الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
          </select>
          <select
            value={filterGradeStage}
            onChange={(e) => setFilterGradeStage(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${
              isDark
                ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
            }`}
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
              className={`p-2.5 rounded-xl border outline-none transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            >
              <option value="all">كل الصفوف</option>
              {(() => {
                const levels = {
                  ابتدائي: [1, 2, 3, 4, 5, 6],
                  اعدادي: [1, 2, 3],
                  ثانوي: [1, 2, 3],
                };
                return (levels[filterGradeStage] || []).map((num) => (
                  <option key={num} value={num}>{num}</option>
                ));
              })()}
            </select>
          )}
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('all');
              setFilterGradeStage('all');
              setFilterGradeLevel('all');
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              isDark
                ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
            }`}
          >
            <Filter className="h-4 w-4 inline ml-1" /> إعادة ضبط
          </button>
        </div>

        {/* ===== العمليات الجماعية ===== */}
        {filteredCourses.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={toggleSelectAll}
              className={`px-3 py-1.5 rounded-xl text-xs transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
              }`}
            >
              {selectedCourses.length === filteredCourses.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
            {selectedCourses.length > 0 && (
              <>
                {hasPermission(permissions, 'courses', 'can_publish') && (
                  <button
                    onClick={handleBulkPublish}
                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" /> نشر ({selectedCourses.length})
                  </button>
                )}
                {hasPermission(permissions, 'courses', 'can_delete') && (
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> حذف ({selectedCourses.length})
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== الرسم البياني ===== */}
        {courses.length > 0 && (
          <div className={`rounded-2xl p-5 mb-6 ${
            isDark
              ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            <h3 className={`text-sm font-semibold mb-4 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              توزيع الكورسات حسب المرحلة
            </h3>
            <div className="max-w-sm mx-auto">
              <Doughnut
                data={gradeChartData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: isDark ? '#e5e7eb' : '#1f2937' },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* ===== قائمة الكورسات ===== */}
        {filteredCourses.length === 0 ? (
          <div className={`text-center py-20 rounded-3xl ${
            isDark
              ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            <BookOpen className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              {searchQuery || filterStatus !== 'all' || filterGradeStage !== 'all'
                ? 'لا توجد نتائج تطابق البحث'
                : 'لا توجد كورسات بعد'}
            </h3>
            <p className={`text-sm mt-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
              {searchQuery || filterStatus !== 'all' || filterGradeStage !== 'all'
                ? 'حاول تغيير معايير البحث'
                : 'سيتم عرض الكورسات التي أنشأها المعلم هنا'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredCourses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                index={index}
                onEdit={handleEdit}
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
                isDark={isDark}
                permissions={permissions}
              />
            ))}
          </div>
        )}

        {/* ===== روابط سريعة ===== */}
        <div className={`rounded-2xl p-4 mt-6 ${
          isDark
            ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
            : 'bg-white border border-gray-200 shadow-sm'
        }`}>
          <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
            <LinkIcon className="h-4 w-4 text-yellow-400" /> روابط سريعة
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/assistant" className={`text-xs px-3 py-1.5 rounded-lg transition ${
              isDark
                ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}>
              الرئيسية
            </Link>
            <Link href="/dashboard/assistant/exams" className={`text-xs px-3 py-1.5 rounded-lg transition ${
              isDark
                ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}>
              الامتحانات
            </Link>
            <Link href="/dashboard/assistant/videos" className={`text-xs px-3 py-1.5 rounded-lg transition ${
              isDark
                ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}>
              الفيديوهات
            </Link>
            <Link href="/dashboard/assistant/books" className={`text-xs px-3 py-1.5 rounded-lg transition ${
              isDark
                ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}>
              الكتب
            </Link>
            <Link href="/dashboard/assistant/question-bank" className={`text-xs px-3 py-1.5 rounded-lg transition ${
              isDark
                ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300'
                : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
            }`}>
              بنوك الأسئلة
            </Link>
            <Link href="/dashboard/assistant/students-affairs" className={`text-xs px-3 py-1.5 rounded-lg transition ${
              isDark
                ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
                : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
            }`}>
              شؤون الطلاب
            </Link>
          </div>
        </div>
      </div>

      {/* ===== نافذة النموذج (إنشاء/تعديل) ===== */}
      <AnimatePresence>
        {isFormOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={resetForm}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className={`rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                  : 'bg-white border border-gray-200 shadow-2xl'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
                  {editingCourse ? 'تعديل الكورس' : 'إنشاء كورس جديد'}
                </h3>
                <button
                  onClick={resetForm}
                  className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}
                >
                  <X className={`h-6 w-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                    عنوان الكورس <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    placeholder="مثال: جرامر الترم الأول"
                    className={`w-full p-3 rounded-xl border outline-none transition ${
                      isDark
                        ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.title ? 'border-red-500' : ''}`
                        : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.title ? 'border-red-500' : ''}`
                    }`}
                  />
                  {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                    الوصف <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleFormChange}
                    rows="3"
                    placeholder="وصف مختصر للكورس ومحتوياته"
                    className={`w-full p-3 rounded-xl border outline-none transition resize-none ${
                      isDark
                        ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.description ? 'border-red-500' : ''}`
                        : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.description ? 'border-red-500' : ''}`
                    }`}
                  />
                  {formErrors.description && <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                      السعر (ج.م) {!formData.is_free && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleFormChange}
                      placeholder="250"
                      disabled={formData.is_free}
                      className={`w-full p-3 rounded-xl border outline-none transition ${
                        isDark
                          ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.price ? 'border-red-500' : ''} disabled:opacity-50 disabled:cursor-not-allowed`
                          : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.price ? 'border-red-500' : ''} disabled:opacity-50 disabled:cursor-not-allowed`
                      }`}
                    />
                    {formErrors.price && <p className="text-red-400 text-xs mt-1">{formErrors.price}</p>}
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      name="is_free"
                      checked={formData.is_free}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          is_free: checked,
                          price: checked ? '' : prev.price,
                        }));
                      }}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm font-medium cursor-pointer ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                      🎁 مجاني
                    </label>
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                    المرحلة الدراسية <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="grade_stage"
                    value={formData.grade_stage}
                    onChange={handleFormChange}
                    className={`w-full p-3 rounded-xl border outline-none transition ${
                      isDark
                        ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.grade_stage ? 'border-red-500' : ''}`
                        : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.grade_stage ? 'border-red-500' : ''}`
                    }`}
                  >
                    <option value="">اختر المرحلة</option>
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="اعدادي">اعدادي</option>
                    <option value="ثانوي">ثانوي</option>
                  </select>
                  {formErrors.grade_stage && <p className="text-red-400 text-xs mt-1">{formErrors.grade_stage}</p>}
                </div>

                {formData.grade_stage && (
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                      الصف الدراسي <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="grade_level"
                      value={formData.grade_level}
                      onChange={handleFormChange}
                      className={`w-full p-3 rounded-xl border outline-none transition ${
                        isDark
                          ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.grade_level ? 'border-red-500' : ''}`
                          : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.grade_level ? 'border-red-500' : ''}`
                      }`}
                    >
                      <option value="">اختر الصف</option>
                      {(() => {
                        const levels = {
                          ابتدائي: [1, 2, 3, 4, 5, 6],
                          اعدادي: [1, 2, 3],
                          ثانوي: [1, 2, 3],
                        };
                        return (levels[formData.grade_stage] || []).map((num) => (
                          <option key={num} value={num}>{num}</option>
                        ));
                      })()}
                    </select>
                    {formErrors.grade_level && <p className="text-red-400 text-xs mt-1">{formErrors.grade_level}</p>}
                  </div>
                )}

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                    رابط صورة الغلاف (اختياري)
                  </label>
                  <input
                    type="text"
                    name="cover_image"
                    value={formData.cover_image}
                    onChange={handleFormChange}
                    placeholder="https://example.com/image.jpg"
                    className={`w-full p-3 rounded-xl border outline-none transition ${
                      isDark
                        ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                    }`}
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {submitting
                    ? editingCourse ? 'جاري التحديث...' : 'جاري الإنشاء...'
                    : editingCourse ? 'تحديث الكورس' : 'إنشاء الكورس'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              className={`rounded-3xl p-8 max-w-md w-full ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                  : 'bg-white border border-gray-200 shadow-2xl'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>تأكيد الحذف</h3>
                <p className={`text-sm mb-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
                  هل أنت متأكد من حذف الكورس "{deleteTarget?.title}"؟ هذا الإجراء لا يمكن التراجع عنه.
                </p>
                <div className="flex gap-3 justify-center">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className={`px-6 py-2.5 rounded-xl transition ${
                      isDark
                        ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                        : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                    }`}
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
    </div>
  );
}