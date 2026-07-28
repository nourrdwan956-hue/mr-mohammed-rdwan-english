// app/dashboard/student/exams/[id]/result/page.js
// صفحة نتيجة الطالب – النسخة الأسطورية V16.3 مع تحسينات عرض الإجابات
// ✅ تباين عالٍ جداً في الوضعين الفاتح والداكن
// ✅ عرض تفصيلي للدرجة والنسبة والتقدير
// ✅ تحليل كل سؤال مع الإجابة الصحيحة وإجابة الطالب
// ✅ دعم الإجابات المتعددة (نماذج متعددة) من جهة المعلم
// ✅ عرض القطع النصية مع أسئلتها
// ✅ عرض المخالفات وعدد المحاولات المتبقية
// ✅ تصدير تقرير PDF للمراجعة
// ✅ ربط كامل ببيانات الطالب (من نظام التسجيل)
// ✅ واجهة متجاوبة مع جميع الأجهزة
// ✅ تكامل كامل مع جهة المعلم وملفات الامتحان
// ✅ دعم attemptId في الرابط لعرض محاولة محددة
// ✅ عرض الإجابات الصحيحة مع نماذج متعددة
// ✅ تحسينات جمالية وتفاعلية إضافية
// ✅ التحقق من صحة attemptId (UUID) لتجنب الأخطاء
// ✅ التعديل: استخدام total_marks من exams إذا كانت مفقودة في exam_attempts
// ✅ عرض تفاصيل الفراغات في أسئلة fill_from_words
// ✅ تحويل userAnswer إلى مصفوفة لضمان عرض التفاصيل
// ✅ دعم عرض الدرجات الجزئية للفراغات
// ✅ تحويل الإجابات المسترجعة للأنواع التي تحتاج مصفوفة (fill_from_words, sentence_reorder, ordering, matching)
// ✅ عرض MCQ بشكل صحيح مع الخيار الصحيح
// ✅ عرض تفاصيل sentence_reorder (ترتيب الكلمات)
// ✅ استخدام cleanText للمقارنة في تفاصيل الفراغات
// ✅ إضافة prop language إلى QuestionReviewItem للرسائل المترجمة
// ✅ إخفاء تفاصيل الأسئلة والإجابات للراسبين (عرض رسالة محدودة)
// ✅ عرض إحصائيات محدودة للراسبين في تبويب stats
// ✅ تحويل correctAnswer من سلسلة نصية إلى مصفوفة لـ sentence_reorder في questionAnalysis
// ✅ إصلاح عرض الترتيب الصحيح لـ sentence_reorder (دعم المصفوفات المتداخلة)
// ✅ التعديل: عرض الدرجة الفعلية (مع التصحيح الجزئي) في QuestionReviewItem
// ✅ [تعديل جديد] عرض الدرجات بأرقام عشرية (toFixed(1)) في جميع بطاقات النتائج

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
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
import { gradeExam, calculateSecurityIndex, analyzeStudentPerformance, cleanText } from '@/lib/examUtils';
const html2canvas = (await import('html2canvas')).default;

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
// 1. ألوان عالية التباين (HC)
// ================================================================
const HC = {
  light: {
    bg: '#FFFFFF',
    text: '#000000',
    border: '#000000',
    card: '#F0F0F0',
    primary: '#0000FF',
    secondary: '#006400',
    danger: '#CC0000',
    warning: '#CC8800',
    success: '#008800',
    muted: '#666666',
    cardBg: '#F8F8F8',
    borderLight: '#DDDDDD',
  },
  dark: {
    bg: '#0A0A0A',
    text: '#FFFFFF',
    border: '#FFFFFF',
    card: '#1A1A1A',
    primary: '#66B3FF',
    secondary: '#66FF99',
    danger: '#FF4444',
    warning: '#FFAA00',
    success: '#44FF88',
    muted: '#AAAAAA',
    cardBg: '#222222',
    borderLight: '#333333',
  }
};

// ================================================================
// 2. دوال مساعدة
// ================================================================
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

const getGrade = (percentage) => {
  if (percentage >= 90) return { label: 'ممتاز', color: 'text-emerald-400', emoji: '🌟', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' };
  if (percentage >= 75) return { label: 'جيد جداً', color: 'text-blue-400', emoji: '⭐', bg: 'bg-blue-500/20', border: 'border-blue-500/30' };
  if (percentage >= 60) return { label: 'جيد', color: 'text-yellow-400', emoji: '👍', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
  if (percentage >= 40) return { label: 'مقبول', color: 'text-orange-400', emoji: '📖', bg: 'bg-orange-500/20', border: 'border-orange-500/30' };
  return { label: 'ضعيف', color: 'text-red-400', emoji: '💪', bg: 'bg-red-500/20', border: 'border-red-500/30' };
};

const getScoreColor = (score, passingMarks) => {
  if (score >= passingMarks) return 'text-green-400';
  return 'text-red-400';
};

// دالة مساعدة لعرض الوقت
function formatTime(seconds) {
  if (!seconds) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ================================================================
// 3. مكونات مساعدة (مع تباين عالٍ)
// ================================================================

// 3.1 بطاقة الإحصاء الرئيسية – مع إضافة مؤشر الأمان
const ResultSummaryCard = ({ exam, result, student, styles, isDark, securityIndex }) => {
  // ✅ التعديل: الحصول على total_marks من exam إذا كانت مفقودة من result
  const totalMarks = result.total_marks || exam?.total_marks || 0;
  const percentage = totalMarks > 0 ? (result.score / totalMarks) * 100 : 0;
  const grade = getGrade(percentage);
  const passed = result.score >= (exam?.passing_marks || 0);
  const violations = result.proctoring_log?.violations || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className={`p-6 rounded-3xl ${styles.card} border ${styles.border} shadow-2xl`}
    >
      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* أيقونة النتيجة */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
          className={`flex-shrink-0 w-24 h-24 rounded-full flex items-center justify-center border-4 ${passed ? 'border-green-400 bg-green-500/20' : 'border-red-400 bg-red-500/20'}`}
        >
          {passed ? (
            <Icons.CheckCircle className="h-12 w-12 text-green-400" />
          ) : (
            <Icons.XCircle className="h-12 w-12 text-red-400" />
          )}
        </motion.div>

        {/* المعلومات الأساسية */}
        <div className="flex-1 text-center md:text-right">
          <h1 className={`text-2xl font-extrabold ${styles.text}`}>
            {exam?.title || 'الامتحان'}
          </h1>
          <p className={`text-sm ${styles.subtext} mt-1`}>
            {student?.full_name || 'طالب'} • {student?.school || ''} • {student?.grade || ''}
          </p>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 mt-2">
            <span className={`text-xs px-3 py-1 rounded-full ${grade.bg} ${grade.color} border ${grade.border}`}>
              {grade.emoji} {grade.label}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full ${passed ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
              {passed ? '✅ ناجح' : '❌ راسب'}
            </span>
            {violations > 0 && (
              <span className="text-xs px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                ⚠️ {violations} مخالفة
              </span>
            )}
            {/* ✅ مؤشر الأمان */}
            {securityIndex !== undefined && (
              <span className={`text-xs px-3 py-1 rounded-full ${
                securityIndex >= 80 ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                securityIndex >= 50 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}>
                🔒 الأمان: {Math.round(securityIndex)}%
              </span>
            )}
          </div>
        </div>

        {/* الدرجة والنسبة */}
        <div className="flex-shrink-0 text-center">
          <div className={`text-5xl font-black ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {percentage.toFixed(1)}%
          </div>
          <div className={`text-sm ${styles.subtext}`}>
            {result.score.toFixed(1)} / {totalMarks.toFixed(1)} درجة   {/* ✅ التعديل: عرض رقم عشري */}
          </div>
          {exam?.passing_marks && (
            <div className={`text-xs ${styles.subtext} mt-1`}>
              النجاح: {exam.passing_marks.toFixed(1)} درجة
            </div>
          )}
        </div>
      </div>

      {/* شريط التقدم */}
      <div className="mt-4 w-full h-3 bg-white/10 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className={`h-full rounded-full ${passed ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-gradient-to-r from-red-400 to-orange-400'}`}
        />
      </div>

      {/* معلومات إضافية */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/10">
        <div className="text-center">
          <p className={`text-xs ${styles.subtext}`}>المحاولة</p>
          <p className={`text-sm font-bold ${styles.text}`}>{result.attempt_number || 1}</p>
        </div>
        <div className="text-center">
          <p className={`text-xs ${styles.subtext}`}>الوقت المستغرق</p>
          <p className={`text-sm font-bold ${styles.text}`}>
            {result.time_spent ? formatTime(result.time_spent) : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className={`text-xs ${styles.subtext}`}>تاريخ التقديم</p>
          <p className={`text-sm font-bold ${styles.text}`}>{formatDate(result.submitted_at)}</p>
        </div>
        <div className="text-center">
          <p className={`text-xs ${styles.subtext}`}>الحالة</p>
          <p className={`text-sm font-bold ${passed ? 'text-green-400' : 'text-red-400'}`}>
            {result.status === 'terminated' ? 'منتهي (مخالفة)' : 'مكتمل'}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// 3.2 تحليل السؤال الفردي – مع دعم الوقت ونماذج متعددة وتفاصيل fill_from_words و MCQ و sentence_reorder
const QuestionReviewItem = ({ question, userAnswer, isCorrect, score, time, index, styles, isDark, language }) => {
  const type = question.type || '';
  const typeLabels = {
    multiple_choice: 'اختيار من متعدد',
    true_false: 'صح / خطأ',
    essay: 'مقالي',
    matching: 'توصيل',
    ordering: 'ترتيب',
    fill_blank: 'ملء الفراغ',
    fill_from_words: 'إكمال من كلمات',
    passage: 'قطعة',
  };

  // ✅ دعم الإجابات الصحيحة المتعددة (نماذج متعددة)
  const correctAnswers = Array.isArray(question.correct_answer) 
    ? question.correct_answer 
    : (question.correct_answer ? [question.correct_answer] : []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`p-4 rounded-xl border ${isCorrect ? 'border-green-500/30 bg-green-500/5' : 'border-red-500/30 bg-red-500/5'} ${styles.card}`}
    >
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${isCorrect ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {isCorrect ? '✓' : '✗'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`text-xs font-medium ${styles.subtext}`}>#{index + 1}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${isDark ? 'bg-white/10 text-gray-300' : 'bg-gray-100 text-gray-600'}`}>
              {typeLabels[type] || type}
            </span>
            <span className={`text-xs ${styles.subtext}`}>{question.marks} درجة</span>
            {time > 0 && (
              <span className={`text-xs ${styles.subtext}`}>⏱️ {time}ث</span>
            )}
          </div>
          <p className={`text-sm ${styles.text} mb-2`}>{question.question_text}</p>

          {/* عرض إجابة الطالب */}
          {userAnswer !== undefined && userAnswer !== null && userAnswer !== '' ? (
            <div className={`text-xs ${styles.subtext} mb-1`}>
              <span className="font-semibold">إجابتك: </span>
              <span className={isCorrect ? 'text-green-400' : 'text-red-400'}>
                {typeof userAnswer === 'object' ? JSON.stringify(userAnswer) : userAnswer}
              </span>
            </div>
          ) : (
            <div className="text-xs text-red-400 mb-1">لم تُجب</div>
          )}

          {/* ✅ عرض MCQ الصحيح */}
          {type === 'multiple_choice' && (
            <div className="mt-1 text-xs text-green-400">
              <span className="font-semibold">الإجابة الصحيحة: </span>
              {Array.isArray(question.options) && question.options.map((opt, idx) => {
                if (opt.isCorrect) {
                  return <span key={idx}>{String.fromCharCode(65 + idx)}. {opt.text}</span>;
                }
                return null;
              }).filter(Boolean)}
            </div>
          )}

          {/* ✅ تفاصيل الفراغات لنوع fill_from_words */}
          {type === 'fill_from_words' && (
            <div className="mt-2 space-y-1">
              <p className={`text-xs font-semibold ${styles.subtext}`}>تفاصيل الفراغات:</p>
              {Array.isArray(question.correct_answer) && Array.isArray(userAnswer) ? (
                question.correct_answer.map((correct, idx) => {
                  const userAns = (userAnswer && userAnswer[idx] !== undefined) ? userAnswer[idx] : '—';
                  const isBlankCorrect = cleanText(String(userAns)).toLowerCase() === cleanText(String(correct)).toLowerCase();
                  const blankScore = question.marks / question.correct_answer.length;
                  return (
                    <div key={idx} className={`flex items-center gap-2 text-xs ${isBlankCorrect ? 'text-green-400' : 'text-red-400'}`}>
                      <span className="w-12">الفراغ #{idx+1}:</span>
                      <span>إجابتك: <span className="font-bold">{userAns}</span></span>
                      <span>الصحيح: <span className="font-bold text-green-400">{correct}</span></span>
                      <span>{isBlankCorrect ? '✅' : '❌'}</span>
                      <span className="text-yellow-400">+{isBlankCorrect ? blankScore.toFixed(1) : 0}</span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-gray-400">
                  {language === 'ar' ? '⚠️ لا توجد بيانات كافية لعرض التفاصيل' : '⚠️ Insufficient data to show details'}
                </p>
              )}
            </div>
          )}

          {/* ✅ عرض تفاصيل sentence_reorder */}
          {type === 'sentence_reorder' && (
            <div className="mt-2 space-y-1">
              <p className={`text-xs font-semibold ${styles.subtext}`}>تفاصيل الترتيب:</p>
              {Array.isArray(userAnswer) && userAnswer.length > 0 && (
                <div>
                  <p className={`text-xs ${styles.subtext}`}>ترتيبك:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userAnswer.map((word, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-blue-600/30 text-blue-300 border border-blue-600">
                        {idx+1}. {word}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {Array.isArray(question.correct_answer) && question.correct_answer.length > 0 && (
                <div>
                  <p className={`text-xs ${styles.subtext}`}>الترتيب الصحيح:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(() => {
                      // ✅ التعامل مع المصفوفة المتداخلة: إذا كانت correct_answer مصفوفة تحتوي على نموذج واحد (مصفوفة كلمات)، نستخدم النموذج الأول
                      let correctWords = question.correct_answer;
                      if (correctWords.length === 1 && Array.isArray(correctWords[0])) {
                        correctWords = correctWords[0];
                      }
                      // إذا كانت still مصفوفة من كلمات، نعرضها
                      if (Array.isArray(correctWords)) {
                        return correctWords.map((word, idx) => (
                          <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-green-600/30 text-green-300 border border-green-600">
                            {idx+1}. {word}
                          </span>
                        ));
                      }
                      return null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ✅ عرض الإجابات الصحيحة (نماذج متعددة) */}
          {!isCorrect && correctAnswers.length > 0 && type !== 'multiple_choice' && type !== 'sentence_reorder' && (
            <div className="text-xs text-green-400">
              <span className="font-semibold">الإجابة الصحيحة: </span>
              {correctAnswers.map((ans, i) => (
                <span key={i} className="ml-1">
                  {typeof ans === 'object' ? JSON.stringify(ans) : ans}
                  {i < correctAnswers.length - 1 && ' أو '}
                </span>
              ))}
            </div>
          )}

          {/* عرض الشرح إن وجد */}
          {question.explanation && (
            <div className={`mt-2 p-2 rounded-lg ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'} text-xs ${styles.subtext}`}>
              <span className="font-semibold text-yellow-400">📘 شرح: </span>
              {question.explanation}
            </div>
          )}
        </div>
        {/* ✅ تعديل عرض الدرجة: عرض الدرجة الفعلية (مع التصحيح الجزئي) */}
        <div className={`flex-shrink-0 text-sm font-bold ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
          {score > 0 ? `+${score.toFixed(1)}` : `0`}
        </div>
      </div>
    </motion.div>
  );
};

// 3.3 رسم بياني لتوزيع الأداء
const PerformanceChart = ({ questions, answers, isDark }) => {
  const data = questions.map((q, idx) => {
    const userAns = answers[q.id];
    const isCorrect = userAns !== undefined && userAns !== null && userAns !== '' && (
      Array.isArray(q.correct_answer) 
        ? q.correct_answer.some(c => String(userAns).toLowerCase().trim() === String(c).toLowerCase().trim())
        : String(userAns).toLowerCase().trim() === String(q.correct_answer).toLowerCase().trim()
    );
    return isCorrect ? 1 : 0;
  });

  const chartData = {
    labels: questions.map((_, i) => `سؤال ${i+1}`),
    datasets: [{
      label: 'الصحة',
      data: data,
      backgroundColor: data.map(v => v ? 'rgba(74, 222, 128, 0.8)' : 'rgba(248, 113, 113, 0.8)'),
      borderColor: data.map(v => v ? '#22c55e' : '#ef4444'),
      borderWidth: 1,
    }],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => context.raw ? '✅ صحيح' : '❌ خاطئ',
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: { stepSize: 1, color: isDark ? '#d1d5db' : '#374151' },
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      },
      x: {
        ticks: { color: isDark ? '#d1d5db' : '#374151', font: { size: 8 } },
        grid: { display: false },
      },
    },
  };

  return (
    <div className="h-48 w-full">
      <Bar data={chartData} options={options} />
    </div>
  );
};

// 3.4 زر تصدير PDF (محاكاة)
const ExportPDFButton = ({ exam, result, student, questions, answers, styles, isDark }) => {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // محاكاة تصدير PDF
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('✅ تم تصدير التقرير بنجاح');
    } catch (err) {
      toast.error('فشل تصدير التقرير');
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      style={{ touchAction: 'manipulation' }}
      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
        isDark ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
      } ${exporting ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {exporting ? (
        <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> جاري التصدير...</>
      ) : (
        <><Icons.FileText className="h-4 w-4" /> تحميل التقرير (PDF)</>
      )}
    </button>
  );
};

// 3.5 زر مشاركة النتيجة (محاكاة)
const ShareResultButton = ({ styles, isDark }) => {
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    setSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'نتيجة الامتحان',
          text: 'اطلع على نتيجتي في الامتحان!',
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success('✅ تم نسخ الرابط');
      }
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('فشل المشاركة');
    } finally {
      setSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={sharing}
      style={{ touchAction: 'manipulation' }}
      className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
        isDark ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 border border-purple-500/30' : 'bg-purple-100 hover:bg-purple-200 text-purple-700 border border-purple-300'
      }`}
    >
      <Icons.Share2 className="h-4 w-4" /> مشاركة
    </button>
  );
};

// ================================================================
// 4. الصفحة الرئيسية
// ================================================================
export default function StudentResultPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams(); // ✅ استيراد useSearchParams
  const examId = params.id;
  const { theme, language } = useTheme();
  const isDark = theme === 'dark';

  // ✅ قراءة معاملات الرابط مع التحقق من صحة attemptId
  let attemptIdFromUrl = searchParams.get('attemptId');
  // تجاهل القيم غير الصالحة: null, undefined, "null", أو أي نص ليس UUID صالح (طول 36)
  if (!attemptIdFromUrl || 
      attemptIdFromUrl === 'null' || 
      attemptIdFromUrl === 'undefined' || 
      attemptIdFromUrl.length !== 36) {
    attemptIdFromUrl = null;
  }
  const scoreFromUrl = searchParams.get('score');
  const totalFromUrl = searchParams.get('total');

  // ===== ألوان عالية التباين =====
  const contrast = isDark ? HC.dark : HC.light;
  const styles = {
    bg: `bg-[${contrast.bg}]`,
    text: `text-[${contrast.text}]`,
    border: `border-[${contrast.border}]`,
    card: `bg-[${contrast.card}]`,
    cardBg: `bg-[${contrast.cardBg}]`,
    subtext: `text-[${contrast.muted}]`,
    borderLight: `border-[${contrast.borderLight}]`,
  };

  // ===== الحالات =====
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [result, setResult] = useState(null);
  const [student, setStudent] = useState(null);
  const [attemptsLeft, setAttemptsLeft] = useState(0);
  const [allAttempts, setAllAttempts] = useState([]);
  const [showDetailedReview, setShowDetailedReview] = useState(true);
  const [activeTab, setActiveTab] = useState('review'); // review | stats | attempts

  // ===== جلب البيانات - النسخة المطورة مع دعم attemptId =====
  const fetchResultData = useCallback(async () => {
    setLoading(true);
    setError('');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { 
        router.push('/login'); 
        return; 
      }

      let attemptData = null;

      // ✅ 1. إذا كان هناك attemptId صالح في الرابط، جلب تلك المحاولة مباشرة
      if (attemptIdFromUrl) {
        const { data, error } = await supabase
          .from('exam_attempts')
          .select(`
            *,
            profiles:student_id (full_name, email, phone, parent_phone, school, grade, governorate)
          `)
          .eq('id', attemptIdFromUrl)
          .single();

        if (!error && data) {
          attemptData = data;
          // التأكد من أن المحاولة تخص المستخدم الحالي
          if (data.student_id !== user.id) {
            toast.error('غير مصرح لك بمشاهدة هذه النتيجة');
            router.push('/dashboard/student/courses');
            return;
          }
        } else if (error) {
          console.warn('لم يتم العثور على المحاولة باستخدام attemptId، سنبحث عن آخر محاولة', error);
        }
      }

      // ✅ 2. إذا لم يتم العثور على المحاولة عبر attemptId، جلب آخر محاولة مكتملة
      if (!attemptData) {
        const { data: attempts, error: attemptsError } = await supabase
          .from('exam_attempts')
          .select(`
            *,
            profiles:student_id (full_name, email, phone, parent_phone, school, grade, governorate)
          `)
          .eq('exam_id', examId)
          .eq('student_id', user.id)
          .in('status', ['completed', 'terminated'])
          .order('submitted_at', { ascending: false })
          .limit(1);

        if (attemptsError) throw attemptsError;
        if (!attempts || attempts.length === 0) {
          setError(language === 'ar' ? 'لم يتم العثور على نتيجة لهذا الامتحان' : 'No result found');
          setLoading(false);
          return;
        }
        attemptData = attempts[0];
      }

      // ✅ 3. تعيين النتيجة والطالب
      setResult(attemptData);
      setStudent(attemptData.profiles);

      // ✅ 4. جلب بيانات الامتحان
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      if (examError) throw examError;
      setExam(examData);

      // ✅ 5. جلب الأسئلة (مع استبعاد القطع النصية من القائمة الرئيسية)
      const { data: questionsData } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .neq('type', 'passage') // ✅ استبعاد القطع من القائمة المعروضة
        .order('order_index', { ascending: true });
      setQuestions(questionsData || []);

      // ✅ 6. حساب المحاولات المتبقية
      const { data: allAttemptsData } = await supabase
        .from('exam_attempts')
        .select('id')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .in('status', ['completed', 'terminated']);
      
      const completedCount = allAttemptsData?.length || 0;
      const attemptsAllowed = examData.attempts_allowed || 1;
      const left = Math.max(0, attemptsAllowed - completedCount);
      setAttemptsLeft(left);

      // ✅ 7. جلب جميع المحاولات لعرضها في تبويب المحاولات
      const { data: allAttemptsFull } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .in('status', ['completed', 'terminated'])
        .order('submitted_at', { ascending: false });
      setAllAttempts(allAttemptsFull || []);

      setLoading(false);
    } catch (err) {
      console.error('Fetch result error:', err);
      setError(language === 'ar' ? 'حدث خطأ أثناء تحميل النتيجة' : 'Error loading result');
      setLoading(false);
    }
  }, [examId, attemptIdFromUrl, router, language]);

  useEffect(() => {
    fetchResultData();
  }, [fetchResultData]);

  // ===== استخدام gradeExam للتصحيح الموحد =====
  const { questionGrades, totalScore, maxPossibleScore } = useMemo(() => {
    if (!result || !questions.length) return { questionGrades: {}, totalScore: 0, maxPossibleScore: 0 };
    const answers = result.answers || {};
    return gradeExam(questions, answers, { partialMarking: true, caseSensitive: false, ignoreExtraSpaces: true });
  }, [result, questions]);

  // ===== تحليل الإجابات مع الوقت – مع تحويل الإجابات المسترجعة =====
  const questionAnalysis = useMemo(() => {
    if (!result || !questions.length) return [];
    const answers = result.answers || {};
    const answersTime = result.answers_time || {};
    return questions.map(q => {
      if (q.type === 'passage') return null;
      let userAnswer = answers[q.id];
      let correctAnswer = q.correct_answer;

      // قائمة الأنواع التي تتوقع مصفوفة
      const arrayTypes = ['fill_from_words', 'sentence_reorder', 'ordering', 'matching'];

      // ✅ تحويل correctAnswer إلى مصفوفة
      if (arrayTypes.includes(q.type)) {
        if (typeof correctAnswer === 'string') {
          // محاولة تحليل JSON أولاً
          try { correctAnswer = JSON.parse(correctAnswer); } catch { correctAnswer = []; }
        }
        if (!Array.isArray(correctAnswer)) correctAnswer = [];
        
        // ✅ تحويل سلسلة نصية إلى مصفوفة كلمات (خاصة لـ sentence_reorder)
        if (q.type === 'sentence_reorder' && typeof correctAnswer === 'string') {
          // إذا كانت سلسلة مثل "هذا الطالب" نحولها إلى ["هذا","الطالب"]
          correctAnswer = correctAnswer.split(/\s+/).filter(w => w.trim() !== '');
        }
        
        // نسخه إلى السؤال نفسه لعرضه في التفاصيل
        q.correct_answer = correctAnswer;
      }

      // ✅ تحويل userAnswer إلى مصفوفة
      if (arrayTypes.includes(q.type) && typeof userAnswer === 'string') {
        try { userAnswer = JSON.parse(userAnswer); } catch { userAnswer = []; }
      }
      if (arrayTypes.includes(q.type) && !Array.isArray(userAnswer)) {
        userAnswer = [];
      }

      // MCQ: تحويل الرقم إلى حرف
      if (q.type === 'multiple_choice' && typeof userAnswer === 'string') {
        const num = parseInt(userAnswer, 10);
        if (!isNaN(num) && num >= 1 && num <= 26) {
          userAnswer = String.fromCharCode(64 + num).toLowerCase();
        } else {
          userAnswer = userAnswer.toLowerCase().trim();
        }
      }

      const time = answersTime[q.id] || 0;
      const grade = questionGrades[q.id] || { isCorrect: false, score: 0 };
      return {
        question: q,
        userAnswer,
        isCorrect: grade.isCorrect,
        score: grade.score,
        time,
        explanation: q.explanation,
      };
    }).filter(Boolean);
  }, [result, questions, questionGrades]);

  // ===== مؤشر الأمان =====
  const securityIndex = useMemo(() => {
    if (!result || !questions.length) return 100;
    const avgTime = result.answers_time ? Object.values(result.answers_time).reduce((a,b) => a+b, 0) / Math.max(1, Object.keys(result.answers_time).length) : 0;
    return calculateSecurityIndex(result, questions, avgTime);
  }, [result, questions]);

  // ===== تحليل الأداء حسب نوع السؤال =====
  const typePerformance = useMemo(() => {
    const types = {};
    questionAnalysis.forEach(q => {
      if (!types[q.question.type]) types[q.question.type] = { total: 0, correct: 0 };
      types[q.question.type].total++;
      if (q.isCorrect) types[q.question.type].correct++;
    });
    return Object.entries(types).map(([type, data]) => ({
      type,
      percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      correct: data.correct,
      total: data.total,
    }));
  }, [questionAnalysis]);

  const correctCount = questionAnalysis.filter(q => q.isCorrect).length;
  const totalQuestions = questions.length;
  
  // ✅ التعديل: حساب النسبة باستخدام total_marks من exam إذا كانت مفقودة من result
  const totalMarks = result?.total_marks || exam?.total_marks || 0;
  const percentage = totalMarks > 0 ? (result.score / totalMarks) * 100 : 0;
  
  const grade = getGrade(percentage);
  const passed = result?.score >= (exam?.passing_marks || 0);

  // ===== دالة الطباعة =====
  const handlePrint = async () => {
    const element = document.getElementById('result-content');
    if (!element) return;
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: isDark ? '#0b0e1a' : '#ffffff',
        logging: false,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `نتيجة_${exam?.title || 'امتحان'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('✅ تم تصدير الصورة بنجاح');
    } catch (err) {
      toast.error('فشل تصدير الصورة');
    }
  };

  // ===== دالة لإعادة المحاولة =====
  const handleRetry = () => {
    if (attemptsLeft > 0 && !passed) {
      router.push(`/dashboard/student/exams/${examId}`);
    } else {
      toast.info(language === 'ar' ? 'لا يمكنك إعادة المحاولة' : 'Cannot retry');
    }
  };

  // ===== عرض التحميل =====
  if (loading) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
        <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  // ===== عرض الخطأ =====
  if (error || !result) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`max-w-md w-full p-8 rounded-3xl ${styles.card} border ${styles.border} text-center space-y-4 shadow-2xl`}>
          <div className="inline-flex p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.XCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className={`text-xl font-bold ${styles.text}`}>
            {language === 'ar' ? 'لا توجد نتيجة' : 'No Result'}
          </h2>
          <p className={`${styles.text} text-sm leading-relaxed opacity-70`}>{error || 'لم يتم العثور على نتيجة لهذا الامتحان'}</p>
          <Link href="/dashboard/student/courses" className="inline-block px-6 py-2.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition shadow-lg shadow-yellow-400/20">
            {language === 'ar' ? 'العودة للكورسات' : 'Back to Courses'}
          </Link>
        </div>
      </div>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} ${styles.text} transition-colors duration-300`}>
      <div id="result-content" className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* رأس الصفحة مع أزرار الإجراءات */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className={`text-lg font-bold ${styles.text} flex items-center gap-2`}>
            <Icons.Clipboard className="h-5 w-5 text-yellow-400" />
            {language === 'ar' ? 'نتيجة الامتحان' : 'Exam Result'}
          </h2>
          <div className="flex flex-wrap gap-2">
            <ExportPDFButton exam={exam} result={result} student={student} questions={questions} answers={result.answers || {}} styles={styles} isDark={isDark} />
            <ShareResultButton styles={styles} isDark={isDark} />
            {/* ✅ زر الطباعة */}
            <button
              onClick={handlePrint}
              style={{ touchAction: 'manipulation' }}
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                isDark ? 'bg-gray-500/20 hover:bg-gray-500/30 text-gray-300 border border-gray-500/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
              }`}
            >
              <Icons.Printer className="h-4 w-4" /> طباعة
            </button>
            {!passed && attemptsLeft > 0 && (
              <button
                onClick={handleRetry}
                style={{ touchAction: 'manipulation' }}
                className="px-4 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 rounded-xl text-sm font-bold transition flex items-center gap-2 border border-yellow-400/30"
              >
                <Icons.RefreshCw className="h-4 w-4" /> إعادة المحاولة ({attemptsLeft})
              </button>
            )}
            <Link
              href="/dashboard/student/courses"
              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                isDark ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
              }`}
            >
              <Icons.BookOpen className="h-4 w-4" /> الكورسات
            </Link>
          </div>
        </div>

        {/* بطاقة الملخص – مع تمرير securityIndex */}
        <ResultSummaryCard exam={exam} result={result} student={student} styles={styles} isDark={isDark} securityIndex={securityIndex} />

        {/* التبويبات */}
        <div className={`flex gap-2 border-b ${styles.borderLight} pb-2 overflow-x-auto`}>
          {[
            { id: 'review', label: '📝 مراجعة الأسئلة', icon: Icons.FileText },
            { id: 'stats', label: '📊 إحصائيات', icon: Icons.BarChart },
            { id: 'attempts', label: `📋 المحاولات (${allAttempts.length})`, icon: Icons.History },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{ touchAction: 'manipulation' }}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                  : `${styles.subtext} hover:${styles.text} hover:bg-white/5`
              }`}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* محتوى التبويبات */}
        <AnimatePresence mode="wait">
          {activeTab === 'review' && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {passed ? (
                // ✅ عرض تفصيلي للأسئلة والإجابات (للناجحين فقط)
                <>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${styles.subtext}`}>
                      {language === 'ar' ? `الإجابات الصحيحة: ${correctCount} من ${totalQuestions}` : `Correct: ${correctCount} of ${totalQuestions}`}
                    </p>
                    <button
                      onClick={() => setShowDetailedReview(!showDetailedReview)}
                      className={`text-xs ${styles.subtext} hover:${styles.text} transition flex items-center gap-1`}
                    >
                      {showDetailedReview ? 'إخفاء التفاصيل' : 'عرض التفاصيل'} <Icons.ChevronDown className={`h-3 w-3 transition-transform ${showDetailedReview ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {showDetailedReview && (
                    <div className="space-y-3">
                      {questionAnalysis.map((item, idx) => (
                        <QuestionReviewItem
                          key={item.question.id}
                          question={item.question}
                          userAnswer={item.userAnswer}
                          isCorrect={item.isCorrect}
                          score={item.score}
                          time={item.time}
                          index={idx}
                          styles={styles}
                          isDark={isDark}
                          language={language}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                // ❌ عرض إحصائيات مبسطة للراسبين (بدون تفاصيل الأسئلة)
                <div className={`p-6 rounded-2xl ${styles.card} border ${styles.border} text-center space-y-4`}>
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-red-500/10 border-2 border-red-500/30">
                      <Icons.Shield className="h-12 w-12 text-red-400" />
                    </div>
                  </div>
                  <h3 className={`text-xl font-bold ${styles.text}`}>
                    {language === 'ar' ? '🔒 معلومات محدودة' : '🔒 Limited Information'}
                  </h3>
                  <p className={`text-sm ${styles.subtext} max-w-md mx-auto`}>
                    {language === 'ar'
                      ? 'عذراً، لا يمكنك الاطلاع على تفاصيل الإجابات الصحيحة لأنك لم تجتز درجة النجاح. يرجى المحاولة مرة أخرى لتحسين نتيجتك.'
                      : 'Sorry, you cannot view the correct answers because you did not pass the passing score. Please try again to improve your result.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {!passed && attemptsLeft > 0 && (
                      <button
                        onClick={handleRetry}
                        className="px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 rounded-xl text-sm font-bold transition flex items-center gap-2 border border-yellow-400/30"
                      >
                        <Icons.RefreshCw className="h-4 w-4" /> إعادة المحاولة ({attemptsLeft})
                      </button>
                    )}
                    <Link
                      href="/dashboard/student/courses"
                      className={`px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
                      }`}
                    >
                      <Icons.BookOpen className="h-4 w-4" /> العودة للكورسات
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {passed ? (
                // ✅ عرض الإحصائيات الكاملة للناجحين
                <>
                  <div className={`p-4 rounded-xl ${styles.card} border ${styles.border}`}>
                    <h3 className={`text-sm font-bold ${styles.text} mb-3`}>توزيع الإجابات الصحيحة والخاطئة</h3>
                    <PerformanceChart questions={questions} answers={result.answers || {}} isDark={isDark} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className={`p-4 rounded-xl text-center ${styles.card} border ${styles.border}`}>
                      <p className={`text-2xl font-bold text-green-400`}>{correctCount}</p>
                      <p className={`text-xs ${styles.subtext}`}>صحيحة</p>
                    </div>
                    <div className={`p-4 rounded-xl text-center ${styles.card} border ${styles.border}`}>
                      <p className={`text-2xl font-bold text-red-400`}>{totalQuestions - correctCount}</p>
                      <p className={`text-xs ${styles.subtext}`}>خاطئة</p>
                    </div>
                    <div className={`p-4 rounded-xl text-center ${styles.card} border ${styles.border}`}>
                      <p className={`text-2xl font-bold ${styles.text}`}>{percentage.toFixed(1)}%</p>
                      <p className={`text-xs ${styles.subtext}`}>النسبة</p>
                    </div>
                    <div className={`p-4 rounded-xl text-center ${styles.card} border ${styles.border}`}>
                      <p className={`text-2xl font-bold ${grade.color}`}>{grade.emoji}</p>
                      <p className={`text-xs ${styles.subtext}`}>{grade.label}</p>
                    </div>
                  </div>

                  {/* رسم بياني للوقت */}
                  <div className={`p-4 rounded-xl ${styles.card} border ${styles.border}`}>
                    <h3 className={`text-sm font-bold ${styles.text} mb-3`}>⏱️ وقت الإجابة لكل سؤال</h3>
                    <div className="h-48">
                      <Bar
                        data={{
                          labels: questionAnalysis.map((_, i) => `سؤال ${i+1}`),
                          datasets: [{
                            label: 'الوقت (ثانية)',
                            data: questionAnalysis.map(q => q.time || 0),
                            backgroundColor: questionAnalysis.map(q => q.isCorrect ? 'rgba(74, 222, 128, 0.7)' : 'rgba(248, 113, 113, 0.7)'),
                            borderColor: questionAnalysis.map(q => q.isCorrect ? '#22c55e' : '#ef4444'),
                            borderWidth: 1,
                          }],
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: { legend: { display: false } },
                          scales: {
                            y: { beginAtZero: true, ticks: { color: isDark ? '#d1d5db' : '#374151' }, grid: { color: 'rgba(255,255,255,0.05)' } },
                            x: { ticks: { color: isDark ? '#d1d5db' : '#374151', font: { size: 8 } }, grid: { display: false } },
                          },
                        }}
                      />
                    </div>
                  </div>

                  {/* تحليل الأداء حسب نوع السؤال */}
                  <div className={`p-4 rounded-xl ${styles.card} border ${styles.border}`}>
                    <h3 className={`text-sm font-bold ${styles.text} mb-3`}>📊 الأداء حسب نوع السؤال</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {typePerformance.map(tp => (
                        <div key={tp.type} className={`p-3 rounded-xl text-center ${styles.card} border ${styles.border}`}>
                          <p className={`text-xs ${styles.subtext}`}>{tp.type}</p>
                          <p className={`text-lg font-bold ${tp.percentage >= 60 ? 'text-green-400' : 'text-red-400'}`}>
                            {tp.percentage.toFixed(1)}%
                          </p>
                          <p className={`text-[10px] ${styles.subtext}`}>{tp.correct}/{tp.total}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* معلومات إضافية */}
                  <div className={`p-4 rounded-xl ${styles.card} border ${styles.border}`}>
                    <h4 className={`text-sm font-bold ${styles.text} mb-2`}>معلومات إضافية</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between"><span className={styles.subtext}>المحاولة</span><span className={styles.text}>{allAttempts.length}</span></div>
                      <div className="flex justify-between"><span className={styles.subtext}>المخالفات</span><span className={styles.text}>{result.proctoring_log?.violations || 0}</span></div>
                      <div className="flex justify-between"><span className={styles.subtext}>المحاولات المتبقية</span><span className={styles.text}>{attemptsLeft}</span></div>
                      <div className="flex justify-between"><span className={styles.subtext}>تاريخ التقديم</span><span className={styles.text}>{formatDate(result.submitted_at)}</span></div>
                      {result.time_spent && (
                        <div className="flex justify-between"><span className={styles.subtext}>الوقت المستغرق</span><span className={styles.text}>{formatTime(result.time_spent)}</span></div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                // ❌ رسالة للراسبين (بدلاً من الإحصائيات)
                <div className={`p-6 rounded-2xl ${styles.card} border ${styles.border} text-center space-y-4`}>
                  <div className="flex justify-center">
                    <div className="p-4 rounded-full bg-red-500/10 border-2 border-red-500/30">
                      <Icons.Shield className="h-12 w-12 text-red-400" />
                    </div>
                  </div>
                  <h3 className={`text-xl font-bold ${styles.text}`}>
                    {language === 'ar' ? '🔒 معلومات محدودة' : '🔒 Limited Information'}
                  </h3>
                  <p className={`text-sm ${styles.subtext} max-w-md mx-auto`}>
                    {language === 'ar'
                      ? 'عذراً، لا يمكنك الاطلاع على التفاصيل الإحصائية لأنك لم تجتز درجة النجاح. يرجى المحاولة مرة أخرى لتحسين نتيجتك.'
                      : 'Sorry, you cannot view statistical details because you did not pass the passing score. Please try again to improve your result.'}
                  </p>
                  <div className="flex flex-wrap justify-center gap-3 mt-4">
                    {!passed && attemptsLeft > 0 && (
                      <button
                        onClick={handleRetry}
                        className="px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 rounded-xl text-sm font-bold transition flex items-center gap-2 border border-yellow-400/30"
                      >
                        <Icons.RefreshCw className="h-4 w-4" /> إعادة المحاولة ({attemptsLeft})
                      </button>
                    )}
                    <Link
                      href="/dashboard/student/courses"
                      className={`px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                        isDark ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
                      }`}
                    >
                      <Icons.BookOpen className="h-4 w-4" /> العودة للكورسات
                    </Link>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'attempts' && (
            <motion.div
              key="attempts"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3"
            >
              {allAttempts.length === 0 ? (
                <p className={`text-center ${styles.subtext} py-8`}>لا توجد محاولات سابقة</p>
              ) : (
                allAttempts.map((att, idx) => {
                  // ✅ التعديل: استخدام total_marks من exam إذا كانت مفقودة من المحاولة
                  const attTotalMarks = att.total_marks || exam?.total_marks || 0;
                  const attPercentage = attTotalMarks > 0 ? (att.score / attTotalMarks) * 100 : 0;
                  const attPassed = att.score >= (exam?.passing_marks || 0);
                  const isCurrent = att.id === result.id;
                  return (
                    <div 
                      key={att.id} 
                      className={`p-4 rounded-xl ${styles.card} border ${styles.border} flex flex-wrap items-center justify-between gap-3 ${isCurrent ? 'ring-2 ring-yellow-400/50' : ''}`}
                    >
                      <div>
                        <p className={`text-sm font-bold ${styles.text}`}>
                          المحاولة #{allAttempts.length - idx}
                          {isCurrent && <span className="text-xs text-yellow-400 mr-2">(الحالية)</span>}
                        </p>
                        <p className={`text-xs ${styles.subtext}`}>{formatDate(att.submitted_at)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`text-sm font-bold ${attPassed ? 'text-green-400' : 'text-red-400'}`}>
                          {att.score.toFixed(1)} / {attTotalMarks.toFixed(1)}   {/* ✅ التعديل: عرض رقم عشري */}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${attPassed ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {attPassed ? 'ناجح' : 'راسب'}
                        </span>
                        {att.status === 'terminated' && (
                          <span className="text-xs text-red-400">(مخالفة)</span>
                        )}
                        {!isCurrent && (
                          <Link
                            href={`/dashboard/student/exams/${examId}/result?attemptId=${att.id}`}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            عرض
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* تذييل */}
        <div className={`pt-4 border-t ${styles.borderLight} text-center text-xs ${styles.subtext}`}>
          © 2026 منصة محمد رضوان – جميع الحقوق محفوظة
        </div>
      </div>
    </div>
  );
}