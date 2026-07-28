// ================================================================
// 📁 app/dashboard/assistant/exams/page.js
// 📝 إدارة الامتحانات للمساعد – النسخة المتطورة V1.1
// ================================================================

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  List,
  BarChart,
  Clock,
  Calendar,
  Users,
  HelpCircle,
  Lock,
  Database,
  Clipboard,
  CheckCircle,
  Play,
  X,
  AlertCircle,
  AlertTriangle,
  Book,
  Link as LinkIcon,
  ArrowRight,
  Sun,
  Moon,
  RefreshCw,
  ChevronDown,
  Filter,
  Shield,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
// ✅ استيراد useTheme من المسار الموحد
import { useTheme } from '@/lib/hooks/useTheme';
import { useCachedFetch } from '@/lib/hooks/useCachedFetch';
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import dynamic from 'next/dynamic';

// ================================================================
// 🧮 عداد متحرك (مضمن داخل الصفحة)
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

  return <span ref={ref} className="font-extrabold tracking-tight">{count}{suffix}</span>;
};

// ================================================================
// 🔧 دوال مساعدة
// ================================================================

const hasPermission = (permissions, module, permission) => {
  if (!permissions || permissions.length === 0) return false;
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true;
  return perm[permission] === true;
};

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

const getExamStatus = (exam) => {
  const now = new Date();
  const start = new Date(exam.start_date);
  const end = new Date(exam.end_date);

  if (!exam.is_published) {
    return { label: 'مسودة', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: FileText };
  }
  if (now < start) {
    return { label: 'قادم', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock };
  }
  if (now > end) {
    return { label: 'منتهي', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: CheckCircle };
  }
  return { label: 'نشط', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Play };
};

// ================================================================
// 📊 بطاقة إحصائية (معدلة لاستخدام styles)
// ================================================================

const StatCard = ({ stat, styles }) => {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay || 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative rounded-2xl p-5 transition-all duration-300 overflow-hidden group ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
      />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`text-sm ${styles.subtext}`}>
            {stat.label}
          </p>
          <p className={`text-2xl md:text-3xl font-extrabold mt-1 ${styles.text}`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
          <stat.icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: hover ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ================================================================
// 📇 بطاقة الامتحان (معدلة لاستخدام styles)
// ================================================================

const ExamCard = ({
  exam,
  courseTitle,
  index,
  onEdit,
  onDelete,
  onTogglePublish,
  onManageQuestions,
  onViewResults,
  onDuplicate,
  onViewBank,
  styles,
  permissions,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = getExamStatus(exam);
  const StatusIcon = status.icon;

  const canPublish = hasPermission(permissions, 'exams', 'can_publish');
  const canEdit = hasPermission(permissions, 'exams', 'can_edit');
  const canDelete = hasPermission(permissions, 'exams', 'can_delete');
  const canCreate = hasPermission(permissions, 'exams', 'can_create');
  const canView = hasPermission(permissions, 'exams', 'can_view');

  if (!canView) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-500 ${styles.card} border ${styles.border} hover:border-yellow-400/50 hover:shadow-2xl hover:shadow-yellow-400/10`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-purple-500/5 to-transparent rounded-2xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative z-10 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* أيقونة الامتحان */}
          <div className="md:w-20 h-20 md:h-auto rounded-xl bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 relative">
            <FileText className={`h-10 w-10 ${styles.text}`} />
            <div className="absolute -top-1 -right-1 flex items-center gap-1">
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
              {exam.bank_id && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-purple-400/30 bg-purple-400/10 text-purple-300">
                  <Database className="h-3 w-3" />
                  بنك
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h3 className={`text-lg font-bold ${styles.text} group-hover:text-yellow-400 transition-colors cursor-pointer`}>
                  {exam.title}
                </h3>
                {courseTitle && (
                  <p className={`text-xs flex items-center gap-1 mt-0.5 ${styles.subtext}`}>
                    <Book className="h-3 w-3" /> {courseTitle}
                  </p>
                )}
                {exam.bank_title && (
                  <p className={`text-xs flex items-center gap-1 mt-0.5 ${styles.subtext}`}>
                    <Database className="h-3 w-3" />
                    مستورد من: {exam.bank_title}
                    <span className={`mr-1 ${styles.subtext}`}>
                      ({exam.bank_questions_count || 0} سؤال)
                    </span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-yellow-400">{exam.total_marks || 0} درجة</span>
                {exam.passing_marks && (
                  <span className={`text-xs ${styles.subtext}`}>
                    (نجاح: {exam.passing_marks})
                  </span>
                )}
              </div>
            </div>

            <p className={`text-sm mt-1 line-clamp-2 ${styles.subtext}`}>
              {exam.description || 'لا يوجد وصف'}
            </p>

            <div className={`flex flex-wrap items-center gap-2 mt-3 text-xs ${styles.subtext}`}>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${styles.card}`}>
                <Clock className="h-3 w-3" />
                {exam.duration_minutes || 0} د
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${styles.card}`}>
                <Calendar className="h-3 w-3" />
                {formatDate(exam.start_date)}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${styles.card}`}>
                <Users className="h-3 w-3" />
                {exam.attempts_count || 0}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${styles.card}`}>
                <HelpCircle className="h-3 w-3" />
                {exam.questions_count || 0}
              </span>
              {exam.password && (
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20`}>
                  <Lock className="h-3 w-3" /> محمي
                </span>
              )}
            </div>

            {/* الأزرار */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
              {canPublish && (
                <button
                  onClick={() => onTogglePublish(exam)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    exam.is_published
                      ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {exam.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {exam.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
              )}

              {canEdit && (
                <>
                  <button
                    onClick={() => onManageQuestions(exam)}
                    className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/30 transition flex items-center gap-1"
                  >
                    <List className="h-3 w-3" /> الأسئلة
                  </button>
                  <button
                    onClick={() => onEdit(exam)}
                    className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" /> تعديل
                  </button>
                </>
              )}

              {canView && (
                <button
                  onClick={() => onViewResults(exam)}
                  className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-500/30 transition flex items-center gap-1"
                >
                  <BarChart className="h-3 w-3" /> النتائج
                </button>
              )}

              {canCreate && (
                <button
                  onClick={() => onDuplicate(exam)}
                  className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/30 transition flex items-center gap-1"
                >
                  <Copy className="h-3 w-3" /> نسخ
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => onDelete(exam)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/30 transition flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> حذف
                </button>
              )}

              {exam.bank_id && (
                <button
                  onClick={() => onViewBank(exam)}
                  className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-500/30 transition flex items-center gap-1"
                >
                  <Database className="h-3 w-3" /> البنك المصدر
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 🗑️ نافذة تأكيد الحذف (معدلة لاستخدام styles)
// ================================================================

const DeleteModal = ({ isOpen, onClose, onConfirm, title, count, isBatch, styles }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`rounded-3xl p-8 max-w-md w-full ${styles.card} border ${styles.border}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className={`text-xl font-bold mb-2 ${styles.text}`}>
            {isBatch ? `حذف ${count} امتحان` : 'تأكيد الحذف'}
          </h3>
          <p className={`text-sm mb-6 ${styles.subtext}`}>
            {isBatch
              ? `هل أنت متأكد من حذف ${count} امتحان؟ هذا الإجراء لا يمكن التراجع عنه.`
              : `هل أنت متأكد من حذف "${title}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition"
            >
              حذف
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 📄 الصفحة الرئيسية – إدارة الامتحانات للمساعد
// ================================================================

export default function AssistantExamsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const { theme, toggleTheme, styles } = useTheme(); // ✅ استخدام الثيم الموحد

  // ===== بيانات المساعد والصلاحيات =====
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();

  // ===== جلب الامتحانات =====
  const teacherId = assistant?.teacher_id;
  const { data: examsData, isLoading: examsLoading, mutate: mutateExams } = useCachedFetch(
    teacherId ? `/api/assistant/exams?teacher_id=${teacherId}` : null
  );

  // ===== جلب الكورسات =====
  const { data: coursesData } = useCachedFetch(
    teacherId ? `/api/assistant/courses?teacher_id=${teacherId}` : null
  );

  // ===== حالات =====
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState(courseIdParam || 'all');
  const [filterBank, setFilterBank] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // ===== تحليل البيانات =====
  const courses = coursesData?.courses || [];
  const courseMap = useMemo(() => {
    const map = {};
    courses.forEach(c => { map[c.id] = c.title; });
    return map;
  }, [courses]);

  const exams = examsData?.exams || [];
  const banks = examsData?.banks || {};

  // ===== حساب الإحصائيات =====
  const stats = useMemo(() => {
    const total = exams.length;
    const published = exams.filter(e => e.is_published).length;
    const drafts = exams.filter(e => !e.is_published).length;
    const now = new Date();
    const active = exams.filter(e => e.is_published && new Date(e.start_date) <= now && new Date(e.end_date) >= now).length;
    const upcoming = exams.filter(e => e.is_published && new Date(e.start_date) > now).length;
    const ended = exams.filter(e => e.is_published && new Date(e.end_date) < now).length;

    // إحصائيات البنوك
    const usedBankIds = exams
      .filter(e => e.bank_id)
      .map(e => e.bank_id);
    const uniqueBankIds = [...new Set(usedBankIds)];
    const bankQuestionsCount = exams.reduce((sum, e) => sum + (e.bank_questions_count || 0), 0);

    return {
      total,
      published,
      drafts,
      active,
      upcoming,
      ended,
      totalBanksUsed: uniqueBankIds.length,
      bankQuestionsCount,
    };
  }, [exams]);

  // ===== الفلترة والبحث =====
  const filteredExams = useMemo(() => {
    let result = [...exams];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') {
      const now = new Date();
      result = result.filter(e => {
        if (!e.is_published) return filterStatus === 'draft';
        const start = new Date(e.start_date);
        const end = new Date(e.end_date);
        if (filterStatus === 'active') return start <= now && end >= now;
        if (filterStatus === 'upcoming') return start > now;
        if (filterStatus === 'ended') return end < now;
        return true;
      });
    }

    if (filterCourse && filterCourse !== 'all') {
      result = result.filter(e => e.course_id === filterCourse);
    }

    if (filterBank && filterBank !== 'all') {
      result = result.filter(e => e.bank_id === filterBank);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'students':
        result.sort((a, b) => (b.attempts_count || 0) - (a.attempts_count || 0));
        break;
      default:
        break;
    }

    return result;
  }, [exams, searchQuery, filterStatus, filterCourse, filterBank, sortBy]);

  // ===== خيارات الكورسات للفلترة =====
  const courseOptions = useMemo(() => {
    const unique = {};
    exams.forEach(e => {
      if (e.course_id && !unique[e.course_id]) {
        unique[e.course_id] = courseMap[e.course_id] || 'كورس غير معروف';
      }
    });
    return Object.entries(unique).map(([id, title]) => ({ id, title }));
  }, [exams, courseMap]);

  // ===== خيارات البنوك للفلترة =====
  const bankOptions = useMemo(() => {
    const unique = {};
    exams.forEach(e => {
      if (e.bank_id && !unique[e.bank_id]) {
        unique[e.bank_id] = banks[e.bank_id] || 'بنك غير معروف';
      }
    });
    return Object.entries(unique).map(([id, title]) => ({ id, title }));
  }, [exams, banks]);

  // ===== دوال التحكم =====
  const handleCreate = () => {
    const url = courseIdParam && courseIdParam !== 'all'
      ? `/dashboard/assistant/exams/new?course_id=${courseIdParam}`
      : '/dashboard/assistant/exams/new';
    router.push(url);
  };

  const handleEdit = (exam) => {
    router.push(`/dashboard/assistant/exams/${exam.id}/edit`);
  };

  const handleManageQuestions = (exam) => {
    router.push(`/dashboard/assistant/exams/${exam.id}/questions`);
  };

  const handleViewResults = (exam) => {
    router.push(`/dashboard/assistant/exams/${exam.id}/results`);
  };

  const handleDuplicate = async (exam) => {
    if (!hasPermission(permissions, 'exams', 'can_create')) {
      toast.error('ليس لديك صلاحية لنسخ الامتحانات');
      return;
    }

    try {
      const res = await fetch('/api/assistant/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          title: `${exam.title} (نسخة)`,
          description: exam.description,
          duration_minutes: exam.duration_minutes,
          start_date: exam.start_date,
          end_date: exam.end_date,
          total_marks: exam.total_marks,
          passing_marks: exam.passing_marks,
          shuffle_questions: exam.shuffle_questions,
          shuffle_options: exam.shuffle_options,
          allow_backward: exam.allow_backward,
          show_results_immediately: exam.show_results_immediately,
          attempts_allowed: exam.attempts_allowed,
          password: exam.password,
          settings: exam.settings,
          course_id: exam.course_id,
          is_published: false,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل نسخ الامتحان');

      toast.success('✅ تم نسخ الامتحان بنجاح');
      mutateExams();
    } catch (err) {
      console.error('Error duplicating exam:', err);
      toast.error('فشل نسخ الامتحان');
    }
  };

  const handleDeleteClick = (exam) => {
    setDeleteTarget(exam);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    if (!hasPermission(permissions, 'exams', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الامتحانات');
      return;
    }

    try {
      const res = await fetch(`/api/assistant/exams/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: assistant?.teacher_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الامتحان');

      toast.success('✅ تم حذف الامتحان بنجاح');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      mutateExams();
    } catch (err) {
      console.error('Error deleting exam:', err);
      toast.error('فشل حذف الامتحان');
    }
  };

  const togglePublish = async (exam) => {
    if (!hasPermission(permissions, 'exams', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر الامتحانات');
      return;
    }

    try {
      const res = await fetch(`/api/assistant/exams/${exam.id}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          is_published: !exam.is_published,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة النشر');

      toast.success(`✅ تم ${exam.is_published ? 'إلغاء نشر' : 'نشر'} الامتحان`);
      mutateExams();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleViewBank = (exam) => {
    if (exam.bank_id) {
      router.push(`/dashboard/assistant/question-bank/${exam.bank_id}`);
    }
  };

  // ===== تحديد متعدد =====
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExams.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExams.map(e => e.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const confirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission(permissions, 'exams', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الامتحانات');
      return;
    }

    try {
      const res = await fetch('/api/assistant/exams/batch', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          ids: selectedIds,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الامتحانات');

      toast.success(`✅ تم حذف ${selectedIds.length} امتحان`);
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
      mutateExams();
    } catch (err) {
      console.error('Error batch deleting:', err);
      toast.error('فشل حذف الامتحانات المحددة');
    }
  };

  const handleBatchPublish = async () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission(permissions, 'exams', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر الامتحانات');
      return;
    }

    try {
      const res = await fetch('/api/assistant/exams/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          ids: selectedIds,
          action: 'publish',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل نشر الامتحانات');

      toast.success(`✅ تم نشر ${selectedIds.length} امتحان`);
      setSelectedIds([]);
      mutateExams();
    } catch (err) {
      console.error('Error batch publishing:', err);
      toast.error('فشل نشر الامتحانات');
    }
  };

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي الامتحانات', value: stats.total, icon: FileText, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'منشور', value: stats.published, icon: CheckCircle, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'مسودات', value: stats.drafts, icon: FileText, color: 'from-gray-400 to-gray-600', delay: 0.2 },
    { id: 4, label: 'نشط', value: stats.active, icon: Play, color: 'from-green-400 to-green-600', delay: 0.3 },
    { id: 5, label: 'قادم', value: stats.upcoming, icon: Clock, color: 'from-blue-400 to-blue-600', delay: 0.4 },
    { id: 6, label: 'منتهي', value: stats.ended, icon: CheckCircle, color: 'from-red-400 to-red-600', delay: 0.5 },
    { id: 7, label: 'بنوك مستخدمة', value: stats.totalBanksUsed, icon: Database, color: 'from-purple-400 to-purple-600', delay: 0.6 },
    { id: 8, label: 'أسئلة من البنوك', value: stats.bankQuestionsCount, icon: Clipboard, color: 'from-indigo-400 to-indigo-600', delay: 0.7 },
  ];

  const isLoading = assistantLoading || examsLoading;
  const canCreate = hasPermission(permissions, 'exams', 'can_create');

  // ===== حالة التحميل =====
  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${styles.subtext}`}>
            جاري تحميل الامتحانات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">📝 إدارة الامتحانات</h1>
            <p className={`text-sm mt-1 ${styles.subtext}`}>
              {courseIdParam && courseIdParam !== 'all' && courseMap[courseIdParam]
                ? `امتحانات الكورس: ${courseMap[courseIdParam]}`
                : `جميع الامتحانات (${exams.length})`}
              {assistant && (
                <span className="mr-2 text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  {assistant.display_name || assistant.full_name}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            {canCreate && (
              <button
                onClick={handleCreate}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" /> إنشاء امتحان
              </button>
            )}
            <Link
              href="/dashboard/assistant/question-bank"
              className="px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold rounded-xl hover:scale-[1.02] transition flex items-center gap-2"
            >
              <Database className="h-5 w-5" /> إنشاء من بنك
            </Link>
            <button
              onClick={() => mutateExams()}
              className={`p-2.5 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
              title="تحديث البيانات"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
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
              <span className="flex-1 text-sm">{error}</span>
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
              <span className="flex-1 text-sm">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          {statsData.map((stat) => (
            <StatCard key={stat.id} stat={stat} styles={styles} />
          ))}
        </div>

        {/* ===== الفلتر والبحث ===== */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${styles.subtext}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن امتحان (عنوان أو وصف)..."
              className={`w-full p-2.5 pr-10 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
          >
            <option value="all">كل الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
            <option value="active">نشط</option>
            <option value="upcoming">قادم</option>
            <option value="ended">منتهي</option>
          </select>

          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
          >
            <option value="all">جميع الكورسات</option>
            {courseOptions.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
          >
            <option value="all">جميع البنوك</option>
            {bankOptions.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
          >
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="title">العنوان</option>
            <option value="students">عدد الطلاب</option>
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setFilterStatus('all');
              setFilterCourse('all');
              setFilterBank('all');
              setSortBy('newest');
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
          >
            <Filter className="h-4 w-4 inline ml-1" /> إعادة ضبط
          </button>
        </div>

        {/* ===== أزرار التحكم الجماعي ===== */}
        {filteredExams.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={toggleSelectAll}
              className={`px-3 py-1.5 rounded-xl text-xs transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            >
              {selectedIds.length === filteredExams.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
            {selectedIds.length > 0 && (
              <>
                {hasPermission(permissions, 'exams', 'can_delete') && (
                  <button
                    onClick={() => setIsBatchDeleteModalOpen(true)}
                    className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" /> حذف ({selectedIds.length})
                  </button>
                )}
                {hasPermission(permissions, 'exams', 'can_publish') && (
                  <button
                    onClick={handleBatchPublish}
                    className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-xs transition flex items-center gap-1"
                  >
                    <Eye className="h-3 w-3" /> نشر ({selectedIds.length})
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ===== قائمة الامتحانات ===== */}
        {filteredExams.length === 0 ? (
          <div className={`text-center py-20 rounded-3xl ${styles.card} border ${styles.border}`}>
            <FileText className={`h-16 w-16 mx-auto mb-4 ${styles.subtext}`} />
            <h3 className={`text-xl font-semibold ${styles.text}`}>
              {searchQuery || filterStatus !== 'all' || filterCourse !== 'all' || filterBank !== 'all'
                ? 'لا توجد نتائج تطابق البحث'
                : 'لا توجد امتحانات بعد'}
            </h3>
            <p className={`text-sm mt-2 ${styles.subtext}`}>
              {searchQuery || filterStatus !== 'all' || filterCourse !== 'all' || filterBank !== 'all'
                ? 'حاول تغيير معايير البحث'
                : 'قم بإنشاء أول امتحان لك'}
            </p>
            {!searchQuery && filterStatus === 'all' && filterCourse === 'all' && filterBank === 'all' && canCreate && (
              <button
                onClick={handleCreate}
                className="mt-4 px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
              >
                إنشاء امتحان الآن
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredExams.map((exam, index) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                courseTitle={courseMap[exam.course_id]}
                index={index}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onTogglePublish={togglePublish}
                onManageQuestions={handleManageQuestions}
                onViewResults={handleViewResults}
                onDuplicate={handleDuplicate}
                onViewBank={handleViewBank}
                styles={styles}
                permissions={permissions}
              />
            ))}
          </div>
        )}

        {/* ===== روابط سريعة ===== */}
        <div className={`rounded-2xl p-4 mt-6 ${styles.card} border ${styles.border}`}>
          <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${styles.text}`}>
            <LinkIcon className="h-4 w-4 text-yellow-400" /> روابط سريعة
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/assistant" className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}>
              الرئيسية
            </Link>
            <Link href="/dashboard/assistant/courses" className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}>
              الكورسات
            </Link>
            <Link href="/dashboard/assistant/videos" className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}>
              الفيديوهات
            </Link>
            <Link href="/dashboard/assistant/books" className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}>
              الكتب
            </Link>
            <Link href="/dashboard/assistant/question-bank" className={`text-xs px-3 py-1.5 rounded-lg transition bg-purple-500/10 hover:bg-purple-500/20 text-purple-300`}>
              بنوك الأسئلة
            </Link>
          </div>
        </div>
      </div>

      {/* ===== نوافذ التأكيد ===== */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={deleteTarget?.title}
        styles={styles}
      />

      <DeleteModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        onConfirm={confirmBatchDelete}
        count={selectedIds.length}
        isBatch={true}
        styles={styles}
      />

      <style jsx>{`
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}