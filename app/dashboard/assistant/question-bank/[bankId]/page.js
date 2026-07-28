// ================================================================
// 📁 app/dashboard/assistant/question-bank/[bankId]/page.js
// 🏦 تفاصيل البنك – النسخة المتطورة للمساعد V1
// ================================================================
// - تعتمد على APIs خاصة بالمساعد (/api/assistant/question-bank)
// - دعم كامل للصلاحيات (can_view, can_edit, can_delete, can_publish)
// - دعم الثيم الفاتح/الداكن عبر useTheme
// - استخدام useCachedFetch و useAssistantData للسرعة
// - تصميم Glassmorphism فاخر مع ألوان ذهبية
// - مودالات متكاملة (إضافة/تعديل/حذف، تصدير، مشاركة، إنشاء امتحان، إدارة الوسوم)
// ================================================================

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Plus,
  Upload,
  Download,
  Share2,
  Tag,
  Trash2,
  Edit,
  Eye,
  EyeOff,
  Users,
  FileText,
  ClipboardList,
  BarChart3,
  History,
  Calendar,
  Copy,
  Key,
  X,
  AlertTriangle,
  Loader2,
  Globe,
  Sun,
  Moon,
  GraduationCap,
  BookOpen,
  Info,
  RefreshCw,
  MoreVertical,
  Save,
  ChevronLeft,
  Shield,
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

// ================================================================
// 🌍 الترجمات (مختصرة ولكن كافية)
// ================================================================

const translations = {
  ar: {
    backToBanks: 'العودة إلى البنوك',
    loading: 'جاري التحميل...',
    fetchFailed: 'فشل جلب البيانات',
    saveFailed: 'فشل الحفظ',
    deleteFailed: 'فشل الحذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    close: 'إغلاق',
    bankTitle: 'عنوان البنك',
    bankDescription: 'الوصف',
    status: 'الحالة',
    draft: 'مسودة',
    published: 'منشور',
    archived: 'مؤرشف',
    created: 'تاريخ الإنشاء',
    updated: 'آخر تحديث',
    questionsCount: 'عدد الأسئلة',
    accessCode: 'رمز الوصول',
    copyCode: 'نسخ',
    codeCopied: 'تم النسخ',
    publishToStudents: 'نشر للطلاب',
    tagsTitle: 'الوسوم',
    addQuestion: 'إضافة سؤال',
    importQuestions: 'استيراد أسئلة',
    exportBank: 'تصدير البنك',
    shareBank: 'مشاركة',
    manageTags: 'إدارة الوسوم',
    editBank: 'تعديل البنك',
    deleteBank: 'حذف البنك',
    confirmDeleteBank: 'هل أنت متأكد من حذف هذا البنك وجميع أسئلته؟',
    searchQuestions: 'ابحث في الأسئلة...',
    allTypes: 'كل الأنواع',
    allDifficulties: 'كل الصعوبات',
    typeMCQ: 'اختيار من متعدد',
    typeTrueFalse: 'صح/خطأ',
    typeShort: 'إجابة قصيرة',
    typeEssay: 'مقالي',
    typeMatching: 'مطابقة',
    difficultyEasy: 'سهل',
    difficultyMedium: 'متوسط',
    difficultyHard: 'صعب',
    difficultyExpert: 'خبير',
    questionText: 'نص السؤال',
    questionType: 'نوع السؤال',
    questionDifficulty: 'الصعوبة',
    questionOptions: 'الخيارات (افصل بينها بفاصلة)',
    questionCorrect: 'الإجابة الصحيحة',
    questionExplanation: 'شرح الإجابة',
    questionTags: 'الوسوم (افصل بينها بفاصلة)',
    editQuestion: 'تعديل سؤال',
    deleteQuestion: 'حذف سؤال',
    confirmDeleteQuestion: 'هل أنت متأكد من حذف هذا السؤال؟',
    questionDeleteSuccess: 'تم حذف السؤال',
    questionSaveSuccess: 'تم حفظ السؤال',
    noQuestions: 'لا توجد أسئلة في هذا البنك',
    selectAll: 'تحديد الكل',
    deselectAll: 'إلغاء التحديد',
    deleteSelected: 'حذف المحدد',
    selected: 'محدد',
    reportsTitle: 'التقارير والتحليلات',
    questionsDistribution: 'توزيع الأسئلة حسب النوع',
    difficultyDistribution: 'توزيع الصعوبات',
    activityLogTitle: 'سجل النشاطات',
    noActivity: 'لا توجد نشاطات',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    language: 'اللغة',
    gold: 'ذهبي',
    publishSuccess: 'تم النشر',
    unpublishSuccess: 'تم إلغاء النشر',
    course: 'الكورس',
    noData: 'لا توجد بيانات',
    addQuestionSuccess: 'تم إضافة السؤال بنجاح',
    editQuestionSuccess: 'تم تعديل السؤال بنجاح',
    questionCount: 'سؤال',
    questionsPlural: 'أسئلة',
    byTagDistribution: 'توزيع حسب الوسم',
    emptyBank: 'بنك فارغ',
    emptyBankDesc: 'ابدأ بإضافة أول سؤال إلى هذا البنك',
    addFirstQuestion: 'أضف أول سؤال',
    exportFormat: 'صيغة التصدير',
    exportFields: 'الحقول المطلوبة',
    exportSuccess: 'تم التصدير بنجاح',
    shareTitle: 'مشاركة البنك',
    shareLink: 'رابط المشاركة',
    shareEmail: 'البريد الإلكتروني',
    sharePermission: 'الصلاحية',
    shareRead: 'قراءة فقط',
    shareWrite: 'كتابة وتعديل',
    shareSuccess: 'تمت المشاركة بنجاح',
    sortNewest: 'الأحدث',
    sortOldest: 'الأقدم',
    tagName: 'اسم الوسم',
    addTag: 'إضافة',
    delete: 'حذف',
    gradeLevel: 'المرحلة الدراسية',
    gradePrep1: 'أولى إعدادي',
    gradePrep2: 'ثانية إعدادي',
    gradePrep3: 'ثالثة إعدادي',
    gradeSec1: 'أولى ثانوي',
    gradeSec2: 'ثانية ثانوي',
    gradeSec3: 'ثالثة ثانوي',
    noGrade: 'بدون مرحلة',
    createExam: 'إنشاء امتحان',
    randomExam: 'امتحان عشوائي',
    generateExam: 'توليد امتحان',
    examTitle: 'عنوان الامتحان',
    examDescription: 'وصف الامتحان',
    numQuestions: 'عدد الأسئلة',
    examDuration: 'المدة (دقائق)',
    examGenerated: 'تم إنشاء الامتحان بنجاح',
    examFailed: 'فشل إنشاء الامتحان',
    generating: 'جاري التوليد...',
    selectQuestions: 'اختيار أسئلة',
    marks: 'العلامة',
    passage: 'النص التمهيدي',
    copyLink: 'نسخ الرابط',
    linkCopied: 'تم نسخ الرابط',
    exportJSON: 'تصدير JSON',
    exportCSV: 'تصدير CSV',
    previous: 'السابق',
    next: 'التالي',
    filterByTag: 'فلترة بالوسم',
    allTags: 'كل الوسوم',
    shareLinkLabel: 'رابط البنك',
    shareEmailLabel: 'البريد الإلكتروني',
    permissionLabel: 'الصلاحية',
    shareButton: 'مشاركة',
    cancelShare: 'إلغاء',
    exportButton: 'تصدير',
    cancelExport: 'إلغاء',
    noQuestionsSelected: 'لم يتم تحديد أي أسئلة',
    selectedCount: 'محدد',
    allGrades: 'كل المراحل',
    gradePrep1Full: 'أولى إعدادي',
    gradePrep2Full: 'ثانية إعدادي',
    gradePrep3Full: 'ثالثة إعدادي',
    gradeSec1Full: 'أولى ثانوي',
    gradeSec2Full: 'ثانية ثانوي',
    gradeSec3Full: 'ثالثة ثانوي',
    distributionByGrade: 'توزيع حسب المرحلة',
    prep: 'إعدادي',
    sec: 'ثانوي',
    refresh: 'تحديث',
    tagsCount: 'الوسوم',
    restore: 'استعادة',
    archive: 'أرشفة',
    duplicate: 'نسخ',
    questionsTitle: 'الأسئلة',
  },
  en: {
    backToBanks: 'Back to Banks',
    loading: 'Loading...',
    fetchFailed: 'Failed to fetch data',
    saveFailed: 'Failed to save',
    deleteFailed: 'Failed to delete',
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    bankTitle: 'Bank Title',
    bankDescription: 'Description',
    status: 'Status',
    draft: 'Draft',
    published: 'Published',
    archived: 'Archived',
    created: 'Created',
    updated: 'Updated',
    questionsCount: 'Questions Count',
    accessCode: 'Access Code',
    copyCode: 'Copy',
    codeCopied: 'Copied',
    publishToStudents: 'Publish to Students',
    tagsTitle: 'Tags',
    addQuestion: 'Add Question',
    importQuestions: 'Import Questions',
    exportBank: 'Export Bank',
    shareBank: 'Share',
    manageTags: 'Manage Tags',
    editBank: 'Edit Bank',
    deleteBank: 'Delete Bank',
    confirmDeleteBank: 'Are you sure you want to delete this bank and all its questions?',
    searchQuestions: 'Search questions...',
    allTypes: 'All Types',
    allDifficulties: 'All Difficulties',
    typeMCQ: 'Multiple Choice',
    typeTrueFalse: 'True/False',
    typeShort: 'Short Answer',
    typeEssay: 'Essay',
    typeMatching: 'Matching',
    difficultyEasy: 'Easy',
    difficultyMedium: 'Medium',
    difficultyHard: 'Hard',
    difficultyExpert: 'Expert',
    questionText: 'Question Text',
    questionType: 'Question Type',
    questionDifficulty: 'Difficulty',
    questionOptions: 'Options (comma separated)',
    questionCorrect: 'Correct Answer',
    questionExplanation: 'Explanation',
    questionTags: 'Tags (comma separated)',
    editQuestion: 'Edit Question',
    deleteQuestion: 'Delete Question',
    confirmDeleteQuestion: 'Are you sure you want to delete this question?',
    questionDeleteSuccess: 'Question deleted',
    questionSaveSuccess: 'Question saved',
    noQuestions: 'No questions in this bank',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    deleteSelected: 'Delete Selected',
    selected: 'Selected',
    reportsTitle: 'Reports & Analytics',
    questionsDistribution: 'Questions by Type',
    difficultyDistribution: 'Difficulty Distribution',
    activityLogTitle: 'Activity Log',
    noActivity: 'No activity',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    gold: 'Gold',
    publishSuccess: 'Published',
    unpublishSuccess: 'Unpublished',
    course: 'Course',
    noData: 'No data',
    addQuestionSuccess: 'Question added successfully',
    editQuestionSuccess: 'Question updated successfully',
    questionCount: 'Question',
    questionsPlural: 'Questions',
    byTagDistribution: 'Distribution by Tag',
    emptyBank: 'Empty Bank',
    emptyBankDesc: 'Start by adding your first question to this bank',
    addFirstQuestion: 'Add First Question',
    exportFormat: 'Export Format',
    exportFields: 'Fields to Export',
    exportSuccess: 'Exported successfully',
    shareTitle: 'Share Bank',
    shareLink: 'Share Link',
    shareEmail: 'Email',
    sharePermission: 'Permission',
    shareRead: 'Read Only',
    shareWrite: 'Write & Edit',
    shareSuccess: 'Shared successfully',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    tagName: 'Tag Name',
    addTag: 'Add',
    delete: 'Delete',
    gradeLevel: 'Grade Level',
    gradePrep1: 'Prep 1',
    gradePrep2: 'Prep 2',
    gradePrep3: 'Prep 3',
    gradeSec1: 'Sec 1',
    gradeSec2: 'Sec 2',
    gradeSec3: 'Sec 3',
    noGrade: 'No Grade',
    createExam: 'Create Exam',
    randomExam: 'Random Exam',
    generateExam: 'Generate Exam',
    examTitle: 'Exam Title',
    examDescription: 'Exam Description',
    numQuestions: 'Number of Questions',
    examDuration: 'Duration (minutes)',
    examGenerated: 'Exam created successfully',
    examFailed: 'Failed to create exam',
    generating: 'Generating...',
    selectQuestions: 'Select Questions',
    marks: 'Marks',
    passage: 'Passage',
    copyLink: 'Copy Link',
    linkCopied: 'Link copied',
    exportJSON: 'Export JSON',
    exportCSV: 'Export CSV',
    previous: 'Previous',
    next: 'Next',
    filterByTag: 'Filter by Tag',
    allTags: 'All Tags',
    shareLinkLabel: 'Bank Link',
    shareEmailLabel: 'Email',
    permissionLabel: 'Permission',
    shareButton: 'Share',
    cancelShare: 'Cancel',
    exportButton: 'Export',
    cancelExport: 'Cancel',
    noQuestionsSelected: 'No questions selected',
    selectedCount: 'Selected',
    allGrades: 'All Grades',
    gradePrep1Full: 'Prep 1',
    gradePrep2Full: 'Prep 2',
    gradePrep3Full: 'Prep 3',
    gradeSec1Full: 'Sec 1',
    gradeSec2Full: 'Sec 2',
    gradeSec3Full: 'Sec 3',
    distributionByGrade: 'Distribution by Grade',
    prep: 'Prep',
    sec: 'Sec',
    refresh: 'Refresh',
    tagsCount: 'Tags',
    restore: 'Restore',
    archive: 'Archive',
    duplicate: 'Duplicate',
    questionsTitle: 'Questions',
  },
};

// ================================================================
// 🧩 المكونات المساعدة
// ================================================================

// ----- عداد متحرك -----
const AnimatedCounter = ({ target, suffix = '', duration = 1200 }) => {
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

// ----- بطاقة إحصائية -----
const StatCard = ({ label, value, icon: Icon, color, subtitle, delay, isDark }) => {
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

// ----- شريط الإعدادات -----
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

// ----- مودال تأكيد -----
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

// ================================================================
// ----- مودال إضافة/تعديل سؤال (متطور بخيارات ديناميكية) -----
// ================================================================
const QuestionFormModal = ({ isOpen, onClose, onSave, initialData, language, isDark, canEdit }) => {
  const t = translations[language];
  const [text, setText] = useState('');
  const [type, setType] = useState('mcq');
  const [difficulty, setDifficulty] = useState('medium');
  const [options, setOptions] = useState([
    { id: 1, text: '', isCorrect: false },
    { id: 2, text: '', isCorrect: false },
  ]);
  const [nextOptionId, setNextOptionId] = useState(3);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(null);
  const [explanation, setExplanation] = useState('');
  const [tags, setTags] = useState('');
  const [marks, setMarks] = useState(1);
  const [passage, setPassage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setText(initialData.question_text || '');
      setType(initialData.type || 'mcq');
      setDifficulty(initialData.difficulty || 'medium');
      setExplanation(initialData.explanation || '');
      setTags(initialData.tags ? initialData.tags.join(', ') : '');
      setMarks(initialData.marks || 1);
      setPassage(initialData.passage || '');

      if (initialData.options && Array.isArray(initialData.options)) {
        // تحويل الخيارات إلى كائنات {text, isCorrect}
        const opts = initialData.options.map((opt, idx) => {
          // إذا كانت opt نصية، نحولها لكائن
          if (typeof opt === 'string') {
            return {
              id: idx + 1,
              text: opt,
              isCorrect: opt === initialData.correct_answer,
            };
          }
          // إذا كانت opt كائنًا بالفعل
          return {
            id: idx + 1,
            text: opt.text || opt,
            isCorrect: opt.isCorrect || (opt.text === initialData.correct_answer),
          };
        });
        setOptions(opts);
        const correctIdx = opts.findIndex(o => o.isCorrect);
        setCorrectOptionIndex(correctIdx !== -1 ? correctIdx : null);
        setNextOptionId(opts.length + 1);
      } else {
        setOptions([
          { id: 1, text: '', isCorrect: false },
          { id: 2, text: '', isCorrect: false },
        ]);
        setCorrectOptionIndex(null);
        setNextOptionId(3);
      }
    } else {
      setText('');
      setType('mcq');
      setDifficulty('medium');
      setOptions([
        { id: 1, text: '', isCorrect: false },
        { id: 2, text: '', isCorrect: false },
      ]);
      setNextOptionId(3);
      setCorrectOptionIndex(null);
      setExplanation('');
      setTags('');
      setMarks(1);
      setPassage('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) {
      toast.error('الرجاء إدخال نص السؤال');
      return;
    }

    // التأكد من وجود خيارين على الأقل وكل خيار له نص
    const validOptions = options.filter(opt => opt.text.trim() !== '');
    if (validOptions.length < 2) {
      toast.error('يرجى إدخال خيارين على الأقل');
      return;
    }
    if (correctOptionIndex === null || !validOptions[correctOptionIndex]) {
      toast.error('يرجى تحديد الإجابة الصحيحة');
      return;
    }

    // بناء مصفوفة الكائنات {text, isCorrect} مع تجاهل id
    const optionsPayload = options.map(opt => ({
      text: opt.text.trim(),
      isCorrect: opt.isCorrect,
    }));

    const payload = {
      question_text: text.trim(),
      type,
      difficulty,
      options: optionsPayload,
      correct_answer: optionsPayload[correctOptionIndex].text,
      explanation: explanation.trim(),
      tags: tags.split(',').map(s => s.trim()).filter(Boolean),
      marks,
      passage: passage.trim(),
    };

    setLoading(true);
    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputBase = `w-full p-3 rounded-xl border outline-none transition text-sm ${
    isDark
      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
  }`;

  const addOption = () => {
    setOptions([...options, { id: nextOptionId, text: '', isCorrect: false }]);
    setNextOptionId(nextOptionId + 1);
  };

  const removeOption = (index) => {
    if (options.length <= 2) {
      toast.warning('يجب أن يكون هناك خياران على الأقل');
      return;
    }
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
    if (correctOptionIndex === index) {
      setCorrectOptionIndex(null);
    } else if (correctOptionIndex !== null && correctOptionIndex > index) {
      setCorrectOptionIndex(correctOptionIndex - 1);
    }
  };

  const toggleCorrect = (index) => {
    setCorrectOptionIndex(index);
    // تحديث isCorrect لكل الخيارات
    const newOptions = options.map((opt, i) => ({
      ...opt,
      isCorrect: i === index,
    }));
    setOptions(newOptions);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className={`rounded-3xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{initialData ? t.editQuestion : t.addQuestion}</h3>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t.questionText}
            rows={3}
            className={`${inputBase} resize-none`}
            required
          />
          <textarea
            value={passage}
            onChange={(e) => setPassage(e.target.value)}
            placeholder={t.passage}
            rows={2}
            className={`${inputBase} resize-none`}
          />
          <div className="grid grid-cols-2 gap-4">
            <select value={type} onChange={(e) => setType(e.target.value)} className={inputBase}>
              <option value="mcq">{t.typeMCQ}</option>
              <option value="truefalse">{t.typeTrueFalse}</option>
              <option value="short">{t.typeShort}</option>
              <option value="essay">{t.typeEssay}</option>
              <option value="matching">{t.typeMatching}</option>
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className={inputBase}>
              <option value="easy">{t.difficultyEasy}</option>
              <option value="medium">{t.difficultyMedium}</option>
              <option value="hard">{t.difficultyHard}</option>
              <option value="expert">{t.difficultyExpert}</option>
            </select>
          </div>

          {/* خيارات ديناميكية */}
          <div className="space-y-2">
            <label className={`block text-sm font-medium ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>الخيارات</label>
            {options.map((opt, index) => (
              <div key={opt.id} className="flex items-center gap-2">
                <span className={`w-6 text-center font-semibold ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{String.fromCharCode(65 + index)}.</span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index].text = e.target.value;
                    setOptions(newOptions);
                  }}
                  placeholder={`الخيار ${String.fromCharCode(65 + index)}`}
                  className={`flex-1 p-2 rounded-lg border outline-none text-sm ${
                    isDark
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                  }`}
                />
                <input
                  type="radio"
                  name="correctOption"
                  checked={correctOptionIndex === index}
                  onChange={() => toggleCorrect(index)}
                  className="w-4 h-4 accent-yellow-400 cursor-pointer"
                />
                <span className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>صحيح</span>
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    className="text-red-400 hover:text-red-300 transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className={`text-sm flex items-center gap-1 transition ${
                isDark ? 'text-yellow-400 hover:text-yellow-300' : 'text-yellow-600 hover:text-yellow-700'
              }`}
            >
              <Plus className="h-4 w-4" /> إضافة خيار
            </button>
            {correctOptionIndex !== null && options[correctOptionIndex]?.text && (
              <p className="text-sm text-green-400 mt-1">
                ✅ الإجابة الصحيحة: {options[correctOptionIndex].text}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>{t.marks}</label>
              <input
                type="number"
                value={marks}
                onChange={(e) => setMarks(parseFloat(e.target.value) || 1)}
                min={0.5}
                step={0.5}
                className={inputBase}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>{t.questionTags}</label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="وسم1, وسم2"
                className={inputBase}
              />
            </div>
          </div>
          <textarea
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            placeholder={t.questionExplanation}
            rows={2}
            className={`${inputBase} resize-none`}
          />
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !canEdit}
              className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {loading ? 'جاري...' : t.save}
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

// ----- مودال إدارة الوسوم -----
const TagManagerModal = ({ isOpen, onClose, bankId, language, onUpdate, isDark }) => {
  const t = translations[language];
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTags = useCallback(async () => {
    if (!bankId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/assistant/question-bank/tags?bank_id=${bankId}`);
      const data = await res.json();
      if (res.ok) setTags(data.tags || []);
      else toast.error('فشل جلب الوسوم');
    } catch { toast.error('فشل جلب الوسوم'); }
    finally { setLoading(false); }
  }, [bankId]);

  useEffect(() => { if (isOpen && bankId) fetchTags(); }, [isOpen, bankId, fetchTags]);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      const res = await fetch('/api/assistant/question-bank/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_id: bankId, tag: newTag.trim() }),
      });
      if (!res.ok) throw new Error('فشل الإضافة');
      toast.success(t.addTag);
      setNewTag('');
      fetchTags();
      if (onUpdate) onUpdate();
    } catch { toast.error('حدث خطأ'); }
  };

  const handleDeleteTag = async (tag) => {
    if (!confirm('هل أنت متأكد من حذف هذا الوسم؟')) return;
    try {
      const res = await fetch(`/api/assistant/question-bank/tags?bank_id=${bankId}&tag=${encodeURIComponent(tag)}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('فشل الحذف');
      toast.success('تم حذف الوسم');
      fetchTags();
      if (onUpdate) onUpdate();
    } catch { toast.error('حدث خطأ'); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className={`rounded-3xl p-8 max-w-md w-full ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.manageTags}</h3>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder={t.tagName}
            className={`flex-1 p-3 rounded-xl border outline-none transition text-sm ${
              isDark
                ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
            }`}
          />
          <button
            onClick={handleAddTag}
            className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-xl hover:scale-[1.02] transition"
          >
            {t.addTag}
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
          {tags.length === 0 && <p className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>لا توجد وسوم</p>}
        </div>
        <button onClick={onClose} className={`w-full mt-4 py-3 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}>
          {t.close}
        </button>
      </div>
    </div>
  );
};

// ----- مودال إنشاء امتحان -----
const CreateExamModal = ({ isOpen, onClose, bankId, language, onSuccess, isDark }) => {
  const t = translations[language];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('random');

  useEffect(() => {
    if (isOpen) setTitle(`امتحان من البنك`);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error(t.examTitle + ' مطلوب'); return; }
    setLoading(true);
    try {
      await onSuccess({
        title: title.trim(),
        description: description.trim(),
        bankId: bankId,
        numQuestions,
        duration,
        mode,
      });
      onClose();
    } catch { /* handled */ } finally { setLoading(false); }
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
          <h3 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.createExam}</h3>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>
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

// ----- مودال التصدير -----
const ExportModal = ({ isOpen, onClose, questions, language, onExport, isDark }) => {
  const t = translations[language];
  const [format, setFormat] = useState('json');
  const [includeFields, setIncludeFields] = useState(['question_text', 'type', 'difficulty', 'options', 'correct_answer', 'explanation', 'tags', 'marks']);

  const fieldOptions = [
    { value: 'question_text', label: t.questionText },
    { value: 'type', label: t.questionType },
    { value: 'difficulty', label: t.questionDifficulty },
    { value: 'options', label: t.questionOptions },
    { value: 'correct_answer', label: t.questionCorrect },
    { value: 'explanation', label: t.questionExplanation },
    { value: 'tags', label: t.questionTags },
    { value: 'marks', label: t.marks },
    { value: 'passage', label: t.passage },
  ];

  if (!isOpen) return null;

  const handleExport = () => {
    onExport(format, includeFields);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className={`rounded-3xl p-8 max-w-md w-full ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.exportBank}</h3>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>{t.exportFormat}</label>
            <div className="flex gap-2">
              {['json', 'csv', 'xlsx'].map(f => (
                <button
                  key={f}
                  onClick={() => setFormat(f)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                    format === f
                      ? 'bg-yellow-400 text-black'
                      : isDark
                        ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)]'
                        : 'bg-gray-100 border border-gray-200 text-gray-900'
                  }`}
                >
                  {f.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>{t.exportFields}</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {fieldOptions.map(f => (
                <label key={f.value} className={`flex items-center gap-1.5 text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'} cursor-pointer`}>
                  <input
                    type="checkbox"
                    checked={includeFields.includes(f.value)}
                    onChange={() => setIncludeFields(prev =>
                      prev.includes(f.value) ? prev.filter(v => v !== f.value) : [...prev, f.value]
                    )}
                    className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
                  />
                  {f.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleExport}
              className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20"
            >
              {t.exportButton}
            </button>
            <button
              onClick={onClose}
              className={`px-6 py-3 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}
            >
              {t.cancelExport}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----- مودال المشاركة -----
const ShareModal = ({ isOpen, onClose, bankId, language, onShare, isDark }) => {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('read');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleShare = async () => {
    setLoading(true);
    try {
      await onShare(email, permission);
      onClose();
    } catch { /* handled */ } finally { setLoading(false); }
  };

  const link = `${window.location.origin}/dashboard/assistant/question-bank/${bankId}`;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className={`rounded-3xl p-8 max-w-md w-full ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.shareTitle}</h3>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>{t.shareLinkLabel}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={link}
                readOnly
                className={`flex-1 p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
              />
              <button
                onClick={() => { navigator.clipboard.writeText(link); toast.success(t.linkCopied); }}
                className="px-4 py-2 bg-yellow-400 text-black font-bold rounded-xl hover:scale-[1.02] transition"
              >
                {t.copyLink}
              </button>
            </div>
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>{t.shareEmailLabel}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="teacher@example.com"
              className={`w-full p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>{t.permissionLabel}</label>
            <select
              value={permission}
              onChange={(e) => setPermission(e.target.value)}
              className={`w-full p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]' : 'bg-gray-50 border-gray-200 text-gray-900'}`}
            >
              <option value="read">{t.shareRead}</option>
              <option value="write">{t.shareWrite}</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button
              onClick={handleShare}
              disabled={loading}
              className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Share2 className="h-5 w-5" />}
              {loading ? '...' : t.shareButton}
            </button>
            <button
              onClick={onClose}
              className={`px-6 py-3 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}
            >
              {t.cancelShare}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ----- لوحة التقارير الداخلية -----
const BankReports = ({ questions, language, tags, isDark }) => {
  const t = translations[language];
  const total = questions.length;
  if (total === 0) return null;

  const typeCount = {};
  const difficultyCount = {};
  const tagCount = {};

  questions.forEach(q => {
    typeCount[q.type] = (typeCount[q.type] || 0) + 1;
    difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
    if (q.tags) q.tags.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1; });
  });

  const typeData = {
    labels: Object.keys(typeCount).map(key => {
      const map = { mcq: t.typeMCQ, truefalse: t.typeTrueFalse, short: t.typeShort, essay: t.typeEssay, matching: t.typeMatching };
      return map[key] || key;
    }),
    datasets: [{ data: Object.values(typeCount), backgroundColor: ['#fbbf24', '#3b82f6', '#22c55e', '#a855f7', '#ec4899'], borderWidth: 2 }],
  };

  const difficultyData = {
    labels: Object.keys(difficultyCount).map(key => {
      const map = { easy: t.difficultyEasy, medium: t.difficultyMedium, hard: t.difficultyHard, expert: t.difficultyExpert };
      return map[key] || key;
    }),
    datasets: [{ data: Object.values(difficultyCount), backgroundColor: ['#22c55e', '#fbbf24', '#f97316', '#ef4444'], borderWidth: 2 }],
  };

  const tagLabels = Object.keys(tagCount).slice(0, 6);
  const tagValues = tagLabels.map(k => tagCount[k]);

  const chartOptions = {
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10 }, color: isDark ? '#94a3b8' : '#64748b' } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 9 }, color: isDark ? '#94a3b8' : '#64748b' } },
      x: { ticks: { font: { size: 9 }, color: isDark ? '#94a3b8' : '#64748b' } },
    },
  };

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
        {tagLabels.length > 0 && (
          <div className={`p-4 rounded-xl ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`text-sm font-semibold mb-3 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.byTagDistribution}</p>
            <div className="h-40">
              <Bar
                data={{ labels: tagLabels, datasets: [{ label: t.questionsCount, data: tagValues, backgroundColor: 'rgba(251,191,36,0.7)', borderColor: '#fbbf24', borderWidth: 1.5 }] }}
                options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 8 }, color: isDark ? '#94a3b8' : '#64748b' } }, x: { ticks: { font: { size: 8 }, color: isDark ? '#94a3b8' : '#64748b' } } } }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ================================================================
// 📄 الصفحة الرئيسية – تفاصيل البنك للمساعد
// ================================================================

export default function AssistantBankDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params?.bankId;

  const { isDark, toggleTheme } = useTheme();
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();
  const [language, setLanguage] = useState('ar');
  const t = translations[language];

  // ===== جلب البيانات باستخدام useCachedFetch =====
  const teacherId = assistant?.teacher_id;
  const { data: bankData, isLoading: bankLoading, mutate: mutateBank } = useCachedFetch(
    teacherId ? `/api/assistant/question-bank/${bankId}?teacher_id=${teacherId}` : null
  );
  const { data: questionsData, isLoading: questionsLoading, mutate: mutateQuestions } = useCachedFetch(
    teacherId ? `/api/assistant/question-bank/${bankId}/questions?teacher_id=${teacherId}` : null
  );
  const { data: tagsData, mutate: mutateTags } = useCachedFetch(
    teacherId ? `/api/assistant/question-bank/${bankId}/tags?teacher_id=${teacherId}` : null
  );

  // ===== حالات محلية =====
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  const [modals, setModals] = useState({
    addQuestion: false,
    editQuestion: false,
    deleteQuestion: false,
    deleteBank: false,
    tags: false,
    createExam: false,
    export: false,
    share: false,
  });
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  const debouncedSearch = useDebounce(search, 300);

  // ===== تحليل البيانات =====
  const bank = bankData?.bank || null;
  const questions = questionsData?.questions || [];
  const tags = tagsData?.tags || [];

  // ===== صلاحيات =====
  const canView = hasPermission(permissions, 'question_bank', 'can_view');
  const canEdit = hasPermission(permissions, 'question_bank', 'can_edit');
  const canDelete = hasPermission(permissions, 'question_bank', 'can_delete');
  const canPublish = hasPermission(permissions, 'question_bank', 'can_publish');
  const canCreate = hasPermission(permissions, 'question_bank', 'can_create');

  // ===== الفلترة والترتيب =====
  const filteredQuestions = useMemo(() => {
    let result = [...questions];
    const searchTerm = debouncedSearch.trim().toLowerCase();
    if (searchTerm) {
      result = result.filter(q => q.question_text.toLowerCase().includes(searchTerm));
    }
    if (filterType !== 'all') result = result.filter(q => q.type === filterType);
    if (filterDifficulty !== 'all') result = result.filter(q => q.difficulty === filterDifficulty);
    if (filterTag !== 'all') result = result.filter(q => q.tags && q.tags.includes(filterTag));

    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'difficulty') {
      const order = { easy: 0, medium: 1, hard: 2, expert: 3 };
      result.sort((a, b) => (order[a.difficulty] || 0) - (order[b.difficulty] || 0));
    }
    return result;
  }, [questions, debouncedSearch, filterType, filterDifficulty, filterTag, sortBy]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages, currentPage]);

  // ===== الإحصائيات =====
  const stats = useMemo(() => {
    const total = questions.length;
    const byType = {};
    const byDifficulty = {};
    const byTag = {};
    questions.forEach(q => {
      byType[q.type] = (byType[q.type] || 0) + 1;
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
      if (q.tags) q.tags.forEach(tag => { byTag[tag] = (byTag[tag] || 0) + 1; });
    });
    return { total, byType, byDifficulty, byTag };
  }, [questions]);

  // ===== العمليات =====
  const handleAddQuestion = async (data) => {
    if (!canCreate) {
      toast.error('ليس لديك صلاحية لإضافة أسئلة');
      return;
    }
    if (!bankId) {
      toast.error('معرف البنك غير موجود');
      return;
    }

    // التأكد من وجود assistantId
    const assistantId = assistant?.id;
    if (!assistantId) {
      toast.error('معرف المساعد غير موجود');
      return;
    }

    const payload = {
      ...data,
      bank_id: bankId,
      teacher_id: teacherId,
    };

    try {
      console.log('📤 [add-question] sending payload:', payload);
      const res = await fetch('/api/assistant/question-bank/questions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assistant-id': assistantId, // ✅ إضافة header
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'فشل الإضافة');
      }
      toast.success(t.addQuestionSuccess);
      mutateQuestions();
      setModals(prev => ({ ...prev, addQuestion: false }));
    } catch (err) {
      toast.error(err.message);
      console.error('❌ [add-question] error:', err);
    }
  };

  const handleEditQuestion = async (data) => {
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتعديل الأسئلة');
      return;
    }
    if (!selectedQuestion) return;

    const payload = {
      ...data,
      teacher_id: teacherId,
    };

    try {
      console.log('📤 [edit-question] sending payload:', payload);
      const res = await fetch(`/api/assistant/question-bank/questions/${selectedQuestion.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'فشل التعديل');
      }
      toast.success(t.editQuestionSuccess);
      mutateQuestions();
      setSelectedQuestion(null);
      setModals(prev => ({ ...prev, editQuestion: false }));
    } catch (err) {
      toast.error(err.message);
      console.error('❌ [edit-question] error:', err);
    }
  };

  const handleDeleteQuestion = async (id) => {
    if (!canDelete) {
      toast.error('ليس لديك صلاحية لحذف الأسئلة');
      return;
    }
    try {
      const res = await fetch(`/api/assistant/question-bank/questions/${id}?teacher_id=${teacherId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل الحذف');
      toast.success(t.questionDeleteSuccess);
      mutateQuestions();
      setQuestionToDelete(null);
      setModals(prev => ({ ...prev, deleteQuestion: false }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBulkDelete = async () => {
    if (!canDelete) {
      toast.error('ليس لديك صلاحية لحذف الأسئلة');
      return;
    }
    if (selectedQuestions.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedQuestions.length} سؤال؟`)) return;
    try {
      const res = await fetch('/api/assistant/question-bank/questions/bulk', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: teacherId, ids: selectedQuestions }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل الحذف');
      toast.success(`تم حذف ${selectedQuestions.length} سؤال`);
      setSelectedQuestions([]);
      mutateQuestions();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) setSelectedQuestions([]);
    else setSelectedQuestions(filteredQuestions.map(q => q.id));
  };

  // ===== العمليات على البنك =====
  const handleTogglePublish = async () => {
    if (!canPublish) {
      toast.error('ليس لديك صلاحية لنشر البنك');
      return;
    }
    if (!bank) return;
    if (bank.archived) return toast.warning('لا يمكن نشر بنك مؤرشف');
    try {
      const res = await fetch(`/api/assistant/question-bank/${bankId}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: teacherId, is_published: !bank.is_published }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل التغيير');
      toast.success(!bank.is_published ? t.publishSuccess : t.unpublishSuccess);
      mutateBank();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteBank = async () => {
    if (!canDelete) {
      toast.error('ليس لديك صلاحية لحذف البنك');
      return;
    }
    try {
      const res = await fetch(`/api/assistant/question-bank/${bankId}?teacher_id=${teacherId}`, {
        method: 'DELETE',
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'فشل الحذف');
      toast.success('تم حذف البنك');
      router.push('/dashboard/assistant/question-bank');
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
          teacher_id: teacherId,
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
      router.push(`/dashboard/assistant/exams/${result.exam.id}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleExport = (format, fields) => {
    const selectedData = questions.map(q => {
      const obj = {};
      fields.forEach(f => { obj[f] = q[f]; });
      return obj;
    });
    if (format === 'json') {
      const blob = new Blob([JSON.stringify(selectedData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_${bankId}_questions.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'csv') {
      const header = fields.join(',');
      const rows = selectedData.map(row => fields.map(f => {
        const val = row[f];
        if (typeof val === 'string' && val.includes(',')) return `"${val}"`;
        if (Array.isArray(val)) return `"${val.join('; ')}"`;
        return val ?? '';
      }).join(','));
      const content = [header, ...rows].join('\n');
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_${bankId}_questions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      toast.info('سيتم دعم Excel قريباً');
      return;
    }
    toast.success(t.exportSuccess);
  };

  const handleShare = async (email, permission) => {
    toast.success(`تمت المشاركة مع ${email || 'المعلمين'} بصلاحية ${permission === 'read' ? 'قراءة' : 'كتابة'}`);
  };

  // ===== حالة التحميل =====
  if (assistantLoading || bankLoading || questionsLoading) {
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
          <p className={`text-sm mt-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>لا تملك صلاحية لعرض هذا البنك</p>
          <Link href="/dashboard/assistant/question-bank" className="mt-4 inline-block px-6 py-2.5 bg-yellow-400/20 text-yellow-300 rounded-xl transition">
            العودة إلى البنوك
          </Link>
        </div>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <p className={`text-lg ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.fetchFailed}</p>
          <button onClick={() => router.push('/dashboard/assistant/question-bank')} className="mt-4 px-6 py-2 bg-yellow-400/20 text-yellow-300 rounded-xl transition">
            {t.backToBanks}
          </button>
        </div>
      </div>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <div className={`min-h-screen ${isDark ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <SettingsBar isDark={isDark} toggleTheme={toggleTheme} language={language} setLanguage={setLanguage} />

        {/* رأس الصفحة */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div>
            <Link
              href="/dashboard/assistant/question-bank"
              className={`text-sm flex items-center gap-1 ${isDark ? 'text-[var(--text-secondary)] hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-600'} transition`}
            >
              <ChevronLeft className="h-4 w-4" /> {t.backToBanks}
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold">{bank.title}</h1>
            {bank.description && <p className={`text-sm mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{bank.description}</p>}
          </div>
          <div className="flex flex-wrap gap-2">
            <span className={`text-xs px-3 py-1.5 rounded-full border ${bank.archived ? 'bg-gray-500/20 text-gray-400 border-gray-500/30' : bank.is_published ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'}`}>
              {bank.archived ? t.archived : bank.is_published ? t.published : t.draft}
            </span>
            {bank.published_to_students && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-blue-500/20 text-blue-400 border-blue-500/30 flex items-center gap-1">
                <Users className="h-3 w-3" /> {t.publishToStudents}
              </span>
            )}
            {canPublish && (
              <button
                onClick={handleTogglePublish}
                className={`text-xs px-3 py-1.5 rounded-full transition ${bank.is_published && !bank.archived ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30' : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'}`}
              >
                {bank.is_published && !bank.archived ? <EyeOff className="h-3 w-3 inline ml-1" /> : <Eye className="h-3 w-3 inline ml-1" />}
                {bank.is_published && !bank.archived ? 'إلغاء النشر' : 'نشر'}
              </button>
            )}
          </div>
        </div>

        {/* معلومات البنك */}
        <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-2xl mb-6 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div>
            <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>{t.questionsCount}</p>
            <p className="text-2xl font-bold">{questions.length}</p>
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>{t.tagsCount}</p>
            <p className="text-2xl font-bold">{tags.length}</p>
          </div>
          <div>
            <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>{t.created}</p>
            <p className="text-sm">{new Date(bank.created_at).toLocaleDateString('ar-EG')}</p>
          </div>
          {bank.grade_level && (
            <div>
              <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>{t.gradeLevel}</p>
              <p className="text-sm">
                {bank.grade_level === 'prep1' && t.gradePrep1}
                {bank.grade_level === 'prep2' && t.gradePrep2}
                {bank.grade_level === 'prep3' && t.gradePrep3}
                {bank.grade_level === 'sec1' && t.gradeSec1}
                {bank.grade_level === 'sec2' && t.gradeSec2}
                {bank.grade_level === 'sec3' && t.gradeSec3}
              </p>
            </div>
          )}
          {bank.student_access_code && (
            <div className="col-span-2 md:col-span-1">
              <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>{t.accessCode}</p>
              <div className="flex items-center gap-2">
                <code className="text-sm font-mono bg-yellow-400/10 px-2 py-1 rounded">{bank.student_access_code}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(bank.student_access_code); toast.success(t.codeCopied); }}
                  className="text-xs text-yellow-400 hover:text-yellow-300 transition"
                >
                  {t.copyCode}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* الوسوم */}
        {tags.length > 0 && (
          <div className={`flex flex-wrap gap-2 mb-6 p-3 rounded-xl ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
            <span className={`text-sm font-medium ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{t.tagsTitle}:</span>
            {tags.map(tag => (
              <span key={tag} className={`text-xs px-3 py-1 rounded-full ${isDark ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20' : 'bg-yellow-100 text-yellow-700 border border-yellow-200'}`}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* أزرار الإجراءات (محددة بالصلاحيات) */}
        <div className="flex flex-wrap gap-2 mb-6">
          {canCreate && (
            <button
              onClick={() => setModals(prev => ({ ...prev, addQuestion: true }))}
              className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2 text-sm"
            >
              <Plus className="h-4 w-4" /> {t.addQuestion}
            </button>
          )}
          <Link
            href={`/dashboard/assistant/question-bank/${bankId}/import`}
            className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl font-semibold transition flex items-center gap-2 text-sm border border-purple-500/30"
          >
            <Upload className="h-4 w-4" /> {t.importQuestions}
          </Link>
          <button
            onClick={() => setModals(prev => ({ ...prev, export: true }))}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl font-semibold transition flex items-center gap-2 text-sm border border-green-500/30"
          >
            <Download className="h-4 w-4" /> {t.exportBank}
          </button>
          <button
            onClick={() => setModals(prev => ({ ...prev, share: true }))}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl font-semibold transition flex items-center gap-2 text-sm border border-blue-500/30"
          >
            <Share2 className="h-4 w-4" /> {t.shareBank}
          </button>
          {canEdit && (
            <button
              onClick={() => setModals(prev => ({ ...prev, tags: true }))}
              className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl font-semibold transition flex items-center gap-2 text-sm border border-yellow-500/30"
            >
              <Tag className="h-4 w-4" /> {t.manageTags}
            </button>
          )}
          {canCreate && (
            <button
              onClick={() => setModals(prev => ({ ...prev, createExam: true }))}
              className="px-4 py-2 bg-pink-500/20 hover:bg-pink-500/30 text-pink-400 rounded-xl font-semibold transition flex items-center gap-2 text-sm border border-pink-500/30"
            >
              <FileText className="h-4 w-4" /> {t.createExam}
            </button>
          )}
          {canDelete && (
            <button
              onClick={() => setModals(prev => ({ ...prev, deleteBank: true }))}
              className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-semibold transition flex items-center gap-2 text-sm border border-red-500/30"
            >
              <Trash2 className="h-4 w-4" /> {t.deleteBank}
            </button>
          )}
          <button
            onClick={() => { mutateBank(); mutateQuestions(); mutateTags(); }}
            className={`px-4 py-2 rounded-xl font-semibold transition flex items-center gap-2 text-sm ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-secondary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-600'}`}
          >
            <RefreshCw className="h-4 w-4" /> {t.refresh}
          </button>
        </div>

        {/* التقارير */}
        <BankReports questions={questions} language={language} tags={tags} isDark={isDark} />

        {/* قسم الأسئلة */}
        <div className={`rounded-2xl p-5 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              <ClipboardList className="h-5 w-5 text-yellow-400" /> {t.questionsTitle} ({questions.length} {questions.length === 1 ? t.questionCount : t.questionsPlural})
            </h3>
            <div className="flex flex-wrap gap-2">
              {selectedQuestions.length > 0 && (
                <>
                  {canDelete && (
                    <button
                      onClick={handleBulkDelete}
                      className="text-xs px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                    >
                      {t.deleteSelected} ({selectedQuestions.length})
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedQuestions([])}
                    className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:border-yellow-400/50 transition text-[var(--text-secondary)]"
                  >
                    {t.deselectAll}
                  </button>
                </>
              )}
              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:border-yellow-400/50 transition text-[var(--text-secondary)]"
              >
                {selectedQuestions.length === filteredQuestions.length ? t.deselectAll : t.selectAll}
              </button>
            </div>
          </div>

          {/* شريط البحث والفلترة */}
          <div className={`flex flex-wrap items-center gap-2 p-3 rounded-xl mb-4 ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchQuestions}
              className={`flex-1 min-w-[140px] p-2 rounded-lg border outline-none text-sm ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className={`p-2 rounded-lg border outline-none text-sm ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            >
              <option value="all">{t.allTypes}</option>
              <option value="mcq">{t.typeMCQ}</option>
              <option value="truefalse">{t.typeTrueFalse}</option>
              <option value="short">{t.typeShort}</option>
              <option value="essay">{t.typeEssay}</option>
              <option value="matching">{t.typeMatching}</option>
            </select>
            <select
              value={filterDifficulty}
              onChange={(e) => setFilterDifficulty(e.target.value)}
              className={`p-2 rounded-lg border outline-none text-sm ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            >
              <option value="all">{t.allDifficulties}</option>
              <option value="easy">{t.difficultyEasy}</option>
              <option value="medium">{t.difficultyMedium}</option>
              <option value="hard">{t.difficultyHard}</option>
              <option value="expert">{t.difficultyExpert}</option>
            </select>
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className={`p-2 rounded-lg border outline-none text-sm ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            >
              <option value="all">{t.allTags}</option>
              {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`p-2 rounded-lg border outline-none text-sm ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            >
              <option value="newest">{t.sortNewest}</option>
              <option value="oldest">{t.sortOldest}</option>
              <option value="difficulty">الصعوبة</option>
            </select>
          </div>

          {/* قائمة الأسئلة */}
          {filteredQuestions.length === 0 ? (
            <div className={`text-center py-12 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              <ClipboardList className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className="text-lg font-semibold">{t.noQuestions}</p>
              {canCreate && (
                <button
                  onClick={() => setModals(prev => ({ ...prev, addQuestion: true }))}
                  className="mt-3 px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
                >
                  {t.addFirstQuestion}
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
                {paginatedQuestions.map(q => {
                  const typeColor = { mcq: '#fbbf24', truefalse: '#3b82f6', short: '#22c55e', essay: '#a855f7', matching: '#ec4899' }[q.type] || '#fbbf24';
                  const difficultyColor = { easy: '#22c55e', medium: '#fbbf24', hard: '#f97316', expert: '#ef4444' }[q.difficulty] || '#fbbf24';
                  return (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all duration-200 ${isDark ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-yellow-400/50' : 'bg-gray-50 border-gray-200 hover:border-yellow-400/50'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={selectedQuestions.includes(q.id)}
                            onChange={() => setSelectedQuestions(prev =>
                              prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id]
                            )}
                            className="mt-1 w-4 h-4 accent-yellow-400 rounded cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{q.question_text}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                              <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>{q.type}</span>
                              <span className={`px-2 py-0.5 rounded-full ${isDark ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-green-100 text-green-700 border border-green-200'}`}>{q.difficulty}</span>
                              {q.marks && <span>{q.marks} نقطة</span>}
                              {q.tags?.length > 0 && (
                                <span className="flex items-center gap-1">
                                  <Tag className="h-3 w-3" /> {q.tags.join(', ')}
                                </span>
                              )}
                              {q.options && q.options.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {q.options.map((opt, i) => {
                                    const isCorrect = opt.isCorrect || (opt.text === q.correct_answer);
                                    return (
                                      <span
                                        key={i}
                                        className={`text-[10px] px-2 py-0.5 rounded-full ${
                                          isCorrect
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : isDark
                                              ? 'bg-white/5 text-gray-300 border border-white/10'
                                              : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}
                                      >
                                        {String.fromCharCode(65 + i)}. {opt.text || opt}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {canEdit && (
                            <button
                              onClick={() => { setSelectedQuestion(q); setModals(prev => ({ ...prev, editQuestion: true })); }}
                              className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-yellow-400/20 text-yellow-400' : 'hover:bg-yellow-100 text-yellow-600'}`}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => { setQuestionToDelete(q.id); setModals(prev => ({ ...prev, deleteQuestion: true })); }}
                              className={`p-1.5 rounded-lg transition ${isDark ? 'hover:bg-red-500/20 text-red-400' : 'hover:bg-red-100 text-red-600'}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className={`px-4 py-2 rounded-lg text-sm transition ${currentPage === totalPages ? 'opacity-30 cursor-not-allowed' : isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50' : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'}`}
                  >
                    {t.next}
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* سجل النشاط */}
        <div className={`mt-6 rounded-2xl p-5 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
          <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
            <History className="h-4 w-4 text-yellow-400" /> {t.activityLogTitle}
          </h3>
          <div className={`space-y-2 max-h-40 overflow-y-auto ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
            <div className="flex justify-between text-sm border-b border-white/5 pb-2">
              <span>تم إنشاء البنك</span>
              <span className="text-xs opacity-50">{new Date(bank.created_at).toLocaleDateString('ar-EG')}</span>
            </div>
            {questions.length > 0 && (
              <div className="flex justify-between text-sm border-b border-white/5 pb-2">
                <span>تم إضافة {questions.length} سؤال</span>
                <span className="text-xs opacity-50">آخر تحديث</span>
              </div>
            )}
            {bank.updated_at && bank.updated_at !== bank.created_at && (
              <div className="flex justify-between text-sm">
                <span>آخر تحديث للبنك</span>
                <span className="text-xs opacity-50">{new Date(bank.updated_at).toLocaleDateString('ar-EG')}</span>
              </div>
            )}
          </div>
        </div>

        {/* ===== المودالات ===== */}
        <QuestionFormModal
          isOpen={modals.addQuestion}
          onClose={() => setModals(prev => ({ ...prev, addQuestion: false }))}
          onSave={handleAddQuestion}
          language={language}
          isDark={isDark}
          canEdit={canEdit}
        />
        <QuestionFormModal
          isOpen={modals.editQuestion}
          onClose={() => { setModals(prev => ({ ...prev, editQuestion: false })); setSelectedQuestion(null); }}
          onSave={handleEditQuestion}
          initialData={selectedQuestion}
          language={language}
          isDark={isDark}
          canEdit={canEdit}
        />
        <ConfirmModal
          isOpen={modals.deleteQuestion}
          onClose={() => { setModals(prev => ({ ...prev, deleteQuestion: false })); setQuestionToDelete(null); }}
          onConfirm={() => { if (questionToDelete) handleDeleteQuestion(questionToDelete); }}
          title={t.deleteQuestion}
          message={t.confirmDeleteQuestion}
          isDark={isDark}
        />
        <ConfirmModal
          isOpen={modals.deleteBank}
          onClose={() => setModals(prev => ({ ...prev, deleteBank: false }))}
          onConfirm={handleDeleteBank}
          title={t.deleteBank}
          message={t.confirmDeleteBank}
          isDark={isDark}
        />
        <TagManagerModal
          isOpen={modals.tags}
          onClose={() => setModals(prev => ({ ...prev, tags: false }))}
          bankId={bankId}
          language={language}
          onUpdate={() => { mutateBank(); mutateTags(); }}
          isDark={isDark}
        />
        <CreateExamModal
          isOpen={modals.createExam}
          onClose={() => setModals(prev => ({ ...prev, createExam: false }))}
          bankId={bankId}
          language={language}
          onSuccess={handleCreateExam}
          isDark={isDark}
        />
        <ExportModal
          isOpen={modals.export}
          onClose={() => setModals(prev => ({ ...prev, export: false }))}
          questions={questions}
          language={language}
          onExport={handleExport}
          isDark={isDark}
        />
        <ShareModal
          isOpen={modals.share}
          onClose={() => setModals(prev => ({ ...prev, share: false }))}
          bankId={bankId}
          language={language}
          onShare={handleShare}
          isDark={isDark}
        />
      </div>
    </div>
  );
}