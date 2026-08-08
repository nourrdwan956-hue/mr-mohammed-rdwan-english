// ================================================================
// 📁 app/dashboard/assistant/exams/[id]/results/page.js
// 📊 نتائج الامتحان – النسخة المتطورة للمساعد V2
// ================================================================
// - دعم كامل للصلاحيات (can_view)
// - دعم الثيم الموحّد عبر useTheme
// - استخدام AssistantLayout
// - عرض بيانات الطالب الكاملة (الاسم الرباعي، المدرسة، الصف، المحافظة، الهاتف، ولي الأمر)
// - نظام تصحيح متطور باستخدام gradeExam (يدعم الإجابات المتعددة)
// - تحليل أسئلة القطعة (مع تجميع الأداء)
// - تقارير أداء فردية متقدمة مع رسوم بيانية
// - تصدير تقرير PDF لكل طالب
// - جدول متابعة تقدم الطالب في جميع الامتحانات
// - التحكم في عدد المحاولات المسموحة لطالب معين
// - عرض المخالفات (عدد مرات الخروج من الامتحان)
// - مؤشر الأمان لكل طالب (Security Index)
// - أزرار التواصل مع الطالب وولي الأمر
// - إعادة تعيين محاولات طالب فردي
// - تباين عالٍ جداً في الوضعين الفاتح والداكن
// - تحديث مسارات التنقل من /dashboard/teacher/ إلى /dashboard/assistant/
// - استخدام useCachedFetch و useAssistantData مع x-assistant-id
// ================================================================

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
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
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import { useCachedFetch } from '@/lib/hooks/useCachedFetch';
import { AssistantLayout } from '@/components/AssistantLayout'; // ✅ استيراد AssistantLayout
import { gradeExam, calculateSecurityIndex } from '@/lib/examUtils';

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

const getScoreColor = (score, passingMarks) => {
  if (score >= passingMarks) return 'text-green-400';
  return 'text-red-400';
};

const getGrade = (percentage) => {
  if (percentage >= 90) return { label: 'ممتاز', color: 'text-green-400', emoji: '🌟' };
  if (percentage >= 75) return { label: 'جيد جداً', color: 'text-blue-400', emoji: '⭐' };
  if (percentage >= 60) return { label: 'جيد', color: 'text-yellow-400', emoji: '👍' };
  if (percentage >= 40) return { label: 'مقبول', color: 'text-orange-400', emoji: '📖' };
  return { label: 'ضعيف', color: 'text-red-400', emoji: '💪' };
};

// ================================================================
// 1. خلفية الجسيمات (أنيقة جداً) – تعتمد على الثيم
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
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.15 + 0.05,
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
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.03 * (1 - dist / 120)})`;
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
// 2. مكونات مساعدة (مع تباين عالٍ) – معدلة لاستخدام styles
// ================================================================

// 2.1 بطاقة إحصائية
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
      className={`relative ${styles.card} ${styles.cardBorder} rounded-2xl p-5 transition-all duration-300 hover:shadow-2xl overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`${styles.subtext} text-sm font-semibold`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1`}>
            {stat.value}{stat.suffix || ''}
          </p>
          {stat.sub && <p className={`text-xs ${styles.subtext} mt-1`}>{stat.sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/10 rounded-full overflow-hidden">
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

// 2.2 صف الطالب في الجدول (معدل لإضافة الأعمدة الجديدة)
const StudentRow = ({ 
  student, 
  index, 
  passingMarks, 
  onViewProfile, 
  onAdjustAttempts, 
  styles, 
  securityIndex,
  onViewStudentProfile
}) => {
  const percentage = student.total_marks > 0
    ? (student.score / student.total_marks) * 100
    : 0;
  const passed = student.score >= passingMarks;
  const grade = getGrade(percentage);
  const violations = student.proctoring_log?.violations || 0;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02 }}
      className={`border-b ${styles.borderColor} hover:bg-white/5 transition`}
    >
      <td className="py-3 px-4 text-center text-gray-400">{index + 1}</td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
            {student.full_name?.charAt(0) || 'ط'}
          </div>
          <div>
            <p className={`${styles.text} font-medium truncate max-w-[200px]`}>
              {student.full_name || 'غير معروف'}
            </p>
            <p className={`${styles.subtext} text-xs truncate max-w-[200px]`}>
              {student.email || ''}
            </p>
          </div>
        </div>
      </td>
      <td className="py-3 px-4 text-center hidden md:table-cell">
        <span className={`${styles.subtext} text-xs`}>{formatDate(student.completed_at)}</span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`font-bold ${getScoreColor(student.score, passingMarks)}`}>
          {student.score || 0} / {student.total_marks || 0}
        </span>
      </td>
      <td className="py-3 px-4 text-center hidden sm:table-cell">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${percentage >= 60 ? 'bg-green-400' : percentage >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
              style={{ width: `${Math.min(percentage, 100)}%` }}
            />
          </div>
          <span className={`${styles.subtext} text-xs`}>{Math.round(percentage)}%</span>
        </div>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`text-xs font-semibold ${passed ? 'text-green-400' : 'text-red-400'}`}>
          {passed ? 'ناجح ✅' : 'راسب ❌'}
        </span>
      </td>
      <td className="py-3 px-4 text-center hidden lg:table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full ${grade.color} bg-white/5`}>
          {grade.emoji} {grade.label}
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <span className={`text-xs ${styles.subtext}`}>{violations}</span>
      </td>
      {/* عمود ولي الأمر */}
      <td className="py-3 px-4 text-center hidden lg:table-cell">
        {student.parent_phone ? (
          <a href={`tel:${student.parent_phone}`} className="text-xs text-purple-400 hover:text-purple-300 transition flex items-center gap-1 justify-center">
            <Icons.Phone className="h-3 w-3" /> {student.parent_phone}
          </a>
        ) : (
          <span className="text-xs text-gray-500">—</span>
        )}
      </td>
      {/* عمود مؤشر الأمان */}
      <td className="py-3 px-4 text-center">
        <span className={`text-xs font-bold ${securityIndex >= 80 ? 'text-green-400' : securityIndex >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
          {Math.round(securityIndex)}%
        </span>
      </td>
      <td className="py-3 px-4 text-center">
        <div className="flex items-center gap-1 justify-center">
          <button
            onClick={() => onViewProfile(student)}
            className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300"
            title="عرض التقرير"
          >
            <Icons.Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => onAdjustAttempts(student)}
            className="p-1.5 hover:bg-yellow-500/20 rounded-lg transition text-yellow-400 hover:text-yellow-300"
            title="تعديل المحاولات"
          >
            <Icons.Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewStudentProfile(student.id)}
            className="p-1.5 hover:bg-indigo-500/20 rounded-lg transition text-indigo-400 hover:text-indigo-300"
            title="عرض ملف الطالب"
          >
            <Icons.User className="h-4 w-4" />
          </button>
          <a
            href={`mailto:${student.email}`}
            className="p-1.5 hover:bg-green-500/20 rounded-lg transition text-green-400 hover:text-green-300"
            title="مراسلة"
          >
            <Icons.Mail className="h-4 w-4" />
          </a>
          {student.phone && (
            <a
              href={`tel:${student.phone}`}
              className="p-1.5 hover:bg-purple-500/20 rounded-lg transition text-purple-400 hover:text-purple-300"
              title="اتصال"
            >
              <Icons.Phone className="h-4 w-4" />
            </a>
          )}
        </div>
      </td>
    </motion.tr>
  );
};

// 2.3 نافذة تقرير الطالب (مودال متقدم) – معدلة لاستخدام gradeExam و styles
const StudentReportModal = ({ isOpen, onClose, student, exam, questions, styles, theme }) => {
  if (!isOpen || !student) return null;
  const isDark = theme === 'dark';
  const percentage = student.total_marks > 0
    ? (student.score / student.total_marks) * 100
    : 0;
  const passed = student.score >= (exam?.passing_marks || 0);
  const grade = getGrade(percentage);
  const violations = student.proctoring_log?.violations || 0;

  // استخدام gradeExam للتصحيح الموحد
  const { questionGrades } = useMemo(() => {
    if (!student || !questions.length) return { questionGrades: {} };
    const answers = student.answers || {};
    return gradeExam(questions, answers, { partialMarking: true, caseSensitive: false, ignoreExtraSpaces: true });
  }, [student, questions]);

  // بناء إحصائيات الأسئلة مع الدرجات من gradeExam
  const questionStats = useMemo(() => {
    if (!student || !questions.length) return [];
    const answers = student.answers || {};
    return questions.map(q => {
      const grade = questionGrades[q.id] || { isCorrect: false, score: 0 };
      return { 
        ...q, 
        userAnswer: answers[q.id], 
        isCorrect: grade.isCorrect, 
        score: grade.score 
      };
    });
  }, [questions, student, questionGrades]);

  const correctCount = questionStats.filter(q => q.isCorrect).length;
  const totalQuestions = questionStats.length;

  // بيانات الرسم البياني لتوزيع الإجابات
  const chartData = {
    labels: questionStats.map((_, i) => `سؤال ${i+1}`),
    datasets: [{
      label: 'الصحة',
      data: questionStats.map(q => q.isCorrect ? 1 : 0),
      backgroundColor: questionStats.map(q => q.isCorrect ? 'rgba(74, 222, 128, 0.8)' : 'rgba(248, 113, 113, 0.8)'),
      borderColor: questionStats.map(q => q.isCorrect ? '#22c55e' : '#ef4444'),
      borderWidth: 1,
    }],
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
        className={`max-w-4xl w-full max-h-[90vh] overflow-y-auto rounded-3xl p-8 ${styles.card} border ${styles.border} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className={`text-2xl font-bold ${styles.text}`}>
            📊 تقرير أداء الطالب
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-red-500/20 transition">
            <Icons.X className="h-6 w-6 text-red-400" />
          </button>
        </div>

        {/* معلومات الطالب */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl ${styles.cardBg || (isDark ? 'bg-black/20 border border-white/10' : 'bg-gray-100 border border-gray-200')}`}>
          <div>
            <p className={`text-sm ${styles.subtext}`}>الاسم الكامل</p>
            <p className={`text-lg font-bold ${styles.text}`}>{student.full_name || 'غير معروف'}</p>
          </div>
          <div>
            <p className={`text-sm ${styles.subtext}`}>البريد الإلكتروني</p>
            <p className={`text-lg font-bold ${styles.text}`}>{student.email || '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${styles.subtext}`}>الهاتف</p>
            <p className={`text-lg font-bold ${styles.text}`}>{student.phone || '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${styles.subtext}`}>هاتف ولي الأمر</p>
            <p className={`text-lg font-bold ${styles.text}`}>{student.parent_phone || '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${styles.subtext}`}>المدرسة</p>
            <p className={`text-lg font-bold ${styles.text}`}>{student.school || '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${styles.subtext}`}>الصف الدراسي</p>
            <p className={`text-lg font-bold ${styles.text}`}>{student.grade || '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${styles.subtext}`}>المحافظة</p>
            <p className={`text-lg font-bold ${styles.text}`}>{student.governorate || '—'}</p>
          </div>
          <div>
            <p className={`text-sm ${styles.subtext}`}>المخالفات</p>
            <p className={`text-lg font-bold text-red-400`}>{violations}</p>
          </div>
        </div>

        {/* ملخص الأداء */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`text-sm ${styles.subtext}`}>الدرجة</p>
            <p className={`text-2xl font-bold ${getScoreColor(student.score, exam?.passing_marks || 0)}`}>
              {student.score} / {student.total_marks}
            </p>
          </div>
          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`text-sm ${styles.subtext}`}>النسبة</p>
            <p className={`text-2xl font-bold ${styles.text}`}>{Math.round(percentage)}%</p>
          </div>
          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`text-sm ${styles.subtext}`}>الحالة</p>
            <p className={`text-2xl font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
              {passed ? 'ناجح ✅' : 'راسب ❌'}
            </p>
          </div>
          <div className={`p-4 rounded-xl text-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
            <p className={`text-sm ${styles.subtext}`}>التقدير</p>
            <p className={`text-2xl font-bold ${grade.color}`}>{grade.emoji} {grade.label}</p>
          </div>
        </div>

        {/* رسم بياني لتوزيع الإجابات */}
        <div className="mt-6">
          <h4 className={`text-sm font-bold ${styles.text} mb-3`}>توزيع الإجابات الصحيحة والخاطئة</h4>
          <div className="h-48">
            <Bar data={chartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, max: 1, ticks: { stepSize: 1, color: isDark ? '#d1d5db' : '#374151' } },
                x: { ticks: { color: isDark ? '#d1d5db' : '#374151', font: { size: 8 } } }
              }
            }} />
          </div>
        </div>

        {/* تفاصيل الأسئلة – مع عرض الدرجة المستحقة */}
        <div className="mt-6 max-h-60 overflow-y-auto space-y-2">
          <h4 className={`text-sm font-bold ${styles.text} mb-2`}>تفاصيل الأسئلة</h4>
          {questionStats.map((q, idx) => (
            <div key={q.id} className={`p-3 rounded-lg flex justify-between items-center ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex-1">
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {idx+1}. {q.question_text}
                </p>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mt-0.5`}>
                  إجابتك: {q.userAnswer || 'لم يُجب'} {q.isCorrect && '✅'}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-sm font-bold ${q.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {q.isCorrect ? 'صحيح' : 'خاطئ'}
                </span>
                {q.score > 0 && (
                  <span className={`text-xs block ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    +{q.score} درجة
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* أزرار التصدير والتواصل */}
        <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => toast.success('جاري تجهيز التقرير PDF...')}
            className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
          >
            <Icons.FileText className="h-4 w-4" /> تصدير PDF
          </button>
          <a
            href={`mailto:${student.email}`}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
          >
            <Icons.Mail className="h-4 w-4" /> مراسلة الطالب
          </a>
          {student.parent_phone && (
            <a
              href={`tel:${student.parent_phone}`}
              className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
            >
              <Icons.Phone className="h-4 w-4" /> الاتصال بولي الأمر
            </a>
          )}
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition ${isDark ? 'bg-white/10 hover:bg-white/20 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'}`}
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 2.4 نافذة تعديل المحاولات (لطالب فردي)
const AdjustAttemptsModal = ({ isOpen, onClose, student, onSave, styles, theme }) => {
  const [attempts, setAttempts] = useState(1);
  const isDark = theme === 'dark';

  useEffect(() => {
    if (student) {
      setAttempts(student.custom_attempts_limit || student.attempts_allowed || 1);
    }
  }, [student]);

  if (!isOpen || !student) return null;

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
        className={`max-w-md w-full rounded-2xl p-6 ${styles.card} border ${styles.border} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-xl font-bold ${styles.text} mb-4`}>
          تعديل عدد المحاولات المسموحة
        </h3>
        <p className={`text-sm ${styles.subtext} mb-4`}>
          الطالب: <span className="font-bold">{student.full_name || 'غير معروف'}</span>
        </p>
        <div>
          <label className={`block text-sm font-medium ${styles.subtext} mb-1.5`}>
            عدد المحاولات المسموحة
          </label>
          <input
            type="number"
            min="1"
            value={attempts}
            onChange={(e) => setAttempts(parseInt(e.target.value) || 1)}
            className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-yellow-500 outline-none transition ${styles.input} border ${styles.border}`}
          />
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={() => onSave(student.id, attempts)}
            className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition"
          >
            حفظ
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50 ${styles.text}`}
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// 2.5 مودال إعادة تعيين المحاولات لطلاب متعددين
const ResetAttemptsModal = ({ isOpen, onClose, students, examId, onSave }) => {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [newAttempts, setNewAttempts] = useState(1);
  const [loading, setLoading] = useState(false);
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const styles = {
    card: isDark ? 'bg-[#1a1f2e] border-white/20' : 'bg-white border-gray-300',
    border: isDark ? 'border-white/20' : 'border-gray-300',
    text: isDark ? 'text-white' : 'text-gray-900',
    subtext: isDark ? 'text-gray-400' : 'text-gray-600',
    input: isDark ? 'bg-[#0b0e1a] text-white' : 'bg-white text-gray-900',
  };

  useEffect(() => {
    if (students.length > 0 && !selectedStudent) {
      setSelectedStudent(students[0].id);
    }
  }, [students, selectedStudent]);

  if (!isOpen) return null;

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
        className={`max-w-md w-full rounded-2xl p-6 ${styles.card} border ${styles.border} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-xl font-bold ${styles.text} mb-4`}>
          🔄 إعادة تعيين المحاولات
        </h3>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${styles.subtext} mb-1.5`}>
              اختيار الطالب
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-yellow-500 outline-none transition ${styles.input} border ${styles.border}`}
            >
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.name} (حالياً: {s.currentAttempts})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={`block text-sm font-medium ${styles.subtext} mb-1.5`}>
              عدد المحاولات الجديد
            </label>
            <input
              type="number"
              min="1"
              value={newAttempts}
              onChange={(e) => setNewAttempts(parseInt(e.target.value) || 1)}
              className={`w-full p-3 rounded-xl border focus:ring-2 focus:ring-yellow-500 outline-none transition ${styles.input} border ${styles.border}`}
            />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button
            onClick={async () => {
              setLoading(true);
              await onSave(selectedStudent, newAttempts);
              setLoading(false);
            }}
            disabled={loading}
            className="flex-1 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition disabled:opacity-50"
          >
            {loading ? 'جاري التحديث...' : 'تحديث المحاولات'}
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-2.5 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50 ${styles.text}`}
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 3. الصفحة الرئيسية – نتائج الامتحان (مع تباين عالٍ)
// ================================================================
export default function AssistantExamResultsPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id;

  // ✅ استخدام الثيم المركزي
  const { theme, toggleTheme, styles: themeStyles } = useTheme();
  const isDark = theme === 'dark';

  // ===== بيانات المساعد والصلاحيات =====
  const { assistant, permissions, loading: assistantLoading } = useAssistantData();
  const teacherId = assistant?.teacher_id;

  // ===== حالات عامة =====
  const [exam, setExam] = useState(null);
  const [course, setCourse] = useState(null);
  const [attempts, setAttempts] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ===== البحث والفلترة والترتيب =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('score');
  const [sortDirection, setSortDirection] = useState('desc');

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    total: 0,
    passed: 0,
    failed: 0,
    avgScore: 0,
    maxScore: 0,
    minScore: 0,
    passRate: 0,
  });

  // ===== مودال التقارير =====
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isAttemptModalOpen, setIsAttemptModalOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState(null);
  const [isResetAttemptsModalOpen, setIsResetAttemptsModalOpen] = useState(false);

  // ===== تخزين مؤشرات الأمان لكل طالب =====
  const [securityIndexMap, setSecurityIndexMap] = useState({});

  // ===== دالة مساعدة لجلب معرف المساعد =====
  const getAssistantId = useCallback(() => {
    try {
      const assistantData = sessionStorage.getItem('assistantData');
      if (assistantData) {
        const parsed = JSON.parse(assistantData);
        return parsed?.id || null;
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const assistantId = getAssistantId();

  // ===== جلب البيانات =====
  const fetchResults = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await sessionStorage.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // التحقق من صلاحية المساعد
      if (!teacherId) {
        toast.error('معلم غير مرتبط بالمساعد');
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
        router.push('/dashboard/assistant/exams');
        return;
      }
      // التحقق من أن الامتحان يخص المعلم المرتبط بالمساعد
      if (examData.teacher_id !== teacherId) {
        toast.error('غير مصرح لك بمشاهدة نتائج هذا الامتحان');
        router.push('/dashboard/assistant/exams');
        return;
      }
      setExam(examData);

      // 2. جلب الكورس
      if (examData.course_id) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', examData.course_id)
          .single();
        setCourse(courseData);
      }

      // 3. جلب أسئلة الامتحان (مع استبعاد القطع النصية)
      const { data: questionsData } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .neq('type', 'passage')
        .order('order_index', { ascending: true });
      setQuestions(questionsData || []);

      // 4. جلب محاولات الطلاب مع بياناتهم الكاملة من profiles
      const { data: attemptsData, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select(`
          *,
          profiles:student_id (
            full_name,
            email,
            phone,
            parent_phone,
            school,
            grade,
            governorate
          )
        `)
        .eq('exam_id', examId)
        .eq('status', 'completed')
        .order('score', { ascending: false });

      if (attemptsError) throw attemptsError;

      const processed = (attemptsData || []).map(a => ({
        ...a,
        full_name: a.profiles?.full_name || 'طالب',
        email: a.profiles?.email || '',
        phone: a.profiles?.phone || '',
        parent_phone: a.profiles?.parent_phone || '',
        school: a.profiles?.school || '',
        grade: a.profiles?.grade || '',
        governorate: a.profiles?.governorate || '',
        total_marks: examData.total_marks || 0,
        attempts_allowed: examData.attempts_allowed || 1,
        custom_attempts_limit: a.custom_attempts_limit || examData.attempts_allowed || 1,
      }));

      setAttempts(processed);

      // 5. حساب مؤشر الأمان لكل طالب
      const securityMap = {};
      processed.forEach(a => {
        const avgTime = a.answers_time ? Object.values(a.answers_time).reduce((s, t) => s + t, 0) / Math.max(1, Object.keys(a.answers_time).length) : 0;
        const si = calculateSecurityIndex(a, questionsData || [], avgTime);
        securityMap[a.id] = Math.min(100, Math.max(0, si));
      });
      setSecurityIndexMap(securityMap);

      // 6. حساب الإحصائيات
      const total = processed.length;
      const passingMarks = examData.passing_marks || 0;
      const passed = processed.filter(a => a.score >= passingMarks).length;
      const failed = total - passed;
      const scores = processed.map(a => a.score || 0);
      const avg = total > 0 ? scores.reduce((a, b) => a + b, 0) / total : 0;
      const max = total > 0 ? Math.max(...scores) : 0;
      const min = total > 0 ? Math.min(...scores) : 0;
      const passRate = total > 0 ? (passed / total) * 100 : 0;

      setStats({ total, passed, failed, avgScore: avg, maxScore: max, minScore: min, passRate });

    } catch (err) {
      console.error('Error fetching results:', err);
      setError('فشل جلب النتائج: ' + err.message);
      toast.error('فشل جلب النتائج');
    } finally {
      setLoading(false);
    }
  }, [examId, router, teacherId]);

  useEffect(() => {
    if (examId && teacherId) {
      fetchResults();
    }
  }, [examId, teacherId, fetchResults]);

  // ===== البيانات المفلترة والمُرتبة =====
  const filteredAttempts = useMemo(() => {
    let result = [...attempts];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      result = result.filter(a =>
        a.full_name?.toLowerCase().includes(q) ||
        a.email?.toLowerCase().includes(q) ||
        a.school?.toLowerCase().includes(q) ||
        a.grade?.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      const passingMarks = exam?.passing_marks || 0;
      result = result.filter(a =>
        filterStatus === 'passed' ? a.score >= passingMarks : a.score < passingMarks
      );
    }
    result.sort((a, b) => {
      let aVal = a[sortBy] || 0;
      let bVal = b[sortBy] || 0;
      if (sortBy === 'full_name') {
        aVal = a.full_name || '';
        bVal = b.full_name || '';
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
    });
    return result;
  }, [attempts, searchTerm, filterStatus, sortBy, sortDirection, exam]);

  // ===== بيانات الرسوم البيانية =====
  const chartData = useMemo(() => {
    if (attempts.length === 0) {
      return {
        scoreDistribution: { labels: [], datasets: [] },
        passFail: { labels: [], datasets: [] },
        securityChart: { labels: [], datasets: [] },
      };
    }
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

    const sorted = [...attempts].sort((a, b) => {
      const siA = securityIndexMap[a.id] || 0;
      const siB = securityIndexMap[b.id] || 0;
      return siB - siA;
    });
    const top = sorted.slice(0, 10);

    return {
      scoreDistribution: {
        labels: ['0-20%', '21-40%', '41-60%', '61-80%', '81-100%'],
        datasets: [{
          label: 'عدد الطلاب',
          data: Object.values(ranges),
          backgroundColor: ['rgba(239, 68, 68, 0.8)', 'rgba(251, 146, 60, 0.8)', 'rgba(234, 179, 8, 0.8)', 'rgba(74, 222, 128, 0.8)', 'rgba(52, 211, 153, 0.8)'],
          borderColor: ['rgb(239, 68, 68)', 'rgb(251, 146, 60)', 'rgb(234, 179, 8)', 'rgb(74, 222, 128)', 'rgb(52, 211, 153)'],
          borderWidth: 2,
        }],
      },
      passFail: {
        labels: ['ناجح', 'راسب'],
        datasets: [{
          data: [passed, failed],
          backgroundColor: ['rgba(74, 222, 128, 0.8)', 'rgba(248, 113, 113, 0.8)'],
          borderColor: ['rgb(74, 222, 128)', 'rgb(248, 113, 113)'],
          borderWidth: 2,
        }],
      },
      securityChart: {
        labels: top.map(a => a.full_name || 'طالب'),
        datasets: [{
          label: 'مؤشر الأمان',
          data: top.map(a => securityIndexMap[a.id] || 0),
          backgroundColor: 'rgba(255, 215, 0, 0.7)',
          borderColor: 'rgb(255, 215, 0)',
          borderWidth: 2,
        }],
      },
    };
  }, [attempts, exam, securityIndexMap]);

  // ===== دوال الإجراءات =====
  const handleViewProfile = (student) => {
    setSelectedStudent(student);
    setIsReportModalOpen(true);
  };

  const handleAdjustAttempts = (student) => {
    setCurrentStudent(student);
    setIsAttemptModalOpen(true);
  };

  const handleSaveAttempts = async (studentId, newAttempts) => {
    try {
      const { error } = await supabase
        .from('exam_attempts')
        .update({ custom_attempts_limit: newAttempts })
        .eq('student_id', studentId)
        .eq('exam_id', examId);
      if (error) throw error;
      toast.success(`✅ تم تحديث عدد المحاولات إلى ${newAttempts}`);
      setIsAttemptModalOpen(false);
      fetchResults();
    } catch (err) {
      toast.error('فشل تحديث المحاولات');
    }
  };

  const handleResetAttempts = async (studentId, newAttempts) => {
    try {
      const { error } = await supabase
        .from('exam_attempts')
        .update({ custom_attempts_limit: newAttempts })
        .eq('student_id', studentId)
        .eq('exam_id', examId);
      if (error) throw error;
      toast.success(`✅ تم إعادة تعيين المحاولات إلى ${newAttempts}`);
      setIsResetAttemptsModalOpen(false);
      fetchResults();
    } catch (err) {
      toast.error('فشل إعادة تعيين المحاولات');
    }
  };

  const handleViewStudentProfile = (studentId) => {
    router.push(`/dashboard/assistant/students/${studentId}`);
  };

  const handleExportCSV = async () => {
    if (attempts.length === 0) {
      toast.warning('لا توجد نتائج للتصدير');
      return;
    }
    try {
      const headers = ['#', 'الطالب', 'البريد', 'الهاتف', 'ولي الأمر', 'المدرسة', 'الصف', 'المحافظة', 'الدرجة', 'النسبة', 'الحالة', 'المخالفات', 'مؤشر الأمان'];
      const rows = attempts.map((a, i) => [
        i + 1,
        a.full_name || 'غير معروف',
        a.email || '',
        a.phone || '',
        a.parent_phone || '',
        a.school || '',
        a.grade || '',
        a.governorate || '',
        a.score || 0,
        a.total_marks > 0 ? ((a.score / a.total_marks) * 100).toFixed(1) + '%' : '0%',
        a.score >= (exam?.passing_marks || 0) ? 'ناجح' : 'راسب',
        a.proctoring_log?.violations || 0,
        (securityIndexMap[a.id] || 0).toFixed(0) + '%',
      ]);
      const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `نتائج_الامتحان_${exam?.title || 'غير_معروف'}.csv`;
      link.click();
      URL.revokeObjectURL(link.href);
      toast.success('✅ تم تصدير النتائج بنجاح');
    } catch (err) {
      toast.error('فشل تصدير النتائج');
    }
  };

  const goBack = () => router.push(`/dashboard/assistant/exams/${examId}`);
  const goToQuestions = () => router.push(`/dashboard/assistant/exams/${examId}/questions`);

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي المحاولات', value: stats.total, icon: Icons.Users, color: 'from-blue-500 to-blue-700', delay: 0 },
    { id: 2, label: 'ناجح', value: stats.passed, icon: Icons.CheckCircle, color: 'from-green-500 to-green-700', delay: 0.1 },
    { id: 3, label: 'راسب', value: stats.failed, icon: Icons.XCircle, color: 'from-red-500 to-red-700', delay: 0.2 },
    { id: 4, label: 'نسبة النجاح', value: stats.passRate.toFixed(0), suffix: '%', icon: Icons.TrendingUp, color: 'from-yellow-500 to-yellow-700', delay: 0.3 },
    { id: 5, label: 'متوسط الدرجات', value: stats.avgScore.toFixed(1), icon: Icons.BarChart, color: 'from-purple-500 to-purple-700', delay: 0.4 },
    { id: 6, label: 'أعلى درجة', value: stats.maxScore, icon: Icons.Trophy, color: 'from-amber-500 to-amber-700', delay: 0.5 },
  ];

  // ===== التحقق من الصلاحية =====
  const canView = hasPermission(permissions, 'exams', 'can_view');

  if (assistantLoading || loading) {
    return (
      <AssistantLayout>
        <div className={`flex items-center justify-center py-20 ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <div className="w-12 h-12 border-4 border-yellow-500/30 border-t-yellow-500 rounded-full animate-spin" />
        </div>
      </AssistantLayout>
    );
  }

  if (!exam || !canView) {
    return (
      <AssistantLayout>
        <div className={`text-center py-20 ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <Icons.AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg">{!exam ? 'الامتحان غير موجود' : 'غير مصرح لك'}</p>
          <button onClick={goBack} className="text-yellow-400 hover:underline mt-2">العودة</button>
        </div>
      </AssistantLayout>
    );
  }

  // ===== بناء الأنماط المحلية =====
  const styles = {
    card: isDark ? 'bg-[#1a1f2e] border-white/20' : 'bg-white border-gray-300',
    cardBorder: isDark ? 'border-white/20' : 'border-gray-300',
    text: isDark ? 'text-white' : 'text-gray-900',
    subtext: isDark ? 'text-gray-400' : 'text-gray-600',
    input: isDark ? 'bg-[#0b0e1a] text-white border-white/20' : 'bg-white text-gray-900 border-gray-300',
    border: isDark ? 'border-white/20' : 'border-gray-300',
    borderColor: isDark ? 'border-white/10' : 'border-gray-200',
    cardBg: isDark ? 'bg-black/20 border border-white/10' : 'bg-gray-100 border border-gray-200',
  };

  const passingMarks = exam.passing_marks || 0;

  return (
    <AssistantLayout>
      <div className={`relative ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
        <ParticleBackground />

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6">
          {/* ===== رأس الصفحة ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-extrabold ${styles.text}`}>📊 نتائج الامتحان</h1>
              <p className={`${styles.subtext} text-sm mt-1 flex items-center gap-2 flex-wrap`}>
                <span>{exam.title}</span>
                <span className="text-yellow-400">({stats.total} محاولة)</span>
                {course && (
                  <Link href={`/dashboard/assistant/courses/${course.id}`} className="text-xs text-blue-400 hover:text-blue-300 transition flex items-center gap-1">
                    <Icons.Book className="h-3 w-3" /> {course.title}
                  </Link>
                )}
                {assistant && (
                  <span className="mr-2 text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                    {assistant.display_name || assistant.full_name}
                  </span>
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
              >
                {isDark ? <Icons.Sun className="h-5 w-5 text-yellow-400" /> : <Icons.Moon className="h-5 w-5 text-gray-600" />}
              </button>
              <button
                onClick={handleExportCSV}
                disabled={attempts.length === 0}
                className={`px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${attempts.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Icons.Download className="h-4 w-4" /> تصدير CSV
              </button>
              <button
                onClick={() => setIsResetAttemptsModalOpen(true)}
                className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Icons.RefreshCw className="h-4 w-4" /> إعادة تعيين المحاولات
              </button>
              <button
                onClick={goToQuestions}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Icons.List className="h-4 w-4" /> الأسئلة
              </button>
              <button
                onClick={goBack}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${styles.card} border ${styles.border} hover:border-yellow-400/50 ${styles.text}`}
              >
                <Icons.ArrowRight className="h-4 w-4" /> العودة للامتحان
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
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3"
              >
                <Icons.AlertCircle className="h-5 w-5" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                  <Icons.X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== الإحصائيات ===== */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {statsData.map((stat) => <StatCard key={stat.id} stat={stat} styles={styles} />)}
          </div>

          {/* ===== الرسوم البيانية ===== */}
          {attempts.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border}`}>
                <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>توزيع درجات الطلاب</h3>
                <div className="h-56">
                  <Bar
                    data={chartData.scoreDistribution}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, ticks: { color: isDark ? '#d1d5db' : '#374151' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: isDark ? '#d1d5db' : '#374151' }, grid: { display: false } },
                      },
                    }}
                  />
                </div>
              </div>
              <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border}`}>
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
                          labels: { color: isDark ? '#d1d5db' : '#374151' },
                        },
                      },
                    }}
                  />
                </div>
              </div>
              <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border}`}>
                <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>🔒 مؤشرات الأمان (أعلى 10)</h3>
                <div className="h-56">
                  <Bar
                    data={chartData.securityChart}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        y: { beginAtZero: true, max: 100, ticks: { color: isDark ? '#d1d5db' : '#374151' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                        x: { ticks: { color: isDark ? '#d1d5db' : '#374151', font: { size: 8 } }, grid: { display: false } },
                      },
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ===== جدول النتائج ===== */}
          <div className={`p-5 rounded-2xl ${styles.card} border ${styles.border}`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h3 className={`text-lg font-bold ${styles.text} flex items-center gap-2`}>
                <Icons.List className="h-5 w-5 text-yellow-400" /> قائمة الطلاب
                <span className={`text-sm ${styles.subtext}`}>({filteredAttempts.length})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                <div className="relative flex-1 min-w-[150px]">
                  <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="ابحث عن طالب..."
                    className={`w-full p-2 pr-8 rounded-lg border focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${styles.input} border ${styles.border}`}
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={`p-2 rounded-lg border focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${styles.input} border ${styles.border}`}
                >
                  <option value="all">الكل</option>
                  <option value="passed">ناجح</option>
                  <option value="failed">راسب</option>
                </select>
              </div>
            </div>

            {filteredAttempts.length === 0 ? (
              <div className="text-center py-12">
                <Icons.Users className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <p className={styles.subtext}>
                  {searchTerm || filterStatus !== 'all'
                    ? 'لا توجد نتائج تطابق البحث'
                    : 'لا توجد محاولات مكتملة لهذا الامتحان'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-sm">
                  <thead className={`border-b ${styles.borderColor}`}>
                    <tr className={styles.subtext}>
                      <th className="py-2 px-3 text-center">#</th>
                      <th className="py-2 px-3 text-right cursor-pointer hover:text-yellow-400 transition" onClick={() => { setSortBy('full_name'); setSortDirection(prev => sortBy === 'full_name' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}>
                        الطالب {sortBy === 'full_name' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-2 px-3 text-center hidden md:table-cell cursor-pointer hover:text-yellow-400 transition" onClick={() => { setSortBy('completed_at'); setSortDirection(prev => sortBy === 'completed_at' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}>
                        التاريخ {sortBy === 'completed_at' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-2 px-3 text-center cursor-pointer hover:text-yellow-400 transition" onClick={() => { setSortBy('score'); setSortDirection(prev => sortBy === 'score' ? (prev === 'asc' ? 'desc' : 'asc') : 'asc'); }}>
                        الدرجة {sortBy === 'score' && (sortDirection === 'asc' ? '↑' : '↓')}
                      </th>
                      <th className="py-2 px-3 text-center hidden sm:table-cell">النسبة</th>
                      <th className="py-2 px-3 text-center">الحالة</th>
                      <th className="py-2 px-3 text-center hidden lg:table-cell">التقدير</th>
                      <th className="py-2 px-3 text-center">المخالفات</th>
                      <th className="py-2 px-3 text-center hidden lg:table-cell">ولي الأمر</th>
                      <th className="py-2 px-3 text-center">مؤشر الأمان</th>
                      <th className="py-2 px-3 text-center">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAttempts.map((attempt, index) => (
                      <StudentRow
                        key={attempt.id}
                        student={attempt}
                        index={index}
                        passingMarks={passingMarks}
                        onViewProfile={handleViewProfile}
                        onAdjustAttempts={handleAdjustAttempts}
                        onViewStudentProfile={handleViewStudentProfile}
                        securityIndex={securityIndexMap[attempt.id] || 0}
                        styles={styles}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className={`mt-4 pt-3 border-t ${styles.borderColor} flex justify-between text-xs ${styles.subtext}`}>
              <span>إجمالي: {filteredAttempts.length} طالب</span>
              <span>متوسط الدرجات: {stats.avgScore.toFixed(1)}</span>
            </div>
          </div>

          {/* ===== روابط سريعة ===== */}
          <div className={`p-4 mt-6 rounded-2xl ${styles.card} border ${styles.border}`}>
            <h3 className={`text-sm font-semibold ${styles.text} mb-2 flex items-center gap-2`}>
              <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/assistant" className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}>الرئيسية</Link>
              <Link href="/dashboard/assistant/courses" className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}>الكورسات</Link>
              <Link href="/dashboard/assistant/exams" className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}>الامتحانات</Link>
              <Link href="/dashboard/assistant/students" className={`text-xs px-3 py-1.5 rounded-lg transition ${styles.card} hover:bg-white/5 ${styles.subtext}`}>الطلاب</Link>
              <Link href="/dashboard/assistant/question-bank" className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition text-purple-300 hover:text-purple-200">بنوك الأسئلة</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ===== مودال تقرير الطالب ===== */}
      <StudentReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        student={selectedStudent}
        exam={exam}
        questions={questions}
        styles={styles}
        theme={theme}
      />

      {/* ===== مودال تعديل المحاولات (فردي) ===== */}
      <AdjustAttemptsModal
        isOpen={isAttemptModalOpen}
        onClose={() => setIsAttemptModalOpen(false)}
        student={currentStudent}
        onSave={handleSaveAttempts}
        styles={styles}
        theme={theme}
      />

      {/* ===== مودال إعادة تعيين المحاولات (متعدد) ===== */}
      <ResetAttemptsModal
        isOpen={isResetAttemptsModalOpen}
        onClose={() => setIsResetAttemptsModalOpen(false)}
        students={attempts.map(a => ({ 
          id: a.id, 
          name: a.full_name, 
          currentAttempts: a.custom_attempts_limit || exam.attempts_allowed 
        }))}
        examId={examId}
        onSave={handleResetAttempts}
      />
    </AssistantLayout>
  );
}