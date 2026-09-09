// ============================================================
// app/dashboard/assistant/exams/[id]/edit/page.js
// تعديل الامتحان – نسخة المساعد (بدون حذف)
// ✅ استخدام AssistantLayout مع صلاحيات مخزنة في sessionStorage
// ✅ إزالة total_marks من النموذج – تُعرض من البيانات المخزنة فقط
// ✅ تعديل التحقق ليشمل passing_marks فقط
// ✅ دعم البنوك وإعادة الاستيراد
// ✅ معاينة جانبية محدثة
// ✅ توافق كامل مع الثيم المركزي
// ✅ منع صلاحية الحذف (غير موجودة في هذه الصفحة)
// ============================================================

'use client';
import React from 'react';
import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import QuestionBankSelector from '@/components/QuestionBankSelector';
import { useTheme } from '@/lib/hooks/useTheme';
import { hasPermission } from '@/lib/permissions';

// ============================================================
// 1. خلفية الجسيمات (أنيقة)
// ============================================================

const ParticleBackground = () => {
  const canvasRef = useRef(null);

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

    for (let i = 0; i < 40; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.2 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.04 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(draw);
    };
    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ============================================================
// 2. عداد متحرك
// ============================================================

const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
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
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="font-extrabold">
      {count}{suffix}
    </span>
  );
};

// ============================================================
// 3. دوال مساعدة
// ============================================================

const formatDate = (date) => {
  if (!date) return 'غير محدد';
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================
// 4. مكون المعاينة الجانبية (Live Preview)
// ============================================================

const ExamPreview = ({ formData, exam, sourceBank, bankQuestionsCount, theme }) => {
  const status = exam?.is_published ? 'منشور' : 'مسودة';
  const statusColor = exam?.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400';
  const isDark = theme === 'dark';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-sm border rounded-2xl overflow-hidden hover:border-yellow-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10`}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} truncate`}>{formData.title || 'عنوان الامتحان'}</h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor}`}>{status}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>المدة</span>
            <span className={isDark ? 'text-white' : 'text-gray-900'}>{formData.duration_minutes || 0} د</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>الدرجة الكلية</span>
            <span className={isDark ? 'text-white' : 'text-gray-900'}>{exam?.total_marks || 0}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>درجة النجاح</span>
            <span className={isDark ? 'text-white' : 'text-gray-900'}>{formData.passing_marks || 0}</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>الفترة</span>
            <span className={`${isDark ? 'text-white' : 'text-gray-900'} text-xs`}>
              {formData.start_date ? formatDate(formData.start_date) : 'غير محدد'}
              {' → '}
              {formData.end_date ? formatDate(formData.end_date) : 'غير محدد'}
            </span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>المحاولات</span>
            <span className={isDark ? 'text-white' : 'text-gray-900'}>{formData.attempts_allowed || 1}</span>
          </div>

          {sourceBank ? (
            <div className="flex justify-between text-gray-400 pt-2 border-t border-white/5">
              <span>البنك المصدر</span>
              <span className="text-purple-400 text-xs flex items-center gap-1">
                <Icons.Database className="h-3 w-3" />
                {sourceBank.title}
                <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>({bankQuestionsCount || 0} سؤال)</span>
              </span>
            </div>
          ) : (
            <div className="flex justify-between text-gray-400 pt-2 border-t border-white/5">
              <span>مصدر الأسئلة</span>
              <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'} text-xs flex items-center gap-1`}>
                <Icons.Pencil className="h-3 w-3" /> مخصص
              </span>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-white/5 flex flex-wrap gap-2 text-xs">
          {formData.shuffle_questions && (
            <span className={`${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'} px-2 py-1 rounded-full`}>خلط الأسئلة</span>
          )}
          {formData.shuffle_options && (
            <span className={`${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'} px-2 py-1 rounded-full`}>خلط الخيارات</span>
          )}
          {formData.allow_backward && (
            <span className={`${isDark ? 'bg-white/5 text-gray-300' : 'bg-gray-100 text-gray-700'} px-2 py-1 rounded-full`}>رجوع</span>
          )}
          {formData.proctoring && (
            <span className="bg-yellow-400/10 text-yellow-400 px-2 py-1 rounded-full border border-yellow-400/20">مراقبة</span>
          )}
          {formData.password && (
            <span className="bg-blue-400/10 text-blue-400 px-2 py-1 rounded-full border border-blue-400/20">🔒 محمي</span>
          )}
        </div>

        <div className="pt-3 border-t border-white/5">
          <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'} text-center`}>معاينة مباشرة للتحديثات</p>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// 5. الصفحة الرئيسية – تعديل الامتحان (للمساعد)
// ============================================================

export default function AssistantEditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id;

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const styles = {
    bg: isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50',
    text: isDark ? 'text-white' : 'text-gray-900',
    subtext: isDark ? 'text-gray-400' : 'text-gray-600',
    card: isDark ? 'bg-white/5' : 'bg-white/90',
    cardBorder: isDark ? 'border-white/10' : 'border-gray-200',
    input: isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500',
    label: isDark ? 'text-gray-300' : 'text-gray-700',
    hover: isDark ? 'hover:border-yellow-400/50' : 'hover:border-yellow-400/70',
  };

  // ===== بيانات المساعد والصلاحيات =====
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loadingAssistant, setLoadingAssistant] = useState(true);
  const [teacherId, setTeacherId] = useState(null);

  const [exam, setExam] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ===== حالة النموذج – بدون total_marks =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
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
  });

  const [formErrors, setFormErrors] = useState({});

  // ===== ربط ببنوك الأسئلة =====
  const [sourceBank, setSourceBank] = useState(null);
  const [bankQuestionsCount, setBankQuestionsCount] = useState(0);
  const [isReimporting, setIsReimporting] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);

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

        const perms = JSON.parse(sessionStorage.getItem('assistantPermissions') || '[]');
        setPermissions(perms);

        // التحقق من صلاحية التعديل
        if (!hasPermission(perms, 'exams', 'can_edit')) {
          toast.error('ليس لديك صلاحية تعديل الامتحانات');
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

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    if (!teacherId || !examId) return;
    setLoading(true);
    try {
      // 1. جلب الامتحان
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      if (!examData) {
        toast.error('الامتحان غير موجود');
        router.push('/dashboard/assistant/exams');
        return;
      }

      // التحقق من أن الامتحان يخص المعلم نفسه
      if (examData.teacher_id !== teacherId) {
        toast.error('غير مصرح لك بتعديل هذا الامتحان');
        router.push('/dashboard/assistant/exams');
        return;
      }

      setExam(examData);

      // 2. جلب معلومات البنك المصدر (إن وجد)
      let bankInfo = null;
      let bankCount = 0;

      const { data: examQuestions } = await supabase
        .from('exam_questions')
        .select('bank_question_id')
        .eq('exam_id', examId)
        .not('bank_question_id', 'is', null);

      if (examQuestions && examQuestions.length > 0) {
        const bankQuestionIds = examQuestions.map(q => q.bank_question_id).filter(Boolean);
        if (bankQuestionIds.length > 0) {
          const { data: originalQuestions } = await supabase
            .from('questions')
            .select('bank_id')
            .in('id', bankQuestionIds);
          
          const bankIds = [...new Set(originalQuestions?.map(q => q.bank_id).filter(Boolean))];
          if (bankIds.length > 0) {
            const { data: banksData } = await supabase
              .from('question_banks')
              .select('id, title')
              .in('id', bankIds);
            if (banksData && banksData.length > 0) {
              bankInfo = banksData[0];
              bankCount = bankQuestionIds.length;
            }
          }
        }
      }

      setSourceBank(bankInfo);
      setBankQuestionsCount(bankCount);

      // 3. تعيين بيانات النموذج – بدون total_marks
      setFormData({
        title: examData.title || '',
        description: examData.description || '',
        course_id: examData.course_id || '',
        duration_minutes: examData.duration_minutes || 30,
        start_date: examData.start_date || '',
        end_date: examData.end_date || '',
        passing_marks: examData.passing_marks || 50,
        shuffle_questions: examData.shuffle_questions ?? true,
        shuffle_options: examData.shuffle_options ?? true,
        allow_backward: examData.allow_backward ?? false,
        show_results_immediately: examData.show_results_immediately ?? true,
        attempts_allowed: examData.attempts_allowed || 1,
        password: examData.password || '',
        proctoring: examData.settings?.proctoring || false,
        camera: examData.settings?.camera || false,
        microphone: examData.settings?.microphone || false,
      });

      // 4. جلب الكورسات
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title, is_free')
        .eq('teacher_id', teacherId)
        .eq('is_published', true)
        .order('title');

      setCourses(coursesData || []);

      if (examData.course_id && !coursesData?.some(c => c.id === examData.course_id)) {
        const { data: single } = await supabase
          .from('courses')
          .select('id, title, is_free')
          .eq('id', examData.course_id)
          .eq('teacher_id', teacherId)
          .single();
        if (single) {
          setCourses(prev => [single, ...prev]);
        }
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError('فشل جلب بيانات الامتحان: ' + err.message);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
      setLoadingCourses(false);
    }
  }, [examId, teacherId, router]);

  useEffect(() => {
    if (examId && teacherId) fetchData();
  }, [examId, teacherId, fetchData]);

  // ===== دوال النموذج =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ===== التحقق من صحة النموذج =====
  const validateForm = () => {
    const errors = {};
    
    if (!formData.title.trim()) errors.title = 'عنوان الامتحان مطلوب';
    
    if (!formData.duration_minutes || formData.duration_minutes < 1) {
      errors.duration_minutes = 'المدة يجب أن تكون أكبر من 0';
    }
    
    const passingMarks = Number(formData.passing_marks);
    if (formData.passing_marks === '' || isNaN(passingMarks)) {
      errors.passing_marks = 'يرجى إدخال درجة النجاح';
    } else if (passingMarks < 0) {
      errors.passing_marks = 'درجة النجاح لا يمكن أن تكون سالبة';
    }
    
    if (!formData.start_date) errors.start_date = 'تاريخ البدء مطلوب';
    if (!formData.end_date) errors.end_date = 'تاريخ الانتهاء مطلوب';
    
    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date);
      const end = new Date(formData.end_date);
      if (start >= end) {
        errors.end_date = 'تاريخ الانتهاء يجب أن يكون بعد تاريخ البدء';
      }
    }
    
    if (!formData.attempts_allowed || formData.attempts_allowed < 1) {
      errors.attempts_allowed = 'عدد المحاولات يجب أن يكون 1 على الأقل';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== تحديث الامتحان =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!hasPermission(permissions, 'exams', 'can_edit')) {
      toast.error('ليس لديك صلاحية تعديل الامتحانات');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        course_id: formData.course_id || null,
        duration_minutes: Number(formData.duration_minutes),
        start_date: formData.start_date,
        end_date: formData.end_date,
        passing_marks: Number(formData.passing_marks),
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
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('exams')
        .update(updateData)
        .eq('id', examId);

      if (error) throw error;

      setSuccess('✅ تم تحديث الامتحان بنجاح!');
      toast.success('تم تحديث الامتحان بنجاح');
      fetchData();
      setTimeout(() => {
        router.push(`/dashboard/assistant/exams/${examId}`);
      }, 1500);
    } catch (err) {
      console.error('Error updating exam:', err);
      setError('فشل تحديث الامتحان: ' + err.message);
      toast.error('فشل تحديث الامتحان');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== إعادة استيراد من البنك =====
  const handleReimportFromBank = async (selectedQuestions) => {
    if (!sourceBank) return;
    if (selectedQuestions.length === 0) {
      toast.warning('لم تختر أي سؤال');
      return;
    }
    if (!confirm(`سيتم استبدال جميع أسئلة الامتحان الحالية بـ ${selectedQuestions.length} سؤال من البنك. هل أنت متأكد؟`)) return;
    
    if (!hasPermission(permissions, 'exams', 'can_edit')) {
      toast.error('ليس لديك صلاحية تعديل الامتحانات');
      return;
    }

    setIsReimporting(true);
    try {
      const { error: deleteError } = await supabase
        .from('exam_questions')
        .delete()
        .eq('exam_id', examId);
      if (deleteError) throw deleteError;

      const questionsToInsert = selectedQuestions.map((q, idx) => ({
        exam_id: examId,
        question_text: q.question_text,
        type: q.type,
        difficulty: q.difficulty || 'medium',
        options: q.options || [],
        correct_answer: q.correct_answer,
        explanation: q.explanation || '',
        marks: q.marks || 1,
        tags: q.tags || [],
        bank_question_id: q.id,
        order_index: idx,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabase
        .from('exam_questions')
        .insert(questionsToInsert);
      if (insertError) throw insertError;

      const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      await supabase
        .from('exams')
        .update({ total_marks: totalMarks })
        .eq('id', examId);

      toast.success(`✅ تم استيراد ${selectedQuestions.length} سؤال من البنك`);
      setShowBankSelector(false);
      fetchData();
    } catch (err) {
      console.error('Error reimporting:', err);
      toast.error('فشل إعادة الاستيراد من البنك');
    } finally {
      setIsReimporting(false);
    }
  };

  // ===== دوال التنقل =====
  const goBack = () => router.push(`/dashboard/assistant/exams/${examId}`);
  const goToQuestions = () => router.push(`/dashboard/assistant/exams/${examId}/questions`);
  const goToResults = () => router.push(`/dashboard/assistant/exams/${examId}/results`);

  // ===== إحصائيات سريعة =====
  const statsData = [
    { label: 'الأسئلة', value: exam?.questions_count || 0, icon: Icons.HelpCircle },
    { label: 'المحاولات', value: exam?.attempts_count || 0, icon: Icons.Users },
    { label: 'الحالة', value: exam?.is_published ? 'منشور' : 'مسودة', icon: Icons.FileText },
  ];

  // ===== حالة التحميل =====
  if (loadingAssistant || loading) {
    return (
      <AssistantLayout>
        <div className={`flex items-center justify-center py-20 ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </AssistantLayout>
    );
  }

  // ===== التحقق من الصلاحية =====
  if (!hasPermission(permissions, 'exams', 'can_edit')) {
    return (
      <AssistantLayout>
        <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <Icons.Lock className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>غير مصرح لك</h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2`}>ليس لديك صلاحية تعديل الامتحانات</p>
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

  if (!exam) {
    return (
      <AssistantLayout>
        <div className={`text-center py-20 ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <Icons.AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg">الامتحان غير موجود</p>
          <button onClick={goBack} className="text-yellow-400 hover:underline mt-2">العودة</button>
        </div>
      </AssistantLayout>
    );
  }

  return (
    <AssistantLayout>
      <div className={`relative ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
        <ParticleBackground />

        <div className="relative z-10">
          {/* ===== رأس الصفحة ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>✏️ تعديل الامتحان</h1>
              <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1`}>
                {exam.title}
                {exam.course_id && courses.find(c => c.id === exam.course_id) && (
                  <span className="text-yellow-400">
                    {' – '}
                    {courses.find(c => c.id === exam.course_id)?.title}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              <button
                onClick={goToQuestions}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Icons.List className="h-4 w-4" /> الأسئلة
              </button>
              <button
                onClick={goToResults}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Icons.BarChart className="h-4 w-4" /> النتائج
              </button>
              {sourceBank && (
                <Link
                  href={`/dashboard/assistant/question-bank/${sourceBank.id}`}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
                >
                  <Icons.Database className="h-4 w-4" /> البنك المصدر
                </Link>
              )}
              <button
                onClick={goBack}
                className={`px-4 py-2 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/90 border-gray-200'} border rounded-xl text-sm hover:border-yellow-400/50 transition flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}
              >
                <Icons.ArrowRight className="h-4 w-4" /> العودة للتفاصيل
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition hover:bg-white/5 ${isDark ? 'bg-white/5' : 'bg-white/90'} border ${isDark ? 'border-white/10' : 'border-gray-200'}`}
                title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              >
                {theme === 'dark' ? (
                  <Icons.Sun className="h-4 w-4 text-yellow-400" />
                ) : (
                  <Icons.Moon className="h-4 w-4 text-gray-600" />
                )}
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

          {/* ===== نموذج التعديل مع معاينة ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className={`${isDark ? 'bg-white/5' : 'bg-white/90'} backdrop-blur-sm border ${isDark ? 'border-white/10' : 'border-gray-200'} rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500`}>
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* المعلومات الأساسية */}
                  <div>
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                      <Icons.FileText className="h-5 w-5 text-yellow-400" /> المعلومات الأساسية
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                          عنوان الامتحان <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="مثال: اختبار جرامر الترم الأول"
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border ${formErrors.title ? 'border-red-500' : ''} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        />
                        {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>الوصف</label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows="3"
                          placeholder="وصف مختصر للامتحان"
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition resize-none`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>الكورس المرتبط (اختياري)</label>
                        <select
                          name="course_id"
                          value={formData.course_id}
                          onChange={handleChange}
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition appearance-none`}
                          disabled={loadingCourses}
                        >
                          <option value="">بدون كورس</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title} {c.is_free ? '(مجاني)' : ''}
                            </option>
                          ))}
                        </select>
                        {loadingCourses && <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'} mt-1`}>جاري تحميل الكورسات...</p>}
                      </div>
                    </div>
                  </div>

                  {/* الجدول الزمني والدرجات – total_marks عرض فقط */}
                  <div className="pt-4 border-t border-white/5">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                      <Icons.Calendar className="h-5 w-5 text-yellow-400" /> الجدول الزمني والدرجات
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                          المدة (بالدقائق) <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="number"
                          name="duration_minutes"
                          value={formData.duration_minutes}
                          onChange={handleChange}
                          min="1"
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border ${formErrors.duration_minutes ? 'border-red-500' : ''} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        />
                        {formErrors.duration_minutes && <p className="text-red-400 text-xs mt-1">{formErrors.duration_minutes}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                          الدرجة الكلية <span className="text-xs text-gray-400">(تلقائي من الأسئلة)</span>
                        </label>
                        <div className={`p-3 rounded-xl border ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} font-medium`}>
                          {exam?.total_marks || 0} درجة
                        </div>
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                          تاريخ البدء <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          name="start_date"
                          value={formData.start_date}
                          onChange={handleChange}
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border ${formErrors.start_date ? 'border-red-500' : ''} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        />
                        {formErrors.start_date && <p className="text-red-400 text-xs mt-1">{formErrors.start_date}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>
                          تاريخ الانتهاء <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="datetime-local"
                          name="end_date"
                          value={formData.end_date}
                          onChange={handleChange}
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border ${formErrors.end_date ? 'border-red-500' : ''} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        />
                        {formErrors.end_date && <p className="text-red-400 text-xs mt-1">{formErrors.end_date}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>درجة النجاح</label>
                        <input
                          type="number"
                          name="passing_marks"
                          value={formData.passing_marks}
                          onChange={handleChange}
                          min="0"
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border ${formErrors.passing_marks ? 'border-red-500' : ''} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        />
                        {formErrors.passing_marks && <p className="text-red-400 text-xs mt-1">{formErrors.passing_marks}</p>}
                      </div>
                      <div>
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>عدد المحاولات المسموحة</label>
                        <input
                          type="number"
                          name="attempts_allowed"
                          value={formData.attempts_allowed}
                          onChange={handleChange}
                          min="1"
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border ${formErrors.attempts_allowed ? 'border-red-500' : ''} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        />
                        {formErrors.attempts_allowed && <p className="text-red-400 text-xs mt-1">{formErrors.attempts_allowed}</p>}
                      </div>
                    </div>
                  </div>

                  {/* الإعدادات المتقدمة */}
                  <div className="pt-4 border-t border-white/5">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
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
                        <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>خلط الأسئلة</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="shuffle_options"
                          checked={formData.shuffle_options}
                          onChange={handleChange}
                          className="w-5 h-5 accent-yellow-400 rounded"
                        />
                        <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>خلط الخيارات</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="allow_backward"
                          checked={formData.allow_backward}
                          onChange={handleChange}
                          className="w-5 h-5 accent-yellow-400 rounded"
                        />
                        <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>السماح بالرجوع للأسئلة السابقة</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="show_results_immediately"
                          checked={formData.show_results_immediately}
                          onChange={handleChange}
                          className="w-5 h-5 accent-yellow-400 rounded"
                        />
                        <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>عرض النتائج فور الانتهاء</label>
                      </div>
                      <div className="md:col-span-2">
                        <label className={`block text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1.5`}>كلمة المرور (اختياري)</label>
                        <input
                          type="text"
                          name="password"
                          value={formData.password}
                          onChange={handleChange}
                          placeholder="كلمة مرور لحماية الامتحان (اختياري)"
                          className={`w-full p-3 ${isDark ? 'bg-white/10 border-white/20 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* إعدادات المراقبة */}
                  <div className="pt-4 border-t border-white/5">
                    <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'} mb-4 flex items-center gap-2`}>
                      <Icons.Shield className="h-5 w-5 text-yellow-400" /> إعدادات المراقبة الذكية
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="proctoring"
                          checked={formData.proctoring}
                          onChange={handleChange}
                          className="w-5 h-5 accent-yellow-400 rounded"
                        />
                        <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>تفعيل المراقبة</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="camera"
                          checked={formData.camera}
                          onChange={handleChange}
                          className="w-5 h-5 accent-yellow-400 rounded"
                        />
                        <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>تفعيل الكاميرا</label>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="microphone"
                          checked={formData.microphone}
                          onChange={handleChange}
                          className="w-5 h-5 accent-yellow-400 rounded"
                        />
                        <label className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>تفعيل الميكروفون</label>
                      </div>
                    </div>
                    <div className={`mt-2 p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-100'} text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} space-y-1`}>
                      <p><span className="font-semibold text-yellow-400">💡 ملاحظة:</span> سيتم طلب إذن الطالب لاستخدام الكاميرا والميكروفون عند أداء الامتحان.</p>
                      <p><span className="font-semibold text-yellow-400">🔒 الأمان:</span> يتم تسجيل جلسة المراقبة ولا يمكن للطالب تجاوزها.</p>
                      <p><span className="font-semibold text-yellow-400">📊 التحليل:</span> سيتم تحليل سلوك الطالب أثناء الامتحان.</p>
                    </div>
                  </div>

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
                          جاري التحديث...
                        </>
                      ) : (
                        <>
                          <Icons.Save className="h-5 w-5" /> تحديث الامتحان
                        </>
                      )}
                    </button>

                    {sourceBank && (
                      <button
                        type="button"
                        onClick={() => setShowBankSelector(true)}
                        disabled={submitting || isReimporting}
                        className="px-6 py-3 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl font-semibold transition flex items-center gap-2 disabled:opacity-50"
                      >
                        {isReimporting ? (
                          <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                        ) : (
                          <Icons.RefreshCw className="h-5 w-5" />
                        )}
                        إعادة استيراد من البنك
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={goBack}
                      className={`px-6 py-3 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-white/90 border-gray-200 text-gray-900'} border rounded-xl hover:bg-white/10 transition`}
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* ===== المعاينة الجانبية ===== */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'} flex items-center gap-2`}>
                  <Icons.Eye className="h-4 w-4 text-yellow-400" /> معاينة الامتحان
                </h3>
                <ExamPreview 
                  formData={formData} 
                  exam={exam} 
                  sourceBank={sourceBank} 
                  bankQuestionsCount={bankQuestionsCount} 
                  theme={theme}
                />

                {/* إحصائيات سريعة */}
                <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-sm border rounded-2xl p-4`}>
                  <h4 className={`text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-3`}>إحصائيات الامتحان</h4>
                  <div className="space-y-2">
                    {statsData.map((stat, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <stat.icon className="h-4 w-4" />
                          {stat.label}
                        </div>
                        <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  {sourceBank && (
                    <div className="pt-2 mt-2 border-t border-white/5 flex items-center justify-between text-xs">
                      <span className={`${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-1`}>
                        <Icons.Database className="h-3 w-3 text-purple-400" /> البنك المصدر
                      </span>
                      <span className="text-purple-400">{sourceBank.title}</span>
                    </div>
                  )}
                </div>

                <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'} text-center`}>
                  هذه معاينة للإعدادات بعد التحديث
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== مودال بنك الأسئلة ===== */}
      <QuestionBankSelector
        isOpen={showBankSelector}
        onClose={() => setShowBankSelector(false)}
        onConfirm={handleReimportFromBank}
        bankId={sourceBank?.id || null}
        language="ar"
        theme={theme}
        color="gold"
        multiSelect={true}
        teacherId={teacherId}
        viewOnly={false}
      />
    </AssistantLayout>
  );
}