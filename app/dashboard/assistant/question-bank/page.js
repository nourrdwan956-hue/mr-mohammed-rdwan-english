// ================================================================
// 📁 app/dashboard/assistant/question-bank/page.js
// 🏦 بنك الأسئلة – النسخة المتطورة للمساعد V1
// ================================================================
// - تعتمد على APIs خاصة بالمساعد (/api/assistant/question-bank)
// - دعم كامل للصلاحيات (can_view, can_create, can_edit, can_delete, can_publish)
// - دعم الثيم الفاتح/الداكن عبر useTheme
// - استخدام useCachedFetch و useAssistantData للسرعة
// - تصميم Glassmorphism فاخر مع ألوان ذهبية
// ================================================================

'use client';

import { useState, useEffect, useMemo, useReducer, useCallback, useRef, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Folder,
  Plus,
  Search,
  Sliders,
  Upload,
  BarChart3,
  Clipboard,
  CheckCircle,
  Users,
  Tag,
  Award,
  History,
  FolderPlus,
  FileText,
  AlignLeft,
  BookOpen,
  Eye,
  EyeOff,
  Trash2,
  Edit,
  MoreVertical,
  Download,
  Share2,
  Archive,
  RefreshCw,
  Copy,
  Key,
  FolderOpen,
  ClipboardList,
  X,
  AlertTriangle,
  Loader2,
  Globe,
  Sun,
  Moon,
  GraduationCap,
  Zap,
  ArrowRight,
  Calendar,
  Info,
  Save,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/app/theme/ThemeProvider';
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import { useCachedFetch } from '@/lib/hooks/useCachedFetch';
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
import { Bar, Doughnut } from 'react-chartjs-2';

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

const useDebounce = (value, delay = 400) => {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
};

const translations = {
  ar: {
    title: '🏦 بنوك الأسئلة',
    subtitle: 'لوحة تحكم متقدمة لإدارة البنوك والأسئلة بذكاء اصطناعي',
    badge: 'AI',
    loading: 'جاري التحميل...',
    fetchFailed: 'فشل جلب البيانات، حاول مرة أخرى',
    noBanks: 'لا توجد بنوك',
    noBanksDesc: 'ابدأ بإنشاء أول بنك الآن',
    createBank: 'بنك جديد',
    createNow: 'إنشاء',
    editBank: 'تعديل البنك',
    updateNow: 'تحديث',
    delete: 'حذف',
    cancel: 'إلغاء',
    confirmDelete: 'هل أنت متأكد من حذف هذا البنك وجميع محتوياته؟',
    deleteSuccess: 'تم الحذف بنجاح',
    deleteFailed: 'فشل الحذف',
    publishSuccess: 'تم النشر',
    unpublishSuccess: 'تم إلغاء النشر',
    archiveSuccess: 'تمت الأرشفة',
    restoreSuccess: 'تمت الاستعادة',
    duplicateSuccess: 'تم نسخ البنك',
    selectQuestions: 'اختيار أسئلة',
    noQuestionsInBank: 'لا توجد أسئلة في هذا البنك',
    generateExam: 'توليد امتحان',
    examGenerated: 'تم إنشاء الامتحان بنجاح',
    examFailed: 'فشل إنشاء الامتحان',
    selectBankFirst: 'اختر بنكاً أولاً',
    tags: 'الوسوم',
    manageTags: 'إدارة الوسوم',
    addTag: 'إضافة وسم',
    tagAdded: 'تمت إضافة الوسم',
    tagDeleted: 'تم حذف الوسم',
    exportJSON: 'تصدير JSON',
    importQuestions: 'استيراد أسئلة',
    viewAnalytics: 'التحليلات',
    questionsCount: 'أسئلة',
    usageCount: 'عدد الاستخدامات',
    lastUsed: 'آخر استخدام',
    bankStats: 'إحصائيات البنك',
    questionStats: 'إحصائيات الأسئلة',
    advancedFilters: 'فلترة متقدمة',
    clearFilters: 'مسح الفلترة',
    searchPlaceholder: 'ابحث في البنوك والأسئلة والوسوم...',
    allCourses: 'كل الكورسات',
    allTypes: 'كل الأنواع',
    allDifficulties: 'كل الصعوبات',
    sortNewest: 'الأحدث',
    sortOldest: 'الأقدم',
    sortQuestions: 'الأكثر أسئلة',
    sortTitle: 'العنوان',
    totalBanks: 'إجمالي البنوك',
    totalQuestions: 'إجمالي الأسئلة',
    publishedBanks: 'المنشورة',
    studentsAccess: 'متاحة للطلاب',
    totalTags: 'إجمالي الوسوم',
    avgQuestions: 'متوسط الأسئلة لكل بنك',
    mostUsedTag: 'الوسم الأكثر استخداماً',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    language: 'اللغة',
    gold: 'ذهبي',
    blue: 'أزرق',
    green: 'أخضر',
    purple: 'بنفسجي',
    typeMCQ: 'اختيار من متعدد',
    typeTrueFalse: 'صح/خطأ',
    typeShort: 'إجابة قصيرة',
    typeEssay: 'مقالي',
    typeMatching: 'مطابقة',
    difficultyEasy: 'سهل',
    difficultyMedium: 'متوسط',
    difficultyHard: 'صعب',
    difficultyExpert: 'خبير',
    previous: 'السابق',
    next: 'التالي',
    selected: 'محدد',
    deselectAll: 'إلغاء التحديد',
    deleteSelected: 'حذف المحدد',
    publishSelected: 'نشر المحدد',
    archiveSelected: 'أرشفة المحدد',
    draft: 'مسودة',
    published: 'منشور',
    archived: 'مؤرشف',
    open: 'فتح',
    edit: 'تعديل',
    viewQuestions: 'عرض الأسئلة',
    createExam: 'إنشاء امتحان',
    randomExam: 'امتحان عشوائي',
    accessCode: 'رمز الوصول',
    copyCode: 'نسخ',
    codeCopied: 'تم النسخ',
    reportsTitle: 'التقارير والتحليلات',
    questionsDistribution: 'توزيع الأسئلة حسب النوع',
    difficultyDistribution: 'توزيع الصعوبات',
    dailyActivity: 'النشاط اليومي',
    questionsPerBank: 'الأسئلة لكل بنك',
    tagsTitle: 'الوسوم الأكثر استخداماً',
    activityLogTitle: 'سجل النشاطات',
    noActivity: 'لا توجد نشاطات',
    examTitle: 'عنوان الامتحان',
    examDescription: 'وصف الامتحان',
    numQuestions: 'عدد الأسئلة',
    examDuration: 'المدة (دقائق)',
    generating: 'جاري التوليد...',
    selectAll: 'تحديد الكل',
    deselectAllLabel: 'إلغاء الكل',
    selectedQuestions: 'أسئلة محددة',
    noQuestions: 'لا توجد أسئلة',
    backToBanks: 'العودة إلى البنوك',
    saveChanges: 'حفظ التغييرات',
    confirm: 'تأكيد',
    filterByTag: 'فلترة بالوسم',
    filterByDifficulty: 'فلترة بالصعوبة',
    filterByType: 'فلترة بالنوع',
    gradeLevel: 'المرحلة الدراسية',
    selectGrade: 'اختر المرحلة الدراسية',
    gradePrep1: 'أولى إعدادي',
    gradePrep2: 'ثانية إعدادي',
    gradePrep3: 'ثالثة إعدادي',
    gradeSec1: 'أولى ثانوي',
    gradeSec2: 'ثانية ثانوي',
    gradeSec3: 'ثالثة ثانوي',
    bankTitleLabel: 'عنوان البنك',
    bankDescriptionLabel: 'الوصف (اختياري)',
    courseLabel: 'الكورس المرتبط (اختياري)',
    publishLabel: 'منشور',
    publishToStudentsLabel: 'نشر للطلاب',
    requiredField: 'مطلوب',
    bankCreated: 'تم إنشاء البنك بنجاح',
    bankCreateError: 'حدث خطأ أثناء إنشاء البنك: ',
    noGradeColumn: 'المرحلة الدراسية غير موجودة في قاعدة البيانات، يرجى إضافتها',
    restoreBank: 'استعادة',
    archiveBank: 'أرشفة',
    duplicateBank: 'نسخ',
    shareBank: 'مشاركة',
    createNowAction: 'إنشاء الآن',
    close: 'إغلاق',
  },
  en: {
    title: '🏦 Question Banks',
    subtitle: 'Advanced dashboard for managing banks and questions with AI',
    badge: 'AI',
    loading: 'Loading...',
    fetchFailed: 'Failed to fetch data, please try again',
    noBanks: 'No Banks',
    noBanksDesc: 'Start by creating your first bank',
    createBank: 'New Bank',
    createNow: 'Create',
    editBank: 'Edit Bank',
    updateNow: 'Update',
    delete: 'Delete',
    cancel: 'Cancel',
    confirmDelete: 'Are you sure you want to delete this bank and all its contents?',
    deleteSuccess: 'Deleted successfully',
    deleteFailed: 'Delete failed',
    publishSuccess: 'Published',
    unpublishSuccess: 'Unpublished',
    archiveSuccess: 'Archived',
    restoreSuccess: 'Restored',
    duplicateSuccess: 'Bank duplicated',
    selectQuestions: 'Select Questions',
    noQuestionsInBank: 'No questions in this bank',
    generateExam: 'Generate Exam',
    examGenerated: 'Exam created successfully',
    examFailed: 'Failed to create exam',
    selectBankFirst: 'Select a bank first',
    tags: 'Tags',
    manageTags: 'Manage Tags',
    addTag: 'Add Tag',
    tagAdded: 'Tag added',
    tagDeleted: 'Tag deleted',
    exportJSON: 'Export JSON',
    importQuestions: 'Import Questions',
    viewAnalytics: 'Analytics',
    questionsCount: 'Questions',
    usageCount: 'Usage Count',
    lastUsed: 'Last Used',
    bankStats: 'Bank Statistics',
    questionStats: 'Question Statistics',
    advancedFilters: 'Advanced Filters',
    clearFilters: 'Clear Filters',
    searchPlaceholder: 'Search banks, questions, tags...',
    allCourses: 'All Courses',
    allTypes: 'All Types',
    allDifficulties: 'All Difficulties',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortQuestions: 'Most Questions',
    sortTitle: 'Title',
    totalBanks: 'Total Banks',
    totalQuestions: 'Total Questions',
    publishedBanks: 'Published',
    studentsAccess: 'Student Access',
    totalTags: 'Total Tags',
    avgQuestions: 'Avg Questions per Bank',
    mostUsedTag: 'Most Used Tag',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    gold: 'Gold',
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
    typeMCQ: 'Multiple Choice',
    typeTrueFalse: 'True/False',
    typeShort: 'Short Answer',
    typeEssay: 'Essay',
    typeMatching: 'Matching',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    difficultyExpert: 'Expert',
    previous: 'Previous',
    next: 'Next',
    selected: 'Selected',
    deselectAll: 'Deselect All',
    deleteSelected: 'Delete Selected',
    publishSelected: 'Publish Selected',
    archiveSelected: 'Archive Selected',
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived',
    open: 'Open',
    edit: 'Edit',
    viewQuestions: 'View Questions',
    createExam: 'Create Exam',
    randomExam: 'Random Exam',
    accessCode: 'Access Code',
    copyCode: 'Copy',
    codeCopied: 'Copied',
    reportsTitle: 'Reports & Analytics',
    questionsDistribution: 'Questions by Type',
    difficultyDistribution: 'Difficulty Distribution',
    dailyActivity: 'Daily Activity',
    questionsPerBank: 'Questions per Bank',
    tagsTitle: 'Most Used Tags',
    activityLogTitle: 'Activity Log',
    noActivity: 'No activity',
    examTitle: 'Exam Title',
    examDescription: 'Exam Description',
    numQuestions: 'Number of Questions',
    examDuration: 'Duration (minutes)',
    generating: 'Generating...',
    selectAll: 'Select All',
    deselectAllLabel: 'Deselect All',
    selectedQuestions: 'Selected Questions',
    noQuestions: 'No Questions',
    backToBanks: 'Back to Banks',
    saveChanges: 'Save Changes',
    confirm: 'Confirm',
    filterByTag: 'Filter by Tag',
    filterByDifficulty: 'Filter by Difficulty',
    filterByType: 'Filter by Type',
    gradeLevel: 'Grade Level',
    selectGrade: 'Select Grade Level',
    gradePrep1: 'Prep 1',
    gradePrep2: 'Prep 2',
    gradePrep3: 'Prep 3',
    gradeSec1: 'Sec 1',
    gradeSec2: 'Sec 2',
    gradeSec3: 'Sec 3',
    bankTitleLabel: 'Bank Title',
    bankDescriptionLabel: 'Description (optional)',
    courseLabel: 'Associated Course (optional)',
    publishLabel: 'Published',
    publishToStudentsLabel: 'Publish to Students',
    requiredField: 'Required',
    bankCreated: 'Bank created successfully',
    bankCreateError: 'Error creating bank: ',
    noGradeColumn: 'Grade level column missing in database, please add it',
    restoreBank: 'Restore',
    archiveBank: 'Archive',
    duplicateBank: 'Duplicate',
    shareBank: 'Share',
    createNowAction: 'Create Now',
    close: 'Close',
  },
};

// ================================================================
// 📊 عداد متحرك
// ================================================================

const AnimatedCounter = memo(({ target, suffix = '', duration = 1200 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
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
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return <span ref={ref} className="font-extrabold tracking-tight">{count}{suffix}</span>;
});
AnimatedCounter.displayName = 'AnimatedCounter';

// ================================================================
// 📊 بطاقة إحصائية
// ================================================================

const StatCard = ({ label, value, icon: Icon, color, delay, subtitle, isDark }) => {
  const colorMap = {
    blue: { bg: 'rgba(59,130,246,0.15)', text: '#3b82f6' },
    green: { bg: 'rgba(34,197,94,0.15)', text: '#22c55e' },
    yellow: { bg: 'rgba(251,191,36,0.15)', text: '#fbbf24' },
    purple: { bg: 'rgba(168,85,247,0.15)', text: '#a855f7' },
    orange: { bg: 'rgba(251,146,60,0.15)', text: '#f97316' },
    pink: { bg: 'rgba(236,72,153,0.15)', text: '#ec4899' },
    teal: { bg: 'rgba(20,184,166,0.15)', text: '#14b8a6' },
    indigo: { bg: 'rgba(99,102,241,0.15)', text: '#6366f1' },
  };
  const colors = colorMap[color] || colorMap.blue;
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay || 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`rounded-2xl p-5 transition-all duration-300 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-xl ${isDark ? 'bg-[var(--bg-secondary)]' : 'bg-gray-100'}`} style={{ color: colors.text }}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{label}</p>
          <p className={`text-2xl font-extrabold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
            <AnimatedCounter target={typeof value === 'number' ? value : 0} />
          </p>
          {subtitle && <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
};
StatCard.displayName = 'StatCard';

// ================================================================
// 🏷️ شريط الإعدادات
// ================================================================

const SettingsBar = ({ isDark, toggleTheme, language, setLanguage }) => {
  const t = translations[language];
  return (
    <div className={`flex flex-wrap items-center gap-3 p-4 rounded-2xl mb-6 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.language}:</span>
        <button
          onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
          className={`px-4 py-1.5 rounded-lg text-sm transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}
        >
          {language === 'ar' ? 'English' : 'عربي'}
        </button>
      </div>
      <div className="w-px h-6 bg-gray-300 dark:bg-white/10" />
      <div className="flex items-center gap-2">
        <span className={`text-sm font-medium ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.themeLight}/{t.themeDark}:</span>
        <button
          onClick={toggleTheme}
          className={`p-2 rounded-lg transition ${isDark ? 'bg-yellow-400/20 text-yellow-400' : 'bg-gray-200 text-gray-700'}`}
        >
          {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </div>
  );
};
SettingsBar.displayName = 'SettingsBar';

// ================================================================
// 📋 مودال إنشاء/تعديل بنك
// ================================================================

const BankFormModal = ({ isOpen, onClose, onSave, courses, language, initialData = null, isDark }) => {
  const t = translations[language];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [publishToStudents, setPublishToStudents] = useState(false);
  const [loading, setLoading] = useState(false);

  const gradeLevels = [
    { value: 'prep1', label: t.gradePrep1 },
    { value: 'prep2', label: t.gradePrep2 },
    { value: 'prep3', label: t.gradePrep3 },
    { value: 'sec1', label: t.gradeSec1 },
    { value: 'sec2', label: t.gradeSec2 },
    { value: 'sec3', label: t.gradeSec3 },
  ];

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title || '');
      setDescription(initialData.description || '');
      setCourseId(initialData.course_id || '');
      setGradeLevel(initialData.grade_level || '');
      setIsPublished(initialData.is_published || false);
      setPublishToStudents(initialData.published_to_students || false);
    } else {
      setTitle('');
      setDescription('');
      setCourseId('');
      setGradeLevel('');
      setIsPublished(false);
      setPublishToStudents(false);
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('الرجاء إدخال عنوان البنك');
      return;
    }
    if (!gradeLevel) {
      toast.error('الرجاء اختيار المرحلة الدراسية');
      return;
    }
    setLoading(true);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim(),
        course_id: courseId || null,
        grade_level: gradeLevel,
        is_published: isPublished,
        published_to_students: publishToStudents,
      });
    } catch (err) {
      // handled in parent
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full p-3 rounded-xl border outline-none transition text-sm ${
    isDark
      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
  }`;

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <div
        className={`rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
            {initialData ? t.editBank : t.createBank}
          </h2>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              {t.bankTitleLabel} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: أسئلة الفصل الأول – الجبر"
              className={inputBase}
              required
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              {t.bankDescriptionLabel}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              placeholder="وصف مختصر لمحتوى البنك..."
              className={`${inputBase} resize-none`}
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              {t.gradeLevel} <span className="text-red-400">*</span>
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              className={inputBase}
              required
            >
              <option value="">{t.selectGrade}</option>
              {gradeLevels.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              {t.courseLabel}
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className={inputBase}
            >
              <option value="">{t.allCourses}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>

          <div className={`flex flex-wrap gap-4 p-3 rounded-xl ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
              />
              {t.publishLabel}
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              <input
                type="checkbox"
                checked={publishToStudents}
                onChange={(e) => setPublishToStudents(e.target.checked)}
                className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
              />
              {t.publishToStudentsLabel}
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {loading ? 'جاري...' : initialData ? t.updateNow : t.createNow}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}
            >
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
BankFormModal.displayName = 'BankFormModal';

// ================================================================
// 🗑️ مودال تأكيد الحذف
// ================================================================

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isDark }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className={`rounded-3xl p-8 max-w-md w-full ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{title}</h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{message}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition"
            >
              تأكيد
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
ConfirmModal.displayName = 'ConfirmModal';

// ================================================================
// 📋 مودال إنشاء امتحان
// ================================================================

const CreateExamModal = ({ isOpen, onClose, bank, language, onSuccess, isDark }) => {
  const t = translations[language];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('random');

  useEffect(() => {
    if (isOpen && bank) {
      setTitle(`امتحان: ${bank.title}`);
      setDescription(`امتحان من بنك ${bank.title}`);
    }
  }, [isOpen, bank]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t.examTitle + ' مطلوب');
      return;
    }
    setLoading(true);
    try {
      await onSuccess({
        title: title.trim(),
        description: description.trim(),
        bankId: bank.id,
        numQuestions,
        duration,
        mode,
      });
      onClose();
    } catch (err) {
      // handled in parent
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full p-3 rounded-xl border outline-none transition text-sm ${
    isDark
      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
  }`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className={`rounded-3xl p-8 max-w-md w-full ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.createExam}</h2>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>

        <p className={`text-sm mb-4 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
          {t.bankTitle}: <span className={`font-medium ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{bank?.title}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode('random')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                mode === 'random'
                  ? 'bg-yellow-400 text-black'
                  : isDark
                    ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]'
                    : 'bg-gray-100 border border-gray-200 text-gray-900'
              }`}
            >
              🎲 {t.randomExam}
            </button>
            <button
              type="button"
              onClick={() => setMode('manual')}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${
                mode === 'manual'
                  ? 'bg-yellow-400 text-black'
                  : isDark
                    ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]'
                    : 'bg-gray-100 border border-gray-200 text-gray-900'
              }`}
            >
              📋 {t.selectQuestions}
            </button>
          </div>

          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t.examTitle}
            className={inputBase}
            required
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="2"
            placeholder={t.examDescription}
            className={`${inputBase} resize-none`}
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.numQuestions}</label>
              <input
                type="number"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={100}
                className={inputBase}
              />
            </div>
            <div>
              <label className={`block text-sm mb-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.examDuration}</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                max={180}
                className={inputBase}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Plus className="h-5 w-5" />}
              {loading ? t.generating : t.generateExam}
            </button>
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-3 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}
            >
              {t.cancel}
            </button>
          </div>

          {mode === 'manual' && (
            <div className={`p-3 rounded-lg ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
              <p className={`text-sm flex items-center gap-2 ${isDark ? 'text-purple-300' : 'text-purple-700'}`}>
                <Info className="h-4 w-4" />
                سيتم فتح مودال اختيار الأسئلة بعد إنشاء الامتحان
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
CreateExamModal.displayName = 'CreateExamModal';

// ================================================================
// 🏷️ مودال إدارة الوسوم
// ================================================================

const TagManagerModal = ({ isOpen, onClose, bank, language, onUpdate, isDark }) => {
  const t = translations[language];
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState([]);

  useEffect(() => {
    if (bank) setTags(bank.tags || []);
  }, [bank]);

  if (!isOpen || !bank) return null;

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/assistant/question-bank/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bank_id: bank.id,
          tag: newTag.trim(),
          teacher_id: bank.teacher_id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إضافة الوسم');
      toast.success(t.tagAdded);
      setNewTag('');
      onUpdate();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tag) => {
    try {
      const res = await fetch(`/api/assistant/question-bank/tags?bank_id=${bank.id}&tag=${encodeURIComponent(tag)}&teacher_id=${bank.teacher_id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الوسم');
      toast.success(t.tagDeleted);
      onUpdate();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className={`rounded-3xl p-8 max-w-md w-full ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.manageTags}</h2>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder={t.addTag}
            className={`flex-1 p-3 rounded-xl border outline-none transition text-sm ${
              isDark
                ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
            }`}
          />
          <button
            onClick={handleAddTag}
            disabled={loading}
            className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-xl hover:scale-[1.02] transition disabled:opacity-70"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t.addTag}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
          {tags.map((tag) => (
            <span key={tag} className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${isDark ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
              {tag}
              <button onClick={() => handleDeleteTag(tag)} className="text-red-400 hover:text-red-300 transition">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {tags.length === 0 && (
            <p className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>لا توجد وسوم</p>
          )}
        </div>

        <button onClick={onClose} className={`w-full mt-4 py-3 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}>
          {t.close}
        </button>
      </div>
    </div>
  );
};
TagManagerModal.displayName = 'TagManagerModal';

// ================================================================
// 📇 بطاقة البنك
// ================================================================

const BankCard = memo(({
  bank,
  onOpen,
  onEdit,
  onDelete,
  onTogglePublish,
  onArchive,
  onDuplicate,
  onManageTags,
  onManageQuestions,
  onCreateExam,
  language,
  selected,
  onSelect,
  permissions,
  isAssistant,
  isDark,
}) => {
  const t = translations[language];
  const [showCode, setShowCode] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const status = bank.archived
    ? { label: t.archived, color: 'text-gray-400', bg: 'bg-gray-500/20 border-gray-500/30' }
    : bank.is_published
      ? { label: t.published, color: 'text-green-400', bg: 'bg-green-500/20 border-green-500/30' }
      : { label: t.draft, color: 'text-yellow-400', bg: 'bg-yellow-500/20 border-yellow-500/30' };

  const progress = Math.min(100, Math.floor((bank.questions_count || 0) / 20) * 20);

  const gradeLabel = {
    prep1: t.gradePrep1,
    prep2: t.gradePrep2,
    prep3: t.gradePrep3,
    sec1: t.gradeSec1,
    sec2: t.gradeSec2,
    sec3: t.gradeSec3,
  };

  const canPublish = !isAssistant || hasPermission(permissions, 'question_bank', 'can_publish');
  const canEdit = !isAssistant || hasPermission(permissions, 'question_bank', 'can_edit');
  const canDelete = !isAssistant || hasPermission(permissions, 'question_bank', 'can_delete');

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      className={`rounded-2xl p-5 transition-all duration-300 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'} ${selected ? 'border-yellow-400 ring-2 ring-yellow-400/30' : ''}`}
    >
      <div className="flex flex-col h-full">
        {/* الرأس */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={selected}
              onChange={() => onSelect && onSelect(bank.id)}
              className="mt-1 w-4 h-4 accent-yellow-400 rounded cursor-pointer"
            />
            <div>
              <h3 className={`text-base font-bold truncate ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
                {bank.title}
              </h3>
              {bank.description && (
                <p className={`text-xs mt-0.5 line-clamp-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
                  {bank.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${status.bg} ${status.color}`}>
              {status.label}
            </span>
            <button
              onClick={() => setShowActions(!showActions)}
              className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-white/5 text-[var(--text-secondary)]' : 'hover:bg-gray-100 text-gray-500'}`}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* قائمة الإجراءات */}
        {showActions && (
          <div className={`mt-2 p-2 rounded-xl grid grid-cols-2 gap-1 ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
            <button onClick={() => onManageTags(bank)} className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition flex items-center gap-1 text-[var(--text-secondary)]">
              <Tag className="h-3 w-3" /> {t.manageTags}
            </button>
            <button onClick={() => onDuplicate(bank)} className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition flex items-center gap-1 text-[var(--text-secondary)]">
              <Copy className="h-3 w-3" /> {t.duplicateBank}
            </button>
            <button onClick={() => onArchive(bank)} className="text-xs px-2 py-1.5 rounded-lg hover:bg-white/5 transition flex items-center gap-1 text-[var(--text-secondary)]">
              {bank.archived ? <RefreshCw className="h-3 w-3" /> : <Archive className="h-3 w-3" />}
              {bank.archived ? t.restoreBank : t.archiveBank}
            </button>
          </div>
        )}

        {/* شريط التقدم */}
        <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden bg-white/10">
          <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>

        {/* التفاصيل */}
        <div className={`flex flex-wrap items-center gap-2 mt-3 text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1">
            <Clipboard className="h-3.5 w-3.5" /> {bank.questions_count || 0} {t.questionsCount}
          </span>
          {bank.course_title && (
            <span className="flex items-center gap-1">
              <BookOpen className="h-3.5 w-3.5" /> {bank.course_title}
            </span>
          )}
          {bank.grade_level && (
            <span className="flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" /> {gradeLabel[bank.grade_level] || bank.grade_level}
            </span>
          )}
          {bank.published_to_students && (
            <span className="flex items-center gap-1 text-blue-400">
              <Users className="h-3.5 w-3.5" /> {t.publishToStudentsLabel}
            </span>
          )}
          <span className="flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> {new Date(bank.created_at).toLocaleDateString('ar-EG')}
          </span>
        </div>

        {/* الوسوم */}
        {bank.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {bank.tags.slice(0, 3).map((tag) => (
              <span key={tag} className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-yellow-400/10 text-yellow-400' : 'bg-yellow-100 text-yellow-700'}`}>
                {tag}
              </span>
            ))}
            {bank.tags.length > 3 && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-white/5 text-[var(--text-secondary)]' : 'bg-gray-100 text-gray-500'}`}>
                +{bank.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* رمز الوصول */}
        {bank.student_access_code && (
          <div className="mt-2">
            <button
              onClick={() => setShowCode(!showCode)}
              className={`text-xs flex items-center gap-1 ${isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'} transition`}
            >
              <Key className="h-3 w-3" /> {t.accessCode}
            </button>
            {showCode && (
              <div className={`mt-1 p-2 rounded-lg flex items-center justify-between ${isDark ? 'bg-yellow-400/10 border border-yellow-400/20' : 'bg-yellow-50 border border-yellow-200'}`}>
                <code className="text-xs font-mono text-yellow-400">{bank.student_access_code}</code>
                <button onClick={() => { navigator.clipboard.writeText(bank.student_access_code); toast.success(t.codeCopied); }} className="text-xs text-yellow-400 hover:text-yellow-300 transition">
                  {t.copyCode}
                </button>
              </div>
            )}
          </div>
        )}

        {/* الأزرار */}
        <div className={`flex flex-wrap gap-1.5 mt-3 pt-3 border-t ${isDark ? 'border-[var(--border-color)]' : 'border-gray-200'}`}>
          <button onClick={() => onOpen(bank.id)} className="px-3 py-1.5 text-xs bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition flex items-center gap-1">
            <FolderOpen className="h-3 w-3" /> {t.open}
          </button>
          <button onClick={() => onManageQuestions(bank)} className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition flex items-center gap-1">
            <ClipboardList className="h-3 w-3" /> {t.viewQuestions}
          </button>
          {!isAssistant || hasPermission(permissions, 'exams', 'can_create') ? (
            <button onClick={() => onCreateExam(bank)} className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition flex items-center gap-1">
              <Plus className="h-3 w-3" /> {t.createExam}
            </button>
          ) : null}
          {canPublish && (
            <button onClick={() => onTogglePublish(bank)} className={`px-3 py-1.5 text-xs rounded-lg transition flex items-center gap-1 ${bank.is_published && !bank.archived ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}>
              {bank.is_published && !bank.archived ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {bank.is_published && !bank.archived ? 'إلغاء' : 'نشر'}
            </button>
          )}
          {canEdit && (
            <button onClick={() => onEdit(bank.id)} className="px-3 py-1.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition flex items-center gap-1">
              <Edit className="h-3 w-3" /> {t.edit}
            </button>
          )}
          {canDelete && (
            <button onClick={() => onDelete(bank.id)} className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition flex items-center gap-1">
              <Trash2 className="h-3 w-3" /> {t.delete}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
BankCard.displayName = 'BankCard';

// ================================================================
// 📊 لوحة التقارير
// ================================================================

const ReportsPanel = ({ banks, language, isDark }) => {
  const t = translations[language];
  const totalQuestions = banks.reduce((s, b) => s + (b.questions_count || 0), 0);

  const typeData = {
    labels: [t.typeMCQ, t.typeTrueFalse, t.typeShort, t.typeEssay, t.typeMatching],
    datasets: [{
      data: [Math.floor(totalQuestions * 0.4), Math.floor(totalQuestions * 0.2), Math.floor(totalQuestions * 0.15), Math.floor(totalQuestions * 0.15), Math.floor(totalQuestions * 0.1)],
      backgroundColor: ['#fbbf24', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'],
      borderWidth: 2,
    }],
  };

  const difficultyData = {
    labels: [t.difficultyEasy, t.difficultyMedium, t.difficultyHard, t.difficultyExpert],
    datasets: [{
      data: [Math.floor(totalQuestions * 0.3), Math.floor(totalQuestions * 0.35), Math.floor(totalQuestions * 0.25), Math.floor(totalQuestions * 0.1)],
      backgroundColor: ['#22c55e', '#fbbf24', '#f97316', '#ef4444'],
      borderWidth: 2,
    }],
  };

  const perBankData = {
    labels: banks.slice(0, 10).map(b => b.title.substring(0, 12)),
    datasets: [{
      label: t.questionsCount,
      data: banks.slice(0, 10).map(b => b.questions_count || 0),
      backgroundColor: 'rgba(251,191,36,0.6)',
      borderColor: '#fbbf24',
      borderWidth: 2,
    }],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { boxWidth: 12, padding: 12, font: { size: 11 }, color: isDark ? '#94a3b8' : '#64748b' },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 10 }, color: isDark ? '#94a3b8' : '#64748b' } },
      x: { ticks: { font: { size: 10 }, color: isDark ? '#94a3b8' : '#64748b' } },
    },
  };

  if (banks.length === 0) return null;

  return (
    <div className={`rounded-2xl p-5 mb-6 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
        <BarChart3 className="h-5 w-5 text-yellow-400" /> {t.reportsTitle}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`p-4 rounded-xl ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.questionsDistribution}</p>
          <div className="h-40">
            <Doughnut data={typeData} options={chartOptions} />
          </div>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.difficultyDistribution}</p>
          <div className="h-40">
            <Doughnut data={difficultyData} options={chartOptions} />
          </div>
        </div>
        <div className={`p-4 rounded-xl ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
          <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.questionsPerBank}</p>
          <div className="h-40">
            <Bar data={perBankData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} />
          </div>
        </div>
      </div>
    </div>
  );
};
ReportsPanel.displayName = 'ReportsPanel';

// ================================================================
// 🔍 شريط الفلترة
// ================================================================

const FilterBar = memo(({
  search, setSearch,
  filterCourse, setFilterCourse,
  filterStatus, setFilterStatus,
  filterTag, setFilterTag,
  sortBy, setSortBy,
  courses, tags, language,
  onReset,
  isDark,
}) => {
  const t = translations[language];
  const [showAdvanced, setShowAdvanced] = useState(false);

  const inputBase = `p-2.5 rounded-xl border outline-none transition text-sm ${
    isDark
      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
  }`;

  return (
    <div className={`p-4 rounded-2xl mb-4 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-400'}`} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchPlaceholder}
            className={`${inputBase} w-full pr-10`}
          />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={`${inputBase} min-w-[120px]`}>
          <option value="all">كل الحالات</option>
          <option value="published">{t.published}</option>
          <option value="draft">{t.draft}</option>
          <option value="archived">{t.archived}</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${inputBase} min-w-[120px]`}>
          <option value="newest">{t.sortNewest}</option>
          <option value="oldest">{t.sortOldest}</option>
          <option value="questions">{t.sortQuestions}</option>
          <option value="title">{t.sortTitle}</option>
        </select>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-3 py-2 rounded-xl text-sm font-semibold transition ${isDark ? 'bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20 border border-yellow-400/20' : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border border-yellow-200'}`}
        >
          <Sliders className="h-4 w-4 inline ml-1" /> {showAdvanced ? 'إخفاء' : t.advancedFilters}
        </button>
        {(filterCourse !== 'all' || filterTag !== 'all') && (
          <button onClick={onReset} className="text-xs text-red-400 hover:text-red-300 transition">
            {t.clearFilters}
          </button>
        )}
      </div>

      {showAdvanced && (
        <div className={`flex flex-wrap items-center gap-3 mt-3 pt-3 border-t ${isDark ? 'border-[var(--border-color)]' : 'border-gray-200'}`}>
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} className={`${inputBase} min-w-[120px]`}>
            <option value="all">{t.allCourses}</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} className={`${inputBase} min-w-[120px]`}>
            <option value="all">{t.filterByTag}</option>
            {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>
      )}
    </div>
  );
});
FilterBar.displayName = 'FilterBar';

// ================================================================
// 📋 شريط العمليات الجماعية
// ================================================================

const BulkActionBar = ({
  selectedCount,
  onClear,
  onDelete,
  onPublish,
  onArchive,
  onSelectAll,
  totalCount,
  language,
  isAssistant,
  permissions,
  isDark,
}) => {
  const t = translations[language];
  if (selectedCount === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl mb-4 flex flex-wrap items-center justify-between gap-3 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
      <span className={`text-sm ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{selectedCount} {t.selected}</span>
      <div className="flex flex-wrap gap-2">
        <button onClick={onSelectAll} className={`px-3 py-1.5 text-xs rounded-lg transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-secondary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-600'}`}>
          {selectedCount === totalCount ? t.deselectAllLabel : t.selectAll}
        </button>
        <button onClick={onClear} className={`px-3 py-1.5 text-xs rounded-lg transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-secondary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-600'}`}>
          {t.deselectAll}
        </button>
        {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_publish')) && (
          <button onClick={onPublish} className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition">
            {t.publishSelected}
          </button>
        )}
        {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_edit')) && (
          <button onClick={onArchive} className="px-3 py-1.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition">
            {t.archiveSelected}
          </button>
        )}
        {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_delete')) && (
          <button onClick={onDelete} className="px-3 py-1.5 text-xs bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition">
            {t.deleteSelected}
          </button>
        )}
      </div>
    </motion.div>
  );
};
BulkActionBar.displayName = 'BulkActionBar';

// ================================================================
// 📄 الصفحة الرئيسية
// ================================================================

export default function AssistantQuestionBankPage() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();

  const [language, setLanguage] = useState('ar');
  const t = translations[language];

  // ===== جلب البيانات =====
  const teacherId = assistant?.teacher_id;
  const { data: banksData, isLoading: banksLoading, mutate: mutateBanks } = useCachedFetch(
    teacherId ? `/api/assistant/question-bank?teacher_id=${teacherId}` : null
  );
  const { data: coursesData } = useCachedFetch(
    teacherId ? `/api/assistant/courses?teacher_id=${teacherId}` : null
  );
  const { data: tagsData } = useCachedFetch(
    teacherId ? `/api/assistant/question-bank/tags?teacher_id=${teacherId}` : null
  );

  // ===== حالة محلية =====
  const [search, setSearch] = useState('');
  const [filterCourse, setFilterCourse] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedBanks, setSelectedBanks] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // ===== حالات المودالات =====
  const [modals, setModals] = useState({
    createBank: false,
    editBank: false,
    confirmDelete: false,
    createExam: false,
    manageTags: false,
  });
  const [editingBank, setEditingBank] = useState(null);
  const [selectedBank, setSelectedBank] = useState(null);
  const [bankToDelete, setBankToDelete] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  // ===== تحليل البيانات =====
  const banks = banksData?.banks || [];
  const courses = coursesData?.courses || [];
  const allTags = tagsData?.tags || [];

  // ===== الفلترة والترتيب =====
  const filteredBanks = useMemo(() => {
    let result = [...banks];
    const searchTerm = debouncedSearch.trim().toLowerCase();
    if (searchTerm) {
      result = result.filter(b =>
        b.title.toLowerCase().includes(searchTerm) ||
        b.description?.toLowerCase().includes(searchTerm) ||
        b.tags?.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    }
    if (filterCourse !== 'all') result = result.filter(b => b.course_id === filterCourse);
    if (filterStatus !== 'all') {
      if (filterStatus === 'published') result = result.filter(b => b.is_published && !b.archived);
      else if (filterStatus === 'draft') result = result.filter(b => !b.is_published && !b.archived);
      else if (filterStatus === 'archived') result = result.filter(b => b.archived);
    }
    if (filterTag !== 'all') result = result.filter(b => b.tags?.includes(filterTag));

    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'questions') result.sort((a, b) => (b.questions_count || 0) - (a.questions_count || 0));
    else if (sortBy === 'title') result.sort((a, b) => a.title.localeCompare(b.title));
    return result;
  }, [banks, debouncedSearch, filterCourse, filterStatus, filterTag, sortBy]);

  const totalPages = Math.ceil(filteredBanks.length / pageSize);
  const paginatedBanks = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredBanks.slice(start, start + pageSize);
  }, [filteredBanks, currentPage, pageSize]);

  // ===== الإحصائيات =====
  const stats = useMemo(() => {
    const totalBanks = banks.length;
    const totalQuestions = banks.reduce((s, b) => s + (b.questions_count || 0), 0);
    const published = banks.filter(b => b.is_published && !b.archived).length;
    const studentAccess = banks.filter(b => b.published_to_students && !b.archived).length;
    const totalTags = banks.flatMap(b => b.tags || []).length;
    const avgQuestions = totalBanks ? Math.round(totalQuestions / totalBanks) : 0;
    const tagCount = {};
    banks.flatMap(b => b.tags || []).forEach(tag => tagCount[tag] = (tagCount[tag] || 0) + 1);
    const mostUsed = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    return { totalBanks, totalQuestions, published, studentAccess, totalTags, avgQuestions, mostUsed };
  }, [banks]);

  // ===== التحقق من الصلاحية =====
  const canView = hasPermission(permissions, 'question_bank', 'can_view');
  const canCreate = hasPermission(permissions, 'question_bank', 'can_create');
  const canEdit = hasPermission(permissions, 'question_bank', 'can_edit');
  const canDelete = hasPermission(permissions, 'question_bank', 'can_delete');
  const canPublish = hasPermission(permissions, 'question_bank', 'can_publish');

  // ===== العمليات =====
  const handleCreateBank = async (data) => {
    try {
      const res = await fetch('/api/assistant/question-bank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          ...data,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t.bankCreateError);
      toast.success(t.bankCreated);
      setModals(prev => ({ ...prev, createBank: false }));
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleUpdateBank = async (data) => {
    if (!editingBank) return;
    try {
      const res = await fetch(`/api/assistant/question-bank/${editingBank.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          ...data,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل التحديث');
      toast.success('تم التحديث');
      setModals(prev => ({ ...prev, editBank: false }));
      setEditingBank(null);
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteBank = async (id) => {
    try {
      const res = await fetch(`/api/assistant/question-bank/${id}?teacher_id=${assistant?.teacher_id}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t.deleteFailed);
      toast.success(t.deleteSuccess);
      setModals(prev => ({ ...prev, confirmDelete: false }));
      setBankToDelete(null);
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTogglePublish = async (bank) => {
    if (bank.archived) return toast.warning('لا يمكن نشر بنك مؤرشف');
    try {
      const res = await fetch(`/api/assistant/question-bank/${bank.id}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          is_published: !bank.is_published,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل التغيير');
      toast.success(!bank.is_published ? t.publishSuccess : t.unpublishSuccess);
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleArchive = async (bank) => {
    try {
      const res = await fetch(`/api/assistant/question-bank/${bank.id}/archive`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          archived: !bank.archived,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل الأرشفة');
      toast.success(bank.archived ? t.restoreSuccess : t.archiveSuccess);
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDuplicate = async (bank) => {
    try {
      const res = await fetch(`/api/assistant/question-bank/${bank.id}/duplicate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: assistant?.teacher_id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل النسخ');
      toast.success(t.duplicateSuccess);
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateExam = async (data) => {
    try {
      const res = await fetch('/api/assistant/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          title: data.title,
          description: data.description,
          bank_id: data.bankId,
          num_questions: data.numQuestions,
          duration: data.duration,
          mode: data.mode,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || t.examFailed);
      toast.success(t.examGenerated);
      setModals(prev => ({ ...prev, createExam: false }));
      router.push(`/dashboard/assistant/exams/${result.exam.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ===== العمليات الجماعية =====
  const handleSelectAll = () => {
    if (selectedBanks.length === paginatedBanks.length) {
      setSelectedBanks([]);
    } else {
      setSelectedBanks(paginatedBanks.map(b => b.id));
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete) return toast.error('ليس لديك صلاحية للحذف');
    if (selectedBanks.length === 0) return;
    if (!confirm(`حذف ${selectedBanks.length} بنك؟`)) return;
    try {
      const res = await fetch('/api/assistant/question-bank/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          ids: selectedBanks,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل الحذف');
      toast.success('تم حذف المحدد');
      setSelectedBanks([]);
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkPublish = async () => {
    if (!canPublish) return toast.error('ليس لديك صلاحية للنشر');
    if (selectedBanks.length === 0) return;
    try {
      const res = await fetch('/api/assistant/question-bank/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          ids: selectedBanks,
          action: 'publish',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل النشر');
      toast.success('تم نشر المحدد');
      setSelectedBanks([]);
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkArchive = async () => {
    if (!canEdit) return toast.error('ليس لديك صلاحية للأرشفة');
    if (selectedBanks.length === 0) return;
    try {
      const res = await fetch('/api/assistant/question-bank/bulk', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          ids: selectedBanks,
          action: 'archive',
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل الأرشفة');
      toast.success('تم أرشفة المحدد');
      setSelectedBanks([]);
      mutateBanks();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // ===== التنقل =====
  const handleOpenBank = (id) => router.push(`/dashboard/assistant/question-bank/${id}`);
  const handleManageQuestions = (bank) => router.push(`/dashboard/assistant/question-bank/${bank.id}`);
  const handleImport = () => router.push('/dashboard/assistant/question-bank/import');
  const handleAnalytics = () => router.push('/dashboard/assistant/question-bank/analytics');

  // ===== حالة التحميل =====
  const isLoading = assistantLoading || banksLoading;

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-yellow-400 mx-auto" />
          <p className={`mt-4 text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>{t.loading}</p>
        </div>
      </div>
    );
  }

  // ===== التحقق من الصلاحية =====
  if (!canView) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>غير مصرح لك</h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>لا تملك صلاحية لعرض بنوك الأسئلة</p>
          <Link href="/dashboard/assistant" className="mt-4 inline-block px-6 py-2.5 bg-yellow-400/20 text-yellow-300 rounded-xl transition">
            العودة للوحة التحكم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* إعدادات */}
        <SettingsBar isDark={isDark} toggleTheme={toggleTheme} language={language} setLanguage={setLanguage} />

        {/* الرأس */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
              {t.title}
            </h1>
            <p className={`text-sm mt-1 flex items-center gap-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
              {t.subtitle}
              <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                <Zap className="h-3 w-3 inline ml-1" /> {t.badge}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {canCreate && (
              <button
                onClick={() => setModals(prev => ({ ...prev, createBank: true }))}
                className="px-5 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" /> {t.createBank}
              </button>
            )}
            <Link
              href="/dashboard/assistant/question-bank/import"
              className="px-5 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl font-semibold transition flex items-center gap-2 border border-purple-500/30"
            >
              <Upload className="h-5 w-5" /> {t.importQuestions}
            </Link>
            <Link
              href="/dashboard/assistant/question-bank/analytics"
              className="px-5 py-2.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl font-semibold transition flex items-center gap-2 border border-blue-500/30"
            >
              <BarChart3 className="h-5 w-5" /> {t.viewAnalytics}
            </Link>
            <Link
              href="/dashboard/assistant"
              className="px-5 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl font-semibold transition flex items-center gap-2 border border-purple-500/30"
            >
              <ArrowRight className="h-5 w-5" /> العودة للوحة التحكم
            </Link>
          </div>
        </div>

        {/* الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
          <StatCard label={t.totalBanks} value={stats.totalBanks} icon={Folder} color="blue" isDark={isDark} />
          <StatCard label={t.totalQuestions} value={stats.totalQuestions} icon={Clipboard} color="green" delay={0.1} isDark={isDark} />
          <StatCard label={t.publishedBanks} value={stats.published} icon={CheckCircle} color="yellow" delay={0.2} isDark={isDark} />
          <StatCard label={t.studentsAccess} value={stats.studentAccess} icon={Users} color="purple" delay={0.3} isDark={isDark} />
          <StatCard label={t.totalTags} value={stats.totalTags} icon={Tag} color="orange" delay={0.4} isDark={isDark} />
          <StatCard label={t.avgQuestions} value={stats.avgQuestions} icon={BarChart3} color="teal" delay={0.5} subtitle={`من ${stats.totalBanks} بنك`} isDark={isDark} />
          <StatCard label={t.mostUsedTag} value={stats.mostUsed} icon={Award} color="indigo" delay={0.6} subtitle={stats.mostUsed !== '—' ? 'الأكثر استخداماً' : ''} isDark={isDark} />
        </div>

        {/* التقارير */}
        <ReportsPanel banks={banks} language={language} isDark={isDark} />

        {/* الفلترة */}
        <FilterBar
          search={search}
          setSearch={setSearch}
          filterCourse={filterCourse}
          setFilterCourse={setFilterCourse}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterTag={filterTag}
          setFilterTag={setFilterTag}
          sortBy={sortBy}
          setSortBy={setSortBy}
          courses={courses}
          tags={allTags}
          language={language}
          onReset={() => {
            setSearch('');
            setFilterCourse('all');
            setFilterStatus('all');
            setFilterTag('all');
            setSortBy('newest');
            setCurrentPage(1);
          }}
          isDark={isDark}
        />

        {/* العمليات الجماعية */}
        <BulkActionBar
          selectedCount={selectedBanks.length}
          onClear={() => setSelectedBanks([])}
          onDelete={handleBulkDelete}
          onPublish={handleBulkPublish}
          onArchive={handleBulkArchive}
          onSelectAll={handleSelectAll}
          totalCount={paginatedBanks.length}
          language={language}
          isAssistant={true}
          permissions={permissions}
          isDark={isDark}
        />

        {/* قائمة البنوك */}
        {paginatedBanks.length === 0 ? (
          <div className={`text-center py-20 rounded-3xl ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
            <Folder className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.noBanks}</h3>
            <p className={`text-sm mt-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>{t.noBanksDesc}</p>
            {canCreate && (
              <button onClick={() => setModals(prev => ({ ...prev, createBank: true }))} className="mt-4 px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition">
                {t.createNowAction}
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paginatedBanks.map((bank) => (
                <BankCard
                  key={bank.id}
                  bank={bank}
                  selected={selectedBanks.includes(bank.id)}
                  onSelect={(id) => setSelectedBanks(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])}
                  onOpen={handleOpenBank}
                  onEdit={(id) => {
                    const bankToEdit = banks.find(b => b.id === id);
                    setEditingBank(bankToEdit);
                    setModals(prev => ({ ...prev, editBank: true }));
                  }}
                  onDelete={(id) => {
                    setBankToDelete(id);
                    setModals(prev => ({ ...prev, confirmDelete: true }));
                  }}
                  onTogglePublish={handleTogglePublish}
                  onArchive={handleArchive}
                  onDuplicate={handleDuplicate}
                  onManageTags={(bank) => {
                    setSelectedBank(bank);
                    setModals(prev => ({ ...prev, manageTags: true }));
                  }}
                  onManageQuestions={handleManageQuestions}
                  onCreateExam={(bank) => {
                    setSelectedBank(bank);
                    setModals(prev => ({ ...prev, createExam: true }));
                  }}
                  language={language}
                  permissions={permissions}
                  isAssistant={true}
                  isDark={isDark}
                />
              ))}
            </div>
            {/* الترقيم */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className={`px-4 py-2 rounded-lg text-sm transition ${currentPage === 1 ? 'opacity-30 cursor-not-allowed' : isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50' : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'}`}
                >
                  {t.previous}
                </button>
                {[...Array(totalPages)].map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`px-4 py-2 rounded-lg text-sm transition ${currentPage === i + 1 ? 'bg-yellow-400 text-black font-bold' : isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50' : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'}`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className={`px-4 py-2 rounded-lg text-sm transition ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50' : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'}`}
                >
                  {t.next}
                </button>
              </div>
            )}
          </>
        )}

        {/* سجل النشاط (تجريبي) */}
        <div className={`mt-6 rounded-2xl p-5 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
            <History className="h-4 w-4 text-yellow-400" /> {t.activityLogTitle}
          </h3>
          <div className={`space-y-2 max-h-40 overflow-y-auto ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
            <div className="flex justify-between text-sm border-b border-white/5 pb-2">
              <span>تم إنشاء بنك "أسئلة الفصل الأول"</span>
              <span className="text-xs opacity-50">منذ 5 دقائق</span>
            </div>
            <div className="flex justify-between text-sm border-b border-white/5 pb-2">
              <span>تم تعديل سؤال في بنك "مراجعة نهائية"</span>
              <span className="text-xs opacity-50">منذ ساعة</span>
            </div>
            <div className="flex justify-between text-sm border-b border-white/5 pb-2">
              <span>تم نشر بنك "اختبارات قصيرة" للطلاب</span>
              <span className="text-xs opacity-50">منذ 3 ساعات</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>تم استيراد 15 سؤال من ملف</span>
              <span className="text-xs opacity-50">منذ يوم</span>
            </div>
          </div>
        </div>

        {/* ===== المودالات ===== */}
        <BankFormModal
          isOpen={modals.createBank}
          onClose={() => setModals(prev => ({ ...prev, createBank: false }))}
          onSave={handleCreateBank}
          courses={courses}
          language={language}
          isDark={isDark}
        />

        <BankFormModal
          isOpen={modals.editBank}
          onClose={() => {
            setModals(prev => ({ ...prev, editBank: false }));
            setEditingBank(null);
          }}
          onSave={handleUpdateBank}
          courses={courses}
          language={language}
          initialData={editingBank}
          isDark={isDark}
        />

        <ConfirmModal
          isOpen={modals.confirmDelete}
          onClose={() => {
            setModals(prev => ({ ...prev, confirmDelete: false }));
            setBankToDelete(null);
          }}
          onConfirm={() => { if (bankToDelete) handleDeleteBank(bankToDelete); }}
          title={t.delete}
          message={t.confirmDelete}
          isDark={isDark}
        />

        <CreateExamModal
          isOpen={modals.createExam}
          onClose={() => {
            setModals(prev => ({ ...prev, createExam: false }));
            setSelectedBank(null);
          }}
          bank={selectedBank}
          language={language}
          onSuccess={handleCreateExam}
          isDark={isDark}
        />

        <TagManagerModal
          isOpen={modals.manageTags}
          onClose={() => {
            setModals(prev => ({ ...prev, manageTags: false }));
            setSelectedBank(null);
          }}
          bank={selectedBank}
          language={language}
          onUpdate={mutateBanks}
          isDark={isDark}
        />

        <style jsx>{`
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          .animate-gradient {
            animation: gradient 8s ease infinite;
            background-size: 200% 200%;
          }
        `}</style>
      </div>
    </div>
  );
}