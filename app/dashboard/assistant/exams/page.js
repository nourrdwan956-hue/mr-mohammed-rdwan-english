// app/dashboard/assistant/exams/page.js

'use client';

import { Suspense } from 'react';
import { AssistantLayout } from '@/components/AssistantLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { hasPermission } from '@/lib/permissions';
import { useTheme } from '@/lib/hooks/useTheme';

// ============================================================
// 1. مكونات أساسية مع دعم الثيم عبر CSS Variables
// ============================================================

// 1.1 عداد متحرك
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

// 1.2 بطاقة إحصائية (مع ثيم موحد)
const StatCard = ({ stat, styles }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative ${styles.card} border ${styles.border} rounded-2xl p-5 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/10 overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`${styles.subtext} text-sm`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && <p className={`text-xs ${styles.subtext} mt-1`}>{stat.sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: isHovered ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// 1.3 دوال مساعدة
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

const getExamStatus = (exam) => {
  const now = new Date();
  const start = new Date(exam.start_date);
  const end = new Date(exam.end_date);

  if (!exam.is_published) {
    return { label: 'مسودة', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Icons.FileText };
  }
  if (now < start) {
    return { label: 'قادم', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Icons.Clock };
  }
  if (now > end) {
    return { label: 'منتهي', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Icons.Check };
  }
  return { label: 'نشط', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Icons.Play };
};

// 1.4 بطاقة الامتحان (بدون حذف للمساعد)
const ExamCard = ({
  exam,
  onEdit,
  onTogglePublish,
  onManageQuestions,
  onViewResults,
  onDuplicate,
  onViewBank,
  courseTitle,
  index,
  permissions,
  isAssistant,
  styles,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = getExamStatus(exam);
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative ${styles.card} border ${styles.border} rounded-2xl overflow-hidden hover:border-yellow-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-purple-500/5 to-transparent rounded-2xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative z-10 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="md:w-20 h-20 md:h-auto rounded-xl bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 relative">
            <Icons.FileText className="h-10 w-10 text-yellow-400" />
            <div className="absolute -top-1 -right-1 flex items-center gap-1">
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
              {exam.bank_id && (
                <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border border-purple-400/30 bg-purple-400/10 text-purple-300">
                  <Icons.Database className="h-3 w-3" />
                  بنك
                </span>
              )}
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h3 className={`text-lg font-bold ${styles.text} group-hover:text-yellow-300 transition-colors cursor-pointer`}>
                  {exam.title}
                </h3>
                {courseTitle && (
                  <p className={`text-xs ${styles.subtext} flex items-center gap-1 mt-0.5`}>
                    <Icons.Book className="h-3 w-3" /> {courseTitle}
                  </p>
                )}
                {exam.bank_title && (
                  <p className="text-xs text-yellow-400/80 flex items-center gap-1 mt-0.5">
                    <Icons.Database className="h-3 w-3" />
                    مستورد من: {exam.bank_title}
                    <span className={`${styles.subtext} mr-1`}>({exam.bank_questions_count || 0} سؤال)</span>
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-yellow-400">{exam.total_marks || 0} درجة</span>
                {exam.passing_marks && (
                  <span className={`text-xs ${styles.subtext}`}>(نجاح: {exam.passing_marks})</span>
                )}
              </div>
            </div>

            <p className={`${styles.subtext} text-sm mt-1 line-clamp-2`}>
              {exam.description || 'لا يوجد وصف'}
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
              <span className={`flex items-center gap-1.5 ${styles.card} px-3 py-1 rounded-full ${styles.subtext}`}>
                <Icons.Clock className="h-3.5 w-3.5" />
                {exam.duration_minutes || 0} د
              </span>
              <span className={`flex items-center gap-1.5 ${styles.card} px-3 py-1 rounded-full ${styles.subtext}`}>
                <Icons.Calendar className="h-3.5 w-3.5" />
                {formatDate(exam.start_date)}
              </span>
              <span className={`flex items-center gap-1.5 ${styles.card} px-3 py-1 rounded-full ${styles.subtext}`}>
                <Icons.Users className="h-3.5 w-3.5" />
                {exam.attempts_count || 0}
              </span>
              <span className={`flex items-center gap-1.5 ${styles.card} px-3 py-1 rounded-full ${styles.subtext}`}>
                <Icons.HelpCircle className="h-3.5 w-3.5" />
                {exam.questions_count || 0}
              </span>
              {exam.password && (
                <span className="flex items-center gap-1.5 bg-yellow-400/10 text-yellow-400 px-3 py-1 rounded-full border border-yellow-400/20">
                  <Icons.Lock className="h-3.5 w-3.5" /> محمي
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5">
              {(!isAssistant || hasPermission(permissions, 'exams', 'can_publish')) && (
                <button
                  onClick={() => onTogglePublish(exam)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    exam.is_published
                      ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {exam.is_published ? <Icons.EyeOff className="h-3 w-3" /> : <Icons.Eye className="h-3 w-3" />}
                  {exam.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
              )}

              {(!isAssistant || hasPermission(permissions, 'exams', 'can_edit')) && (
                <button
                  onClick={() => onManageQuestions(exam)}
                  className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/30 transition flex items-center gap-1"
                >
                  <Icons.List className="h-3 w-3" /> الأسئلة
                </button>
              )}

              {(!isAssistant || hasPermission(permissions, 'exams', 'can_view')) && (
                <button
                  onClick={() => onViewResults(exam)}
                  className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-500/30 transition flex items-center gap-1"
                >
                  <Icons.BarChart className="h-3 w-3" /> النتائج
                </button>
              )}

              {(!isAssistant || hasPermission(permissions, 'exams', 'can_edit')) && (
                <button
                  onClick={() => onEdit(exam)}
                  className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition flex items-center gap-1"
                >
                  <Icons.Edit className="h-3 w-3" /> تعديل
                </button>
              )}

              {(!isAssistant || hasPermission(permissions, 'exams', 'can_create')) && (
                <button
                  onClick={() => onDuplicate(exam)}
                  className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/30 transition flex items-center gap-1"
                >
                  <Icons.Copy className="h-3 w-3" /> نسخ
                </button>
              )}

              {/* ❌ تم إزالة زر الحذف للمساعد */}

              {exam.bank_id && (
                <button
                  onClick={() => onViewBank(exam)}
                  className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-xs font-semibold hover:bg-purple-500/30 transition flex items-center gap-1"
                >
                  <Icons.Database className="h-3 w-3" /> البنك المصدر
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// 2. المكون الرئيسي (محتوى الصفحة)
// ============================================================
function AssistantExamsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');
  const { theme, toggleTheme, language, styles } = useTheme();
  const isDark = theme === 'dark';

  // ===== بيانات المساعد والصلاحيات =====
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [loadingAssistant, setLoadingAssistant] = useState(true);
  const [teacherId, setTeacherId] = useState(null);

  // ===== حالات عامة =====
  const [exams, setExams] = useState([]);
  const [courses, setCourses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ===== ربط ببنوك الأسئلة =====
  const [banks, setBanks] = useState({});
  const [filterBank, setFilterBank] = useState('all');
  const [bankStats, setBankStats] = useState({ totalBanksUsed: 0, bankQuestionsCount: 0 });

  // ===== فلترة وبحث =====
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState(courseIdParam || 'all');
  const [sortBy, setSortBy] = useState('newest');

  // ===== تحديد متعدد (بدون حذف) =====
  const [selectedIds, setSelectedIds] = useState([]);

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    active: 0,
    upcoming: 0,
    ended: 0,
  });

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

        // التحقق من صلاحية العرض
        if (!hasPermission(perms, 'exams', 'can_view')) {
          toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
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

  // ===== جلب الامتحانات =====
  const fetchExams = useCallback(async () => {
    if (!teacherId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. جلب جميع الكورسات التابعة للمعلم
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', teacherId);

      const courseMap = {};
      (coursesData || []).forEach(c => { courseMap[c.id] = c.title; });
      setCourses(courseMap);

      // 2. جلب الامتحانات
      let query = supabase
        .from('exams')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (courseIdParam && courseIdParam !== 'all') {
        query = query.eq('course_id', courseIdParam);
      }

      const { data: examsData, error: examsError } = await query;
      if (examsError) throw examsError;

      // 3. جلب الإحصائيات الإضافية
      const examIds = (examsData || []).map(e => e.id);
      let attemptsCounts = {};
      let questionsCounts = {};

      if (examIds.length > 0) {
        const { data: attemptsData } = await supabase
          .from('exam_attempts')
          .select('exam_id')
          .in('exam_id', examIds);

        const attemptsCount = {};
        (attemptsData || []).forEach(row => {
          attemptsCount[row.exam_id] = (attemptsCount[row.exam_id] || 0) + 1;
        });
        attemptsCounts = attemptsCount;

        const { data: questionsData } = await supabase
          .from('exam_questions')
          .select('exam_id')
          .in('exam_id', examIds);

        const questionsCount = {};
        (questionsData || []).forEach(row => {
          questionsCount[row.exam_id] = (questionsCount[row.exam_id] || 0) + 1;
        });
        questionsCounts = questionsCount;
      }

      const processed = (examsData || []).map(exam => ({
        ...exam,
        attempts_count: attemptsCounts[exam.id] || 0,
        questions_count: questionsCounts[exam.id] || 0,
      }));

      // 4. جلب معلومات البنوك المصدر للامتحانات
      let bankMap = {};
      let bankUsageCount = {};

      if (examIds.length > 0) {
        const { data: examQuestionsData } = await supabase
          .from('exam_questions')
          .select('exam_id, bank_question_id')
          .in('exam_id', examIds);

        const bankQuestionIds = examQuestionsData
          ?.filter(eq => eq.bank_question_id)
          .map(eq => eq.bank_question_id) || [];

        let questionBankMap = {};
        if (bankQuestionIds.length > 0) {
          const { data: questionsData } = await supabase
            .from('questions')
            .select('id, bank_id')
            .in('id', bankQuestionIds);
          questionsData?.forEach(q => {
            questionBankMap[q.id] = q.bank_id;
          });
        }

        const examBankMap = {};
        examQuestionsData?.forEach(eq => {
          if (eq.bank_question_id && questionBankMap[eq.bank_question_id]) {
            const bankId = questionBankMap[eq.bank_question_id];
            if (!examBankMap[eq.exam_id]) {
              examBankMap[eq.exam_id] = { bankId, count: 0 };
            }
            examBankMap[eq.exam_id].count += 1;
          }
        });

        const bankIds = Object.values(examBankMap)
          .map(item => item.bankId)
          .filter(Boolean);
        
        if (bankIds.length > 0) {
          const { data: banksData } = await supabase
            .from('question_banks')
            .select('id, title')
            .in('id', bankIds);
          banksData?.forEach(b => {
            bankMap[b.id] = b.title;
          });
        }

        processed.forEach(exam => {
          const bankInfo = examBankMap[exam.id];
          if (bankInfo) {
            exam.bank_id = bankInfo.bankId;
            exam.bank_title = bankMap[bankInfo.bankId] || 'بنك غير معروف';
            exam.bank_questions_count = bankInfo.count;
          } else {
            exam.bank_id = null;
            exam.bank_title = null;
            exam.bank_questions_count = 0;
          }
        });

        const usedBanks = Object.values(examBankMap)
          .map(item => item.bankId)
          .filter(Boolean);
        const uniqueBanks = [...new Set(usedBanks)];
        const totalBankQuestions = processed.reduce((sum, e) => sum + (e.bank_questions_count || 0), 0);
        
        setBankStats({
          totalBanksUsed: uniqueBanks.length,
          bankQuestionsCount: totalBankQuestions,
        });
        setBanks(bankMap);
      }

      setExams(processed);

      // 5. تحديث الإحصائيات
      const now = new Date();
      setStats({
        total: processed.length,
        published: processed.filter(e => e.is_published).length,
        drafts: processed.filter(e => !e.is_published).length,
        active: processed.filter(e => e.is_published && new Date(e.start_date) <= now && new Date(e.end_date) >= now).length,
        upcoming: processed.filter(e => e.is_published && new Date(e.start_date) > now).length,
        ended: processed.filter(e => e.is_published && new Date(e.end_date) < now).length,
      });

    } catch (err) {
      console.error('Error fetching exams:', err);
      setError('فشل جلب الامتحانات: ' + err.message);
      toast.error('فشل جلب الامتحانات');
    } finally {
      setLoading(false);
    }
  }, [courseIdParam, teacherId]);

  useEffect(() => {
    if (teacherId) fetchExams();
  }, [teacherId, fetchExams]);

  // ===== الفلترة والبحث =====
  const filteredExams = useMemo(() => {
    let result = [...exams];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(e =>
        e.title.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') {
      const now = new Date();
      result = result.filter(e => {
        if (!e.is_published) return filterStatus === 'draft';
        const start = new Date(e.start_date);
        const end = new Date(e.end_date);
        if (filterStatus === 'active') return start <= now && end >= now;
        if (filterStatus === 'upcoming') return start > now;
        if (filterStatus === 'ended') return end < now;
        return true;
      });
    }

    if (filterCourse && filterCourse !== 'all') {
      result = result.filter(e => e.course_id === filterCourse);
    }

    if (filterBank && filterBank !== 'all') {
      result = result.filter(e => e.bank_id === filterBank);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case 'students':
        result.sort((a, b) => (b.attempts_count || 0) - (a.attempts_count || 0));
        break;
      default:
        break;
    }

    return result;
  }, [exams, searchQuery, filterStatus, filterCourse, filterBank, sortBy]);

  // ===== قائمة الكورسات للفلترة =====
  const courseOptions = useMemo(() => {
    const uniqueCourses = {};
    exams.forEach(e => {
      if (e.course_id && !uniqueCourses[e.course_id]) {
        uniqueCourses[e.course_id] = courses[e.course_id] || 'كورس غير معروف';
      }
    });
    return Object.entries(uniqueCourses).map(([id, title]) => ({ id, title }));
  }, [exams, courses]);

  // ===== دوال التحكم =====
  const handleCreate = () => {
    if (!hasPermission(permissions, 'exams', 'can_create')) {
      toast.error('ليس لديك صلاحية إنشاء امتحانات');
      return;
    }
    const url = courseIdParam && courseIdParam !== 'all'
      ? `/dashboard/assistant/exams/new?course_id=${courseIdParam}`
      : '/dashboard/assistant/exams/new';
    router.push(url);
  };

  const handleEdit = (exam) => {
    if (!hasPermission(permissions, 'exams', 'can_edit')) {
      toast.error('ليس لديك صلاحية تعديل الامتحانات');
      return;
    }
    router.push(`/dashboard/assistant/exams/${exam.id}/edit`);
  };

  const handleManageQuestions = (exam) => {
    if (!hasPermission(permissions, 'exams', 'can_edit')) {
      toast.error('ليس لديك صلاحية إدارة الأسئلة');
      return;
    }
    router.push(`/dashboard/assistant/exams/${exam.id}/questions`);
  };

  const handleViewResults = (exam) => {
    if (!hasPermission(permissions, 'exams', 'can_view')) {
      toast.error('ليس لديك صلاحية عرض النتائج');
      return;
    }
    router.push(`/dashboard/assistant/exams/${exam.id}/results`);
  };

  const handleDuplicate = async (exam) => {
    if (!hasPermission(permissions, 'exams', 'can_create')) {
      toast.error('ليس لديك صلاحية نسخ الامتحانات');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('exams')
        .insert({
          teacher_id: teacherId,
          title: `${exam.title} (نسخة)`,
          description: exam.description,
          duration_minutes: exam.duration_minutes,
          start_date: exam.start_date,
          end_date: exam.end_date,
          total_marks: exam.total_marks,
          passing_marks: exam.passing_marks,
          shuffle_questions: exam.shuffle_questions,
          shuffle_options: exam.shuffle_options,
          allow_backward: exam.allow_backward,
          show_results_immediately: exam.show_results_immediately,
          attempts_allowed: exam.attempts_allowed,
          password: exam.password,
          settings: exam.settings,
          course_id: exam.course_id,
          is_published: false,
        })
        .select()
        .single();

      if (error) throw error;
      toast.success('✅ تم نسخ الامتحان بنجاح');
      fetchExams();
    } catch (err) {
      console.error('Error duplicating exam:', err);
      toast.error('فشل نسخ الامتحان');
    }
  };

  const togglePublish = async (exam) => {
    if (!hasPermission(permissions, 'exams', 'can_publish')) {
      toast.error('ليس لديك صلاحية نشر الامتحانات');
      return;
    }
    try {
      const { error } = await supabase
        .from('exams')
        .update({
          is_published: !exam.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', exam.id);
      if (error) throw error;
      toast.success(`✅ تم ${exam.is_published ? 'إلغاء نشر' : 'نشر'} الامتحان`);
      fetchExams();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleViewBank = (exam) => {
    if (exam.bank_id) {
      router.push(`/dashboard/assistant/question-bank/${exam.bank_id}`);
    }
  };

  // ===== تحديد متعدد (بدون حذف) =====
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExams.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExams.map(e => e.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ===== العمليات الجماعية (بدون حذف) =====
  const handleBatchPublish = async () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission(permissions, 'exams', 'can_publish')) {
      toast.error('ليس لديك صلاحية نشر الامتحانات');
      return;
    }
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: true })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`✅ تم نشر ${selectedIds.length} امتحان`);
      setSelectedIds([]);
      fetchExams();
    } catch (err) {
      console.error('Error batch publishing:', err);
      toast.error('فشل نشر الامتحانات');
    }
  };

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي الامتحانات', value: stats.total, suffix: '', icon: Icons.FileText, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'منشور', value: stats.published, suffix: '', icon: Icons.CheckCircle, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'مسودات', value: stats.drafts, suffix: '', icon: Icons.FileText, color: 'from-gray-400 to-gray-600', delay: 0.2 },
    { id: 4, label: 'نشط', value: stats.active, suffix: '', icon: Icons.Play, color: 'from-green-400 to-green-600', delay: 0.3 },
    { id: 5, label: 'قادم', value: stats.upcoming, suffix: '', icon: Icons.Clock, color: 'from-blue-400 to-blue-600', delay: 0.4 },
    { id: 6, label: 'منتهي', value: stats.ended, suffix: '', icon: Icons.Check, color: 'from-red-400 to-red-600', delay: 0.5 },
    { id: 7, label: 'بنوك مستخدمة', value: bankStats.totalBanksUsed, suffix: '', icon: Icons.Database, color: 'from-purple-400 to-purple-600', delay: 0.6 },
    { id: 8, label: 'أسئلة من البنوك', value: bankStats.bankQuestionsCount, suffix: '', icon: Icons.Clipboard, color: 'from-indigo-400 to-indigo-600', delay: 0.7 },
  ];

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
  if (!hasPermission(permissions, 'exams', 'can_view')) {
    return (
      <AssistantLayout>
        <div className={`flex flex-col items-center justify-center py-20 ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <Icons.Lock className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-400'} mb-4`} />
          <h2 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>غير مصرح لك</h2>
          <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} mt-2`}>ليس لديك صلاحية عرض الامتحانات</p>
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
      <div className={`relative ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-gray-900'}`}>📝 إدارة الامتحانات</h1>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mt-1`}>
              {courseIdParam && courseIdParam !== 'all' && courses[courseIdParam]
                ? `امتحانات الكورس: ${courses[courseIdParam]}`
                : 'جميع الامتحانات'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            {hasPermission(permissions, 'exams', 'can_create') && (
              <button
                onClick={handleCreate}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Icons.Plus className="h-5 w-5" /> إنشاء امتحان جديد
              </button>
            )}
            <Link
              href="/dashboard/assistant/question-bank"
              className="px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 font-bold rounded-xl hover:scale-[1.02] transition flex items-center gap-2"
            >
              <Icons.Database className="h-5 w-5" /> إنشاء من بنك
            </Link>
            <button
              onClick={() => router.push('/dashboard/assistant')}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm transition flex items-center gap-2"
            >
              <Icons.ArrowRight className="h-4 w-4" /> العودة للوحة التحكم
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
              <button onClick={() => setSuccess('')} className="text-green-400/70 hover:text-green-400">
                <Icons.X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-6">
          {statsData.map((stat) => (
            <StatCard key={stat.id} stat={stat} styles={{ card: isDark ? 'bg-[#1a1f2e]' : 'bg-white', border: isDark ? 'border-white/20' : 'border-gray-200', text: isDark ? 'text-white' : 'text-gray-900', subtext: isDark ? 'text-gray-400' : 'text-gray-600' }} />
          ))}
        </div>

        {/* ===== الفلتر والبحث ===== */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Icons.Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن امتحان (عنوان أو وصف)..."
              className={`w-full p-2.5 pr-10 ${isDark ? 'bg-white/5 border-white/10 text-white placeholder-gray-400' : 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-500'} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`p-2.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="all">كل الحالات</option>
            <option value="published">منشور</option>
            <option value="draft">مسودة</option>
            <option value="active">نشط</option>
            <option value="upcoming">قادم</option>
            <option value="ended">منتهي</option>
          </select>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className={`p-2.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="all">جميع الكورسات</option>
            {courseOptions.map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            value={filterBank}
            onChange={(e) => setFilterBank(e.target.value)}
            className={`p-2.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="all">جميع البنوك</option>
            {Object.entries(banks).map(([id, title]) => (
              <option key={id} value={id}>{title}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`p-2.5 ${isDark ? 'bg-white/5 border-white/10 text-white' : 'bg-gray-100 border-gray-300 text-gray-900'} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="title">العنوان</option>
            <option value="students">عدد الطلاب</option>
          </select>
        </div>

        {/* ===== أزرار التحكم الجماعي (بدون حذف) ===== */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {filteredExams.length > 0 && (
            <>
              <button
                onClick={toggleSelectAll}
                className={`px-3 py-1.5 ${isDark ? 'bg-white/5 border-white/10 text-gray-300' : 'bg-gray-100 border-gray-200 text-gray-700'} border rounded-xl text-xs hover:border-yellow-400/50 transition`}
              >
                {selectedIds.length === filteredExams.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
              {selectedIds.length > 0 && (
                <>
                  {hasPermission(permissions, 'exams', 'can_publish') && (
                    <button
                      onClick={handleBatchPublish}
                      className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-xs transition flex items-center gap-1"
                    >
                      <Icons.Eye className="h-3 w-3" /> نشر المحدد ({selectedIds.length})
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* ===== قائمة الامتحانات ===== */}
        {filteredExams.length === 0 ? (
          <div className={`text-center py-20 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-sm border rounded-3xl`}>
            <Icons.FileText className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-400'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {searchQuery || filterStatus !== 'all' || filterCourse !== 'all' || filterBank !== 'all'
                ? 'لا توجد نتائج تطابق البحث'
                : 'لا توجد امتحانات بعد'}
            </h3>
            <p className={`${isDark ? 'text-gray-400' : 'text-gray-600'} text-sm mt-2`}>
              {searchQuery || filterStatus !== 'all' || filterCourse !== 'all' || filterBank !== 'all'
                ? 'حاول تغيير معايير البحث'
                : 'قم بإنشاء أول امتحان لك'}
            </p>
            {!searchQuery && filterStatus === 'all' && filterCourse === 'all' && filterBank === 'all' && (
              hasPermission(permissions, 'exams', 'can_create') && (
                <button
                  onClick={handleCreate}
                  className="mt-4 px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
                >
                  إنشاء امتحان الآن
                </button>
              )
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredExams.map((exam, index) => (
              <ExamCard
                key={exam.id}
                exam={exam}
                index={index}
                courseTitle={courses[exam.course_id]}
                onEdit={handleEdit}
                onTogglePublish={togglePublish}
                onManageQuestions={handleManageQuestions}
                onViewResults={handleViewResults}
                onDuplicate={handleDuplicate}
                onViewBank={handleViewBank}
                permissions={permissions}
                isAssistant={true}
                styles={{ card: isDark ? 'bg-[#1a1f2e]' : 'bg-white', border: isDark ? 'border-white/20' : 'border-gray-200', text: isDark ? 'text-white' : 'text-gray-900', subtext: isDark ? 'text-gray-400' : 'text-gray-600' }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== روابط سريعة ===== */}
      <div className={`mt-6 ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/90 border-gray-200'} backdrop-blur-sm border rounded-2xl p-4`}>
        <h3 className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-gray-900'} mb-2 flex items-center gap-2`}>
          <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/assistant" className={`text-xs ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'} px-3 py-1.5 rounded-lg transition`}>الرئيسية</Link>
          <Link href="/dashboard/assistant/courses" className={`text-xs ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'} px-3 py-1.5 rounded-lg transition`}>الكورسات</Link>
          <Link href="/dashboard/assistant/videos" className={`text-xs ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'} px-3 py-1.5 rounded-lg transition`}>الفيديوهات</Link>
          <Link href="/dashboard/assistant/books" className={`text-xs ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'} px-3 py-1.5 rounded-lg transition`}>الكتب</Link>
          <Link href="/dashboard/assistant/students" className={`text-xs ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700 hover:text-gray-900'} px-3 py-1.5 rounded-lg transition`}>الطلاب</Link>
          <Link href="/dashboard/assistant/question-bank" className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition text-purple-300 hover:text-purple-200">بنوك الأسئلة</Link>
        </div>
      </div>
    </AssistantLayout>
  );
}

// ============================================================
// التصدير مع Suspense boundary
// ============================================================
export default function AssistantExamsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-[#0b0e1a]">
        <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    }>
      <AssistantExamsPageContent />
    </Suspense>
  );
}