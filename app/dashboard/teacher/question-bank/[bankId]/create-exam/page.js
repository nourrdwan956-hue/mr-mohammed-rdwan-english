'use client';

// ============================================================
// إنشاء امتحان من بنك الأسئلة
// اختيار الأسئلة مباشرة من البنك وإنشاء امتحان جديد
// ============================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useMemo } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import QuestionBankSelector from '@/components/QuestionBankSelector';

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
    selectQuestionsHint: 'اضغط على "اختيار الأسئلة" لاختيار الأسئلة من البنك',
    selectedCount: 'الأسئلة المختارة',
    noQuestionsSelected: 'لم تختر أي سؤال',
    saveSuccess: 'تم إنشاء الامتحان بنجاح',
    saveFailed: 'فشل إنشاء الامتحان',
    requiredFields: 'يرجى ملء جميع الحقول المطلوبة',
    themeLight: 'فاتح',
    themeDark: 'داكن',
    language: 'اللغة',
    gold: 'ذهبي',
    blue: 'أزرق',
    green: 'أخضر',
    purple: 'بنفسجي',
    cancel: 'إلغاء',
    courses: 'الكورس المرتبط',
    allCourses: 'بدون كورس',
    // إضافات جديدة
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
    selectQuestionsHint: 'Click "Select Questions" to choose questions from the bank',
    selectedCount: 'Selected Questions',
    noQuestionsSelected: 'No questions selected',
    saveSuccess: 'Exam created successfully',
    saveFailed: 'Failed to create exam',
    requiredFields: 'Please fill all required fields',
    themeLight: 'Light',
    themeDark: 'Dark',
    language: 'Language',
    gold: 'Gold',
    blue: 'Blue',
    green: 'Green',
    purple: 'Purple',
    cancel: 'Cancel',
    courses: 'Associated Course',
    allCourses: 'No Course',
    // إضافات جديدة
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
  },
};

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
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', padding: '10px 16px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.language}:</span>
        <button onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')} style={{ padding: '4px 12px', fontSize: '12px', backgroundColor: 'rgba(255,255,255,0.08)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer' }}><Icons.Globe style={{ height: 14, width: 14 }} /> {language === 'ar' ? 'English' : 'عربي'}</button>
      </div>
      <div style={{ width: 1, height: 20, backgroundColor: 'var(--border-color)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.themeLight}/{t.themeDark}:</span>
        {themes.map(th => <button key={th.value} onClick={() => setTheme(th.value)} style={{ padding: '4px', borderRadius: '8px', backgroundColor: theme === th.value ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.05)', color: theme === th.value ? 'var(--primary-color)' : 'var(--text-muted)', cursor: 'pointer' }}><th.icon style={{ height: 14, width: 14 }} /></button>)}
      </div>
      <div style={{ width: 1, height: 20, backgroundColor: 'var(--border-color)' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.gold}:</span>
        {colors.map(c => <button key={c.value} onClick={() => setColor(c.value)} style={{ width: 20, height: 20, borderRadius: '50%', border: color === c.value ? '2px solid var(--text-primary)' : '2px solid transparent', backgroundColor: c.bg, cursor: 'pointer', transform: color === c.value ? 'scale(1.1)' : 'scale(1)', transition: 'all 0.2s' }} />)}
      </div>
    </div>
  );
};

export default function CreateExamFromBankPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params?.bankId;

  const [lang, setLang] = useLocalStorage('qb_exam_lang', 'ar');
  const [theme, setTheme] = useLocalStorage('qb_exam_theme', 'dark');
  const [color, setColor] = useLocalStorage('qb_exam_color', 'gold');
  const t = translations[lang];

  const [bank, setBank] = useState(null);
  const [courses, setCourses] = useState([]);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [showSelector, setShowSelector] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [totalQuestionsInBank, setTotalQuestionsInBank] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [showRandomModal, setShowRandomModal] = useState(false);
  const [randomOptions, setRandomOptions] = useState({
    count: 10,
    difficulty: 'all',
    type: 'all',
  });

  // نموذج الامتحان
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

  // جلب بيانات البنك والكورسات وعدد الأسئلة
  useEffect(() => {
    const fetchData = async () => {
      if (!bankId) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('يجب تسجيل الدخول');

        const { data: bankData } = await supabase
          .from('question_banks')
          .select('id, title')
          .eq('id', bankId)
          .single();
        setBank(bankData);

        const { data: coursesData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('teacher_id', user.id);
        setCourses(coursesData || []);

        // عدد الأسئلة في البنك
        const { count, error: countError } = await supabase
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('bank_id', bankId);
        if (!countError) setTotalQuestionsInBank(count || 0);
      } catch (err) {
        toast.error(t.fetchFailed);
        console.error(err);
      }
    };
    fetchData();
  }, [bankId, t]);

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

  const handleQuestionSelect = (questions) => {
    setSelectedQuestions(questions);
    setShowSelector(false);
    toast.success(`تم اختيار ${questions.length} سؤال`);
  };

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
      let query = supabase
        .from('questions')
        .select('*')
        .eq('bank_id', bankId);

      if (randomOptions.difficulty !== 'all') {
        query = query.eq('difficulty', randomOptions.difficulty);
      }
      if (randomOptions.type !== 'all') {
        query = query.eq('type', randomOptions.type);
      }

      const { data: questions, error } = await query.limit(randomOptions.count);
      if (error) throw error;
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
      document.querySelector('input[name="title"]')?.focus();
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
    if (!validateForm()) return;

    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');

      // 1. إنشاء الامتحان
      const examPayload = {
        teacher_id: user.id,
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: exam, error: examError } = await supabase
        .from('exams')
        .insert(examPayload)
        .select()
        .single();

      if (examError) throw examError;

      // 2. إضافة الأسئلة إلى الامتحان
      const questionsPayload = selectedQuestions.map((q, index) => ({
        exam_id: exam.id,
        question_text: q.question_text,
        type: q.type,
        difficulty: q.difficulty,
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        marks: q.marks || 1,
        order_index: index,
        bank_question_id: q.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: qError } = await supabase
        .from('exam_questions')
        .insert(questionsPayload);

      if (qError) throw qError;

      toast.success(asDraft ? 'تم حفظ الامتحان كمسودة' : t.saveSuccess);
      router.push(`/dashboard/teacher/exams/${exam.id}`);
    } catch (err) {
      console.error(err);
      toast.error(err.message || t.saveFailed);
    } finally {
      setSaving(false);
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
    <TeacherLayout>
      <div style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', minHeight: '100vh', paddingBottom: '40px' }}>
        <div style={{ maxWidth: '1024px', margin: '0 auto', padding: '20px' }}>
          <SettingsBar theme={theme} setTheme={setTheme} language={lang} setLanguage={setLang} color={color} setColor={setColor} />

          {/* الرأس */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <Link href={`/dashboard/teacher/question-bank/${bankId}`} style={{ color: 'var(--text-muted)' }}>
              <Icons.ArrowRight style={{ height: 24, width: 24 }} />
            </Link>
            <div>
              <h1 style={{ fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>{t.title}</h1>
              <p style={{ fontSize: '15px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                {t.subtitle} <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{bank?.title}</span>
              </p>
            </div>
          </div>

          {/* تحذير عدد الأسئلة */}
          {totalQuestionsInBank < 5 && (
            <div style={{ 
              backgroundColor: 'rgba(239,68,68,0.08)', 
              border: '1px solid rgba(239,68,68,0.2)', 
              borderRadius: '12px', 
              padding: '12px 16px', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <Icons.AlertTriangle style={{ color: '#ef4444', height: 20, width: 20 }} />
              <span style={{ fontSize: '14px', color: 'var(--text-primary)' }}>
                {totalQuestionsInBank === 0
                  ? t.warningNoQuestions
                  : t.warningLowQuestions.replace('{count}', totalQuestionsInBank)}
              </span>
            </div>
          )}

          <form onSubmit={(e) => handleSubmit(e, false)} style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* حقل عنوان الامتحان */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.examTitle} *</label>
              <input type="text" name="title" value={examData.title} onChange={handleInputChange} style={inputStyle} required />
            </div>

            {/* وصف الامتحان */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.examDescription}</label>
              <textarea name="description" value={examData.description} onChange={handleInputChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            {/* الكورس المرتبط */}
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.courses}</label>
              <select name="course_id" value={examData.course_id} onChange={handleInputChange} style={inputStyle}>
                <option value="">{t.allCourses}</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>

            {/* مدة الامتحان والدرجات */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.duration} *</label>
                <input type="number" name="duration_minutes" value={examData.duration_minutes} onChange={handleInputChange} min={1} style={inputStyle} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.totalMarks}</label>
                <input type="number" name="total_marks" value={examData.total_marks} readOnly style={{ ...inputStyle, backgroundColor: 'rgba(255,255,255,0.02)', cursor: 'not-allowed' }} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.passingMarks}</label>
                <input type="number" name="passing_marks" value={examData.passing_marks} onChange={handleInputChange} min={0} style={inputStyle} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.attemptsAllowed}</label>
                <input type="number" name="attempts_allowed" value={examData.attempts_allowed} onChange={handleInputChange} min={1} style={inputStyle} />
              </div>
            </div>

            {/* تواريخ البداية والنهاية */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.startDate} *</label>
                <input type="datetime-local" name="start_date" value={examData.start_date} onChange={handleInputChange} style={inputStyle} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '4px' }}>{t.endDate} *</label>
                <input type="datetime-local" name="end_date" value={examData.end_date} onChange={handleInputChange} style={inputStyle} required />
              </div>
            </div>

            {/* إعدادات إضافية */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '10px 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" name="shuffle_questions" checked={examData.shuffle_questions} onChange={handleInputChange} /> {t.shuffleQuestions}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" name="show_results_immediately" checked={examData.show_results_immediately} onChange={handleInputChange} /> {t.showResults}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" name="allow_backward" checked={examData.allow_backward} onChange={handleInputChange} /> {t.allowBackward}
              </label>
            </div>

            {/* خيارات متقدمة جديدة */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', padding: '10px 0', borderTop: '1px solid var(--border-color)' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" name="show_correct_answers" checked={examData.show_correct_answers} onChange={handleInputChange} /> {t.showCorrectAnswers}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" name="allow_review" checked={examData.allow_review} onChange={handleInputChange} /> {t.allowReview}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <input type="checkbox" name="randomize_options" checked={examData.randomize_options} onChange={handleInputChange} /> {t.randomizeOptions}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{t.timeLimitPerQuestion}:</span>
                <input type="number" name="time_limit_per_question" value={examData.time_limit_per_question} onChange={handleInputChange} min={0} style={{ width: '80px', padding: '6px 10px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
            </div>

            {/* اختيار الأسئلة */}
            <div style={{ padding: '16px', backgroundColor: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.2)', borderRadius: '12px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{t.selectQuestions}</p>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
                    {selectedQuestions.length > 0 ? `${t.selectedCount}: ${selectedQuestions.length}` : t.noQuestionsSelected}
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={() => setShowSelector(true)}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: 'rgba(168,85,247,0.15)',
                      color: '#a855f7',
                      borderRadius: '10px',
                      border: '1px solid rgba(168,85,247,0.2)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all 0.2s',
                    }}
                  >
                    <Icons.Plus style={{ height: 16, width: 16 }} /> {t.selectQuestions}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowRandomModal(true)}
                    style={{
                      padding: '8px 20px',
                      backgroundColor: 'rgba(251,191,36,0.12)',
                      color: '#fbbf24',
                      borderRadius: '10px',
                      border: '1px solid rgba(251,191,36,0.2)',
                      cursor: 'pointer',
                      fontWeight: 600,
                      fontSize: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <Icons.Shuffle style={{ height: 16, width: 16 }} /> {t.randomGenerate}
                  </button>
                </div>
              </div>

              {/* عرض الأسئلة المختارة مع إحصائيات */}
              {selectedQuestions.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{selectedQuestions.length} سؤال</span>
                    <button onClick={handleClearAll} style={{ fontSize: '12px', color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>{t.removeAll}</button>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {selectedQuestions.map((q, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.question_text}</p>
                          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: 'var(--text-muted)' }}>
                            <span>{q.type}</span>
                            <span>•</span>
                            <span>{q.difficulty}</span>
                            <span>•</span>
                            <span>{q.marks || 1} نقطة</span>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveQuestion(idx)} style={{ padding: '4px', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}>
                          <Icons.X style={{ height: 16, width: 16 }} />
                        </button>
                      </div>
                    ))}
                  </div>
                  {/* إحصائيات الأسئلة المختارة */}
                  {selectedStats && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '10px 14px', 
                      backgroundColor: 'rgba(251,191,36,0.05)', 
                      border: '1px solid rgba(251,191,36,0.15)', 
                      borderRadius: '8px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '16px'
                    }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.totalSelected}: <strong style={{ color: 'var(--primary-color)' }}>{selectedStats.total}</strong></span>
                      {Object.entries(selectedStats.byType).map(([type, count]) => (
                        <span key={type} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{type}: <strong style={{ color: 'var(--primary-color)' }}>{count}</strong></span>
                      ))}
                      {Object.entries(selectedStats.byDifficulty).map(([diff, count]) => (
                        <span key={diff} style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{diff}: <strong style={{ color: 'var(--primary-color)' }}>{count}</strong></span>
                      ))}
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{t.marksTotal}: <strong style={{ color: 'var(--primary-color)' }}>{selectedStats.totalMarks}</strong></span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* أزرار الإرسال */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '8px' }}>
              <button
                type="submit"
                disabled={saving}
                style={{
                  flex: 1,
                  backgroundColor: 'var(--primary-color)',
                  color: '#000',
                  fontWeight: 700,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s',
                }}
              >
                {saving ? <><Icons.Loader2 style={{ height: 20, width: 20, animation: 'spin 1s linear infinite' }} /> {t.creating}</> : <><Icons.Save style={{ height: 20, width: 20 }} /> {t.createExam}</>}
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                disabled={saving}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'rgba(251,191,36,0.1)',
                  color: '#fbbf24',
                  borderRadius: '12px',
                  border: '1px solid rgba(251,191,36,0.2)',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1,
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Icons.FileText style={{ height: 20, width: 20 }} /> {t.saveAsDraft}
              </button>
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                style={{
                  padding: '12px 20px',
                  backgroundColor: 'rgba(59,130,246,0.12)',
                  color: '#3b82f6',
                  borderRadius: '12px',
                  border: '1px solid rgba(59,130,246,0.2)',
                  cursor: 'pointer',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Icons.Eye style={{ height: 20, width: 20 }} /> {t.previewExam}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/dashboard/teacher/question-bank/${bankId}`)}
                style={{
                  flex: 1,
                  backgroundColor: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                  padding: '12px',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  transition: 'all 0.2s',
                }}
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* مودال اختيار الأسئلة */}
      <QuestionBankSelector
        isOpen={showSelector}
        onClose={() => setShowSelector(false)}
        onConfirm={handleQuestionSelect}
        initialSelected={selectedQuestions}
        bankId={bankId}
        language={lang}
        theme={theme}
        color={color}
      />

      {/* مودال التوليد العشوائي */}
      {showRandomModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 60, padding: '16px' }} onClick={() => setShowRandomModal(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '440px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>{t.randomSettings}</h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>{t.questionCount}</label>
              <input type="number" value={randomOptions.count} onChange={(e) => setRandomOptions(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))} min={1} max={50} style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }} />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>الصعوبة</label>
              <select value={randomOptions.difficulty} onChange={(e) => setRandomOptions(prev => ({ ...prev, difficulty: e.target.value }))} style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="all">الكل</option>
                <option value="easy">سهل</option>
                <option value="medium">متوسط</option>
                <option value="hard">صعب</option>
                <option value="expert">خبير</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>النوع</label>
              <select value={randomOptions.type} onChange={(e) => setRandomOptions(prev => ({ ...prev, type: e.target.value }))} style={{ width: '100%', padding: '8px 12px', backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}>
                <option value="all">الكل</option>
                <option value="mcq">اختيار من متعدد</option>
                <option value="truefalse">صح/خطأ</option>
                <option value="short">إجابة قصيرة</option>
                <option value="essay">مقالي</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button onClick={handleRandomGenerate} disabled={loading} style={{ flex: 1, backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, padding: '10px', borderRadius: '10px', border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>{loading ? '...' : t.generate}</button>
              <button onClick={() => setShowRandomModal(false)} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px', borderRadius: '10px', cursor: 'pointer' }}>{t.cancel}</button>
            </div>
          </div>
        </div>
      )}

      {/* مودال المعاينة */}
      {showPreview && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 70, padding: '16px' }} onClick={() => setShowPreview(false)}>
          <div style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '20px', padding: '28px', maxWidth: '640px', width: '100%', maxHeight: '80vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>{t.previewExam}</h2>
            <div style={{ marginBottom: '12px' }}>
              <p style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{examData.title || '(بدون عنوان)'}</p>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{examData.description || 'لا يوجد وصف'}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', padding: '12px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>المدة: <strong>{examData.duration_minutes} دقيقة</strong></span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>الدرجة: <strong>{examData.total_marks}</strong></span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>النجاح: <strong>{examData.passing_marks}</strong></span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>الأسئلة: <strong>{selectedQuestions.length}</strong></span>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '8px' }}>الأسئلة:</p>
              {selectedQuestions.slice(0, 5).map((q, idx) => (
                <div key={idx} style={{ padding: '6px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '13px', color: 'var(--text-primary)' }}>
                  {idx + 1}. {q.question_text}
                </div>
              ))}
              {selectedQuestions.length > 5 && (
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '6px 12px' }}>... و {selectedQuestions.length - 5} سؤال آخر</div>
              )}
            </div>
            <button onClick={() => setShowPreview(false)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--primary-color)', color: '#000', fontWeight: 700, borderRadius: '10px', border: 'none', cursor: 'pointer' }}>{t.close}</button>
          </div>
        </div>
      )}
    </TeacherLayout>
  );
}