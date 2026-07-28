// ============================================================
// app/dashboard/teacher/exams/[id]/page.js
// تفاصيل الامتحان – مركز القيادة المتكامل V9 (مع دعم القطع)
// ✅ تم تعديلها لاستخدام الثيم المركزي (useTheme)
// ✅ تم تصحيح الجداول: استخدام exam_questions بدلاً من questions
// ✅ تم استبعاد القطع النصية من الإحصائيات والعدادات
// ✅ تم عرض القطع بشكل منفصل مع عدد الأسئلة التابعة
// ✅ تباين عالٍ في الوضعين الفاتح والداكن
// ✅ تم تعديل مسار إضافة سؤال إلى إدارة الأسئلة (إزالة /new)
// ✅ تم تغيير اسم الزر إلى "إضافة سؤال" مع أيقونة Plus ولون أخضر
// ============================================================

'use client';

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import QuestionBankSelector from '@/components/QuestionBankSelector';
import { useTheme } from '@/lib/hooks/useTheme';
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
import { Bar, Doughnut, Line } from 'react-chartjs-2';

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

// ============================================================
// 1. خلفية الجسيمات (أنيقة) – لا تحتاج إلى ثيم
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
// 2. عداد متحرك – لا يحتاج إلى ثيم
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
// 3. بطاقة إحصائية – ✅ تستقبل styles من السياق
// ============================================================

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

// ============================================================
// 4. دوال مساعدة
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

const getStatus = (exam) => {
  const now = new Date();
  const start = new Date(exam.start_date);
  const end = new Date(exam.end_date);
  if (!exam.is_published) return { label: 'مسودة', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Icons.FileText };
  if (now < start) return { label: 'قادم', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Icons.Clock };
  if (now > end) return { label: 'منتهي', color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: Icons.Check };
  return { label: 'نشط', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Icons.Play };
};

const getScoreColor = (percentage) => {
  if (percentage >= 80) return 'text-green-400';
  if (percentage >= 60) return 'text-yellow-400';
  if (percentage >= 40) return 'text-orange-400';
  return 'text-red-400';
};

// ============================================================
// 5. مكون الأسئلة (تبويب) – ✅ يستقبل styles + استبعاد القطع
// ============================================================

const QuestionsTab = ({ 
  questions, 
  onEditQuestion, 
  onDeleteQuestion, 
  onAddQuestion, 
  onImportFromBank,
  examId,
  sourceBank,
  styles,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('order');
  const [filterSource, setFilterSource] = useState('all');

  // ✅ تعديل: استبعاد القطع من قائمة الأسئلة المعروضة
  const realQuestions = questions.filter(q => q.type !== 'passage');
  const passageList = questions.filter(q => q.type === 'passage');

  const filteredQuestions = useMemo(() => {
    let result = [...realQuestions];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(qs =>
        qs.question_text.toLowerCase().includes(q)
      );
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
      result.sort((a, b) => a.type?.localeCompare(b.type || '') || 0);
    }
    return result;
  }, [realQuestions, searchTerm, sortBy, filterSource]);

  const questionTypeMap = {
    multiple_choice: 'اختيار من متعدد',
    true_false: 'صح / خطأ',
    essay: 'مقالي',
    matching: 'توصيل',
    ordering: 'ترتيب',
    fill_blank: 'ملء الفراغ',
    mcq: 'اختيار من متعدد',
    fill_from_words: 'إكمال من كلمات',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[120px] max-w-xs">
            <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في الأسئلة..."
              className={`w-full p-2 pr-8 ${styles.input} border ${styles.border} rounded-lg ${styles.text} text-sm placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`p-2 ${styles.input} border ${styles.border} rounded-lg ${styles.text} text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="order">حسب الترتيب</option>
            <option value="marks">حسب الدرجة</option>
            <option value="type">حسب النوع</option>
          </select>
          <select
            value={filterSource}
            onChange={(e) => setFilterSource(e.target.value)}
            className={`p-2 ${styles.input} border ${styles.border} rounded-lg ${styles.text} text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
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
              <Icons.Database className="h-4 w-4" /> استيراد من البنك
            </button>
          )}
          {/* ✅ تم تعديل الزر إلى "إضافة سؤال" مع أيقونة Plus ولون أخضر */}
          <button
            onClick={onAddQuestion}
            className="px-5 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
          >
            <Icons.Plus className="h-4 w-4" />
            إضافة سؤال
          </button>
        </div>
      </div>

      {/* ✅ عرض القطع في الأعلى (إن وجدت) */}
      {passageList.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className={`text-xs font-semibold ${styles.subtext} flex items-center gap-2`}>
            <Icons.BookOpen className="h-4 w-4 text-indigo-400" />
            القطع النصية
          </p>
          {passageList.map((passage, idx) => (
            <div key={passage.id} className={`${styles.card} border ${styles.border} rounded-xl p-3 bg-indigo-500/5 border-indigo-500/20`}>
              <div className="flex items-center gap-2">
                <Icons.BookOpen className="h-4 w-4 text-indigo-400" />
                <span className={`text-xs font-medium ${styles.text}`}>📄 قطعة #{idx + 1}</span>
                <span className={`text-xs ${styles.subtext}`}>(بدون درجة)</span>
                <span className={`text-xs ${styles.subtext} mr-auto`}>
                  {questions.filter(q => q.passage_id === passage.id).length} سؤال تابع
                </span>
              </div>
              <p className={`text-sm ${styles.text} mt-1 line-clamp-2`}>{passage.question_text}</p>
            </div>
          ))}
        </div>
      )}

      {filteredQuestions.length === 0 ? (
        <div className="text-center py-8">
          <Icons.HelpCircle className="h-12 w-12 text-gray-600 mx-auto mb-2" />
          <p className={styles.subtext}>
            {searchTerm || filterSource !== 'all' ? 'لا توجد نتائج تطابق البحث' : 'لا توجد أسئلة في هذا الامتحان'}
          </p>
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
              className={`${styles.card} border ${styles.border} rounded-xl p-4 hover:border-yellow-400/30 transition-all duration-300`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-gray-500">#{index + 1}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                      question.type === 'multiple_choice' || question.type === 'mcq' ? 'bg-blue-500/20 text-blue-400' :
                      question.type === 'true_false' || question.type === 'truefalse' ? 'bg-green-500/20 text-green-400' :
                      question.type === 'essay' ? 'bg-purple-500/20 text-purple-400' :
                      question.type === 'fill_from_words' ? 'bg-amber-500/20 text-amber-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {questionTypeMap[question.type] || question.type}
                    </span>
                    <span className="text-xs text-yellow-400">{question.marks || 0} درجة</span>
                    {question.correct_answer && (
                      <span className="text-xs text-green-400">✅ الإجابة: {question.correct_answer}</span>
                    )}
                    {question.bank_question_id ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-purple-500/20 text-purple-400 border border-purple-500/20">
                        <Icons.Database className="h-3 w-3 inline mr-1" />
                        من البنك
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-gray-500/20 text-gray-400 border border-gray-500/20">
                        <Icons.Pencil className="h-3 w-3 inline mr-1" />
                        مخصص
                      </span>
                    )}
                    {question.passage_id && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-indigo-500/20 text-indigo-400 border border-indigo-500/20">
                        <Icons.BookOpen className="h-3 w-3 inline mr-1" />
                        تابع لقطعة
                      </span>
                    )}
                  </div>
                  <p className={`${styles.text} text-sm mt-1`}>{question.question_text}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 mr-4">
                  <button
                    onClick={() => onEditQuestion(question)}
                    className="p-1.5 hover:bg-yellow-400/20 rounded-lg transition text-yellow-400 hover:text-yellow-300"
                  >
                    <Icons.Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => onDeleteQuestion(question.id)}
                    className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-red-400 hover:text-red-300"
                  >
                    <Icons.Trash2 className="h-4 w-4" />
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

// ============================================================
// 6. مكون محاولات الطلاب (تبويب) – ✅ يستقبل styles
// ============================================================

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
            <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث عن طالب..."
              className={`w-full p-2 pr-8 ${styles.input} border ${styles.border} rounded-lg ${styles.text} text-sm placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`p-2 ${styles.input} border ${styles.border} rounded-lg ${styles.text} text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
          >
            <option value="score">حسب الدرجة</option>
            <option value="date">حسب التاريخ</option>
            <option value="name">حسب الاسم</option>
          </select>
        </div>
        <span className={`text-xs ${styles.subtext}`}>عدد المحاولات: {filteredAttempts.length}</span>
      </div>

      {filteredAttempts.length === 0 ? (
        <div className="text-center py-8">
          <Icons.Users className="h-12 w-12 text-gray-600 mx-auto mb-2" />
          <p className={styles.subtext}>{searchTerm ? 'لا توجد نتائج تطابق البحث' : 'لا توجد محاولات بعد'}</p>
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
                    <td className="py-2 px-3 text-center text-gray-500">{index + 1}</td>
                    <td className={`py-2 px-3 ${styles.text} font-medium`}>{attempt.student_name || 'غير معروف'}</td>
                    <td className={`py-2 px-3 ${styles.subtext} text-center hidden md:table-cell`}>{attempt.student_email || '—'}</td>
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
                    <td className={`py-2 px-3 ${styles.subtext} text-center hidden lg:table-cell text-xs`}>
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

// ============================================================
// 7. مكون التحليلات (تبويب) – ✅ يستقبل styles + استبعاد القطع
// ============================================================

const AnalyticsTab = ({ attempts, exam, questions, styles, theme }) => {
  const [chartData, setChartData] = useState({
    scoreDistribution: { labels: [], datasets: [] },
    passFail: { labels: [], datasets: [] },
  });

  // ✅ استبعاد القطع من تحليل مصدر الأسئلة
  const realQuestions = questions.filter(q => q.type !== 'passage');
  const sourceData = useMemo(() => {
    const bank = realQuestions.filter(q => q.bank_question_id).length || 0;
    const custom = realQuestions.filter(q => !q.bank_question_id).length || 0;
    return { bank, custom, total: realQuestions.length };
  }, [realQuestions]);

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

  if (attempts.length === 0 && realQuestions.length === 0) {
    return (
      <div className="text-center py-8">
        <Icons.BarChart className="h-12 w-12 text-gray-600 mx-auto mb-2" />
        <p className={styles.subtext}>لا توجد بيانات كافية للتحليل</p>
      </div>
    );
  }

  const textColor = theme === 'dark' ? '#fff' : '#1f2937';

  return (
    <div className="space-y-6">
      {/* رسوم بيانية للدرجات */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {attempts.length > 0 && (
          <>
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>توزيع درجات الطلاب</h3>
              <div className="h-56">
                <Bar
                  data={chartData.scoreDistribution}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: textColor },
                        grid: { color: 'rgba(255,255,255,0.05)' },
                      },
                      x: {
                        ticks: { color: textColor },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </div>
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>نسبة النجاح والرسوب</h3>
              <div className="h-56 max-w-xs mx-auto">
                <Doughnut
                  data={chartData.passFail}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                        labels: { color: textColor },
                      },
                    },
                  }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* تحليل مصدر الأسئلة (استبعاد القطع) */}
      {realQuestions.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
            <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>مصدر الأسئلة</h3>
            <div className="h-56 max-w-xs mx-auto">
              <Doughnut
                data={{
                  labels: ['من البنك', 'مخصص'],
                  datasets: [{
                    data: [sourceData.bank, sourceData.custom],
                    backgroundColor: ['rgba(168, 85, 247, 0.7)', 'rgba(156, 163, 175, 0.7)'],
                    borderColor: ['rgb(168, 85, 247)', 'rgb(156, 163, 175)'],
                    borderWidth: 2,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: { color: textColor },
                    },
                  },
                }}
              />
            </div>
          </div>
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-5 flex flex-col justify-center items-center`}>
            <div className="grid grid-cols-2 gap-6 w-full max-w-xs">
              <div className="text-center">
                <p className="text-2xl font-bold text-purple-400">{sourceData.bank}</p>
                <p className={`text-xs ${styles.subtext}`}>من البنك</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-gray-400">{sourceData.custom}</p>
                <p className={`text-xs ${styles.subtext}`}>مخصص</p>
              </div>
            </div>
            <p className={`text-xs ${styles.subtext} mt-4`}>إجمالي الأسئلة: {sourceData.total}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// 8. الصفحة الرئيسية – تفاصيل الامتحان
// ============================================================

export default function TeacherExamDetailPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id;

  // ✅ استخدام الثيم المركزي
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();

  // ===== حالات عامة =====
  const [exam, setExam] = useState(null);
  const [course, setCourse] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('questions');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ===== ربط ببنوك الأسئلة =====
  const [sourceBank, setSourceBank] = useState(null);
  const [bankQuestionsCount, setBankQuestionsCount] = useState(0);
  const [customQuestionsCount, setCustomQuestionsCount] = useState(0);
  const [passageCount, setPassageCount] = useState(0); // ✅ إضافة: عدد القطع

  // ===== مودال استيراد من البنك =====
  const [showImportModal, setShowImportModal] = useState(false);

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    totalQuestions: 0,
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
    totalMarks: 0,
    passingMarks: 0,
    bankQuestionsCount: 0,
    customQuestionsCount: 0,
    sourceBank: null,
    passageCount: 0,
  });

  // ===== جلب البيانات =====
  const fetchExamData = useCallback(async () => {
    setIsRefreshing(true);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. جلب الامتحان
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();

      if (examError) throw examError;
      if (!examData) {
        router.push('/dashboard/teacher/exams');
        return;
      }

      if (examData.teacher_id !== user.id) {
        toast.error('غير مصرح لك بمشاهدة هذا الامتحان');
        router.push('/dashboard/teacher/exams');
        return;
      }

      setExam(examData);

      // 2. جلب الكورس المرتبط
      if (examData.course_id) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', examData.course_id)
          .single();
        setCourse(courseData);
      }

      // 3. جلب الأسئلة من جدول exam_questions
      const { data: questionsData } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });

      setQuestions(questionsData || []);

      // ✅ استبعاد القطع من الإحصائيات
      const realQuestions = (questionsData || []).filter(q => q.type !== 'passage');
      const passages = (questionsData || []).filter(q => q.type === 'passage');
      const passageCount = passages.length;

      // 3.5. جلب معلومات البنوك المصدر للأسئلة (من جدول questions الأصلي) – للأسئلة الفعلية فقط
      let bankInfo = null;
      let bankCount = 0;
      let customCount = 0;
      const bankIds = new Set();

      if (realQuestions.length > 0) {
        const bankQuestionIds = realQuestions
          .filter(q => q.bank_question_id)
          .map(q => q.bank_question_id)
          .filter(Boolean);
        
        if (bankQuestionIds.length > 0) {
          const { data: originalQuestions } = await supabase
            .from('questions')
            .select('bank_id')
            .in('id', bankQuestionIds);
          
          originalQuestions?.forEach(q => {
            if (q.bank_id) bankIds.add(q.bank_id);
          });
          
          const uniqueBankIds = [...bankIds];
          if (uniqueBankIds.length > 0) {
            const { data: banksData } = await supabase
              .from('question_banks')
              .select('id, title, description')
              .in('id', uniqueBankIds);
            
            if (banksData && banksData.length > 0) {
              bankInfo = banksData[0];
            }
          }
          
          bankCount = bankQuestionIds.length;
        }
        
        customCount = realQuestions.filter(q => !q.bank_question_id).length;
      }

      setSourceBank(bankInfo);
      setBankQuestionsCount(bankCount);
      setCustomQuestionsCount(customCount);
      setPassageCount(passageCount);

      // 4. جلب محاولات الطلاب
      const { data: attemptsData } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          profiles:student_id (full_name, email)
        `)
        .eq('exam_id', examId)
        .eq('status', 'completed')
        .order('score', { ascending: false });

      const processedAttempts = (attemptsData || []).map(a => ({
        ...a,
        student_name: a.profiles?.full_name || 'طالب',
        student_email: a.profiles?.email || '',
      }));
      setAttempts(processedAttempts);

      // 5. حساب الإحصائيات
      const totalQuestions = realQuestions.length;
      const totalAttempts = processedAttempts.length;
      const scores = processedAttempts.map(a => a.score || 0);
      const avgScore = totalAttempts > 0
        ? scores.reduce((a, b) => a + b, 0) / totalAttempts
        : 0;
      const passingMarks = examData.passing_marks || 0;
      const passed = processedAttempts.filter(a => a.score >= passingMarks).length;
      const passRate = totalAttempts > 0 ? (passed / totalAttempts) * 100 : 0;

      setStats({
        totalQuestions,
        totalAttempts,
        avgScore: Math.round(avgScore),
        passRate: Math.round(passRate),
        totalMarks: examData.total_marks || 0,
        passingMarks: examData.passing_marks || 0,
        bankQuestionsCount: bankCount,
        customQuestionsCount: customCount,
        sourceBank: bankInfo,
        passageCount,
      });

    } catch (err) {
      console.error('Error fetching exam data:', err);
      setError('فشل جلب بيانات الامتحان: ' + err.message);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [examId, router]);

  useEffect(() => {
    if (examId) fetchExamData();
  }, [examId, fetchExamData]);

  // ===== دوال الإدارة =====
  const handleEdit = () => {
    router.push(`/dashboard/teacher/exams/${examId}/edit`);
  };

  const handleManageQuestions = () => {
    router.push(`/dashboard/teacher/exams/${examId}/questions`);
  };

  const handleViewResults = () => {
    router.push(`/dashboard/teacher/exams/${examId}/results`);
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الامتحان؟')) return;
    try {
      const { error } = await supabase
        .from('exams')
        .delete()
        .eq('id', examId);
      if (error) throw error;
      toast.success('✅ تم حذف الامتحان بنجاح');
      router.push('/dashboard/teacher/exams');
    } catch (err) {
      console.error('Error deleting exam:', err);
      toast.error('فشل حذف الامتحان');
    }
  };

  const togglePublish = async () => {
    try {
      const { error } = await supabase
        .from('exams')
        .update({ is_published: !exam.is_published })
        .eq('id', examId);
      if (error) throw error;
      toast.success(`✅ تم ${exam.is_published ? 'إلغاء نشر' : 'نشر'} الامتحان`);
      fetchExamData();
    } catch (err) {
      toast.error('فشل تغيير حالة النشر');
    }
  };

  // ===== دوال الأسئلة =====
  // ✅ تم تعديل هذه الدالة لتوجيه المستخدم إلى صفحة إدارة الأسئلة بدلاً من إضافة سؤال جديد
  const handleAddQuestion = () => {
    router.push(`/dashboard/teacher/exams/${examId}/questions`);
  };

  const handleEditQuestion = (question) => {
    router.push(`/dashboard/teacher/exams/${examId}/questions/${question.id}/edit`);
  };

  const handleDeleteQuestion = async (questionId) => {
    if (!confirm('هل أنت متأكد من حذف هذا السؤال؟')) return;
    try {
      const { error } = await supabase
        .from('exam_questions')
        .delete()
        .eq('id', questionId);
      if (error) throw error;
      toast.success('✅ تم حذف السؤال');
      fetchExamData();
    } catch (err) {
      console.error('Error deleting question:', err);
      toast.error('فشل حذف السؤال');
    }
  };

  // ===== استيراد أسئلة إضافية من البنك =====
  const handleImportFromBank = () => {
    setShowImportModal(true);
  };

  const handleConfirmImport = async (selectedQuestions) => {
    if (!selectedQuestions || selectedQuestions.length === 0) {
      toast.warning('لم تختر أي سؤال');
      return;
    }

    setLoading(true);
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
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { error } = await supabase
        .from('exam_questions')
        .insert(questionsToInsert);

      if (error) throw error;

      toast.success(`✅ تم استيراد ${selectedQuestions.length} سؤال من البنك`);
      setShowImportModal(false);
      fetchExamData();
    } catch (err) {
      console.error('Error importing questions:', err);
      toast.error('فشل استيراد الأسئلة');
    } finally {
      setLoading(false);
    }
  };

  // ===== إعادة استيراد (استبدال جميع الأسئلة) =====
  const handleReimportFromBank = async (selectedQuestions) => {
    if (!sourceBank) return;
    if (!confirm('سيتم استبدال جميع أسئلة الامتحان الحالية بأسئلة جديدة من البنك. هل أنت متأكد؟')) return;
    
    setLoading(true);
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
      
      toast.success(`✅ تم استيراد ${selectedQuestions.length} سؤال من البنك`);
      setShowImportModal(false);
      fetchExamData();
    } catch (err) {
      console.error('Error reimporting:', err);
      toast.error('فشل إعادة الاستيراد من البنك');
    } finally {
      setLoading(false);
    }
  };

  // ===== دوال التنقل =====
  const goBack = () => {
    if (exam?.course_id) {
      router.push(`/dashboard/teacher/courses/${exam.course_id}`);
    } else {
      router.push('/dashboard/teacher/exams');
    }
  };

  // ===== حالة التحميل =====
  if (loading) {
    return (
      <TeacherLayout>
        <div className={`flex items-center justify-center py-20 ${styles.bg}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  if (!exam) {
    return (
      <TeacherLayout>
        <div className={`text-center py-20 ${styles.bg}`}>
          <Icons.AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg">الامتحان غير موجود</p>
          <button onClick={goBack} className="text-yellow-400 hover:underline mt-2">العودة</button>
        </div>
      </TeacherLayout>
    );
  }

  const status = getStatus(exam);
  const StatusIcon = status.icon;

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي الأسئلة', value: stats.totalQuestions, suffix: '', icon: Icons.HelpCircle, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'المحاولات', value: stats.totalAttempts, suffix: '', icon: Icons.Users, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'متوسط الدرجات', value: stats.avgScore, suffix: '', icon: Icons.TrendingUp, color: 'from-yellow-400 to-yellow-600', delay: 0.2 },
    { id: 4, label: 'نسبة النجاح', value: stats.passRate, suffix: '%', icon: Icons.CheckCircle, color: 'from-purple-400 to-purple-600', delay: 0.3 },
    { id: 5, label: 'من البنك', value: stats.bankQuestionsCount || 0, suffix: '', icon: Icons.Database, color: 'from-purple-400 to-purple-600', delay: 0.4 },
    { id: 6, label: 'مخصص', value: stats.customQuestionsCount || 0, suffix: '', icon: Icons.Pencil, color: 'from-gray-400 to-gray-600', delay: 0.5 },
    { id: 7, label: 'قطع نصية', value: stats.passageCount || 0, suffix: '', icon: Icons.BookOpen, color: 'from-indigo-400 to-indigo-600', delay: 0.6 },
  ];

  return (
    <TeacherLayout>
      <div className={`relative ${styles.bg}`}>
        <ParticleBackground />

        <div className="relative z-10">
          {/* ===== شريط التنقل الداخلي ===== */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={goBack}
                className="text-gray-400 hover:text-yellow-400 transition p-1.5"
              >
                <Icons.ArrowRight className="h-5 w-5" />
              </button>
              <h1 className={`text-xl font-extrabold ${styles.text} truncate max-w-[200px] md:max-w-md`}>
                {exam.title}
              </h1>
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                <StatusIcon className="h-3 w-3" /> {status.label}
              </span>
              {course && (
                <Link
                  href={`/dashboard/teacher/courses/${course.id}`}
                  className={`text-xs ${styles.subtext} hover:text-yellow-400 transition flex items-center gap-1`}
                >
                  <Icons.Book className="h-3 w-3" /> {course.title}
                </Link>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchExamData}
                disabled={isRefreshing}
                className={`p-2 rounded-xl transition ${isRefreshing ? 'animate-spin' : 'hover:bg-white/5'} ${styles.card} border ${styles.border}`}
                title="تحديث"
              >
                <Icons.RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Icons.Edit className="h-3 w-3" /> تعديل
              </button>
              {sourceBank && (
                <Link
                  href={`/dashboard/teacher/question-bank/${sourceBank.id}`}
                  className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
                >
                  <Icons.Database className="h-3 w-3" /> البنك المصدر
                </Link>
              )}
              <button
                onClick={togglePublish}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                  exam.is_published
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
              >
                {exam.is_published ? <Icons.EyeOff className="h-3 w-3" /> : <Icons.Eye className="h-3 w-3" />}
                {exam.is_published ? 'إلغاء النشر' : 'نشر'}
              </button>
              <button
                onClick={handleDelete}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Icons.Trash2 className="h-3 w-3" /> حذف
              </button>
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
                <Icons.AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                  <Icons.X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== بطاقة الامتحان والإحصائيات ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1">
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-5 hover:border-yellow-400/30 transition-all duration-500`}>
                <div className="flex items-start gap-4">
                  <div className="p-4 rounded-xl bg-gradient-to-br from-yellow-400/20 to-purple-500/20">
                    <Icons.FileText className="h-10 w-10 text-yellow-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className={`text-lg font-bold ${styles.text}`}>{exam.title}</h2>
                    <p className={`text-sm ${styles.subtext} mt-1 line-clamp-3`}>{exam.description || 'لا يوجد وصف'}</p>
                  </div>
                </div>

                {sourceBank && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
                    <Icons.Database className="h-4 w-4 text-purple-400" />
                    <span className={`text-xs ${styles.subtext}`}>مستورد من:</span>
                    <Link
                      href={`/dashboard/teacher/question-bank/${sourceBank.id}`}
                      className="text-xs text-purple-400 hover:text-purple-300 hover:underline transition"
                    >
                      {sourceBank.title}
                    </Link>
                    <span className={`text-xs ${styles.subtext}`}>({bankQuestionsCount} سؤال)</span>
                  </div>
                )}
                {!sourceBank && questions.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 p-2 bg-gray-500/10 rounded-lg border border-gray-500/20">
                    <Icons.Pencil className="h-4 w-4 text-gray-400" />
                    <span className={`text-xs ${styles.subtext}`}>{questions.filter(q => q.type !== 'passage').length} سؤال مخصص</span>
                  </div>
                )}

                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div className={`${styles.card} rounded-lg p-2 text-center`}>
                    <span className={styles.subtext}>المدة</span>
                    <p className={`font-medium ${styles.text}`}>{exam.duration_minutes || 0} د</p>
                  </div>
                  <div className={`${styles.card} rounded-lg p-2 text-center`}>
                    <span className={styles.subtext}>الدرجة الكلية</span>
                    <p className={`font-medium ${styles.text}`}>{exam.total_marks || 0}</p>
                  </div>
                  <div className={`${styles.card} rounded-lg p-2 text-center`}>
                    <span className={styles.subtext}>درجة النجاح</span>
                    <p className={`font-medium ${styles.text}`}>{exam.passing_marks || 0}</p>
                  </div>
                  <div className={`${styles.card} rounded-lg p-2 text-center`}>
                    <span className={styles.subtext}>المحاولات المسموحة</span>
                    <p className={`font-medium ${styles.text}`}>{exam.attempts_allowed || 1}</p>
                  </div>
                </div>
                <div className={`mt-3 flex flex-wrap items-center gap-2 text-xs ${styles.subtext}`}>
                  <span className="flex items-center gap-1"><Icons.Calendar className="h-3 w-3" /> {formatDate(exam.start_date)}</span>
                  <span className="flex items-center gap-1"><Icons.Calendar className="h-3 w-3" /> → {formatDate(exam.end_date)}</span>
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
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-5 hover:border-yellow-400/30 transition-all duration-500`}>
            <div className={`flex flex-wrap gap-2 mb-6 border-b ${styles.border} pb-4`}>
              {[
                { id: 'questions', label: `الأسئلة (${stats.totalQuestions})`, icon: Icons.HelpCircle },
                { id: 'attempts', label: `المحاولات (${stats.totalAttempts})`, icon: Icons.Users },
                { id: 'analytics', label: 'التحليلات', icon: Icons.BarChart },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/30'
                      : `${styles.subtext} hover:${styles.text} hover:bg-white/5`
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
                    onAddQuestion={handleAddQuestion}
                    onEditQuestion={handleEditQuestion}
                    onDeleteQuestion={handleDeleteQuestion}
                    onImportFromBank={handleImportFromBank}
                    examId={examId}
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
                  <AnalyticsTab attempts={attempts} exam={exam} questions={questions} styles={styles} theme={theme} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ===== روابط سريعة ===== */}
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 mt-6`}>
            <h3 className={`text-sm font-semibold ${styles.text} mb-2 flex items-center gap-2`}>
              <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/teacher" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الرئيسية</Link>
              <Link href="/dashboard/teacher/courses" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الكورسات</Link>
              <Link href="/dashboard/teacher/videos" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الفيديوهات</Link>
              <Link href="/dashboard/teacher/books" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الكتب</Link>
              <Link href="/dashboard/teacher/students" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.subtext} hover:${styles.text}`}>الطلاب</Link>
              {sourceBank && (
                <Link href={`/dashboard/teacher/question-bank/${sourceBank.id}`} className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition text-purple-300 hover:text-purple-200">البنك المصدر</Link>
              )}
            </div>
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
        language={language}
        theme={theme}
        color="yellow"
        multiSelect={true}
      />
    </TeacherLayout>
  );
}