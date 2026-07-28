// ================================================================
// 📁 app/dashboard/assistant/exams/new/page.js
// 📝 إنشاء امتحان جديد – النسخة المتطورة للمساعد V1
// ================================================================
// - مستوحاة من نسخة المعلم مع تحسينات خاصة بالمساعد
// - دعم كامل للصلاحيات (can_create)
// - دعم الثيم الفاتح/الداكن عبر useTheme الموحّد
// - استخدام APIs خاصة بالمساعد (/api/assistant/exams)
// - استيراد أسئلة من بنوك الأسئلة
// - حفظ كمسودة أو نشر فوري
// - استخدام useCachedFetch و useAssistantData للسرعة
// ================================================================

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Plus,
  Calendar,
  Settings,
  Shield,
  Database,
  Shuffle,
  Eye,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  X,
  Lock,
  Star,
  Clock,
  Book,
  Sun,
  Moon,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import { useCachedFetch } from '@/lib/hooks/useCachedFetch';
import dynamic from 'next/dynamic';

// استيراد مودال بنك الأسئلة بشكل ديناميكي
const QuestionBankSelector = dynamic(
  () => import('@/components/QuestionBankSelector'),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto" />
          <p className="text-gray-400 mt-4">جاري تحميل بنك الأسئلة...</p>
        </div>
      </div>
    ),
  }
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

// ================================================================
// 🎨 مكون الإدخال (معدل لاستخدام styles)
// ================================================================

const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  icon: Icon,
  required = false,
  rows,
  options,
  isTextarea = false,
  isSelect = false,
  disabled = false,
  styles,
  min,
  max,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const hasError = error && isTouched;

  return (
    <div>
      <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative">
        {Icon && !isSelect && !isTextarea && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${
            isFocused ? 'text-yellow-400 scale-110' : 'text-gray-400'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        {isSelect ? (
          <select
            name={name}
            value={value}
            onChange={(e) => { onChange(e); setIsTouched(true); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            disabled={disabled}
            className={`w-full p-3 rounded-xl border outline-none transition appearance-none ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${
              hasError ? 'border-red-500' : ''
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          >
            <option value="">اختر...</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea
            name={name}
            rows={rows || 4}
            value={value}
            onChange={(e) => { onChange(e); setIsTouched(true); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full p-3 rounded-xl border outline-none transition resize-y ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${
              hasError ? 'border-red-500' : ''
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        ) : (
          <input
            type={type}
            name={name}
            value={value}
            onChange={(e) => { onChange(e); setIsTouched(true); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            placeholder={placeholder}
            disabled={disabled}
            min={min}
            max={max}
            className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${
              hasError ? 'border-red-500' : ''
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
          />
        )}
      </div>
      <AnimatePresence>
        {hasError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-red-400 text-xs mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// 📊 ملخص الأسئلة المستوردة (معدل لاستخدام styles)
// ================================================================

const QuestionsSummary = ({ questions, onRemove, onRemoveAll, styles }) => {
  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
  const byType = {};
  questions.forEach(q => {
    byType[q.type] = (byType[q.type] || 0) + 1;
  });

  if (questions.length === 0) return null;

  return (
    <div className={`mt-3 p-3 rounded-xl border ${styles.card} border ${styles.border}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`text-sm ${styles.text}`}>
          <CheckCircle className="inline h-4 w-4 text-green-400 ml-1" />
          {questions.length} سؤال
        </span>
        <span className={`text-sm ${styles.text}`}>
          <Star className="inline h-4 w-4 text-yellow-400 ml-1" />
          {totalMarks} درجة
        </span>
        {Object.entries(byType).map(([type, count]) => (
          <span key={type} className={`text-xs px-2 py-1 rounded-full ${styles.card} border ${styles.border} ${styles.subtext}`}>
            {type}: {count}
          </span>
        ))}
        <button
          onClick={onRemoveAll}
          className="text-xs text-red-400 hover:text-red-300 transition"
        >
          <X className="inline h-3 w-3" /> إزالة الكل
        </button>
      </div>
      {/* عرض أول 3 أسئلة كمعاينة */}
      {questions.length > 0 && (
        <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
          {questions.slice(0, 3).map((q, idx) => (
            <div key={idx} className={`text-xs flex justify-between border-b pb-1 ${styles.border} ${styles.subtext}`}>
              <span className="truncate max-w-[80%]">{q.question_text}</span>
              <div className="flex items-center gap-2">
                <span>{q.marks || 1} نقطة</span>
                <button
                  onClick={() => onRemove(idx)}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
          {questions.length > 3 && (
            <div className={`text-xs ${styles.subtext}`}>
              ... و {questions.length - 3} أسئلة أخرى
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ================================================================
// 📄 الصفحة الرئيسية – إنشاء امتحان جديد للمساعد
// ================================================================

export default function AssistantNewExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('course_id');
  const bankIdParam = searchParams.get('bankId');
  const { theme, toggleTheme, styles } = useTheme(); // ✅ استخدام الثيم الموحد
  const isDark = theme === 'dark';

  // ===== بيانات المساعد والصلاحيات =====
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();

  // ===== جلب الكورسات =====
  const teacherId = assistant?.teacher_id;
  const { data: coursesData, isLoading: coursesLoading } = useCachedFetch(
    teacherId ? `/api/assistant/courses?teacher_id=${teacherId}` : null
  );

  // ===== حالات النموذج =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: courseIdParam || '',
    duration_minutes: 30,
    start_date: '',
    end_date: '',
    total_marks: 100,
    passing_marks: 50,
    shuffle_questions: true,
    shuffle_options: true,
    allow_backward: false,
    show_results_immediately: true,
    attempts_allowed: 1,
    password: '',
    proctoring: false,
    camera: false,
    microphone: false,
    is_published: false,
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ===== حالات بنك الأسئلة =====
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [examQuestions, setExamQuestions] = useState([]);
  const [isImporting, setIsImporting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  // ===== حساب الدرجة الكلية تلقائياً =====
  useEffect(() => {
    const total = examQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
    setFormData(prev => ({ ...prev, total_marks: total || 0 }));
  }, [examQuestions]);

  // ===== معالجة تغيير الحقول =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ===== التحقق من صحة النموذج =====
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'عنوان الامتحان مطلوب';
    if (!formData.duration_minutes || formData.duration_minutes < 1) {
      errors.duration_minutes = 'المدة يجب أن تكون أكبر من 0';
    }
    if (!formData.start_date) errors.start_date = 'تاريخ البدء مطلوب';
    if (!formData.end_date) errors.end_date = 'تاريخ الانتهاء مطلوب';
    if (new Date(formData.start_date) >= new Date(formData.end_date)) {
      errors.end_date = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
    }
    if (!formData.total_marks || formData.total_marks < 1) {
      errors.total_marks = 'الدرجة الكلية يجب أن تكون أكبر من 0';
    }
    if (formData.passing_marks < 0 || formData.passing_marks > formData.total_marks) {
      errors.passing_marks = 'درجة النجاح يجب أن تكون بين 0 والدرجة الكلية';
    }
    if (formData.attempts_allowed < 1) {
      errors.attempts_allowed = 'عدد المحاولات يجب أن يكون 1 على الأقل';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== إنشاء الامتحان =====
  const handleSubmit = async (e, isDraft = false) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('يرجى تصحيح الأخطاء في النموذج');
      return;
    }

    if (!assistant) {
      toast.error('الرجاء تسجيل الدخول أولاً');
      return;
    }

    if (!hasPermission(permissions, 'exams', 'can_create')) {
      toast.error('ليس لديك صلاحية لإنشاء امتحانات');
      return;
    }

    setIsDraft(isDraft);
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // 1. إنشاء الامتحان
      const examData = {
        teacher_id: assistant.teacher_id,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        course_id: formData.course_id || null,
        duration_minutes: parseInt(formData.duration_minutes),
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_marks: parseInt(formData.total_marks),
        passing_marks: parseInt(formData.passing_marks),
        shuffle_questions: formData.shuffle_questions,
        shuffle_options: formData.shuffle_options,
        allow_backward: formData.allow_backward,
        show_results_immediately: formData.show_results_immediately,
        attempts_allowed: parseInt(formData.attempts_allowed),
        password: formData.password || null,
        settings: {
          proctoring: formData.proctoring,
          camera: formData.camera,
          microphone: formData.microphone,
        },
        is_published: isDraft ? false : formData.is_published,
      };

      const res = await fetch('/api/assistant/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(examData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إنشاء الامتحان');

      const examId = data.exam.id;

      // 2. إضافة الأسئلة المستوردة (إن وجدت)
      if (examQuestions.length > 0) {
        const questionsToInsert = examQuestions.map(q => ({
          exam_id: examId,
          question_text: q.question_text,
          type: q.type,
          difficulty: q.difficulty || 'medium',
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          marks: q.marks || 1,
          tags: q.tags || [],
          bank_question_id: q.bank_question_id || null,
          order: 0,
        }));

        const questionsRes = await fetch(`/api/assistant/exams/${examId}/questions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questions: questionsToInsert }),
        });

        if (!questionsRes.ok) {
          const questionsData = await questionsRes.json();
          console.warn('⚠️ Questions import warning:', questionsData);
          toast.warning('تم إنشاء الامتحان ولكن حدث خطأ في إضافة الأسئلة');
        }
      }

      const successMsg = isDraft
        ? '✅ تم حفظ الامتحان كمسودة!'
        : '✅ تم إنشاء الامتحان بنجاح!';
      setSuccess(successMsg);
      toast.success(successMsg);

      setTimeout(() => {
        router.push(`/dashboard/assistant/exams/${examId}/questions`);
      }, 1500);
    } catch (err) {
      console.error('❌ Error creating exam:', err);
      setError(err.message || 'فشل إنشاء الامتحان');
      toast.error(err.message || 'فشل إنشاء الامتحان');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== دوال بنك الأسئلة =====
  const handleBankQuestionsSelected = (questions) => {
    setIsImporting(true);
    try {
      const newQuestions = questions.map(q => ({
        id: crypto.randomUUID ? crypto.randomUUID() : 'q-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        question_text: q.question_text,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        marks: q.marks || 1,
        tags: q.tags || [],
        bank_question_id: q.id,
      }));
      setExamQuestions(prev => [...prev, ...newQuestions]);
      toast.success(`تمت إضافة ${questions.length} سؤال من بنك الأسئلة`);
      setShowBankSelector(false);
    } catch (err) {
      console.error('Error importing questions:', err);
      toast.error('فشل استيراد الأسئلة');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRemoveQuestion = (index) => {
    setExamQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveAllQuestions = () => {
    if (examQuestions.length === 0) return;
    if (!confirm('هل أنت متأكد من إزالة جميع الأسئلة المستوردة؟')) return;
    setExamQuestions([]);
  };

  // ===== دوال التنقل =====
  const goBack = () => {
    if (courseIdParam) {
      router.push(`/dashboard/assistant/courses/${courseIdParam}`);
    } else {
      router.push('/dashboard/assistant/exams');
    }
  };

  // ===== حالة التحميل =====
  const isLoading = assistantLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${styles.subtext}`}>
            جاري تحميل البيانات...
          </p>
        </div>
      </div>
    );
  }

  // ===== التحقق من الصلاحية =====
  const canCreate = hasPermission(permissions, 'exams', 'can_create');
  if (!assistant || !canCreate) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="text-center">
          <Shield className={`h-16 w-16 text-red-400 mx-auto mb-4 ${styles.text}`} />
          <h2 className={`text-xl font-bold ${styles.text}`}>
            غير مصرح لك
          </h2>
          <p className={`text-sm mt-2 ${styles.subtext}`}>
            لا تملك صلاحية لإنشاء امتحانات
          </p>
          <Link
            href="/dashboard/assistant/exams"
            className="mt-4 inline-block px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
          >
            العودة للقائمة
          </Link>
        </div>
      </div>
    );
  }

  const courses = coursesData?.courses || [];

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
              📝 إنشاء امتحان جديد
            </h1>
            <p className={`text-sm mt-1 ${styles.subtext}`}>
              أضف امتحاناً تعليمياً جديداً
              {courseIdParam && courses.find(c => c.id === courseIdParam) && (
                <span className="text-yellow-400"> – {courses.find(c => c.id === courseIdParam)?.title}</span>
              )}
              {assistant && (
                <span className="mr-2 text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  {assistant.display_name || assistant.full_name}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-3 md:mt-0">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
            </button>
            <button
              onClick={goBack}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${styles.card} border ${styles.border} hover:border-yellow-400/50 ${styles.subtext} hover:text-${isDark ? 'white' : 'gray-900'}`}
            >
              <ArrowRight className="h-4 w-4" /> العودة
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

        {/* ===== نموذج الإنشاء ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* النموذج */}
          <div className="lg:col-span-2">
            <form onSubmit={(e) => handleSubmit(e, false)} className={`rounded-2xl p-6 space-y-5 transition-all duration-500 ${styles.card} border ${styles.border}`}>
              {/* المعلومات الأساسية */}
              <div>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${styles.text}`}>
                  <FileText className="h-5 w-5 text-yellow-400" /> المعلومات الأساسية
                </h3>
                <div className="space-y-4">
                  <FormInput
                    label="عنوان الامتحان"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    error={formErrors.title}
                    placeholder="مثال: اختبار جرامر الترم الأول"
                    icon={FileText}
                    required
                    styles={styles}
                  />
                  <FormInput
                    label="الوصف"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    error={formErrors.description}
                    placeholder="وصف مختصر للامتحان"
                    isTextarea
                    rows={3}
                    styles={styles}
                  />
                  <FormInput
                    label="الكورس المرتبط (اختياري)"
                    name="course_id"
                    value={formData.course_id}
                    onChange={handleChange}
                    error={formErrors.course_id}
                    isSelect
                    options={[
                      { value: '', label: 'بدون كورس' },
                      ...courses.map(c => ({ value: c.id, label: c.title })),
                    ]}
                    styles={styles}
                  />
                </div>
              </div>

              {/* الجدول الزمني والدرجات */}
              <div className={`pt-4 border-t ${styles.border}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${styles.text}`}>
                  <Calendar className="h-5 w-5 text-yellow-400" /> الجدول الزمني والدرجات
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormInput
                    label="المدة (بالدقائق)"
                    name="duration_minutes"
                    type="number"
                    value={formData.duration_minutes}
                    onChange={handleChange}
                    error={formErrors.duration_minutes}
                    min={1}
                    required
                    styles={styles}
                  />
                  <FormInput
                    label="الدرجة الكلية"
                    name="total_marks"
                    type="number"
                    value={formData.total_marks}
                    onChange={handleChange}
                    error={formErrors.total_marks}
                    min={1}
                    required
                    styles={styles}
                  />
                  <FormInput
                    label="تاريخ البدء"
                    name="start_date"
                    type="datetime-local"
                    value={formData.start_date}
                    onChange={handleChange}
                    error={formErrors.start_date}
                    required
                    styles={styles}
                  />
                  <FormInput
                    label="تاريخ الانتهاء"
                    name="end_date"
                    type="datetime-local"
                    value={formData.end_date}
                    onChange={handleChange}
                    error={formErrors.end_date}
                    required
                    styles={styles}
                  />
                  <FormInput
                    label="درجة النجاح"
                    name="passing_marks"
                    type="number"
                    value={formData.passing_marks}
                    onChange={handleChange}
                    error={formErrors.passing_marks}
                    min={0}
                    styles={styles}
                  />
                  <FormInput
                    label="عدد المحاولات المسموحة"
                    name="attempts_allowed"
                    type="number"
                    value={formData.attempts_allowed}
                    onChange={handleChange}
                    error={formErrors.attempts_allowed}
                    min={1}
                    styles={styles}
                  />
                </div>
              </div>

              {/* الإعدادات المتقدمة */}
              <div className={`pt-4 border-t ${styles.border}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${styles.text}`}>
                  <Settings className="h-5 w-5 text-yellow-400" /> الإعدادات المتقدمة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="shuffle_questions"
                      checked={formData.shuffle_questions}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm ${styles.subtext}`}>خلط الأسئلة</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="shuffle_options"
                      checked={formData.shuffle_options}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm ${styles.subtext}`}>خلط الخيارات</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="allow_backward"
                      checked={formData.allow_backward}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm ${styles.subtext}`}>السماح بالرجوع للأسئلة السابقة</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="show_results_immediately"
                      checked={formData.show_results_immediately}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm ${styles.subtext}`}>عرض النتائج فور الانتهاء</label>
                  </div>
                  <div className="md:col-span-2">
                    <FormInput
                      label="كلمة المرور (اختياري)"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      error={formErrors.password}
                      placeholder="كلمة مرور لحماية الامتحان (اختياري)"
                      icon={Lock}
                      styles={styles}
                    />
                  </div>
                </div>
              </div>

              {/* إعدادات المراقبة */}
              <div className={`pt-4 border-t ${styles.border}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${styles.text}`}>
                  <Shield className="h-5 w-5 text-yellow-400" /> إعدادات المراقبة الذكية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="proctoring"
                      checked={formData.proctoring}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm ${styles.subtext}`}>تفعيل المراقبة</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="camera"
                      checked={formData.camera}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm ${styles.subtext}`}>تفعيل الكاميرا</label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="microphone"
                      checked={formData.microphone}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm ${styles.subtext}`}>تفعيل الميكروفون</label>
                  </div>
                </div>
                <p className={`text-xs mt-2 ${styles.subtext}`}>
                  سيتم طلب إذن الطالب لاستخدام الكاميرا والميكروفون عند أداء الامتحان
                </p>
              </div>

              {/* استيراد من بنك الأسئلة */}
              <div className={`pt-4 border-t ${styles.border} flex flex-wrap items-center gap-4`}>
                <button
                  type="button"
                  onClick={() => setShowBankSelector(true)}
                  className="px-5 py-2.5 bg-purple-500/15 border border-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/25 transition flex items-center gap-2 text-sm font-semibold"
                >
                  <Database className="h-4 w-4" />
                  استيراد من بنك الأسئلة
                  {examQuestions.length > 0 && (
                    <span className="ml-1 bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs">
                      {examQuestions.length}
                    </span>
                  )}
                </button>
                {isImporting && (
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                    جاري تحميل الأسئلة...
                  </div>
                )}
              </div>

              {/* ملخص الأسئلة المستوردة */}
              <QuestionsSummary
                questions={examQuestions}
                onRemove={handleRemoveQuestion}
                onRemoveAll={handleRemoveAllQuestions}
                styles={styles}
              />

              {/* أزرار الإرسال */}
              <div className={`flex flex-wrap gap-4 pt-4 border-t ${styles.border}`}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" /> إنشاء الامتحان
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={submitting}
                  className={`px-6 py-3 rounded-xl transition flex items-center gap-2 ${styles.card} border ${styles.border} hover:border-yellow-400/50 ${styles.text}`}
                >
                  <FileText className="h-5 w-5" /> حفظ كمسودة
                </button>
                <button
                  type="button"
                  onClick={goBack}
                  className={`px-6 py-3 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50 ${styles.text}`}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>

          {/* ===== المعاينة الجانبية ===== */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${styles.text}`}>
                <Eye className="h-4 w-4 text-yellow-400" /> ملخص الامتحان
              </h3>
              <div className={`rounded-2xl p-4 space-y-3 ${styles.card} border ${styles.border}`}>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>العنوان</p>
                  <p className={`text-sm font-medium truncate ${styles.text}`}>
                    {formData.title || 'غير محدد'}
                  </p>
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>المدة</p>
                    <p className={`text-sm ${styles.text}`}>
                      {formData.duration_minutes || 0} د
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الدرجة</p>
                    <p className={`text-sm ${styles.text}`}>
                      {formData.total_marks || 0}
                    </p>
                  </div>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>الفترة</p>
                  <p className={`text-sm ${styles.text}`}>
                    {formData.start_date ? new Date(formData.start_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                    {' → '}
                    {formData.end_date ? new Date(formData.end_date).toLocaleDateString('ar-EG') : 'غير محدد'}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>الكورس</p>
                  <p className={`text-sm ${styles.text}`}>
                    {courses.find(c => c.id === formData.course_id)?.title || 'بدون كورس'}
                  </p>
                </div>
                <div className={`pt-2 border-t ${styles.border} flex flex-wrap gap-2 text-xs`}>
                  {formData.shuffle_questions && (
                    <span className={`px-2 py-1 rounded-full ${styles.card} border ${styles.border} ${styles.subtext}`}>خلط الأسئلة</span>
                  )}
                  {formData.shuffle_options && (
                    <span className={`px-2 py-1 rounded-full ${styles.card} border ${styles.border} ${styles.subtext}`}>خلط الخيارات</span>
                  )}
                  {formData.allow_backward && (
                    <span className={`px-2 py-1 rounded-full ${styles.card} border ${styles.border} ${styles.subtext}`}>رجوع</span>
                  )}
                  {formData.proctoring && (
                    <span className="px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">مراقبة</span>
                  )}
                  {formData.password && (
                    <span className="px-2 py-1 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">🔒 محمي</span>
                  )}
                  {examQuestions.length > 0 && (
                    <span className="px-2 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      {examQuestions.length} سؤال
                    </span>
                  )}
                </div>
              </div>
              <p className={`text-[10px] mt-2 text-center ${styles.subtext} opacity-60`}>
                هذه معاينة للإعدادات قبل الإنشاء
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===== مودال بنك الأسئلة ===== */}
      <QuestionBankSelector
        isOpen={showBankSelector}
        onClose={() => setShowBankSelector(false)}
        onConfirm={handleBankQuestionsSelected}
        language="ar"
        theme={isDark ? 'dark' : 'light'}
        color="yellow"
        bankId={bankIdParam || null}
        multiSelect={true}
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