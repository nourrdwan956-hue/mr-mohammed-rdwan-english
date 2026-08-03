'use client';

// ============================================================
// نظام الأسئلة المتطور – النسخة النهائية V29
// ✅ دعم نوع "إكمال من كلمات معطاة" بواجهة محسّنة
// ✅ إضافة word_bank و correct_answers في النموذج
// ✅ معاينة خاصة لـ fill_from_words
// ✅ إصلاح الأخطاء النحوية في QuestionPreview
// ✅ استبعاد القطع من الإحصائيات (stats)
// ✅ عرض خاص للقطعة مع زر لإضافة سؤال تابع
// ✅ تمرير passage_id تلقائياً عند إضافة سؤال تابع
// ✅ تحسين التباين في الوضعين الفاتح والداكن
// ✅ إصلاح عرض عدد الأسئلة (استخدام stats.total)
// ✅ إصلاح زر تحديد الكل
// ✅ إضافة توضيح أن القطعة ليست سؤالاً
// ✅ ربط عدد الفراغات مع correct_answers تلقائياً
// ✅ التحقق من تطابق الفراغات مع الإجابات
// ✅ إضافة علامات الفراغات تلقائياً إذا كانت مفقودة
// ✅ تحسين معاينة fill_from_words لعرض النص مع الفراغات
// ✅ إضافة نوع "ترتيب الجملة" (sentence_reorder) مع واجهة متكاملة
// ✅ تحسين واجهة sentence_reorder وإضافة تحقق من صحة النماذج
// ✅ تحسين validate و handleSubmit لـ sentence_reorder مع رسائل خطأ واضحة
// ❌ إزالة نوع "مقالي" (essay) نهائياً
// ✅ تحديث total_marks في جدول exams تلقائياً بعد كل تغيير في الأسئلة (إضافة، تعديل، حذف، تحديث جماعي)
// ✅ إضافة عرض الدرجة الكلية ودرجة النجاح مع إمكانية تعديلها مباشرة في الواجهة
// ✅ تخزين correct_answer كمصفوفة من المصفوفات (نماذج) لـ sentence_reorder
// ✅ إضافة أزرار محاذاة حقيقية (يسار/وسط/يمين) وتخزين text_align في قاعدة البيانات
// ✅ جعل نص القطعة (passage) من اليسار لليمين (LTR) في الإدخال والعرض
// ✅ إصلاح الأخطاء النحوية في JSX (closing tags)
// ============================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useTheme } from '@/lib/hooks/useTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement);

// ============================================================
// 1. أنواع الأسئلة (مع ألوان عالية التباين) – تم إزالة essay
// ============================================================
const QUESTION_TYPES = {
  multiple_choice: {
    label: 'اختيار من متعدد',
    icon: Icons.ListChecks,
    color: '#3b82f6',
    bg: 'rgba(59, 130, 246, 0.15)',
    textColor: '#3b82f6',
    supportsPassage: true,
  },
  true_false: {
    label: 'صح / خطأ',
    icon: Icons.CheckSquare,
    color: '#22c55e',
    bg: 'rgba(34, 197, 94, 0.15)',
    textColor: '#22c55e',
    supportsPassage: true,
  },
  matching: {
    label: 'توصيل',
    icon: Icons.GitBranch,
    color: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    textColor: '#f97316',
    supportsPassage: true,
  },
  ordering: {
    label: 'ترتيب',
    icon: Icons.SortAsc,
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.15)',
    textColor: '#ec4899',
    supportsPassage: true,
  },
  fill_blank: {
    label: 'ملء الفراغ',
    icon: Icons.SquarePen,
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.15)',
    textColor: '#06b6d4',
    supportsPassage: true,
    supportsMultipleAnswers: true,
  },
  fill_from_words: {
    label: 'إكمال من كلمات',
    icon: Icons.Layers,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    textColor: '#f59e0b',
    supportsPassage: true,
    supportsMultipleAnswers: true,
    isPassageHolder: false,
  },
  sentence_reorder: {
    label: 'ترتيب الجملة',
    icon: Icons.AlignJustify,
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.15)',
    textColor: '#f59e0b',
    supportsPassage: false,
    supportsMultipleAnswers: true,
  },
  passage: {
    label: 'قطعة نصية',
    icon: Icons.BookOpen,
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.15)',
    textColor: '#6366f1',
    isPassageHolder: true,
  },
};

const DIFFICULTY_LEVELS = [
  { value: 'easy', label: '🟢 سهل', color: '#22c55e' },
  { value: 'medium', label: '🟡 متوسط', color: '#f59e0b' },
  { value: 'hard', label: '🔴 صعب', color: '#ef4444' },
];

// ============================================================
// 2. خلفية الجسيمات
// ============================================================
const ParticleBackground = () => {
  const canvasRef = useRef(null);
  const { theme } = useTheme();
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];
    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    const colors = ['#fbbf24', '#f59e0b'];
    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.08 + 0.02,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }
    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color + Math.floor(p.opacity * 255).toString(16).padStart(2, '0');
        ctx.fill();
      });
      requestAnimationFrame(draw);
    };
    draw();
    return () => window.removeEventListener('resize', resize);
  }, [theme]);
  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ============================================================
// 3. عداد متحرك
// ============================================================
const AnimatedCounter = ({ target, suffix = '', duration = 1500, prefix = '' }) => {
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
  return <span ref={ref} className="font-extrabold text-white">{prefix}{count}{suffix}</span>;
};

// ============================================================
// 4. بطاقة إحصائية
// ============================================================
const StatCard = ({ stat }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      className={`relative rounded-2xl p-5 transition-all duration-300 overflow-hidden shadow-lg ${
        isDark ? 'bg-[#1a1f2e] border border-[#2a2f3e]' : 'bg-white border border-gray-200'
      }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-transparent opacity-50" />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{stat.label}</p>
          <p className="text-3xl font-extrabold text-white mt-1 drop-shadow-lg">
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-1`}>{stat.sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 shadow-inner`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-gray-700/30 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: '100%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ============================================================
// 5. Hook مخصص لإدارة الأسئلة (مُصلح – بدون passage_text)
// ============================================================
const useQuestions = (examId) => {
  const [questions, setQuestions] = useState([]);
  const [passages, setPassages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ----- دالة لتحديث الدرجة الكلية في جدول الامتحانات -----
  const updateTotalMarks = useCallback(async () => {
    try {
      const { data: allQuestions } = await supabase
        .from('exam_questions')
        .select('marks, type')
        .eq('exam_id', examId);
      const total = allQuestions
        ?.filter(q => q.type !== 'passage')
        .reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
      await supabase
        .from('exams')
        .update({ total_marks: total, updated_at: new Date().toISOString() })
        .eq('id', examId);
    } catch (err) {
      console.error('فشل تحديث الدرجة الكلية:', err);
    }
  }, [examId]);

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });
      if (error) throw error;

      const passagesList = data.filter(q => q.type === 'passage');
      const normalQuestions = data.filter(q => q.type !== 'passage');

      const passageMap = {};
      passagesList.forEach(p => {
        passageMap[p.id] = { ...p, children: [] };
      });
      normalQuestions.forEach(q => {
        if (q.passage_id && passageMap[q.passage_id]) {
          passageMap[q.passage_id].children.push(q);
        }
      });

      const ordered = [];
      const passageIds = Object.keys(passageMap);
      passageIds.forEach(id => {
        const passage = passageMap[id];
        ordered.push(passage);
        const sortedChildren = passage.children.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
        ordered.push(...sortedChildren);
      });
      const standalone = normalQuestions.filter(q => !q.passage_id);
      ordered.push(...standalone);

      setQuestions(ordered);
      setPassages(passagesList);
    } catch (err) {
      setError(err.message);
      toast.error('فشل جلب الأسئلة');
    } finally {
      setLoading(false);
    }
  }, [examId]);

  // ✅ إضافة سؤال (قطعة أو عادي) – بدون passage_text
  const addQuestion = async (questionData) => {
    try {
      if (questionData.type === 'passage') {
        const { data, error } = await supabase
          .from('exam_questions')
          .insert({
            exam_id: examId,
            type: 'passage',
            question_text: questionData.question_text || '',
            marks: 0,
            correct_answer: null,
            difficulty: null,
            order_index: questionData.order_index || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();
        if (error) throw error;
        await fetchQuestions();
        await updateTotalMarks();
        toast.success('✅ تم إضافة القطعة بنجاح');
        return data;
      }

      // الأسئلة العادية
      const { data, error } = await supabase
        .from('exam_questions')
        .insert({
          exam_id: examId,
          type: questionData.type,
          question_text: questionData.question_text,
          options: questionData.options || [],
          correct_answer: questionData.correct_answer || null,
          marks: questionData.marks || 1,
          difficulty: questionData.difficulty || 'medium',
          order_index: questionData.order_index || 0,
          explanation: questionData.explanation || '',
          category: questionData.category || '',
          time_limit: questionData.time_limit || 60,
          hint: questionData.hint || '',
          passage_id: questionData.passage_id || null,
          case_sensitive: questionData.case_sensitive || false,
          ignore_extra_spaces: questionData.ignore_extra_spaces !== undefined ? questionData.ignore_extra_spaces : true,
          partial_marking: questionData.partial_marking || false,
          word_limit: questionData.word_limit || 0,
          bank_question_id: questionData.bank_question_id || null,
          text_align: questionData.text_align || 'left',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (error) throw error;
      await fetchQuestions();
      await updateTotalMarks();
      toast.success('✅ تم إضافة السؤال بنجاح');
      return data;
    } catch (err) {
      console.error('Add question error:', err);
      toast.error('فشل إضافة السؤال: ' + err.message);
      throw err;
    }
  };

  // ✅ تحديث سؤال – بدون passage_text
  const updateQuestion = async (id, updates) => {
    try {
      const question = questions.find(q => q.id === id);
      if (question && question.type === 'passage') {
        const { data, error } = await supabase
          .from('exam_questions')
          .update({
            question_text: updates.question_text || '',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id)
          .select()
          .single();
        if (error) throw error;
        await fetchQuestions();
        await updateTotalMarks();
        toast.success('✅ تم تحديث القطعة');
        return data;
      }

      const { data, error } = await supabase
        .from('exam_questions')
        .update({
          type: updates.type,
          question_text: updates.question_text,
          options: updates.options || [],
          correct_answer: updates.correct_answer || null,
          marks: updates.marks || 1,
          difficulty: updates.difficulty || 'medium',
          order_index: updates.order_index || 0,
          explanation: updates.explanation || '',
          category: updates.category || '',
          time_limit: updates.time_limit || 60,
          hint: updates.hint || '',
          passage_id: updates.passage_id || null,
          case_sensitive: updates.case_sensitive || false,
          ignore_extra_spaces: updates.ignore_extra_spaces !== undefined ? updates.ignore_extra_spaces : true,
          partial_marking: updates.partial_marking || false,
          word_limit: updates.word_limit || 0,
          text_align: updates.text_align || 'left',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      await fetchQuestions();
      await updateTotalMarks();
      toast.success('✅ تم تحديث السؤال');
      return data;
    } catch (err) {
      console.error('Update error:', err);
      toast.error('فشل تحديث السؤال');
      throw err;
    }
  };

  // حذف سؤال
  const deleteQuestion = async (id) => {
    try {
      const question = questions.find(q => q.id === id);
      if (question && question.type === 'passage') {
        await supabase.from('exam_questions').delete().eq('passage_id', id);
      }
      const { error } = await supabase.from('exam_questions').delete().eq('id', id);
      if (error) throw error;
      await fetchQuestions();
      await updateTotalMarks();
      toast.success('✅ تم حذف السؤال');
    } catch (err) {
      toast.error('فشل حذف السؤال');
      throw err;
    }
  };

  // نقل سؤال (لا يؤثر على total_marks)
  const moveQuestion = async (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= questions.length) return;
    const updated = [...questions];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    const updates = updated.map((q, i) => ({ ...q, order_index: i }));
    try {
      for (const q of updates) {
        await supabase.from('exam_questions').update({ order_index: q.order_index }).eq('id', q.id);
      }
      setQuestions(updated);
      toast.success('✅ تم تحديث الترتيب');
    } catch (err) {
      toast.error('فشل تحديث الترتيب');
      await fetchQuestions();
    }
  };

  // نسخ سؤال
  const duplicateQuestion = async (question) => {
    const { id, ...rest } = question;
    const newQuestion = { ...rest, order_index: questions.length };
    return await addQuestion(newQuestion);
  };

  // ترتيب عشوائي (لا يؤثر على total_marks)
  const randomizeOrder = async () => {
    if (questions.length < 2) {
      toast.warning('يجب وجود سؤالين على الأقل للترتيب العشوائي');
      return;
    }
    const passagesList = questions.filter(q => q.type === 'passage');
    const normal = questions.filter(q => q.type !== 'passage');
    const shuffledNormal = [...normal].sort(() => Math.random() - 0.5);
    const shuffled = [...passagesList, ...shuffledNormal];
    const updates = shuffled.map((q, i) => ({ ...q, order_index: i }));
    try {
      for (const q of updates) {
        await supabase.from('exam_questions').update({ order_index: q.order_index }).eq('id', q.id);
      }
      setQuestions(shuffled);
      toast.success('✅ تم ترتيب الأسئلة عشوائياً مع الحفاظ على تجميع القطع');
    } catch (err) {
      toast.error('فشل الترتيب العشوائي');
    }
  };

  // تحديث جماعي
  const bulkUpdate = async (ids, updates) => {
    try {
      const { error } = await supabase.from('exam_questions').update(updates).in('id', ids);
      if (error) throw error;
      await fetchQuestions();
      await updateTotalMarks();
      toast.success(`✅ تم تحديث ${ids.length} سؤال`);
    } catch (err) {
      toast.error('فشل التحديث الجماعي');
    }
  };

  return {
    questions,
    passages,
    loading,
    error,
    fetchQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    moveQuestion,
    duplicateQuestion,
    randomizeOrder,
    bulkUpdate,
  };
};

// ============================================================
// 6. معاينة السؤال (مُعاد كتابتها لتجنب الأخطاء) – تم إزالة essay
// ============================================================
const QuestionPreview = ({ question }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (!question) return null;
  const type = question.type || 'multiple_choice';
  const typeInfo = QUESTION_TYPES[type] || QUESTION_TYPES.multiple_choice;
  const TypeIcon = typeInfo.icon;

  // دالة لعرض النص مع الفراغات (لـ fill_from_words)
  const renderPreviewText = (text, correctAnswers) => {
    if (!text) return 'لا يوجد نص';
    const parts = text.split(/(\{\d+\}|_{4,})/g);
    let blankIndex = 0;
    return parts.map((part, idx) => {
      if (part.match(/^\{\d+\}$/) || part.match(/^_{4,}$/)) {
        const ans = correctAnswers && correctAnswers[blankIndex] ? correctAnswers[blankIndex] : '_____';
        blankIndex++;
        return (
          <span key={idx} className="inline-block px-2 py-0.5 mx-0.5 border-b-2 border-yellow-400 text-yellow-400 font-bold">
            {ans}
          </span>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  // عرض خاص لـ sentence_reorder (محسّن)
  const renderSentenceReorderPreview = (question) => {
    const words = question.options || [];
    const models = question.correct_answer || [];
    return (
      <div className="space-y-2">
        <div>
          <p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>الكلمات المبعثرة (للطالب):</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {Array.isArray(words) && words.map((w, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-600/30 text-amber-300 border border-amber-600">
                {w}
              </span>
            ))}
          </div>
        </div>
        {Array.isArray(models) && models.length > 0 && (
          <div>
            <p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>نماذج الإجابات الصحيحة:</p>
            {models.map((model, idx) => (
              <div key={idx} className="flex flex-wrap gap-1 mt-1">
                <span className="text-xs text-green-400 ml-1">نموذج {idx+1}:</span>
                {model.map((word, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-600/30 text-green-300 border border-green-600">
                    {word}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`rounded-xl p-4 mt-4 border-2 ${isDark ? 'border-white/20 bg-[#1a1f2e]' : 'border-gray-300 bg-white'}`}>
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <TypeIcon className="h-5 w-5" style={{ color: typeInfo.color }} />
        <span className="text-xs font-bold" style={{ color: typeInfo.color }}>معاينة السؤال</span>
        <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>#{question.order_index + 1}</span>
        {question.type !== 'passage' && (
          <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>الدرجة: {question.marks}</span>
        )}
        {question.difficulty && (
          <span className="text-xs" style={{ color: DIFFICULTY_LEVELS.find(d => d.value === question.difficulty)?.color || '#fff' }}>
            {DIFFICULTY_LEVELS.find(d => d.value === question.difficulty)?.label || question.difficulty}
          </span>
        )}
        {question.bank_question_id && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-600/30 text-purple-300 border border-purple-600">
            <Icons.Database className="h-3 w-3 inline mr-1" /> مستورد
          </span>
        )}
        {question.passage_id && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-600/30 text-indigo-300 border border-indigo-600">
            <Icons.BookOpen className="h-3 w-3 inline mr-1" /> قطعة
          </span>
        )}
      </div>
      {type === 'passage' ? (
        <div className={`p-3 rounded-lg ${isDark ? 'bg-black/30 border border-white/10' : 'bg-gray-100 border border-gray-200'} text-sm`}>
          <p className="font-bold text-white">📄 القطعة:</p>
          <p
            className={`whitespace-pre-wrap ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
            dir="ltr"
            style={{ textAlign: 'left' }}
          >
            {question.question_text || 'لا يوجد نص'}
          </p>
        </div>
      ) : (
        <>
          <p
            className={`text-sm mb-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
            dir="ltr"
            style={{ textAlign: 'left' }}
          >
            {question.question_text}
          </p>
          {type === 'fill_from_words' && (
            <div className="space-y-2">
              <div className={`p-3 rounded-lg ${isDark ? 'bg-black/30 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}>
                <p className={`text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {renderPreviewText(question.question_text, question.correct_answer)}
                </p>
              </div>
              {Array.isArray(question.options) && question.options.length > 0 && (
                <div>
                  <p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>صندوق الكلمات:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {question.options.map((w, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-amber-600/30 text-amber-300 border border-amber-600">
                        {w}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(question.correct_answer) && question.correct_answer.length > 0 && (
                <div>
                  <p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>الإجابات الصحيحة:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {question.correct_answer.map((ans, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-green-600/30 text-green-300 border border-green-600">
                        #{i+1}: {ans}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {type === 'sentence_reorder' && renderSentenceReorderPreview(question)}
          {type === 'multiple_choice' && question.options?.length > 0 && (
            <div className="space-y-1">
              {question.options.map((opt, i) => (
                <div key={i} className={`flex items-center gap-2 text-sm ${opt.isCorrect ? 'text-green-400 font-bold' : isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  <span>{String.fromCharCode(65 + i)}.</span>
                  <span>{opt.text}</span>
                  {opt.isCorrect && <Icons.CheckCircle className="h-4 w-4 text-green-400" />}
                </div>
              ))}
            </div>
          )}
          {type === 'fill_blank' && question.correct_answer && (
            <div className="mt-2 p-2 rounded-lg bg-purple-600/20 border border-purple-600/30">
              <p className={`text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>نماذج الإجابات الصحيحة:</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {Array.isArray(question.correct_answer) ? (
                  question.correct_answer.map((ans, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-green-600/30 text-green-300 border border-green-600">
                      {ans}
                    </span>
                  ))
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-600/30 text-green-300 border border-green-600">
                    {question.correct_answer}
                  </span>
                )}
              </div>
            </div>
          )}
          {question.explanation && (
            <div className={`text-xs mt-2 flex items-start gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              <Icons.Lightbulb className="h-4 w-4 text-yellow-400 flex-shrink-0 mt-0.5" />
              <span>{question.explanation}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
};

// ============================================================
// 7. نافذة إضافة/تعديل سؤال (مع تحسين معاينة القطعة) – تم إزالة essay
// ============================================================
const QuestionFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  question,
  examId,
  totalQuestions,
  existingPassages,
  preselectedPassageId = null,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [formData, setFormData] = useState({
    type: 'multiple_choice',
    question_text: '',
    options: [],
    correct_answer: '',
    marks: 1,
    order_index: 0,
    explanation: '',
    difficulty: 'medium',
    category: '',
    time_limit: 60,
    hint: '',
    passage_id: null,
    passage_text: '',
    case_sensitive: false,
    ignore_extra_spaces: true,
    partial_marking: false,
    word_limit: 0,
    word_bank: [],
    correct_answers: [],
    text_align: 'left',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showPassagePreview, setShowPassagePreview] = useState(false);
  const [previewPassageId, setPreviewPassageId] = useState(null);
  
  const prevQuestionTextRef = useRef('');
  const updatingRef = useRef(false);

  const extractBlankCount = (text) => {
    if (!text) return 0;
    const braceMatches = text.match(/\{\d+\}/g);
    if (braceMatches) return braceMatches.length;
    const underscoreMatches = text.match(/_{4,}/g);
    return underscoreMatches ? underscoreMatches.length : 0;
  };

  useEffect(() => {
    if (question) {
      const type = question.type || 'multiple_choice';
      let correct = question.correct_answer;
      if (['fill_blank', 'fill_from_words', 'sentence_reorder'].includes(type) && correct && !Array.isArray(correct)) {
        correct = [correct];
      }
      let wordBank = [];
      let correctAnswers = [];
      if (type === 'fill_from_words') {
        wordBank = Array.isArray(question.options) ? question.options : [];
        let rawCorrect = Array.isArray(correct) ? correct : (correct ? [correct] : []);
        if (rawCorrect.length === 1 && Array.isArray(rawCorrect[0])) {
          rawCorrect = rawCorrect.flat();
        }
        correctAnswers = rawCorrect.map(item =>
          Array.isArray(item) ? item[0] || '' : String(item)
        );
        const blankCount = extractBlankCount(question.question_text || '');
        if (blankCount > 0 && correctAnswers.length !== blankCount) {
          if (correctAnswers.length < blankCount) {
            const diff = blankCount - correctAnswers.length;
            correctAnswers = [...correctAnswers, ...Array(diff).fill('')];
          } else {
            correctAnswers = correctAnswers.slice(0, blankCount);
          }
        }
      } else if (type === 'sentence_reorder') {
        wordBank = Array.isArray(question.options) ? question.options : [];
        let rawCorrect = Array.isArray(correct) ? correct : (correct ? [correct] : []);
        correctAnswers = rawCorrect.map(model => Array.isArray(model) ? model : [model]);
        if (correctAnswers.length === 0) {
          correctAnswers = [[]];
        }
      }
      setFormData({
        type: type,
        question_text: question.question_text || '',
        options: Array.isArray(question.options) ? question.options : [],
        correct_answer: correct || '',
        marks: question.marks || 1,
        order_index: question.order_index || 0,
        explanation: question.explanation || '',
        difficulty: question.difficulty || 'medium',
        category: question.category || '',
        time_limit: question.time_limit || 60,
        hint: question.hint || '',
        passage_id: question.passage_id || null,
        passage_text: question.type === 'passage' ? question.question_text : '',
        case_sensitive: question.case_sensitive || false,
        ignore_extra_spaces: question.ignore_extra_spaces !== undefined ? question.ignore_extra_spaces : true,
        partial_marking: question.partial_marking || false,
        word_limit: question.word_limit || 0,
        word_bank: wordBank,
        correct_answers: correctAnswers,
        text_align: question.text_align || 'left',
      });
      prevQuestionTextRef.current = question.question_text || '';
    } else {
      const initialPassageId = preselectedPassageId || null;
      setFormData({
        type: 'multiple_choice',
        question_text: '',
        options: [{ text: '', isCorrect: false }, { text: '', isCorrect: false }],
        correct_answer: '',
        marks: 1,
        order_index: totalQuestions || 0,
        explanation: '',
        difficulty: 'medium',
        category: '',
        time_limit: 60,
        hint: '',
        passage_id: initialPassageId,
        passage_text: '',
        case_sensitive: false,
        ignore_extra_spaces: true,
        partial_marking: false,
        word_limit: 0,
        word_bank: ['', ''],
        correct_answers: [''],
        text_align: 'left',
      });
      prevQuestionTextRef.current = '';
    }
  }, [question, totalQuestions, preselectedPassageId]);

  useEffect(() => {
    if (preselectedPassageId) {
      setFormData(prev => ({ ...prev, passage_id: preselectedPassageId }));
    }
  }, [preselectedPassageId]);

  useEffect(() => {
    if (formData.type !== 'fill_from_words') return;
    if (prevQuestionTextRef.current === formData.question_text) return;
    if (updatingRef.current) {
      updatingRef.current = false;
      prevQuestionTextRef.current = formData.question_text;
      return;
    }
    const blankCount = extractBlankCount(formData.question_text);
    const currentAnswers = formData.correct_answers;
    if (blankCount > 0 && currentAnswers.length !== blankCount) {
      updatingRef.current = true;
      let newAnswers;
      if (currentAnswers.length < blankCount) {
        const diff = blankCount - currentAnswers.length;
        newAnswers = [...currentAnswers, ...Array(diff).fill('')];
      } else {
        newAnswers = currentAnswers.slice(0, blankCount);
      }
      setFormData(prev => ({ ...prev, correct_answers: newAnswers }));
    }
    prevQuestionTextRef.current = formData.question_text;
  }, [formData.question_text, formData.type]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const addOption = () => setFormData(prev => ({ ...prev, options: [...prev.options, { text: '', isCorrect: false }] }));
  const removeOption = (index) => {
    if (formData.options.length <= 2) return toast.warning('يجب أن يكون هناك خياران على الأقل');
    setFormData(prev => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
  };
  const updateOption = (index, field, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addWord = () => setFormData(prev => ({ ...prev, word_bank: [...prev.word_bank, ''] }));
  const removeWord = (index) => {
    if (formData.word_bank.length <= 2) return toast.warning('يجب أن يكون هناك كلمتان على الأقل');
    setFormData(prev => ({ ...prev, word_bank: prev.word_bank.filter((_, i) => i !== index) }));
  };
  const updateWord = (index, value) => {
    const newBank = [...formData.word_bank];
    newBank[index] = value;
    setFormData(prev => ({ ...prev, word_bank: newBank }));
  };

  const addCorrectAnswer = () => setFormData(prev => ({ ...prev, correct_answers: [...prev.correct_answers, ''] }));
  const removeCorrectAnswer = (index) => {
    if (formData.correct_answers.length <= 1) return toast.warning('يجب أن يكون هناك إجابة واحدة على الأقل');
    setFormData(prev => ({ ...prev, correct_answers: prev.correct_answers.filter((_, i) => i !== index) }));
  };
  const updateCorrectAnswer = (index, value) => {
    const newAnswers = [...formData.correct_answers];
    newAnswers[index] = value;
    setFormData(prev => ({ ...prev, correct_answers: newAnswers }));
  };

  const addSentenceModel = () => {
    setFormData(prev => ({
      ...prev,
      correct_answers: [...prev.correct_answers, []]
    }));
  };
  const removeSentenceModel = (index) => {
    if (formData.correct_answers.length <= 1) return toast.warning('يجب أن يكون هناك نموذج واحد على الأقل');
    setFormData(prev => ({
      ...prev,
      correct_answers: prev.correct_answers.filter((_, i) => i !== index)
    }));
  };
  const updateSentenceModelWord = (modelIndex, wordIndex, value) => {
    setFormData(prev => {
      const newModels = [...prev.correct_answers];
      const newModel = [...newModels[modelIndex]];
      newModel[wordIndex] = value;
      newModels[modelIndex] = newModel;
      return { ...prev, correct_answers: newModels };
    });
  };
  const addWordToSentenceModel = (modelIndex) => {
    setFormData(prev => {
      const newModels = [...prev.correct_answers];
      newModels[modelIndex] = [...newModels[modelIndex], ''];
      return { ...prev, correct_answers: newModels };
    });
  };

  // دوال قديمة للتوافق (لـ fill_blank فقط)
  const addCorrectAnswerOld = () => {
    const current = Array.isArray(formData.correct_answer) ? formData.correct_answer : [];
    setFormData(prev => ({ ...prev, correct_answer: [...current, ''] }));
  };
  const removeCorrectAnswerOld = (index) => {
    const current = Array.isArray(formData.correct_answer) ? formData.correct_answer : [];
    if (current.length <= 1) return toast.warning('يجب أن يكون هناك نموذج إجابة واحد على الأقل');
    setFormData(prev => ({ ...prev, correct_answer: current.filter((_, i) => i !== index) }));
  };
  const updateCorrectAnswerOld = (index, value) => {
    const current = Array.isArray(formData.correct_answer) ? formData.correct_answer : [];
    const newAnswers = [...current];
    newAnswers[index] = value;
    setFormData(prev => ({ ...prev, correct_answer: newAnswers }));
  };

  const validate = () => {
    const newErrors = {};
    const type = formData.type;

    if (type === 'passage') {
      if (!formData.passage_text.trim()) newErrors.passage_text = 'نص القطعة مطلوب';
    } else {
      if (!formData.question_text.trim()) newErrors.question_text = 'نص السؤال مطلوب';
      if (formData.marks < 1) newErrors.marks = 'الدرجة يجب أن تكون أكبر من 0';
    }

    if (type === 'multiple_choice') {
      if (formData.options.length < 2) newErrors.options = 'يجب إضافة خيارين على الأقل';
      if (!formData.options.some(o => o.isCorrect)) newErrors.options = 'يجب تحديد الإجابة الصحيحة';
      if (formData.options.some(o => !o.text.trim())) newErrors.options = 'جميع الخيارات مطلوبة';
    }

    if (type === 'true_false' && !formData.correct_answer) {
      newErrors.correct_answer = 'يرجى اختيار الإجابة الصحيحة';
    }

    if (type === 'fill_blank') {
      const answers = Array.isArray(formData.correct_answer) ? formData.correct_answer : [formData.correct_answer];
      if (answers.length === 0 || answers.every(a => !a.trim())) {
        newErrors.correct_answer = 'يرجى إدخال نموذج إجابة واحد على الأقل';
      }
    }

    if (type === 'fill_from_words') {
      const blankCount = extractBlankCount(formData.question_text);
      if (blankCount === 0) {
        newErrors.question_text = '⚠️ النص يجب أن يحتوي على فراغات (مثل {1} أو ____)';
      }
      if (formData.word_bank.length < 2) newErrors.word_bank = 'يجب إضافة كلمتين على الأقل';
      if (formData.word_bank.some(w => !w.trim())) newErrors.word_bank = 'جميع الكلمات مطلوبة';
      if (formData.correct_answers.length !== blankCount) {
        newErrors.correct_answers = `⚠️ يجب أن يتطابق عدد الإجابات (${formData.correct_answers.length}) مع عدد الفراغات (${blankCount})`;
      }
      if (formData.correct_answers.some(a => !a.trim())) newErrors.correct_answers = 'جميع الإجابات مطلوبة';
    }

    // التحقق الخاص بـ sentence_reorder (محسّن)
    if (type === 'sentence_reorder') {
      if (!formData.word_bank || formData.word_bank.length < 2) {
        newErrors.word_bank = 'أضف جزئين على الأقل';
      }
      if (formData.word_bank.some(w => !w.trim())) {
        newErrors.word_bank = 'جميع الأجزاء مطلوبة';
      }
      if (!formData.correct_answers || formData.correct_answers.length === 0) {
        newErrors.correct_answers = 'أضف نموذج إجابة واحداً على الأقل';
      } else {
        const hasEmptyModel = formData.correct_answers.some(model => !model || model.length === 0);
        if (hasEmptyModel) {
          newErrors.correct_answers = 'لا تترك نموذجاً فارغاً';
        } else {
          const allWords = formData.word_bank.filter(w => w.trim() !== '');
          for (const model of formData.correct_answers) {
            for (const word of model) {
              if (!allWords.includes(word)) {
                newErrors.correct_answers = 'جميع الكلمات في النماذج يجب أن تكون موجودة في الكلمات المبعثرة';
                break;
              }
            }
            if (newErrors.correct_answers) break;
          }
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      let dataToSubmit = { ...formData };

      if (dataToSubmit.type === 'passage') {
        dataToSubmit.question_text = dataToSubmit.passage_text;
        dataToSubmit.marks = 0;
        dataToSubmit.correct_answer = null;
        dataToSubmit.difficulty = null;
        dataToSubmit.options = [];
        dataToSubmit.explanation = '';
        dataToSubmit.category = '';
        dataToSubmit.time_limit = 0;
        dataToSubmit.hint = '';
        dataToSubmit.word_limit = 0;
        dataToSubmit.passage_id = null;
        dataToSubmit.case_sensitive = false;
        dataToSubmit.ignore_extra_spaces = true;
        dataToSubmit.partial_marking = false;
        delete dataToSubmit.passage_text;
        delete dataToSubmit.word_bank;
        delete dataToSubmit.correct_answers;
        dataToSubmit.text_align = 'left';
        await onSubmit(dataToSubmit);
        onClose();
        return;
      }

      if (dataToSubmit.type === 'fill_from_words') {
        const wordBank = Array.isArray(dataToSubmit.word_bank) ? dataToSubmit.word_bank : [];
        let correctAnswers = Array.isArray(dataToSubmit.correct_answers) ? dataToSubmit.correct_answers : [];
        if (correctAnswers.length === 1 && Array.isArray(correctAnswers[0])) {
          correctAnswers = correctAnswers.flat();
        }
        correctAnswers = correctAnswers.map(item => 
          Array.isArray(item) ? item[0] || '' : String(item)
        );
        let text = dataToSubmit.question_text;
        const blankCount = extractBlankCount(text);
        if (blankCount === 0 && correctAnswers.length > 0) {
          const placeholders = correctAnswers.map((_, i) => `{${i+1}}`).join(' ');
          text = text + ' ' + placeholders;
          toast.warning('⚠️ تم إضافة علامات الفراغات تلقائياً في نهاية النص. يرجى مراجعة النص وتعديل مواضع الفراغات حسب الحاجة.');
        }
        dataToSubmit.question_text = text;
        dataToSubmit.options = wordBank;
        dataToSubmit.correct_answer = correctAnswers;
        delete dataToSubmit.word_bank;
        delete dataToSubmit.correct_answers;
      } else if (dataToSubmit.type === 'sentence_reorder') {
        let wordBank = Array.isArray(dataToSubmit.word_bank) ? dataToSubmit.word_bank : [];
        let correctAnswers = Array.isArray(dataToSubmit.correct_answers) ? dataToSubmit.correct_answers : [];
        correctAnswers = correctAnswers.map(model => {
          if (typeof model === 'string') {
            return model.split(/\s+/).filter(w => w.trim() !== '');
          }
          if (Array.isArray(model)) {
            return model.filter(w => w && w.trim() !== '');
          }
          return [model];
        });
        correctAnswers = correctAnswers.filter(model => model.length > 0);
        if (correctAnswers.length === 0) {
          toast.error('⚠️ يجب أن يحتوي كل نموذج على كلمة واحدة على الأقل');
          setSubmitting(false);
          return;
        }
        dataToSubmit.options = wordBank;
        dataToSubmit.correct_answer = correctAnswers;
        delete dataToSubmit.word_bank;
        delete dataToSubmit.correct_answers;
      } else {
        if (dataToSubmit.type === 'fill_blank') {
          const answers = Array.isArray(dataToSubmit.correct_answer) ? dataToSubmit.correct_answer : [dataToSubmit.correct_answer];
          dataToSubmit.correct_answer = answers.filter(a => a.trim() !== '');
          if (dataToSubmit.correct_answer.length === 0) {
            toast.error('يجب إدخال نموذج إجابة واحد على الأقل');
            setSubmitting(false);
            return;
          }
        }
        delete dataToSubmit.word_bank;
        delete dataToSubmit.correct_answers;
      }

      if (!dataToSubmit.passage_id) dataToSubmit.passage_id = null;
      delete dataToSubmit.passage_text;
      
      // ✅ إرسال المحاذاة (إن لم تكن موجودة نضع left)
      dataToSubmit.text_align = formData.text_align || 'left';
      
      await onSubmit(dataToSubmit);
      onClose();
    } catch (err) {
      // handled by parent
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;
  const isEdit = !!question;
  const typeInfo = QUESTION_TYPES[formData.type] || QUESTION_TYPES.multiple_choice;
  const TypeIcon = typeInfo.icon;
  const isPassage = formData.type === 'passage';
  const isSentenceReorder = formData.type === 'sentence_reorder';

  const getSelectedPassageText = () => {
    if (!formData.passage_id) return null;
    const passage = existingPassages?.find(p => p.id === formData.passage_id);
    return passage ? passage.question_text : null;
  };

  const handlePreviewPassage = () => {
    if (!formData.passage_id) {
      toast.error('⚠️ الرجاء اختيار قطعة أولاً');
      return;
    }
    setPreviewPassageId(formData.passage_id);
    setShowPassagePreview(true);
  };

  const getShortText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`rounded-3xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto ${
          isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300'
        } shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: typeInfo.bg }}>
              <TypeIcon className="h-6 w-6" style={{ color: typeInfo.color }} />
            </div>
            <h3 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {isEdit ? '✏️ تعديل السؤال' : '➕ إضافة سؤال جديد'}
            </h3>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowPreview(!showPreview)} className={`p-2 rounded-xl transition ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}>
              <Icons.Eye className="h-5 w-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}" />
            </button>
            <button onClick={onClose} className="p-2 rounded-xl transition hover:bg-red-500/20">
              <Icons.X className="h-6 w-6 text-red-400" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* نوع السؤال */}
          <div>
            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>نوع السؤال</label>
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
              {Object.entries(QUESTION_TYPES).map(([key, { label, icon: Icon, color, bg }]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      type: key,
                      options: key === 'multiple_choice' ? [{ text: '', isCorrect: false }, { text: '', isCorrect: false }] :
                               key === 'fill_from_words' ? ['', ''] :
                               key === 'sentence_reorder' ? [] :
                               key === 'matching' ? [{ left: '', right: '' }, { left: '', right: '' }] :
                               key === 'ordering' ? ['', ''] : [],
                      correct_answer: key === 'true_false' ? '' : (key === 'fill_blank' ? [''] : ''),
                      passage_text: key === 'passage' ? '' : '',
                      passage_id: key === 'passage' ? null : (preselectedPassageId || null),
                      marks: key === 'passage' ? 0 : 1,
                      difficulty: key === 'passage' ? null : 'medium',
                      word_bank: key === 'fill_from_words' ? ['', ''] : (key === 'sentence_reorder' ? [] : []),
                      correct_answers: key === 'fill_from_words' ? [''] : (key === 'sentence_reorder' ? [[]] : []),
                      question_text: key === 'fill_from_words' ? '' : (key === 'passage' ? '' : ''),
                      text_align: 'left',
                    }));
                    prevQuestionTextRef.current = '';
                  }}
                  className={`p-2 rounded-xl text-center transition-all duration-300 text-xs ${
                    formData.type === key
                      ? 'border-2 shadow-lg' 
                      : `${isDark ? 'border border-white/10 hover:border-white/30' : 'border border-gray-200 hover:border-gray-400'}`
                  }`}
                  style={{
                    borderColor: formData.type === key ? color : undefined,
                    backgroundColor: formData.type === key ? bg : (isDark ? 'rgba(255,255,255,0.03)' : '#f9fafb'),
                    color: formData.type === key ? color : (isDark ? '#9ca3af' : '#4b5563'),
                  }}
                >
                  <Icon className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-[9px] font-semibold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ربط القطعة (لغير القطع) مع زر معاينة */}
          {!isPassage && existingPassages && existingPassages.length > 0 && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                ربط بقطعة (اختياري)
              </label>
              <div className="flex gap-2 items-start">
                <select
                  name="passage_id"
                  value={formData.passage_id || ''}
                  onChange={handleChange}
                  className={`flex-1 p-3 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition ${
                    isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="">بدون قطعة</option>
                  {existingPassages.map(p => (
                    <option key={p.id} value={p.id}>
                      {getShortText(p.question_text || 'قطعة', 50)}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handlePreviewPassage}
                  className={`px-3 py-3 rounded-xl transition flex items-center justify-center ${
                    isDark ? 'bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-600' : 'bg-indigo-100 hover:bg-indigo-200 text-indigo-700 border border-indigo-300'
                  }`}
                  title="معاينة القطعة المختارة"
                >
                  <Icons.Eye className="h-5 w-5" />
                </button>
              </div>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                اختر قطعة موجودة لربط هذا السؤال بها، أو اتركه بدون قطعة. يمكنك معاينة القطعة المختارة بالضغط على زر العين.
              </p>
            </div>
          )}

          {/* ✅ أزرار المحاذاة – تعمل فعلاً */}
          {!isPassage && (
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                <Icons.AlignLeft className="inline h-4 w-4 mr-1" />
                المحاذاة:
              </span>
              {[
                { value: 'left', icon: Icons.AlignLeft, label: 'يسار' },
                { value: 'center', icon: Icons.AlignCenter, label: 'وسط' },
                { value: 'right', icon: Icons.AlignRight, label: 'يمين' },
              ].map(({ value, icon: Icon, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, text_align: value }))}
                  className={`p-2 rounded-lg transition-all duration-200 ${
                    formData.text_align === value
                      ? 'bg-yellow-500/30 border-2 border-yellow-400 shadow-lg shadow-yellow-500/20'
                      : isDark
                      ? 'bg-white/5 border border-white/10 hover:bg-white/10'
                      : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
                  }`}
                  title={label}
                >
                  <Icon className={`h-5 w-5 ${
                    formData.text_align === value ? 'text-yellow-400' : isDark ? 'text-gray-400' : 'text-gray-600'
                  }`} />
                </button>
              ))}
              <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mr-2`}>
                (اختر اتجاه النص)
              </span>
            </div>
          )}

          {/* نص السؤال أو القطعة */}
          {isPassage ? (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>نص القطعة <span className="text-red-400">*</span></label>
              <textarea
                name="passage_text"
                value={formData.passage_text}
                onChange={handleChange}
                rows="6"
                dir="ltr"
                style={{ textAlign: 'left' }}
                placeholder="أدخل النص الطويل للقطعة هنا..."
                className={`w-full p-3 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition resize-none ${
                  isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                }`}
              />
              {errors.passage_text && <p className="text-red-400 text-xs mt-1">{errors.passage_text}</p>}
            </div>
          ) : (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                نص السؤال <span className="text-red-400">*</span>
                {formData.type === 'fill_from_words' && (
                  <span className={`text-xs mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    (استخدم {`{1}`}, {`{2}`}, ... أو ____ للفراغات)
                  </span>
                )}
              </label>
              <textarea
                name="question_text"
                value={formData.question_text}
                onChange={handleChange}
                rows="3"
                dir="ltr"
                style={{ textAlign: 'left' }}
                placeholder={formData.type === 'fill_from_words' ? 'مثال: Learning a new language ... {1} __________.' : 'اكتب نص السؤال هنا...'}
                className={`w-full p-3 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition resize-none ${
                  isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                }`}
              />
              {errors.question_text && <p className="text-red-400 text-xs mt-1">{errors.question_text}</p>}
            </div>
          )}

          {/* خيارات MCQ */}
          {formData.type === 'multiple_choice' && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>الخيارات</label>
              <div className="space-y-2">
                {formData.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} w-6`}>{String.fromCharCode(65 + idx)}.</span>
                    <input
                      type="text"
                      value={opt.text}
                      onChange={(e) => updateOption(idx, 'text', e.target.value)}
                      placeholder={`خيار ${String.fromCharCode(65 + idx)}`}
                      className={`flex-1 p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                        isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    />
                    <label className={`flex items-center gap-1 text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} whitespace-nowrap`}>
                      <input type="checkbox" checked={opt.isCorrect} onChange={(e) => updateOption(idx, 'isCorrect', e.target.checked)} className="w-4 h-4 accent-yellow-500 rounded" /> صحيح
                    </label>
                    {formData.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(idx)} className="text-red-400 hover:text-red-300 transition"><Icons.X className="h-4 w-4" /></button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={addOption} className="text-sm text-yellow-500 hover:text-yellow-400 transition flex items-center gap-1"><Icons.Plus className="h-4 w-4" /> إضافة خيار</button>
                {errors.options && <p className="text-red-400 text-xs mt-1">{errors.options}</p>}
              </div>
            </div>
          )}

          {/* صح/خطأ */}
          {formData.type === 'true_false' && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>الإجابة الصحيحة</label>
              <div className="flex gap-4">
                {['true', 'false'].map(val => (
                  <label key={val} className={`flex items-center gap-2 cursor-pointer ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                    <input type="radio" name="correct_answer" value={val} checked={formData.correct_answer === val} onChange={handleChange} className="w-4 h-4 accent-yellow-500" />
                    <span>{val === 'true' ? 'صح' : 'خطأ'}</span>
                  </label>
                ))}
              </div>
              {errors.correct_answer && <p className="text-red-400 text-xs mt-1">{errors.correct_answer}</p>}
            </div>
          )}

          {/* ✅ إكمال من كلمات معطاة – واجهة جديدة */}
          {formData.type === 'fill_from_words' && (
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  صندوق الكلمات (Word Bank) <span className="text-red-400">*</span>
                </label>
                <div className="space-y-2">
                  {formData.word_bank.map((word, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} w-6`}>{idx + 1}.</span>
                      <input
                        type="text"
                        value={word}
                        onChange={(e) => updateWord(idx, e.target.value)}
                        placeholder={`كلمة ${idx + 1}`}
                        className={`flex-1 p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                          isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                        }`}
                      />
                      {formData.word_bank.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeWord(idx)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <Icons.X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addWord}
                    className="text-sm text-yellow-500 hover:text-yellow-400 transition flex items-center gap-1"
                  >
                    <Icons.Plus className="h-4 w-4" /> إضافة كلمة
                  </button>
                  {errors.word_bank && <p className="text-red-400 text-xs mt-1">{errors.word_bank}</p>}
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  الإجابات الصحيحة <span className="text-red-400">*</span>
                  <span className={`text-xs mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    (لكل فراغ إجابة من صندوق الكلمات)
                  </span>
                </label>
                <div className="space-y-2">
                  {formData.correct_answers.map((ans, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} w-6`}>#{idx + 1}</span>
                      <select
                        value={ans}
                        onChange={(e) => updateCorrectAnswer(idx, e.target.value)}
                        className={`flex-1 p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                          isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                        }`}
                      >
                        <option value="">اختر كلمة...</option>
                        {formData.word_bank.map((word, i) => (
                          <option key={i} value={word}>{word}</option>
                        ))}
                      </select>
                      {formData.correct_answers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeCorrectAnswer(idx)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <Icons.X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addCorrectAnswer}
                    className="text-sm text-yellow-500 hover:text-yellow-400 transition flex items-center gap-1"
                  >
                    <Icons.Plus className="h-4 w-4" /> إضافة فراغ
                  </button>
                  {errors.correct_answers && <p className="text-red-400 text-xs mt-1">{errors.correct_answers}</p>}
                </div>
              </div>
            </div>
          )}

          {/* ✅ واجهة ترتيب الجملة (محسّنة) */}
          {isSentenceReorder && (
            <div className="space-y-4">
              {/* 1. الكلمات المبعثرة */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  الكلمات المبعثرة <span className="text-red-400">*</span>
                  <span className={`text-xs mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    (أدخل الكلمات بالترتيب العشوائي الذي سيظهر للطالب)
                  </span>
                </label>
                <div className="flex flex-wrap gap-2 items-center">
                  {formData.word_bank.map((word, idx) => (
                    <div key={idx} className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1 border border-white/10">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{idx + 1}.</span>
                      <input
                        type="text"
                        value={word}
                        onChange={(e) => updateWord(idx, e.target.value)}
                        placeholder={`كلمة ${idx + 1}`}
                        className={`w-24 p-1 text-sm bg-transparent border-b-2 focus:outline-none ${isDark ? 'border-white/20 text-white' : 'border-gray-400 text-gray-900'}`}
                      />
                      {formData.word_bank.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeWord(idx)}
                          className="text-red-400 hover:text-red-300 transition"
                        >
                          <Icons.X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addWord}
                    className="text-sm text-yellow-500 hover:text-yellow-400 transition flex items-center gap-1"
                  >
                    <Icons.Plus className="h-4 w-4" /> إضافة كلمة
                  </button>
                </div>
                {errors.word_bank && <p className="text-red-400 text-xs mt-1">{errors.word_bank}</p>}
              </div>

              {/* 2. نماذج الإجابات الصحيحة */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  نماذج الإجابات الصحيحة <span className="text-red-400">*</span>
                  <span className={`text-xs mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    (أضف نموذجاً واحداً أو أكثر. كل نموذج هو ترتيب صحيح للكلمات)
                  </span>
                </label>
                <p className={`text-xs mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  رتب الكلمات بالترتيب الصحيح لتكوين الجملة.
                </p>
                {formData.correct_answers.map((model, modelIdx) => (
                  <div key={modelIdx} className="mb-3 p-3 rounded-xl border border-white/10 bg-white/5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-yellow-400">نموذج {modelIdx + 1}</span>
                      {formData.correct_answers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeSentenceModel(modelIdx)}
                          className="text-red-400 text-xs hover:text-red-300 transition"
                        >
                          حذف النموذج
                        </button>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {model.map((word, wordIdx) => (
                        <div key={wordIdx} className="flex items-center gap-1">
                          <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{wordIdx + 1}.</span>
                          <input
                            type="text"
                            value={word}
                            onChange={(e) => updateSentenceModelWord(modelIdx, wordIdx, e.target.value)}
                            placeholder={`كلمة ${wordIdx + 1}`}
                            className={`w-24 p-1 text-sm bg-transparent border-b-2 focus:outline-none ${isDark ? 'border-white/20 text-white' : 'border-gray-400 text-gray-900'}`}
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={() => addWordToSentenceModel(modelIdx)}
                        className="text-xs text-green-400 hover:text-green-300 transition px-2 py-1 rounded border border-green-400/30"
                      >
                        + إضافة كلمة
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addSentenceModel}
                  className="text-sm text-yellow-500 hover:text-yellow-400 transition flex items-center gap-1 mt-2"
                >
                  <Icons.Plus className="h-4 w-4" /> إضافة نموذج آخر
                </button>
                {errors.correct_answers && <p className="text-red-400 text-xs mt-1">{errors.correct_answers}</p>}
              </div>
            </div>
          )}

          {/* نماذج الإجابات المتعددة (لـ fill_blank فقط) */}
          {formData.type === 'fill_blank' && (
            <div>
              <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                نماذج الإجابات الصحيحة <span className="text-red-400">*</span>
                <span className={`text-xs mr-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>(أدخل نموذجاً واحداً أو أكثر)</span>
              </label>
              <div className="space-y-2">
                {Array.isArray(formData.correct_answer) ? (
                  formData.correct_answer.map((ans, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} w-6`}>{idx + 1}.</span>
                      <input
                        type="text"
                        value={ans}
                        onChange={(e) => updateCorrectAnswerOld(idx, e.target.value)}
                        placeholder={`نموذج الإجابة ${idx + 1}`}
                        className={`flex-1 p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                          isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                        }`}
                      />
                      {formData.correct_answer.length > 1 && (
                        <button type="button" onClick={() => removeCorrectAnswerOld(idx)} className="text-red-400 hover:text-red-300 transition"><Icons.X className="h-4 w-4" /></button>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={formData.correct_answer}
                      onChange={(e) => setFormData(prev => ({ ...prev, correct_answer: [e.target.value] }))}
                      placeholder="نموذج الإجابة"
                      className={`flex-1 p-2 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                        isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                )}
                <button type="button" onClick={addCorrectAnswerOld} className="text-sm text-yellow-500 hover:text-yellow-400 transition flex items-center gap-1"><Icons.Plus className="h-4 w-4" /> إضافة نموذج آخر</button>
                {errors.correct_answer && <p className="text-red-400 text-xs mt-1">{errors.correct_answer}</p>}
              </div>
            </div>
          )}

          {/* خيارات متقدمة (لغير القطع) */}
          {!isPassage && (
            <>
              <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'} pt-4 grid grid-cols-1 md:grid-cols-2 gap-4`}>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>مستوى الصعوبة</label>
                  <select name="difficulty" value={formData.difficulty} onChange={handleChange} className={`w-full p-2.5 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition ${
                    isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                  }`}>
                    {DIFFICULTY_LEVELS.map(level => <option key={level.value} value={level.value}>{level.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>التصنيف (اختياري)</label>
                  <input type="text" name="category" value={formData.category || ''} onChange={handleChange} placeholder="مثال: فصل 1" className={`w-full p-2.5 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition ${
                    isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                  }`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>الوقت المقترح (ثانية)</label>
                  <input type="number" name="time_limit" value={formData.time_limit} onChange={handleChange} min="5" className={`w-full p-2.5 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition ${
                    isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                  }`} />
                </div>
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>حد الكلمات (للمقالي)</label>
                  <input type="number" name="word_limit" value={formData.word_limit} onChange={handleChange} min="0" placeholder="0 = غير محدود" className={`w-full p-2.5 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition ${
                    isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                  }`} />
                </div>
              </div>

              {/* إعدادات التصحيح الذكي */}
              <div className={`border-t ${isDark ? 'border-white/10' : 'border-gray-200'} pt-4 grid grid-cols-1 md:grid-cols-3 gap-4`}>
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input type="checkbox" name="case_sensitive" checked={formData.case_sensitive} onChange={handleChange} className="w-4 h-4 accent-yellow-500 rounded" />
                  حساسية حالة الأحرف
                </label>
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input type="checkbox" name="ignore_extra_spaces" checked={formData.ignore_extra_spaces} onChange={handleChange} className="w-4 h-4 accent-yellow-500 rounded" />
                  تجاهل المسافات الزائدة
                </label>
                <label className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  <input type="checkbox" name="partial_marking" checked={formData.partial_marking} onChange={handleChange} className="w-4 h-4 accent-yellow-500 rounded" />
                  تصحيح جزئي (نصف درجة)
                </label>
              </div>

              {/* شرح وتلميح */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>شرح (اختياري)</label>
                <textarea name="explanation" value={formData.explanation || ''} onChange={handleChange} rows="2" placeholder="شرح إضافي..." className={`w-full p-3 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition resize-none ${
                  isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                }`} />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>تلميح (اختياري)</label>
                <input type="text" name="hint" value={formData.hint || ''} onChange={handleChange} placeholder="تلميح..." className={`w-full p-2.5 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition ${
                  isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                }`} />
              </div>

              {/* الدرجة */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>الدرجة <span className="text-red-400">*</span></label>
                <input type="number" name="marks" value={formData.marks} onChange={handleChange} min="1" className={`w-full p-3 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition ${
                  isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                }`} />
                {errors.marks && <p className="text-red-400 text-xs mt-1">{errors.marks}</p>}
              </div>
            </>
          )}

          {showPreview && <QuestionPreview question={{ ...formData, order_index: 0 }} />}

          <div className="flex gap-3 pt-4 border-t border-white/5">
            <button type="submit" disabled={submitting} className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-500/30 disabled:opacity-70 flex items-center justify-center gap-2">
              {submitting ? <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" /> جاري الحفظ...</> : <><Icons.Save className="h-5 w-5" /> {isEdit ? 'تحديث السؤال' : 'إضافة السؤال'}</>}
            </button>
            <button type="button" onClick={onClose} className={`px-6 py-3 rounded-xl transition ${
              isDark ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
            }`}>إلغاء</button>
          </div>
        </form>
      </motion.div>

      {/* نافذة معاينة القطعة المنبثقة */}
      <AnimatePresence>
        {showPassagePreview && previewPassageId && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] px-4"
            onClick={() => setShowPassagePreview(false)}
          >
            <motion.div
              className={`rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto ${
                isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300'
              } shadow-2xl`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-4">
                <h4 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Icons.BookOpen className="h-5 w-5 text-indigo-400" />
                  معاينة القطعة
                </h4>
                <button onClick={() => setShowPassagePreview(false)} className="p-1 rounded-lg hover:bg-red-500/20 transition">
                  <Icons.X className="h-6 w-6 text-red-400" />
                </button>
              </div>
              <div className={`p-4 rounded-xl ${isDark ? 'bg-black/30 border border-white/10' : 'bg-gray-100 border border-gray-200'}`}>
                <p className={`whitespace-pre-wrap text-sm ${isDark ? 'text-gray-200' : 'text-gray-800'}`} dir="ltr" style={{ textAlign: 'left' }}>
                  {getSelectedPassageText() || 'لا يوجد نص'}
                </p>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowPassagePreview(false)}
                  className={`px-4 py-2 rounded-xl transition ${
                    isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  إغلاق
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================
// 8. مكون بطاقة السؤال (مع عرض خاص للقطعة)
// ============================================================
const QuestionItem = ({ 
  question, 
  index, 
  onEdit, 
  onDelete, 
  onMoveUp, 
  onMoveDown, 
  onDuplicate, 
  onSelect, 
  selected,
  totalQuestions,
  onAddSubQuestion,
}) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const type = question.type || 'multiple_choice';
  const typeInfo = QUESTION_TYPES[type] || QUESTION_TYPES.multiple_choice;
  const TypeIcon = typeInfo.icon;
  const isPassage = type === 'passage';
  const difficulty = DIFFICULTY_LEVELS.find(d => d.value === question.difficulty);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      whileHover={{ y: -2 }}
      className={`rounded-xl p-4 transition-all duration-300 group ${
        selected ? 'ring-2 ring-yellow-400' : ''
      } ${isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300 shadow-sm'}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <input type="checkbox" checked={selected} onChange={() => onSelect(question.id)} className="w-4 h-4 accent-yellow-500 rounded" />
            <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>#{index + 1}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ backgroundColor: typeInfo.bg, color: typeInfo.color, border: `1px solid ${typeInfo.color}` }}>
              <TypeIcon className="h-3 w-3 inline ml-1" /> {typeInfo.label}
            </span>
            {!isPassage && (
              <span className="text-xs text-yellow-400 font-bold">{question.marks || 0} درجة</span>
            )}
            {!isPassage && question.correct_answer && (
              <span className="text-xs text-green-400">✅ {Array.isArray(question.correct_answer) ? question.correct_answer.join(' / ') : question.correct_answer}</span>
            )}
            {difficulty && <span className="text-xs" style={{ color: difficulty.color }}>{difficulty.label}</span>}
            {question.category && <span className={`text-xs ${isDark ? 'text-gray-400 bg-white/10' : 'text-gray-600 bg-gray-100'} px-2 py-0.5 rounded-full`}>{question.category}</span>}
            {question.bank_question_id && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-600/30 text-purple-300 border border-purple-600 flex items-center gap-1">
                <Icons.Database className="h-3 w-3" /> مستورد
              </span>
            )}
            {question.passage_id && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-600/30 text-indigo-300 border border-indigo-600 flex items-center gap-1">
                <Icons.BookOpen className="h-3 w-3" /> قطعة
              </span>
            )}
            {isPassage && (
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-600/30 text-indigo-300 border border-indigo-600 flex items-center gap-1">
                <Icons.BookOpen className="h-3 w-3" /> قطعة رئيسية
              </span>
            )}
            {isPassage && (
              <span className="text-xs text-gray-400">(نص فقط - غير محسوب في الأسئلة)</span>
            )}
          </div>

          {isPassage ? (
            <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/30 mt-1">
              <div className="flex items-center gap-2">
                <Icons.BookOpen className="h-5 w-5 text-indigo-400" />
                <span className="text-sm font-bold text-indigo-400">📄 قطعة نصية</span>
                <span className="text-xs text-gray-400">(بدون درجة)</span>
              </div>
              <p
                className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}
                dir="ltr"
                style={{ textAlign: 'left' }}
              >
                {question.question_text || 'لا يوجد نص'}
              </p>
              <button
                onClick={() => onAddSubQuestion(question.id)}
                className="mt-2 text-xs text-yellow-400 hover:text-yellow-300 transition flex items-center gap-1"
              >
                <Icons.Plus className="h-3 w-3" /> إضافة سؤال تابع
              </button>
            </div>
          ) : (
            <p
              className={`text-sm mt-1 line-clamp-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
              dir="ltr"
              style={{ textAlign: 'left' }}
            >
              {question.question_text}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0 mr-4">
          <button onClick={() => onMoveUp(index)} disabled={index === 0} className={`p-1.5 rounded-lg transition ${
            index === 0 ? 'opacity-30 cursor-not-allowed' : `${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`
          }`}>
            <Icons.ChevronUp className="h-4 w-4" />
          </button>
          <button onClick={() => onMoveDown(index)} disabled={index === totalQuestions - 1} className={`p-1.5 rounded-lg transition ${
            index === totalQuestions - 1 ? 'opacity-30 cursor-not-allowed' : `${isDark ? 'hover:bg-white/10 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`
          }`}>
            <Icons.ChevronDown className="h-4 w-4" />
          </button>
          <button onClick={() => onDuplicate(question)} className="p-1.5 rounded-lg transition text-cyan-400 hover:bg-cyan-500/20"><Icons.Copy className="h-4 w-4" /></button>
          <button onClick={() => onEdit(question)} className="p-1.5 rounded-lg transition text-yellow-400 hover:bg-yellow-500/20"><Icons.Edit className="h-4 w-4" /></button>
          <button onClick={() => onDelete(question.id)} className="p-1.5 rounded-lg transition text-red-400 hover:bg-red-500/20"><Icons.Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// 9. الصفحة الرئيسية – إدارة الأسئلة (تم إزالة essay من الإحصائيات والفلاتر)
// ============================================================
const ExamQuestionsContent = () => {
  const router = useRouter();
  const params = useParams();
  const examId = params.id;
  const { theme, language = 'ar' } = useTheme();
  const isDark = theme === 'dark';

  const {
    questions,
    passages,
    loading,
    error,
    fetchQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    moveQuestion,
    duplicateQuestion,
    randomizeOrder,
    bulkUpdate,
  } = useQuestions(examId);

  const [exam, setExam] = useState(null);
  const [passingMarks, setPassingMarks] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [preselectedPassageId, setPreselectedPassageId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isBankOpen, setIsBankOpen] = useState(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [filterSource, setFilterSource] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [filterPassage, setFilterPassage] = useState('all');

  const [stats, setStats] = useState({
    total: 0,
    multipleChoice: 0,
    trueFalse: 0,
    fillBlank: 0,
    fillFromWords: 0,
    sentenceReorder: 0,
    passage: 0,
    totalMarks: 0,
    avgMarks: 0,
    difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
    categories: {},
    bankQuestions: 0,
    customQuestions: 0,
    passageQuestions: 0,
  });

  const fetchExam = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      if (error) throw error;
      if (data.teacher_id !== user.id) {
        toast.error('غير مصرح لك');
        router.push('/dashboard/teacher/exams');
        return;
      }
      setExam(data);
      setPassingMarks(data.passing_marks || 0);
    } catch (err) {
      toast.error('فشل جلب بيانات الامتحان');
    }
  }, [examId, router]);

  // دالة تحديث درجة النجاح في قاعدة البيانات
  const handlePassingMarksChange = async () => {
    const newPassing = Number(passingMarks);
    if (isNaN(newPassing) || newPassing < 0) {
      toast.error('يرجى إدخال قيمة صحيحة');
      return;
    }
    try {
      const { error } = await supabase
        .from('exams')
        .update({ passing_marks: newPassing, updated_at: new Date().toISOString() })
        .eq('id', examId);
      if (error) throw error;
      toast.success('تم تحديث درجة النجاح');
    } catch (err) {
      toast.error('فشل تحديث درجة النجاح');
    }
  };

  useEffect(() => {
    if (questions.length > 0) {
      const qs = questions;
      const realQs = qs.filter(q => q.type !== 'passage');
      const totalMarks = realQs.reduce((sum, q) => sum + (q.marks || 0), 0);
      const diffDist = { easy: 0, medium: 0, hard: 0 };
      const categories = {};
      let mcq = 0, tf = 0, fb = 0, ffw = 0, sr = 0, bank = 0, custom = 0;
      realQs.forEach(q => {
        const type = q.type || '';
        if (type === 'multiple_choice') mcq++;
        else if (type === 'true_false') tf++;
        else if (type === 'fill_blank') fb++;
        else if (type === 'fill_from_words') ffw++;
        else if (type === 'sentence_reorder') sr++;
        if (q.difficulty) diffDist[q.difficulty] = (diffDist[q.difficulty] || 0) + 1;
        if (q.category) categories[q.category] = (categories[q.category] || 0) + 1;
        if (q.bank_question_id) bank++;
        else custom++;
      });
      const passageCount = qs.filter(q => q.type === 'passage').length;
      setStats({
        total: realQs.length,
        multipleChoice: mcq,
        trueFalse: tf,
        fillBlank: fb,
        fillFromWords: ffw,
        sentenceReorder: sr,
        passage: passageCount,
        totalMarks,
        avgMarks: realQs.length ? (totalMarks / realQs.length) : 0,
        difficultyDistribution: diffDist,
        categories,
        bankQuestions: bank,
        customQuestions: custom,
      });
    } else {
      setStats({
        total: 0,
        multipleChoice: 0,
        trueFalse: 0,
        fillBlank: 0,
        fillFromWords: 0,
        sentenceReorder: 0,
        passage: 0,
        totalMarks: 0,
        avgMarks: 0,
        difficultyDistribution: { easy: 0, medium: 0, hard: 0 },
        categories: {},
        bankQuestions: 0,
        customQuestions: 0,
      });
    }
  }, [questions]);

  useEffect(() => {
    if (examId) {
      fetchExam();
      fetchQuestions();
    }
  }, [examId, fetchExam, fetchQuestions]);

  const filteredQuestions = useMemo(() => {
    let result = questions;
    if (filterSource === 'bank') {
      result = result.filter(q => q.bank_question_id);
    } else if (filterSource === 'custom') {
      result = result.filter(q => !q.bank_question_id);
    }
    if (filterType !== 'all') {
      result = result.filter(q => q.type === filterType);
    }
    if (filterPassage !== 'all') {
      if (filterPassage === 'with_passage') {
        result = result.filter(q => q.passage_id);
      } else if (filterPassage === 'without_passage') {
        result = result.filter(q => !q.passage_id);
      }
    }
    return result;
  }, [questions, filterSource, filterType, filterPassage]);

  const handleAddQuestion = () => {
    setEditingQuestion(null);
    setPreselectedPassageId(null);
    setIsModalOpen(true);
  };

  const handleEditQuestion = (question) => {
    setEditingQuestion(question);
    setPreselectedPassageId(null);
    setIsModalOpen(true);
  };

  const handleAddSubQuestion = (passageId) => {
    setEditingQuestion(null);
    setPreselectedPassageId(passageId);
    setIsModalOpen(true);
  };

  const handleDeleteQuestion = (id) => {
    const q = questions.find(q => q.id === id);
    if (q) { setDeleteTarget(q); setIsDeleteModalOpen(true); }
  };
  const confirmDelete = async () => {
    if (!deleteTarget) return;
    await deleteQuestion(deleteTarget.id);
    setIsDeleteModalOpen(false);
    setDeleteTarget(null);
  };
  const handleSubmitQuestion = async (data) => {
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, data);
      } else {
        await addQuestion(data);
      }
      setIsModalOpen(false);
      setEditingQuestion(null);
      setPreselectedPassageId(null);
    } catch (err) { throw err; }
  };
  const handleDuplicate = async (question) => { await duplicateQuestion(question); };
  const handleSelectQuestion = (id) => setSelectedQuestions(prev => prev.includes(id) ? prev.filter(q => q !== id) : [...prev, id]);
  
  const handleSelectAll = () => {
    const realQuestions = questions.filter(q => q.type !== 'passage');
    const allIds = realQuestions.map(q => q.id);
    if (selectedQuestions.length === stats.total) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(allIds);
    }
  };

  const handleBulkUpdate = async (ids, updates) => { await bulkUpdate(ids, updates); setSelectedQuestions([]); };

  const syncWithBank = async () => {
    toast.info('مزامنة البنك قيد التطوير');
  };

  const goBack = () => router.push(`/dashboard/teacher/exams/${examId}`);
  const goToResults = () => router.push(`/dashboard/teacher/exams/${examId}/results`);

  const statsData = [
    { id: 1, label: 'إجمالي الأسئلة', value: stats.total, icon: Icons.HelpCircle, color: 'from-blue-500 to-blue-700', delay: 0 },
    { id: 2, label: 'اختيار من متعدد', value: stats.multipleChoice, icon: Icons.ListChecks, color: 'from-green-500 to-green-700', delay: 0.1 },
    { id: 3, label: 'صح / خطأ', value: stats.trueFalse, icon: Icons.CheckSquare, color: 'from-yellow-500 to-yellow-700', delay: 0.2 },
    { id: 4, label: 'ملء الفراغ', value: stats.fillBlank, icon: Icons.SquarePen, color: 'from-cyan-500 to-cyan-700', delay: 0.3 },
    { id: 5, label: 'إكمال من كلمات', value: stats.fillFromWords, icon: Icons.Layers, color: 'from-amber-500 to-amber-700', delay: 0.4 },
    { id: 6, label: 'ترتيب الجملة', value: stats.sentenceReorder, icon: Icons.AlignJustify, color: 'from-orange-500 to-orange-700', delay: 0.5 },
    { id: 7, label: 'قطع نصية', value: stats.passage, icon: Icons.BookOpen, color: 'from-indigo-500 to-indigo-700', delay: 0.6 },
    { id: 8, label: 'من البنوك', value: stats.bankQuestions, icon: Icons.Database, color: 'from-purple-500 to-purple-700', delay: 0.7 },
  ];

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-20"><div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" /></div>
      </TeacherLayout>
    );
  }

  if (!exam) {
    return (
      <TeacherLayout>
        <div className="text-center py-20"><Icons.AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" /><p className="text-red-400 text-lg">الامتحان غير موجود</p><button onClick={goBack} className="text-yellow-400 hover:underline mt-2">العودة</button></div>
      </TeacherLayout>
    );
  }

  const difficultyChartData = {
    labels: ['سهل', 'متوسط', 'صعب'],
    datasets: [{ label: 'عدد الأسئلة', data: [stats.difficultyDistribution.easy || 0, stats.difficultyDistribution.medium || 0, stats.difficultyDistribution.hard || 0], backgroundColor: ['#22c55e', '#f59e0b', '#ef4444'], borderColor: ['#16a34a', '#d97706', '#dc2626'], borderWidth: 2 }],
  };
  const typeChartData = {
    labels: ['اختيار متعدد', 'صح/خطأ', 'ملء فراغ', 'إكمال كلمات', 'ترتيب جملة', 'قطعة'],
    datasets: [{ label: 'عدد الأسئلة', data: [stats.multipleChoice, stats.trueFalse, stats.fillBlank, stats.fillFromWords, stats.sentenceReorder, stats.passage], backgroundColor: ['#3b82f6', '#22c55e', '#06b6d4', '#f59e0b', '#f97316', '#6366f1'], borderColor: ['#2563eb', '#16a34a', '#0891b2', '#d97706', '#ea580c', '#4f46e5'], borderWidth: 2 }],
  };
  const sourceChartData = {
    labels: ['من البنوك', 'مخصص'],
    datasets: [{ data: [stats.bankQuestions, stats.customQuestions], backgroundColor: ['#a855f7', '#6b7280'], borderColor: ['#9333ea', '#4b5563'], borderWidth: 2 }],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: isDark ? '#e5e7eb' : '#1f2937', font: { weight: 'bold' } }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: isDark ? '#d1d5db' : '#374151' }
      },
      x: {
        ticks: { color: isDark ? '#d1d5db' : '#374151' }
      }
    }
  };

  return (
    <TeacherLayout>
      <div className="relative min-h-screen">
        <ParticleBackground />
        <div className="relative z-10 px-4 py-6">
          {/* رأس الصفحة */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>📝 إدارة أسئلة الامتحان</h1>
              <p className={`text-sm mt-1 flex items-center gap-2 flex-wrap ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <span>{exam.title}</span>
                <span className="text-yellow-400">({stats.total} سؤال)</span>
                {exam.course_id && <Link href={`/dashboard/teacher/courses/${exam.course_id}`} className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1"><Icons.Book className="h-3 w-3" /> عرض الكورس</Link>}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              <button onClick={() => setIsBankOpen(true)} className="px-4 py-2 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-cyan-600"><Icons.BookOpen className="h-4 w-4" /> بنك الأسئلة</button>
              <button onClick={() => setIsImportExportOpen(true)} className="px-4 py-2 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-indigo-600"><Icons.Upload className="h-4 w-4" /> استيراد/تصدير</button>
              <button onClick={randomizeOrder} className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-purple-600"><Icons.Shuffle className="h-4 w-4" /> ترتيب عشوائي</button>
              <button onClick={syncWithBank} className="px-4 py-2 bg-teal-600/30 hover:bg-teal-600/50 text-teal-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-teal-600"><Icons.RefreshCw className="h-4 w-4" /> مزامنة مع البنك</button>
              {selectedQuestions.length > 0 && <button onClick={() => setIsBulkEditOpen(true)} className="px-4 py-2 bg-orange-600/30 hover:bg-orange-600/50 text-orange-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-orange-600"><Icons.Edit className="h-4 w-4" /> تحرير جماعي ({selectedQuestions.length})</button>}
              <button onClick={goToResults} className="px-4 py-2 bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 border border-purple-600"><Icons.BarChart className="h-4 w-4" /> النتائج</button>
              <button onClick={goBack} className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${isDark ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'}`}><Icons.ArrowRight className="h-4 w-4" /> العودة</button>
            </div>
          </div>

          {/* الإحصائيات */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
            {statsData.map((stat) => <StatCard key={stat.id} stat={stat} />)}
          </div>

          {/* صندوق الدرجة الكلية ودرجة النجاح */}
          <div className={`flex flex-wrap items-center gap-4 mb-6 p-4 rounded-2xl ${isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300 shadow-sm'}`}>
            <div className="flex items-center gap-2">
              <Icons.Star className="h-5 w-5 text-yellow-400" />
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {language === 'ar' ? 'الدرجة الكلية:' : 'Total Marks:'}
              </span>
              <span className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {stats.totalMarks || 0}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Icons.Target className="h-5 w-5 text-green-400" />
              <span className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {language === 'ar' ? 'درجة النجاح:' : 'Passing Marks:'}
              </span>
              <input
                type="number"
                value={passingMarks}
                onChange={(e) => setPassingMarks(e.target.value)}
                onBlur={handlePassingMarksChange}
                min="0"
                max={stats.totalMarks}
                className={`w-24 px-3 py-1.5 rounded-lg border focus:ring-2 focus:ring-yellow-400 outline-none transition text-sm ${
                  isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'
                }`}
              />
              <button
                onClick={handlePassingMarksChange}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  isDark ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30' : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                }`}
              >
                {language === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
            <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {language === 'ar' ? '(يمكنك تعديل درجة النجاح مباشرة)' : '(You can edit passing marks here)'}
            </div>
          </div>

          {/* الرسوم البيانية */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className={`rounded-2xl p-5 ${isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300 shadow-sm'}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}><Icons.ChartBar className="h-5 w-5 text-yellow-400" /> توزيع مستويات الصعوبة</h3>
              <div className="h-40"><Bar data={difficultyChartData} options={chartOptions} /></div>
            </div>
            <div className={`rounded-2xl p-5 ${isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300 shadow-sm'}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}><Icons.PieChart className="h-5 w-5 text-yellow-400" /> توزيع أنواع الأسئلة</h3>
              <div className="h-40"><Bar data={typeChartData} options={chartOptions} /></div>
            </div>
            <div className={`rounded-2xl p-5 ${isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300 shadow-sm'}`}>
              <h3 className={`text-lg font-bold flex items-center gap-2 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}><Icons.PieChart className="h-5 w-5 text-purple-400" /> مصدر الأسئلة</h3>
              <div className="h-40 max-w-xs mx-auto">
                <Doughnut data={sourceChartData} options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: isDark ? '#e5e7eb' : '#1f2937', font: { weight: 'bold' } }
                    }
                  }
                }} />
              </div>
            </div>
          </div>

          {/* قائمة الأسئلة مع الفلاتر */}
          <div className={`rounded-2xl p-5 transition-all duration-500 ${isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300 shadow-sm'}`}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Icons.List className="h-5 w-5 text-yellow-400" /> الأسئلة
                  <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>({stats.total} سؤال)</span>
                </h3>
                {stats.total > 0 && (
                  <button onClick={handleSelectAll} className="text-xs text-yellow-400 hover:underline transition">
                    {selectedQuestions.length === stats.total ? 'إلغاء الكل' : 'تحديد الكل'}
                  </button>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={filterSource} onChange={(e) => setFilterSource(e.target.value)} className={`p-2 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                  isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                }`}>
                  <option value="all">جميع المصادر</option>
                  <option value="bank">من البنوك</option>
                  <option value="custom">مخصص</option>
                </select>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={`p-2 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                  isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                }`}>
                  <option value="all">جميع الأنواع</option>
                  {Object.entries(QUESTION_TYPES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
                </select>
                <select value={filterPassage} onChange={(e) => setFilterPassage(e.target.value)} className={`p-2 rounded-xl focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                  isDark ? 'bg-[#0b0e1a] border border-white/20 text-white' : 'bg-white border border-gray-300 text-gray-900'
                }`}>
                  <option value="all">جميع الأسئلة</option>
                  <option value="with_passage">مرتبطة بقطعة</option>
                  <option value="without_passage">غير مرتبطة بقطعة</option>
                </select>
                <button onClick={handleAddQuestion} className="px-4 py-2 bg-yellow-500/30 hover:bg-yellow-500/50 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-1 border border-yellow-500"><Icons.Plus className="h-4 w-4" /> إضافة سؤال</button>
              </div>
            </div>

            {filteredQuestions.length === 0 ? (
              <div className="text-center py-12"><Icons.HelpCircle className="h-16 w-16 text-gray-500 mx-auto mb-4" /><p className={isDark ? 'text-gray-400' : 'text-gray-600'}>لا توجد أسئلة تطابق التصفية</p></div>
            ) : (
              <div className="space-y-2">
                {filteredQuestions.map((question, index) => (
                  <QuestionItem
                    key={question.id}
                    question={question}
                    index={index}
                    totalQuestions={filteredQuestions.length}
                    onEdit={handleEditQuestion}
                    onDelete={handleDeleteQuestion}
                    onMoveUp={() => moveQuestion(index, -1)}
                    onMoveDown={() => moveQuestion(index, 1)}
                    onDuplicate={handleDuplicate}
                    onSelect={handleSelectQuestion}
                    selected={selectedQuestions.includes(question.id)}
                    onAddSubQuestion={handleAddSubQuestion}
                  />
                ))}
              </div>
            )}
          </div>

          {/* روابط سريعة */}
          <div className={`rounded-2xl p-4 mt-6 ${isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300 shadow-sm'}`}>
            <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}><Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة</h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/teacher" className={`text-xs px-3 py-1.5 rounded-lg transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>الرئيسية</Link>
              <Link href="/dashboard/teacher/courses" className={`text-xs px-3 py-1.5 rounded-lg transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>الكورسات</Link>
              <Link href="/dashboard/teacher/exams" className={`text-xs px-3 py-1.5 rounded-lg transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>الامتحانات</Link>
              <Link href="/dashboard/teacher/students" className={`text-xs px-3 py-1.5 rounded-lg transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>الطلاب</Link>
              <Link href="/dashboard/teacher/question-bank" className={`text-xs px-3 py-1.5 rounded-lg transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-gray-300' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>بنوك الأسئلة</Link>
            </div>
          </div>
        </div>
      </div>

      {/* النوافذ المنبثقة */}
      <AnimatePresence>
        {isModalOpen && (
          <QuestionFormModal
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingQuestion(null);
              setPreselectedPassageId(null);
            }}
            onSubmit={handleSubmitQuestion}
            question={editingQuestion}
            examId={examId}
            totalQuestions={questions.length}
            existingPassages={passages}
            preselectedPassageId={preselectedPassageId}
          />
        )}
        {isDeleteModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
            <div className={`rounded-2xl p-6 max-w-md w-full ${isDark ? 'bg-[#1a1f2e] border border-white/20' : 'bg-white border border-gray-300'}`}>
              <h3 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>تأكيد الحذف</h3>
              <p className={isDark ? 'text-gray-300' : 'text-gray-700'}>هل أنت متأكد من حذف هذا السؤال؟</p>
              <div className="flex gap-3 mt-6">
                <button onClick={confirmDelete} className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition">حذف</button>
                <button onClick={() => setIsDeleteModalOpen(false)} className={`flex-1 py-2 rounded-xl transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}>إلغاء</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </TeacherLayout>
  );
};

export default function ExamQuestionsPage() {
  return <ExamQuestionsContent />;
}