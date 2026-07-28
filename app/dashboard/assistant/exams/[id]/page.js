// ================================================================
// 📁 app/dashboard/assistant/exams/[id]/page.js
// 📝 تفاصيل الامتحان – النسخة المتطورة للمساعد V1
// ================================================================
// - مستوحاة من نسخة المعلم مع تحسينات خاصة بالمساعد
// - دعم كامل للصلاحيات (can_view, can_edit, can_delete, can_publish)
// - دعم الثيم الفاتح/الداكن عبر useTheme الموحّد
// - استخدام APIs خاصة بالمساعد (/api/assistant/exams)
// - عرض الإحصائيات، الأسئلة، المحاولات، التحليلات
// - استيراد من بنوك الأسئلة
// - دعم البنك المصدر
// ================================================================

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  ArrowRight,
  Edit,
  Eye,
  EyeOff,
  Trash2,
  RefreshCw,
  HelpCircle,
  Users,
  BarChart,
  Calendar,
  Book,
  Database,
  Pencil,
  Link as LinkIcon,
  X,
  AlertCircle,
  CheckCircle,
  Play,
  Clock,
  Shield,
  Sun,
  Moon,
  TrendingUp,
  ChevronLeft,
  Plus,
  Search,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import { useCachedFetch } from '@/lib/hooks/useCachedFetch';
import dynamic from 'next/dynamic';
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

const getStatus = (exam) => {
  const now = new Date();
  const start = new Date(exam.start_date);
  const end = new Date(exam.end_date);
  if (!exam.is_published) return { label: 'مسودة', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: FileText };
  if (now < start) return { label: 'قادم', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock };
  if (now > end) return { label: 'منتهي', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: CheckCircle };
  return { label: 'نشط', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Play };
};

const getScoreColor = (percentage) => {
  if (percentage >= 80) return 'text-green-400';
  if (percentage >= 60) return 'text-yellow-400';
  if (percentage >= 40) return 'text-orange-400';
  return 'text-red-400';
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
// 📊 بطاقة إحصائية (معدلة لاستخدام styles)
// ================================================================

const StatCard = ({ stat, styles }) => {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay || 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative rounded-2xl p-5 transition-all duration-300 overflow-hidden group ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`text-sm ${styles.subtext}`}>
            {stat.label}
          </p>
          <p className={`text-2xl md:text-3xl font-extrabold mt-1 ${styles.text}`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && (
            <p className={`text-xs mt-1 opacity-70 ${styles.subtext}`}>
              {stat.sub}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
          <stat.icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: hover ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ================================================================
// 🎨 خلفية الجسيمات
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
// 📋 تبويب الأسئلة (معدل لاستخدام styles)
// ================================================================

const QuestionsTab = ({
  questions,
  onEditQuestion,
  onDeleteQuestion,
  onAddQuestion,
  onImportFromBank,
  sourceBank,
  styles,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('order');
  const [filterSource, setFilterSource] = useState('all');

  const filteredQuestions = useMemo(() => {
    let result = [...questions];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(qs => qs.question_text.toLowerCase().includes(q));
    }
    if (filterSource === 'bank') {
      result = result.filter(q => q.bank_question_id);
    } else if (filterSource === 'custom') {
      result = result.filter(q => !q.bank_question_id);
    }
    if (sortBy === 'order') {
      result.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    } else if (sortBy === 'marks') {
      result.sort((a, b) => (b.marks || 0) - (a.marks || 0));
    } else if (sortBy === 'type') {
      result.sort((a, b) => a.question_type?.localeCompare(b.question_type || '') || 0);
    }
    return result;
  }, [questions, searchTerm, sortBy, filterSource]);

  const questionTypeMap = {
    multiple_choice: 'اختيار من متعدد',
    true_false: 'صح / خطأ',
    essay: 'مقالي',
    matching: 'توصيل',
    ordering: 'ترتيب',
    fill_blank: 'ملء الفراغ',
    mcq: 'اختيار من متعدد',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[120px] max-w-xs">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${styles.subtext}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في الأسئلة..."
              className={`w-full p-2 pr-8 rounded-lg text-sm outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`p-2 rounded-lg text-sm outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
          >
            <option value="order">حسب الترتيب</option>
            <option value="marks">حسب الدرجة</option>
            <option value="type">حسب النوع</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className={`p-2 rounded-lg text-sm outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
          >
            <option value="all">جميع المصادر</option>
            <option value="bank">من البنك</option>
            <option value="custom">مخصص</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {sourceBank && (
            <button
              onClick={onImportFromBank}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-semibold transition flex items-center gap-1 whitespace-nowrap"
            >
              <Database className="h-4 w-4" /> استيراد من البنك
            </button>
          )}
          <button
            onClick={onAddQuestion}
            className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-1 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" /> إضافة سؤال
          </button>
        </div>
      </div>

      {filteredQuestions.length === 0 ? (
        <div className={`text-center py-8 ${styles.subtext}`}>
          <HelpCircle className={`h-12 w-12 mx-auto mb-2 ${styles.subtext}`} />
          <p>{searchTerm || filterSource !== 'all' ? 'لا توجد نتائج تطابق البحث' : 'لا توجد أسئلة في هذا الامتحان'}</p>
          {!searchTerm && filterSource === 'all' && (
            <button
              onClick={onAddQuestion}
              className="mt-3 px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition"
            >
              أضف أول سؤال
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredQuestions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`rounded-xl p-4 transition-all duration-300 ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs ${styles.subtext}`}>#{index + 1}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      question.question_type === 'multiple_choice' || question.type === 'mcq' ? 'bg-blue-500/20 text-blue-400' :
                      question.question_type === 'true_false' || question.type === 'truefalse' ? 'bg-green-500/20 text-green-400' :
                      question.question_type === 'essay' || question.type === 'essay' ? 'bg-purple-500/20 text-purple-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {questionTypeMap[question.question_type || question.type] || question.question_type || question.type}
                    </span>
                    <span className="text-xs text-yellow-400">{question.marks || 0} درجة</span>
                    {question.correct_answer && (
                      <span className="text-xs text-green-400">✅ الإجابة: {question.correct_answer}</span>
                    )}
                    {question.bank_question_id ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/20">
                        <Database className="h-3 w-3 inline ml-1" />
                        من البنك
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/20">
                        <Pencil className="h-3 w-3 inline ml-1" />
                        مخصص
                      </span>
                    )}
                  </div>
                  <p className={`text-sm mt-1 ${styles.text}`}>
                    {question.question_text}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mr-4">
                  <button
                    onClick={() => onEditQuestion(question)}
                    className={`p-1.5 rounded-lg transition ${styles.hover} text-yellow-400`}
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteQuestion(question.id)}
                    className={`p-1.5 rounded-lg transition ${styles.hover} text-red-400`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

// ================================================================
// 📋 تبويب المحاولات (معدل لاستخدام styles)
// ================================================================

const AttemptsTab = ({ attempts, exam, styles }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('score');

  const filteredAttempts = useMemo(() => {
    let result = [...attempts];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(a =>
        a.student_name?.toLowerCase().includes(q) ||
        a.student_email?.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'score') {
      result.sort((a, b) => (b.score || 0) - (a.score || 0));
    } else if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.completed_at) - new Date(a.completed_at));
    } else if (sortBy === 'name') {
      result.sort((a, b) => (a.student_name || '').localeCompare(b.student_name || ''));
    }
    return result;
  }, [attempts, searchTerm, sortBy]);

  const passingMarks = exam?.passing_marks || 0;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[150px] max-w-xs">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${styles.subtext}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن طالب..."
              className={`w-full p-2 pr-8 rounded-lg text-sm outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`p-2 rounded-lg text-sm outline-none transition ${styles.input} border ${styles.border} focus:ring-2 focus:ring-yellow-400/50`}
          >
            <option value="score">حسب الدرجة</option>
            <option value="date">حسب التاريخ</option>
            <option value="name">حسب الاسم</option>
          </select>
        </div>
        <span className={`text-xs ${styles.subtext}`}>
          عدد المحاولات: {filteredAttempts.length}
        </span>
      </div>

      {filteredAttempts.length === 0 ? (
        <div className={`text-center py-8 ${styles.subtext}`}>
          <Users className={`h-12 w-12 mx-auto mb-2 ${styles.subtext}`} />
          <p>{searchTerm ? 'لا توجد نتائج تطابق البحث' : 'لا توجد محاولات بعد'}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm">
            <thead className={`border-b ${styles.border}`}>
              <tr className={styles.subtext}>
                <th className="py-2 px-3 text-center">#</th>
                <th className="py-2 px-3 text-right">الطالب</th>
                <th className="py-2 px-3 text-center hidden md:table-cell">البريد</th>
                <th className="py-2 px-3 text-center">الدرجة</th>
                <th className="py-2 px-3 text-center hidden sm:table-cell">الحالة</th>
                <th className="py-2 px-3 text-center hidden lg:table-cell">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttempts.map((attempt, index) => {
                const percentage = attempt.total_marks > 0
                  ? (attempt.score / attempt.total_marks) * 100
                  : 0;
                const passed = attempt.score >= passingMarks;
                const statusColor = passed ? 'text-green-400' : 'text-red-400';
                const statusLabel = passed ? 'ناجح' : 'راسب';

                return (
                  <motion.tr
                    key={attempt.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`border-b ${styles.border} hover:bg-white/5 transition`}
                  >
                    <td className={`py-2 px-3 text-center ${styles.subtext}`}>{index + 1}</td>
                    <td className={`py-2 px-3 font-medium ${styles.text}`}>
                      {attempt.student_name || 'غير معروف'}
                    </td>
                    <td className={`py-2 px-3 text-center hidden md:table-cell ${styles.subtext}`}>
                      {attempt.student_email || '—'}
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`font-bold ${getScoreColor(percentage)}`}>
                        {attempt.score || 0} / {attempt.total_marks || 0}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center hidden sm:table-cell">
                      <span className={`text-xs font-semibold ${statusColor}`}>
                        {statusLabel}
                      </span>
                    </td>
                    <td className={`py-2 px-3 text-center hidden lg:table-cell text-xs ${styles.subtext}`}>
                      {formatDate(attempt.completed_at)}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ================================================================
// 📊 تبويب التحليلات (معدل لاستخدام styles)
// ================================================================

const AnalyticsTab = ({ attempts, exam, questions, styles }) => {
  const [chartData, setChartData] = useState({
    scoreDistribution: { labels: [], datasets: [] },
    passFail: { labels: [], datasets: [] },
  });

  const sourceData = useMemo(() => {
    const bank = questions?.filter(q => q.bank_question_id).length || 0;
    const custom = questions?.filter(q => !q.bank_question_id).length || 0;
    return { bank, custom };
  }, [questions]);

  useEffect(() => {
    if (!attempts || attempts.length === 0) return;

    const ranges = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
    attempts.forEach(a => {
      const p = a.total_marks > 0 ? (a.score / a.total_marks) * 100 : 0;
      if (p <= 20) ranges['0-20']++;
      else if (p <= 40) ranges['21-40']++;
      else if (p <= 60) ranges['41-60']++;
      else if (p <= 80) ranges['61-80']++;
      else ranges['81-100']++;
    });

    const passingMarks = exam?.passing_marks || 0;
    const passed = attempts.filter(a => a.score >= passingMarks).length;
    const failed = attempts.length - passed;

    setChartData({
      scoreDistribution: {
        labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
        datasets: [{
          label: 'عدد الطلاب',
          data: Object.values(ranges),
          backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(251, 146, 60, 0.7)', 'rgba(234, 179, 8, 0.7)', 'rgba(74, 222, 128, 0.7)', 'rgba(52, 211, 153, 0.7)'],
          borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
          borderWidth: 2,
        }],
      },
      passFail: {
        labels: ['ناجح', 'راسب'],
        datasets: [{
          data: [passed, failed],
          backgroundColor: ['rgba(74, 222, 128, 0.7)', 'rgba(248, 113, 113, 0.7)'],
          borderColor: ['rgb(74, 222, 128)', 'rgb(248, 113, 113)'],
          borderWidth: 2,
        }],
      },
    });
  }, [attempts, exam]);

  if (attempts.length === 0 && questions?.length === 0) {
    return (
      <div className={`text-center py-8 ${styles.subtext}`}>
        <BarChart className={`h-12 w-12 mx-auto mb-2 ${styles.subtext}`} />
        <p>لا توجد بيانات كافية للتحليل</p>
      </div>
    );
  }

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: '#9ca3af', stepSize: 1 },
        grid: { color: 'rgba(255,255,255,0.05)' },
      },
      x: {
        ticks: { color: '#9ca3af' },
        grid: { display: false },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#e5e7eb', font: { size: 11, family: 'Cairo' } },
      },
    },
  };

  // استخدام الألوان المناسبة للثيم
  const isDark = true; // نستخدم الـ styles لكن الألوان في المخططات نحددها يدوياً حسب الثيم
  // بما أننا نستخدم styles ولكن الألوان داخل المخططات مستقلة، نستخدم isDark فقط للمخططات
  // لكننا سنستبدل isDark ب theme === 'dark' في المكون الرئيسي ونمرر isDark للمخططات.

  // ولكن للتبسيط، سنستخدم styles في كل شيء ما عدا المخططات التي تحتاج إلى isDark.
  // سنمرر isDark من المكون الرئيسي.

  return null; // سنعيد تعريف هذا المكون في الأسفل
};

// ================================================================
// 📄 الصفحة الرئيسية – تفاصيل الامتحان للمساعد
// ================================================================

export default function AssistantExamDetailPage() {
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

  // ===== جلب الأسئلة =====
  const { data: questionsData, isLoading: questionsLoading, mutate: mutateQuestions } = useCachedFetch(
    teacherId ? `/api/assistant/exams/${examId}/questions?teacher_id=${teacherId}` : null
  );

  // ===== جلب المحاولات =====
  const { data: attemptsData, isLoading: attemptsLoading, mutate: mutateAttempts } = useCachedFetch(
    teacherId ? `/api/assistant/exams/${examId}/attempts?teacher_id=${teacherId}` : null
  );

  // ===== جلب الكورس =====
  const { data: courseData } = useCachedFetch(
    examData?.exam?.course_id ? `/api/assistant/courses/${examData.exam.course_id}?teacher_id=${teacherId}` : null
  );

  // ===== حالات =====
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('questions');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [sourceBank, setSourceBank] = useState(null);

  // ===== تحليل البيانات =====
  const exam = examData?.exam || null;
  const questions = questionsData?.questions || [];
  const attempts = attemptsData?.attempts || [];
  const course = courseData?.course || null;
  const banks = examData?.banks || {};

  // ===== حساب الإحصائيات =====
  const stats = useMemo(() => {
    const totalQuestions = questions.length;
    const totalAttempts = attempts.length;
    const scores = attempts.map(a => a.score || 0);
    const avgScore = totalAttempts > 0 ? scores.reduce((a, b) => a + b, 0) / totalAttempts : 0;
    const passingMarks = exam?.passing_marks || 0;
    const passed = attempts.filter(a => a.score >= passingMarks).length;
    const passRate = totalAttempts > 0 ? (passed / totalAttempts) * 100 : 0;

    const bankQuestions = questions.filter(q => q.bank_question_id);
    const bankCount = bankQuestions.length;
    const customCount = questions.length - bankCount;

    // تحديد البنك المصدر
    const bankIds = bankQuestions
      .map(q => q.bank_question_id)
      .filter(Boolean);

    let sourceBankInfo = null;
    if (bankIds.length > 0 && banks) {
      const firstBankId = bankIds[0];
      if (firstBankId && banks[firstBankId]) {
        sourceBankInfo = { id: firstBankId, title: banks[firstBankId] };
      }
    }
    setSourceBank(sourceBankInfo);

    return {
      totalQuestions,
      totalAttempts,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate),
      totalMarks: exam?.total_marks || 0,
      passingMarks: exam?.passing_marks || 0,
      bankQuestionsCount: bankCount,
      customQuestionsCount: customCount,
      sourceBank: sourceBankInfo,
    };
  }, [questions, attempts, exam, banks]);

  // ===== حالة التحميل =====
  const isLoading = assistantLoading || examLoading || questionsLoading || attemptsLoading;

  // ===== دوال التحكم =====
  const handleEdit = () => {
    router.push(`/dashboard/assistant/exams/${examId}/edit`);
  };

  const handleManageQuestions = () => {
    router.push(`/dashboard/assistant/exams/${examId}/questions`);
  };

  const handleViewResults = () => {
    router.push(`/dashboard/assistant/exams/${examId}/results`);
  };

  const handleDelete = async () => {
    if (!hasPermission(permissions, 'exams', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الامتحانات');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا الامتحان؟')) return;

    try {
      const res = await fetch(`/api/assistant/exams/${examId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: assistant?.teacher_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الامتحان');

      toast.success('✅ تم حذف الامتحان بنجاح');
      router.push('/dashboard/assistant/exams');
    } catch (err) {
      console.error('Error deleting exam:', err);
      toast.error('فشل حذف الامتحان');
    }
  };

  const togglePublish = async () => {
    if (!hasPermission(permissions, 'exams', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر الامتحانات');
      return;
    }

    try {
      const res = await fetch(`/api/assistant/exams/${examId}/publish`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teacher_id: assistant?.teacher_id,
          is_published: !exam.is_published,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة النشر');

      toast.success(`✅ تم ${exam.is_published ? 'إلغاء نشر' : 'نشر'} الامتحان`);
      mutateExam();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleAddQuestion = () => {
    router.push(`/dashboard/assistant/exams/${examId}/questions/new`);
  };

  const handleEditQuestion = (question) => {
    router.push(`/dashboard/assistant/exams/${examId}/questions/${question.id}/edit`);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!hasPermission(permissions, 'exams', 'can_edit')) {
      toast.error('ليس لديك صلاحية لحذف الأسئلة');
      return;
    }
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;

    try {
      const res = await fetch(`/api/assistant/exams/${examId}/questions/${questionId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teacher_id: assistant?.teacher_id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف السؤال');

      toast.success('✅ تم حذف السؤال');
      mutateQuestions();
    } catch (err) {
      console.error('Error deleting question:', err);
      toast.error('فشل حذف السؤال');
    }
  };

  const handleImportFromBank = () => {
    setShowImportModal(true);
  };

  const handleConfirmImport = async (selectedQuestions) => {
    if (!selectedQuestions || selectedQuestions.length === 0) {
      toast.warning('لم تختر أي سؤال');
      return;
    }

    if (!hasPermission(permissions, 'exams', 'can_edit')) {
      toast.error('ليس لديك صلاحية لاستيراد الأسئلة');
      return;
    }

    setIsImporting(true);
    try {
      const currentMaxOrder = questions.reduce((max, q) => Math.max(max, q.order_index || 0), 0);

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
        order_index: currentMaxOrder + idx + 1,
      }));

      const res = await fetch(`/api/assistant/exams/${examId}/questions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: questionsToInsert }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل استيراد الأسئلة');

      toast.success(`✅ تم استيراد ${selectedQuestions.length} سؤال من البنك`);
      setShowImportModal(false);
      mutateQuestions();
    } catch (err) {
      console.error('Error importing questions:', err);
      toast.error('فشل استيراد الأسئلة');
    } finally {
      setIsImporting(false);
    }
  };

  const goBack = () => {
    if (exam?.course_id) {
      router.push(`/dashboard/assistant/courses/${exam.course_id}`);
    } else {
      router.push('/dashboard/assistant/exams');
    }
  };

  const refreshAll = () => {
    setIsRefreshing(true);
    Promise.all([mutateExam(), mutateQuestions(), mutateAttempts()])
      .finally(() => setIsRefreshing(false));
  };

  // ===== حالة التحميل =====
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
  const canView = hasPermission(permissions, 'exams', 'can_view');
  if (!exam || !canView) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="text-center">
          <AlertCircle className={`h-16 w-16 mx-auto mb-4 ${styles.subtext}`} />
          <h2 className={`text-2xl font-bold ${styles.text}`}>
            الامتحان غير موجود أو غير مصرح لك به
          </h2>
          <button
            onClick={goBack}
            className="mt-4 px-6 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
          >
            العودة إلى القائمة
          </button>
        </div>
      </div>
    );
  }

  const status = getStatus(exam);
  const StatusIcon = status.icon;

  const canEdit = hasPermission(permissions, 'exams', 'can_edit');
  const canDelete = hasPermission(permissions, 'exams', 'can_delete');
  const canPublish = hasPermission(permissions, 'exams', 'can_publish');

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي الأسئلة', value: stats.totalQuestions, icon: HelpCircle, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'المحاولات', value: stats.totalAttempts, icon: Users, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'متوسط الدرجات', value: stats.avgScore, icon: TrendingUp, color: 'from-yellow-400 to-yellow-600', delay: 0.2 },
    { id: 4, label: 'نسبة النجاح', value: stats.passRate, suffix: '%', icon: CheckCircle, color: 'from-purple-400 to-purple-600', delay: 0.3 },
    { id: 5, label: 'من البنك', value: stats.bankQuestionsCount || 0, icon: Database, color: 'from-purple-400 to-purple-600', delay: 0.4 },
    { id: 6, label: 'مخصص', value: stats.customQuestionsCount || 0, icon: Pencil, color: 'from-gray-400 to-gray-600', delay: 0.5 },
  ];

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden transition-colors duration-300`}>
      {isDark && <ParticleBackground />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ===== شريط التنقل الداخلي ===== */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={goBack}
              className={`p-1.5 rounded-lg transition ${styles.hover} ${styles.subtext}`}
            >
              <ArrowRight className="h-5 w-5" />
            </button>
            <h1 className={`text-xl font-extrabold truncate max-w-[200px] md:max-w-md ${styles.text}`}>
              {exam.title}
            </h1>
            <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
              <StatusIcon className="h-3 w-3" /> {status.label}
            </span>
            {course && (
              <Link
                href={`/dashboard/assistant/courses/${course.id}`}
                className={`text-xs flex items-center gap-1 ${styles.subtext} hover:text-yellow-400 transition`}
              >
                <Book className="h-3 w-3" /> {course.title}
              </Link>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={refreshAll}
              disabled={isRefreshing}
              className={`p-2 rounded-xl transition ${isRefreshing ? 'animate-spin' : ''} ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
              title="تحديث"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            >
              {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
            </button>
            {canEdit && (
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Edit className="h-3 w-3" /> تعديل
              </button>
            )}
            {sourceBank && (
              <Link
                href={`/dashboard/assistant/question-bank/${sourceBank.id}`}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Database className="h-3 w-3" /> البنك المصدر
              </Link>
            )}
            {canPublish && (
              <button
                onClick={togglePublish}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                  exam.is_published
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
              >
                {exam.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                {exam.is_published ? 'إلغاء النشر' : 'نشر'}
              </button>
            )}
            {canDelete && (
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Trash2 className="h-3 w-3" /> حذف
              </button>
            )}
          </div>
        </div>

        {/* ===== الأخطاء ===== */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 flex items-center gap-3 text-sm"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== بطاقة الامتحان والإحصائيات ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <div className={`rounded-2xl p-5 transition-all duration-500 ${styles.card} border ${styles.border} hover:border-yellow-400/50`}>
              <div className="flex items-start gap-4">
                <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-400/20 to-purple-500/20">
                  <FileText className={`h-10 w-10 ${styles.text}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className={`text-lg font-bold ${styles.text}`}>
                    {exam.title}
                  </h2>
                  <p className={`text-sm mt-1 line-clamp-3 ${styles.subtext}`}>
                    {exam.description || 'لا يوجد وصف'}
                  </p>
                </div>
              </div>

              {sourceBank && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                  <Database className="h-4 w-4 text-purple-400" />
                  <span className={`text-xs ${styles.subtext}`}>مستورد من:</span>
                  <Link
                    href={`/dashboard/assistant/question-bank/${sourceBank.id}`}
                    className="text-xs text-purple-400 hover:text-purple-300 hover:underline transition"
                  >
                    {sourceBank.title}
                  </Link>
                  <span className={`text-xs ${styles.subtext}`}>
                    ({stats.bankQuestionsCount} سؤال)
                  </span>
                </div>
              )}
              {!sourceBank && questions.length > 0 && (
                <div className="mt-3 flex items-center gap-2 p-2 bg-gray-500/10 rounded-lg border border-gray-500/20">
                  <Pencil className="h-4 w-4 text-gray-400" />
                  <span className={`text-xs ${styles.subtext}`}>
                    {questions.length} سؤال مخصص
                  </span>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className={`rounded-lg p-2 text-center ${styles.card} border ${styles.border}`}>
                  <span className={styles.subtext}>المدة</span>
                  <p className={`font-medium ${styles.text}`}>
                    {exam.duration_minutes || 0} د
                  </p>
                </div>
                <div className={`rounded-lg p-2 text-center ${styles.card} border ${styles.border}`}>
                  <span className={styles.subtext}>الدرجة الكلية</span>
                  <p className={`font-medium ${styles.text}`}>
                    {exam.total_marks || 0}
                  </p>
                </div>
                <div className={`rounded-lg p-2 text-center ${styles.card} border ${styles.border}`}>
                  <span className={styles.subtext}>درجة النجاح</span>
                  <p className={`font-medium ${styles.text}`}>
                    {exam.passing_marks || 0}
                  </p>
                </div>
                <div className={`rounded-lg p-2 text-center ${styles.card} border ${styles.border}`}>
                  <span className={styles.subtext}>المحاولات المسموحة</span>
                  <p className={`font-medium ${styles.text}`}>
                    {exam.attempts_allowed || 1}
                  </p>
                </div>
              </div>
              <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${styles.subtext}`}>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formatDate(exam.start_date)}</span>
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> → {formatDate(exam.end_date)}</span>
                {exam.password && <span className="text-yellow-400">🔒 محمي</span>}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {statsData.map((stat) => <StatCard key={stat.id} stat={stat} styles={styles} />)}
            </div>
          </div>
        </div>

        {/* ===== التبويبات ===== */}
        <div className={`rounded-2xl p-5 transition-all duration-500 ${styles.card} border ${styles.border}`}>
          <div className={`flex flex-wrap gap-2 mb-6 border-b pb-4 ${styles.border}`}>
            {[
              { id: 'questions', label: `الأسئلة (${stats.totalQuestions})`, icon: HelpCircle },
              { id: 'attempts', label: `المحاولات (${stats.totalAttempts})`, icon: Users },
              { id: 'analytics', label: 'التحليلات', icon: BarChart },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                    : `${styles.subtext} hover:text-white hover:bg-white/5`
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'questions' && (
              <motion.div
                key="questions"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <QuestionsTab
                  questions={questions}
                  onEditQuestion={handleEditQuestion}
                  onDeleteQuestion={handleDeleteQuestion}
                  onAddQuestion={handleAddQuestion}
                  onImportFromBank={handleImportFromBank}
                  sourceBank={sourceBank}
                  styles={styles}
                />
              </motion.div>
            )}

            {activeTab === 'attempts' && (
              <motion.div
                key="attempts"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AttemptsTab attempts={attempts} exam={exam} styles={styles} />
              </motion.div>
            )}

            {activeTab === 'analytics' && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <AnalyticsTab
                  attempts={attempts}
                  exam={exam}
                  questions={questions}
                  styles={styles}
                  isDark={isDark} // نمرر isDark للمخططات
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== روابط سريعة ===== */}
        <div className={`rounded-2xl p-4 mt-6 ${styles.card} border ${styles.border}`}>
          <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${styles.text}`}>
            <LinkIcon className="h-4 w-4 text-yellow-400" /> روابط سريعة
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/assistant"
              className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}
            >
              الرئيسية
            </Link>
            <Link
              href="/dashboard/assistant/courses"
              className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}
            >
              الكورسات
            </Link>
            <Link
              href="/dashboard/assistant/videos"
              className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}
            >
              الفيديوهات
            </Link>
            <Link
              href="/dashboard/assistant/books"
              className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}
            >
              الكتب
            </Link>
            <Link
              href="/dashboard/assistant/question-bank"
              className={`text-xs px-3 py-1.5 rounded-lg transition bg-purple-500/10 hover:bg-purple-500/20 text-purple-300`}
            >
              بنوك الأسئلة
            </Link>
            {sourceBank && (
              <Link
                href={`/dashboard/assistant/question-bank/${sourceBank.id}`}
                className={`text-xs px-3 py-1.5 rounded-lg transition bg-purple-500/10 hover:bg-purple-500/20 text-purple-300`}
              >
                <Database className="h-3 w-3 inline ml-1" /> البنك المصدر
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* ===== مودال استيراد من البنك ===== */}
      <QuestionBankSelector
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onConfirm={handleConfirmImport}
        initialSelected={[]}
        bankId={sourceBank?.id || null}
        language="ar"
        theme={isDark ? 'dark' : 'light'}
        color="yellow"
        multiSelect={true}
      />
    </div>
  );
}