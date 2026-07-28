// ================================================================
// 📁 app/dashboard/assistant/question-bank/[bankId]/create-exam/page.js
// 📝 إنشاء امتحان من بنك الأسئلة – النسخة المتطورة للمساعد V1
// ================================================================
// - تعتمد على APIs خاصة بالمساعد (/api/assistant/exams, /api/assistant/question-bank)
// - دعم كامل للصلاحيات (can_create على exams)
// - دعم الثيم الفاتح/الداكن عبر useTheme
// - استخدام useCachedFetch و useAssistantData للسرعة
// - اختيار الأسئلة من البنك، توليد عشوائي، معاينة، حفظ كمسودة أو نشر
// ================================================================

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Plus,
  Shuffle,
  Save,
  Eye,
  X,
  Loader2,
  AlertTriangle,
  Globe,
  Sun,
  Moon,
  FileText,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/app/theme/ThemeProvider';
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import { useCachedFetch } from '@/lib/hooks/useCachedFetch';
import { supabase } from '@/lib/supabaseClient';

// ================================================================
// 🌍 الترجمات
// ================================================================

const translations = {
  ar: {
    title: '📝 إنشاء امتحان من البنك',
    subtitle: 'اختر الأسئلة من هذا البنك لإنشاء امتحان جديد',
    backToBank: 'العودة إلى البنك',
    selectQuestions: 'اختر الأسئلة',
    examTitle: 'عنوان الامتحان',
    examDescription: 'وصف الامتحان (اختياري)',
    duration: 'المدة (دقائق)',
    totalMarks: 'الدرجة الكلية',
    passingMarks: 'درجة النجاح',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    shuffleQuestions: 'ترتيب الأسئلة عشوائياً',
    showResults: 'عرض النتائج فوراً',
    allowBackward: 'السماح بالرجوع',
    attemptsAllowed: 'عدد المحاولات المسموحة',
    createExam: 'إنشاء الامتحان',
    creating: 'جاري الإنشاء...',
    selectedCount: 'الأسئلة المختارة',
    noQuestionsSelected: 'لم تختر أي سؤال',
    saveSuccess: 'تم إنشاء الامتحان بنجاح',
    saveFailed: 'فشل إنشاء الامتحان',
    requiredFields: 'يرجى ملء جميع الحقول المطلوبة',
    cancel: 'إلغاء',
    courses: 'الكورس المرتبط',
    allCourses: 'بدون كورس',
    randomGenerate: 'توليد عشوائي',
    randomSettings: 'إعدادات التوليد العشوائي',
    questionCount: 'عدد الأسئلة',
    selectAllQuestions: 'تحديد الكل',
    removeAll: 'إزالة الكل',
    previewExam: 'معاينة الامتحان',
    saveAsDraft: 'حفظ كمسودة',
    showCorrectAnswers: 'عرض الإجابات الصحيحة بعد الانتهاء',
    allowReview: 'السماح بمراجعة الأسئلة',
    randomizeOptions: 'خلط الخيارات عشوائياً',
    timeLimitPerQuestion: 'وقت لكل سؤال (ثوانٍ)',
    noQuestionsInBank: 'لا توجد أسئلة كافية في البنك',
    questionsSummary: 'ملخص الأسئلة المختارة',
    totalSelected: 'الإجمالي',
    marksTotal: 'مجموع الدرجات',
    generate: 'توليد',
    close: 'إغلاق',
    fetchFailed: 'فشل جلب البيانات',
    warningLowQuestions: 'هذا البنك يحتوي على {count} سؤال فقط. قد يكون عدد الأسئلة غير كافٍ لإنشاء امتحان متكامل.',
    warningNoQuestions: 'هذا البنك لا يحتوي على أي أسئلة. يرجى إضافة أسئلة قبل إنشاء امتحان.',
    selectQuestionsHint: 'اضغط على "اختيار الأسئلة" لاختيار الأسئلة من البنك',
    language: 'اللغة',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    gold: 'ذهبي',
    blue: 'أزرق',
    green: 'أخضر',
    purple: 'بنفسجي',
  },
  en: {
    title: '📝 Create Exam from Bank',
    subtitle: 'Select questions from this bank to create a new exam',
    backToBank: 'Back to Bank',
    selectQuestions: 'Select Questions',
    examTitle: 'Exam Title',
    examDescription: 'Exam Description (optional)',
    duration: 'Duration (minutes)',
    totalMarks: 'Total Marks',
    passingMarks: 'Passing Marks',
    startDate: 'Start Date',
    endDate: 'End Date',
    shuffleQuestions: 'Shuffle Questions',
    showResults: 'Show Results Immediately',
    allowBackward: 'Allow Backward',
    attemptsAllowed: 'Allowed Attempts',
    createExam: 'Create Exam',
    creating: 'Creating...',
    selectedCount: 'Selected Questions',
    noQuestionsSelected: 'No questions selected',
    saveSuccess: 'Exam created successfully',
    saveFailed: 'Failed to create exam',
    requiredFields: 'Please fill all required fields',
    cancel: 'Cancel',
    courses: 'Associated Course',
    allCourses: 'No Course',
    randomGenerate: 'Random Generate',
    randomSettings: 'Random Generation Settings',
    questionCount: 'Number of Questions',
    selectAllQuestions: 'Select All',
    removeAll: 'Remove All',
    previewExam: 'Preview Exam',
    saveAsDraft: 'Save as Draft',
    showCorrectAnswers: 'Show Correct Answers After Completion',
    allowReview: 'Allow Question Review',
    randomizeOptions: 'Randomize Options',
    timeLimitPerQuestion: 'Time per Question (seconds)',
    noQuestionsInBank: 'Not enough questions in bank',
    questionsSummary: 'Selected Questions Summary',
    totalSelected: 'Total',
    marksTotal: 'Total Marks',
    generate: 'Generate',
    close: 'Close',
    fetchFailed: 'Failed to fetch data',
    warningLowQuestions: 'This bank has only {count} questions. The number may be insufficient to create a complete exam.',
    warningNoQuestions: 'This bank has no questions. Please add questions before creating an exam.',
    selectQuestionsHint: 'Click "Select Questions" to choose questions from the bank',
    language: 'Language',
    themeLight: 'Light',
    themeDark: 'Dark',
    gold: 'Gold',
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
  },
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

// ================================================================
// 🧩 شريط الإعدادات
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

// ================================================================
// 🧩 مودال اختيار الأسئلة
// ================================================================

const QuestionSelectorModal = ({
  isOpen,
  onClose,
  bankId,
  language,
  onConfirm,
  initialSelected = [],
  isDark,
}) => {
  const t = translations[language];
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');

  // جلب الأسئلة من البنك
  useEffect(() => {
    if (!isOpen || !bankId) return;
    const fetchQuestions = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/assistant/question-bank/${bankId}/questions`);
        const data = await res.json();
        if (res.ok) {
          setQuestions(data.questions || []);
          // تهيئة المحددات بناءً على initialSelected (تطابق بالـ id)
          const initialIds = initialSelected.map(q => q.id);
          setSelected(questions.filter(q => initialIds.includes(q.id)).map(q => q.id));
        } else {
          toast.error(t.fetchFailed);
        }
      } catch { toast.error(t.fetchFailed); }
      finally { setLoading(false); }
    };
    fetchQuestions();
  }, [isOpen, bankId, t, initialSelected]);

  const toggleSelect = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selected.length === questions.length) setSelected([]);
    else setSelected(questions.map(q => q.id));
  };

  const handleConfirm = () => {
    const selectedQuestions = questions.filter(q => selected.includes(q.id));
    onConfirm(selectedQuestions);
    onClose();
  };

  const filtered = questions.filter(q =>
    q.question_text.toLowerCase().includes(search.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={onClose}>
      <div className={`rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.selectQuestions}</h3>
          <button onClick={onClose} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
            <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t.searchQuestions || 'ابحث في الأسئلة...'}
            className={`flex-1 p-3 rounded-xl border outline-none text-sm ${isDark ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50' : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'}`}
          />
          <button
            onClick={selectAll}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${isDark ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 hover:bg-yellow-400/20' : 'bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200'}`}
          >
            {selected.length === questions.length ? t.deselectAll : t.selectAll}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className={`text-center py-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <p>{t.noQuestionsInBank}</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {filtered.map(q => (
              <div
                key={q.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition ${selected.includes(q.id) ? 'border-yellow-400 bg-yellow-400/5' : isDark ? 'border-[var(--border-color)] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.includes(q.id)}
                  onChange={() => toggleSelect(q.id)}
                  className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{q.question_text}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-gray-400">
                    <span>{q.type}</span>
                    <span>•</span>
                    <span>{q.difficulty}</span>
                    <span>•</span>
                    <span>{q.marks || 1} نقطة</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
          <button
            onClick={handleConfirm}
            className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20"
          >
            {t.save} ({selected.length})
          </button>
          <button
            onClick={onClose}
            className={`px-6 py-3 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}
          >
            {t.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// 📄 الصفحة الرئيسية
// ================================================================

export default function AssistantCreateExamFromBankPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params?.bankId;

  const { isDark, toggleTheme } = useTheme();
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();
  const [language, setLanguage] = useState('ar');
  const t = translations[language];

  // صلاحية إنشاء الامتحان
  const canCreateExam = hasPermission(permissions, 'exams', 'can_create');

  // ===== جلب بيانات البنك والكورسات =====
  const teacherId = assistant?.teacher_id;
  const { data: bankData, isLoading: bankLoading } = useCachedFetch(
    teacherId ? `/api/assistant/question-bank/${bankId}?teacher_id=${teacherId}` : null
  );
  const { data: coursesData, isLoading: coursesLoading } = useCachedFetch(
    teacherId ? `/api/assistant/courses?teacher_id=${teacherId}` : null
  );
  // عدد الأسئلة في البنك (من bankData)
  const bank = bankData?.bank || null;
  const totalQuestionsInBank = bank?.questions_count || 0;

  // ===== حالات النموذج =====
  const [examData, setExamData] = useState({
    title: '',
    description: '',
    course_id: '',
    duration_minutes: 60,
    total_marks: 0,
    passing_marks: 0,
    start_date: '',
    end_date: '',
    shuffle_questions: false,
    show_results_immediately: true,
    allow_backward: true,
    attempts_allowed: 1,
    is_published: false,
    show_correct_answers: true,
    allow_review: true,
    randomize_options: true,
    time_limit_per_question: 0,
  });

  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomOptions, setRandomOptions] = useState({
    count: 10,
    difficulty: 'all',
    type: 'all',
  });

  // تحديث الدرجات عند تغيير الأسئلة
  useEffect(() => {
    const total = selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    setExamData(prev => ({
      ...prev,
      total_marks: total,
      passing_marks: Math.round(total * 0.6),
    }));
  }, [selectedQuestions]);

  // إحصائيات الأسئلة المختارة
  const selectedStats = useMemo(() => {
    if (selectedQuestions.length === 0) return null;
    const total = selectedQuestions.length;
    const byType = {};
    const byDifficulty = {};
    let totalMarks = 0;
    selectedQuestions.forEach(q => {
      byType[q.type] = (byType[q.type] || 0) + 1;
      byDifficulty[q.difficulty] = (byDifficulty[q.difficulty] || 0) + 1;
      totalMarks += (q.marks || 1);
    });
    return { total, byType, byDifficulty, totalMarks };
  }, [selectedQuestions]);

  // معالجة اختيار الأسئلة من المودال
  const handleQuestionSelect = (questions) => {
    setSelectedQuestions(questions);
    setShowSelector(false);
    toast.success(`تم اختيار ${questions.length} سؤال`);
  };

  // معالجة تغيير حقول النموذج
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setExamData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : parseInt(value) || 0) : value,
    }));
  };

  // توليد عشوائي
  const handleRandomGenerate = async () => {
    setLoading(true);
    try {
      let url = `/api/assistant/question-bank/${bankId}/questions?`;
      if (randomOptions.difficulty !== 'all') url += `difficulty=${randomOptions.difficulty}&`;
      if (randomOptions.type !== 'all') url += `type=${randomOptions.type}&`;
      url += `limit=${randomOptions.count}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل التوليد');
      const questions = data.questions || [];
      if (questions.length === 0) {
        toast.warning('لا توجد أسئلة تطابق المعايير المحددة');
        return;
      }
      // خلط عشوائي
      const shuffled = questions.sort(() => Math.random() - 0.5);
      setSelectedQuestions(shuffled);
      toast.success(`تم اختيار ${shuffled.length} سؤال عشوائياً`);
      setShowRandomModal(false);
    } catch (err) {
      toast.error(err.message || 'فشل التوليد العشوائي');
    } finally {
      setLoading(false);
    }
  };

  // إزالة سؤال فردي
  const handleRemoveQuestion = (index) => {
    const updated = [...selectedQuestions];
    updated.splice(index, 1);
    setSelectedQuestions(updated);
    toast.success('تم إزالة السؤال');
  };

  // إزالة الكل
  const handleClearAll = () => {
    if (selectedQuestions.length === 0) return;
    if (confirm('هل أنت متأكد من إزالة جميع الأسئلة المختارة؟')) {
      setSelectedQuestions([]);
      toast.success('تم إزالة جميع الأسئلة');
    }
  };

  // التحقق من صحة النموذج
  const validateForm = () => {
    if (!examData.title.trim()) {
      toast.error('الرجاء إدخال عنوان الامتحان');
      return false;
    }
    if (selectedQuestions.length === 0) {
      toast.error('الرجاء اختيار سؤال واحد على الأقل');
      return false;
    }
    if (!examData.start_date) {
      toast.error('الرجاء تحديد تاريخ البداية');
      return false;
    }
    if (!examData.end_date) {
      toast.error('الرجاء تحديد تاريخ النهاية');
      return false;
    }
    if (new Date(examData.end_date) <= new Date(examData.start_date)) {
      toast.error('تاريخ النهاية يجب أن يكون بعد تاريخ البداية');
      return false;
    }
    if (examData.duration_minutes < 1) {
      toast.error('المدة يجب أن تكون دقيقة واحدة على الأقل');
      return false;
    }
    if (examData.attempts_allowed < 1) {
      toast.error('عدد المحاولات يجب أن يكون 1 على الأقل');
      return false;
    }
    return true;
  };

  // حفظ الامتحان (نشر أو مسودة)
  const handleSubmit = async (e, asDraft = false) => {
    e.preventDefault();
    if (!canCreateExam) {
      toast.error('ليس لديك صلاحية لإنشاء امتحانات');
      return;
    }
    if (!validateForm()) return;

    setSaving(true);
    try {
      // 1. إنشاء الامتحان عبر API
      const examPayload = {
        teacher_id: assistant?.teacher_id,
        title: examData.title.trim(),
        description: examData.description.trim(),
        course_id: examData.course_id || null,
        duration_minutes: examData.duration_minutes,
        total_marks: examData.total_marks,
        passing_marks: examData.passing_marks,
        start_date: examData.start_date,
        end_date: examData.end_date,
        shuffle_questions: examData.shuffle_questions,
        show_results_immediately: examData.show_results_immediately,
        allow_backward: examData.allow_backward,
        attempts_allowed: examData.attempts_allowed,
        is_published: !asDraft,
        show_correct_answers: examData.show_correct_answers,
        allow_review: examData.allow_review,
        randomize_options: examData.randomize_options,
        time_limit_per_question: examData.time_limit_per_question,
      };

      const res = await fetch('/api/assistant/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examPayload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.saveFailed);

      const examId = data.exam.id;

      // 2. إضافة الأسئلة إلى الامتحان
      const questionsPayload = selectedQuestions.map((q, index) => ({
        exam_id: examId,
        question_text: q.question_text,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        marks: q.marks || 1,
        order_index: index,
        bank_question_id: q.id,
      }));

      const qRes = await fetch(`/api/assistant/exams/${examId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsPayload }),
      });
      if (!qRes.ok) {
        const qData = await qRes.json();
        console.warn('⚠️ Warning: Questions import failed:', qData);
        toast.warning('تم إنشاء الامتحان ولكن حدث خطأ في إضافة الأسئلة');
      }

      toast.success(asDraft ? 'تم حفظ الامتحان كمسودة' : t.saveSuccess);
      router.push(`/dashboard/assistant/exams/${examId}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || t.saveFailed);
    } finally {
      setSaving(false);
    }
  };

  // ===== حالة التحميل =====
  if (assistantLoading || bankLoading || coursesLoading) {
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
  if (!canCreateExam) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>غير مصرح لك</h2>
          <p className={`text-sm mt-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>لا تملك صلاحية لإنشاء امتحانات</p>
          <Link href={`/dashboard/assistant/question-bank/${bankId}`} className="mt-4 inline-block px-6 py-2.5 bg-yellow-400/20 text-yellow-300 rounded-xl transition">
            العودة إلى البنك
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
            العودة إلى البنوك
          </button>
        </div>
      </div>
    );
  }

  const courses = coursesData?.courses || [];

  // ===== العرض الرئيسي =====
  return (
    <div className={`min-h-screen ${isDark ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
        <SettingsBar isDark={isDark} toggleTheme={toggleTheme} language={language} setLanguage={setLanguage} />

        {/* الرأس */}
        <div className="flex items-center gap-3 mb-6">
          <Link href={`/dashboard/assistant/question-bank/${bankId}`} className={`p-2 rounded-lg transition ${isDark ? 'hover:bg-white/5 text-[var(--text-secondary)]' : 'hover:bg-gray-100 text-gray-500'}`}>
            <ArrowRight className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
              {t.title}
            </h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
              {t.subtitle} <span className="text-yellow-400 font-semibold">{bank.title}</span>
            </p>
          </div>
        </div>

        {/* تحذير عدد الأسئلة */}
        {totalQuestionsInBank < 5 && (
          <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'}`}>
            <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <span className={`text-sm ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              {totalQuestionsInBank === 0
                ? t.warningNoQuestions
                : t.warningLowQuestions.replace('{count}', totalQuestionsInBank)}
            </span>
          </div>
        )}

        {/* النموذج */}
        <form onSubmit={(e) => handleSubmit(e, false)} className={`rounded-2xl p-6 space-y-5 ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-sm'}`}>
          {/* عنوان الامتحان */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              {t.examTitle} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              name="title"
              value={examData.title}
              onChange={handleInputChange}
              placeholder="مثال: اختبار الفصل الأول"
              className={`w-full p-3 rounded-xl border outline-none transition text-sm ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
              required
            />
          </div>

          {/* وصف الامتحان */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              {t.examDescription}
            </label>
            <textarea
              name="description"
              value={examData.description}
              onChange={handleInputChange}
              rows="3"
              placeholder="وصف مختصر للامتحان"
              className={`w-full p-3 rounded-xl border outline-none transition text-sm resize-none ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            />
          </div>

          {/* الكورس المرتبط */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              {t.courses}
            </label>
            <select
              name="course_id"
              value={examData.course_id}
              onChange={handleInputChange}
              className={`w-full p-3 rounded-xl border outline-none transition text-sm ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            >
              <option value="">{t.allCourses}</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>

          {/* المدة والدرجات */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                {t.duration} <span className="text-red-400">*</span>
              </label>
              <input
                type="number"
                name="duration_minutes"
                value={examData.duration_minutes}
                onChange={handleInputChange}
                min={1}
                className={`w-full p-3 rounded-xl border outline-none transition text-sm ${
                  isDark
                    ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                }`}
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                {t.totalMarks}
              </label>
              <input
                type="number"
                name="total_marks"
                value={examData.total_marks}
                readOnly
                className={`w-full p-3 rounded-xl border outline-none text-sm opacity-70 cursor-not-allowed ${
                  isDark
                    ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)]'
                    : 'bg-gray-50 border-gray-200 text-gray-900'
                }`}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                {t.passingMarks}
              </label>
              <input
                type="number"
                name="passing_marks"
                value={examData.passing_marks}
                onChange={handleInputChange}
                min={0}
                className={`w-full p-3 rounded-xl border outline-none transition text-sm ${
                  isDark
                    ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                }`}
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                {t.attemptsAllowed}
              </label>
              <input
                type="number"
                name="attempts_allowed"
                value={examData.attempts_allowed}
                onChange={handleInputChange}
                min={1}
                className={`w-full p-3 rounded-xl border outline-none transition text-sm ${
                  isDark
                    ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                }`}
              />
            </div>
          </div>

          {/* التواريخ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                {t.startDate} <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                name="start_date"
                value={examData.start_date}
                onChange={handleInputChange}
                className={`w-full p-3 rounded-xl border outline-none transition text-sm ${
                  isDark
                    ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                }`}
                required
              />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                {t.endDate} <span className="text-red-400">*</span>
              </label>
              <input
                type="datetime-local"
                name="end_date"
                value={examData.end_date}
                onChange={handleInputChange}
                className={`w-full p-3 rounded-xl border outline-none transition text-sm ${
                  isDark
                    ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                }`}
                required
              />
            </div>
          </div>

          {/* إعدادات إضافية */}
          <div className={`flex flex-wrap gap-4 pt-2 border-t ${isDark ? 'border-[var(--border-color)]' : 'border-gray-200'}`}>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                name="shuffle_questions"
                checked={examData.shuffle_questions}
                onChange={handleInputChange}
                className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
              />
              {t.shuffleQuestions}
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                name="show_results_immediately"
                checked={examData.show_results_immediately}
                onChange={handleInputChange}
                className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
              />
              {t.showResults}
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                name="allow_backward"
                checked={examData.allow_backward}
                onChange={handleInputChange}
                className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
              />
              {t.allowBackward}
            </label>
          </div>

          {/* خيارات متقدمة */}
          <div className={`flex flex-wrap items-center gap-4 pt-2 border-t ${isDark ? 'border-[var(--border-color)]' : 'border-gray-200'}`}>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                name="show_correct_answers"
                checked={examData.show_correct_answers}
                onChange={handleInputChange}
                className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
              />
              {t.showCorrectAnswers}
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                name="allow_review"
                checked={examData.allow_review}
                onChange={handleInputChange}
                className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
              />
              {t.allowReview}
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              <input
                type="checkbox"
                name="randomize_options"
                checked={examData.randomize_options}
                onChange={handleInputChange}
                className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
              />
              {t.randomizeOptions}
            </label>
            <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
              <span>{t.timeLimitPerQuestion}:</span>
              <input
                type="number"
                name="time_limit_per_question"
                value={examData.time_limit_per_question}
                onChange={handleInputChange}
                min={0}
                className={`w-20 p-2 rounded-lg border outline-none text-sm ${
                  isDark
                    ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                    : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                }`}
              />
            </div>
          </div>

          {/* اختيار الأسئلة */}
          <div className={`p-4 rounded-xl ${isDark ? 'bg-purple-500/10 border border-purple-500/20' : 'bg-purple-50 border border-purple-200'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className={`text-sm font-semibold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.selectQuestions}</p>
                <p className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
                  {selectedQuestions.length > 0 ? `${t.selectedCount}: ${selectedQuestions.length}` : t.noQuestionsSelected}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setShowSelector(true)}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-semibold transition flex items-center gap-1"
                >
                  <Plus className="h-4 w-4" /> {t.selectQuestions}
                </button>
                <button
                  type="button"
                  onClick={() => setShowRandomModal(true)}
                  className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl text-sm font-semibold transition flex items-center gap-1"
                >
                  <Shuffle className="h-4 w-4" /> {t.randomGenerate}
                </button>
              </div>
            </div>

            {/* عرض الأسئلة المختارة */}
            {selectedQuestions.length > 0 && (
              <div className="mt-3">
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{selectedQuestions.length} سؤال</span>
                  <button onClick={handleClearAll} className="text-xs text-red-400 hover:text-red-300 transition">
                    {t.removeAll}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  {selectedQuestions.map((q, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2 rounded-lg border ${isDark ? 'border-[var(--border-color)] bg-[var(--bg-secondary)]' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{q.question_text}</p>
                        <div className={`flex gap-2 text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                          <span>{q.type}</span>
                          <span>•</span>
                          <span>{q.difficulty}</span>
                          <span>•</span>
                          <span>{q.marks || 1} نقطة</span>
                        </div>
                      </div>
                      <button onClick={() => handleRemoveQuestion(idx)} className="p-1 text-red-400 hover:text-red-300 transition">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                {/* إحصائيات الأسئلة المختارة */}
                {selectedStats && (
                  <div className={`mt-3 p-2 rounded-lg flex flex-wrap gap-3 text-xs ${isDark ? 'bg-yellow-400/5 border border-yellow-400/20' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <span className={isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}>
                      {t.totalSelected}: <strong className="text-yellow-400">{selectedStats.total}</strong>
                    </span>
                    {Object.entries(selectedStats.byType).map(([type, count]) => (
                      <span key={type} className={isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}>
                        {type}: <strong className="text-yellow-400">{count}</strong>
                      </span>
                    ))}
                    {Object.entries(selectedStats.byDifficulty).map(([diff, count]) => (
                      <span key={diff} className={isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}>
                        {diff}: <strong className="text-yellow-400">{count}</strong>
                      </span>
                    ))}
                    <span className={isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}>
                      {t.marksTotal}: <strong className="text-yellow-400">{selectedStats.totalMarks}</strong>
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* أزرار الإجراء */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-[var(--border-color)]">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
              {saving ? t.creating : t.createExam}
            </button>
            <button
              type="button"
              onClick={(e) => handleSubmit(e, true)}
              disabled={saving}
              className="px-6 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl font-semibold transition flex items-center gap-2"
            >
              <FileText className="h-5 w-5" /> {t.saveAsDraft}
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl font-semibold transition flex items-center gap-2"
            >
              <Eye className="h-5 w-5" /> {t.previewExam}
            </button>
            <Link
              href={`/dashboard/assistant/question-bank/${bankId}`}
              className={`px-6 py-3 rounded-xl transition flex items-center gap-2 ${
                isDark
                  ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]'
                  : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'
              }`}
            >
              {t.cancel}
            </Link>
          </div>
        </form>
      </div>

      {/* ===== مودال اختيار الأسئلة ===== */}
      <QuestionSelectorModal
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        bankId={bankId}
        language={language}
        onConfirm={handleQuestionSelect}
        initialSelected={selectedQuestions}
        isDark={isDark}
      />

      {/* ===== مودال التوليد العشوائي ===== */}
      {showRandomModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowRandomModal(false)}>
          <div className={`rounded-3xl p-8 max-w-md w-full ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
            <h3 className={`text-2xl font-bold mb-4 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.randomSettings}</h3>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>{t.questionCount}</label>
                <input
                  type="number"
                  value={randomOptions.count}
                  onChange={(e) => setRandomOptions(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
                  min={1}
                  max={50}
                  className={`w-full p-3 rounded-xl border outline-none text-sm ${
                    isDark
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>الصعوبة</label>
                <select
                  value={randomOptions.difficulty}
                  onChange={(e) => setRandomOptions(prev => ({ ...prev, difficulty: e.target.value }))}
                  className={`w-full p-3 rounded-xl border outline-none text-sm ${
                    isDark
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                  }`}
                >
                  <option value="all">الكل</option>
                  <option value="easy">سهل</option>
                  <option value="medium">متوسط</option>
                  <option value="hard">صعب</option>
                  <option value="expert">خبير</option>
                </select>
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>النوع</label>
                <select
                  value={randomOptions.type}
                  onChange={(e) => setRandomOptions(prev => ({ ...prev, type: e.target.value }))}
                  className={`w-full p-3 rounded-xl border outline-none text-sm ${
                    isDark
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                  }`}
                >
                  <option value="all">الكل</option>
                  <option value="mcq">اختيار من متعدد</option>
                  <option value="truefalse">صح/خطأ</option>
                  <option value="short">إجابة قصيرة</option>
                  <option value="essay">مقالي</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
              <button
                onClick={handleRandomGenerate}
                className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20"
              >
                {t.generate}
              </button>
              <button
                onClick={() => setShowRandomModal(false)}
                className={`px-6 py-3 rounded-xl transition ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]' : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'}`}
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== مودال المعاينة ===== */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" onClick={() => setShowPreview(false)}>
          <div className={`rounded-3xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto ${isDark ? 'bg-[var(--bg-card)] border border-[var(--border-color)]' : 'bg-white border border-gray-200 shadow-2xl'}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{t.previewExam}</h3>
              <button onClick={() => setShowPreview(false)} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/5' : 'hover:bg-gray-100'}`}>
                <X className={`h-6 w-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <p className={`text-lg font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>{examData.title || '(بدون عنوان)'}</p>
                <p className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>{examData.description || 'لا يوجد وصف'}</p>
              </div>
              <div className={`grid grid-cols-2 gap-2 p-4 rounded-xl ${isDark ? 'bg-[var(--bg-secondary)] border border-[var(--border-color)]' : 'bg-gray-50 border border-gray-200'}`}>
                <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>المدة: <strong className={isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}>{examData.duration_minutes} دقيقة</strong></span>
                <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>الدرجة: <strong className={isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}>{examData.total_marks}</strong></span>
                <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>النجاح: <strong className={isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}>{examData.passing_marks}</strong></span>
                <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>الأسئلة: <strong className={isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}>{selectedQuestions.length}</strong></span>
              </div>
              <div>
                <p className={`text-sm font-semibold mb-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>الأسئلة:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {selectedQuestions.slice(0, 5).map((q, idx) => (
                    <div key={idx} className={`p-2 rounded-lg border ${isDark ? 'border-[var(--border-color)]' : 'border-gray-200'} text-sm ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
                      {idx + 1}. {q.question_text}
                    </div>
                  ))}
                  {selectedQuestions.length > 5 && (
                    <div className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                      ... و {selectedQuestions.length - 5} سؤال آخر
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="w-full mt-6 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20"
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

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
  );
}