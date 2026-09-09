'use client';

// ================================================================
// 🏦 بنك الأسئلة – الصفحة الرئيسية (النسخة الضخمة V12)
// ================================================================
// تم تحديثها لتشمل:
// - نموذج إنشاء بنك بتسميات واضحة وأيقونات وحقل المرحلة الدراسية
// - تكامل كامل مع قاعدة البيانات (grade_level)
// - تحسينات الأداء والتصميم
// - إصلاح مشكلة حفظ البنك مع معالجة الأخطاء
// - جعل الكورس اختيارياً (يمكن تركه بدون كورس)
// - جاهزة للربط مع جميع ملفات القسم (التفاصيل، الاستيراد، التحليلات، إلخ)
// - إضافة صلاحيات المساعد (Assistant)
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useReducer,
  useRef,
  createContext,
  useContext,
  memo,
} from 'react';
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
import { Bar, Doughnut } from 'react-chartjs-2';

// ===== استيرادات الصلاحيات الجديدة =====
import { getCachedAssistantPermissions, hasPermission } from '@/lib/permissions';

// تسجيل مكونات Chart.js
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
// 1. الترجمات (موسعة ومحسنة)
// ================================================================
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
    // إضافات جديدة للمرحلة الدراسية
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
    // رسائل إضافية
    bankCreated: 'تم إنشاء البنك بنجاح',
    bankCreateError: 'حدث خطأ أثناء إنشاء البنك: ',
    noGradeColumn: 'المرحلة الدراسية غير موجودة في قاعدة البيانات، يرجى إضافتها',
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
  },
};

// ================================================================
// 2. دوال مساعدة
// ================================================================
function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useLocalStorage(key, initialValue) {
  const [stored, setStored] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });
  const setValue = (value) => {
    try {
      const toStore = value instanceof Function ? value(stored) : value;
      setStored(toStore);
      window.localStorage.setItem(key, JSON.stringify(toStore));
    } catch {}
  };
  return [stored, setValue];
}

// ================================================================
// 3. Reducer لإدارة الحالة
// ================================================================
const initialState = {
  banks: [],
  courses: [],
  tags: [],
  loading: true,
  error: null,
  selectedBanks: [],
  search: '',
  filterCourse: 'all',
  filterStatus: 'all',
  filterType: 'all',
  filterDifficulty: 'all',
  filterTag: 'all',
  sortBy: 'newest',
  currentPage: 1,
  pageSize: 8,
  modals: {
    createBank: false,
    editBank: false,
    confirmDelete: false,
    createExam: false,
    manageTags: false,
  },
  selectedBank: null,
  bankToDelete: null,
  editingBank: null,
};

function bankReducer(state, action) {
  switch (action.type) {
    case 'SET_BANKS':
      return { ...state, banks: action.payload, loading: false };
    case 'SET_COURSES':
      return { ...state, courses: action.payload };
    case 'SET_TAGS':
      return { ...state, tags: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_SEARCH':
      return { ...state, search: action.payload, currentPage: 1 };
    case 'SET_FILTER_COURSE':
      return { ...state, filterCourse: action.payload, currentPage: 1 };
    case 'SET_FILTER_STATUS':
      return { ...state, filterStatus: action.payload, currentPage: 1 };
    case 'SET_FILTER_TYPE':
      return { ...state, filterType: action.payload, currentPage: 1 };
    case 'SET_FILTER_DIFFICULTY':
      return { ...state, filterDifficulty: action.payload, currentPage: 1 };
    case 'SET_FILTER_TAG':
      return { ...state, filterTag: action.payload, currentPage: 1 };
    case 'SET_SORT_BY':
      return { ...state, sortBy: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'SET_SELECTED_BANKS':
      return { ...state, selectedBanks: action.payload };
    case 'TOGGLE_SELECT_BANK': {
      const id = action.payload;
      const exists = state.selectedBanks.includes(id);
      return {
        ...state,
        selectedBanks: exists
          ? state.selectedBanks.filter((i) => i !== id)
          : [...state.selectedBanks, id],
      };
    }
    case 'CLEAR_SELECTED':
      return { ...state, selectedBanks: [] };
    case 'OPEN_MODAL':
      return { ...state, modals: { ...state.modals, [action.payload]: true } };
    case 'CLOSE_MODAL':
      return { ...state, modals: { ...state.modals, [action.payload]: false } };
    case 'SET_SELECTED_BANK':
      return { ...state, selectedBank: action.payload };
    case 'SET_BANK_TO_DELETE':
      return { ...state, bankToDelete: action.payload };
    case 'SET_EDITING_BANK':
      return { ...state, editingBank: action.payload };
    case 'RESET_FILTERS':
      return {
        ...state,
        filterCourse: 'all',
        filterStatus: 'all',
        filterType: 'all',
        filterDifficulty: 'all',
        filterTag: 'all',
        search: '',
        sortBy: 'newest',
        currentPage: 1,
      };
    default:
      return state;
  }
}

// ================================================================
// 4. المكونات الفرعية (معرفة داخل الملف)
// ================================================================

// ----- عداد متحرك -----
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
  return <span ref={ref} style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{count}{suffix}</span>;
});
AnimatedCounter.displayName = 'AnimatedCounter';

// ----- بطاقة إحصائية -----
const StatCard = memo(({ label, value, icon: Icon, color, delay, subtitle }) => {
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
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        padding: '18px 16px',
        transition: 'all 0.25s ease',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ padding: '10px', borderRadius: '12px', backgroundColor: colors.bg, color: colors.text, flexShrink: 0 }}>
          <Icon style={{ height: 22, width: 22 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{label}</p>
          <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
            <AnimatedCounter target={typeof value === 'number' ? value : 0} />
          </p>
          {subtitle && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
});
StatCard.displayName = 'StatCard';

// ----- شريط الإعدادات (السمة، اللغة، اللون) -----
const SettingsBar = ({ theme, setTheme, language, setLanguage, color, setColor }) => {
  const t = translations[language];
  const themes = [
    { value: 'light', icon: Icons.Sun, label: t.themeLight },
    { value: 'dark', icon: Icons.Moon, label: t.themeDark },
  ];
  const colors = [
    { value: 'gold', bg: '#fbbf24', label: t.gold },
    { value: 'blue', bg: '#3b82f6', label: t.blue },
    { value: 'green', bg: '#22c55e', label: t.green },
    { value: 'purple', bg: '#a855f7', label: t.purple },
  ];
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', padding: '12px 20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{t.language}:</span>
        <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} style={{ padding: '5px 14px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}><Icons.Globe style={{ height: 16, width: 16 }} /> {language === 'ar' ? 'English' : 'عربي'}</button>
      </div>
      <div style={{ width: 1, height: 26, backgroundColor: 'var(--border-color)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{t.themeLight}/{t.themeDark}:</span>
        {themes.map(th => <button key={th.value} onClick={() => setTheme(th.value)} style={{ padding: '6px', borderRadius: '8px', backgroundColor: theme === th.value ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.04)', color: theme === th.value ? 'var(--primary-color)' : 'var(--text-muted)', cursor: 'pointer' }}><th.icon style={{ height: 18, width: 18 }} /></button>)}
      </div>
      <div style={{ width: 1, height: 26, backgroundColor: 'var(--border-color)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)' }}>{t.gold}:</span>
        {colors.map(c => <button key={c.value} onClick={() => setColor(c.value)} style={{ width: 24, height: 24, borderRadius: '50%', border: color === c.value ? '2.5px solid var(--text-primary)' : '2px solid transparent', backgroundColor: c.bg, cursor: 'pointer', transition: 'all 0.2s', boxShadow: color === c.value ? '0 0 0 2px var(--bg-primary)' : 'none' }} />)}
      </div>
    </div>
  );
};
SettingsBar.displayName = 'SettingsBar';

// ================================================================
// مودال إنشاء/تعديل بنك – النسخة الفاخرة V2 (مع التسميات والمرحلة)
// ================================================================
const BankFormModal = ({ isOpen, onClose, onSave, courses, language, initialData = null }) => {
  const t = translations[language];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [publishToStudents, setPublishToStudents] = useState(false);
  const [loading, setLoading] = useState(false);

  // قائمة المراحل الدراسية (من أولى إعدادي إلى ثالثة ثانوي)
  const gradeLevels = [
    { value: 'prep1', label: t.gradePrep1 || 'أولى إعدادي' },
    { value: 'prep2', label: t.gradePrep2 || 'ثانية إعدادي' },
    { value: 'prep3', label: t.gradePrep3 || 'ثالثة إعدادي' },
    { value: 'sec1', label: t.gradeSec1 || 'أولى ثانوي' },
    { value: 'sec2', label: t.gradeSec2 || 'ثانية ثانوي' },
    { value: 'sec3', label: t.gradeSec3 || 'ثالثة ثانوي' },
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
        course_id: courseId || null,   // يمكن أن يكون null (بدون كورس)
        grade_level: gradeLevel,
        is_published: isPublished,
        published_to_students: publishToStudents,
      });
      if (!initialData) {
        // إعادة تعيين النموذج بعد الحفظ الناجح
        setTitle('');
        setDescription('');
        setCourseId('');
        setGradeLevel('');
        setIsPublished(false);
        setPublishToStudents(false);
      }
    } catch (err) {
      // سيتم عرض الخطأ من خلال الوظيفة الأصلية
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 14px',
    backgroundColor: 'rgba(255,255,255,0.06)',
    border: '1px solid var(--border-color)',
    borderRadius: '12px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '14px',
    transition: 'border-color 0.3s, box-shadow 0.3s',
    fontFamily: 'inherit',
  };

  const labelStyle = {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-muted)',
    marginBottom: '6px',
    letterSpacing: '0.3px',
  };

  const iconStyle = {
    marginRight: '8px',
    verticalAlign: 'middle',
    height: 16,
    width: 16,
    color: 'var(--primary-color)',
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 50,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          padding: '32px',
          maxWidth: '520px',
          width: '100%',
          boxShadow: '0 25px 80px rgba(0,0,0,0.5)',
          position: 'relative',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* خط ذهبي متحرك */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: 'linear-gradient(90deg, #fbbf24, #f59e0b, #fbbf24)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2s linear infinite',
          }}
        />
        <style>{`
          @keyframes shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>

        <h2
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: 'var(--text-primary)',
            marginBottom: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <Icons.FolderPlus style={{ height: 28, width: 28, color: 'var(--primary-color)' }} />
          {initialData ? t.editBank : t.createBank}
        </h2>
        <p
          style={{
            fontSize: '14px',
            color: 'var(--text-muted)',
            marginBottom: '24px',
            borderBottom: '1px solid var(--border-color)',
            paddingBottom: '16px',
          }}
        >
          {initialData
            ? 'قم بتعديل بيانات البنك وتحديث المحتوى'
            : 'أنشئ بنكاً جديداً وأضف أسئلتك بذكاء'}
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* حقل الاسم */}
          <div>
            <label style={labelStyle}>
              <Icons.FileText style={iconStyle} />
              {t.bankTitleLabel || 'عنوان البنك'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="مثال: أسئلة الفصل الأول – الجبر"
              style={inputStyle}
              required
            />
          </div>

          {/* حقل الوصف */}
          <div>
            <label style={labelStyle}>
              <Icons.AlignLeft style={iconStyle} />
              {t.bankDescriptionLabel || 'الوصف (اختياري)'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="وصف مختصر لمحتوى البنك..."
              style={{ ...inputStyle, resize: 'vertical', minHeight: '70px' }}
            />
          </div>

          {/* حقل المرحلة الدراسية (جديد) */}
          <div>
            <label style={labelStyle}>
              <Icons.GraduationCap style={iconStyle} />
              {t.gradeLevel || 'المرحلة الدراسية'} <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <select
              value={gradeLevel}
              onChange={(e) => setGradeLevel(e.target.value)}
              style={inputStyle}
              required
            >
              <option value="">{t.selectGrade || 'اختر المرحلة الدراسية'}</option>
              {gradeLevels.map((g) => (
                <option key={g.value} value={g.value}>
                  {g.label}
                </option>
              ))}
            </select>
          </div>

          {/* حقل الكورس المرتبط (اختياري) */}
          <div>
            <label style={labelStyle}>
              <Icons.BookOpen style={iconStyle} />
              {t.courseLabel || 'الكورس المرتبط (اختياري)'}
            </label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              style={inputStyle}
            >
              <option value="">{t.allCourses || 'بدون كورس'}</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          {/* خيارات النشر */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: '20px',
              padding: '12px 14px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: '12px',
              border: '1px dashed var(--border-color)',
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                style={{
                  accentColor: 'var(--primary-color)',
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                }}
              />
              <Icons.Eye style={{ height: 16, width: 16, color: isPublished ? '#22c55e' : 'var(--text-muted)' }} />
              {t.publishLabel || 'منشور'}
            </label>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={publishToStudents}
                onChange={(e) => setPublishToStudents(e.target.checked)}
                style={{
                  accentColor: 'var(--primary-color)',
                  width: 18,
                  height: 18,
                  cursor: 'pointer',
                }}
              />
              <Icons.Users style={{ height: 16, width: 16, color: publishToStudents ? '#3b82f6' : 'var(--text-muted)' }} />
              {t.publishToStudentsLabel || 'نشر للطلاب'}
            </label>
          </div>

          {/* أزرار الإجراء */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              paddingTop: '8px',
              marginTop: '8px',
              borderTop: '1px solid var(--border-color)',
            }}
          >
            <button
              type="submit"
              disabled={loading}
              style={{
                flex: 2,
                backgroundColor: 'var(--primary-color)',
                color: '#000',
                fontWeight: 700,
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '16px',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 16px rgba(251,191,36,0.3)',
              }}
            >
              {loading ? (
                <>
                  <Icons.Loader2
                    style={{ height: 20, width: 20, animation: 'spin 1s linear infinite' }}
                  />
                  جاري المعالجة...
                </>
              ) : (
                <>
                  <Icons.Save style={{ height: 20, width: 20 }} />
                  {initialData ? t.updateNow : t.createNow}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                padding: '14px',
                borderRadius: '14px',
                cursor: 'pointer',
                fontSize: '16px',
                transition: 'all 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
            >
              <Icons.X style={{ height: 18, width: 18 }} />
              {t.cancel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
BankFormModal.displayName = 'BankFormModal';

// ----- مودال تأكيد الحذف -----
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmLabel, cancelLabel }) => {
  if (!isOpen) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div style={{ padding: '10px', backgroundColor: 'rgba(239,68,68,0.15)', borderRadius: '14px' }}><Icons.AlertTriangle style={{ height: 28, width: 28, color: '#ef4444' }} /></div>
          <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>{title}</h3>
        </div>
        <p style={{ fontSize: '15px', color: 'var(--text-muted)', marginBottom: '24px', lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={onConfirm} style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', fontWeight: 700, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' }}>{confirmLabel || 'نعم'}</button>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' }}>{cancelLabel || 'إلغاء'}</button>
        </div>
      </div>
    </div>
  );
};
ConfirmModal.displayName = 'ConfirmModal';

// ----- مودال إنشاء امتحان -----
const CreateExamModal = ({ isOpen, onClose, bank, language, onSuccess }) => {
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
        numQuestions: numQuestions,
        duration: duration,
        mode: mode,
      });
      onClose();
    } catch (err) {
      // handled in parent
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    backgroundColor: 'rgba(255,255,255,0.04)',
    border: '1px solid var(--border-color)',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '14px',
    transition: 'border-color 0.2s',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icons.FileText style={{ height: 24, width: 24, color: 'var(--primary-color)' }} />
          {t.createExam}
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
          {t.bankTitle}: <strong style={{ color: 'var(--text-primary)' }}>{bank?.title}</strong>
        </p>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
            <button type="button" onClick={() => setMode('random')} style={{ flex: 1, padding: '8px 16px', backgroundColor: mode === 'random' ? 'var(--primary-color)' : 'rgba(255,255,255,0.04)', color: mode === 'random' ? '#000' : 'var(--text-primary)', borderRadius: '8px', border: '1px solid', borderColor: mode === 'random' ? 'var(--primary-color)' : 'var(--border-color)', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}>
              🎲 {t.randomExam}
            </button>
            <button type="button" onClick={() => setMode('manual')} style={{ flex: 1, padding: '8px 16px', backgroundColor: mode === 'manual' ? 'var(--primary-color)' : 'rgba(255,255,255,0.04)', color: mode === 'manual' ? '#000' : 'var(--text-primary)', borderRadius: '8px', border: '1px solid', borderColor: mode === 'manual' ? 'var(--primary-color)' : 'var(--border-color)', cursor: 'pointer', fontWeight: 600, fontSize: '14px', transition: 'all 0.2s' }}>
              📋 {t.selectQuestions}
            </button>
          </div>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.examTitle} style={inputStyle} required />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.examDescription} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t.numQuestions}</label>
              <input type="number" value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))} min={1} max={100} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>{t.examDuration}</label>
              <input type="number" value={duration} onChange={(e) => setDuration(Math.max(1, parseInt(e.target.value) || 1))} min={1} max={180} style={inputStyle} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: '15px', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? <><Icons.Loader2 style={{ height: 20, width: 20, animation: 'spin 1s linear infinite' }} /> {t.generating}</> : <><Icons.Plus style={{ height: 20, width: 20 }} /> {t.generateExam}</>}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px', transition: 'all 0.2s' }}>{t.cancel}</button>
          </div>
          {mode === 'manual' && (
            <div style={{ padding: '12px', backgroundColor: 'rgba(168,85,247,0.08)', borderRadius: '10px', border: '1px solid rgba(168,85,247,0.2)' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Icons.Info style={{ height: 16, width: 16, color: '#a855f7' }} />
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

// ----- مودال إدارة الوسوم (جديد) -----
const TagManagerModal = ({ isOpen, onClose, bank, language, onUpdate }) => {
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
      const { error } = await supabase
        .from('question_bank_tags')
        .insert({ bank_id: bank.id, tag: newTag.trim() });
      if (error) throw error;
      toast.success(t.tagAdded);
      setNewTag('');
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || 'فشل إضافة الوسم');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTag = async (tag) => {
    try {
      const { error } = await supabase
        .from('question_bank_tags')
        .delete()
        .match({ bank_id: bank.id, tag });
      if (error) throw error;
      toast.success(t.tagDeleted);
      if (onUpdate) onUpdate();
    } catch (err) {
      toast.error(err.message || 'فشل حذف الوسم');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>{t.manageTags}</h2>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder={t.addTag} style={{ flex: 1, padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} />
          <button onClick={handleAddTag} disabled={loading} style={{ padding: '10px 18px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer' }}>{loading ? '...' : t.addTag}</button>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {tags.map(tag => (
            <span key={tag} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '9999px', fontSize: '13px', color: 'var(--text-primary)' }}>
              {tag}
              <button onClick={() => handleDeleteTag(tag)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0 4px' }}><Icons.X style={{ height: 14, width: 14 }} /></button>
            </span>
          ))}
          {tags.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>{t.noTags || 'لا توجد وسوم'}</span>}
        </div>
        <div style={{ marginTop: '20px' }}>
          <button onClick={onClose} style={{ width: '100%', padding: '12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '15px' }}>{t.close || 'إغلاق'}</button>
        </div>
      </div>
    </div>
  );
};
TagManagerModal.displayName = 'TagManagerModal';

// ================================================================
// بقية المكونات (BankCard, ReportsPanel, FilterBar, BulkActionBar, ActivityLog, EmptyState, Pagination)
// ================================================================

// ----- بطاقة البنك (محسنة) مع صلاحيات المساعد -----
const BankCard = memo(({
  bank,
  onOpen,
  onEdit,
  onDelete,
  onTogglePublish,
  onArchive,
  onDuplicate,
  onExport,
  onShare,
  onManageTags,
  onManageQuestions,
  onCreateExam,
  language,
  selected,
  onSelect,
  permissions,      // <-- جديد
  isAssistant,      // <-- جديد
}) => {
  const t = translations[language];
  const [showCode, setShowCode] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const copyCode = () => {
    if (bank.student_access_code) {
      navigator.clipboard.writeText(bank.student_access_code);
      toast.success(t.codeCopied);
    }
  };

  const getStatusBadge = () => {
    if (bank.archived) return { label: t.archived, color: 'rgba(107,114,128,0.2)', text: '#9ca3af', border: 'rgba(107,114,128,0.2)' };
    if (bank.is_published) return { label: t.published, color: 'rgba(34,197,94,0.2)', text: '#22c55e', border: 'rgba(34,197,94,0.2)' };
    return { label: t.draft, color: 'rgba(251,191,36,0.2)', text: '#fbbf24', border: 'rgba(251,191,36,0.2)' };
  };
  const status = getStatusBadge();
  const progress = Math.min(100, Math.floor((bank.questions_count || 0) / 20) * 20);

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} whileHover={{ y: -4 }} style={{ backgroundColor: 'var(--bg-card)', border: selected ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', borderRadius: '16px', padding: '20px', transition: 'box-shadow 0.3s, border-color 0.2s', boxShadow: selected ? '0 0 30px rgba(251,191,36,0.15)' : '0 2px 10px rgba(0,0,0,0.05)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* الرأس */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, minWidth: 0 }}>
            <input type="checkbox" checked={selected} onChange={() => onSelect && onSelect(bank.id)} style={{ marginTop: '4px', accentColor: 'var(--primary-color)', width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bank.title}</h3>
              {bank.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '4px 0 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{bank.description}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
            <span style={{ padding: '2px 10px', fontSize: '10px', fontWeight: 500, borderRadius: '9999px', border: `1px solid ${status.border}`, backgroundColor: status.color, color: status.text }}>{status.label}</span>
            <button onClick={() => setShowActions(!showActions)} style={{ padding: '4px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><Icons.MoreVertical style={{ height: 16, width: 16 }} /></button>
          </div>
        </div>

        {/* قائمة الإجراءات */}
        {showActions && (
          <div style={{ marginTop: '10px', padding: '10px', backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '10px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', zIndex: 10 }}>
            <button onClick={() => onExport?.(bank)} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Download style={{ height: 12, width: 12 }} /> {t.exportJSON}</button>
            <button onClick={() => onShare?.(bank)} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Share2 style={{ height: 12, width: 12 }} /> {t.shareBank}</button>
            <button onClick={() => onArchive(bank)} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>{bank.archived ? <Icons.RefreshCw style={{ height: 12, width: 12 }} /> : <Icons.Archive style={{ height: 12, width: 12 }} />} {bank.archived ? t.restoreBank : t.archiveBank}</button>
            <button onClick={() => onDuplicate(bank)} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Copy style={{ height: 12, width: 12 }} /> {t.duplicateBank}</button>
            <button onClick={() => onManageTags(bank)} style={{ fontSize: '12px', padding: '6px 8px', borderRadius: '6px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', gridColumn: 'span 2' }}><Icons.Tag style={{ height: 12, width: 12 }} /> {t.manageTags}</button>
          </div>
        )}

        {/* شريط التقدم */}
        <div style={{ marginTop: '10px', width: '100%', height: '6px', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: '9999px', overflow: 'hidden' }}>
          <div style={{ height: '100%', backgroundColor: 'var(--primary-color)', transition: 'width 0.7s ease', width: `${progress}%` }} />
        </div>

        {/* التفاصيل */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Clipboard style={{ height: 14, width: 14 }} /> {bank.questions_count || 0} {t.questionsCount}</span>
          {bank.course_title && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Book style={{ height: 14, width: 14 }} /> {bank.course_title}</span>}
          {bank.grade_level && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Icons.GraduationCap style={{ height: 14, width: 14 }} />
              {bank.grade_level === 'prep1' && 'أولى إعدادي'}
              {bank.grade_level === 'prep2' && 'ثانية إعدادي'}
              {bank.grade_level === 'prep3' && 'ثالثة إعدادي'}
              {bank.grade_level === 'sec1' && 'أولى ثانوي'}
              {bank.grade_level === 'sec2' && 'ثانية ثانوي'}
              {bank.grade_level === 'sec3' && 'ثالثة ثانوي'}
            </span>
          )}
          {bank.published_to_students && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#3b82f6' }}><Icons.Users style={{ height: 14, width: 14 }} /> {t.publishToStudents}</span>}
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Calendar style={{ height: 14, width: 14 }} /> {new Date(bank.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
        </div>

        {/* الوسوم */}
        {bank.tags && bank.tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
            {bank.tags.slice(0, 3).map(tag => <span key={tag} style={{ padding: '2px 8px', fontSize: '9px', backgroundColor: 'rgba(251,191,36,0.1)', color: 'var(--primary-color)', borderRadius: '9999px' }}>{tag}</span>)}
            {bank.tags.length > 3 && <span style={{ padding: '2px 8px', fontSize: '9px', color: 'var(--text-muted)' }}>+{bank.tags.length - 3}</span>}
          </div>
        )}

        {/* رمز الوصول */}
        {bank.student_access_code && (
          <div style={{ marginTop: '8px' }}>
            <button onClick={() => setShowCode(!showCode)} style={{ fontSize: '12px', color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Key style={{ height: 12, width: 12 }} /> {t.accessCode}</button>
            {showCode && <div style={{ marginTop: '4px', padding: '6px 10px', backgroundColor: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><code style={{ fontSize: '12px', color: 'var(--primary-color)', fontFamily: 'monospace' }}>{bank.student_access_code}</code><button onClick={copyCode} style={{ fontSize: '12px', color: 'var(--primary-color)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>{t.copyCode}</button></div>}
          </div>
        )}

        {/* الأزرار الأساسية مع صلاحيات المساعد */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          {/* زر الفتح – يظهر دائماً */}
          <button onClick={() => onOpen(bank.id)} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.FolderOpen style={{ height: 12, width: 12 }} /> {t.open}</button>

          {/* زر عرض الأسئلة – يظهر دائماً (عرض فقط) */}
          <button onClick={() => onManageQuestions(bank)} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.ClipboardList style={{ height: 12, width: 12 }} /> {t.viewQuestions}</button>

          {/* زر إنشاء امتحان – يظهر فقط إذا كان معلم أو مساعد لديه can_create على exams */}
          {(!isAssistant || hasPermission(permissions, 'exams', 'can_create')) && (
            <button onClick={() => onCreateExam(bank)} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Plus style={{ height: 12, width: 12 }} /> {t.createExam}</button>
          )}

          {/* زر النشر/إلغاء النشر – يظهر فقط إذا كان معلم أو مساعد لديه can_publish */}
          {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_publish')) && (
            <button onClick={() => onTogglePublish(bank)} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: bank.is_published && !bank.archived ? 'rgba(251,191,36,0.15)' : 'rgba(34,197,94,0.15)', color: bank.is_published && !bank.archived ? '#fbbf24' : '#22c55e', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>{bank.is_published && !bank.archived ? <Icons.EyeOff style={{ height: 12, width: 12 }} /> : <Icons.Eye style={{ height: 12, width: 12 }} />} {bank.is_published && !bank.archived ? 'إلغاء' : 'نشر'}</button>
          )}

          {/* زر التعديل – يظهر فقط إذا كان معلم أو مساعد لديه can_edit */}
          {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_edit')) && (
            <button onClick={() => onEdit(bank.id)} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Edit style={{ height: 12, width: 12 }} /> {t.edit}</button>
          )}

          {/* زر الحذف – يظهر فقط إذا كان معلم أو مساعد لديه can_delete */}
          {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_delete')) && (
            <button onClick={() => onDelete(bank.id)} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '8px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}><Icons.Trash2 style={{ height: 12, width: 12 }} /> {t.delete}</button>
          )}
        </div>
      </div>
    </motion.div>
  );
});
BankCard.displayName = 'BankCard';

// ----- لوحة التقارير والتحليلات -----
const ReportsPanel = memo(({ banks, language }) => {
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
        labels: { boxWidth: 12, padding: 12, font: { size: 11, weight: 'bold' }, color: 'var(--text-muted)' },
      },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 10 }, color: 'var(--text-muted)' } },
      x: { ticks: { font: { size: 10 }, color: 'var(--text-muted)' } },
    },
  };

  if (banks.length === 0) return null;

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
      <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Icons.BarChart3 style={{ height: 22, width: 22, color: 'var(--primary-color)' }} /> {t.reportsTitle}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px 0' }}>{t.questionsDistribution}</p>
          <div style={{ height: 140 }}><Doughnut data={typeData} options={chartOptions} /></div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px 0' }}>{t.difficultyDistribution}</p>
          <div style={{ height: 140 }}><Doughnut data={difficultyData} options={chartOptions} /></div>
        </div>
        <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px 0' }}>{t.questionsPerBank}</p>
          <div style={{ height: 140 }}><Bar data={perBankData} options={{ ...chartOptions, plugins: { ...chartOptions.plugins, legend: { display: false } } }} /></div>
        </div>
      </div>
    </div>
  );
});
ReportsPanel.displayName = 'ReportsPanel';

// ----- شريط الفلترة والبحث (محسن) -----
const FilterBar = memo(({
  search, setSearch,
  filterCourse, setFilterCourse,
  filterStatus, setFilterStatus,
  filterType, setFilterType,
  filterDifficulty, setFilterDifficulty,
  filterTag, setFilterTag,
  sortBy, setSortBy,
  courses, tags, language,
  onReset,
}) => {
  const t = translations[language];
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px', padding: '16px 20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Icons.Search style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', height: 18, width: 18, color: 'var(--text-muted)' }} />
          <input type="text" value={search || ''} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchPlaceholder} style={{ width: '100%', padding: '10px 40px 10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', transition: 'border-color 0.2s' }} onFocus={(e) => e.currentTarget.style.borderColor = 'var(--primary-color)'} onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'} />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', minWidth: '120px', cursor: 'pointer' }}>
          <option value="all">كل الحالات</option>
          <option value="published">{t.published}</option>
          <option value="draft">{t.draft}</option>
          <option value="archived">{t.archived}</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', minWidth: '120px', cursor: 'pointer' }}>
          <option value="newest">{t.sortNewest}</option>
          <option value="oldest">{t.sortOldest}</option>
          <option value="questions">{t.sortQuestions}</option>
          <option value="title">{t.sortTitle}</option>
        </select>
        <button onClick={() => setShowAdvanced(!showAdvanced)} style={{ padding: '8px 16px', backgroundColor: 'rgba(251,191,36,0.1)', color: 'var(--primary-color)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', transition: 'all 0.2s' }}>
          <Icons.Sliders style={{ height: 16, width: 16 }} /> {showAdvanced ? 'إخفاء' : t.advancedFilters}
        </button>
        {(filterCourse !== 'all' || filterType !== 'all' || filterDifficulty !== 'all' || filterTag !== 'all') && (
          <button onClick={onReset} style={{ padding: '8px 16px', backgroundColor: 'rgba(239,68,68,0.08)', color: '#ef4444', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, transition: 'all 0.2s' }}>
            {t.clearFilters}
          </button>
        )}
      </div>
      {showAdvanced && (
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
          <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)} style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', minWidth: '120px', cursor: 'pointer' }}>
            <option value="all">{t.allCourses}</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
          </select>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', minWidth: '120px', cursor: 'pointer' }}>
            <option value="all">{t.allTypes}</option>
            <option value="mcq">{t.typeMCQ}</option>
            <option value="truefalse">{t.typeTrueFalse}</option>
            <option value="short">{t.typeShort}</option>
            <option value="essay">{t.typeEssay}</option>
            <option value="matching">{t.typeMatching}</option>
          </select>
          <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', minWidth: '120px', cursor: 'pointer' }}>
            <option value="all">{t.allDifficulties}</option>
            <option value="easy">{t.difficultyEasy}</option>
            <option value="medium">{t.difficultyMedium}</option>
            <option value="hard">{t.difficultyHard}</option>
            <option value="expert">{t.difficultyExpert}</option>
          </select>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={{ padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px', minWidth: '120px', cursor: 'pointer' }}>
            <option value="all">{t.filterByTag}</option>
            {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
        </div>
      )}
    </div>
  );
});
FilterBar.displayName = 'FilterBar';

// ----- شريط العمليات الجماعية (مع صلاحيات المساعد) -----
const BulkActionBar = ({
  selectedCount,
  onClear,
  onDelete,
  onPublish,
  onArchive,
  onSelectAll,
  totalCount,
  language,
  isAssistant,        // <-- جديد
  permissions,        // <-- جديد
}) => {
  const t = translations[language];
  if (selectedCount === 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px 16px', marginBottom: '16px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
      <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{selectedCount} {t.selected}</span>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <button onClick={onSelectAll} style={{ padding: '6px 14px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer' }}>{selectedCount === totalCount ? t.deselectAllLabel : t.selectAll}</button>
        <button onClick={onClear} style={{ padding: '6px 14px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-muted)', cursor: 'pointer' }}>{t.deselectAll}</button>
        {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_publish')) && (
          <button onClick={onPublish} style={{ padding: '6px 14px', fontSize: '12px', backgroundColor: 'rgba(34,197,94,0.15)', color: '#22c55e', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>{t.publishSelected}</button>
        )}
        {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_edit')) && (
          <button onClick={onArchive} style={{ padding: '6px 14px', fontSize: '12px', backgroundColor: 'rgba(251,191,36,0.15)', color: '#fbbf24', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>{t.archiveSelected}</button>
        )}
        {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_delete')) && (
          <button onClick={onDelete} style={{ padding: '6px 14px', fontSize: '12px', backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>{t.deleteSelected}</button>
        )}
      </div>
    </motion.div>
  );
};
BulkActionBar.displayName = 'BulkActionBar';

// ----- سجل النشاط (تجريبي) -----
const ActivityLog = memo(({ language }) => {
  const t = translations[language];
  const activities = [
    { action: 'تم إنشاء بنك "أسئلة الفصل الأول"', time: 'منذ 5 دقائق' },
    { action: 'تم تعديل سؤال في بنك "مراجعة نهائية"', time: 'منذ ساعة' },
    { action: 'تم نشر بنك "اختبارات قصيرة" للطلاب', time: 'منذ 3 ساعات' },
    { action: 'تم استيراد 15 سؤال من ملف', time: 'منذ يوم' },
  ];
  return (
    <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '18px', marginTop: '24px' }}>
      <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Icons.History style={{ height: 20, width: 20, color: 'var(--primary-color)' }} /> {t.activityLogTitle}
      </h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
        {activities.map((act, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '8px', borderBottom: i < activities.length - 1 ? '1px solid var(--border-color)' : 'none' }}>
            <span style={{ color: 'var(--text-primary)' }}>{act.action}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{act.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
ActivityLog.displayName = 'ActivityLog';

// ----- حالة فارغة -----
const EmptyState = ({ t, onCreate }) => (
  <div style={{ textAlign: 'center', padding: '60px 0', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px' }}>
    <Icons.Folder style={{ height: 64, width: 64, color: 'var(--text-muted)', margin: '0 auto 16px', opacity: 0.3 }} />
    <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t.noBanks}</h3>
    <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '6px 0 20px 0' }}>{t.noBanksDesc}</p>
    <button onClick={onCreate} style={{ padding: '10px 28px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px', boxShadow: '0 4px 16px rgba(251,191,36,0.25)' }}>{t.createNowAction}</button>
  </div>
);

// ----- ترقيم الصفحات -----
const Pagination = ({ currentPage, totalPages, setPage, t }) => {
  if (totalPages <= 1) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '24px' }}>
      <button onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.3 : 1 }}>{t.previous}</button>
      {[...Array(totalPages)].map((_, i) => (
        <button key={i} onClick={() => setPage(i + 1)} style={{ padding: '8px 16px', fontSize: '14px', borderRadius: '8px', border: 'none', backgroundColor: currentPage === i + 1 ? 'var(--primary-color)' : 'var(--bg-card)', color: currentPage === i + 1 ? '#000' : 'var(--text-primary)', fontWeight: currentPage === i + 1 ? 700 : 400, cursor: 'pointer', border: currentPage === i + 1 ? 'none' : '1px solid var(--border-color)' }}>{i + 1}</button>
      ))}
      <button onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} style={{ padding: '8px 16px', fontSize: '14px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.3 : 1 }}>{t.next}</button>
    </div>
  );
};

// ================================================================
// 5. الصفحة الرئيسية (الجزء الأساسي)
// ================================================================
export default function QuestionBankPage() {
  const router = useRouter();
  const [lang, setLang] = useLocalStorage('qb_lang', 'ar');
  const [theme, setTheme] = useLocalStorage('qb_theme', 'dark');
  const [color, setColor] = useLocalStorage('qb_color', 'gold');
  const t = translations[lang];

  // ===== حالات الصلاحيات =====
  const [permissions, setPermissions] = useState(null);
  const [isAssistant, setIsAssistant] = useState(false);

  const [state, dispatch] = useReducer(bankReducer, initialState);
  const {
    banks,
    courses,
    tags,
    loading,
    selectedBanks,
    search,
    filterCourse,
    filterStatus,
    filterType,
    filterDifficulty,
    filterTag,
    sortBy,
    currentPage,
    pageSize,
    modals,
    selectedBank,
    bankToDelete,
    editingBank,
  } = state;

  const debouncedSearch = useDebounce(search, 300);

  // تطبيق السمات
  useEffect(() => {
    const root = document.documentElement;
    const isDark = theme === 'dark';
    const primaryColors = { gold: '#fbbf24', blue: '#3b82f6', green: '#22c55e', purple: '#a855f7' };
    const primary = primaryColors[color] || '#fbbf24';
    root.style.setProperty('--bg-primary', isDark ? '#0b0e1a' : '#f0f2f5');
    root.style.setProperty('--bg-card', isDark ? 'rgba(30,36,51,0.85)' : 'rgba(255,255,255,0.9)');
    root.style.setProperty('--text-primary', isDark ? '#f1f5f9' : '#0f172a');
    root.style.setProperty('--text-muted', isDark ? '#94a3b8' : '#64748b');
    root.style.setProperty('--border-color', isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)');
    root.style.setProperty('--primary-color', primary);
  }, [theme, color]);

  // جلب البيانات مع صلاحيات المساعد
  const fetchData = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        router.push('/login');
        return;
      }

      // ===== جلب صلاحيات المساعد =====
      const perms = await getCachedAssistantPermissions(user.id);
      if (perms !== null) {
        setIsAssistant(true);
        setPermissions(perms);
      } else {
        setIsAssistant(false);
        setPermissions(null);
      }

      // ===== التحقق من صلاحية العرض =====
      if (isAssistant && !hasPermission(perms, 'question_bank', 'can_view')) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // ===== جلب الكورسات =====
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id,title')
        .eq('teacher_id', user.id);
      dispatch({ type: 'SET_COURSES', payload: coursesData || [] });

      // ===== جلب بنوك الأسئلة =====
      const { data: banksData } = await supabase
        .from('question_banks')
        .select(`
          *,
          courses!left(title),
          questions:questions(count)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      const bankIds = (banksData || []).map(b => b.id);
      let tagsMap = {};
      let allTags = [];
      if (bankIds.length > 0) {
        const { data: tagsData } = await supabase
          .from('question_bank_tags')
          .select('bank_id, tag')
          .in('bank_id', bankIds);
        tagsData?.forEach(row => {
          if (!tagsMap[row.bank_id]) tagsMap[row.bank_id] = [];
          tagsMap[row.bank_id].push(row.tag);
          if (!allTags.includes(row.tag)) allTags.push(row.tag);
        });
      }

      const formatted = (banksData || []).map(b => {
        const count = b.questions && b.questions.length > 0 ? b.questions[0].count : 0;
        return {
          ...b,
          course_title: b.courses?.title || null,
          questions_count: count,
          tags: tagsMap[b.id] || [],
          courses: undefined,
          questions: undefined,
        };
      });

      dispatch({ type: 'SET_BANKS', payload: formatted });
      dispatch({ type: 'SET_TAGS', payload: allTags });
      dispatch({ type: 'SET_ERROR', payload: null });
    } catch (err) {
      console.error(err);
      toast.error(t.fetchFailed);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [router, t, isAssistant]); // إضافة isAssistant و permissions ك dependencies

  useEffect(() => {
    fetchData();
    const subscription = supabase
      .channel('question_banks_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_banks' }, () => fetchData())
      .subscribe();
    return () => subscription.unsubscribe();
  }, [fetchData]);

  // الفلترة والترتيب
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
    // filterType و filterDifficulty سيتم تطبيقها عند جلب الأسئلة الفعلية

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

  useEffect(() => {
    if (currentPage > totalPages) dispatch({ type: 'SET_CURRENT_PAGE', payload: Math.max(1, totalPages) });
  }, [totalPages, currentPage]);

  // الإحصائيات
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

  // ================================================================
  // 🔥 دوال العمليات (المحسّنة لحل مشكلة الحفظ)
  // ================================================================
  const handleCreateBank = async (data) => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error('يجب تسجيل الدخول أولاً');
        return;
      }

      const bankData = {
        teacher_id: user.id,
        title: data.title.trim(),
        description: data.description?.trim() || null,
        course_id: data.course_id || null,
        grade_level: data.grade_level || null,
        is_published: data.is_published || false,
        published_to_students: data.published_to_students || false,
        archived: false,
        student_access_code: data.published_to_students
          ? Math.random().toString(36).substring(2, 8).toUpperCase()
          : null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log('بيانات البنك المراد حفظها:', bankData);

      const { data: insertedData, error: insertError } = await supabase
        .from('question_banks')
        .insert(bankData)
        .select();

      if (insertError) {
        console.error('خطأ في الإدراج:', insertError);
        if (insertError.code === '42703') {
          toast.error('عمود "المرحلة الدراسية" غير موجود في قاعدة البيانات. يرجى إضافته أولاً.');
        } else {
          toast.error('فشل إنشاء البنك: ' + insertError.message);
        }
        throw insertError;
      }

      toast.success(t.bankCreated || 'تم إنشاء البنك بنجاح');
      dispatch({ type: 'CLOSE_MODAL', payload: 'createBank' });
      fetchData();
    } catch (err) {
      console.error('خطأ غير متوقع:', err);
      if (!err.message?.includes('عمود')) {
        toast.error(err.message || 'فشل إنشاء البنك');
      }
    }
  };

  const handleUpdateBank = async (data) => {
    if (!editingBank) return;
    try {
      const { error } = await supabase
        .from('question_banks')
        .update({
          title: data.title.trim(),
          description: data.description?.trim() || null,
          course_id: data.course_id || null,
          grade_level: data.grade_level || null,
          is_published: data.is_published || false,
          published_to_students: data.published_to_students || false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingBank.id);
      if (error) throw error;
      toast.success('تم التحديث');
      dispatch({ type: 'CLOSE_MODAL', payload: 'editBank' });
      dispatch({ type: 'SET_EDITING_BANK', payload: null });
      fetchData();
    } catch (err) {
      toast.error(err.message || 'فشل التحديث');
    }
  };

  const handleDeleteBank = async (id) => {
    try {
      const { error } = await supabase.from('question_banks').delete().eq('id', id);
      if (error) throw error;
      toast.success(t.deleteSuccess);
      dispatch({ type: 'CLOSE_MODAL', payload: 'confirmDelete' });
      dispatch({ type: 'SET_BANK_TO_DELETE', payload: null });
      fetchData();
    } catch (err) {
      toast.error(err.message || t.deleteFailed);
    }
  };

  const handleTogglePublish = async (bank) => {
    if (bank.archived) return toast.warning('لا يمكن نشر بنك مؤرشف');
    try {
      await supabase
        .from('question_banks')
        .update({ is_published: !bank.is_published, updated_at: new Date().toISOString() })
        .eq('id', bank.id);
      toast.success(!bank.is_published ? t.publishSuccess : t.unpublishSuccess);
      fetchData();
    } catch (err) { toast.error(err.message || 'فشل التغيير'); }
  };

  const handleArchive = async (bank) => {
    try {
      await supabase
        .from('question_banks')
        .update({ archived: !bank.archived, updated_at: new Date().toISOString() })
        .eq('id', bank.id);
      toast.success(bank.archived ? t.restoreSuccess : t.archiveSuccess);
      fetchData();
    } catch (err) { toast.error(err.message || 'فشل الأرشفة'); }
  };

  const handleDuplicate = async (bank) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');
      const newBank = {
        teacher_id: user.id,
        title: `${bank.title} (نسخة)`,
        description: bank.description,
        course_id: bank.course_id,
        grade_level: bank.grade_level,
        is_published: false,
        published_to_students: false,
        archived: false,
        student_access_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await supabase.from('question_banks').insert(newBank);
      toast.success(t.duplicateSuccess);
      fetchData();
    } catch (err) { toast.error(err.message || 'فشل النسخ'); }
  };

  const handleCreateExam = async (data) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');
      let questions = [];
      if (data.mode === 'random') {
        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('bank_id', data.bankId)
          .limit(data.numQuestions || 10);
        questions = qData || [];
        questions.sort(() => Math.random() - 0.5);
      } else {
        toast.warning('الوضع اليدوي قيد التطوير');
        return;
      }
      if (questions.length === 0) {
        toast.warning(t.noQuestionsInBank);
        return;
      }
      const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
      const examData = {
        teacher_id: user.id,
        title: data.title,
        description: data.description || '',
        duration_minutes: data.duration || 30,
        total_marks: totalMarks,
        passing_marks: Math.round(totalMarks * 0.6),
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        shuffle_questions: true,
        shuffle_options: true,
        allow_backward: false,
        show_results_immediately: true,
        attempts_allowed: 1,
        is_published: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single();
      if (examError) throw examError;
      const examQuestions = questions.map((q, idx) => ({
        exam_id: exam.id,
        question_text: q.question_text,
        type: q.type || 'mcq',
        difficulty: q.difficulty || 'medium',
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        explanation: q.explanation || '',
        marks: q.marks || 1,
        order_index: idx,
        bank_question_id: q.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));
      await supabase.from('exam_questions').insert(examQuestions);
      toast.success(t.examGenerated);
      router.push(`/dashboard/teacher/exams/${exam.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || t.examFailed);
    }
  };

  // العمليات الجماعية مع صلاحيات المساعد
  const handleSelectAll = () => {
    if (selectedBanks.length === paginatedBanks.length) {
      dispatch({ type: 'CLEAR_SELECTED' });
    } else {
      dispatch({ type: 'SET_SELECTED_BANKS', payload: paginatedBanks.map(b => b.id) });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedBanks.length === 0) return;

    if (isAssistant && !hasPermission(permissions, 'question_bank', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف بنوك الأسئلة');
      return;
    }

    if (!confirm(`حذف ${selectedBanks.length} بنك؟`)) return;
    try {
      await supabase.from('question_banks').delete().in('id', selectedBanks);
      toast.success('تم حذف المحدد');
      dispatch({ type: 'CLEAR_SELECTED' });
      fetchData();
    } catch (err) { toast.error(err.message || t.deleteFailed); }
  };

  const handleBulkPublish = async () => {
    if (selectedBanks.length === 0) return;

    if (isAssistant && !hasPermission(permissions, 'question_bank', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر بنوك الأسئلة');
      return;
    }

    try {
      await supabase
        .from('question_banks')
        .update({ is_published: true, archived: false })
        .in('id', selectedBanks);
      toast.success('تم نشر المحدد');
      dispatch({ type: 'CLEAR_SELECTED' });
      fetchData();
    } catch (err) { toast.error(err.message || 'فشل النشر'); }
  };

  const handleBulkArchive = async () => {
    if (selectedBanks.length === 0) return;

    if (isAssistant && !hasPermission(permissions, 'question_bank', 'can_edit')) {
      toast.error('ليس لديك صلاحية لأرشفة بنوك الأسئلة');
      return;
    }

    try {
      await supabase
        .from('question_banks')
        .update({ archived: true })
        .in('id', selectedBanks);
      toast.success('تم أرشفة المحدد');
      dispatch({ type: 'CLEAR_SELECTED' });
      fetchData();
    } catch (err) { toast.error(err.message || 'فشل الأرشفة'); }
  };

  // دوال التنقل
  const handleOpenBank = (id) => router.push(`/dashboard/teacher/question-bank/${id}`);
  const handleManageQuestions = (bank) => router.push(`/dashboard/teacher/question-bank/${bank.id}`);
  const handleImport = () => router.push('/dashboard/teacher/question-bank/import');
  const handleAnalytics = () => router.push('/dashboard/teacher/question-bank/analytics');

  // حالة التحميل
  if (loading) {
    return (
      <TeacherLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', backgroundColor: 'var(--bg-primary)' }}>
          <div style={{ width: 44, height: 44, border: '4px solid rgba(251,191,36,0.2)', borderTopColor: 'var(--primary-color)', borderRadius: '50%', animation: 'spin 0.9s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </TeacherLayout>
    );
  }

  // العرض الرئيسي
  return (
    <TeacherLayout>
      <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', transition: 'background-color 0.3s, color 0.3s', paddingBottom: '40px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px' }}>
          <SettingsBar theme={theme} setTheme={setTheme} language={lang} setLanguage={setLang} color={color} setColor={setColor} />

          {/* الرأس */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '24px' }}>
            <div>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t.title}</h1>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '4px 0 0 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {t.subtitle}
                <span style={{ fontSize: '10px', backgroundColor: 'rgba(251,191,36,0.1)', color: 'var(--primary-color)', padding: '2px 12px', borderRadius: '9999px', border: '1px solid rgba(251,191,36,0.2)' }}>
                  <Icons.Zap style={{ height: 12, width: 12, display: 'inline', marginRight: '4px' }} /> {t.badge}
                </span>
              </p>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              {/* زر إنشاء بنك جديد – يظهر فقط إذا كان معلم أو مساعد لديه can_create */}
              {(!isAssistant || hasPermission(permissions, 'question_bank', 'can_create')) && (
                <button onClick={() => dispatch({ type: 'OPEN_MODAL', payload: 'createBank' })} style={{ padding: '10px 22px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', boxShadow: '0 4px 16px rgba(251,191,36,0.25)' }}>
                  <Icons.Plus style={{ height: 18, width: 18 }} /> {t.createBank}
                </button>
              )}
              <Link href="/dashboard/teacher/question-bank/import" style={{ padding: '10px 18px', backgroundColor: 'rgba(168,85,247,0.12)', color: '#a855f7', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(168,85,247,0.2)' }}>
                <Icons.Upload style={{ height: 18, width: 18 }} /> {t.importQuestions}
              </Link>
              <Link href="/dashboard/teacher/question-bank/analytics" style={{ padding: '10px 18px', backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Icons.BarChart3 style={{ height: 18, width: 18 }} /> {t.viewAnalytics}
              </Link>
              {/* زر العودة للمساعد */}
              {isAssistant && (
                <button onClick={() => router.push('/dashboard/assistant')} style={{ padding: '10px 18px', backgroundColor: 'rgba(168,85,247,0.15)', color: '#a855f7', borderRadius: '12px', border: '1px solid rgba(168,85,247,0.2)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 600 }}>
                  <Icons.ArrowRight style={{ height: 18, width: 18 }} /> العودة للوحة التحكم
                </button>
              )}
            </div>
          </div>

          {/* الإحصائيات */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            <StatCard label={t.totalBanks} value={stats.totalBanks} icon={Icons.Folder} color="blue" />
            <StatCard label={t.totalQuestions} value={stats.totalQuestions} icon={Icons.Clipboard} color="green" delay={0.1} />
            <StatCard label={t.publishedBanks} value={stats.published} icon={Icons.CheckCircle} color="yellow" delay={0.2} />
            <StatCard label={t.studentsAccess} value={stats.studentAccess} icon={Icons.Users} color="purple" delay={0.3} />
            <StatCard label={t.totalTags} value={stats.totalTags} icon={Icons.Tag} color="orange" delay={0.4} />
            <StatCard label={t.avgQuestions} value={stats.avgQuestions} icon={Icons.BarChart} color="teal" delay={0.5} subtitle={stats.avgQuestions > 0 ? `من ${stats.totalBanks} بنك` : ''} />
            <StatCard label={t.mostUsedTag} value={stats.mostUsed} icon={Icons.Award} color="indigo" delay={0.6} subtitle={stats.mostUsed !== '—' ? `الأكثر استخداماً` : ''} />
          </div>

          {/* التقارير */}
          <ReportsPanel banks={banks} language={lang} />

          {/* الفلترة */}
          <FilterBar
            search={search}
            setSearch={(val) => dispatch({ type: 'SET_SEARCH', payload: val })}
            filterCourse={filterCourse}
            setFilterCourse={(val) => dispatch({ type: 'SET_FILTER_COURSE', payload: val })}
            filterStatus={filterStatus}
            setFilterStatus={(val) => dispatch({ type: 'SET_FILTER_STATUS', payload: val })}
            filterType={filterType}
            setFilterType={(val) => dispatch({ type: 'SET_FILTER_TYPE', payload: val })}
            filterDifficulty={filterDifficulty}
            setFilterDifficulty={(val) => dispatch({ type: 'SET_FILTER_DIFFICULTY', payload: val })}
            filterTag={filterTag}
            setFilterTag={(val) => dispatch({ type: 'SET_FILTER_TAG', payload: val })}
            sortBy={sortBy}
            setSortBy={(val) => dispatch({ type: 'SET_SORT_BY', payload: val })}
            courses={courses}
            tags={tags}
            language={lang}
            onReset={() => dispatch({ type: 'RESET_FILTERS' })}
          />

          {/* العمليات الجماعية */}
          <BulkActionBar
            selectedCount={selectedBanks.length}
            onClear={() => dispatch({ type: 'CLEAR_SELECTED' })}
            onDelete={handleBulkDelete}
            onPublish={handleBulkPublish}
            onArchive={handleBulkArchive}
            onSelectAll={handleSelectAll}
            totalCount={paginatedBanks.length}
            language={lang}
            isAssistant={isAssistant}
            permissions={permissions}
          />

          {/* قائمة البنوك */}
          {paginatedBanks.length === 0 ? (
            <EmptyState t={t} onCreate={() => dispatch({ type: 'OPEN_MODAL', payload: 'createBank' })} />
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '16px' }}>
                {paginatedBanks.map(bank => (
                  <BankCard
                    key={bank.id}
                    bank={bank}
                    selected={selectedBanks.includes(bank.id)}
                    onSelect={(id) => dispatch({ type: 'TOGGLE_SELECT_BANK', payload: id })}
                    onOpen={handleOpenBank}
                    onEdit={(id) => {
                      const bankToEdit = banks.find(b => b.id === id);
                      dispatch({ type: 'SET_EDITING_BANK', payload: bankToEdit });
                      dispatch({ type: 'OPEN_MODAL', payload: 'editBank' });
                    }}
                    onDelete={(id) => {
                      dispatch({ type: 'SET_BANK_TO_DELETE', payload: id });
                      dispatch({ type: 'OPEN_MODAL', payload: 'confirmDelete' });
                    }}
                    onTogglePublish={handleTogglePublish}
                    onArchive={handleArchive}
                    onDuplicate={handleDuplicate}
                    onManageTags={(bank) => {
                      dispatch({ type: 'SET_SELECTED_BANK', payload: bank });
                      dispatch({ type: 'OPEN_MODAL', payload: 'manageTags' });
                    }}
                    onManageQuestions={handleManageQuestions}
                    onCreateExam={(bank) => {
                      dispatch({ type: 'SET_SELECTED_BANK', payload: bank });
                      dispatch({ type: 'OPEN_MODAL', payload: 'createExam' });
                    }}
                    language={lang}
                    permissions={permissions}
                    isAssistant={isAssistant}
                  />
                ))}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} setPage={(p) => dispatch({ type: 'SET_CURRENT_PAGE', payload: p })} t={t} />
            </>
          )}

          {/* سجل النشاط */}
          <ActivityLog language={lang} />
        </div>
      </div>

      {/* المودالات */}
      <BankFormModal
        isOpen={modals.createBank}
        onClose={() => dispatch({ type: 'CLOSE_MODAL', payload: 'createBank' })}
        onSave={handleCreateBank}
        courses={courses}
        language={lang}
      />

      <BankFormModal
        isOpen={modals.editBank}
        onClose={() => {
          dispatch({ type: 'CLOSE_MODAL', payload: 'editBank' });
          dispatch({ type: 'SET_EDITING_BANK', payload: null });
        }}
        onSave={handleUpdateBank}
        courses={courses}
        language={lang}
        initialData={editingBank}
      />

      <ConfirmModal
        isOpen={modals.confirmDelete}
        onClose={() => {
          dispatch({ type: 'CLOSE_MODAL', payload: 'confirmDelete' });
          dispatch({ type: 'SET_BANK_TO_DELETE', payload: null });
        }}
        onConfirm={() => { if (bankToDelete) handleDeleteBank(bankToDelete); }}
        title={t.delete}
        message={t.confirmDelete}
        confirmLabel={t.delete}
        cancelLabel={t.cancel}
      />

      <CreateExamModal
        isOpen={modals.createExam}
        onClose={() => {
          dispatch({ type: 'CLOSE_MODAL', payload: 'createExam' });
          dispatch({ type: 'SET_SELECTED_BANK', payload: null });
        }}
        bank={selectedBank}
        language={lang}
        onSuccess={handleCreateExam}
      />

      <TagManagerModal
        isOpen={modals.manageTags}
        onClose={() => {
          dispatch({ type: 'CLOSE_MODAL', payload: 'manageTags' });
          dispatch({ type: 'SET_SELECTED_BANK', payload: null });
        }}
        bank={selectedBank}
        language={lang}
        onUpdate={fetchData}
      />
    </TeacherLayout>
  );
}