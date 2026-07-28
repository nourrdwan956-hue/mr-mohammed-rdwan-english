// app/dashboard/assistant/question-bank/[bankId]/new/page.js
'use client';

// ================================================================
// ➕ إضافة سؤال إلى بنك الأسئلة – إصدار متطور جداً V4
// ================================================================
// الميزات:
// - نموذج كامل لإضافة سؤال جديد إلى بنك الأسئلة
// - دعم جميع أنواع الأسئلة (اختيار من متعدد، صح/خطأ، مقالي، توصيل، ترتيب، صوتي، تحميل ملف)
// - دعم الخيارات المتعددة مع إمكانية إضافة/حذف الخيارات ديناميكياً
// - دعم النص المرفق (Passage)
// - دعم الوسوم
// - معاينة السؤال قبل الحفظ
// - التحقق من صحة المدخلات
// - دعم كامل للوضعين الفاتح والداكن مع وضوح تام للخطوط
// - Glassmorphism فاخر وأنيميشن سلس
// - منع التحميل اللانهائي
// ================================================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// 1. مكون حقل الإدخال
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
  min,
  max,
  step,
}) => {
  const { styles } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const hasError = error && isTouched;

  return (
    <div>
      <label className={`block text-sm font-medium ${styles.label} mb-1.5`} htmlFor={name}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative group">
        {Icon && !isSelect && !isTextarea && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${
            isFocused ? 'text-purple-400 scale-110' : 'text-gray-400'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        {isSelect ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={(e) => { onChange(e); setIsTouched(true); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            disabled={disabled}
            className={`w-full p-3 ${styles.input} border ${
              hasError ? 'border-red-400' : isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : 'border-gray-200 dark:border-white/20'
            } rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 appearance-none ${
              disabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <option value="">اختر...</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea
            id={name}
            name={name}
            rows={rows || 4}
            value={value}
            onChange={(e) => { onChange(e); setIsTouched(true); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full p-3 ${Icon ? 'pr-11' : 'pr-4'} ${styles.input} border ${
              hasError ? 'border-red-400' : isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : 'border-gray-200 dark:border-white/20'
            } rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y ${
              disabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
        ) : (
          <input
            id={name}
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
            step={step}
            className={`w-full p-3 ${Icon ? 'pr-11' : 'pr-4'} ${styles.input} border ${
              hasError ? 'border-red-400' : isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : 'border-gray-200 dark:border-white/20'
            } rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
              disabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
        )}
        {isFocused && !disabled && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transform scale-x-0 origin-right transition-transform duration-300 group-focus-within:scale-x-100" />
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
// 2. مكون الوسوم (Tags Input)
// ================================================================
const TagsInput = ({ value, onChange, placeholder, styles }) => {
  const [inputValue, setInputValue] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInputValue('');
  };

  const removeTag = (tagToRemove) => {
    onChange(value.filter(tag => tag !== tagToRemove));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text');
    const tags = text.split(',').map(t => t.trim()).filter(t => t);
    tags.forEach(tag => {
      if (!value.includes(tag)) {
        onChange([...value, tag]);
      }
    });
  };

  return (
    <div>
      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
        الوسوم (اختياري)
      </label>
      <div
        className={`flex flex-wrap items-center gap-2 p-3 ${styles.input} border ${
          isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : styles.border
        } rounded-xl focus-within:ring-2 focus-within:ring-purple-400/50 transition-all duration-300`}
      >
        {value.map((tag, index) => (
          <span
            key={index}
            className="flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-400/30"
          >
            #{tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="hover:text-red-400 transition"
            >
              <Icons.X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            if (inputValue.trim()) addTag(inputValue);
          }}
          placeholder={value.length === 0 ? placeholder : ''}
          className={`flex-1 min-w-[80px] bg-transparent outline-none text-sm ${styles.text} placeholder:text-gray-400 dark:placeholder:text-gray-500`}
        />
      </div>
      <p className={`text-[10px] ${styles.subtext} opacity-60 mt-1`}>
        اكتب الوسم واضغط Enter أو فاصلة للإضافة
      </p>
    </div>
  );
};

// ================================================================
// 3. مكون معاينة السؤال
// ================================================================
const QuestionPreview = ({ question, styles }) => {
  if (!question || !question.question_text) return null;

  const getTypeLabel = (type) => {
    const types = {
      multiple_choice: 'اختيار من متعدد',
      true_false: 'صح/خطأ',
      essay: 'مقالي',
      matching: 'توصيل',
      ordering: 'ترتيب',
      audio: 'صوتي',
      file_upload: 'تحميل ملف',
    };
    return types[type] || type;
  };

  const getDifficultyLabel = (difficulty) => {
    const labels = {
      easy: 'سهل',
      medium: 'متوسط',
      hard: 'صعب',
    };
    return labels[difficulty] || difficulty;
  };

  return (
    <div className={`p-4 rounded-xl ${styles.card} border ${styles.border}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className={`text-sm font-bold ${styles.text}`}>معاينة السؤال</h4>
        <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-400/20">
          {getTypeLabel(question.type)}
        </span>
      </div>
      <p className={`text-sm ${styles.text} mb-2`}>{question.question_text}</p>
      {question.passage && (
        <div className={`text-sm ${styles.subtext} p-3 bg-white/5 rounded-lg mb-2`}>
          {question.passage}
        </div>
      )}
      {question.options && question.options.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {question.options.map((opt, idx) => (
            <span
              key={idx}
              className={`text-xs px-3 py-1 rounded-full border ${
                opt === question.correct_answer
                  ? 'bg-green-500/20 text-green-400 border-green-400/30'
                  : 'bg-white/5 border-white/10'
              }`}
            >
              {opt}
              {opt === question.correct_answer && ' ✅'}
            </span>
          ))}
        </div>
      )}
      {question.correct_answer && question.type !== 'multiple_choice' && (
        <p className={`text-sm text-green-400 mb-2`}>
          الإجابة الصحيحة: {question.correct_answer}
        </p>
      )}
      <div className="flex items-center gap-3 text-xs text-gray-400">
        <span>الصعوبة: {getDifficultyLabel(question.difficulty)}</span>
        <span>•</span>
        <span>{question.marks || 0} علامة</span>
        {question.tags && question.tags.length > 0 && (
          <>
            <span>•</span>
            <span>الوسوم: {question.tags.join('، ')}</span>
          </>
        )}
      </div>
    </div>
  );
};

// ================================================================
// 4. الصفحة الرئيسية
// ================================================================
export default function AssistantQuestionBankNewQuestionPage() {
  const router = useRouter();
  const params = useParams();
  const bankId = params.bankId;
  const { theme, toggleTheme, styles } = useTheme();

  // ===== حالات البيانات =====
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [bank, setBank] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== بيانات النموذج =====
  const [formData, setFormData] = useState({
    question_text: '',
    type: 'multiple_choice',
    difficulty: 'medium',
    marks: 1,
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    passage: '',
    tags: [],
  });

  // ===== أخطاء النموذج =====
  const [errors, setErrors] = useState({});

  // ===== أنواع الأسئلة =====
  const types = [
    { value: 'multiple_choice', label: 'اختيار من متعدد' },
    { value: 'true_false', label: 'صح/خطأ' },
    { value: 'essay', label: 'مقالي' },
    { value: 'matching', label: 'توصيل' },
    { value: 'ordering', label: 'ترتيب' },
    { value: 'audio', label: 'صوتي' },
    { value: 'file_upload', label: 'تحميل ملف' },
  ];

  const difficulties = [
    { value: 'easy', label: 'سهل' },
    { value: 'medium', label: 'متوسط' },
    { value: 'hard', label: 'صعب' },
  ];

  // ===== التحقق من الصلاحيات =====
  const hasPermission = useCallback((module, permission) => {
    if (!permissions || permissions.length === 0) return false;
    const perm = permissions.find(p => p.module === module);
    return perm?.[permission] || perm?.can_manage || false;
  }, [permissions]);

  const canCreate = useCallback(() => {
    return hasPermission('question_bank', 'can_create');
  }, [hasPermission]);

  // ===== جلب البيانات =====
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setDataReady(false);

        const sessionData = sessionStorage.getItem('assistantData');
        if (!sessionData) {
          router.replace('/assistant-login');
          return;
        }

        const parsed = JSON.parse(sessionData);
        setAssistant(parsed);

        const { data: permsData, error: permsError } = await supabase
          .from('assistant_permissions')
          .select('*')
          .eq('assistant_id', parsed.id);

        if (permsError) throw permsError;
        setPermissions(permsData || []);

        const hasCreate = permsData?.some(p => p.module === 'question_bank' && (p.can_create || p.can_manage));
        if (!hasCreate) {
          toast.error('غير مصرح لك بإضافة أسئلة إلى البنك');
          router.push('/dashboard/assistant/question-bank');
          return;
        }

        // جلب بيانات البنك
        const { data: bankData, error: bankError } = await supabase
          .from('question_banks')
          .select('id, title, teacher_id')
          .eq('id', bankId)
          .eq('teacher_id', parsed.teacher_id)
          .single();

        if (bankError) {
          if (bankError.code === 'PGRST116') {
            toast.error('بنك الأسئلة غير موجود');
            router.push('/dashboard/assistant/question-bank');
            return;
          }
          throw bankError;
        }

        setBank(bankData);
        setDataReady(true);
      } catch (err) {
        console.error('❌ خطأ في تحميل البيانات:', err);
        toast.error('فشل تحميل البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bankId, router]);

  // ===== معالجة تغيير الحقول =====
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ===== معالجة تغيير الخيارات =====
  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
    if (errors.options) {
      setErrors(prev => ({ ...prev, options: '' }));
    }
  };

  // ===== إضافة خيار جديد =====
  const addOption = () => {
    setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
  };

  // ===== حذف خيار =====
  const removeOption = (index) => {
    if (formData.options.length <= 2) {
      toast.error('يجب أن يكون هناك خياران على الأقل');
      return;
    }
    const newOptions = formData.options.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  // ===== معالجة تغيير الوسوم =====
  const handleTagsChange = (tags) => {
    setFormData(prev => ({ ...prev, tags }));
    if (errors.tags) {
      setErrors(prev => ({ ...prev, tags: '' }));
    }
  };

  // ===== التحقق من صحة النموذج =====
  const validate = () => {
    const newErrors = {};

    if (!formData.question_text.trim()) {
      newErrors.question_text = 'نص السؤال مطلوب';
    }

    if (formData.type === 'multiple_choice') {
      const filled = formData.options.filter(o => o.trim());
      if (filled.length < 2) {
        newErrors.options = 'يجب إدخال خيارين على الأقل';
      }
      if (!formData.correct_answer.trim()) {
        newErrors.correct_answer = 'الإجابة الصحيحة مطلوبة';
      }
    }

    if (formData.type === 'true_false' && !formData.correct_answer.trim()) {
      newErrors.correct_answer = 'الإجابة الصحيحة مطلوبة';
    }

    if (formData.type === 'matching' && !formData.correct_answer.trim()) {
      newErrors.correct_answer = 'الإجابة الصحيحة مطلوبة';
    }

    if (formData.type === 'ordering' && !formData.correct_answer.trim()) {
      newErrors.correct_answer = 'الترتيب الصحيح مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== حفظ السؤال =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('يرجى تصحيح الأخطاء في النموذج');
      return;
    }

    if (!canCreate()) {
      toast.error('ليس لديك صلاحية لإضافة أسئلة إلى البنك');
      return;
    }

    setIsSubmitting(true);

    try {
      const questionData = {
        bank_id: bankId,
        question_text: formData.question_text.trim(),
        type: formData.type,
        difficulty: formData.difficulty,
        marks: parseFloat(formData.marks) || 1,
        options: formData.type === 'multiple_choice' ? formData.options.filter(o => o.trim()) : [],
        correct_answer: formData.correct_answer.trim() || '',
        explanation: formData.explanation.trim() || null,
        passage: formData.passage.trim() || null,
        tags: formData.tags || [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: newQuestion, error: insertError } = await supabase
        .from('questions')
        .insert(questionData)
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('✅ تم إضافة السؤال بنجاح');

      // إعادة تعيين النموذج مع الاحتفاظ ببعض القيم
      setFormData({
        question_text: '',
        type: formData.type,
        difficulty: formData.difficulty,
        marks: formData.marks,
        options: ['', '', '', ''],
        correct_answer: '',
        explanation: '',
        passage: '',
        tags: [],
      });

      // عرض خيار إضافة سؤال آخر أو العودة
      if (confirm('هل تريد إضافة سؤال آخر؟')) {
        // استمر في النموذج
      } else {
        router.push(`/dashboard/assistant/question-bank/${bankId}`);
      }
    } catch (err) {
      console.error('❌ خطأ في إضافة السؤال:', err);
      toast.error(err.message || 'فشل إضافة السؤال');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== حالة التحميل =====
  if (loading || !dataReady) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
            </div>
          </div>
          <p className={`text-sm ${styles.subtext} animate-pulse`}>
            جاري تحميل النموذج...
          </p>
        </div>
      </div>
    );
  }

  if (!canCreate()) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="text-center">
          <Icons.Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${styles.text}`}>غير مصرح لك</h2>
          <p className={`${styles.subtext} text-sm mt-2`}>
            لا تملك صلاحية لإضافة أسئلة إلى هذا البنك
          </p>
          <Link
            href={`/dashboard/assistant/question-bank/${bankId}`}
            className="mt-4 inline-block px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition"
          >
            العودة للبنك
          </Link>
        </div>
      </div>
    );
  }

  if (!bank) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="text-center">
          <Icons.Database className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${styles.text}`}>البنك غير موجود</h2>
          <Link
            href="/dashboard/assistant/question-bank"
            className="mt-4 inline-block px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition"
          >
            العودة للقائمة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden`}>
      <div className="max-w-4xl mx-auto">
        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Icons.Plus className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className={`text-3xl font-extrabold ${styles.text}`}>➕ سؤال جديد</h1>
                <p className={`text-sm ${styles.subtext} mt-1`}>
                  إضافة سؤال إلى "{bank.title}"
                  {assistant && (
                    <span className="mr-2 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-400/20">
                      {assistant.display_name || assistant.full_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <Link
            href={`/dashboard/assistant/question-bank/${bankId}`}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition flex items-center gap-1 mt-3 md:mt-0"
          >
            <Icons.ArrowRight className="h-4 w-4" /> العودة للبنك
          </Link>
        </div>

        {/* ===== النموذج ===== */}
        <form onSubmit={handleSubmit} className={`${styles.card} border ${styles.border} rounded-3xl p-6 space-y-5`}>
          {/* نص السؤال */}
          <FormInput
            label="نص السؤال"
            name="question_text"
            value={formData.question_text}
            onChange={handleChange}
            error={errors.question_text}
            placeholder="اكتب نص السؤال هنا..."
            icon={Icons.FileQuestion}
            isTextarea
            rows={3}
            required
          />

          {/* النص المرفق */}
          <FormInput
            label="النص المرفق (اختياري)"
            name="passage"
            value={formData.passage}
            onChange={handleChange}
            placeholder="نص أو فقرة مرفقة بالسؤال..."
            icon={Icons.FileText}
            isTextarea
            rows={2}
          />

          {/* نوع السؤال والصعوبة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="نوع السؤال"
              name="type"
              value={formData.type}
              onChange={handleChange}
              isSelect
              options={types}
              required
            />
            <FormInput
              label="الصعوبة"
              name="difficulty"
              value={formData.difficulty}
              onChange={handleChange}
              isSelect
              options={difficulties}
              required
            />
          </div>

          {/* العلامات */}
          <FormInput
            label="العلامات"
            name="marks"
            type="number"
            value={formData.marks}
            onChange={handleChange}
            placeholder="مثال: 1"
            icon={Icons.Star}
            min="0.5"
            step="0.5"
            required
          />

          {/* الخيارات (للأسئلة متعددة الاختيار) */}
          {formData.type === 'multiple_choice' && (
            <div>
              <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                الخيارات <span className="text-red-400">*</span>
              </label>
              {formData.options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    placeholder={`خيار ${idx + 1}`}
                    className={`flex-1 p-2.5 ${styles.input} border ${errors.options ? 'border-red-400' : styles.border} rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition text-sm`}
                  />
                  <button
                    type="button"
                    onClick={() => removeOption(idx)}
                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/20 transition flex-shrink-0"
                    title="حذف الخيار"
                  >
                    <Icons.X className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={addOption}
                className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1"
              >
                <Icons.Plus className="h-3.5 w-3.5" /> إضافة خيار
              </button>
              {errors.options && (
                <p className="text-red-400 text-xs mt-1">{errors.options}</p>
              )}
            </div>
          )}

          {/* الإجابة الصحيحة */}
          {(formData.type === 'multiple_choice' ||
            formData.type === 'true_false' ||
            formData.type === 'matching' ||
            formData.type === 'ordering') && (
            <FormInput
              label={formData.type === 'ordering' ? 'الترتيب الصحيح' : 'الإجابة الصحيحة'}
              name="correct_answer"
              value={formData.correct_answer}
              onChange={handleChange}
              error={errors.correct_answer}
              placeholder={formData.type === 'ordering' ? 'اكتب الترتيب الصحيح (مثال: 1,2,3,4)' : 'اكتب الإجابة الصحيحة...'}
              required
            />
          )}

          {/* الشرح */}
          <FormInput
            label="الشرح (اختياري)"
            name="explanation"
            value={formData.explanation}
            onChange={handleChange}
            placeholder="شرح للإجابة..."
            icon={Icons.Info}
            isTextarea
            rows={2}
          />

          {/* الوسوم */}
          <TagsInput
            value={formData.tags}
            onChange={handleTagsChange}
            placeholder="أضف وسوماً (مثال: نحو, قواعد, اختبارات)..."
            styles={styles}
          />

          {/* معاينة السؤال */}
          {formData.question_text && (
            <div className="pt-2">
              <QuestionPreview question={formData} styles={styles} />
            </div>
          )}

          {/* أزرار الإجراء */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <Icons.Check className="h-5 w-5" />
                  إضافة السؤال
                </>
              )}
            </button>
            <Link
              href={`/dashboard/assistant/question-bank/${bankId}`}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition flex items-center gap-2"
            >
              إلغاء
            </Link>
          </div>
        </form>

        {/* ===== تذييل ===== */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className={`text-[10px] ${styles.subtext} opacity-60`}>
            © 2026 منصة محمد رضوان • جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}