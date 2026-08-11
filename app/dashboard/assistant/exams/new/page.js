// ============================================================
// app/dashboard/assistant/exams/new/page.js
// إنشاء امتحان جديد – نسخة المساعد (بدون حذف)
// ✅ استخدام AssistantLayout مع صلاحيات مخزنة في sessionStorage
// ✅ إزالة حقل total_marks من النموذج - يُحسب تلقائياً من الأسئلة المستوردة
// ✅ ضبط التواريخ مع المنطقة الزمنية لمصر (UTC+2/+3)
// ✅ دعم بنك الأسئلة والاستيراد
// ✅ معاينة جانبية للإعدادات
// ✅ تباين عالٍ في الوضعين الفاتح والداكن
// ✅ ربط الكورسات والصلاحيات
// ✅ منع صلاحية الحذف (غير موجودة أصلاً في هذه الصفحة)
// ============================================================

'use client';

import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import QuestionBankSelector from '@/components/QuestionBankSelector';
import { useTheme } from '@/lib/hooks/useTheme';
import { hasPermission } from '@/lib/permissions';

// ============================================================
// 1. دالة مساعدة لتنسيق التاريخ مع المنطقة الزمنية لمصر
// ============================================================
const toEgyptTime = (date) => {
  if (!date) return null;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Cairo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;
  const hour = parts.find(p => p.type === 'hour')?.value;
  const minute = parts.find(p => p.type === 'minute')?.value;
  const second = parts.find(p => p.type === 'second')?.value;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+02:00`);
};

export default function AssistantNewExamPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('course_id');
  const bankIdParam = searchParams.get('bankId');
  const { theme, toggleTheme, language, styles } = useTheme();
  const isDark = theme === 'dark';

  // ===== بيانات المساعد والصلاحيات =====
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loadingAssistant, setLoadingAssistant] = useState(true);
  const [teacherId, setTeacherId] = useState(null);

  // ===== حالات النموذج – تمت إزالة total_marks =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: courseIdParam || '',
    duration_minutes: 30,
    start_date: '',
    end_date: '',
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
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  // ===== حالات بنك الأسئلة =====
  const [showBankSelector, setShowBankSelector] = useState(false);
  const [examQuestions, setExamQuestions] = useState([]);
  const [selectedBankQuestions, setSelectedBankQuestions] = useState([]);
  const [importedQuestionsSummary, setImportedQuestionsSummary] = useState({ count: 0, totalMarks: 0, byType: {} });
  const [isImporting, setIsImporting] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  // ===== حساب مجموع درجات الأسئلة المستوردة (للعرض فقط) =====
  const importedTotalMarks = useMemo(() => {
    return examQuestions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }, [examQuestions]);

  // ===== جلب بيانات المساعد والصلاحيات =====
  useEffect(() => {
    const loadAssistantData = async () => {
      try {
        const stored = sessionStorage.getItem('assistantData');
        if (!stored) {
          router.push('/assistant-login');
          return;
        }
        const data = JSON.parse(stored);
        setAssistant(data);
        setTeacherId(data.teacher_id);

        // جلب الصلاحيات
        const perms = JSON.parse(sessionStorage.getItem('assistantPermissions') || '[]');
        setPermissions(perms);

        // التحقق من صلاحية الإنشاء
        if (!hasPermission(perms, 'exams', 'can_create')) {
          toast.error('ليس لديك صلاحية إنشاء امتحانات');
          router.push('/dashboard/assistant');
          return;
        }

        setLoadingAssistant(false);
      } catch (err) {
        console.error('Error loading assistant data:', err);
        router.push('/assistant-login');
      }
    };
    loadAssistantData();
  }, [router]);

  // ===== جلب الكورسات =====
  useEffect(() => {
    if (!teacherId) return;

    const fetchCourses = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('id, title, is_free')
          .eq('teacher_id', teacherId)
          .eq('is_published', true)
          .order('title');

        if (error) throw error;
        setCourses(data || []);

        if (courseIdParam && !data?.some(c => c.id === courseIdParam)) {
          const { data: single } = await supabase
            .from('courses')
            .select('id, title, is_free')
            .eq('id', courseIdParam)
            .eq('teacher_id', teacherId)
            .single();
          if (single) {
            setCourses(prev => [single, ...prev]);
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        toast.error('فشل جلب الكورسات');
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [teacherId, courseIdParam]);

  // ===== تحديث ملخص الأسئلة المستوردة عند تغيير الأسئلة =====
  useEffect(() => {
    const byType = {};
    examQuestions.forEach(q => {
      byType[q.type] = (byType[q.type] || 0) + 1;
    });
    setImportedQuestionsSummary({
      count: examQuestions.length,
      totalMarks: importedTotalMarks,
      byType,
    });
  }, [examQuestions, importedTotalMarks]);

  // ===== دوال النموذج =====
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

    const passingMarks = Number(formData.passing_marks);
    if (formData.passing_marks === '' || isNaN(passingMarks)) {
      errors.passing_marks = 'يرجى إدخال درجة النجاح';
    } else if (passingMarks < 0) {
      errors.passing_marks = 'درجة النجاح لا يمكن أن تكون سالبة';
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
    if (!validateForm()) return;
    if (!teacherId) {
      toast.error('لا يمكن تحديد المعلم');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // حساب total_marks من الأسئلة المستوردة
      const totalMarks = importedTotalMarks;
      const passingMarks = Number(formData.passing_marks);

      const startDate = formData.start_date ? new Date(formData.start_date) : null;
      const endDate = formData.end_date ? new Date(formData.end_date) : null;
      const startISO = startDate ? startDate.toISOString() : null;
      const endISO = endDate ? endDate.toISOString() : null;

      const examData = {
        teacher_id: teacherId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        course_id: formData.course_id || null,
        duration_minutes: Number(formData.duration_minutes),
        start_date: startISO,
        end_date: endISO,
        total_marks: totalMarks,
        passing_marks: passingMarks,
        shuffle_questions: formData.shuffle_questions,
        shuffle_options: formData.shuffle_options,
        allow_backward: formData.allow_backward,
        show_results_immediately: formData.show_results_immediately,
        attempts_allowed: Number(formData.attempts_allowed),
        password: formData.password || null,
        settings: {
          proctoring: formData.proctoring,
          camera: formData.camera,
          microphone: formData.microphone,
        },
        is_published: isDraft ? false : formData.is_published || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('exams')
        .insert(examData)
        .select()
        .single();

      if (error) throw error;

      // ===== إضافة الأسئلة المستوردة (إن وجدت) =====
      if (examQuestions.length > 0) {
        const questionsToInsert = examQuestions.map(q => ({
          exam_id: data.id,
          question_text: q.question_text,
          type: q.type,
          difficulty: q.difficulty || 'medium',
          options: q.options || [],
          correct_answer: q.correct_answer,
          explanation: q.explanation || '',
          marks: q.marks || 1,
          tags: q.tags || [],
          bank_question_id: q.bank_question_id || null,
          order_index: 0,
        }));

        const { error: insertError } = await supabase
          .from('exam_questions')
          .insert(questionsToInsert);
        if (insertError) throw insertError;
      }

      const successMsg = isDraft ? '✅ تم حفظ الامتحان كمسودة!' : '✅ تم إنشاء الامتحان بنجاح!';
      setSuccess(successMsg);
      toast.success(successMsg);
      setTimeout(() => {
        router.push(`/dashboard/assistant/exams/${data.id}/questions`);
      }, 1500);
    } catch (err) {
      console.error('Error creating exam:', err);
      setError('فشل إنشاء الامتحان: ' + err.message);
      toast.error('فشل إنشاء الامتحان');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== دوال بنك الأسئلة =====
  const handleBankQuestionsSelected = (questions) => {
    setSelectedBankQuestions(questions);
    setIsImporting(true);
    try {
      const newQuestions = questions.map(q => ({
        id: crypto.randomUUID(),
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
      const updatedQuestions = [...examQuestions, ...newQuestions];
      setExamQuestions(updatedQuestions);

      toast.success(`تمت إضافة ${questions.length} سؤال من بنك الأسئلة`);
      setShowBankSelector(false);
    } finally {
      setIsImporting(false);
    }
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
  if (loadingAssistant) {
    return (
      <AssistantLayout>
        <div className={`flex items-center justify-center py-20 ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </AssistantLayout>
    );
  }

  // ===== التحقق من الصلاحية =====
  if (!hasPermission(permissions, 'exams', 'can_create')) {
    return (
      <AssistantLayout>
        <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <Icons.Lock className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>غير مصرح لك</h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2`}>ليس لديك صلاحية إنشاء امتحانات</p>
          <button
            onClick={() => router.push('/dashboard/assistant')}
            className="mt-4 px-6 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
          >
            العودة للوحة التحكم
          </button>
        </div>
      </AssistantLayout>
    );
  }

  return (
    <AssistantLayout>
      <div className={`relative ${styles.bg}`}>
        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-extrabold ${styles.text}`}>📝 إنشاء امتحان جديد</h1>
            <p className={`${styles.subtext} text-sm mt-1`}>
              أضف امتحاناً تعليمياً جديداً
              {courseIdParam && courses.find(c => c.id === courseIdParam) && (
                <span className="text-yellow-400"> – {courses.find(c => c.id === courseIdParam)?.title}</span>
              )}
            </p>
          </div>
          <button
            onClick={goBack}
            className={`mt-3 md:mt-0 px-4 py-2 ${styles.card} border ${styles.border} rounded-xl text-sm hover:border-yellow-400/50 transition flex items-center gap-2 ${styles.text}`}
          >
            <Icons.ArrowRight className="h-4 w-4" /> العودة
          </button>
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== نموذج الإنشاء ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}>
              <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-5">
                {/* المعلومات الأساسية */}
                <div>
                  <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                    <Icons.FileText className="h-5 w-5 text-yellow-400" /> المعلومات الأساسية
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                        عنوان الامتحان <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="text"
                        name="title"
                        value={formData.title}
                        onChange={handleChange}
                        placeholder="مثال: اختبار جرامر الترم الأول"
                        className={`w-full p-3 ${styles.input} border ${formErrors.title ? 'border-red-500' : styles.border} rounded-xl ${styles.text} placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      />
                      {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>الوصف</label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        rows="3"
                        placeholder="وصف مختصر للامتحان"
                        className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl ${styles.text} placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition resize-none`}
                      />
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>الكورس المرتبط (اختياري)</label>
                      <select
                        name="course_id"
                        value={formData.course_id}
                        onChange={handleChange}
                        className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition appearance-none`}
                        disabled={loadingCourses}
                      >
                        <option value="">بدون كورس</option>
                        {courses.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.title} {c.is_free ? '(مجاني)' : ''}
                          </option>
                        ))}
                      </select>
                      {loadingCourses && <p className="text-xs text-gray-500 mt-1">جاري تحميل الكورسات...</p>}
                    </div>
                  </div>
                </div>

                {/* الجدول الزمني والدرجات */}
                <div className="pt-4 border-t border-white/5">
                  <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                    <Icons.Calendar className="h-5 w-5 text-yellow-400" /> الجدول الزمني والدرجات
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                        المدة (بالدقائق) <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="duration_minutes"
                        value={formData.duration_minutes}
                        onChange={handleChange}
                        min="1"
                        className={`w-full p-3 ${styles.input} border ${formErrors.duration_minutes ? 'border-red-500' : styles.border} rounded-xl ${styles.text} placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      />
                      {formErrors.duration_minutes && <p className="text-red-400 text-xs mt-1">{formErrors.duration_minutes}</p>}
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                        الدرجة الكلية <span className="text-xs text-gray-400">(تلقائي من الأسئلة)</span>
                      </label>
                      <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} font-medium`}>
                        {examQuestions.length > 0 ? (
                          <span className="flex items-center gap-2">
                            <Icons.Calculator className="h-4 w-4 text-yellow-400" />
                            {importedTotalMarks} درجة
                          </span>
                        ) : (
                          <span className="text-gray-400">سيتم حسابها من الأسئلة المضافة</span>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                        تاريخ البدء <span className="text-red-400">*</span>
                        <span className="text-xs text-gray-400 block">(بتوقيت مصر)</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="start_date"
                        value={formData.start_date}
                        onChange={handleChange}
                        className={`w-full p-3 ${styles.input} border ${formErrors.start_date ? 'border-red-500' : styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      />
                      {formErrors.start_date && <p className="text-red-400 text-xs mt-1">{formErrors.start_date}</p>}
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                        تاريخ الانتهاء <span className="text-red-400">*</span>
                        <span className="text-xs text-gray-400 block">(بتوقيت مصر)</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="end_date"
                        value={formData.end_date}
                        onChange={handleChange}
                        className={`w-full p-3 ${styles.input} border ${formErrors.end_date ? 'border-red-500' : styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      />
                      {formErrors.end_date && <p className="text-red-400 text-xs mt-1">{formErrors.end_date}</p>}
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>درجة النجاح</label>
                      <input
                        type="number"
                        name="passing_marks"
                        value={formData.passing_marks}
                        onChange={handleChange}
                        min="0"
                        className={`w-full p-3 ${styles.input} border ${formErrors.passing_marks ? 'border-red-500' : styles.border} rounded-xl ${styles.text} placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      />
                      {formErrors.passing_marks && <p className="text-red-400 text-xs mt-1">{formErrors.passing_marks}</p>}
                      {importedTotalMarks > 0 && Number(formData.passing_marks) > importedTotalMarks && (
                        <p className="text-yellow-400 text-xs mt-1 flex items-center gap-1">
                          <Icons.AlertTriangle className="h-3 w-3" />
                          درجة النجاح أعلى من مجموع الأسئلة الحالية
                        </p>
                      )}
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                        عدد المحاولات المسموحة <span className="text-red-400">*</span>
                        <span className="text-xs text-gray-400 block">
                          (يحدد عدد المرات التي يمكن للطالب فيها أداء الامتحان)
                        </span>
                      </label>
                      <input
                        type="number"
                        name="attempts_allowed"
                        value={formData.attempts_allowed}
                        onChange={handleChange}
                        min="1"
                        className={`w-full p-3 ${styles.input} border ${formErrors.attempts_allowed ? 'border-red-500' : styles.border} rounded-xl ${styles.text} placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      />
                      {formErrors.attempts_allowed && <p className="text-red-400 text-xs mt-1">{formErrors.attempts_allowed}</p>}
                      <p className={`text-xs ${styles.subtext} mt-1 flex items-center gap-1`}>
                        <Icons.Info className="h-3.5 w-3.5 text-yellow-400" />
                        عدد المحاولات يُستخدم لحماية الامتحان، ويتم استهلاكه عند الخروج المتعمد من بيئة الامتحان.
                      </p>
                    </div>
                  </div>
                </div>

                {/* الإعدادات المتقدمة */}
                <div className="pt-4 border-t border-white/5">
                  <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                    <Icons.Settings className="h-5 w-5 text-yellow-400" /> الإعدادات المتقدمة
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="shuffle_questions"
                        checked={formData.shuffle_questions}
                        onChange={handleChange}
                        className="w-5 h-5 accent-yellow-400 rounded"
                      />
                      <label className={`text-sm ${styles.label}`}>خلط الأسئلة</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="shuffle_options"
                        checked={formData.shuffle_options}
                        onChange={handleChange}
                        className="w-5 h-5 accent-yellow-400 rounded"
                      />
                      <label className={`text-sm ${styles.label}`}>خلط الخيارات</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="allow_backward"
                        checked={formData.allow_backward}
                        onChange={handleChange}
                        className="w-5 h-5 accent-yellow-400 rounded"
                      />
                      <label className={`text-sm ${styles.label}`}>السماح بالرجوع للأسئلة السابقة</label>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="show_results_immediately"
                        checked={formData.show_results_immediately}
                        onChange={handleChange}
                        className="w-5 h-5 accent-yellow-400 rounded"
                      />
                      <label className={`text-sm ${styles.label}`}>عرض النتائج فور الانتهاء</label>
                    </div>
                    <div className="md:col-span-2">
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>كلمة المرور (اختياري)</label>
                      <input
                        type="text"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="كلمة مرور لحماية الامتحان (اختياري)"
                        className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl ${styles.text} placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      />
                    </div>
                  </div>
                </div>

                {/* إعدادات المراقبة (Proctoring) */}
                <div className="pt-4 border-t border-white/5">
                  <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                    <Icons.Shield className="h-5 w-5 text-yellow-400" /> إعدادات المراقبة الذكية
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="proctoring"
                        checked={formData.proctoring}
                        onChange={handleChange}
                        className="w-5 h-5 accent-yellow-400 rounded"
                      />
                      <span className={`text-sm ${styles.label}`}>تفعيل المراقبة</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="camera"
                        checked={formData.camera}
                        onChange={handleChange}
                        className="w-5 h-5 accent-yellow-400 rounded"
                      />
                      <span className={`text-sm ${styles.label}`}>الكاميرا</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="microphone"
                        checked={formData.microphone}
                        onChange={handleChange}
                        className="w-5 h-5 accent-yellow-400 rounded"
                      />
                      <span className={`text-sm ${styles.label}`}>الميكروفون</span>
                    </label>
                  </div>
                  <p className={`text-xs ${styles.subtext} mt-3`}>
                    {formData.proctoring ? (
                      <span className="flex items-center gap-1 text-yellow-400">
                        <Icons.Info className="h-3.5 w-3.5" />
                        سيُطلب من الطالب إذن الكاميرا والميكروفون عند بدء الامتحان. لا يمكن للطالب إيقافها.
                      </span>
                    ) : (
                      'لن يتم طلب أي أذونات خاصة من الطالب.'
                    )}
                  </p>
                </div>

                {/* ===== زر استيراد من بنك الأسئلة ===== */}
                <div className="pt-4 border-t border-white/5 flex flex-wrap items-center gap-4">
                  <button
                    type="button"
                    onClick={() => setShowBankSelector(true)}
                    className="px-5 py-2.5 bg-purple-500/15 border border-purple-500/20 text-purple-400 rounded-xl hover:bg-purple-500/25 transition flex items-center gap-2 text-sm font-semibold"
                  >
                    <Icons.Database className="h-4 w-4" />
                    استيراد من بنك الأسئلة
                    {examQuestions.length > 0 && (
                      <span className="ml-1 bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full text-xs">
                        {examQuestions.length}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowBankSelector(true)}
                    className="px-5 py-2.5 bg-green-500/15 border border-green-500/20 text-green-400 rounded-xl hover:bg-green-500/25 transition flex items-center gap-2 text-sm font-semibold"
                  >
                    <Icons.Shuffle className="h-4 w-4" />
                    توليد عشوائي
                  </button>
                  {isImporting && (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <div className="w-4 h-4 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
                      جاري تحميل الأسئلة...
                    </div>
                  )}
                  {examQuestions.length > 0 && (
                    <span className={`text-xs ${styles.subtext}`}>
                      تم إضافة {examQuestions.length} سؤال
                    </span>
                  )}
                </div>

                {/* ===== ملخص الأسئلة المستوردة ===== */}
                {examQuestions.length > 0 && (
                  <div className={`mt-3 p-3 ${styles.card} border ${styles.border} rounded-xl`}>
                    <div className="flex flex-wrap items-center gap-4">
                      <span className={`text-sm ${styles.text}`}>
                        <Icons.CheckCircle className="inline h-4 w-4 text-green-400 mr-1" />
                        {examQuestions.length} سؤال
                      </span>
                      <span className={`text-sm ${styles.text}`}>
                        <Icons.Star className="inline h-4 w-4 text-yellow-400 mr-1" />
                        {importedTotalMarks} درجة
                      </span>
                      {Object.entries(importedQuestionsSummary.byType || {}).map(([type, count]) => (
                        <span key={type} className={`text-xs ${styles.subtext} bg-white/5 px-2 py-1 rounded-full`}>
                          {type}: {count}
                        </span>
                      ))}
                      <button
                        onClick={() => {
                          if (confirm('إزالة جميع الأسئلة المستوردة؟')) {
                            setExamQuestions([]);
                            setImportedQuestionsSummary({ count: 0, totalMarks: 0, byType: {} });
                          }
                        }}
                        className="text-xs text-red-400 hover:text-red-300 transition"
                      >
                        <Icons.X className="inline h-3 w-3" /> إزالة الكل
                      </button>
                    </div>
                    <div className="mt-2 max-h-24 overflow-y-auto space-y-1">
                      {examQuestions.slice(0, 3).map((q, idx) => (
                        <div key={idx} className={`text-xs ${styles.subtext} flex justify-between border-b border-white/5 pb-1`}>
                          <span className="truncate">{q.question_text}</span>
                          <div>
                            <span>{q.marks || 1} نقطة</span>
                            <button
                              onClick={() => {
                                const updated = [...examQuestions];
                                updated.splice(idx, 1);
                                setExamQuestions(updated);
                              }}
                              className="ml-2 text-red-400 hover:text-red-300"
                            >
                              <Icons.X className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                      {examQuestions.length > 3 && (
                        <div className={`text-xs ${styles.subtext}`}>... و {examQuestions.length - 3} أسئلة أخرى</div>
                      )}
                    </div>
                  </div>
                )}

                {/* أزرار الإرسال */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2 disabled:opacity-70"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        جاري الإنشاء...
                      </>
                    ) : (
                      <>
                        <Icons.Plus className="h-5 w-5" /> إنشاء الامتحان
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmit(e, true)}
                    disabled={submitting}
                    className={`px-6 py-3 ${styles.card} border ${styles.border} ${styles.text} rounded-xl hover:bg-white/10 transition flex items-center gap-2`}
                  >
                    <Icons.FileText className="h-5 w-5" /> حفظ كمسودة
                  </button>
                  <button
                    type="button"
                    onClick={goBack}
                    className={`px-6 py-3 ${styles.card} border ${styles.border} ${styles.text} rounded-xl hover:bg-white/10 transition`}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* ===== معاينة جانبية (ملخص الإعدادات) ===== */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className={`text-sm font-semibold ${styles.text} mb-3 flex items-center gap-2`}>
                <Icons.Eye className="h-4 w-4 text-yellow-400" /> ملخص الامتحان
              </h3>
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 space-y-3`}>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>العنوان</p>
                  <p className={`text-sm ${styles.text} font-medium truncate`}>{formData.title || 'غير محدد'}</p>
                </div>
                <div className="flex justify-between">
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>المدة</p>
                    <p className={`text-sm ${styles.text}`}>{formData.duration_minutes || 0} د</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الدرجة الكلية</p>
                    <p className={`text-sm font-bold text-yellow-400`}>
                      {examQuestions.length > 0 ? `${importedTotalMarks} درجة` : '—'}
                    </p>
                  </div>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>الفترة</p>
                  <p className={`text-sm ${styles.text}`}>
                    {formData.start_date ? new Date(formData.start_date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : 'غير محدد'}
                    {' → '}
                    {formData.end_date ? new Date(formData.end_date).toLocaleDateString('ar-EG', { timeZone: 'Africa/Cairo' }) : 'غير محدد'}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>الكورس</p>
                  <p className={`text-sm ${styles.text}`}>
                    {courses.find(c => c.id === formData.course_id)?.title || 'بدون كورس'}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>المحاولات المسموحة</p>
                  <p className={`text-sm font-bold text-yellow-400`}>{formData.attempts_allowed || 1}</p>
                </div>
                <div className="pt-2 border-t border-white/5 flex flex-wrap gap-2 text-xs">
                  {formData.shuffle_questions && <span className={`bg-white/5 px-2 py-1 rounded-full ${styles.text}`}>خلط الأسئلة</span>}
                  {formData.shuffle_options && <span className={`bg-white/5 px-2 py-1 rounded-full ${styles.text}`}>خلط الخيارات</span>}
                  {formData.allow_backward && <span className={`bg-white/5 px-2 py-1 rounded-full ${styles.text}`}>رجوع</span>}
                  {formData.proctoring && <span className="bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded-full border border-yellow-400/20">مراقبة</span>}
                  {formData.password && <span className="bg-blue-400/10 text-blue-400 px-2 py-1 rounded-full border border-blue-400/20">🔒 محمي</span>}
                  {examQuestions.length > 0 && (
                    <span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full border border-purple-500/20">
                      {examQuestions.length} سؤال
                    </span>
                  )}
                </div>
              </div>
              <p className={`text-[10px] ${styles.subtext} mt-2 text-center`}>
                هذه معاينة للإعدادات قبل الإنشاء
              </p>
            </div>
          </div>
        </div>

        {/* ===== مودال بنك الأسئلة ===== */}
        <QuestionBankSelector
          isOpen={showBankSelector}
          onClose={() => setShowBankSelector(false)}
          onConfirm={handleBankQuestionsSelected}
          language={language}
          theme={theme}
          color="yellow"
          bankId={bankIdParam || searchParams.get('bankId') || null}
          multiSelect={true}
          // 🔑 تمرير teacherId للمساعد لضمان جلب البنوك الصحيحة
          teacherId={teacherId}
          viewOnly={false}
        />
      </div>
    </AssistantLayout>
  );
}