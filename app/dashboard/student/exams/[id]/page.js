// app/dashboard/student/exams/[id]/page.js
// النسخة النهائية – مع نظام المراجعة وتأكيد التسليم المتقدم
// ✅ إضافة reviewMarkedQuestions لتخزين الأسئلة المحددة للمراجعة
// ✅ إضافة زر مراجعة بجانب كل سؤال (يظهر في الشريط الجانبي بلون أصفر وعلامة Flag)
// ✅ نافذة تأكيد تسليم أنيقة تعرض إحصائيات الإجابات والمراجعة
// ✅ تحسين العودة التلقائية لملء الشاشة (مهلة سماح 3 ثوانٍ)
// ✅ إزالة setTimeout غير الضروري في تأكيد التسليم
// ✅ تعديل handleVisibilityChange لجعل تغيير التبويب طرداً فورياً
// ✅ إضافة زر عائم للعودة إلى ملء الشاشة
// ✅ إصلاح ظهور زر المراجعة في الوضع الفاتح والداكن
// ================================================================
// 🎯 التعديلات المطلوبة للتوافق مع نظام الكورسات المدفوعة (الاشتراك + الأجهزة)
// ================================================================

'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { gradeExam } from '@/lib/examUtils';
const html2canvas = (await import('html2canvas')).default;
import jsPDF from 'jspdf';
import Link from 'next/link';

// ✅ استيراد دوال التحقق من الوصول للكورسات المدفوعة
import { checkCourseAccess, checkSubscriptionOnly } from '@/lib/course-access';

// ===== ألوان عالية التباين (HC) – مع تحسينات إضافية =====
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
    inputBg: '#FFFFFF',
    inputBorder: '#333333',
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
    inputBg: '#1A1A1A',
    inputBorder: '#666666',
  }
};

// ================================================================
// 1. دوال مساعدة
// ================================================================
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getQuestionType(type) {
  const normalized = (type || '').toLowerCase().replace(/[^a-z0-9ء-ي_]/g, '');
  if (['multiple_choice', 'mcq', 'multiplechoice'].some(t => normalized.includes(t))) return 'mcq';
  if (['true_false', 'truefalse', 'tf', 'boolean'].some(t => normalized.includes(t))) return 'true_false';
  if (['essay', 'short_answer', 'long_answer', 'paragraph', 'text', 'open'].some(t => normalized.includes(t))) return 'essay';
  if (['matching', 'match'].some(t => normalized.includes(t))) return 'matching';
  if (['ordering', 'order'].some(t => normalized.includes(t))) return 'ordering';
  if (['fill_from_words', 'fillfromwords', 'words'].some(t => normalized.includes(t))) return 'fill_from_words';
  if (['sentence_reorder', 'sentencereorder', 'reorder'].some(t => normalized.includes(t))) return 'sentence_reorder';
  if (['fill_blank', 'fillblank', 'blank', 'fill'].some(t => normalized.includes(t))) return 'fill_blank';
  if (['passage', 'passage'].some(t => normalized.includes(t))) return 'passage';
  return 'essay';
}

const toLocalDate = (dateStr) => {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    return new Date(dateStr + 'Z');
  }
  return date;
};

// ===== دوال مساعدة من result/page.js =====
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

// ================================================================
// 1.5 دالة تصدير الأسئلة إلى PDF (نسخة محسّنة مع جلب الأسئلة تلقائياً وعلامة مائية ونموذج إجابة)
// ================================================================
const generateQuestionsPDF = async (questions, language, examId, supabaseClient, examTitle) => {
  try {
    let finalQuestions = questions;

    // إذا كانت الأسئلة فارغة، نجلبها من قاعدة البيانات
    if (!finalQuestions || finalQuestions.length === 0) {
      if (!examId) {
        toast.error(language === 'ar' ? 'معرف الامتحان غير موجود' : 'Exam ID not found');
        return;
      }
      const { data, error } = await supabaseClient
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .neq('type', 'passage')
        .order('order_index', { ascending: true });

      if (error) throw new Error(error.message);
      if (!data || data.length === 0) {
        toast.error(language === 'ar' ? 'لا توجد أسئلة لهذا الامتحان' : 'No questions found for this exam');
        return;
      }
      finalQuestions = data;
    }

    // جلب بيانات الطالب الحالية
    const { data: { user } } = await supabaseClient.auth.getUser();
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    const studentName = profile?.full_name || 'طالب';
    const studentEmail = user?.email || '';
    const studentPhone = profile?.phone || '';
    const studentSchool = profile?.school || '';
    const studentGrade = profile?.grade || '';
    const studentGovernorate = profile?.governorate || '';

    const watermarkText = `${studentName} | ${studentEmail} | ${studentPhone} | ${studentSchool} | ${studentGrade} | ${studentGovernorate} | ${examTitle || ''}`;

    // إنشاء العنصر المؤقت
    const element = document.createElement('div');
    element.style.cssText = `
      padding: 30px 25px;
      font-family: Arial, sans-serif;
      background: white;
      position: relative;
      overflow: hidden;
      direction: rtl;
      text-align: right;
      max-width: 1000px;
      margin: 0 auto;
    `;

    // --- العلامة المائية (طبقة شفافة) ---
    const watermarkDiv = document.createElement('div');
    watermarkDiv.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
      overflow: hidden;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      transform: rotate(-20deg) scale(1.5);
      opacity: 0.06;
      font-size: 14px;
      font-weight: bold;
      color: #000;
      font-family: Arial, sans-serif;
      line-height: 2.8;
      text-align: center;
      padding: 20px;
      letter-spacing: 1px;
      word-break: break-word;
    `;
    // تكرار النص بشكل كافٍ لملء المساحة
    const watermarkTextRepeated = (watermarkText + ' ').repeat(30);
    watermarkDiv.textContent = watermarkTextRepeated;
    element.appendChild(watermarkDiv);

    // --- المحتوى (فوق العلامة المائية) ---
    const content = document.createElement('div');
    content.style.cssText = `
      position: relative;
      z-index: 1;
      background: transparent;
    `;

    // عنوان الامتحان
    const title = document.createElement('h1');
    title.style.cssText = `
      text-align: center;
      font-size: 28px;
      font-weight: bold;
      color: #f59e0b;
      margin-bottom: 5px;
    `;
    title.textContent = language === 'ar' ? 'منصة محمد رضوان' : 'Mohamed Radwan Platform';
    content.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
      text-align: center;
      font-size: 18px;
      color: #4b5563;
      margin-bottom: 25px;
      border-bottom: 2px solid #f59e0b;
      padding-bottom: 10px;
    `;
    subtitle.textContent = language === 'ar' ? 'أسئلة الامتحان' : 'Exam Questions';
    content.appendChild(subtitle);

    // الأسئلة
    const questionsList = finalQuestions.filter(q => q.type !== 'passage');
    questionsList.forEach((q, idx) => {
      const block = document.createElement('div');
      block.style.cssText = `
        margin-bottom: 25px;
        padding: 18px 20px;
        border: 1px solid #e5e7eb;
        border-radius: 10px;
        background: #fafafa;
        page-break-inside: avoid;
      `;

      const numDiv = document.createElement('div');
      numDiv.style.cssText = `
        font-weight: bold;
        color: #f59e0b;
        font-size: 18px;
        margin-bottom: 8px;
      `;
      numDiv.textContent = `${language === 'ar' ? 'سؤال' : 'Q'} ${idx + 1}`;
      block.appendChild(numDiv);

      const textDiv = document.createElement('div');
      textDiv.style.cssText = `
        font-size: 16px;
        font-weight: 500;
        color: #1f2937;
        margin-bottom: 12px;
        line-height: 1.7;
      `;
      textDiv.textContent = q.question_text;
      block.appendChild(textDiv);

      // MCQ
      if (q.type === 'multiple_choice' && Array.isArray(q.options)) {
        const optionsDiv = document.createElement('div');
        optionsDiv.style.cssText = 'margin-right: 20px; font-size: 15px; color: #374151;';
        q.options.forEach((opt, i) => {
          const optDiv = document.createElement('div');
          optDiv.style.cssText = 'padding: 3px 0;';
          const label = String.fromCharCode(65 + i);
          optDiv.innerHTML = `<span style="font-weight:600;color:#4b5563;">${label}.</span> ${opt.text}`;
          optionsDiv.appendChild(optDiv);
        });
        block.appendChild(optionsDiv);
      }

      // Fill from words
      if (q.type === 'fill_from_words' && Array.isArray(q.options)) {
        const bankDiv = document.createElement('div');
        bankDiv.style.cssText = 'margin-top: 10px;';
        const bankLabel = document.createElement('div');
        bankLabel.style.cssText = 'font-weight:600;font-size:14px;color:#4b5563;margin-bottom:5px;';
        bankLabel.textContent = language === 'ar' ? 'صندوق الكلمات:' : 'Word Bank:';
        bankDiv.appendChild(bankLabel);
        const wordsContainer = document.createElement('div');
        wordsContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        q.options.forEach(w => {
          const span = document.createElement('span');
          span.style.cssText = 'background:#f3f4f6;padding:4px 14px;border-radius:6px;font-size:14px;color:#1f2937;border:1px solid #d1d5db;';
          span.textContent = w;
          wordsContainer.appendChild(span);
        });
        bankDiv.appendChild(wordsContainer);
        block.appendChild(bankDiv);
      }

      // Sentence reorder
      if (q.type === 'sentence_reorder' && Array.isArray(q.options)) {
        const bankDiv = document.createElement('div');
        bankDiv.style.cssText = 'margin-top: 10px;';
        const bankLabel = document.createElement('div');
        bankLabel.style.cssText = 'font-weight:600;font-size:14px;color:#4b5563;margin-bottom:5px;';
        bankLabel.textContent = language === 'ar' ? 'الكلمات المبعثرة:' : 'Jumbled Words:';
        bankDiv.appendChild(bankLabel);
        const wordsContainer = document.createElement('div');
        wordsContainer.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';
        q.options.forEach(w => {
          const span = document.createElement('span');
          span.style.cssText = 'background:#f3f4f6;padding:4px 14px;border-radius:6px;font-size:14px;color:#1f2937;border:1px solid #d1d5db;';
          span.textContent = w;
          wordsContainer.appendChild(span);
        });
        bankDiv.appendChild(wordsContainer);
        block.appendChild(bankDiv);
      }

      // الدرجة
      const marksDiv = document.createElement('div');
      marksDiv.style.cssText = 'font-size:13px;color:#6b7280;margin-top:10px;';
      marksDiv.textContent = `${language === 'ar' ? 'الدرجة:' : 'Marks:'} ${q.marks}`;
      block.appendChild(marksDiv);

      content.appendChild(block);
    });

    // --- نموذج الإجابة (صفحة جديدة) ---
    const answerKeyTitle = document.createElement('h2');
    answerKeyTitle.style.cssText = `
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      color: #f59e0b;
      margin: 40px 0 20px 0;
      border-top: 2px solid #e5e7eb;
      padding-top: 30px;
    `;
    answerKeyTitle.textContent = language === 'ar' ? '📝 نموذج الإجابة' : '📝 Answer Key';
    content.appendChild(answerKeyTitle);

    questionsList.forEach((q, idx) => {
      const block = document.createElement('div');
      block.style.cssText = `
        margin-bottom: 20px;
        padding: 15px 18px;
        border: 1px dashed #d1d5db;
        border-radius: 8px;
        background: #f9fafb;
        page-break-inside: avoid;
      `;

      const numDiv = document.createElement('div');
      numDiv.style.cssText = `
        font-weight: bold;
        color: #059669;
        font-size: 16px;
        margin-bottom: 5px;
      `;
      numDiv.textContent = `${language === 'ar' ? 'سؤال' : 'Q'} ${idx + 1}`;
      block.appendChild(numDiv);

      const answerDiv = document.createElement('div');
      answerDiv.style.cssText = 'font-size: 14px; color: #1f2937;';

      // عرض الإجابة الصحيحة حسب النوع
      if (q.type === 'multiple_choice' && Array.isArray(q.options)) {
        const correctOpt = q.options.find(opt => opt.isCorrect === true);
        if (correctOpt) {
          const idxCorrect = q.options.indexOf(correctOpt);
          const label = String.fromCharCode(65 + idxCorrect);
          answerDiv.innerHTML = `<span style="font-weight:600;">${language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct answer:'}</span> ${label}. ${correctOpt.text}`;
        }
      } else if (q.type === 'fill_from_words' || q.type === 'sentence_reorder') {
        const correctAns = Array.isArray(q.correct_answer) ? q.correct_answer : [];
        if (correctAns.length > 0) {
          const ansText = correctAns.map(a => typeof a === 'object' ? a.join(' ') : a).join(' | ');
          answerDiv.innerHTML = `<span style="font-weight:600;">${language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct answer:'}</span> ${ansText}`;
        }
      } else if (q.type === 'fill_blank') {
        const correctAns = Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer];
        const ansText = correctAns.join(' أو ');
        answerDiv.innerHTML = `<span style="font-weight:600;">${language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct answer:'}</span> ${ansText}`;
      } else {
        const correctAns = q.correct_answer || 'غير محدد';
        answerDiv.innerHTML = `<span style="font-weight:600;">${language === 'ar' ? 'الإجابة الصحيحة:' : 'Correct answer:'}</span> ${correctAns}`;
      }

      // إضافة الشرح إن وجد
      if (q.explanation) {
        const explDiv = document.createElement('div');
        explDiv.style.cssText = 'margin-top: 6px; font-size: 13px; color: #4b5563; background: #fef3c7; padding: 6px 10px; border-radius: 6px;';
        explDiv.innerHTML = `<span style="font-weight:600;">${language === 'ar' ? '📘 شرح:' : '📘 Explanation:'}</span> ${q.explanation}`;
        block.appendChild(explDiv);
      }

      block.appendChild(answerDiv);
      content.appendChild(block);
    });

    // تذييل الصفحة
    const footer = document.createElement('div');
    footer.style.cssText = `
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
      margin-top: 40px;
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
    `;
    footer.textContent = `${language === 'ar' ? 'تم التصدير من منصة محمد رضوان التعليمية' : 'Exported from Mohamed Radwan Learning Platform'}`;
    content.appendChild(footer);

    element.appendChild(content);
    document.body.appendChild(element);

    // استخدام html2canvas لالتقاط الصورة
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      allowTaint: true,
      width: 1000,
      windowWidth: 1000,
    });

    document.body.removeChild(element);

    // إنشاء PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/png');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    // تقسيم إلى صفحات
    const pageHeight = pdf.internal.pageSize.getHeight();
    let heightLeft = pdfHeight;
    let position = 0;

    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`اسئلة_الامتحان_${new Date().toISOString().slice(0,10)}.pdf`);
    toast.success(language === 'ar' ? '✅ تم تصدير الأسئلة بنجاح' : '✅ Questions exported successfully');
  } catch (err) {
    console.error(err);
    toast.error(language === 'ar' ? 'فشل تصدير الأسئلة' : 'Failed to export questions');
  }
};

// ================================================================
// 2. شاشة العد التنازلي لبدء الامتحان (مؤقت زجاجي)
// ================================================================
const ExamCountdownScreen = ({ exam, styles, language, isDark }) => {
  const router = useRouter();
  const calculateRemaining = () => {
    if (!exam?.start_date) return 0;
    const start = toLocalDate(exam.start_date);
    if (!start) return 0;
    return Math.max(0, start.getTime() - Date.now());
  };

  const [remaining, setRemaining] = useState(calculateRemaining());

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1000) {
          clearInterval(timer);
          window.location.reload(); // بمجرد انتهاء العد التنازلي، إعادة تحميل الصفحة للدخول للامتحان
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remaining % (1000 * 60)) / 1000);

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${styles.bg} relative overflow-hidden`}>
      {/* خلفية لامعة متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/20 via-transparent to-cyan-400/20 animate-pulse" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-yellow-400/10 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-[100px] animate-pulse delay-1000" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, type: 'spring' }}
        className={`max-w-2xl w-full p-8 md:p-10 rounded-3xl border backdrop-blur-2xl shadow-2xl relative z-10 ${
          isDark
            ? 'bg-white/10 border-white/20 shadow-yellow-400/20'
            : 'bg-white/60 border-gray-300 shadow-yellow-400/30'
        }`}
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="inline-flex p-4 rounded-full bg-yellow-400/20 border-2 border-yellow-400/30 mb-6"
          >
            <Icons.Clock className="h-16 w-16 text-yellow-400" />
          </motion.div>
          
          <h1 className={`text-3xl md:text-4xl font-extrabold mb-2 ${styles.text}`}>
            {language === 'ar' ? 'الامتحان لم يبدأ بعد' : 'Exam Not Started Yet'}
          </h1>
          <p className={`text-lg ${styles.subtext} mb-6`}>{exam?.title}</p>
          
          {/* المؤقت الرقمي الكبير */}
          <div className="flex items-center justify-center gap-4 md:gap-6 mb-8">
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl ${styles.card} border ${styles.border} flex items-center justify-center backdrop-blur-md`}>
                <span className="text-4xl md:text-5xl font-black text-yellow-400 tabular-nums">{String(days).padStart(2, '0')}</span>
              </div>
              <span className={`text-xs mt-1 ${styles.subtext}`}>{language === 'ar' ? 'يوم' : 'Days'}</span>
            </div>
            <span className="text-3xl font-bold text-yellow-400">:</span>
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl ${styles.card} border ${styles.border} flex items-center justify-center backdrop-blur-md`}>
                <span className="text-4xl md:text-5xl font-black text-yellow-400 tabular-nums">{String(hours).padStart(2, '0')}</span>
              </div>
              <span className={`text-xs mt-1 ${styles.subtext}`}>{language === 'ar' ? 'ساعة' : 'Hours'}</span>
            </div>
            <span className="text-3xl font-bold text-yellow-400">:</span>
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl ${styles.card} border ${styles.border} flex items-center justify-center backdrop-blur-md`}>
                <span className="text-4xl md:text-5xl font-black text-yellow-400 tabular-nums">{String(minutes).padStart(2, '0')}</span>
              </div>
              <span className={`text-xs mt-1 ${styles.subtext}`}>{language === 'ar' ? 'دقيقة' : 'Minutes'}</span>
            </div>
            <span className="text-3xl font-bold text-yellow-400">:</span>
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 md:w-24 md:h-24 rounded-2xl ${styles.card} border ${styles.border} flex items-center justify-center backdrop-blur-md`}>
                <span className="text-4xl md:text-5xl font-black text-yellow-400 tabular-nums">{String(seconds).padStart(2, '0')}</span>
              </div>
              <span className={`text-xs mt-1 ${styles.subtext}`}>{language === 'ar' ? 'ثانية' : 'Seconds'}</span>
            </div>
          </div>

          <p className={`text-sm ${styles.subtext} mb-6`}>
            {language === 'ar'
              ? 'لم يبدأ الامتحان بعد. يمكنك العودة عند انتهاء المؤقت.'
              : 'The exam has not started yet. You can return when the countdown ends.'}
          </p>

          <button
            onClick={() => router.push('/dashboard/student/courses')}
            className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-105 transition shadow-xl"
          >
            {language === 'ar' ? 'العودة للكورسات' : 'Back to Courses'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ================================================================
// 3. مكونات الأسئلة (مع تباين عالٍ)
// ================================================================

// 3.1 MCQ – مع إزالة الخلط (ترتيب ثابت حسب قاعدة البيانات)
const MCQQuestion = ({ question, selectedAnswer, onSelect, styles, language, isDark }) => {
  const rawOptions = Array.isArray(question.options) ? question.options : [];
  const labels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

  // عرض الخيارات بالترتيب الأصلي دون خلط
  const options = rawOptions.map((opt, idx) => {
    if (typeof opt === 'object' && opt !== null) {
      return { text: opt.text || opt.label || JSON.stringify(opt), isCorrect: opt.isCorrect || false };
    }
    return { text: String(opt), isCorrect: false };
  });

  return (
    <div className="space-y-2.5">
      {options.map((opt, idx) => {
        const label = labels[idx];
        const isSelected = selectedAnswer === label;
        return (
          <motion.button
            key={idx}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(label)}
            style={{ touchAction: 'manipulation' }}
            className={`w-full text-right p-4 rounded-xl border-4 border-solid transition-all duration-200 flex items-center gap-3 backdrop-blur-sm ${
              isSelected
                ? 'border-yellow-400 bg-yellow-400/20 shadow-lg shadow-yellow-400/30'
                : `${isDark ? 'border-white/10 hover:border-yellow-400/40' : 'border-gray-600 hover:border-yellow-400/70'} ${styles.card} bg-opacity-50 hover:bg-white/20`
            }`}
          >
            <span className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
              isSelected ? 'bg-yellow-400 text-black' : `${styles.card} bg-opacity-30 ${styles.text}`
            }`}>
              {label}
            </span>
            <span className={`text-sm font-medium ${isSelected ? 'text-yellow-300' : styles.text}`}>
              {opt.text}
            </span>
          </motion.button>
        );
      })}
      {selectedAnswer && (
        <button
          onClick={() => onSelect(null)}
          className="text-xs text-red-400 hover:text-red-300 transition mt-2 flex items-center gap-1"
        >
          <Icons.X className="h-3 w-3" /> {language === 'ar' ? 'مسح' : 'Clear'}
        </button>
      )}
    </div>
  );
};

// 3.2 صح/خطأ
const TrueFalseQuestion = ({ selectedAnswer, onSelect, styles, language }) => {
  const options = [
    { value: 'true', label: language === 'ar' ? '✅ صحيح' : '✅ True', color: 'emerald' },
    { value: 'false', label: language === 'ar' ? '❌ خطأ' : '❌ False', color: 'rose' },
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {options.map((opt) => {
        const isSelected = selectedAnswer === opt.value;
        const colorClass = opt.color === 'emerald'
          ? 'border-emerald-400/60 bg-emerald-400/20 text-emerald-400 hover:bg-emerald-400/30'
          : 'border-rose-400/60 bg-rose-400/20 text-rose-400 hover:bg-rose-400/30';
        const selectedClass = isSelected
          ? opt.color === 'emerald'
            ? 'border-emerald-400 bg-emerald-400/30 shadow-lg shadow-emerald-400/30 text-emerald-300'
            : 'border-rose-400 bg-rose-400/30 shadow-lg shadow-rose-400/30 text-rose-300'
          : `${styles.border} ${styles.card} bg-opacity-50 ${styles.text} hover:${colorClass}`;
        return (
          <motion.button
            key={opt.value}
            whileTap={{ scale: 0.95 }}
            onClick={() => onSelect(opt.value)}
            style={{ touchAction: 'manipulation' }}
            className={`p-5 rounded-xl border-2 transition-all duration-200 font-bold text-base flex items-center justify-center gap-2 backdrop-blur-sm ${selectedClass}`}
          >
            <span className="text-lg">{opt.value === 'true' ? '✅' : '❌'}</span>
            <span>{opt.label}</span>
          </motion.button>
        );
      })}
    </div>
  );
};

// 3.3 توصيل (Matching)
const MatchingQuestion = ({ question, selectedAnswer, onSelect, styles, language }) => {
  const pairs = Array.isArray(question.options) ? question.options : [];
  const [leftItems] = useState(() => pairs.map(p => p.left).sort(() => Math.random() - 0.5));
  const [rightItems] = useState(() => pairs.map(p => p.right).sort(() => Math.random() - 0.5));
  const [activeLeft, setActiveLeft] = useState(null);
  const selected = selectedAnswer || {};

  const handleLeftClick = (leftItem) => {
    if (selected[leftItem]) {
      const newSelected = { ...selected };
      delete newSelected[leftItem];
      onSelect(newSelected);
      setActiveLeft(null);
    } else {
      setActiveLeft(leftItem);
    }
  };

  const handleRightClick = (rightItem) => {
    if (activeLeft) {
      const newSelected = { ...selected };
      Object.keys(newSelected).forEach(key => {
        if (key === activeLeft || newSelected[key] === rightItem) delete newSelected[key];
      });
      newSelected[activeLeft] = rightItem;
      onSelect(newSelected);
      setActiveLeft(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="space-y-2">
          <p className={`text-xs ${styles.subtext} font-semibold`}>{language === 'ar' ? 'العناصر' : 'Items'}</p>
          {leftItems.map((item, idx) => (
            <motion.div
              key={idx}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleLeftClick(item)}
              style={{ touchAction: 'manipulation' }}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all backdrop-blur-sm ${
                activeLeft === item
                  ? 'border-yellow-400 bg-yellow-400/20 ring-2 ring-yellow-400/30'
                  : selected[item]
                  ? 'border-emerald-400 bg-emerald-400/10'
                  : `${styles.border} ${styles.card} bg-opacity-40 hover:bg-white/10`
              }`}
            >
              <span className={`${styles.text} text-xs font-medium`}>{item}</span>
              {selected[item] && <span className="text-emerald-400 text-xs mr-2">✓</span>}
            </motion.div>
          ))}
        </div>
        <div className="space-y-2">
          <p className={`text-xs ${styles.subtext} font-semibold`}>{language === 'ar' ? 'المقابلات' : 'Matches'}</p>
          {rightItems.map((item, idx) => (
            <motion.div
              key={idx}
              whileTap={{ scale: 0.97 }}
              onClick={() => handleRightClick(item)}
              style={{ touchAction: 'manipulation' }}
              className={`p-3 rounded-xl border-2 cursor-pointer transition-all backdrop-blur-sm ${
                Object.values(selected).includes(item)
                  ? 'border-emerald-400 bg-emerald-400/10'
                  : activeLeft
                  ? 'border-yellow-400/50 bg-yellow-400/5 hover:bg-yellow-400/10'
                  : `${styles.border} ${styles.card} bg-opacity-40 hover:bg-white/10`
              }`}
            >
              <span className={`${styles.text} text-xs font-medium`}>{item}</span>
              {Object.values(selected).includes(item) && <span className="text-emerald-400 text-xs mr-2">✓</span>}
            </motion.div>
          ))}
        </div>
      </div>
      {activeLeft && (
        <p className="text-xs text-yellow-400 text-center">
          {language === 'ar' ? 'اختر الآن العنصر المقابل من القائمة اليمنى' : 'Now select the matching item from the right list'}
        </p>
      )}
    </div>
  );
};

// 3.4 ترتيب (Ordering)
const OrderingQuestion = ({ question, selectedAnswer, onSelect, styles, language }) => {
  const items = Array.isArray(question.options) ? question.options : [];
  const [ordered, setOrdered] = useState(selectedAnswer || [...items].sort(() => Math.random() - 0.5));

  const moveItem = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= ordered.length) return;
    const newOrdered = [...ordered];
    [newOrdered[index], newOrdered[newIndex]] = [newOrdered[newIndex], newOrdered[index]];
    setOrdered(newOrdered);
    onSelect(newOrdered);
  };

  return (
    <div className="space-y-2">
      {ordered.map((item, idx) => (
        <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl border-2 ${styles.border} ${styles.card} bg-opacity-50 backdrop-blur-sm`}>
          <div className="flex flex-col gap-0.5">
            <button
              onClick={() => moveItem(idx, -1)}
              disabled={idx === 0}
              className="p-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all duration-200"
            >
              <Icons.ChevronUp className="h-4 w-4" />
            </button>
            <button
              onClick={() => moveItem(idx, 1)}
              disabled={idx === ordered.length - 1}
              className="p-1 rounded bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-30 transition-all duration-200"
            >
              <Icons.ChevronDown className="h-4 w-4" />
            </button>
          </div>
          <span className={`flex-1 text-sm ${styles.text}`}>{idx + 1}. {item}</span>
        </div>
      ))}
    </div>
  );
};

// 3.5 ملء الفراغ (Fill Blank)
const FillBlankQuestion = ({ question, selectedAnswer, onSelect, styles, language, isDark }) => {
  const answer = selectedAnswer || '';
  return (
    <div className="space-y-2">
      <div className={`w-full rounded-xl border-4 ${answer ? 'border-yellow-400' : isDark ? 'border-white/50' : 'border-gray-600'} transition-all duration-300 focus-within:ring-4 focus-within:ring-yellow-400/60 focus-within:border-yellow-400 ${styles.card} bg-opacity-${isDark ? '80' : '100'} shadow-inner shadow-lg`}>
        <input
          type="text"
          value={answer}
          onChange={(e) => onSelect(e.target.value)}
          placeholder={language === 'ar' ? 'أدخل الإجابة...' : 'Enter answer...'}
          className={`w-full p-4 bg-transparent ${styles.text} placeholder-${styles.subtext} text-sm focus:outline-none`}
          style={{ background: 'transparent' }}
        />
      </div>
      {answer.length > 0 && (
        <button onClick={() => onSelect('')} className="text-xs text-red-400 hover:text-red-300 transition flex items-center gap-1">
          <Icons.X className="h-3 w-3" /> {language === 'ar' ? 'مسح' : 'Clear'}
        </button>
      )}
    </div>
  );
};

// 3.6 مقالي (Essay)
const EssayQuestion = ({ question, selectedAnswer, onSelect, styles, language, isDark }) => {
  const answer = selectedAnswer || '';
  const wordLimit = question.word_limit || question.max_words || 0;
  const [wordCount, setWordCount] = useState(0);

  const handleChange = (e) => {
    const value = e.target.value;
    onSelect(value);
    const words = value.trim() ? value.trim().split(/\s+/).length : 0;
    setWordCount(words);
  };

  return (
    <div className="space-y-3">
      <div className={`w-full rounded-xl border-4 ${answer ? 'border-yellow-400' : isDark ? 'border-white/50' : 'border-gray-600'} transition-all duration-300 focus-within:ring-4 focus-within:ring-yellow-400/60 focus-within:border-yellow-400 ${styles.card} bg-opacity-${isDark ? '80' : '100'} shadow-inner shadow-lg`}>
        <textarea
          value={answer}
          onChange={handleChange}
          rows={8}
          placeholder={language === 'ar' ? 'اكتب إجابتك بالتفصيل هنا...' : 'Write your detailed answer here...'}
          className={`w-full p-4 bg-transparent ${styles.text} placeholder-${styles.subtext} text-sm resize-y focus:outline-none`}
          style={{ background: 'transparent' }}
        />
      </div>
      <div className="flex justify-between items-center text-xs">
        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>
          {language === 'ar' ? 'عدد الكلمات' : 'Words'}: {wordCount}
          {wordLimit > 0 && ` / ${wordLimit}`}
        </span>
        {wordLimit > 0 && wordCount > wordLimit && (
          <span className="text-red-500 font-bold animate-pulse">
            {language === 'ar' ? '⚠️ تجاوزت الحد الأقصى' : '⚠️ Exceeded limit'}
          </span>
        )}
        {answer.length > 0 && (
          <button onClick={() => onSelect('')} className="text-red-400 hover:text-red-300 transition flex items-center gap-1">
            <Icons.X className="h-3 w-3" /> {language === 'ar' ? 'مسح' : 'Clear'}
          </button>
        )}
      </div>
    </div>
  );
};

// ================================================================
// 3.7 إكمال من كلمات معطاة
// ================================================================
const FillFromWordsQuestion = ({ question, selectedAnswer, onSelect, styles, language, isDark }) => {
  const rawWords = Array.isArray(question.options) ? question.options : [];
  const wordBank = rawWords.map(w =>
    typeof w === 'string' ? w : (w.text || w.label || JSON.stringify(w))
  ).filter(w => w.trim() !== '');

  let correctAnswers = Array.isArray(question.correct_answer) ? question.correct_answer : [];
  while (correctAnswers.length === 1 && Array.isArray(correctAnswers[0])) {
    correctAnswers = correctAnswers[0];
  }
  correctAnswers = correctAnswers.map(item => String(item ?? ''));

  const text = question.question_text || '';
  const regex = /\{(\d+)\}|(_{3,})/g;
  let match;
  const segments = [];
  let lastIndex = 0;
  let blankIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (start > lastIndex) {
      segments.push({ type: 'text', content: text.substring(lastIndex, start) });
    }
    segments.push({ type: 'blank', index: blankIndex });
    blankIndex++;
    lastIndex = end;
  }
  if (lastIndex < text.length) {
    segments.push({ type: 'text', content: text.substring(lastIndex) });
  }

  if (segments.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-xl ${styles.card} border ${styles.border} text-base leading-relaxed`}>
          <span className={`text-base ${styles.text}`}>{text}</span>
        </div>
        <p className={`text-xs text-red-400`}>
          ⚠️ {language === 'ar' ? 'لم يتم اكتشاف فراغات في النص. قد يكون السؤال غير مكتمل.' : 'No blanks detected. Question may be incomplete.'}
        </p>
      </div>
    );
  }

  const userAnswers = Array.isArray(selectedAnswer) ? selectedAnswer : Array(blankIndex).fill('');

  const handleBlankChange = (index, value) => {
    const newAnswers = [...userAnswers];
    newAnswers[index] = value;
    onSelect(newAnswers);
  };

  if (wordBank.length === 0) {
    return (
      <div className="space-y-4">
        <div className={`p-4 rounded-xl ${styles.card} border ${styles.border} text-base leading-relaxed`}>
          <span className={`text-base ${styles.text}`}>{text}</span>
        </div>
        <p className={`text-xs text-red-400`}>
          ⚠️ {language === 'ar' ? 'لا توجد كلمات في صندوق الكلمات لهذا السؤال' : 'No words in word bank'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-white/10 border border-white/10">
        <span className={`text-xs font-semibold ${styles.subtext} ml-2`}>
          📚 {language === 'ar' ? 'صندوق الكلمات:' : 'Word Bank:'}
        </span>
        {wordBank.map((w, i) => (
          <span key={i} className={`px-3 py-1 rounded-full text-sm border ${styles.border} ${styles.card} shadow-sm`}>
            {w}
          </span>
        ))}
      </div>

      <div className={`p-4 rounded-xl ${styles.card} border ${styles.border} text-base leading-relaxed`}>
        {segments.map((seg, idx) => {
          if (seg.type === 'text') {
            return <span key={`text-${idx}`} className={`text-base ${styles.text}`}>{seg.content}</span>;
          } else {
            const blankIdx = seg.index;
            return (
              <span key={`blank-${idx}`} className="inline-flex items-center gap-1 mx-1">
                <span className="text-xs font-bold text-yellow-400">{blankIdx + 1}.</span>
                <select
                  value={userAnswers[blankIdx] || ''}
                  onChange={(e) => handleBlankChange(blankIdx, e.target.value)}
                  className={`p-1.5 border-2 rounded-lg focus:ring-2 focus:ring-yellow-500 outline-none transition text-sm ${
                    isDark
                      ? 'bg-[#0b0e1a] border-white/40 text-white'
                      : 'bg-white border-gray-500 text-gray-900'
                  }`}
                  style={{ minWidth: '100px' }}
                >
                  <option value="">{language === 'ar' ? 'اختر' : 'Select'}</option>
                  {wordBank.map((w, i) => (
                    <option key={i} value={w}>{w}</option>
                  ))}
                </select>
              </span>
            );
          }
        })}
      </div>
    </div>
  );
};

// ================================================================
// 3.8 ترتيب الجملة (Sentence Reorder)
// ================================================================
const SentenceReorderQuestion = ({ question, selectedAnswer, onSelect, styles, language, isDark }) => {
  const allWords = Array.isArray(question.options) ? [...question.options] : [];
  const currentAnswer = Array.isArray(selectedAnswer) ? selectedAnswer : [];
  const availableWords = allWords.filter(w => !currentAnswer.includes(w));

  const addWord = (word) => {
    if (!currentAnswer.includes(word)) {
      onSelect([...currentAnswer, word]);
    }
  };

  const removeWord = (index) => {
    const newAnswer = currentAnswer.filter((_, i) => i !== index);
    onSelect(newAnswer);
  };

  const moveWord = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentAnswer.length) return;
    const newAnswer = [...currentAnswer];
    [newAnswer[index], newAnswer[newIndex]] = [newAnswer[newIndex], newAnswer[index]];
    onSelect(newAnswer);
  };

  const handleDragStart = (e, word) => {
    e.dataTransfer.setData('text/plain', word);
    e.dataTransfer.effectAllowed = 'move';
  };

  const arrowButtonStyle = (disabled) => ({
    padding: '6px 8px',
    borderRadius: '8px',
    border: `2px solid ${isDark ? '#fbbf24' : '#1e293b'}`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    backgroundColor: isDark ? 'rgba(251,191,36,0.30)' : '#cbd5e1',
    color: isDark ? '#fbbf24' : '#0f172a',
    fontWeight: 'bold',
    fontSize: '16px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '34px',
    height: '34px',
    transition: 'all 0.2s',
    opacity: disabled ? 0.3 : 1,
    boxShadow: disabled ? 'none' : '0 2px 6px rgba(0,0,0,0.3)',
  });

  const wordStyle = {
    padding: '8px 14px',
    borderRadius: '10px',
    border: `2px solid ${isDark ? 'rgba(251,191,36,0.8)' : '#334155'}`,
    backgroundColor: isDark ? 'rgba(251,191,36,0.20)' : '#ffffff',
    color: isDark ? '#fbbf24' : '#0f172a',
    fontWeight: '600',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
  };

  const [showGuide, setShowGuide] = useState(true);

  return (
    <div className="space-y-3">
      {showGuide && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="relative p-3 rounded-xl text-xs mb-3"
          style={{
            backgroundColor: isDark ? 'rgba(251,191,36,0.15)' : '#eff6ff',
            border: `1px solid ${isDark ? '#fbbf24' : '#3b82f6'}`,
          }}
        >
          <button
            onClick={() => setShowGuide(false)}
            className="absolute top-2 right-2 p-0.5 rounded-full bg-white/10 hover:bg-white/20 transition"
            style={{ color: isDark ? '#fbbf24' : '#3b82f6' }}
          >
            <Icons.X className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-start gap-2 pr-6">
            <Icons.Info className="h-4 w-4 flex-shrink-0 mt-0.5" style={{ color: isDark ? '#fbbf24' : '#3b82f6' }} />
            <div>
              <p className="font-bold mb-1" style={{ color: isDark ? '#fbbf24' : '#1e40af' }}>
                {language === 'ar' ? '📘 كيفية ترتيب الجملة:' : '📘 How to order the sentence:'}
              </p>
              <ul className="space-y-0.5 list-disc list-inside" style={{ color: isDark ? '#fcd34d' : '#1e3a8a' }}>
                <li>{language === 'ar' ? 'انقر على الكلمة من الصندوق السفلي لإضافتها.' : 'Click a word from the box below to add it.'}</li>
                <li>{language === 'ar' ? 'استخدم الأسهم الجانبية لتحريك الكلمة.' : 'Use the side arrows to move the word.'}</li>
                <li>{language === 'ar' ? 'انقر على الكلمة في منطقة الإجابة لإزالتها.' : 'Click the word in the answer area to remove it.'}</li>
                <li>{language === 'ar' ? 'يمكنك إخفاء هذه البطاقة بالضغط على ✕' : 'You can hide this card by clicking ✕'}</li>
              </ul>
            </div>
          </div>
        </motion.div>
      )}
      {!showGuide && (
        <button
          onClick={() => setShowGuide(true)}
          className="text-xs text-yellow-400 hover:text-yellow-300 transition flex items-center gap-1 mb-2"
        >
          <Icons.Info className="h-3 w-3" /> {language === 'ar' ? 'إظهار الإرشادات' : 'Show guide'}
        </button>
      )}

      <div
        className="min-h-[60px] p-4 rounded-xl border-2 border-dashed transition-all"
        style={{
          borderColor: currentAnswer.length > 0 ? '#fbbf24' : (isDark ? '#6b7280' : '#9ca3af'),
          backgroundColor: currentAnswer.length > 0 ? 'rgba(251,191,36,0.08)' : (isDark ? 'rgba(255,255,255,0.04)' : '#f3f4f6'),
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const word = e.dataTransfer.getData('text/plain');
          addWord(word);
        }}
      >
        <p className={`text-xs mb-2 ${styles.subtext}`}>
          {language === 'ar' ? '📝 رتب الكلمات لتكوين الجملة الصحيحة' : '📝 Arrange the words to form the correct sentence'}
        </p>
        <div
          className="flex items-center gap-2 overflow-x-auto pb-1 flex-nowrap"
          style={{ direction: 'ltr' }}
        >
          {currentAnswer.length === 0 && (
            <span className={`text-xs italic ${styles.subtext}`}>
              {language === 'ar' ? 'انقر على كلمة من الصندوق أدناه لإضافتها...' : 'Click a word from the box below to add it...'}
            </span>
          )}
          {currentAnswer.map((word, idx) => (
            <div key={idx} className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={() => moveWord(idx, -1)}
                disabled={idx === 0}
                style={arrowButtonStyle(idx === 0)}
                title={language === 'ar' ? 'تحريك لليسار' : 'Move left'}
                className="hover:scale-110 transition-transform"
              >
                <Icons.ChevronLeft className="h-4 w-4" />
              </button>

              <span
                onClick={() => removeWord(idx)}
                style={wordStyle}
                title={language === 'ar' ? 'انقر لإزالة الكلمة' : 'Click to remove word'}
                className="hover:scale-105 transition-transform"
              >
                {word}
              </span>

              <button
                onClick={() => moveWord(idx, 1)}
                disabled={idx === currentAnswer.length - 1}
                style={arrowButtonStyle(idx === currentAnswer.length - 1)}
                title={language === 'ar' ? 'تحريك لليمين' : 'Move right'}
                className="hover:scale-110 transition-transform"
              >
                <Icons.ChevronRight className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div
        className="p-3 rounded-xl"
        style={{
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db'}`,
          backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#f9fafb',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <p className={`text-xs ${styles.subtext}`}>
            📚 {language === 'ar' ? 'الكلمات المتاحة' : 'Available Words'}
          </p>
          <p className={`text-xs ${styles.subtext}`}>
            {availableWords.length} {language === 'ar' ? 'كلمة متبقية' : 'words remaining'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableWords.length === 0 && (
            <p className={`text-xs italic ${styles.subtext}`}>
              {language === 'ar' ? 'تم استخدام جميع الكلمات' : 'All words used'}
            </p>
          )}
          {availableWords.map((word, idx) => (
            <span
              key={idx}
              draggable
              onDragStart={(e) => handleDragStart(e, word)}
              onClick={() => addWord(word)}
              className="px-3 py-1.5 rounded-lg border cursor-grab active:cursor-grabbing transition"
              style={{
                borderColor: isDark ? 'rgba(255,255,255,0.15)' : '#d1d5db',
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : '#ffffff',
                color: isDark ? '#e5e7eb' : '#374151',
              }}
            >
              {word}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// ================================================================
// 3.9 مكون القطعة (Passage) مع أداة التلوين وتكبير النص المستقل
// ================================================================
const PassageDisplay = ({ passageId, originalText, examId, styles, isDark, passageFontSize, onFontSizeChange }) => {
  const [highlights, setHighlights] = useState([]);
  const [selectedColor, setSelectedColor] = useState('#FFEB3B');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!passageId || !examId) return;
    try {
      const key = `exam_${examId}_passage_highlights_${passageId}`;
      const saved = sessionStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setHighlights(parsed);
        }
      }
    } catch (e) {}
  }, [passageId, examId]);

  useEffect(() => {
    if (!passageId || !examId) return;
    try {
      const key = `exam_${examId}_passage_highlights_${passageId}`;
      sessionStorage.setItem(key, JSON.stringify(highlights));
    } catch (e) {}
  }, [highlights, passageId, examId]);

  const applyHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount) {
      toast('Please select text first', { icon: 'ℹ️' });
      return;
    }
    const selectedText = selection.toString().trim();
    if (!selectedText) {
      toast('Please select text first', { icon: 'ℹ️' });
      return;
    }
    const exists = highlights.some(h => h.text === selectedText);
    if (exists) {
      toast('This text is already highlighted', { icon: 'ℹ️' });
      return;
    }
    const newHighlight = {
      text: selectedText,
      color: selectedColor,
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 6),
    };
    setHighlights(prev => [...prev, newHighlight]);
    selection.removeAllRanges();
    toast.success('Text highlighted');
  }, [selectedColor, highlights]);

  const removeHighlight = useCallback((id) => {
    setHighlights(prev => prev.filter(h => h.id !== id));
    toast.success('Highlight removed');
  }, []);

  const resetAllHighlights = useCallback(() => {
    setHighlights([]);
    setShowResetConfirm(false);
    toast.success('All highlights removed');
  }, []);

  const renderHighlightedText = useCallback(() => {
    if (!originalText) return originalText || '';
    const sortedHighlights = [...highlights].sort((a, b) => b.text.length - a.text.length);
    const text = originalText;
    const positions = [];
    sortedHighlights.forEach(h => {
      let start = text.indexOf(h.text);
      while (start !== -1) {
        const end = start + h.text.length;
        const overlapping = positions.some(p => (start >= p.start && start < p.end) || (end > p.start && end <= p.end));
        if (!overlapping) {
          positions.push({ start, end, highlight: h });
          break;
        }
        start = text.indexOf(h.text, start + 1);
      }
    });
    positions.sort((a, b) => a.start - b.start);
    let parts = [];
    let currentIdx = 0;
    positions.forEach((p, idx) => {
      if (p.start > currentIdx) {
        parts.push(<span key={`text-${idx}`} className="text-inherit">{text.substring(currentIdx, p.start)}</span>);
      }
      parts.push(
        <span
          key={`hl-${idx}`}
          style={{
            backgroundColor: p.highlight.color,
            padding: '2px 4px',
            borderRadius: '3px',
            color: '#000',
            fontWeight: 'bold',
            boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
          }}
          className="inline-block"
        >
          {text.substring(p.start, p.end)}
        </span>
      );
      currentIdx = p.end;
    });
    if (currentIdx < text.length) {
      parts.push(<span key="text-end" className="text-inherit">{text.substring(currentIdx)}</span>);
    }
    return parts.length ? parts : text;
  }, [originalText, highlights]);

  const colorPalette = [
    '#FFEB3B', '#FFC107', '#FF9800', '#F44336', '#E91E63',
    '#9C27B0', '#3F51B5', '#2196F3', '#00BCD4', '#4CAF50',
    '#8BC34A', '#CDDC39'
  ];

  return (
    <div className="space-y-3">
      {/* أزرار التحكم: تلوين + تكبير نص القطعة */}
      <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-white/10 dark:bg-black/20 backdrop-blur-sm border border-white/20 dark:border-white/10">
        <div className="flex items-center gap-1">
          <span className={`text-xs ${styles.subtext} ml-1`}>🎨</span>
          <input
            type="color"
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
            className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent"
            title="Choose highlight color"
          />
        </div>
        <div className="flex gap-1 flex-wrap">
          {colorPalette.map(color => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                selectedColor === color ? 'border-yellow-400 scale-110' : 'border-white/20 hover:scale-105'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>
        <button
          onClick={applyHighlight}
          className="px-3 py-1.5 rounded-lg bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30 transition text-xs font-bold flex items-center gap-1"
        >
          <Icons.Highlighter className="h-3 w-3" /> Highlight Selected
        </button>
        {highlights.length > 0 && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition text-xs font-bold flex items-center gap-1"
          >
            <Icons.Eraser className="h-3 w-3" /> Reset All
          </button>
        )}
        <span className={`text-xs ${styles.subtext} mr-auto`}>
          {highlights.length} highlight{highlights.length !== 1 ? 's' : ''}
        </span>

        <div className="w-px h-6 bg-white/20 mx-2" />
        
        {/* أزرار تكبير نص القطعة فقط */}
        <span className={`text-xs ${styles.subtext}`}>📏</span>
        {['text-xs', 'text-sm', 'text-base', 'text-lg', 'text-xl'].map(size => (
          <button
            key={size}
            onClick={() => onFontSizeChange && onFontSizeChange(size)}
            className={`px-2 py-1 rounded-lg text-xs transition ${
              passageFontSize === size
                ? 'bg-yellow-400/20 text-yellow-400'
                : 'text-white/60 hover:text-white/90'
            }`}
          >
            {size === 'text-xs' ? 'A-' : size === 'text-xl' ? 'A++' : 'A'}
          </button>
        ))}
      </div>

      {showResetConfirm && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-between gap-3">
          <span className="text-xs text-red-400">Are you sure you want to remove all highlights?</span>
          <div className="flex gap-2">
            <button
              onClick={resetAllHighlights}
              className="px-3 py-1 rounded-lg bg-red-500 text-white text-xs font-bold hover:bg-red-600 transition"
            >
              Yes, remove all
            </button>
            <button
              onClick={() => setShowResetConfirm(false)}
              className="px-3 py-1 rounded-lg bg-white/10 text-white/70 text-xs hover:bg-white/20 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        ref={containerRef}
        dir="ltr"
        className={`p-4 rounded-xl ${styles.card} border ${styles.border} select-text`}
        style={{ direction: 'ltr', textAlign: 'left' }}
      >
        <div className={`${passageFontSize || 'text-base'} ${styles.text} leading-relaxed whitespace-pre-wrap`}>
          {renderHighlightedText()}
        </div>
      </div>

      <div className={`text-[10px] ${styles.subtext} flex items-center gap-1`}>
        <Icons.Info className="h-3 w-3" />
        <span>Select text in the passage, choose a color, then click "Highlight Selected"</span>
      </div>
    </div>
  );
};

// ================================================================
// 4. شاشة التفاصيل قبل البدء (النسخة الفخمة – كوكبية)
// ================================================================
const ExamIntroScreen = ({ exam, startExam, loading, styles, language, isDark }) => {
  const [isPulsing, setIsPulsing] = useState(true);
  const [countdown, setCountdown] = useState(null);
  const teacherName = exam?.teacher_name || 'مستر محمد رضوان'; // ✅ لن يظهر "غير محدد" أبداً
  const teacherInitial = teacherName.charAt(0).toUpperCase();
  const courseName = exam?.course_name || ''; // عرض الكورس فقط إن وجد، بدون "غير محدد"

  useEffect(() => {
    const interval = setInterval(() => setIsPulsing(prev => !prev), 1500);
    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      startExam();
    }
  }, [countdown, startExam]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, type: 'spring' }}
      className={`max-w-3xl mx-auto p-6 md:p-10 rounded-3xl border backdrop-blur-3xl shadow-2xl relative overflow-hidden ${
        isDark
          ? 'bg-white/10 border-white/20 shadow-yellow-400/30'
          : 'bg-white/50 border-gray-300 shadow-yellow-400/40'
      }`}
    >
      {/* تأثير الكوكب الدري – خلفيات لامعة متحركة */}
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/30 via-amber-500/20 to-orange-600/10 animate-pulse" />
      <div className="absolute -top-20 -right-20 w-80 h-80 bg-yellow-400/30 rounded-full blur-[80px] animate-pulse" />
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-cyan-400/20 rounded-full blur-[80px] animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-r from-yellow-400/10 to-transparent rounded-full blur-[120px] animate-spin-slow" />

      {countdown !== null ? (
        <motion.div
          key="countdown"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 relative z-10"
        >
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="text-8xl font-black text-yellow-400 drop-shadow-2xl"
          >
            {countdown}
          </motion.div>
          <p className={`text-xl ${styles.text} mt-4`}>
            {language === 'ar' ? 'استعد...' : 'Get Ready...'}
          </p>
        </motion.div>
      ) : (
        <div className="relative z-10">
          <div className="text-center mb-6">
            <motion.div
              animate={{ scale: isPulsing ? 1.1 : 1, rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, ease: 'easeInOut', repeat: Infinity }}
              className="inline-flex p-4 rounded-full bg-gradient-to-br from-yellow-400/40 to-yellow-600/40 border-2 border-yellow-400/60 shadow-2xl shadow-yellow-400/40"
            >
              <Icons.Clipboard className="h-16 w-16 text-white drop-shadow-lg" />
            </motion.div>
            <motion.h2
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className={`text-3xl md:text-4xl font-extrabold ${styles.text} mt-4`}
            >
              {exam?.title}
            </motion.h2>
            {exam?.description && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className={`${styles.subtext} text-base mt-2`}
              >
                {exam.description}
              </motion.p>
            )}
            <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 to-yellow-600 mx-auto mt-3 rounded-full" />
          </div>

          {/* معلومات المعلم والكورس – بدون "غير محدد" */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className={`mb-4 p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'} flex items-center gap-4`}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-xl shadow-lg">
              {teacherInitial}
            </div>
            <div>
              <p className={`text-sm font-bold ${styles.text}`}>{teacherName}</p>
              {courseName && (
                <p className={`text-xs ${styles.subtext}`}>{courseName}</p>
              )}
            </div>
          </motion.div>

          {/* معلومات الامتحان */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className={`grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-xl ${isDark ? 'bg-black/20 border border-white/10' : 'bg-gray-100 border border-gray-200'} backdrop-blur-sm`}
          >
            <div className="text-center flex flex-col items-center gap-1">
              <Icons.BookOpen className="h-5 w-5 text-yellow-400" />
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'الأسئلة' : 'Questions'}</p>
              <p className={`text-lg font-bold ${styles.text}`}>{exam?.questionCount || 0}</p>
            </div>
            <div className="text-center flex flex-col items-center gap-1">
              <Icons.Clock className="h-5 w-5 text-yellow-400" />
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'المدة' : 'Duration'}</p>
              <p className={`text-lg font-bold ${styles.text}`}>{exam?.duration_minutes || 0} {language === 'ar' ? 'د' : 'm'}</p>
            </div>
            <div className="text-center flex flex-col items-center gap-1">
              <Icons.Star className="h-5 w-5 text-yellow-400" />
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'الدرجة الكلية' : 'Total Marks'}</p>
              <p className={`text-lg font-bold ${styles.text}`}>{exam?.total_marks || 0}</p>
            </div>
            <div className="text-center flex flex-col items-center gap-1">
              <Icons.Shield className="h-5 w-5 text-yellow-400" />
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'المخالفات المسموحة' : 'Max Violations'}</p>
              <p className={`text-lg font-bold ${styles.text}`}>{exam?.maxViolations || 5}</p>
            </div>
          </motion.div>

          {/* شريط التقدم (0%) */}
          <div className="mt-6 relative z-10">
            <div className="flex justify-between text-xs">
              <span className={`${styles.subtext}`}>{language === 'ar' ? 'جاهز للانطلاق' : 'Ready to start'}</span>
              <span className={`${styles.text} font-bold`}>0%</span>
            </div>
            <div className="w-full h-2 bg-white/20 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: '0%' }}
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
              />
            </div>
          </div>

          {/* قائمة الأمان */}
          <div className={`mt-4 p-4 rounded-xl ${isDark ? 'bg-red-500/10 border border-red-500/20' : 'bg-red-50 border border-red-200'} relative z-10`}>
            <p className={`text-xs font-semibold ${isDark ? 'text-red-400' : 'text-red-600'} flex items-center gap-2`}>
              <Icons.Shield className="h-4 w-4" />
              {language === 'ar' ? '🔒 بيئة امتحان آمنة' : '🔒 Secure Exam Environment'}
            </p>
            <ul className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-700'} mt-1 space-y-0.5 list-disc list-inside`}>
              <li>{language === 'ar' ? 'سيتم ملء الشاشة تلقائياً' : 'Fullscreen will be activated'}</li>
              <li>{language === 'ar' ? 'النسخ واللصق وتصوير الشاشة ممنوع' : 'Copy, paste & screenshots are disabled'}</li>
              <li>{language === 'ar' ? 'الخروج من الامتحان يسجل مخالفة' : 'Leaving the exam logs a violation'}</li>
              <li>{language === 'ar' ? `الحد الأقصى للمخالفات: ${exam?.maxViolations || 5}` : `Max violations: ${exam?.maxViolations || 5}`}</li>
            </ul>
          </div>

          {/* زر البدء */}
          <motion.button
            onClick={handleStart}
            disabled={loading || exam?.attemptsLeft <= 0}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className={`w-full mt-6 py-3.5 rounded-xl font-bold text-black transition-all duration-300 relative z-10 ${
              exam?.attemptsLeft > 0
                ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 hover:shadow-2xl shadow-lg shadow-yellow-400/30'
                : 'bg-gray-500 cursor-not-allowed opacity-50'
            }`}
          >
            {loading ? (
              <><div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin inline-block mr-2" /> {language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</>
            ) : exam?.attemptsLeft <= 0 ? (
              language === 'ar' ? '🚫 استنفدت المحاولات' : '🚫 No attempts left'
            ) : (
              <><Icons.Rocket className="h-5 w-5 inline mr-2" /> {language === 'ar' ? '🚀 بدء الامتحان' : '🚀 Start Exam'}</>
            )}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
};

// ================================================================
// 5. المؤقت المميز (عرض الدقائق والثواني فقط)
// ================================================================
const ExamTimer = ({ remaining, isWarning, isCritical, styles }) => {
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const timeStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-2 px-6 py-3 rounded-2xl border-2 font-bold transition-all duration-500 shadow-xl backdrop-blur-xl ${
      isCritical
        ? 'bg-gradient-to-r from-red-500/40 to-red-600/40 border-red-500/80 text-red-500 animate-pulse shadow-red-500/30'
        : isWarning
        ? 'bg-gradient-to-r from-yellow-400/40 to-yellow-500/40 border-yellow-400/80 text-yellow-400 shadow-yellow-400/30'
        : `bg-gradient-to-r from-yellow-400/20 to-yellow-500/20 border-yellow-400/50 ${styles.text} shadow-yellow-400/20`
    }`}>
      <Icons.Clock className={`h-6 w-6 ${isCritical ? 'text-red-500' : isWarning ? 'text-yellow-400' : 'text-yellow-400'}`} />
      <span className="font-mono text-3xl font-black tabular-nums tracking-wider drop-shadow-lg">
        {timeStr}
      </span>
    </div>
  );
};

// ================================================================
// 6. شريط التقدم المحسّن مع أنيميشن وأيقونات + عرض الوقت
// ================================================================
const ProgressBar = ({ answered, total, isDark, timeRemaining }) => {
  const percentage = total === 0 ? 0 : (answered / total) * 100;
  const isComplete = percentage === 100;

  return (
    <div className="w-full flex items-center gap-4">
      <div className="relative flex-1 h-3 bg-white/10 rounded-full overflow-hidden shadow-inner">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`h-full rounded-full shadow-lg ${
            isComplete
              ? 'bg-gradient-to-r from-emerald-400 to-green-400'
              : 'bg-gradient-to-r from-yellow-400 to-yellow-600'
          }`}
        />
        <motion.div
          initial={{ left: '0%' }}
          animate={{ left: `${percentage}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-yellow-400 shadow-lg"
          style={{ left: `${Math.min(percentage, 100)}%`, transform: 'translate(-50%, -50%)' }}
        />
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-sm font-bold text-white/90 bg-black/20 px-3 py-1 rounded-full">
          {answered}/{total}
        </span>
        <span className="text-sm font-bold text-yellow-400 bg-black/20 px-2 py-1 rounded-full">
          {Math.round(percentage)}%
        </span>
        {timeRemaining !== undefined && (
          <span className="text-xs text-white/60 bg-black/20 px-2 py-0.5 rounded-full flex items-center gap-1">
            <Icons.Clock className="h-3 w-3" /> {formatTime(timeRemaining)}
          </span>
        )}
        {isComplete && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="text-emerald-400"
          >
            <Icons.CheckCircle className="h-5 w-5" />
          </motion.span>
        )}
      </div>
    </div>
  );
};

// ================================================================
// 7. الشريط الجانبي مع تأثيرات hover و tap
// ================================================================
const QuestionSidebar = ({ 
  questions, 
  answers, 
  markedQuestions, 
  reviewMarkedQuestions, // ✅ إضافة prop
  currentIndex, 
  currentQuestion,
  goToQuestion, 
  language, 
  styles 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState('all');

  const realQuestions = questions;

  useEffect(() => {
    const handleResize = () => setIsOpen(window.innerWidth >= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getStatus = (q) => {
    const ans = answers[q.id];
    const isAnswered = ans !== undefined && ans !== null && ans !== '';
    const isMarked = markedQuestions.includes(q.id);
    if (isAnswered) return 'answered';
    if (isMarked) return 'marked';
    return 'unanswered';
  };

  const filtered = realQuestions.filter(q => {
    if (filter === 'all') return true;
    return getStatus(q) === filter;
  });

  return (
    <div className={`relative flex-shrink-0 transition-all duration-300 ${isOpen ? 'w-64' : 'w-12'} hidden sm:block`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ touchAction: 'manipulation' }}
        className={`absolute top-4 ${isOpen ? 'right-2' : 'right-1'} z-10 p-2 rounded-lg ${styles.card} bg-opacity-60 backdrop-blur-sm border ${styles.border} hover:bg-opacity-80 transition-all`}
      >
        {isOpen ? <Icons.ChevronRight className="h-4 w-4" /> : <Icons.ChevronLeft className="h-4 w-4" />}
      </button>
      <div className={`h-full overflow-y-auto p-3 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} transition-all duration-300`}>
        <p className={`text-xs font-bold ${styles.text} opacity-70 mb-2`}>{language === 'ar' ? 'قائمة الأسئلة' : 'Questions'}</p>
        <div className="flex gap-1 mb-3 text-xs">
          {['all', 'answered', 'marked', 'unanswered'].map(f => {
            const labels = { all: language === 'ar' ? 'الكل' : 'All', answered: language === 'ar' ? 'مجاب' : 'Answered', marked: language === 'ar' ? 'مؤجل' : 'Marked', unanswered: language === 'ar' ? 'غير مجاب' : 'Unanswered' };
            return (
              <button key={f} onClick={() => setFilter(f)} style={{ touchAction: 'manipulation' }} className={`px-2 py-0.5 rounded-lg transition ${filter === f ? 'bg-yellow-400/20 text-yellow-400' : `${styles.card} bg-opacity-20 ${styles.text} opacity-60`}`}>
                {labels[f]}
              </button>
            );
          })}
        </div>
        {filtered.map((q, idx) => {
          const originalIdx = questions.findIndex(qq => qq.id === q.id);
          const status = getStatus(q);
          let statusColor = 'border-white/10 bg-white/5';
          let statusIcon = null;
          if (status === 'answered') {
            statusColor = 'border-green-500 bg-green-500/20 text-green-300';
            statusIcon = <Icons.CheckCircle className="h-4 w-4 text-green-400" />;
          } else if (status === 'marked') {
            statusColor = 'border-yellow-400 bg-yellow-400/20 text-yellow-300';
            statusIcon = <Icons.Bookmark className="h-4 w-4 text-yellow-400" />;
          } else {
            statusColor = 'border-gray-500/30 bg-gray-500/10 text-gray-400';
            statusIcon = <Icons.Circle className="h-4 w-4 text-gray-400" />;
          }
          // ✅ إضافة حالة للمراجعة (إذا كان السؤال محدداً للمراجعة)
          const isReviewMarked = reviewMarkedQuestions.includes(q.id);
          if (isReviewMarked) {
            statusColor = 'border-yellow-400 bg-yellow-400/20 text-yellow-300';
            statusIcon = <Icons.Flag className="h-4 w-4 text-yellow-400" />;
          }
          const isCurrent = originalIdx === currentIndex;
          return (
            <motion.button
              key={q.id}
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.95 }}
              onClick={() => goToQuestion(originalIdx)}
              style={{ touchAction: 'manipulation' }}
              title={q.question_text}
              className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all duration-200 text-sm ${
                isCurrent ? 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/10' : statusColor
              }`}
            >
              <span className={`font-medium ${isCurrent ? 'text-yellow-400' : styles.text} opacity-80`}>
                {idx + 1} {isCurrent && '◀'}
              </span>
              <div>{statusIcon}</div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

// ================================================================
// 8. شاشة القفل (LockOverlay) – بدون صوت
// ================================================================
const LockOverlay = ({ violations, maxViolations, language, styles, onCancel, onCloseExam }) => {
  const [countdown, setCountdown] = useState(5);
  const [isCancelled, setIsCancelled] = useState(false);

  useEffect(() => {
    if (isCancelled) return;
    if (countdown <= 0) {
      onCloseExam();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown, onCloseExam, isCancelled]);

  const handleCancel = () => {
    setIsCancelled(true);
    if (onCancel) onCancel();
    const el = document.documentElement;
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
    else if (el.msRequestFullscreen) el.msRequestFullscreen();
    setTimeout(() => {
      if (!document.fullscreenElement) {
        toast.error(language === 'ar' ? '⚠️ لم نتمكن من العودة إلى ملء الشاشة، حاول مرة أخرى' : '⚠️ Could not return to fullscreen, try again');
        setIsCancelled(false);
        setCountdown(5);
      } else {
        onCancel();
      }
    }, 1000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-xl flex items-center justify-center"
    >
      <div className="text-center space-y-4 px-6 max-w-md">
        <motion.div
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="inline-flex p-4 rounded-full bg-red-500/20 border-2 border-red-500/50"
        >
          <Icons.AlertTriangle className="h-12 w-12 text-red-400" />
        </motion.div>
        <h2 className="text-3xl font-extrabold text-red-400">
          {language === 'ar' ? '⚠️ تحذير أمني!' : '⚠️ Security Alert!'}
        </h2>
        <p className="text-white text-5xl font-bold">{countdown}</p>
        <p className="text-white/80 text-base">
          {language === 'ar' 
            ? `تم اكتشاف خروجك من بيئة الامتحان (${violations} من ${maxViolations}). العودة فوراً إلى ملء الشاشة خلال ${countdown} ثوانٍ.`
            : `Tab switch detected (${violations} of ${maxViolations}). Return to fullscreen within ${countdown} seconds.`}
        </p>
        <div className="flex flex-col gap-2">
          <button
            onClick={handleCancel}
            style={{ touchAction: 'manipulation' }}
            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition-colors shadow-xl text-lg"
          >
            {language === 'ar' ? '🔄 إلغاء الإغلاق والعودة الآن' : '🔄 Cancel closure and return now'}
          </button>
          <button
            onClick={() => {
              const el = document.documentElement;
              if (el.requestFullscreen) el.requestFullscreen().catch(() => {});
              else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
              else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
              else if (el.msRequestFullscreen) el.msRequestFullscreen();
            }}
            style={{ touchAction: 'manipulation' }}
            className="px-8 py-3 bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 font-bold rounded-xl transition-colors text-lg"
          >
            {language === 'ar' ? '📱 محاولة ملء الشاشة يدوياً' : '📱 Try fullscreen manually'}
          </button>
        </div>
        <p className="text-white/40 text-xs">
          {language === 'ar' ? 'سيتم إغلاق الامتحان تلقائياً وخصم محاولة إذا لم تعد.' : 'Exam will close automatically and deduct an attempt if you don\'t return.'}
        </p>
      </div>
    </motion.div>
  );
};

// ================================================================
// 9. العلامة المائية – محسّنة ومكثّفة
// ================================================================
const SecureWatermark = ({ user, examTitle, isDark }) => {
  const watermarkText = `${user?.full_name || 'Student'} | ${user?.email || ''} | ${user?.phone || ''} | ${user?.school || ''} | ${user?.grade || ''} | ${user?.governorate || ''} | ${examTitle || ''}`;

  return (
    <div
      className="fixed inset-0 z-[100] pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 flex flex-wrap gap-16"
        style={{
          transform: 'rotate(-20deg) scale(1.8)',
          transformOrigin: 'center center',
          opacity: isDark ? '0.06' : '0.08',
        }}
      >
        {Array.from({ length: 400 }).map((_, i) => (
          <span
            key={i}
            className="text-[10px] font-bold whitespace-nowrap"
            style={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            {watermarkText}
          </span>
        ))}
      </div>
    </div>
  );
};

// ================================================================
// 10. أدوات التحكم في الخط
// ================================================================
const FontControls = ({ fontSize, setFontSize, isBold, setIsBold, isItalic, setIsItalic, resetFont, language, isDark }) => {
  const sizes = [
    { label: 'ص', value: 'text-sm' },
    { label: 'م', value: 'text-base' },
    { label: 'ك', value: 'text-lg' },
    { label: 'ك+', value: 'text-xl' },
    { label: 'ك++', value: 'text-2xl' },
  ];

  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-white/10 dark:bg-white/5 backdrop-blur-sm border border-white/20 dark:border-white/10">
      {sizes.map((s) => (
        <button
          key={s.value}
          onClick={() => setFontSize(s.value)}
          style={{ touchAction: 'manipulation' }}
          className={`px-2 py-1 rounded-lg text-xs transition-all ${
            fontSize === s.value
              ? 'bg-yellow-400/20 text-yellow-400'
              : isDark ? 'text-white/60 hover:text-white/90' : 'text-gray-600 hover:text-gray-900'
          }`}
          title={s.label}
        >
          {s.label}
        </button>
      ))}
      <div className="w-px h-6 bg-white/20 dark:bg-white/10 mx-1" />
      <button
        onClick={() => setIsBold(!isBold)}
        style={{ touchAction: 'manipulation' }}
        className={`p-1 rounded-lg transition-all ${
          isBold
            ? 'bg-yellow-400/20 text-yellow-400'
            : isDark ? 'text-white/60 hover:text-white/90' : 'text-gray-600 hover:text-gray-900'
        }`}
        title={language === 'ar' ? 'عريض' : 'Bold'}
      >
        <Icons.Bold className="h-4 w-4" />
      </button>
      <button
        onClick={() => setIsItalic(!isItalic)}
        style={{ touchAction: 'manipulation' }}
        className={`p-1 rounded-lg transition-all ${
          isItalic
            ? 'bg-yellow-400/20 text-yellow-400'
            : isDark ? 'text-white/60 hover:text-white/90' : 'text-gray-600 hover:text-gray-900'
        }`}
        title={language === 'ar' ? 'مائل' : 'Italic'}
      >
        <Icons.Italic className="h-4 w-4" />
      </button>
      <button
        onClick={resetFont}
        style={{ touchAction: 'manipulation' }}
        className="p-1 rounded-lg text-gray-400 dark:text-white/40 hover:text-gray-600 dark:hover:text-white/80 transition-all"
        title={language === 'ar' ? 'إعادة تعيين' : 'Reset'}
      >
        <Icons.RotateCcw className="h-4 w-4" />
      </button>
    </div>
  );
};

// ================================================================
// 11. لوحة الإعدادات المتقدمة
// ================================================================
const ExamSettingsPanel = ({ 
  fontSize, setFontSize, 
  isBold, setIsBold, 
  isItalic, setIsItalic, 
  resetFont,
  resetAllSettings,
  language, isDark,
  styles 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bgColor, setBgColor] = useState(isDark ? '#0A0A0A' : '#FFFFFF');
  const [textColor, setTextColor] = useState(isDark ? '#FFFFFF' : '#000000');

  const sizes = [
    { label: 'ص', value: 'text-sm' },
    { label: 'م', value: 'text-base' },
    { label: 'ك', value: 'text-lg' },
    { label: 'ك+', value: 'text-xl' },
    { label: 'ك++', value: 'text-2xl' },
  ];

  const handleBgColorChange = (color) => {
    setBgColor(color);
    document.documentElement.style.backgroundColor = color;
    document.documentElement.style.setProperty('--exam-bg', color);
  };

  const handleTextColorChange = (color) => {
    setTextColor(color);
    document.documentElement.style.color = color;
    document.documentElement.style.setProperty('--exam-text', color);
  };

  const resetAll = () => {
    resetFont();
    setBgColor(isDark ? '#0A0A0A' : '#FFFFFF');
    setTextColor(isDark ? '#FFFFFF' : '#000000');
    document.documentElement.style.backgroundColor = '';
    document.documentElement.style.color = '';
    if (resetAllSettings) resetAllSettings();
    toast.success(language === 'ar' ? 'تم إعادة تعيين جميع الإعدادات' : 'All settings reset');
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ touchAction: 'manipulation' }}
        className={`p-2 rounded-lg transition ${isOpen ? 'bg-yellow-400/20 text-yellow-400' : 'bg-white/5 text-white/60 hover:text-white/90'}`}
        title={language === 'ar' ? 'الإعدادات' : 'Settings'}
      >
        <Icons.Settings className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className={`absolute right-0 top-full mt-2 p-4 rounded-xl ${styles.card} border ${styles.border} shadow-2xl z-[99999] w-72 max-h-[80vh] overflow-y-auto`}
            style={{ direction: 'ltr' }}
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className={`text-sm font-bold ${styles.text}`}>
                {language === 'ar' ? '⚙️ الإعدادات' : '⚙️ Settings'}
              </h4>
              <button onClick={() => setIsOpen(false)} className="text-red-400 hover:text-red-300 transition">
                <Icons.X className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-3">
              <p className={`text-xs ${styles.subtext} mb-1`}>
                {language === 'ar' ? '📏 حجم الخط' : '📏 Font Size'}
              </p>
              <div className="flex gap-1">
                {sizes.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setFontSize(s.value)}
                    className={`px-2 py-1 rounded-lg text-xs transition ${
                      fontSize === s.value
                        ? 'bg-yellow-400/20 text-yellow-400'
                        : `${styles.card} ${styles.subtext} hover:${styles.text}`
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-3">
              <p className={`text-xs ${styles.subtext} mb-1`}>
                {language === 'ar' ? '✏️ أنماط الخط' : '✏️ Font Styles'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsBold(!isBold)}
                  className={`p-2 rounded-lg transition ${
                    isBold
                      ? 'bg-yellow-400/20 text-yellow-400'
                      : `${styles.card} ${styles.subtext} hover:${styles.text}`
                  }`}
                >
                  <Icons.Bold className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setIsItalic(!isItalic)}
                  className={`p-2 rounded-lg transition ${
                    isItalic
                      ? 'bg-yellow-400/20 text-yellow-400'
                      : `${styles.card} ${styles.subtext} hover:${styles.text}`
                  }`}
                >
                  <Icons.Italic className="h-4 w-4" />
                </button>
                <button
                  onClick={resetFont}
                  className={`p-2 rounded-lg transition ${styles.card} ${styles.subtext} hover:${styles.text}`}
                >
                  <Icons.RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="mb-3">
              <p className={`text-xs ${styles.subtext} mb-1`}>
                {language === 'ar' ? '🎨 تخصيص الألوان' : '🎨 Custom Colors'}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <div className="flex items-center gap-1">
                  <span className={`text-xs ${styles.subtext}`}>
                    {language === 'ar' ? 'خلفية:' : 'Bg:'}
                  </span>
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => handleBgColorChange(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-xs ${styles.subtext}`}>
                    {language === 'ar' ? 'نص:' : 'Text:'}
                  </span>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => handleTextColorChange(e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-white/20 bg-transparent"
                  />
                </div>
                <button
                  onClick={resetAll}
                  className={`text-xs px-2 py-1 rounded-lg ${styles.card} ${styles.subtext} hover:${styles.text} transition`}
                >
                  {language === 'ar' ? 'إعادة تعيين الكل' : 'Reset All'}
                </button>
              </div>
            </div>

            <div className="border-t border-white/10 pt-2 flex flex-wrap gap-1">
              <button
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className={`text-xs px-2 py-1 rounded-lg ${styles.card} ${styles.subtext} hover:${styles.text} transition`}
              >
                <Icons.ArrowUp className="h-3 w-3 inline mr-1" />
                {language === 'ar' ? 'أعلى الصفحة' : 'Top'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className={`text-xs px-2 py-1 rounded-lg ${styles.card} ${styles.subtext} hover:${styles.text} transition`}
              >
                <Icons.X className="h-3 w-3 inline mr-1" />
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ================================================================
// 12. نافذة تأكيد التسليم – مخصصة وأنيقة
// ================================================================
const SubmitConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  totalQuestions,
  answeredCount,
  reviewCount,
  language,
  isDark,
  styles,
}) => {
  if (!isOpen) return null;

  const unanswered = totalQuestions - answeredCount;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[999999] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className={`max-w-lg w-full p-8 rounded-3xl ${styles.card} border ${styles.border} shadow-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center mb-6">
          <div className="inline-flex p-4 rounded-full bg-yellow-400/20 border-2 border-yellow-400/30">
            <Icons.ClipboardCheck className="h-12 w-12 text-yellow-400" />
          </div>
          <h2 className={`text-2xl font-extrabold mt-4 ${styles.text}`}>
            {language === 'ar' ? 'تأكيد تسليم الامتحان' : 'Confirm Submission'}
          </h2>
        </div>

        <div className="space-y-3">
          <div className={`flex justify-between p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${styles.border}`}>
            <span className={styles.text}>{language === 'ar' ? 'إجمالي الأسئلة' : 'Total Questions'}</span>
            <span className="font-bold text-yellow-400">{totalQuestions}</span>
          </div>
          <div className={`flex justify-between p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${styles.border}`}>
            <span className="text-green-400">{language === 'ar' ? 'تم الإجابة' : 'Answered'}</span>
            <span className="font-bold text-green-400">{answeredCount}</span>
          </div>
          <div className={`flex justify-between p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${styles.border}`}>
            <span className="text-red-400">{language === 'ar' ? 'لم تُجب' : 'Unanswered'}</span>
            <span className="font-bold text-red-400">{unanswered}</span>
          </div>
          <div className={`flex justify-between p-3 rounded-xl ${isDark ? 'bg-white/5' : 'bg-gray-50'} border ${styles.border}`}>
            <span className="text-yellow-400">{language === 'ar' ? 'للمراجعة' : 'For Review'}</span>
            <span className="font-bold text-yellow-400">{reviewCount}</span>
          </div>
        </div>

        {unanswered > 0 && (
          <div className={`mt-4 p-3 rounded-xl ${isDark ? 'bg-yellow-500/10 border border-yellow-500/20' : 'bg-yellow-50 border border-yellow-200'}`}>
            <p className={`text-sm ${isDark ? 'text-yellow-300' : 'text-yellow-700'}`}>
              ⚠️ {language === 'ar'
                ? `يوجد ${unanswered} سؤال/أسئلة غير مجابة. هل أنت متأكد من التسليم؟`
                : `There are ${unanswered} unanswered question(s). Are you sure you want to submit?`}
            </p>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onConfirm}
            className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-xl"
          >
            {language === 'ar' ? '✅ تأكيد التسليم' : '✅ Confirm Submit'}
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-3 rounded-xl transition ${
              isDark ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
            }`}
          >
            {language === 'ar' ? '🔙 مراجعة' : '🔙 Review'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 13. الصفحة الرئيسية – النسخة النهائية مع نظام المراجعة وتأكيد التسليم المتقدم
// ================================================================
export default function StudentExamPage() {
  const router = useRouter();
  const params = useParams();
  const examId = params.id;
  const { theme, language } = useTheme();
  const isDark = theme === 'dark';

  const contrast = isDark ? HC.dark : HC.light;
  const styles = {
    bg: `bg-[${contrast.bg}]`,
    text: `text-[${contrast.text}]`,
    border: `border-[${contrast.border}]`,
    card: `bg-[${contrast.card}]`,
    subtext: `text-[${contrast.muted}]`,
  };

  const [exam, setExam] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [passages, setPassages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [examStatus, setExamStatus] = useState('intro'); // intro, waiting, started, submitted
  const [error, setError] = useState('');

  const [student, setStudent] = useState(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [markedQuestions, setMarkedQuestions] = useState([]);
  const [highlightedQuestions, setHighlightedQuestions] = useState([]);
  // ✅ إضافة حالة reviewMarkedQuestions لتخزين الأسئلة المحددة للمراجعة
  const [reviewMarkedQuestions, setReviewMarkedQuestions] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStartedAt, setExamStartedAt] = useState(null);
  const [violations, setViolations] = useState(0);
  const [showLockScreen, setShowLockScreen] = useState(false);
  const [attemptId, setAttemptId] = useState(null);
  const [attemptsLeft, setAttemptsLeft] = useState(1);

  const [fontSize, setFontSize] = useState('text-base');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [passageFontSize, setPassageFontSize] = useState('text-base');
  const resetFont = () => {
    setFontSize('text-base');
    setIsBold(false);
    setIsItalic(false);
  };

  // ===== حالة شاشة الانتظار بعد التسليم =====
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ===== حالة نافذة تأكيد التسليم =====
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitStats, setSubmitStats] = useState({ total: 0, answered: 0, review: 0 });

  // ===== متغيرات الأمان =====
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const MAX_FULLSCREEN_EXITS = exam?.maxFullscreenExits || 3;
  const [isExamForcedClosed, setIsExamForcedClosed] = useState(false);
  const visibilityTimerRef = useRef(null);
  const visibilityStartTimeRef = useRef(null);

  // ===== متغيرات جديدة للتحكم في سلوك الخروج من ملء الشاشة (مهلة سماح) =====
  const [fullscreenExitTimer, setFullscreenExitTimer] = useState(null);
  const fullscreenExitAttemptsRef = useRef(0); // استخدام ref بدلاً من state
  const FULLSCREEN_GRACE_PERIOD = 3000; // 3 ثواني مهلة للعودة

  // ===== حالة إظهار الزر العائم للعودة إلى ملء الشاشة =====
  const [showFullscreenButton, setShowFullscreenButton] = useState(false);

  const timerRef = useRef(null);
  const answersRef = useRef(answers);
  const violationsRef = useRef(violations);
  const maxViolations = exam?.maxViolations || 5;
  const audioContextRef = useRef(null);

  const lastWidthRef = useRef(0);
  const lastHeightRef = useRef(0);

  // ===== إضافة isRenderingRef لتجنب تحديث الحالة أثناء التصيير =====
  const isRenderingRef = useRef(false);

  // ===== التحقق من وجود محاولة ناجحة سابقة =====
  const [passedAttempt, setPassedAttempt] = useState(null);
  const [showPassedScreen, setShowPassedScreen] = useState(false);

  // ✅ حالات جديدة للتحكم في الوصول إلى الامتحان (الكورسات المدفوعة)
  const [accessDenied, setAccessDenied] = useState(false);
  const [accessReason, setAccessReason] = useState('');
  const [isCheckingAccess, setIsCheckingAccess] = useState(false);

  const checkIfPassed = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('exam_id', examId)
        .eq('student_id', user.id)
        .eq('passed', true)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .single();
      if (data && !error) {
        setPassedAttempt(data);
        setShowPassedScreen(true);
      }
    } catch (err) {
      // لا يوجد محاولة ناجحة، نكمل عادي
    }
  }, [examId]);

  useEffect(() => {
    if (examId) {
      checkIfPassed();
    }
  }, [examId, checkIfPassed]);

  // ===== مراجع الإجابات والمخالفات =====
  useEffect(() => { answersRef.current = answers; }, [answers]);
  useEffect(() => { violationsRef.current = violations; }, [violations]);

  // ===== دالة التشغيل الصوتي للتحذير (تُستخدم فقط عند محاولات الاختراق) =====
  const playAlert = useCallback((frequency = 800) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequency, audioCtx.currentTime);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.5);
    } catch (e) {}
  }, []);

  // ===== دالة طلب ملء الشاشة (تدعم جميع المتصفحات) =====
  const requestFullscreen = useCallback(() => {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) {
        el.requestFullscreen().catch(() => {});
      } else if (el.webkitRequestFullscreen) {
        el.webkitRequestFullscreen();
      } else if (el.mozRequestFullScreen) {
        el.mozRequestFullScreen();
      } else if (el.msRequestFullscreen) {
        el.msRequestFullscreen();
      }
    } catch (e) {}
  }, []);

  // ===== دالة الإغلاق القسري =====
  const forceCloseExam = useCallback(async () => {
    if (examStatus === 'submitted' || isExamForcedClosed) return;
    setIsExamForcedClosed(true);
    setExamStatus('submitted');
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      sessionStorage.removeItem(`exam_${examId}_answers`);
      sessionStorage.removeItem(`exam_${examId}_highlights`);
      
      if (attemptId) {
        await supabase
          .from('exam_attempts')
          .update({
            answers: {},
            score: 0,
            status: 'terminated',
            proctoring_log: {
              violations: violationsRef.current,
              forced_closed: true,
              fullscreen_exits: fullscreenExitCount,
              reason: 'security_violation',
            },
            submitted_at: new Date().toISOString(),
          })
          .eq('id', attemptId);
      }

      const currentAttemptsLeft = attemptsLeft;
      const remaining = Math.max(0, currentAttemptsLeft - 1);
      sessionStorage.setItem(`exam_${examId}_attempts_left`, remaining.toString());
      setAttemptsLeft(remaining);

      toast.error(language === 'ar'
        ? `❌ تم إغلاق الامتحان بسبب خروقات أمنية متكررة. المحاولات المتبقية: ${remaining}`
        : `❌ Exam closed due to repeated security violations. Attempts left: ${remaining}`
      );

      router.push(`/dashboard/student/exams/${examId}/result?score=0&total=${exam?.total_marks || 0}`);
    } catch (err) {
      console.error('Force close error:', err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء إغلاق الامتحان' : 'Error closing exam');
    }
  }, [examStatus, isExamForcedClosed, examId, attemptId, attemptsLeft, language, router, fullscreenExitCount, exam]);

  // ===== معالج الخروج من ملء الشاشة – مع زر عائم ومهلة سماح =====
  const handleFullscreenChange = useCallback(() => {
    if (examStatus !== 'started' || isExamForcedClosed) return;

    const isFullscreen = !!document.fullscreenElement;
    const isVisible = document.visibilityState === 'visible';

    // إذا كان في ملء الشاشة، نخفي الزر ونلغي المؤقتات
    if (isFullscreen) {
      setShowFullscreenButton(false);
      if (fullscreenExitTimer) {
        clearTimeout(fullscreenExitTimer);
        setFullscreenExitTimer(null);
      }
      fullscreenExitAttemptsRef.current = 0;
      return;
    }

    // إذا كان التبويب غير مرئي، يتولى handleVisibilityChange الأمر (طرد فوري)
    if (!isVisible) return;

    // التبويب مرئي ولكن ليس في ملء الشاشة → نعرض الزر العائم
    setShowFullscreenButton(true);

    // محاولة فورية للعودة (قد تنجح في بعض المتصفحات)
    requestFullscreen();

    // بدء مهلة سماح (3 ثوانٍ) لتسجيل مخالفة إذا لم يعد المستخدم
    if (!fullscreenExitTimer) {
      const timer = setTimeout(() => {
        if (!document.fullscreenElement) {
          fullscreenExitAttemptsRef.current += 1;
          if (fullscreenExitAttemptsRef.current >= MAX_FULLSCREEN_EXITS) {
            forceCloseExam();
          } else {
            toast.error(
              language === 'ar'
                ? '⚠️ لم تعد إلى ملء الشاشة في الوقت المحدد. تم تسجيل مخالفة.'
                : '⚠️ You did not return to fullscreen in time. Violation recorded.',
              { duration: 3000 }
            );
          }
        }
        setFullscreenExitTimer(null);
      }, FULLSCREEN_GRACE_PERIOD);
      setFullscreenExitTimer(timer);
    }
  }, [examStatus, isExamForcedClosed, requestFullscreen, forceCloseExam, maxViolations, language, fullscreenExitTimer, FULLSCREEN_GRACE_PERIOD, MAX_FULLSCREEN_EXITS]);

  // ===== مراقبة تغيير التبويب (Visibility Change) – طرد فوري =====
  const handleVisibilityChange = useCallback(() => {
    if (examStatus !== 'started' || isExamForcedClosed) return;

    const isVisible = document.visibilityState === 'visible';

    if (!isVisible) {
      // ✅ تغيير التبويب = طرد فوري (إغلاق الامتحان مباشرة)
      toast.error(
        language === 'ar'
          ? '⚠️ تم رصد تغيير التبويب - سيتم إغلاق الامتحان فوراً'
          : '⚠️ Tab switch detected - exam will be closed immediately',
        { duration: 3000 }
      );
      // إغلاق فوري دون مهلة
      forceCloseExam();
    }
  }, [examStatus, isExamForcedClosed, forceCloseExam, language]);

  // ===== الكشف عن محاولة إغلاق التبويب أو المتصفح =====
  useEffect(() => {
    if (examStatus !== 'started') return;

    const handlePageHide = (e) => {
      // ✅ إذا كان المستخدم يغلق التبويب، نعتبره مخالفة
      if (examStatus === 'started' && !isExamForcedClosed) {
        // نرسل طلب لإغلاق الامتحان عبر sendBeacon (إن أمكن)
        try {
          navigator.sendBeacon('/api/close-exam', JSON.stringify({
            attemptId,
            reason: 'page_closed',
            violations: violationsRef.current,
          }));
        } catch (err) {}

        // نمنع الإغلاق الفوري (إن أمكن) ونعرض تحذيراً
        e.preventDefault();
        e.returnValue = language === 'ar' 
          ? '⚠️ هل أنت متأكد من إغلاق الامتحان؟ سيتم احتساب مخالفة.'
          : '⚠️ Are you sure you want to close the exam? A violation will be recorded.';
      }
    };

    // pagehide أكثر موثوقية من beforeunload[reference:7]
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('beforeunload', handlePageHide);

    return () => {
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('beforeunload', handlePageHide);
    };
  }, [examStatus, isExamForcedClosed, attemptId, language]);

  // ===== دالة تفعيل قفل الأمان الشامل (موسعة وقوية) =====
  const enableSecurityLockdown = useCallback(() => {
    // --- منع أحداث الفأرة ---
    const handleContextMenu = (e) => e.preventDefault();

    // --- منع النسخ واللصق ---
    const handleCopyPasteCut = (e) => e.preventDefault();

    // --- منع جميع اختصارات لوحة المفاتيح الخطيرة (قائمة موسعة) ---
    const handleKeyDown = (e) => {
      // منع F11 و ESC بشكل قهري
      if (e.key === 'F11' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        // عند الضغط على ESC، نعيد محاولة ملء الشاشة
        if (e.key === 'Escape') {
          setTimeout(() => requestFullscreen(), 50);
        }
        return false;
      }

      // منع اختصارات أخرى خطيرة
      const forbiddenKeys = [
        'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F12',
        'PrintScreen', 'ScrollLock', 'Pause',
        'BrowserHome', 'BrowserSearch', 'BrowserFavorites', 'BrowserRefresh',
        'ContextMenu', 'Meta', 'OS'
      ];

      if (forbiddenKeys.includes(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // قائمة التركيبات المحظورة
      const forbiddenCombos = [
        e.ctrlKey && (e.key === 'F11' || e.key === 'f'),
        e.metaKey && (e.key === 'F11' || e.key === 'f'),
        e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'),
        e.ctrlKey && e.key === 'U',
        e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J'),
        e.ctrlKey && (e.key === 's' || e.key === 'p'),
        e.metaKey && (e.key === 's' || e.key === 'p'),
        e.ctrlKey && (e.key === 'f' || e.key === 'r' || e.key === 't' || e.key === 'n'),
        e.metaKey && (e.key === 'f' || e.key === 'r' || e.key === 't' || e.key === 'n'),
        e.altKey && e.key === 'Tab',
        e.metaKey && e.key === 'Tab',
        e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'),
        e.metaKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight'),
        e.altKey && e.key === 'F4',
        e.ctrlKey && e.key === 'w',
        e.metaKey && e.key === 'w',
        e.ctrlKey && e.shiftKey && e.key === 'S',
        e.metaKey && e.shiftKey && (e.key === '3' || e.key === '4' || e.key === '5'),
        e.ctrlKey && e.key === 'Escape',
        e.key === 'Meta' && e.ctrlKey,
      ];

      if (forbiddenCombos.some(combo => combo)) {
        e.preventDefault();
        e.stopPropagation();
        // ✅ تأخير toast لتجنب تحديث الحالة أثناء التصيير
        setTimeout(() => {
          toast.error(
            language === 'ar'
              ? '⚠️ هذا الإجراء غير مسموح به أثناء الامتحان'
              : '⚠️ This action is not allowed during the exam',
            { duration: 1500 }
          );
          setViolations(prev => {
            const newV = prev + 1;
            if (newV >= maxViolations) forceCloseExam();
            return Math.min(newV, maxViolations);
          });
        }, 0);
        return false;
      }
    };

    // --- منع أحداث السحب والإفلات ---
    const handleDragStart = (e) => e.preventDefault();
    const handleDrop = (e) => e.preventDefault();
    const handleDragOver = (e) => e.preventDefault();

    // --- منع الطباعة ---
    const handleBeforePrint = (e) => {
      e.preventDefault();
      setTimeout(() => {
        setViolations(prev => Math.min(prev + 1, maxViolations));
        toast.error(language === 'ar' ? '🖨️ الطباعة معطلة أثناء الامتحان' : '🖨️ Printing is disabled during the exam');
      }, 0);
      return false;
    };

    // --- مراقبة فقدان التركيز (للأجهزة الجوالة) ---
    const handleBlur = () => {
      if (examStatus === 'started') {
        // ✅ تأخير تحديث الحالة إلى ما بعد التصيير
        setTimeout(() => {
          setViolations(prev => {
            const newV = prev + 1;
            if (newV >= maxViolations) forceCloseExam();
            toast.error(language === 'ar' ? '⚠️ تم رصد فقدان تركيز التطبيق' : '⚠️ App focus lost detected', { duration: 1500 });
            return Math.min(newV, maxViolations);
          });
        }, 0);
      }
    };

    // --- منع إيماءات السحب من الحواف (للموبايل) ---
    const handleTouchMove = (e) => {
      if (e.touches && e.touches.length === 1) {
        const touch = e.touches[0];
        // منع السحب من الحواف اليمنى أو اليسرى (قد يفتح قائمة النظام)
        if (touch.clientX < 30 || touch.clientX > window.innerWidth - 30) {
          e.preventDefault();
          // محاولة العودة إلى ملء الشاشة
          setTimeout(() => requestFullscreen(), 100);
        }
      }
    };

    // --- منع زر العودة على Android ---
    const handlePopState = () => {
      // منع الرجوع للخلف في التاريخ
      history.pushState(null, '', window.location.href);
    };

    // --- مراقبة DOM بحساسية أقل ---
    const observer = new MutationObserver((mutations) => {
      // نراقب فقط التغييرات التي قد تشير إلى محاولة اختراق حقيقية
      for (const mutation of mutations) {
        // 1. إذا تم إزالة عناصر مهمة (مثل طبقات الحماية)
        if (mutation.type === 'childList' && mutation.removedNodes.length > 0) {
          const removed = Array.from(mutation.removedNodes);
          for (const node of removed) {
            if (node.id && (node.id === 'exam-container' || node.id === 'security-layer' || node.className?.includes('watermark'))) {
              console.warn('⚠️ Critical security element removed!');
              setTimeout(() => {
                setViolations(prev => Math.min(prev + 1, maxViolations));
              }, 0);
              break;
            }
          }
        }
        // 2. إذا تم تغيير style بطريقة مشبوهة
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.style && 
              (target.style.overflow === 'visible' || 
               target.style.display === 'none' ||
               target.style.position === 'static')) {
            console.warn('⚠️ Suspicious style change detected!');
            setTimeout(() => {
              setViolations(prev => Math.min(prev + 1, maxViolations));
            }, 0);
          }
        }
        // 3. إذا تم تغيير class بطريقة مشبوهة
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const target = mutation.target;
          // ✅ تحويل className إلى سلسلة نصية
          const className = String(target.className || '');
          if (className && 
              (className.includes('overflow-visible') || 
               className.includes('display-none'))) {
            console.warn('⚠️ Suspicious class change detected!');
            setTimeout(() => {
              setViolations(prev => Math.min(prev + 1, maxViolations));
            }, 0);
          }
        }
      }
    });
    // نراقب العنصر الرئيسي فقط (وليس document.documentElement بالكامل)
    const targetElement = document.getElementById('exam-container') || document.body;
    observer.observe(targetElement, { 
      attributes: true, 
      childList: true, 
      subtree: true,
      attributeFilter: ['style', 'class', 'id'] // نراقب فقط تغييرات محددة
    });

    // --- إضافة جميع المستمعين ---
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopyPasteCut);
    document.addEventListener('paste', handleCopyPasteCut);
    document.addEventListener('cut', handleCopyPasteCut);
    document.addEventListener('keydown', handleKeyDown, true); // استخدام capture phase
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('drop', handleDrop);
    document.addEventListener('dragover', handleDragOver);
    window.addEventListener('beforeprint', handleBeforePrint);
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('popstate', handlePopState);

    // --- دالة التنظيف ---
    return () => {
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopyPasteCut);
      document.removeEventListener('paste', handleCopyPasteCut);
      document.removeEventListener('cut', handleCopyPasteCut);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('drop', handleDrop);
      document.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('beforeprint', handleBeforePrint);
      document.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('popstate', handlePopState);
      observer.disconnect();
    };
  }, [maxViolations, forceCloseExam, examStatus, language, requestFullscreen]);

  // ===== فحص ملء الشاشة الدوري (كل 2 ثانية مع تحذير فقط) =====
  useEffect(() => {
    if (examStatus !== 'started') return;
    
    const fullscreenCheck = setInterval(() => {
      if (!document.fullscreenElement && !isExamForcedClosed) {
        requestFullscreen();
        
        // ✅ نعرض تحذيراً فقط وليس مخالفة فورية
        setTimeout(() => {
          toast(
            language === 'ar' 
              ? '🔄 يرجى العودة إلى وضع ملء الشاشة'
              : '🔄 Please return to fullscreen mode',
            { duration: 2000 }
          );
        }, 0);
      }
    }, 2000); // كل 2 ثانية بدلاً من 150ms

    return () => clearInterval(fullscreenCheck);
  }, [examStatus, requestFullscreen, isExamForcedClosed, language]);

  // ✅ دالة التحقق من صلاحية الوصول إلى الامتحان (الكورسات المدفوعة)
  const verifyExamAccess = useCallback(async (courseId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return false; }

      // إذا لم يتم تمرير courseId أو كان فارغاً => سماح تلقائي
      if (!courseId) return true;

      // جلب بيانات الكورس
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, is_free, price')
        .eq('id', courseId)
        .single();

      // إذا لم يكن هناك كورس أو كان مجانياً => سماح
      if (courseError || !course || course.is_free || course.price === 0) {
        return true;
      }

      // ✅ الكورس مدفوع => التحقق من الاشتراك والأجهزة باستخدام الدالة المعدة
      const accessResult = await checkCourseAccess(courseId, user.id);

      if (accessResult.allowed) {
        return true;
      }

      // ❌ رفض الوصول
      setAccessDenied(true);
      setAccessReason(accessResult.reason || 'default');
      return false;
    } catch (err) {
      console.error('Access verification error:', err);
      setAccessDenied(true);
      setAccessReason('system_error');
      return false;
    }
  }, [router]);

  // ===== جلب بيانات الامتحان =====
  const fetchExamData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      setStudent(profile);

      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
      if (examError || !examData) {
        setError(language === 'ar' ? 'الامتحان غير موجود' : 'Exam not found');
        setLoading(false);
        return;
      }

      // ===== جلب اسم المعلم والكورس =====
      let courseName = null;
      let teacherName = 'مستر محمد رضوان';
      if (examData.course_id) {
        const { data: course } = await supabase.from('courses').select('title').eq('id', examData.course_id).single();
        if (course?.title) courseName = course.title;
      }
      if (examData.teacher_id) {
        const { data: teacher } = await supabase.from('profiles').select('full_name').eq('id', examData.teacher_id).single();
        if (teacher?.full_name) teacherName = teacher.full_name;
      }

      // ✅ التحقق من صلاحية الوصول (الكورسات المدفوعة)
      // نمرر course_id من examData
      setIsCheckingAccess(true);
      const hasAccess = await verifyExamAccess(examData.course_id);
      setIsCheckingAccess(false);
      if (!hasAccess) {
        setLoading(false);
        return;
      }

      const now = new Date();
      const start = examData.start_date ? toLocalDate(examData.start_date) : null;
      const end = examData.end_date ? toLocalDate(examData.end_date) : null;

      // ===== التحقق من وجود محاولات سابقة =====
      const { data: attempts } = await supabase
        .from('exam_attempts')
        .select('id, status, score, passed')
        .eq('exam_id', examId)
        .eq('student_id', user.id);
      
      const completed = attempts?.filter(a => a.status === 'completed' || a.status === 'terminated') || [];
      const attemptsAllowed = examData.attempts_allowed || 1;
      let attemptsLeftVal = Math.max(0, attemptsAllowed - completed.length);
      const attemptsUsed = attemptsAllowed - attemptsLeftVal;

      // ===== التحقق من وجود محاولة ناجحة =====
      const hasPassed = attempts?.some(a => a.passed === true);
      if (hasPassed) {
        const { data: passedData } = await supabase
          .from('exam_attempts')
          .select('*')
          .eq('exam_id', examId)
          .eq('student_id', user.id)
          .eq('passed', true)
          .order('submitted_at', { ascending: false })
          .limit(1)
          .single();
        if (passedData) {
          setPassedAttempt(passedData);
          setShowPassedScreen(true);
        }
      }

      // تخزين المحاولات المتبقية في sessionStorage
      const storedAttempts = sessionStorage.getItem(`exam_${examId}_attempts_left`);
      if (storedAttempts !== null) {
        const savedAttempts = parseInt(storedAttempts, 10);
        if (!isNaN(savedAttempts) && savedAttempts < attemptsLeftVal) {
          attemptsLeftVal = savedAttempts;
        }
      }
      setAttemptsLeft(attemptsLeftVal);

      if (attemptsLeftVal <= 0 && !hasPassed) {
        setError(language === 'ar' ? 'لقد استنفدت الحد الأقصى من المحاولات' : 'You have exhausted all attempts');
        setLoading(false);
        return;
      }

      // ===== جلب الأسئلة =====
      const { data: questionsData, error: qError } = await supabase
        .from('exam_questions')
        .select('*')
        .eq('exam_id', examId)
        .order('order_index', { ascending: true });
      if (qError || !questionsData?.length) {
        setError(language === 'ar' ? 'لا توجد أسئلة لهذا الامتحان' : 'No questions found');
        setLoading(false);
        return;
      }

      const passagesList = questionsData.filter(q => q.type === 'passage');
      const normalQuestions = questionsData.filter(q => q.type !== 'passage');

      let ordered = [];
      const passageMap = {};
      passagesList.forEach(p => { passageMap[p.id] = { ...p, children: [] }; });
      normalQuestions.forEach(q => {
        if (q.passage_id && passageMap[q.passage_id]) {
          passageMap[q.passage_id].children.push(q);
        } else {
          ordered.push(q);
        }
      });

      const allChildren = [];
      Object.values(passageMap).forEach(p => {
        allChildren.push(...p.children);
      });
      const normalQuestionsList = ordered;

      let finalQuestions = [];
      if (examData.shuffle_questions) {
        const combined = [...allChildren, ...normalQuestionsList];
        finalQuestions = combined.sort(() => Math.random() - 0.5);
      } else {
        finalQuestions = [...allChildren, ...normalQuestionsList];
      }

      setQuestions(finalQuestions);
      setPassages(passagesList);

      const realQuestionsCount = finalQuestions.length;
      setExam({ 
        ...examData, 
        questionCount: realQuestionsCount, 
        attemptsLeft: attemptsLeftVal,
        attemptsUsed: attemptsUsed,
        teacher_name: teacherName,
        course_name: courseName || '',
        maxViolations: examData.max_violations || 5,
        maxFullscreenExits: examData.max_fullscreen_exits || 3,
        shuffle_options: examData.shuffle_options || false,
        allow_backward: examData.allow_backward !== undefined ? examData.allow_backward : true,
        start_date: examData.start_date,
        end_date: examData.end_date,
      });

      // ✅ التحقق من وقت البدء
      if (start && now < start) {
        setExamStatus('waiting');
        setLoading(false);
        return;
      }

      if (end && now > end) {
        setError(language === 'ar' ? 'انتهت صلاحية الامتحان' : 'Exam has ended');
        setLoading(false);
        return;
      }

      const duration = (examData.duration_minutes || 60) * 60;
      setTimeRemaining(duration);

      const inProgress = attempts?.find(a => a.status === 'in_progress');
      if (inProgress) {
        const { data: saved } = await supabase
          .from('exam_attempts')
          .select('answers, started_at')
          .eq('id', inProgress.id)
          .single();
        if (saved) {
          let parsedAnswers = saved.answers || {};
          if (questionsData && questionsData.length) {
            Object.keys(parsedAnswers).forEach(key => {
              const q = questionsData.find(q => q.id === key);
              if (!q) return;
              
              const type = q.type || '';
              const arrayTypes = ['fill_from_words', 'sentence_reorder', 'ordering', 'matching'];
              if (arrayTypes.includes(type) && typeof parsedAnswers[key] === 'string') {
                try {
                  const parsed = JSON.parse(parsedAnswers[key]);
                  parsedAnswers[key] = Array.isArray(parsed) ? parsed : [];
                } catch {
                  parsedAnswers[key] = [];
                }
              }
              if (type === 'multiple_choice') {
                if (typeof parsedAnswers[key] === 'string') {
                  const num = parseInt(parsedAnswers[key], 10);
                  if (!isNaN(num) && num >= 1 && num <= 26) {
                    parsedAnswers[key] = String.fromCharCode(64 + num).toLowerCase();
                  } else {
                    parsedAnswers[key] = parsedAnswers[key].toLowerCase().trim();
                  }
                }
              }
            });
          }
          setAnswers(parsedAnswers);
          setExamStartedAt(saved.started_at);
          setAttemptId(inProgress.id);
          const elapsed = (new Date() - new Date(saved.started_at)) / 1000;
          const remaining = Math.max(0, duration - elapsed);
          setTimeRemaining(remaining);
        }

        const reloadKey = `exam_${examId}_load_count`;
        const reloadCount = parseInt(sessionStorage.getItem(reloadKey) || '0', 10);
        sessionStorage.setItem(reloadKey, (reloadCount + 1).toString());

        // ✅ تحسين منطق خصم المحاولات: التحقق من النجاح قبل الخصم
        if (reloadCount > 0 && inProgress) {
          // التحقق من أن المستخدم لم ينجح بالفعل
          const hasPassed = attempts?.some(a => a.passed === true);
          if (!hasPassed) {
            // فقط إذا لم يكن ناجحاً، نخصم محاولة
            const newAttemptsLeft = Math.max(0, attemptsLeftVal - 1);
            sessionStorage.setItem(`exam_${examId}_attempts_left`, newAttemptsLeft.toString());
            setAttemptsLeft(newAttemptsLeft);
            setExam(prev => prev ? { ...prev, attemptsLeft: newAttemptsLeft } : prev);

            sessionStorage.removeItem(`exam_${examId}_answers`);
            sessionStorage.removeItem(`exam_${examId}_highlights`);
            setAnswers({});
            setCurrentIndex(0);

            await supabase
              .from('exam_attempts')
              .update({
                answers: {},
                proctoring_log: { reloaded: true, reload_count: reloadCount },
              })
              .eq('id', inProgress.id);

            toast.error(language === 'ar'
              ? `⚠️ إعادة تحميل الصفحة مخالفة! تم خصم محاولة. المتبقي: ${newAttemptsLeft}`
              : `⚠️ Page reload violation! One attempt deducted. Remaining: ${newAttemptsLeft}`
            );

            if (newAttemptsLeft <= 0) {
              setTimeout(() => submitExam(true), 0);
            }
          } else {
            // إذا كان ناجحاً، لا نخصم محاولة، فقط نعرض رسالة
            toast(language === 'ar' ? '✅ لقد نجحت بالفعل في هذا الامتحان' : '✅ You already passed this exam');
            setShowPassedScreen(true);
            // جلب تفاصيل المحاولة الناجحة
            const { data: passedData } = await supabase
              .from('exam_attempts')
              .select('*')
              .eq('exam_id', examId)
              .eq('student_id', user.id)
              .eq('passed', true)
              .order('submitted_at', { ascending: false })
              .limit(1)
              .single();
            if (passedData) {
              setPassedAttempt(passedData);
            }
          }
        }
      } else {
        sessionStorage.setItem(`exam_${examId}_load_count`, '1');
        setExamStartedAt(new Date().toISOString());
      }

      setLoading(false);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(language === 'ar' ? 'حدث خطأ أثناء تحميل الامتحان' : 'Error loading exam');
      setLoading(false);
    }
  }, [examId, router, language, verifyExamAccess]);

  useEffect(() => {
    fetchExamData();
  }, [fetchExamData]);

  // ===== بدء الامتحان مع تفعيل الأمان الشامل =====
  const startExam = useCallback(async () => {
    if (examStatus === 'started') return;

    // ✅ التحقق من صلاحية الوصول قبل بدء الامتحان (مرة أخرى للتأكيد)
    if (exam?.course_id) {
      const hasAccess = await verifyExamAccess(exam.course_id);
      if (!hasAccess) {
        toast.error(language === 'ar' ? 'لا يمكنك بدء الامتحان، يرجى التحقق من اشتراكك' : 'Cannot start exam, please check your subscription');
        return;
      }
    }

    setExamStatus('started');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data, error } = await supabase
        .from('exam_attempts')
        .insert({
          exam_id: examId,
          student_id: user.id,
          answers: {},
          status: 'in_progress',
          started_at: examStartedAt || new Date().toISOString(),
          total_marks: exam?.total_marks || 0,
        })
        .select()
        .single();
      if (error) throw error;
      setAttemptId(data.id);
    } catch (err) {
      toast.error(language === 'ar' ? 'فشل بدء الامتحان' : 'Failed to start exam');
    }

    // تفعيل ملء الشاشة الإجباري
    requestFullscreen();

    // ✅ تفعيل قفل الأمان الشامل
    enableSecurityLockdown();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          submitExam(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [examStatus, examId, exam, examStartedAt, language, requestFullscreen, enableSecurityLockdown, verifyExamAccess]);

  // ===== useEffect لتفعيل مراقبة الأمان =====
  useEffect(() => {
    if (examStatus !== 'started') return;

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // تفعيل قفل الأمان (يتم استدعاؤه مرة أخرى للتأكيد)
    const cleanupSecurity = enableSecurityLockdown();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (cleanupSecurity) cleanupSecurity();
    };
  }, [examStatus, handleFullscreenChange, handleVisibilityChange, enableSecurityLockdown]);

  // ===== تقديم الامتحان باستخدام gradeExam =====
  const submitExam = useCallback(async (isAuto = false) => {
    if (examStatus === 'submitted') return;
    setExamStatus('submitted');
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      let answersObj = answersRef.current;
      let questionsForGrading = questions;

      // تحويل الإجابات والأسئلة
      if (questionsForGrading && questionsForGrading.length) {
        questionsForGrading = questionsForGrading.map(q => {
          const qCopy = { ...q };
          const arrayTypes = ['fill_from_words', 'sentence_reorder', 'ordering', 'matching'];
          if (arrayTypes.includes(q.type)) {
            if (typeof qCopy.correct_answer === 'string') {
              try { qCopy.correct_answer = JSON.parse(qCopy.correct_answer); } catch { qCopy.correct_answer = []; }
            }
            if (!Array.isArray(qCopy.correct_answer)) qCopy.correct_answer = [];
          }
          return qCopy;
        });

        Object.keys(answersObj).forEach(key => {
          const q = questionsForGrading.find(q => q.id === key);
          if (!q) return;
          const type = q.type || '';
          const arrayTypes = ['fill_from_words', 'sentence_reorder', 'ordering', 'matching'];
          if (arrayTypes.includes(type) && typeof answersObj[key] === 'string') {
            try { answersObj[key] = JSON.parse(answersObj[key]); } catch { answersObj[key] = []; }
          }
          if (type === 'multiple_choice' && typeof answersObj[key] === 'string') {
            const num = parseInt(answersObj[key], 10);
            if (!isNaN(num) && num >= 1 && num <= 26) {
              answersObj[key] = String.fromCharCode(64 + num).toLowerCase();
            } else {
              answersObj[key] = answersObj[key].toLowerCase().trim();
            }
          }
        });
      }

      // ✅ حساب الدرجات
      const { totalScore, maxPossibleScore, questionGrades } = gradeExam(
        questionsForGrading,
        answersObj,
        { partialMarking: true, caseSensitive: false, ignoreExtraSpaces: true }
      );

      const finalTotalScore = parseFloat(totalScore.toFixed(2));
      const finalMaxScore = parseFloat(maxPossibleScore.toFixed(2));
      const passed = totalScore >= (exam?.passing_marks || 0);

      let attemptIdFinal = null;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('لم يتم تسجيل الدخول');

      // محاولة تحديث المحاولة الحالية
      if (attemptId && attemptId !== 'null' && attemptId !== 'undefined') {
        const { error: updateError } = await supabase
          .from('exam_attempts')
          .update({
            answers: answersObj,
            score: finalTotalScore,
            total_marks: finalMaxScore,
            status: isAuto ? 'terminated' : 'completed',
            passed: passed,
            proctoring_log: { violations: violationsRef.current, auto_submitted: isAuto },
            submitted_at: new Date().toISOString(),
          })
          .eq('id', attemptId)
          .eq('student_id', user.id);

        if (!updateError) {
          attemptIdFinal = attemptId;
        } else {
          console.warn('فشل تحديث المحاولة، سنقوم بإنشاء محاولة جديدة', updateError);
        }
      }

      // إنشاء محاولة جديدة إذا فشل التحديث
      if (!attemptIdFinal) {
        await supabase
          .from('exam_attempts')
          .delete()
          .eq('exam_id', examId)
          .eq('student_id', user.id)
          .eq('status', 'in_progress');

        const { data: newAttempt, error: insertError } = await supabase
          .from('exam_attempts')
          .insert({
            exam_id: examId,
            student_id: user.id,
            answers: answersObj,
            score: finalTotalScore,
            total_marks: finalMaxScore,
            status: isAuto ? 'terminated' : 'completed',
            passed: passed,
            proctoring_log: { violations: violationsRef.current, auto_submitted: isAuto },
            submitted_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error('فشل إنشاء محاولة جديدة:', insertError);
          if (insertError.code === '22P02') {
            const roundedScore = Math.round(finalTotalScore);
            const roundedMax = Math.round(finalMaxScore);
            const { data: retryAttempt, error: retryError } = await supabase
              .from('exam_attempts')
              .insert({
                exam_id: examId,
                student_id: user.id,
                answers: answersObj,
                score: roundedScore,
                total_marks: roundedMax,
                status: isAuto ? 'terminated' : 'completed',
                passed: passed,
                proctoring_log: { violations: violationsRef.current, auto_submitted: isAuto, retry: true },
                submitted_at: new Date().toISOString(),
              })
              .select()
              .single();
            if (retryError) {
              toast.error(language === 'ar' ? 'فشل حفظ الامتحان، يرجى المحاولة مرة أخرى' : 'Failed to save exam');
              setExamStatus('started');
              return;
            }
            attemptIdFinal = retryAttempt.id;
          } else {
            toast.error(language === 'ar' ? 'فشل حفظ الامتحان، يرجى المحاولة مرة أخرى' : 'Failed to save exam');
            setExamStatus('started');
            return;
          }
        } else {
          attemptIdFinal = newAttempt.id;
        }
      }

      // تحديث المحاولات المتبقية
      const newAttemptsLeft = Math.max(0, attemptsLeft - (isAuto ? 0 : 1));
      sessionStorage.setItem(`exam_${examId}_attempts_left`, newAttemptsLeft.toString());
      setAttemptsLeft(newAttemptsLeft);

      sessionStorage.removeItem(`exam_${examId}_answers`);
      sessionStorage.removeItem(`exam_${examId}_highlights`);
      sessionStorage.removeItem(`exam_${examId}_load_count`);

      setIsSubmitting(false);

      const resultUrl = `/dashboard/student/exams/${examId}/result?score=${finalTotalScore}&total=${finalMaxScore}&attemptId=${attemptIdFinal}`;
      router.push(resultUrl);
    } catch (err) {
      console.error('Submit error:', err);
      toast.error(language === 'ar' ? 'حدث خطأ أثناء التقديم' : 'Error submitting exam');
      setExamStatus('started');
      setIsSubmitting(false);
    }
  }, [examStatus, questions, attemptId, examId, router, language, attemptsLeft, exam]);

  // ===== دالة فتح نافذة تأكيد التسليم =====
  const openSubmitModal = useCallback(() => {
    const realQuestions = questions.filter(q => q.type !== 'passage');
    const answered = realQuestions.filter(q => {
      const ans = answers[q.id];
      return ans !== undefined && ans !== null && ans !== '';
    }).length;
    const review = realQuestions.filter(q => reviewMarkedQuestions.includes(q.id)).length;
    setSubmitStats({
      total: realQuestions.length,
      answered,
      review,
    });
    setShowSubmitModal(true);
  }, [questions, answers, reviewMarkedQuestions]);

  const confirmSubmit = useCallback(() => {
    setShowSubmitModal(false);
    // ✅ التقاط الإجابات فوراً
    const finalAnswers = { ...answers };
    answersRef.current = finalAnswers;
    setIsSubmitting(true);
    // ✅ استدعاء submitExam مباشرة دون تأخير
    submitExam(false);
  }, [answers, submitExam]);

  // ===== دالة toggleReviewMark =====
  const toggleReviewMark = useCallback((id) => {
    setReviewMarkedQuestions(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  // ===== دوال التنقل =====
  const goToQuestion = useCallback((index) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  }, [questions]);

  const currentQuestion = questions[currentIndex];

  const goToNextUnanswered = useCallback(() => {
    for (let i = currentIndex + 1; i < questions.length; i++) {
      const q = questions[i];
      if (answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === '') {
        goToQuestion(i);
        return;
      }
    }
    for (let i = 0; i < currentIndex; i++) {
      const q = questions[i];
      if (answers[q.id] === undefined || answers[q.id] === null || answers[q.id] === '') {
        goToQuestion(i);
        return;
      }
    }
    toast('لا توجد أسئلة غير مجابة', { icon: 'ℹ️' });
  }, [currentIndex, questions, answers, goToQuestion, language]);

  const toggleMark = useCallback((id) => {
    setMarkedQuestions(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  }, []);

  const toggleHighlight = useCallback((id) => {
    setHighlightedQuestions(prev => {
      const newSet = prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id];
      sessionStorage.setItem(`exam_${examId}_highlights`, JSON.stringify(newSet));
      return newSet;
    });
  }, [examId]);

  // ===== معالجة الإجابة =====
  const handleAnswer = useCallback((id, value) => {
    setAnswers(prev => {
      const newAnswers = { ...prev, [id]: value };
      sessionStorage.setItem(`exam_${examId}_answers`, JSON.stringify(newAnswers));
      return newAnswers;
    });
  }, [examId]);

  // ===== دالة الخروج الطارئ =====
  const emergencyExit = useCallback(() => {
    if (examStatus === 'started' && !isExamForcedClosed) {
      if (confirm(language === 'ar' ? '⚠️ سيتم خصم محاولة ومسح جميع إجاباتك. هل أنت متأكد؟' : '⚠️ One attempt will be deducted and all answers cleared. Are you sure?')) {
        forceCloseExam('user_exit');
      }
    } else {
      router.push('/dashboard/student/courses');
    }
  }, [examStatus, isExamForcedClosed, forceCloseExam, router, language]);

  const answeredCount = questions.filter(q => {
    const ans = answers[q.id];
    return ans !== undefined && ans !== null && ans !== '';
  }).length;

  // ===== عرض السؤال =====
  const renderQuestion = useCallback((q) => {
    const type = getQuestionType(q.type);
    const answer = answers[q.id];
    const setAnswer = (val) => handleAnswer(q.id, val);
    const isHighlighted = highlightedQuestions.includes(q.id);

    if (q.type === 'passage') {
      return (
        <div className={`space-y-4 ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-xl' : ''}`}>
          <PassageDisplay
            passageId={q.id}
            originalText={q.question_text}
            examId={examId}
            styles={styles}
            isDark={isDark}
            passageFontSize={passageFontSize}
            onFontSizeChange={setPassageFontSize}
          />
          <p className={`text-base ${styles.text} font-medium`}>
            {language === 'ar' ? 'هذه قطعة نصية، لا توجد أسئلة فرعية' : 'This is a passage, no sub-questions'}
          </p>
        </div>
      );
    }

    const passage = passages.find(p => p.id === q.passage_id);
    const passageText = passage?.question_text || '';

    let questionComponent = null;
    switch (type) {
      case 'mcq':
        questionComponent = <MCQQuestion question={q} selectedAnswer={answer} onSelect={setAnswer} styles={styles} language={language} isDark={isDark} />;
        break;
      case 'true_false':
        questionComponent = <TrueFalseQuestion selectedAnswer={answer} onSelect={setAnswer} styles={styles} language={language} />;
        break;
      case 'matching':
        questionComponent = <MatchingQuestion question={q} selectedAnswer={answer} onSelect={setAnswer} styles={styles} language={language} />;
        break;
      case 'ordering':
        questionComponent = <OrderingQuestion question={q} selectedAnswer={answer} onSelect={setAnswer} styles={styles} language={language} />;
        break;
      case 'fill_blank':
        questionComponent = <FillBlankQuestion question={q} selectedAnswer={answer} onSelect={setAnswer} styles={styles} language={language} isDark={isDark} />;
        break;
      case 'essay':
        questionComponent = <EssayQuestion question={q} selectedAnswer={answer} onSelect={setAnswer} styles={styles} language={language} isDark={isDark} />;
        break;
      case 'fill_from_words':
        questionComponent = <FillFromWordsQuestion question={q} selectedAnswer={answer} onSelect={setAnswer} styles={styles} language={language} isDark={isDark} />;
        break;
      case 'sentence_reorder':
        questionComponent = <SentenceReorderQuestion question={q} selectedAnswer={answer} onSelect={setAnswer} styles={styles} language={language} isDark={isDark} />;
        break;
      default:
        questionComponent = (
          <div className={`p-4 rounded-xl ${styles.card} border ${styles.border}`}>
            <p className={`text-sm ${styles.text}`}>{language === 'ar' ? 'نوع سؤال غير مدعوم' : 'Unsupported question type'}</p>
          </div>
        );
    }

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25 }}
        whileHover={{ scale: 1.01 }}
        className={`space-y-4 ${isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/20 p-4 rounded-xl' : ''}`}
      >
        {/* رأس السؤال مع زر المراجعة */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className={`text-xs font-bold text-yellow-400 bg-yellow-400/10 px-3 py-1 rounded-lg flex items-center gap-1`}>
            <Icons.HelpCircle className="h-3 w-3" />
            {language === 'ar' ? 'سؤال' : 'Q'} {questions.findIndex(qq => qq.id === q.id) + 1}/{questions.length}
          </span>
          {q.difficulty && (
            <span className={`text-[10px] px-2.5 py-1 rounded-lg capitalize font-medium ${
              q.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
              q.difficulty === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {q.difficulty === 'easy' ? '🟢 سهل' :
               q.difficulty === 'medium' ? '🟡 متوسط' : '🔴 صعب'}
            </span>
          )}
          {q.marks > 0 && (
            <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2.5 py-1 rounded-lg font-medium">
              <Icons.Star className="h-3 w-3 inline mr-1" />
              {q.marks} {language === 'ar' ? 'درجة' : 'pts'}
            </span>
          )}
          {highlightedQuestions.includes(q.id) && (
            <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Icons.Highlighter className="h-3 w-3" /> ★ مظلل
            </span>
          )}
          {answers[q.id] !== undefined && answers[q.id] !== null && answers[q.id] !== '' && (
            <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
              <Icons.CheckCircle className="h-3 w-3" /> {language === 'ar' ? 'تمت الإجابة' : 'Answered'}
            </span>
          )}
          {/* ✅ زر المراجعة – يظهر في كلا الوضعين */}
          <button
            onClick={() => toggleReviewMark(q.id)}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition ${
              reviewMarkedQuestions.includes(q.id)
                ? 'bg-yellow-400/30 text-yellow-400 border border-yellow-400/50'
                : isDark
                  ? 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
                  : 'bg-gray-100 text-gray-600 border border-gray-300 hover:bg-gray-200'
            }`}
            title={language === 'ar' ? 'وضع علامة للمراجعة' : 'Mark for review'}
          >
            {reviewMarkedQuestions.includes(q.id) ? (
              <Icons.Flag className="h-3 w-3 inline mr-1" />
            ) : (
              <Icons.Flag className="h-3 w-3 inline mr-1 opacity-50" />
            )}
            {reviewMarkedQuestions.includes(q.id)
              ? (language === 'ar' ? 'مراجعة ✓' : 'Review ✓')
              : (language === 'ar' ? 'مراجعة' : 'Review')}
          </button>
        </div>

        {passageText && (
          <PassageDisplay
            passageId={passage.id}
            originalText={passageText}
            examId={examId}
            styles={styles}
            isDark={isDark}
            passageFontSize={passageFontSize}
            onFontSizeChange={setPassageFontSize}
          />
        )}
        <p className={`${fontSize} ${isBold ? 'font-bold' : 'font-medium'} ${isItalic ? 'italic' : ''} ${styles.text} leading-relaxed`}>
          {q.question_text}
        </p>
        {questionComponent}
      </motion.div>
    );
  }, [answers, handleAnswer, styles, language, passages, isDark, fontSize, isBold, isItalic, highlightedQuestions, examId, passageFontSize, questions, toggleReviewMark, reviewMarkedQuestions]);

  const correctAnswers = useMemo(() => {
    const result = {};
    questions.forEach(q => {
      if (q.correct_answer) {
        result[q.id] = q.correct_answer;
      }
    });
    return result;
  }, [questions]);

  // ===== شاشة تحميل =====
  if (loading || isCheckingAccess) {
    return (
      <div className={`min-h-screen w-full flex items-center justify-center ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className={`text-sm ${styles.subtext}`}>
            {isCheckingAccess 
              ? (language === 'ar' ? 'جاري التحقق من الصلاحية...' : 'Verifying access...')
              : (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
            }
          </p>
        </div>
      </div>
    );
  }

  // ===== عرض الخطأ =====
  if (error) {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`max-w-md w-full p-8 rounded-3xl ${styles.card} border ${styles.border} text-center space-y-4 shadow-2xl`}>
          <div className="inline-flex p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.XCircle className="h-10 w-10 text-red-400" />
          </div>
          <h2 className={`text-xl font-bold ${styles.text}`}>
            {language === 'ar' ? 'لا يمكن دخول الامتحان' : 'Cannot Enter Exam'}
          </h2>
          <p className={`${styles.text} text-sm leading-relaxed opacity-70`}>{error}</p>
          <button onClick={() => router.push('/dashboard/student/courses')} style={{ touchAction: 'manipulation' }} className="px-6 py-2.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition shadow-lg shadow-yellow-400/20">
            {language === 'ar' ? 'العودة للكورسات' : 'Back to Courses'}
          </button>
        </div>
      </div>
    );
  }

  // ===== ✅ شاشة رفض الوصول (الكورسات المدفوعة) =====
  if (accessDenied) {
    const messages = {
      no_subscription: language === 'ar' 
        ? 'هذا الامتحان جزء من كورس مدفوع. يرجى الاشتراك أولاً.' 
        : 'This exam is part of a paid course. Please subscribe first.',
      max_devices: language === 'ar'
        ? 'لقد تجاوزت الحد الأقصى للأجهزة المسموح بها لهذا الكورس.'
        : 'You have exceeded the maximum devices allowed for this course.',
      expired: language === 'ar'
        ? 'انتهت صلاحية اشتراكك في هذا الكورس.'
        : 'Your subscription to this course has expired.',
      default: language === 'ar'
        ? 'لا يمكنك الوصول إلى هذا الامتحان. يرجى التواصل مع الدعم.'
        : 'You cannot access this exam. Please contact support.'
    };

    const message = messages[accessReason] || messages.default;

    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <div className={`max-w-md w-full p-8 rounded-3xl ${styles.card} border ${styles.border} text-center space-y-4 shadow-2xl`}>
          <div className="inline-flex p-4 rounded-full bg-red-500/20 border-2 border-red-500/30">
            <Icons.Lock className="h-12 w-12 text-red-400" />
          </div>
          <h2 className={`text-2xl font-extrabold ${styles.text}`}>
            {language === 'ar' ? '🚫 وصول ممنوع' : '🚫 Access Denied'}
          </h2>
          <p className={`${styles.text} text-base leading-relaxed opacity-80`}>{message}</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-4">
            <button
              onClick={() => router.push(`/dashboard/student/courses/${exam?.course_id}`)}
              className="px-6 py-2.5 bg-yellow-400 text-black font-bold rounded-xl hover:bg-yellow-500 transition shadow-lg shadow-yellow-400/20"
            >
              {language === 'ar' ? 'العودة للكورس' : 'Back to Course'}
            </button>
            {accessReason === 'no_subscription' && exam?.course_id && (
              <button
                onClick={() => router.push(`/dashboard/student/courses/${exam.course_id}/payment`)}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold rounded-xl hover:scale-105 transition shadow-lg shadow-blue-500/30"
              >
                {language === 'ar' ? 'الاشتراك الآن' : 'Subscribe Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ===== شاشة انتظار بدء الامتحان =====
  if (examStatus === 'waiting' && exam?.start_date) {
    return <ExamCountdownScreen exam={exam} styles={styles} language={language} isDark={isDark} />;
  }

  // ===== شاشة "تم الاجتياز" (ناجح سابقاً) =====
  if (showPassedScreen && passedAttempt) {
    const totalMarks = (passedAttempt.total_marks > 0) 
      ? passedAttempt.total_marks 
      : (exam?.total_marks > 0) 
        ? exam.total_marks 
        : (questions.length > 0 ? questions.filter(q => q.type !== 'passage').reduce((sum, q) => sum + (q.marks || 0), 0) : 0);
    const percentage = totalMarks > 0 ? Math.round((passedAttempt.score / totalMarks) * 100) : 0;
    const grade = getGrade(percentage);
    const examTitle = exam?.title || (language === 'ar' ? 'الامتحان' : 'Exam');

    return (
      <div className={`min-h-screen w-full ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, type: 'spring' }}
          className={`max-w-4xl w-full p-8 rounded-3xl ${styles.card} border ${styles.border} shadow-2xl`}
        >
          {/* أيقونة النجاح */}
          <div className="text-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="inline-flex p-4 rounded-full bg-emerald-500/20 border-4 border-emerald-400"
            >
              <Icons.Trophy className="h-20 w-20 text-emerald-400" />
            </motion.div>
            <h1 className={`text-4xl font-extrabold mt-4 ${styles.text}`}>
              🎉 {language === 'ar' ? 'لقد اجتزت هذا الاختبار!' : 'You passed this exam!'}
            </h1>
            <p className={`text-lg ${styles.subtext} mt-2`}>
              {language === 'ar' 
                ? `لقد حققت درجة ${passedAttempt.score} من ${totalMarks}`
                : `You scored ${passedAttempt.score} out of ${totalMarks}`}
            </p>
            <div className="w-24 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600 mx-auto mt-3 rounded-full" />
          </div>

          {/* شهادة تقدير فاخرة */}
          <div className={`relative p-8 rounded-3xl border-2 border-yellow-400/40 bg-gradient-to-br from-amber-50/50 via-white to-yellow-50/50 dark:from-yellow-900/10 dark:via-gray-900/10 dark:to-yellow-900/10 backdrop-blur-sm overflow-hidden shadow-inner`}>
            <div className="absolute inset-0 opacity-10 pointer-events-none">
              <div className="absolute -top-20 -right-20 w-80 h-80 bg-yellow-400 rounded-full blur-3xl animate-pulse" />
              <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-yellow-600 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>
            
            <div className="relative z-10 text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-2 border-yellow-400/40 shadow-lg">
                  <Icons.Award className="h-12 w-12 text-yellow-500" />
                </div>
              </div>
              
              <h2 className={`text-4xl font-extrabold ${styles.text} mb-2`}>
                {language === 'ar' ? 'شهادة تقدير' : 'Certificate of Achievement'}
              </h2>
              
              <div className="w-24 h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 mx-auto my-3 rounded-full" />
              
              <p className={`text-base ${styles.subtext}`}>
                {language === 'ar' ? 'تُمنح هذه الشهادة للطالب' : 'This certificate is awarded to'}
              </p>
              
              <p className={`text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-600 my-3`}>
                {student?.full_name || 'طالب'}
              </p>
              
              <p className={`text-base ${styles.subtext}`}>
                {language === 'ar' ? 'لاجتيازه امتحان' : 'for successfully passing the exam'}
              </p>
              
              <p className={`text-2xl font-bold ${styles.text} my-2 px-4 py-1 bg-yellow-400/10 rounded-xl inline-block border border-yellow-400/20`}>
                “{examTitle}”
              </p>
              
              <div className="flex justify-center items-center gap-4 mt-4 flex-wrap">
                <div className={`px-5 py-2.5 rounded-xl ${grade.bg} ${grade.color} border ${grade.border} shadow-sm`}>
                  <span className="text-lg font-bold">{grade.emoji} {grade.label}</span>
                </div>
                <div className={`px-5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm`}>
                  <span className="text-lg font-bold">{percentage}%</span>
                </div>
              </div>
              
              <div className="flex justify-center gap-8 mt-5 text-sm">
                <div>
                  <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'الدرجة' : 'Score'}</p>
                  <p className={`text-xl font-bold text-emerald-400`}>{passedAttempt.score} / {totalMarks}</p>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'التاريخ' : 'Date'}</p>
                  <p className={`text-lg font-bold ${styles.text}`}>{new Date(passedAttempt.submitted_at).toLocaleDateString('ar-EG')}</p>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t-2 border-dashed border-yellow-400/30">
                <p className={`text-sm font-bold ${styles.text}`}>
                  {language === 'ar' ? 'منصة محمد رضوان التعليمية' : 'Mohamed Radwan Learning Platform'}
                </p>
                <p className={`text-xs ${styles.subtext} mt-0.5`}>
                  {language === 'ar' ? 'شهادة معتمدة' : 'Certified'}
                </p>
              </div>
            </div>
          </div>

          {/* معلومات المحاولة */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl ${isDark ? 'bg-white/5 border border-white/10' : 'bg-gray-50 border border-gray-200'} mt-4`}>
            <div className="text-center">
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'التاريخ' : 'Date'}</p>
              <p className={`text-sm font-bold ${styles.text}`}>{new Date(passedAttempt.submitted_at).toLocaleDateString('ar-EG')}</p>
            </div>
            <div className="text-center">
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'الدرجة' : 'Score'}</p>
              <p className={`text-sm font-bold text-emerald-400`}>{passedAttempt.score}</p>
            </div>
            <div className="text-center">
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'الدرجة الكلية' : 'Total'}</p>
              <p className={`text-sm font-bold ${styles.text}`}>{totalMarks}</p>
            </div>
            <div className="text-center">
              <p className={`text-xs ${styles.subtext}`}>{language === 'ar' ? 'النسبة' : 'Percentage'}</p>
              <p className={`text-sm font-bold text-emerald-400`}>{percentage}%</p>
            </div>
          </div>

          {/* عرض الأسئلة والإجابات للمراجعة */}
          <div className="mt-6">
            <h3 className={`text-lg font-bold ${styles.text} mb-3 flex items-center gap-2`}>
              <Icons.FileText className="h-5 w-5 text-yellow-400" />
              {language === 'ar' ? 'مراجعة إجاباتك' : 'Review Your Answers'}
            </h3>
            <div className="max-h-96 overflow-y-auto space-y-3 pr-2">
              {passedAttempt.answers && Object.keys(passedAttempt.answers).slice(0, 10).map((qId, idx) => {
                const question = questions.find(q => q.id === qId);
                if (!question) return null;
                const userAns = passedAttempt.answers[qId];
                const isCorrect = Array.isArray(question.correct_answer) 
                  ? question.correct_answer.some(c => String(userAns).trim() === String(c).trim())
                  : String(userAns).trim() === String(question.correct_answer).trim();
                return (
                  <div key={qId} className={`p-3 rounded-xl border ${isCorrect ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${styles.text}`}>
                          <span className="text-yellow-400">#{idx+1}</span> {question.question_text}
                        </p>
                        <p className={`text-xs mt-1 ${styles.subtext}`}>
                          {language === 'ar' ? 'إجابتك: ' : 'Your answer: '}
                          <span className={isCorrect ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                            {typeof userAns === 'object' ? JSON.stringify(userAns) : userAns}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p className={`text-xs text-emerald-400 mt-0.5`}>
                            {language === 'ar' ? 'الإجابة الصحيحة: ' : 'Correct answer: '}
                            {Array.isArray(question.correct_answer) 
                              ? question.correct_answer.join(', ')
                              : question.correct_answer}
                          </p>
                        )}
                      </div>
                      <span className={`text-sm font-bold ${isCorrect ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {Object.keys(passedAttempt.answers || {}).length > 10 && (
                <p className={`text-xs ${styles.subtext} text-center py-2`}>
                  {language === 'ar' ? `... و ${Object.keys(passedAttempt.answers).length - 10} سؤال آخر` : `... and ${Object.keys(passedAttempt.answers).length - 10} more questions`}
                </p>
              )}
            </div>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => generateQuestionsPDF(questions, language, examId, supabase, exam?.title)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                isDark ? 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 border border-yellow-400/30' : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300'
              }`}
            >
              <Icons.FileText className="h-4 w-4" /> {language === 'ar' ? 'تصدير الأسئلة (PDF)' : 'Export Questions (PDF)'}
            </button>
            <Link
              href="/dashboard/student/courses"
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition flex items-center gap-2 ${
                isDark ? 'bg-white/10 hover:bg-white/20 text-white border border-white/20' : 'bg-gray-200 hover:bg-gray-300 text-gray-800 border border-gray-300'
              }`}
            >
              <Icons.BookOpen className="h-4 w-4" /> {language === 'ar' ? 'العودة للكورسات' : 'Back to Courses'}
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  // ===== شاشة المقدمة =====
  if (examStatus === 'intro') {
    return (
      <div className={`min-h-screen ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} flex items-center justify-center p-4`}>
        <ExamIntroScreen
          exam={exam}
          startExam={startExam}
          loading={loading}
          styles={styles}
          language={language}
          isDark={isDark}
        />
      </div>
    );
  }

  // ===== واجهة الامتحان الرئيسية =====
  return (
    <div id="exam-container" className={`h-dvh w-screen overflow-hidden ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} ${styles.text} relative flex flex-col`}>
      <SecureWatermark user={student} examTitle={exam?.title} isDark={isDark} />

      {/* زر عائم للعودة إلى ملء الشاشة */}
      {showFullscreenButton && (
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          onClick={() => {
            requestFullscreen();
            setShowFullscreenButton(false);
          }}
          style={{ touchAction: 'manipulation' }}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[9999] px-6 py-3 bg-yellow-500 text-black font-bold rounded-xl shadow-2xl flex items-center gap-2 hover:bg-yellow-400 transition-all"
        >
          <Icons.Maximize className="h-5 w-5" />
          {language === 'ar' ? '🔄 العودة إلى ملء الشاشة' : '🔄 Return to fullscreen'}
        </motion.button>
      )}

      <AnimatePresence>
        {showLockScreen && (
          <LockOverlay 
            violations={violations} 
            maxViolations={maxViolations} 
            language={language} 
            styles={styles} 
            onCancel={() => {
              setShowLockScreen(false);
              requestFullscreen();
            }}
            onCloseExam={() => {
              setShowLockScreen(false);
              forceCloseExam();
            }}
          />
        )}
      </AnimatePresence>

      {/* شاشة الانتظار بعد التسليم */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-20 h-20 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full"
            />
            <p className="text-white text-2xl font-bold mt-6">
              {language === 'ar' ? '⏳ جاري مراجعة إجاباتك...' : '⏳ Reviewing your answers...'}
            </p>
            <p className="text-white/60 text-sm mt-2">
              {language === 'ar' ? 'يرجى الانتظار لحظة' : 'Please wait a moment'}
            </p>
            <div className="mt-8 flex gap-2">
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                className="w-3 h-3 bg-yellow-400 rounded-full"
              />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                className="w-3 h-3 bg-yellow-400 rounded-full"
              />
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                className="w-3 h-3 bg-yellow-400 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-1 overflow-hidden">
        <QuestionSidebar
          questions={questions}
          answers={answers}
          markedQuestions={markedQuestions}
          reviewMarkedQuestions={reviewMarkedQuestions} // ✅ تمرير القائمة
          currentIndex={currentIndex}
          currentQuestion={currentQuestion}
          goToQuestion={goToQuestion}
          language={language}
          styles={styles}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* ===== الشريط العلوي المحسّن ===== */}
          <div className={`flex-shrink-0 px-4 py-3 border-b ${isDark ? 'border-white/10 bg-[#0b0e1a]/90' : 'border-gray-200 bg-gray-50/90'} backdrop-blur-lg`}>
            <div className="flex flex-wrap items-center justify-between gap-2 max-w-6xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-bold text-sm shadow-lg">
                  {student?.full_name?.charAt(0) || 'ط'}
                </div>
                <div className="hidden sm:block">
                  <p className={`text-sm font-bold ${styles.text} truncate max-w-[200px] opacity-90`}>
                    {exam?.title || ''}
                  </p>
                </div>
              </div>

              <ExamTimer
                remaining={timeRemaining}
                isWarning={timeRemaining <= 300 && timeRemaining > 60}
                isCritical={timeRemaining <= 60}
                styles={styles}
              />

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 bg-white/5 px-2.5 py-1 rounded-full border border-white/10">
                  <Icons.CheckCircle className={`h-3.5 w-3.5 ${answeredCount === questions.length ? 'text-emerald-400' : 'text-yellow-400'}`} />
                  <span className="text-white/80">{answeredCount}/{questions.length}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-red-500/10 px-2.5 py-1 rounded-full border border-red-500/20">
                  <Icons.AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-red-400">{violations}/{maxViolations}</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 bg-yellow-500/10 px-2.5 py-1 rounded-full border border-yellow-500/20">
                  <Icons.Maximize className="h-3.5 w-3.5 text-yellow-400" />
                  <span className="text-yellow-400">{fullscreenExitCount}/{MAX_FULLSCREEN_EXITS}</span>
                </div>
              </div>
            </div>

            {/* شريط التقدم المحسّن */}
            <div className="max-w-6xl mx-auto mt-1">
              <div className="flex items-center gap-2">
                <ProgressBar answered={answeredCount} total={questions.length} isDark={isDark} timeRemaining={timeRemaining} />
              </div>
            </div>

            {/* أزرار التحكم العلوية */}
            <div className="flex justify-between items-center mt-2 max-w-6xl mx-auto">
              <div className="flex gap-1">
                <button 
                  onClick={() => goToQuestion(currentIndex - 1)} 
                  disabled={currentIndex === 0 || !exam?.allow_backward} 
                  style={{ touchAction: 'manipulation' }} 
                  className={`p-1 rounded-lg transition disabled:opacity-30 ${
                    isDark
                      ? 'bg-white/5 hover:bg-white/10 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  <Icons.ChevronRight className="h-4 w-4" />
                </button>
                <button onClick={goToNextUnanswered} style={{ touchAction: 'manipulation' }} className="p-1 rounded-lg bg-white/5 hover:bg-white/10 transition" title={language === 'ar' ? 'الانتقال لأول سؤال غير مجاب' : 'Go to next unanswered'}><Icons.ArrowRight className="h-4 w-4" /></button>
                <button
                  onClick={() => toggleHighlight(currentQuestion?.id)}
                  style={{ touchAction: 'manipulation' }}
                  className={`p-1 rounded-lg transition ${
                    highlightedQuestions.includes(currentQuestion?.id)
                      ? 'bg-yellow-500/20 text-yellow-400'
                      : 'bg-white/5 text-white/40 hover:text-white/80'
                  }`}
                  title={language === 'ar' ? 'تظليل السؤال' : 'Highlight Question'}
                >
                  <Icons.Highlighter className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-1 items-center">
                <FontControls
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  isBold={isBold}
                  setIsBold={setIsBold}
                  isItalic={isItalic}
                  setIsItalic={setIsItalic}
                  resetFont={resetFont}
                  language={language}
                  isDark={isDark}
                />
                <ExamSettingsPanel
                  fontSize={fontSize}
                  setFontSize={setFontSize}
                  isBold={isBold}
                  setIsBold={setIsBold}
                  isItalic={isItalic}
                  setIsItalic={setIsItalic}
                  resetFont={resetFont}
                  language={language}
                  isDark={isDark}
                  styles={styles}
                />
                <button
                  onClick={emergencyExit}
                  style={{ touchAction: 'manipulation' }}
                  className={`px-3 py-1 rounded-lg transition text-xs font-bold ${
                    isDark
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      : 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-300'
                  }`}
                  title={language === 'ar' ? 'خروج (خصم محاولة)' : 'Exit (Deduct Attempt)'}
                >
                  <Icons.LogOut className="h-4 w-4 inline mr-1" /> {language === 'ar' ? 'خروج (خصم محاولة)' : 'Exit (Deduct Attempt)'}
                </button>
              </div>
            </div>

            {/* نقاط التنقل السريع للهواتف */}
            <div className="flex gap-1 mt-2 max-w-6xl mx-auto overflow-x-auto pb-1 sm:hidden">
              {questions.map((q, idx) => {
                const ans = answers[q.id];
                const isAnswered = ans !== undefined && ans !== null && ans !== '';
                const isMarked = markedQuestions.includes(q.id);
                const isCurrent = idx === currentIndex;
                const isHighlighted = highlightedQuestions.includes(q.id);
                let bg = 'bg-white/20';
                if (isAnswered) bg = 'bg-emerald-400';
                else if (isMarked) bg = 'bg-purple-400';
                if (isHighlighted) bg = 'bg-yellow-400';
                if (isCurrent) bg = 'bg-yellow-400';
                return (
                  <button key={q.id} onClick={() => goToQuestion(idx)} style={{ touchAction: 'manipulation' }} className={`flex-shrink-0 h-1.5 w-3 rounded-full transition-all ${bg} ${isCurrent ? 'w-6' : ''}`} />
                );
              })}
            </div>
          </div>

          {/* ===== منطقة عرض السؤال المحسّنة ===== */}
          <div className="flex-1 overflow-y-auto bg-gradient-to-br from-transparent via-yellow-400/5 to-blue-500/5">
            <div className="max-w-4xl mx-auto px-6 py-8">
              <AnimatePresence mode="wait">
                {currentQuestion && (
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="space-y-6"
                  >
                    {renderQuestion(currentQuestion)}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ===== الشريط السفلي المحسّن مع زر تسليم الامتحان ===== */}
          <div className={`flex-shrink-0 px-4 py-3 border-t ${isDark ? 'border-white/10 bg-[#0b0e1a]/90' : 'border-gray-200 bg-gray-50/90'} backdrop-blur-lg`}>
            <div className="flex items-center justify-between max-w-4xl mx-auto gap-4">
              <button
                onClick={() => goToQuestion(currentIndex - 1)}
                disabled={currentIndex === 0 || !exam?.allow_backward}
                style={{ touchAction: 'manipulation' }}
                className={`px-4 py-2.5 rounded-xl border font-medium text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1 ${
                  isDark 
                    ? 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10' 
                    : 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200'
                }`}
              >
                <Icons.ChevronRight className="h-4 w-4" />
                <span className="hidden sm:inline">{language === 'ar' ? 'السابق' : 'Previous'}</span>
              </button>

              <div className="flex items-center gap-3">
                {currentIndex < questions.length - 1 && (
                  <button
                    onClick={() => goToQuestion(currentIndex + 1)}
                    style={{ touchAction: 'manipulation' }}
                    className="px-6 py-2.5 rounded-xl bg-yellow-400 text-black font-bold text-sm hover:bg-yellow-500 transition flex items-center gap-1 shadow-lg shadow-yellow-400/20"
                  >
                    <span>{language === 'ar' ? 'التالي' : 'Next'}</span>
                    <Icons.ChevronLeft className="h-4 w-4" />
                  </button>
                )}
                <button
                  onClick={openSubmitModal} // ✅ استدعاء فتح النافذة
                  style={{ touchAction: 'manipulation' }}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-white font-bold text-sm hover:from-emerald-500 hover:to-emerald-700 transition flex items-center gap-1 shadow-lg shadow-emerald-400/20"
                >
                  <Icons.CheckCircle className="h-4 w-4" />
                  <span>{language === 'ar' ? 'تسليم الامتحان' : 'Submit Exam'}</span>
                </button>
              </div>

              <button
                onClick={() => goToQuestion(currentIndex + 1)}
                disabled={currentIndex === questions.length - 1}
                style={{ touchAction: 'manipulation' }}
                className="px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/80 font-medium text-sm hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1"
              >
                <span className="hidden sm:inline">{language === 'ar' ? 'التالي' : 'Next'}</span>
                <Icons.ChevronLeft className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ===== نافذة تأكيد التسليم ===== */}
      <SubmitConfirmationModal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        onConfirm={confirmSubmit}
        totalQuestions={submitStats.total}
        answeredCount={submitStats.answered}
        reviewCount={submitStats.review}
        language={language}
        isDark={isDark}
        styles={styles}
      />
    </div>
  );
}