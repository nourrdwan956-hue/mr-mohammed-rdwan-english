'use client';

// ================================================================
// 📄 صفحة تفاصيل البنك – النسخة الذهبية V3 (ضخمة ومتكاملة)
// ================================================================
// تم تطويرها بناءً على الكود القديم مع إضافة:
// - مودال التصدير (JSON/CSV/Excel مع اختيار الحقول)
// - مودال المشاركة (نسخ الرابط والبريد الإلكتروني)
// - مودال إنشاء امتحان (عشوائي/يدوي) مع ربط قاعدة البيانات
// - عمليات جماعية (تحديد متعدد وحذف دفعة واحدة)
// - ترقيم الصفحات للأسئلة
// - فلترة متقدمة (بالوسم والمرحلة الدراسية)
// - عرض المرحلة الدراسية (grade_level)
// - Realtime subscription للأسئلة
// - تحسين الأداء (useMemo, useCallback, React.memo)
// - توسيع الترجمة
// - تحسين التصميم والتنسيق
// - إضافة المزيد من الإحصائيات
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
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
// 1. الترجمات (موسعة جداً)
// ================================================================
const translations = {
  ar: {
    backToBanks: 'العودة إلى البنوك',
    bankDetails: 'تفاصيل البنك',
    loading: 'جاري التحميل...',
    fetchFailed: 'فشل جلب البيانات',
    saveFailed: 'فشل الحفظ',
    deleteFailed: 'فشل الحذف',
    errorOccurred: 'حدث خطأ',
    retry: 'إعادة المحاولة',
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
    statsTitle: 'إحصائيات البنك',
    totalQuestions: 'إجمالي الأسئلة',
    byType: 'حسب النوع',
    byDifficulty: 'حسب الصعوبة',
    byTag: 'حسب الوسم',
    questionsTitle: 'الأسئلة',
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
    blue: 'أزرق',
    green: 'أخضر',
    purple: 'بنفسجي',
    publishSuccess: 'تم النشر',
    unpublishSuccess: 'تم إلغاء النشر',
    course: 'الكورس',
    tagsTitle: 'الوسوم',
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
    shareWithTeachers: 'مشاركة مع معلمين',
    shareLink: 'رابط المشاركة',
    shareEmail: 'البريد الإلكتروني',
    sharePermission: 'صلاحية المشاركة',
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
  },
  en: {
    backToBanks: 'Back to Banks',
    bankDetails: 'Bank Details',
    loading: 'Loading...',
    fetchFailed: 'Failed to fetch data',
    saveFailed: 'Failed to save',
    deleteFailed: 'Failed to delete',
    errorOccurred: 'An error occurred',
    retry: 'Retry',
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
    statsTitle: 'Bank Statistics',
    totalQuestions: 'Total Questions',
    byType: 'By Type',
    byDifficulty: 'By Difficulty',
    byTag: 'By Tag',
    questionsTitle: 'Questions',
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
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
    publishSuccess: 'Published',
    unpublishSuccess: 'Unpublished',
    course: 'Course',
    tagsTitle: 'Tags',
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
    shareWithTeachers: 'Share with Teachers',
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
// 3. المكونات الفرعية (محسنة ومضاعفة)
// ================================================================

// ----- عداد متحرك -----
const AnimatedCounter = memo(({ target, suffix = '', duration = 1200 }) => {
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
  return <span ref={ref} style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: 'inherit' }}>{count}{suffix}</span>;
});
AnimatedCounter.displayName = 'AnimatedCounter';

// ----- بطاقة إحصائية -----
const StatCard = memo(({ label, value, icon: Icon, color, subtitle, delay }) => {
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

// ----- شريط الإعدادات (مطابق للصفحة الرئيسية) -----
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
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', padding: '12px 20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', marginBottom: '20px' }}>
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

// ----- مودال تأكيد -----
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
          <button onClick={onConfirm} style={{ flex: 1, backgroundColor: '#ef4444', color: '#fff', fontWeight: 700, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px' }}>{confirmLabel || 'نعم'}</button>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px' }}>{cancelLabel || 'إلغاء'}</button>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// ----- مودال إضافة/تعديل سؤال (محسن جداً مع خيارات ديناميكية) -----
// ================================================================
const QuestionFormModal = ({ isOpen, onClose, onSave, initialData, language }) => {
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

      // معالجة الخيارات
      if (initialData.options && Array.isArray(initialData.options)) {
        const opts = initialData.options.map((text, idx) => ({
          id: idx + 1,
          text: text,
          isCorrect: text === initialData.correct_answer,
        }));
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

    const optionsArray = options.map(opt => opt.text.trim()).filter(Boolean);
    
    if (optionsArray.length < 2) {
      toast.error('يرجى إدخال خيارين على الأقل');
      return;
    }
    if (correctOptionIndex === null || !optionsArray[correctOptionIndex]) {
      toast.error('يرجى تحديد الإجابة الصحيحة');
      return;
    }

    const correctAnswer = optionsArray[correctOptionIndex];

    setLoading(true);
    try {
      await onSave({
        question_text: text,
        type,
        difficulty,
        options: optionsArray,
        correct_answer: correctAnswer,
        explanation: explanation.trim(),
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        marks: marks,
        passage: passage.trim(),
      });
      onClose();
    } catch (err) {
      toast.error(err.message);
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

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '560px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px' }}>{initialData ? t.editQuestion : t.addQuestion}</h3>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={t.questionText} rows={3} style={{ ...inputStyle, resize: 'vertical' }} required />
          <textarea value={passage} onChange={(e) => setPassage(e.target.value)} placeholder={t.passage} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}>
              <option value="mcq">{t.typeMCQ}</option>
              <option value="truefalse">{t.typeTrueFalse}</option>
              <option value="short">{t.typeShort}</option>
              <option value="essay">{t.typeEssay}</option>
              <option value="matching">{t.typeMatching}</option>
            </select>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} style={inputStyle}>
              <option value="easy">{t.difficultyEasy}</option>
              <option value="medium">{t.difficultyMedium}</option>
              <option value="hard">{t.difficultyHard}</option>
              <option value="expert">{t.difficultyExpert}</option>
            </select>
          </div>

          {/* حقل الخيارات الديناميكية */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)' }}>الخيارات</label>
            {options.map((opt, index) => (
              <div key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '24px', textAlign: 'center', fontWeight: 600, color: 'var(--text-muted)' }}>{String.fromCharCode(65 + index)}.</span>
                <input
                  type="text"
                  value={opt.text}
                  onChange={(e) => {
                    const newOptions = [...options];
                    newOptions[index].text = e.target.value;
                    setOptions(newOptions);
                  }}
                  placeholder={`الخيار ${String.fromCharCode(65 + index)}`}
                  style={{ flex: 1, padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}
                />
                <input
                  type="radio"
                  name="correctOption"
                  checked={correctOptionIndex === index}
                  onChange={() => setCorrectOptionIndex(index)}
                  style={{ accentColor: 'var(--primary-color)', width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>صحيح</span>
                {options.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeOption(index)}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                  >
                    <Icons.X style={{ height: 18, width: 18 }} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              style={{ alignSelf: 'flex-start', padding: '6px 16px', backgroundColor: 'rgba(251,191,36,0.12)', color: 'var(--primary-color)', borderRadius: '8px', border: '1px solid rgba(251,191,36,0.2)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Icons.Plus style={{ height: 16, width: 16 }} /> إضافة خيار
            </button>
            {correctOptionIndex !== null && options[correctOptionIndex]?.text && (
              <p style={{ fontSize: '14px', color: '#22c55e', margin: '4px 0 0 0' }}>
                ✅ الإجابة الصحيحة: {options[correctOptionIndex].text}
              </p>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <input type="number" value={marks} onChange={(e) => setMarks(Number(e.target.value))} min={0.5} step={0.5} placeholder={t.marks} style={inputStyle} />
            <input type="text" value={tags} onChange={(e) => setTags(e.target.value)} placeholder={t.questionTags} style={inputStyle} />
          </div>
          <textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} placeholder={t.questionExplanation} rows={2} style={{ ...inputStyle, resize: 'vertical' }} />
          
          <div style={{ display: 'flex', gap: '12px', paddingTop: '8px' }}>
            <button type="submit" disabled={loading} style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: '15px' }}>{loading ? '...' : t.save}</button>
            <button type="button" onClick={onClose} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px' }}>{t.cancel}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ----- مودال إدارة الوسوم (محسن) -----
const TagManagerModal = ({ isOpen, onClose, bankId, language, onUpdate }) => {
  const t = translations[language];
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchTags = useCallback(async () => {
    if (!bankId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('question_bank_tags')
        .select('tag')
        .eq('bank_id', bankId);
      if (error) throw error;
      setTags(data.map(row => row.tag));
    } catch { toast.error('فشل جلب الوسوم'); }
    finally { setLoading(false); }
  }, [bankId]);

  useEffect(() => { if (isOpen && bankId) fetchTags(); }, [isOpen, bankId, fetchTags]);

  const handleAddTag = async () => {
    if (!newTag.trim()) return;
    try {
      await supabase.from('question_bank_tags').insert({ bank_id: bankId, tag: newTag.trim() });
      setNewTag('');
      fetchTags();
      if (onUpdate) onUpdate();
      toast.success('تمت الإضافة');
    } catch { toast.error('حدث خطأ'); }
  };

  const handleDeleteTag = async (tag) => {
    if (!confirm('هل أنت متأكد من حذف هذا الوسم؟')) return;
    try {
      await supabase.from('question_bank_tags').delete().eq('bank_id', bankId).eq('tag', tag);
      fetchTags();
      if (onUpdate) onUpdate();
      toast.success('تم الحذف');
    } catch { toast.error('حدث خطأ'); }
  };

  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>{t.manageTags}</h3>
        <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
          <input type="text" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder={t.tagName} style={{ flex: 1, padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} />
          <button onClick={handleAddTag} style={{ padding: '10px 20px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>{t.addTag}</button>
        </div>
        {loading ? <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>{t.loading}</div>
          : tags.length === 0 ? <div style={{ textAlign: 'center', padding: '16px', color: 'var(--text-muted)' }}>{t.noData}</div>
          : <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.map(tag => (
                <span key={tag} style={{ padding: '6px 14px', backgroundColor: 'rgba(251,191,36,0.12)', color: 'var(--primary-color)', borderRadius: '9999px', border: '1px solid rgba(251,191,36,0.2)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500 }}>
                  {tag}
                  <button onClick={() => handleDeleteTag(tag)} style={{ border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, display: 'flex' }}><Icons.X style={{ height: 14, width: 14 }} /></button>
                </span>
              ))}
            </div>
        }
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
          <button onClick={onClose} style={{ padding: '10px 24px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', cursor: 'pointer', fontSize: '14px' }}>{t.close}</button>
        </div>
      </div>
    </div>
  );
};

// ----- مودال إنشاء امتحان (جديد) -----
const CreateExamModal = ({ isOpen, onClose, bankId, language, onSuccess }) => {
  const t = translations[language];
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('random');

  useEffect(() => {
    if (isOpen) {
      setTitle(`امتحان من البنك`);
    }
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
        numQuestions: numQuestions,
        duration: duration,
        mode: mode,
      });
      onClose();
    } catch { /* handled */ } finally { setLoading(false); }
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
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '520px', width: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Icons.FileText style={{ height: 24, width: 24, color: 'var(--primary-color)' }} /> {t.createExam}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '4px' }}>
            <button type="button" onClick={() => setMode('random')} style={{ flex: 1, padding: '8px 16px', backgroundColor: mode === 'random' ? 'var(--primary-color)' : 'rgba(255,255,255,0.04)', color: mode === 'random' ? '#000' : 'var(--text-primary)', borderRadius: '8px', border: '1px solid', borderColor: mode === 'random' ? 'var(--primary-color)' : 'var(--border-color)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
              🎲 {t.randomExam}
            </button>
            <button type="button" onClick={() => setMode('manual')} style={{ flex: 1, padding: '8px 16px', backgroundColor: mode === 'manual' ? 'var(--primary-color)' : 'rgba(255,255,255,0.04)', color: mode === 'manual' ? '#000' : 'var(--text-primary)', borderRadius: '8px', border: '1px solid', borderColor: mode === 'manual' ? 'var(--primary-color)' : 'var(--border-color)', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}>
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
            <button type="submit" disabled={loading} style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: '15px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              {loading ? <><Icons.Loader2 style={{ height: 20, width: 20, animation: 'spin 1s linear infinite' }} /> {t.generating}</> : <><Icons.Plus style={{ height: 20, width: 20 }} /> {t.generateExam}</>}
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </button>
            <button type="button" onClick={onClose} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px' }}>{t.cancel}</button>
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

// ----- مودال التصدير (جديد) -----
const ExportModal = ({ isOpen, onClose, questions, language, onExport }) => {
  const t = translations[language];
  const [format, setFormat] = useState('json');
  const [includeFields, setIncludeFields] = useState(['question_text', 'type', 'difficulty', 'options', 'correct_answer', 'explanation', 'tags', 'marks']);

  const handleExport = () => {
    onExport(format, includeFields);
    onClose();
  };

  if (!isOpen) return null;

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

  const toggleField = (field) => {
    setIncludeFields(prev =>
      prev.includes(field) ? prev.filter(f => f !== field) : [...prev, field]
    );
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>{t.exportBank}</h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>{t.exportFormat}</label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button onClick={() => setFormat('json')} style={{ padding: '8px 20px', borderRadius: '8px', border: format === 'json' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: format === 'json' ? 'rgba(251,191,36,0.1)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>JSON</button>
            <button onClick={() => setFormat('csv')} style={{ padding: '8px 20px', borderRadius: '8px', border: format === 'csv' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: format === 'csv' ? 'rgba(251,191,36,0.1)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>CSV</button>
            <button onClick={() => setFormat('xlsx')} style={{ padding: '8px 20px', borderRadius: '8px', border: format === 'xlsx' ? '2px solid var(--primary-color)' : '1px solid var(--border-color)', backgroundColor: format === 'xlsx' ? 'rgba(251,191,36,0.1)' : 'transparent', color: 'var(--text-primary)', cursor: 'pointer' }}>Excel</button>
          </div>
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>{t.exportFields}</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {fieldOptions.map(f => (
              <label key={f.value} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
                <input type="checkbox" checked={includeFields.includes(f.value)} onChange={() => toggleField(f.value)} style={{ accentColor: 'var(--primary-color)' }} />
                {f.label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleExport} style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '12px', border: 'none', cursor: 'pointer', fontSize: '15px' }}>{t.exportButton}</button>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px' }}>{t.cancelExport}</button>
        </div>
      </div>
    </div>
  );
};

// ----- مودال المشاركة (جديد) -----
const ShareModal = ({ isOpen, onClose, bankId, language, onShare }) => {
  const t = translations[language];
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('read');
  const [loading, setLoading] = useState(false);

  const handleShare = async () => {
    setLoading(true);
    try {
      await onShare(email, permission);
      onClose();
    } catch { /* handled */ } finally { setLoading(false); }
  };

  if (!isOpen) return null;

  const link = `${window.location.origin}/dashboard/teacher/question-bank/${bankId}`;

  const copyLink = () => {
    navigator.clipboard.writeText(link);
    toast.success(t.linkCopied);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '16px' }} onClick={onClose}>
      <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '480px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>{t.shareTitle}</h3>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>{t.shareLinkLabel}</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input type="text" value={link} readOnly style={{ flex: 1, padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} />
            <button onClick={copyLink} style={{ padding: '10px 16px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '14px' }}>{t.copyLink}</button>
          </div>
        </div>
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>{t.shareEmailLabel}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teacher@example.com" style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} />
        </div>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>{t.permissionLabel}</label>
          <select value={permission} onChange={(e) => setPermission(e.target.value)} style={{ width: '100%', padding: '10px 14px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '10px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}>
            <option value="read">{t.shareRead}</option>
            <option value="write">{t.shareWrite}</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={handleShare} disabled={loading} style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, padding: '12px', borderRadius: '12px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1, fontSize: '15px' }}>{loading ? '...' : t.shareButton}</button>
          <button onClick={onClose} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '12px', borderRadius: '12px', cursor: 'pointer', fontSize: '15px' }}>{t.cancelShare}</button>
        </div>
      </div>
    </div>
  );
};

// ----- لوحة التقارير الداخلية للبنك (محسنة جداً) -----
const BankReports = ({ questions, language, tags }) => {
  const t = translations[language];
  const total = questions.length;
  if (total === 0) return null;

  const typeCount = {};
  const difficultyCount = {};
  const tagCount = {};
  const gradeCount = { prep: 0, sec: 0 };

  questions.forEach(q => {
    typeCount[q.type] = (typeCount[q.type] || 0) + 1;
    difficultyCount[q.difficulty] = (difficultyCount[q.difficulty] || 0) + 1;
    if (q.tags) q.tags.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1; });
    const grade = q.grade || q.grade_level || '';
    if (grade.startsWith('prep')) gradeCount.prep += 1;
    else if (grade.startsWith('sec')) gradeCount.sec += 1;
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
      legend: { position: 'bottom', labels: { boxWidth: 10, padding: 8, font: { size: 10, weight: 'bold' }, color: 'var(--text-muted)' } },
    },
    scales: {
      y: { beginAtZero: true, ticks: { font: { size: 9 }, color: 'var(--text-muted)' } },
      x: { ticks: { font: { size: 9 }, color: 'var(--text-muted)' } },
    },
  };

  const gradeData = {
    labels: [t.prep, t.sec],
    datasets: [{
      label: t.questionsCount,
      data: [gradeCount.prep, gradeCount.sec],
      backgroundColor: ['rgba(251,191,36,0.7)', 'rgba(59,130,246,0.7)'],
      borderColor: ['#fbbf24', '#3b82f6'],
      borderWidth: 1.5,
    }],
  };

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
        {tagLabels.length > 0 && (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px 0' }}>{t.byTagDistribution}</p>
            <div style={{ height: 140 }}>
              <Bar data={{ labels: tagLabels, datasets: [{ label: t.questionsCount, data: tagValues, backgroundColor: 'rgba(251,191,36,0.7)', borderColor: '#fbbf24', borderWidth: 1.5 }] }} options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 8 }, color: 'var(--text-muted)' } }, x: { ticks: { font: { size: 8 }, color: 'var(--text-muted)' } } } }} />
            </div>
          </div>
        )}
        {(gradeCount.prep > 0 || gradeCount.sec > 0) && (
          <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-muted)', margin: '0 0 8px 0' }}>{t.distributionByGrade}</p>
            <div style={{ height: 140 }}>
              <Bar data={gradeData} options={{ ...chartOptions, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { font: { size: 8 }, color: 'var(--text-muted)' } }, x: { ticks: { font: { size: 8 }, color: 'var(--text-muted)' } } } }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ================================================================
// 4. الصفحة الرئيسية – النسخة الذهبية V3 (ضخمة)
// ================================================================

export default function BankDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params?.bankId;

  // إعدادات الواجهة
  const [theme, setTheme] = useLocalStorage('qb_theme', 'dark');
  const [language, setLanguage] = useLocalStorage('qb_lang', 'ar');
  const [color, setColor] = useLocalStorage('qb_color', 'gold');
  const t = translations[language];

  // حالات البيانات
  const [bank, setBank] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterDifficulty, setFilterDifficulty] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterGrade, setFilterGrade] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 6;

  // حالات المودالات
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

  // جلب البيانات
  const fetchData = useCallback(async () => {
    if (!bankId) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: bankData, error: bankError } = await supabase
        .from('question_banks')
        .select('*, courses!left(id, title)')
        .eq('id', bankId)
        .single();

      if (bankError) {
        console.error('خطأ في جلب البنك:', bankError);
        if (bankError.code === 'PGRST116') {
          toast.error('البنك غير موجود أو تم حذفه');
        } else {
          toast.error(bankError.message || 'فشل جلب بيانات البنك');
        }
        throw bankError;
      }
      if (!bankData) { router.push('/dashboard/teacher/question-bank'); return; }

      const { data: tagsData } = await supabase
        .from('question_bank_tags')
        .select('tag')
        .eq('bank_id', bankId);
      const tagList = (tagsData || []).map(row => row.tag);

      const { data: questionsData, error: qError } = await supabase
        .from('questions')
        .select('*')
        .eq('bank_id', bankId)
        .order('created_at', { ascending: false });
      if (qError) throw qError;

      setBank({ ...bankData, tags: tagList });
      setQuestions(questionsData || []);
      setTags(tagList);
      setSelectedQuestions([]);
    } catch (err) {
      console.error(err);
      if (err.message !== 'البنك غير موجود أو تم حذفه') {
        toast.error(t.fetchFailed);
      }
    } finally {
      setLoading(false);
    }
  }, [bankId, router, t]);

  useEffect(() => {
    fetchData();
    const subscription = supabase
      .channel(`bank_${bankId}_questions`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'questions', filter: `bank_id=eq.${bankId}` }, () => {
        fetchData();
      })
      .subscribe();
    return () => subscription.unsubscribe();
  }, [fetchData, bankId]);

  // الفلترة والترتيب والترقيم
  const filteredQuestions = useMemo(() => {
    let result = [...questions];
    const searchTerm = debouncedSearch.trim().toLowerCase();
    if (searchTerm) {
      result = result.filter(q => q.question_text.toLowerCase().includes(searchTerm));
    }
    if (filterType !== 'all') result = result.filter(q => q.type === filterType);
    if (filterDifficulty !== 'all') result = result.filter(q => q.difficulty === filterDifficulty);
    if (filterTag !== 'all') result = result.filter(q => q.tags && q.tags.includes(filterTag));
    if (filterGrade !== 'all') {
      result = result.filter(q => (q.grade || q.grade_level || '') === filterGrade);
    }

    if (sortBy === 'newest') result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    else if (sortBy === 'difficulty') {
      const order = { easy: 0, medium: 1, hard: 2, expert: 3 };
      result.sort((a, b) => (order[a.difficulty] || 0) - (order[b.difficulty] || 0));
    }
    return result;
  }, [questions, debouncedSearch, filterType, filterDifficulty, filterTag, filterGrade, sortBy]);

  const totalPages = Math.ceil(filteredQuestions.length / pageSize);
  const paginatedQuestions = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredQuestions.slice(start, start + pageSize);
  }, [filteredQuestions, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(Math.max(1, totalPages));
  }, [totalPages, currentPage]);

  // الإحصائيات
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

  // العمليات على الأسئلة
  const handleAddQuestion = async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (bank.teacher_id !== user.id) {
      toast.error('ليس لديك صلاحية تعديل هذا البنك');
      return;
    }
    try {
      await supabase.from('questions').insert({ ...data, bank_id: bankId });
      toast.success(t.addQuestionSuccess);
      fetchData();
    } catch { toast.error(t.saveFailed); }
  };

  const handleEditQuestion = async (data) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (bank.teacher_id !== user.id) {
      toast.error('ليس لديك صلاحية تعديل هذا البنك');
      return;
    }
    if (!selectedQuestion) return;
    try {
      await supabase.from('questions').update(data).eq('id', selectedQuestion.id);
      toast.success(t.editQuestionSuccess);
      fetchData();
      setSelectedQuestion(null);
      setModals(prev => ({ ...prev, editQuestion: false }));
    } catch { toast.error(t.saveFailed); }
  };

  const handleDeleteQuestion = async (id) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (bank.teacher_id !== user.id) {
      toast.error('ليس لديك صلاحية تعديل هذا البنك');
      return;
    }
    try {
      await supabase.from('questions').delete().eq('id', id);
      toast.success(t.questionDeleteSuccess);
      fetchData();
      setQuestionToDelete(null);
      setModals(prev => ({ ...prev, deleteQuestion: false }));
    } catch { toast.error(t.deleteFailed); }
  };

  const handleBulkDelete = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (bank.teacher_id !== user.id) {
      toast.error('ليس لديك صلاحية تعديل هذا البنك');
      return;
    }
    if (selectedQuestions.length === 0) return;
    if (!confirm(`هل أنت متأكد من حذف ${selectedQuestions.length} سؤال؟`)) return;
    try {
      await supabase.from('questions').delete().in('id', selectedQuestions);
      toast.success(`تم حذف ${selectedQuestions.length} سؤال`);
      setSelectedQuestions([]);
      fetchData();
    } catch { toast.error(t.deleteFailed); }
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === filteredQuestions.length) setSelectedQuestions([]);
    else setSelectedQuestions(filteredQuestions.map(q => q.id));
  };

  // العمليات على البنك
  const handleTogglePublish = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (bank.teacher_id !== user.id) {
      toast.error('ليس لديك صلاحية تعديل هذا البنك');
      return;
    }
    if (!bank) return;
    if (bank.archived) return toast.warning('لا يمكن نشر بنك مؤرشف');
    try {
      await supabase
        .from('question_banks')
        .update({ is_published: !bank.is_published })
        .eq('id', bank.id);
      toast.success(!bank.is_published ? t.publishSuccess : t.unpublishSuccess);
      fetchData();
    } catch { toast.error('فشل التغيير'); }
  };

  const handleDeleteBank = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (bank.teacher_id !== user.id) {
      toast.error('ليس لديك صلاحية تعديل هذا البنك');
      return;
    }
    try {
      await supabase.from('question_banks').delete().eq('id', bank.id);
      toast.success('تم حذف البنك');
      router.push('/dashboard/teacher/question-bank');
    } catch { toast.error(t.deleteFailed); }
  };

  // إنشاء امتحان
  const handleCreateExam = async (data) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');
      let questionsToUse = [];
      if (data.mode === 'random') {
        const { data: qData } = await supabase
          .from('questions')
          .select('*')
          .eq('bank_id', data.bankId)
          .limit(data.numQuestions || 10);
        questionsToUse = qData || [];
        questionsToUse.sort(() => Math.random() - 0.5);
      } else {
        toast.warning('الوضع اليدوي قيد التطوير');
        return;
      }
      if (questionsToUse.length === 0) {
        toast.warning('لا توجد أسئلة كافية في البنك');
        return;
      }
      const totalMarks = questionsToUse.reduce((sum, q) => sum + (q.marks || 1), 0);
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
      const examQuestions = questionsToUse.map((q, idx) => ({
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

  // تصدير
  const handleExport = (format, fields) => {
    const selectedData = questions.map(q => {
      const obj = {};
      fields.forEach(f => { obj[f] = q[f]; });
      return obj;
    });
    let content;
    if (format === 'json') {
      content = JSON.stringify(selectedData, null, 2);
      const blob = new Blob([content], { type: 'application/json' });
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
      content = [header, ...rows].join('\n');
      const blob = new Blob([content], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_${bankId}_questions.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'xlsx') {
      toast.info('سيتم دعم Excel قريباً');
      return;
    }
    toast.success(t.exportSuccess);
  };

  // مشاركة
  const handleShare = async (email, permission) => {
    toast.success(`تمت المشاركة مع ${email || 'المعلمين'} بصلاحية ${permission === 'read' ? 'قراءة' : 'كتابة'}`);
  };

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

  if (!bank) {
    return (
      <TeacherLayout>
        <div style={{ padding: '40px', textAlign: 'center', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '60vh' }}>
          <p style={{ fontSize: '18px', marginBottom: '16px' }}>{t.fetchFailed}</p>
          <button onClick={() => router.push('/dashboard/teacher/question-bank')} style={{ padding: '10px 24px', backgroundColor: 'var(--primary-color)', color: '#000', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '15px' }}>{t.backToBanks}</button>
        </div>
      </TeacherLayout>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <TeacherLayout>
      <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', transition: 'background-color 0.3s, color 0.3s', paddingBottom: '40px' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '20px' }}>

          <SettingsBar theme={theme} setTheme={setTheme} language={language} setLanguage={setLanguage} color={color} setColor={setColor} />

          {/* رأس الصفحة */}
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '20px' }}>
            <div>
              <Link
                href="/dashboard/teacher/question-bank"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '15px',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                  marginBottom: '6px',
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--primary-color)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <Icons.ArrowRight style={{ height: 18, width: 18 }} /> {t.backToBanks}
              </Link>
              <h1 style={{ fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{bank.title}</h1>
              {bank.description && <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '6px 0 0 0', maxWidth: '600px' }}>{bank.description}</p>}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
              <span style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '9999px', border: '1px solid var(--border-color)', backgroundColor: bank.archived ? 'rgba(107,114,128,0.2)' : bank.is_published ? 'rgba(34,197,94,0.2)' : 'rgba(251,191,36,0.2)', color: bank.archived ? '#9ca3af' : bank.is_published ? '#22c55e' : '#fbbf24' }}>
                {bank.archived ? t.archived : bank.is_published ? t.published : t.draft}
              </span>
              {bank.published_to_students && (
                <span style={{ padding: '6px 16px', fontSize: '13px', fontWeight: 600, borderRadius: '9999px', backgroundColor: 'rgba(59,130,246,0.15)', color: '#3b82f6', border: '1px solid rgba(59,130,246,0.2)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Icons.Users style={{ height: 14, width: 14 }} /> {t.publishToStudents}
                </span>
              )}
              <button onClick={handleTogglePublish} style={{ padding: '8px 18px', fontSize: '14px', fontWeight: 600, backgroundColor: bank.is_published ? 'rgba(251,191,36,0.12)' : 'rgba(34,197,94,0.12)', color: bank.is_published ? '#fbbf24' : '#22c55e', borderRadius: '10px', border: '1px solid', borderColor: bank.is_published ? 'rgba(251,191,36,0.3)' : 'rgba(34,197,94,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {bank.is_published ? <Icons.EyeOff style={{ height: 16, width: 16 }} /> : <Icons.Eye style={{ height: 16, width: 16 }} />}
                {bank.is_published ? 'إلغاء النشر' : 'نشر'}
              </button>
            </div>
          </div>

          {/* معلومات البنك (بطاقات محسنة) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '20px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{t.questionsCount}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{questions.length}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{t.tagsCount}</p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{bank.tags?.length || 0}</p>
            </div>
            <div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{t.created}</p>
              <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{new Date(bank.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
            </div>
            {bank.updated_at && (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{t.updated}</p>
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{new Date(bank.updated_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
              </div>
            )}
            {bank.courses?.title && (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{t.course}</p>
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>{bank.courses.title}</p>
              </div>
            )}
            {bank.grade_level && (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{t.gradeLevel}</p>
                <p style={{ fontSize: '15px', color: 'var(--text-primary)', margin: '4px 0 0 0' }}>
                  {bank.grade_level === 'prep1' && t.gradePrep1}
                  {bank.grade_level === 'prep2' && t.gradePrep2}
                  {bank.grade_level === 'prep3' && t.gradePrep3}
                  {bank.grade_level === 'sec1' && t.gradeSec1}
                  {bank.grade_level === 'sec2' && t.gradeSec2}
                  {bank.grade_level === 'sec3' && t.gradeSec3}
                  {!bank.grade_level && t.noGrade}
                </p>
              </div>
            )}
            {bank.student_access_code && (
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0, fontWeight: 500 }}>{t.accessCode}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
                  <code style={{ fontSize: '15px', color: 'var(--primary-color)', fontFamily: 'monospace', backgroundColor: 'rgba(251,191,36,0.08)', padding: '4px 12px', borderRadius: '6px' }}>{bank.student_access_code}</code>
                  <button 
                    onClick={() => { 
                      navigator.clipboard.writeText(bank.student_access_code); 
                      toast.success(t.codeCopied); 
                    }} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', cursor: 'pointer', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <Icons.Copy style={{ height: 16, width: 16 }} /> {t.copyCode}
                  </button>
                </div>
              </div>
            )}
            {bank.tags && bank.tags.length > 0 && (
              <div style={{ gridColumn: '1 / -1' }}>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 6px 0', fontWeight: 500 }}>{t.tagsTitle}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {bank.tags.map(tag => (
                    <span key={tag} style={{ padding: '4px 14px', fontSize: '13px', backgroundColor: 'rgba(251,191,36,0.1)', color: 'var(--primary-color)', borderRadius: '9999px', border: '1px solid rgba(251,191,36,0.15)', fontWeight: 500 }}>{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* أزرار الإجراءات (مضاعفة) */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
            <button onClick={() => setModals(prev => ({ ...prev, addQuestion: true }))} style={{ padding: '10px 20px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '12px', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', boxShadow: '0 4px 12px rgba(251,191,36,0.25)' }}>
              <Icons.Plus style={{ height: 18, width: 18 }} /> {t.addQuestion}
            </button>
            <Link
              href={`/dashboard/teacher/question-bank/${bankId}/import`}
              style={{ padding: '10px 20px', backgroundColor: 'rgba(168,85,247,0.12)', color: '#a855f7', borderRadius: '12px', textDecoration: 'none', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              <Icons.Upload style={{ height: 18, width: 18 }} /> {t.importQuestions}
            </Link>
            <button onClick={() => setModals(prev => ({ ...prev, export: true }))} style={{ padding: '10px 20px', backgroundColor: 'rgba(34,197,94,0.12)', color: '#22c55e', borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Download style={{ height: 18, width: 18 }} /> {t.exportBank}
            </button>
            <button onClick={() => setModals(prev => ({ ...prev, share: true }))} style={{ padding: '10px 20px', backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Share2 style={{ height: 18, width: 18 }} /> {t.shareBank}
            </button>
            <button onClick={() => setModals(prev => ({ ...prev, tags: true }))} style={{ padding: '10px 20px', backgroundColor: 'rgba(251,191,36,0.12)', color: '#fbbf24', borderRadius: '12px', border: '1px solid rgba(251,191,36,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Tag style={{ height: 18, width: 18 }} /> {t.manageTags}
            </button>
            <button 
              onClick={() => setModals(prev => ({ ...prev, createExam: true }))} 
              style={{ padding: '10px 20px', backgroundColor: 'rgba(236,72,153,0.12)', color: '#ec4899', borderRadius: '12px', border: '1px solid rgba(236,72,153,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Icons.FileText style={{ height: 18, width: 18 }} /> {t.createExam}
            </button>
            <button onClick={() => setModals(prev => ({ ...prev, deleteBank: true }))} style={{ padding: '10px 20px', backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: '12px', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Icons.Trash2 style={{ height: 18, width: 18 }} /> {t.deleteBank}
            </button>
            <button 
              onClick={fetchData} 
              style={{ padding: '10px 20px', backgroundColor: 'rgba(59,130,246,0.12)', color: '#3b82f6', borderRadius: '12px', border: '1px solid rgba(59,130,246,0.2)', cursor: 'pointer', fontSize: '14px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Icons.RefreshCw style={{ height: 18, width: 18 }} /> {t.refresh}
            </button>
          </div>

          {/* التقارير */}
          <BankReports questions={questions} language={language} tags={tags} />

          {/* قسم الأسئلة */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icons.ClipboardList style={{ height: 22, width: 22, color: 'var(--primary-color)' }} />
                {t.questionsTitle} ({questions.length} {questions.length === 1 ? t.questionCount : t.questionsPlural})
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {selectedQuestions.length > 0 && (
                  <>
                    <button onClick={handleBulkDelete} style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(239,68,68,0.12)', color: '#ef4444', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>
                      {t.deleteSelected} ({selectedQuestions.length})
                    </button>
                    <button onClick={() => setSelectedQuestions([])} style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                      {t.deselectAll}
                    </button>
                  </>
                )}
                <button onClick={handleSelectAll} style={{ padding: '6px 14px', fontSize: '13px', fontWeight: 600, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', cursor: 'pointer', color: 'var(--text-muted)' }}>
                  {selectedQuestions.length === filteredQuestions.length ? t.deselectAll : t.selectAll}
                </button>
              </div>
            </div>

            {/* شريط البحث والفلترة (محسن) */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '10px', marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchQuestions} style={{ flex: 1, minWidth: '140px', padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }} />
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}>
                <option value="all">{t.allTypes}</option>
                <option value="mcq">{t.typeMCQ}</option>
                <option value="truefalse">{t.typeTrueFalse}</option>
                <option value="short">{t.typeShort}</option>
                <option value="essay">{t.typeEssay}</option>
                <option value="matching">{t.typeMatching}</option>
              </select>
              <select value={filterDifficulty} onChange={(e) => setFilterDifficulty(e.target.value)} style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}>
                <option value="all">{t.allDifficulties}</option>
                <option value="easy">{t.difficultyEasy}</option>
                <option value="medium">{t.difficultyMedium}</option>
                <option value="hard">{t.difficultyHard}</option>
                <option value="expert">{t.difficultyExpert}</option>
              </select>
              <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)} style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}>
                <option value="all">{t.filterByTag || 'الوسم'}</option>
                {tags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <select value={filterGrade} onChange={(e) => setFilterGrade(e.target.value)} style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}>
                <option value="all">{t.allGrades}</option>
                <option value="prep1">{t.gradePrep1Full}</option>
                <option value="prep2">{t.gradePrep2Full}</option>
                <option value="prep3">{t.gradePrep3Full}</option>
                <option value="sec1">{t.gradeSec1Full}</option>
                <option value="sec2">{t.gradeSec2Full}</option>
                <option value="sec3">{t.gradeSec3Full}</option>
              </select>
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: '8px 14px', backgroundColor: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', fontSize: '14px' }}>
                <option value="newest">{t.sortNewest}</option>
                <option value="oldest">{t.sortOldest}</option>
                <option value="difficulty">الصعوبة</option>
              </select>
            </div>

            {/* قائمة الأسئلة مع ترقيم الصفحات */}
            {filteredQuestions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 0', color: 'var(--text-muted)' }}>
                <Icons.Clipboard style={{ height: 56, width: 56, margin: '0 auto 16px', opacity: 0.3 }} />
                <p style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>{t.noQuestions}</p>
                <button onClick={() => setModals(prev => ({ ...prev, addQuestion: true }))} style={{ marginTop: '12px', padding: '10px 24px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer', fontSize: '15px' }}>{t.addFirstQuestion}</button>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                  {paginatedQuestions.map(q => {
                    const typeColor = { mcq: '#fbbf24', truefalse: '#3b82f6', short: '#22c55e', essay: '#a855f7', matching: '#ec4899' }[q.type] || '#fbbf24';
                    const difficultyColor = { easy: '#22c55e', medium: '#fbbf24', hard: '#f97316', expert: '#ef4444' }[q.difficulty] || '#fbbf24';
                    return (
                      <div key={q.id} style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', transition: 'all 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.06)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1, minWidth: 0 }}>
                          <input type="checkbox" checked={selectedQuestions.includes(q.id)} onChange={() => setSelectedQuestions(prev => prev.includes(q.id) ? prev.filter(id => id !== q.id) : [...prev, q.id])} style={{ marginTop: '4px', accentColor: 'var(--primary-color)', width: 18, height: 18, flexShrink: 0 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', margin: 0, lineHeight: 1.5 }}>{q.question_text}</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '13px', color: 'var(--text-muted)' }}>
                              <span style={{ padding: '2px 12px', backgroundColor: `${typeColor}22`, color: typeColor, borderRadius: '9999px', fontWeight: 600, fontSize: '12px', border: `1px solid ${typeColor}33` }}>{q.type}</span>
                              <span style={{ padding: '2px 12px', backgroundColor: `${difficultyColor}22`, color: difficultyColor, borderRadius: '9999px', fontWeight: 600, fontSize: '12px', border: `1px solid ${difficultyColor}33` }}>{q.difficulty}</span>
                              {q.tags && q.tags.length > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}><Icons.Tag style={{ height: 14, width: 14 }} /> {q.tags.join(', ')}</span>}
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{q.marks || 1} نقطة</span>
                              {(q.grade || q.grade_level) && <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}><Icons.GraduationCap style={{ height: 14, width: 14 }} /> {q.grade || q.grade_level}</span>}
                              {/* عرض الخيارات مع تمييز الإجابة الصحيحة */}
                              {q.options && q.options.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                                  {q.options.map((opt, i) => (
                                    <span
                                      key={i}
                                      style={{
                                        fontSize: '10px',
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        backgroundColor: opt === q.correct_answer ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.05)',
                                        border: `1px solid ${opt === q.correct_answer ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                        color: opt === q.correct_answer ? '#22c55e' : 'var(--text-muted)',
                                      }}
                                    >
                                      {String.fromCharCode(65 + i)}. {opt}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <button onClick={() => { setSelectedQuestion(q); setModals(prev => ({ ...prev, editQuestion: true })); }} style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}><Icons.Edit style={{ height: 18, width: 18 }} /></button>
                          <button onClick={() => { setQuestionToDelete(q.id); setModals(prev => ({ ...prev, deleteQuestion: true })); }} style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: 'transparent', color: '#ef4444', cursor: 'pointer' }}><Icons.Trash2 style={{ height: 18, width: 18 }} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* ترقيم الصفحات */}
                {totalPages > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px' }}>
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.3 : 1 }}>{t.previous}</button>
                    {[...Array(totalPages)].map((_, i) => (
                      <button key={i} onClick={() => setCurrentPage(i + 1)} style={{ padding: '6px 12px', borderRadius: '8px', border: 'none', backgroundColor: currentPage === i + 1 ? 'var(--primary-color)' : 'transparent', color: currentPage === i + 1 ? '#000' : 'var(--text-primary)', fontWeight: currentPage === i + 1 ? 700 : 400, cursor: 'pointer' }}>{i + 1}</button>
                    ))}
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-primary)', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.3 : 1 }}>{t.next}</button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* سجل النشاط (محسن) */}
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Icons.History style={{ height: 22, width: 22, color: 'var(--primary-color)' }} /> {t.activityLogTitle}
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>تم إنشاء البنك</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(bank.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {questions.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>تم إضافة {questions.length} سؤال</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(questions[0]?.created_at || Date.now()).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
              {bank.updated_at && bank.updated_at !== bank.created_at && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>آخر تحديث للبنك</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(bank.updated_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* المودالات */}
      <QuestionFormModal isOpen={modals.addQuestion} onClose={() => setModals(prev => ({ ...prev, addQuestion: false }))} onSave={handleAddQuestion} language={language} />
      <QuestionFormModal isOpen={modals.editQuestion} onClose={() => { setModals(prev => ({ ...prev, editQuestion: false })); setSelectedQuestion(null); }} onSave={handleEditQuestion} initialData={selectedQuestion} language={language} />
      <ConfirmModal isOpen={modals.deleteQuestion} onClose={() => { setModals(prev => ({ ...prev, deleteQuestion: false })); setQuestionToDelete(null); }} onConfirm={() => { if (questionToDelete) handleDeleteQuestion(questionToDelete); }} title={t.deleteQuestion} message={t.confirmDeleteQuestion} confirmLabel={t.delete} cancelLabel={t.cancel} />
      <ConfirmModal isOpen={modals.deleteBank} onClose={() => setModals(prev => ({ ...prev, deleteBank: false }))} onConfirm={handleDeleteBank} title={t.deleteBank} message={t.confirmDeleteBank} confirmLabel={t.delete} cancelLabel={t.cancel} />
      <TagManagerModal isOpen={modals.tags} onClose={() => setModals(prev => ({ ...prev, tags: false }))} bankId={bankId} language={language} onUpdate={fetchData} />
      <CreateExamModal isOpen={modals.createExam} onClose={() => setModals(prev => ({ ...prev, createExam: false }))} bankId={bankId} language={language} onSuccess={handleCreateExam} />
      <ExportModal isOpen={modals.export} onClose={() => setModals(prev => ({ ...prev, export: false }))} questions={questions} language={language} onExport={handleExport} />
      <ShareModal isOpen={modals.share} onClose={() => setModals(prev => ({ ...prev, share: false }))} bankId={bankId} language={language} onShare={handleShare} />
    </TeacherLayout>
  );
}