

// ============================================================
// مستخلص الأسئلة الذكي – الإصدار الأسطوري (يدعم جميع الصيغ)
// ============================================================

import path from 'path';
import mammoth from 'mammoth';
import * as csv from 'csv-parse/sync';

/**
 * استخلاص النص من PDF باستخدام pdf-parse (تحميل ديناميكي)
 */
async function extractTextFromPDF(buffer) {
  try {
    // محاولة تحميل pdf-parse ديناميكياً (يعمل مع Turbopack و Webpack)
    const pdfParse = (await import('pdf-parse')).default;
    const data = await pdfParse(buffer);
    if (data.text && data.text.length > 0) {
      console.log(`✅ استخلاص النص باستخدام pdf-parse: ${data.text.length} حرف`);
      return data.text;
    } else {
      throw new Error('الملف لا يحتوي على نصوص قابلة للقراءة');
    }
  } catch (err) {
    console.warn('⚠️ فشل pdf-parse، المحاولة باستخدام pdf2json (إن وجد)');
    // محاولة استخدام pdf2json كبديل
    try {
      const PDFParser = (await import('pdf2json')).default;
      return new Promise((resolve, reject) => {
        const parser = new PDFParser();
        parser.on('pdfParser_dataError', (err) => {
          reject(new Error(`خطأ في تحليل PDF: ${err.message || err}`));
        });
        parser.on('pdfParser_dataReady', (pdfData) => {
          try {
            let fullText = '';
            if (pdfData.formImage?.Pages) {
              pdfData.formImage.Pages.forEach(page => {
                if (page.Texts) {
                  page.Texts.forEach(textItem => {
                    const decoded = decodeURIComponent(textItem.R[0].T);
                    fullText += decoded + ' ';
                  });
                }
              });
            }
            if (fullText.length === 0) {
              reject(new Error('الملف لا يحتوي على نصوص رقمية (قد يكون ممسوحاً ضوئياً)'));
            } else {
              console.log(`✅ استخلاص النص باستخدام pdf2json: ${fullText.length} حرف`);
              resolve(fullText);
            }
          } catch (err) {
            reject(new Error(`فشل استخراج النص: ${err.message}`));
          }
        });
        parser.parseBuffer(buffer);
      });
    } catch (err2) {
      throw new Error(
        '❌ فشل استخلاص النص من PDF.\n\n' +
        'السبب: الملف إما لا يحتوي على نصوص رقمية (ممسوح ضوئياً) أو أن المكتبات غير مثبتة.\n\n' +
        '💡 الحل المقترح:\n' +
        '1. استخدم ملفات نصية (TXT) أو مستندات Word (DOCX) بدلاً من PDF.\n' +
        '2. إذا كنت مضطراً لاستخدام PDF، قم بتحويله إلى نص عبر:\n' +
        '   - فتح الملف في Google Docs ثم تحميله كـ TXT.\n' +
        '   - استخدام Adobe Acrobat (تصدير إلى نص).\n' +
        '   - استخدام موقع Smallpdf أو ILovePDF لتحويل PDF إلى TXT.\n' +
        '3. بعد التحويل، ارفع الملف النصي الناتج.'
      );
    }
  }
}

/**
 * استخلاص الأسئلة من ملف معين
 */
export async function extractQuestionsFromFile(buffer, filename) {
  const ext = path.extname(filename).toLowerCase();
  let text = '';

  try {
    if (ext === '.txt') {
      text = buffer.toString('utf-8');
    } 
    else if (ext === '.pdf') {
      text = await extractTextFromPDF(buffer);
    }
    else if (ext === '.docx') {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    }
    else if (ext === '.csv') {
      const records = csv.parse(buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
      });
      return records.map(row => ({
        question_text: row.question || row['نص السؤال'] || '',
        type: row.type || row['النوع'] || 'mcq',
        difficulty: row.difficulty || row['الصعوبة'] || 'medium',
        options: (row.options || row['الخيارات'] || '').split(',').map(s => s.trim()).filter(Boolean),
        correct_answer: row.answer || row['الإجابة'] || '',
        explanation: row.explanation || row['الشرح'] || '',
        tags: (row.tags || row['الوسوم'] || '').split(',').map(s => s.trim()).filter(Boolean),
        marks: parseInt(row.marks || row['النقاط'] || 1) || 1,
      }));
    }
    else if (ext === '.json') {
      const json = JSON.parse(buffer.toString('utf-8'));
      if (Array.isArray(json)) return json;
      if (json.questions && Array.isArray(json.questions)) return json.questions;
      throw new Error('تنسيق JSON غير صحيح: يجب أن يكون مصفوفة أو يحتوي على حقل questions');
    }
    else {
      throw new Error(`صيغة الملف غير مدعومة: ${ext}`);
    }
  } catch (err) {
    console.error('خطأ في قراءة الملف:', err);
    throw new Error(`فشل قراءة الملف: ${err.message}`);
  }

  if (!text || text.trim().length === 0) {
    throw new Error('لم يتم استخراج أي نص من الملف. تأكد من أن الملف يحتوي على نصوص قابلة للقراءة.');
  }

  console.log(`📄 النص المستخرج (أول 200 حرف): ${text.substring(0, 200)}...`);

  const questions = extractQuestionsFromText(text);
  console.log(`📝 تم استخلاص ${questions.length} سؤال`);
  return questions;
}

/**
 * خوارزمية استخلاص الأسئلة (الأذكى والأكثر دقة)
 * تدعم:
 * - أسئلة مرقمة (1.، 2.، سؤال 1، س: 1، الخ)
 * - خيارات (أ، ب، ج، د أو a. b. c. d.)
 * - إجابات (الإجابة: ... أو Answer: ...)
 * - شرح (الشرح: ... أو Explanation: ...)
 * - وسوم (#وسم1، #وسم2)
 * - صعوبة (الصعوبة: سهل/متوسط/صعب/خبير)
 * - نقاط (النقاط: 5)
 * - نصوص طويلة (Passage) قبل الأسئلة
 */
function extractQuestionsFromText(text) {
  // تقسيم النص إلى أسطر وتنظيفها
  const lines = text.split(/\n/).map(line => line.trim()).filter(line => line.length > 0);
  
  if (lines.length === 0) return [];

  // الكشف عن وجود نص تمهيدي (Passage) قبل الأسئلة
  let passage = '';
  let questionStartIndex = 0;
  const questionPatterns = [
    /^(?:سؤال\s*)?(?:[0-9]+[\.\-\)]\s*|\([0-9]+\)\s*|\[[0-9]+\]\s*)(.*)/i,
    /^[0-9]+[\.\-\)]\s*(.*)/,
    /^\([0-9]+\)\s*(.*)/,
    /^س[0-9]+[:.]\s*(.*)/i,
  ];

  // البحث عن أول سطر يبدو كسؤال
  for (let i = 0; i < lines.length; i++) {
    let isQuestion = false;
    for (const pattern of questionPatterns) {
      if (pattern.test(lines[i])) {
        isQuestion = true;
        break;
      }
    }
    if (isQuestion) {
      questionStartIndex = i;
      break;
    }
  }

  // استخلاص النص التمهيدي (passage)
  if (questionStartIndex > 0) {
    passage = lines.slice(0, questionStartIndex).join(' ');
  }

  // معالجة الأسئلة
  const questions = [];
  let currentQuestion = null;
  let currentOptions = [];
  let currentAnswer = '';
  let currentExplanation = '';
  let currentTags = [];
  let currentDifficulty = 'medium';
  let currentMarks = 1;
  let isCollectingOptions = false;
  let isCollectingAnswer = false;
  let isCollectingExplanation = false;

  // أنماط الخيارات (تدعم العربية والإنجليزية)
  const optionPatterns = [
    /^([a-zA-Z]\)\s*|[a-zA-Z]\.\s*|[أ-ي]\)\s*|[أ-ي]\.\s*|\([a-zA-Z]\)\s*|\[[a-zA-Z]\]\s*)(.*)/,
    /^([0-9]\)\s*|[0-9]\.\s*|\([0-9]\)\s*|\[[0-9]\]\s*)(.*)/, // أرقام كخيارات (نادر)
  ];

  // أنماط الإجابة
  const answerPatterns = [
    /^(?:الإجابة|الجواب|Answer|Correct|الصحيح)\s*[:.]?\s*(.*)/i,
  ];

  // أنماط الشرح
  const explanationPatterns = [
    /^(?:الشرح|تفسير|ملاحظة|Explanation|Note)\s*[:.]?\s*(.*)/i,
  ];

  // أنماط الصعوبة
  const difficultyPatterns = [
    /^(?:الصعوبة|Difficulty|المستوى|Level)\s*[:.]?\s*(.*)/i,
  ];

  // أنماط النقاط
  const marksPatterns = [
    /^(?:النقاط|نقاط|Marks|Score)\s*[:.]?\s*(\d+)/i,
  ];

  // أنماط الوسوم (تبدأ بـ #)
  const tagPattern = /^#([^\s,]+)/;

  // بدء المعالجة
  for (let i = questionStartIndex; i < lines.length; i++) {
    const line = lines[i];
    let trimmed = line;

    // التحقق من بداية سؤال جديد
    let isNewQuestion = false;
    let questionText = '';
    for (const pattern of questionPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        isNewQuestion = true;
        questionText = match[1] ? match[1].trim() : '';
        break;
      }
    }

    if (isNewQuestion) {
      // إنهاء السؤال السابق
      if (currentQuestion) {
        questions.push({
          question_text: currentQuestion,
          type: currentOptions.length > 0 ? 'mcq' : (currentAnswer ? 'short' : 'essay'),
          difficulty: currentDifficulty,
          options: currentOptions,
          correct_answer: currentAnswer,
          explanation: currentExplanation,
          tags: currentTags,
          marks: currentMarks,
          passage: passage || '',
        });
        // إعادة تعيين المتغيرات
        currentOptions = [];
        currentAnswer = '';
        currentExplanation = '';
        currentTags = [];
        currentDifficulty = 'medium';
        currentMarks = 1;
        isCollectingOptions = false;
        isCollectingAnswer = false;
        isCollectingExplanation = false;
      }
      // بدء سؤال جديد
      currentQuestion = questionText;
      isCollectingOptions = true;
      continue;
    }

    // إذا لم يكن هناك سؤال حالي، نتخطى
    if (!currentQuestion) continue;

    // التحقق من الخيارات
    let isOption = false;
    for (const pattern of optionPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        isOption = true;
        const optText = match[2] ? match[2].trim() : '';
        if (optText) {
          currentOptions.push(optText);
        }
        // بعد العثور على خيار، نوقف جمع الخيارات (إن كنا نجمع) ونستمر
        isCollectingOptions = true;
        break;
      }
    }
    if (isOption) continue;

    // التحقق من الإجابة
    let isAnswer = false;
    for (const pattern of answerPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        isAnswer = true;
        currentAnswer = match[1] ? match[1].trim() : '';
        isCollectingAnswer = true;
        isCollectingOptions = false;
        break;
      }
    }
    if (isAnswer) continue;

    // التحقق من الشرح
    let isExplanation = false;
    for (const pattern of explanationPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        isExplanation = true;
        currentExplanation = match[1] ? match[1].trim() : '';
        isCollectingExplanation = true;
        isCollectingOptions = false;
        break;
      }
    }
    if (isExplanation) continue;

    // التحقق من الصعوبة
    let isDifficulty = false;
    for (const pattern of difficultyPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        isDifficulty = true;
        const diff = match[1] ? match[1].trim().toLowerCase() : '';
        if (['سهل', 'easy'].includes(diff)) currentDifficulty = 'easy';
        else if (['متوسط', 'medium'].includes(diff)) currentDifficulty = 'medium';
        else if (['صعب', 'hard'].includes(diff)) currentDifficulty = 'hard';
        else if (['خبير', 'expert'].includes(diff)) currentDifficulty = 'expert';
        break;
      }
    }
    if (isDifficulty) continue;

    // التحقق من النقاط
    let isMarks = false;
    for (const pattern of marksPatterns) {
      const match = trimmed.match(pattern);
      if (match) {
        isMarks = true;
        const marks = parseInt(match[1] || '1');
        currentMarks = marks > 0 ? marks : 1;
        break;
      }
    }
    if (isMarks) continue;

    // التحقق من الوسوم (تبدأ بـ #)
    const tagMatch = trimmed.match(tagPattern);
    if (tagMatch) {
      currentTags.push(tagMatch[1]);
      // قد يكون هناك أكثر من وسم في سطر واحد
      const remaining = trimmed.replace(tagPattern, '').trim();
      if (remaining) {
        // قد يكون هناك وسوم إضافية مفصولة بفواصل
        const extraTags = remaining.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean);
        currentTags.push(...extraTags);
      }
      continue;
    }

    // إذا لم ينطبق أي نمط، نعتبر السطر استمراراً للنص السابق (سؤال، خيار، إجابة، شرح)
    if (!isOption && !isAnswer && !isExplanation && !isDifficulty && !isMarks && !tagMatch) {
      if (isCollectingOptions && currentOptions.length > 0) {
        // إلحاق السطر بآخر خيار
        currentOptions[currentOptions.length - 1] += ' ' + trimmed;
      } else if (isCollectingAnswer) {
        currentAnswer += ' ' + trimmed;
      } else if (isCollectingExplanation) {
        currentExplanation += ' ' + trimmed;
      } else {
        // إلحاق السطر بنص السؤال (قد يكون استمراراً)
        currentQuestion += ' ' + trimmed;
      }
    }
  }

  // إضافة السؤال الأخير
  if (currentQuestion) {
    questions.push({
      question_text: currentQuestion,
      type: currentOptions.length > 0 ? 'mcq' : (currentAnswer ? 'short' : 'essay'),
      difficulty: currentDifficulty,
      options: currentOptions,
      correct_answer: currentAnswer,
      explanation: currentExplanation,
      tags: currentTags,
      marks: currentMarks,
      passage: passage || '',
    });
  }

  // تصفية الأسئلة الفارغة
  return questions.filter(q => q.question_text && q.question_text.trim().length > 0);
}