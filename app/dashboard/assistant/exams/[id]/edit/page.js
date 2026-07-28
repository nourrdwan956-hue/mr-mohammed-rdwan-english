// ================================================================
// 📁 app/dashboard/assistant/exams/[id]/edit/page.js
// ✏️ تعديل الامتحان – النسخة المتطورة للمساعد V1
// ================================================================
// - مستوحاة من نسخة المعلم مع تحسينات خاصة بالمساعد
// - دعم كامل للصلاحيات (can_edit)
// - دعم الثيم الفاتح/الداكن عبر useTheme الموحّد
// - استخدام APIs خاصة بالمساعد (/api/assistant/exams)
// - استيراد/إعادة استيراد من بنوك الأسئلة
// - معاينة مباشرة مع عرض البنك المصدر
// - استخدام useCachedFetch و useAssistantData للسرعة
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Save,
  ArrowRight,
  List,
  BarChart,
  Database,
  Pencil,
  Calendar,
  Settings,
  Shield,
  Eye,
  HelpCircle,
  Users,
  RefreshCw,
  X,
  AlertCircle,
  CheckCircle,
  Plus,
  Sun,
  Moon,
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

// ================================================================
// 🧮 عداد متحرك (مضمن)
// ================================================================

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

  return <span ref={ref} className="font-extrabold tracking-tight">{count}{suffix}</span>;
};

// ================================================================
// 🎨 خلفية الجسيمات (للزينة)
// ================================================================

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

// ================================================================
// 🎨 مكون المعاينة الجانبية (معدل لاستخدام styles)
// ================================================================

const ExamPreview = ({ formData, exam, sourceBank, bankQuestionsCount, styles }) => {
  const status = exam?.is_published ? 'منشور' : 'مسودة';
  const statusColor = exam?.is_published
    ? 'bg-green-500/20 text-green-400'
    : 'bg-gray-500/20 text-gray-400';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`rounded-2xl overflow-hidden transition-all duration-500 ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
    >
      <div className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className={`text-lg font-bold truncate ${styles.text}`}>
            {formData.title || 'عنوان الامتحان'}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusColor}`}>{status}</span>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={styles.subtext}>المدة</span>
            <span className={styles.text}>
              {formData.duration_minutes || 0} د
            </span>
          </div>
          <div className="flex justify-between">
            <span className={styles.subtext}>الدرجة الكلية</span>
            <span className={styles.text}>
              {formData.total_marks || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={styles.subtext}>درجة النجاح</span>
            <span className={styles.text}>
              {formData.passing_marks || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={styles.subtext}>الفترة</span>
            <span className={`text-xs ${styles.text}`}>
              {formData.start_date ? formatDate(formData.start_date) : 'غير محدد'}
              {' → '}
              {formData.end_date ? formatDate(formData.end_date) : 'غير محدد'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className={styles.subtext}>المحاولات</span>
            <span className={styles.text}>
              {formData.attempts_allowed || 1}
            </span>
          </div>

          {sourceBank ? (
            <div className={`flex justify-between pt-2 border-t ${styles.border}`}>
              <span className={styles.subtext}>البنك المصدر</span>
              <span className="text-purple-400 text-xs flex items-center gap-1">
                <Database className="h-3 w-3" />
                {sourceBank.title}
                <span className={styles.subtext}>
                  ({bankQuestionsCount || 0} سؤال)
                </span>
              </span>
            </div>
          ) : (
            <div className={`flex justify-between pt-2 border-t ${styles.border}`}>
              <span className={styles.subtext}>مصدر الأسئلة</span>
              <span className={`text-xs flex items-center gap-1 ${styles.subtext}`}>
                <Pencil className="h-3 w-3" /> مخصص
              </span>
            </div>
          )}
        </div>

        <div className={`pt-3 border-t ${styles.border} flex flex-wrap gap-2 text-xs`}>
          {formData.shuffle_questions && (
            <span className={`px-2 py-1 rounded-full ${styles.card} border ${styles.border} ${styles.subtext}`}>
              خلط الأسئلة
            </span>
          )}
          {formData.shuffle_options && (
            <span className={`px-2 py-1 rounded-full ${styles.card} border ${styles.border} ${styles.subtext}`}>
              خلط الخيارات
            </span>
          )}
          {formData.allow_backward && (
            <span className={`px-2 py-1 rounded-full ${styles.card} border ${styles.border} ${styles.subtext}`}>
              رجوع
            </span>
          )}
          {formData.proctoring && (
            <span className="px-2 py-1 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              مراقبة
            </span>
          )}
          {formData.password && (
            <span className="px-2 py-1 rounded-full bg-blue-400/10 text-blue-400 border border-blue-400/20">
              🔒 محمي
            </span>
          )}
        </div>

        <div className={`pt-3 border-t ${styles.border}`}>
          <p className={`text-[10px] text-center ${styles.subtext}`}>
            معاينة مباشرة للتحديثات
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 📄 الصفحة الرئيسية – تعديل الامتحان للمساعد
// ================================================================

export default function AssistantEditExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id;
  const { theme, toggleTheme, styles } = useTheme(); // ✅ استخدام الثيم الموحد
  const isDark = theme === 'dark';

  // ===== بيانات المساعد والصلاحيات =====
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();

  // ===== جلب بيانات الامتحان =====
  const teacherId = assistant?.teacher_id;
  const { data: examData, isLoading: examLoading, mutate: mutateExam } = useCachedFetch(
    teacherId ? `/api/assistant/exams/${examId}?teacher_id=${teacherId}` : null
  );

  // ===== جلب الكورسات =====
  const { data: coursesData, isLoading: coursesLoading } = useCachedFetch(
    teacherId ? `/api/assistant/courses?teacher_id=${teacherId}` : null
  );

  // ===== جلب أسئلة الامتحان للتعرف على البنك المصدر =====
  const { data: questionsData, isLoading: questionsLoading } = useCachedFetch(
    teacherId ? `/api/assistant/exams/${examId}/questions?teacher_id=${teacherId}` : null
  );

  // ===== حالات النموذج =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
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
  });

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ===== حالات البنك =====
  const [sourceBank, setSourceBank] = useState(null);
  const [bankQuestionsCount, setBankQuestionsCount] = useState(0);
  const [isReimporting, setIsReimporting] = useState(false);
  const [showBankSelector, setShowBankSelector] = useState(false);

  // ===== تحليل بيانات الامتحان والأسئلة =====
  const exam = examData?.exam || null;
  const questions = questionsData?.questions || [];
  const courses = coursesData?.courses || [];

  // ===== استخراج البنك المصدر من الأسئلة =====
  useEffect(() => {
    if (!questions || questions.length === 0 || !exam) return;

    const bankQuestionIds = questions
      .filter(q => q.bank_question_id)
      .map(q => q.bank_question_id)
      .filter(Boolean);

    if (bankQuestionIds.length === 0) {
      setSourceBank(null);
      setBankQuestionsCount(0);
      return;
    }

    const fetchBank = async () => {
      try {
        const res = await fetch(`/api/assistant/question-bank/${bankQuestionIds[0]}?teacher_id=${teacherId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.bank) {
            setSourceBank(data.bank);
            setBankQuestionsCount(bankQuestionIds.length);
          }
        }
      } catch (err) {
        console.error('Error fetching bank details:', err);
      }
    };
    fetchBank();
  }, [questions, exam, teacherId]);

  // ===== تعبئة النموذج عند تحميل الامتحان =====
  useEffect(() => {
    if (exam) {
      setFormData({
        title: exam.title || '',
        description: exam.description || '',
        course_id: exam.course_id || '',
        duration_minutes: exam.duration_minutes || 30,
        start_date: exam.start_date || '',
        end_date: exam.end_date || '',
        total_marks: exam.total_marks || 100,
        passing_marks: exam.passing_marks || 50,
        shuffle_questions: exam.shuffle_questions ?? true,
        shuffle_options: exam.shuffle_options ?? true,
        allow_backward: exam.allow_backward ?? false,
        show_results_immediately: exam.show_results_immediately ?? true,
        attempts_allowed: exam.attempts_allowed || 1,
        password: exam.password || '',
        proctoring: exam.settings?.proctoring || false,
        camera: exam.settings?.camera || false,
        microphone: exam.settings?.microphone || false,
      });
    }
  }, [exam]);

  // ===== التحقق من الصلاحية =====
  const canEdit = hasPermission(permissions, 'exams', 'can_edit');

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

  // ===== تحديث الامتحان =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      toast.error('يرجى تصحيح الأخطاء في النموذج');
      return;
    }
    if (!assistant) {
      toast.error('الرجاء تسجيل الدخول أولاً');
      return;
    }
    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتعديل الامتحانات');
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
      };

      const res = await fetch(`/api/assistant/exams/${examId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: assistant.teacher_id, ...updateData }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تحديث الامتحان');

      setSuccess('✅ تم تحديث الامتحان بنجاح!');
      toast.success('تم تحديث الامتحان بنجاح');
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

    if (!canEdit) {
      toast.error('ليس لديك صلاحية لتعديل الأسئلة');
      return;
    }

    setIsReimporting(true);
    try {
      // 1. حذف الأسئلة الحالية
      const deleteRes = await fetch(`/api/assistant/exams/${examId}/questions`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: assistant.teacher_id }),
      });
      if (!deleteRes.ok) {
        const data = await deleteRes.json();
        throw new Error(data.error || 'فشل حذف الأسئلة الحالية');
      }

      // 2. إضافة الأسئلة الجديدة
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

      const insertRes = await fetch(`/api/assistant/exams/${examId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsToInsert }),
      });

      if (!insertRes.ok) {
        const data = await insertRes.json();
        throw new Error(data.error || 'فشل إضافة الأسئلة الجديدة');
      }

      // تحديث total_marks
      const totalMarks = selectedQuestions.reduce((sum, q) => sum + (q.marks || 1), 0);
      await fetch(`/api/assistant/exams/${examId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant.teacher_id,
          total_marks: totalMarks,
        }),
      });

      toast.success(`✅ تم استيراد ${selectedQuestions.length} سؤال من البنك`);
      setShowBankSelector(false);
      mutateExam();
    } catch (err) {
      console.error('Error reimporting:', err);
      toast.error('فشل إعادة الاستيراد من البنك');
    } finally {
      setIsReimporting(false);
    }
  };

  // ===== دوال التنقل =====
  const goBack = () => {
    router.push(`/dashboard/assistant/exams/${examId}`);
  };

  const goToQuestions = () => {
    router.push(`/dashboard/assistant/exams/${examId}/questions`);
  };

  const goToResults = () => {
    router.push(`/dashboard/assistant/exams/${examId}/results`);
  };

  // ===== إحصائيات سريعة =====
  const statsData = [
    { label: 'الأسئلة', value: questions.length || 0, icon: HelpCircle },
    { label: 'المحاولات', value: exam?.attempts_count || 0, icon: Users },
    { label: 'الحالة', value: exam?.is_published ? 'منشور' : 'مسودة', icon: FileText },
  ];

  // ===== حالة التحميل =====
  const isLoading = assistantLoading || examLoading || coursesLoading || questionsLoading;

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${styles.subtext}`}>
            جاري تحميل بيانات الامتحان...
          </p>
        </div>
      </div>
    );
  }

  // ===== التحقق من الصلاحية =====
  if (!exam || !canEdit || !assistant) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="text-center">
          <AlertCircle className={`h-16 w-16 mx-auto mb-4 ${styles.subtext}`} />
          <h2 className={`text-2xl font-bold ${styles.text}`}>
            {!exam ? 'الامتحان غير موجود' : 'غير مصرح لك'}
          </h2>
          <button
            onClick={goBack}
            className="mt-4 px-6 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
          >
            العودة إلى التفاصيل
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden transition-colors duration-300`}>
      {isDark && <ParticleBackground />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
              ✏️ تعديل الامتحان
            </h1>
            <p className={`text-sm mt-1 ${styles.subtext}`}>
              {exam.title}
              {exam.course_id && courses.find(c => c.id === exam.course_id) && (
                <span className="text-yellow-400">
                  {' – '}
                  {courses.find(c => c.id === exam.course_id)?.title}
                </span>
              )}
              {assistant && (
                <span className="mr-2 text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  {assistant.display_name || assistant.full_name}
                </span>
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            <button
              onClick={goToQuestions}
              className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              <List className="h-4 w-4" /> الأسئلة
            </button>
            <button
              onClick={goToResults}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              <BarChart className="h-4 w-4" /> النتائج
            </button>
            {sourceBank && (
              <Link
                href={`/dashboard/assistant/question-bank/${sourceBank.id}`}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Database className="h-4 w-4" /> البنك المصدر
              </Link>
            )}
            <button
              onClick={goBack}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${styles.card} border ${styles.border} hover:border-yellow-400/50 ${styles.subtext} hover:${styles.text}`}
            >
              <ArrowRight className="h-4 w-4" /> العودة للتفاصيل
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
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

        {/* ===== نموذج التعديل مع معاينة ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className={`rounded-2xl p-6 space-y-5 transition-all duration-500 ${styles.card} border ${styles.border}`}>
              {/* المعلومات الأساسية */}
              <div>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${styles.text}`}>
                  <FileText className="h-5 w-5 text-yellow-400" /> المعلومات الأساسية
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      عنوان الامتحان <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="مثال: اختبار جرامر الترم الأول"
                      className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${formErrors.title ? 'border-red-500' : ''}`}
                    />
                    {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      الوصف
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows="3"
                      placeholder="وصف مختصر للامتحان"
                      className={`w-full p-3 rounded-xl border outline-none transition resize-none ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      الكورس المرتبط (اختياري)
                    </label>
                    <select
                      name="course_id"
                      value={formData.course_id}
                      onChange={handleChange}
                      className={`w-full p-3 rounded-xl border outline-none transition appearance-none ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
                      disabled={coursesLoading}
                    >
                      <option value="">بدون كورس</option>
                      {courses.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.title} {c.is_free ? '(مجاني)' : ''}
                        </option>
                      ))}
                    </select>
                    {coursesLoading && <p className={`text-xs mt-1 ${styles.subtext}`}>جاري تحميل الكورسات...</p>}
                  </div>
                </div>
              </div>

              {/* الجدول الزمني والدرجات */}
              <div className={`pt-4 border-t ${styles.border}`}>
                <h3 className={`text-lg font-bold mb-4 flex items-center gap-2 ${styles.text}`}>
                  <Calendar className="h-5 w-5 text-yellow-400" /> الجدول الزمني والدرجات
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      المدة (بالدقائق) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      name="duration_minutes"
                      value={formData.duration_minutes}
                      onChange={handleChange}
                      min="1"
                      className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${formErrors.duration_minutes ? 'border-red-500' : ''}`}
                    />
                    {formErrors.duration_minutes && <p className="text-red-400 text-xs mt-1">{formErrors.duration_minutes}</p>}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      الدرجة الكلية <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      name="total_marks"
                      value={formData.total_marks}
                      onChange={handleChange}
                      min="1"
                      className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${formErrors.total_marks ? 'border-red-500' : ''}`}
                    />
                    {formErrors.total_marks && <p className="text-red-400 text-xs mt-1">{formErrors.total_marks}</p>}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      تاريخ البدء <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${formErrors.start_date ? 'border-red-500' : ''}`}
                    />
                    {formErrors.start_date && <p className="text-red-400 text-xs mt-1">{formErrors.start_date}</p>}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      تاريخ الانتهاء <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${formErrors.end_date ? 'border-red-500' : ''}`}
                    />
                    {formErrors.end_date && <p className="text-red-400 text-xs mt-1">{formErrors.end_date}</p>}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      درجة النجاح
                    </label>
                    <input
                      type="number"
                      name="passing_marks"
                      value={formData.passing_marks}
                      onChange={handleChange}
                      min="0"
                      max={formData.total_marks}
                      className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${formErrors.passing_marks ? 'border-red-500' : ''}`}
                    />
                    {formErrors.passing_marks && <p className="text-red-400 text-xs mt-1">{formErrors.passing_marks}</p>}
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      عدد المحاولات المسموحة
                    </label>
                    <input
                      type="number"
                      name="attempts_allowed"
                      value={formData.attempts_allowed}
                      onChange={handleChange}
                      min="1"
                      className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50 ${formErrors.attempts_allowed ? 'border-red-500' : ''}`}
                    />
                    {formErrors.attempts_allowed && <p className="text-red-400 text-xs mt-1">{formErrors.attempts_allowed}</p>}
                  </div>
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
                    <label className={`block text-sm font-medium mb-1.5 ${styles.subtext}`}>
                      كلمة المرور (اختياري)
                    </label>
                    <input
                      type="text"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="كلمة مرور لحماية الامتحان (اختياري)"
                      className={`w-full p-3 rounded-xl border outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
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
                      جاري التحديث...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" /> تحديث الامتحان
                    </>
                  )}
                </button>

                {sourceBank && (
                  <button
                    type="button"
                    onClick={() => setShowBankSelector(true)}
                    disabled={submitting || isReimporting}
                    className={`px-6 py-3 rounded-xl font-semibold transition flex items-center gap-2 disabled:opacity-50 ${
                      isDark
                        ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'
                        : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
                    }`}
                  >
                    {isReimporting ? (
                      <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                    ) : (
                      <RefreshCw className="h-5 w-5" />
                    )}
                    إعادة استيراد من البنك
                  </button>
                )}

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
            <div className="sticky top-24 space-y-4">
              <h3 className={`text-sm font-semibold flex items-center gap-2 ${styles.text}`}>
                <Eye className="h-4 w-4 text-yellow-400" /> معاينة الامتحان
              </h3>
              <ExamPreview
                formData={formData}
                exam={exam}
                sourceBank={sourceBank}
                bankQuestionsCount={bankQuestionsCount}
                styles={styles}
              />

              {/* إحصائيات سريعة */}
              <div className={`rounded-2xl p-4 ${styles.card} border ${styles.border}`}>
                <h4 className={`text-xs font-semibold mb-3 ${styles.subtext}`}>
                  إحصائيات الامتحان
                </h4>
                <div className="space-y-2">
                  {statsData.map((stat, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className={`flex items-center gap-2 text-sm ${styles.subtext}`}>
                        <stat.icon className="h-4 w-4" />
                        {stat.label}
                      </div>
                      <span className={`text-sm font-medium ${styles.text}`}>
                        {stat.value}
                      </span>
                    </div>
                  ))}
                </div>
                {sourceBank && (
                  <div className={`pt-2 mt-2 border-t ${styles.border} flex items-center justify-between text-xs`}>
                    <span className={`flex items-center gap-1 ${styles.subtext}`}>
                      <Database className="h-3 w-3 text-purple-400" /> البنك المصدر
                    </span>
                    <span className="text-purple-400">{sourceBank.title}</span>
                  </div>
                )}
              </div>

              <p className={`text-[10px] text-center ${styles.subtext} opacity-60`}>
                هذه معاينة للإعدادات بعد التحديث
              </p>
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
        theme={isDark ? 'dark' : 'light'}
        color="yellow"
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
      `}</style>
    </div>
  );
}