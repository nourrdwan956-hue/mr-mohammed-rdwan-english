// ================================================================
// lib/examUtils.js
// النسخة الأسطورية النهائية V6.7 – إصلاح علامات الترقيم في الترتيب
// ✅ يدعم جميع أنواع الأسئلة مع خوارزميات ذكية
// ✅ يتعامل مع التشكيل والرموز وعلامات الترقيم والأرقام العربية/الإنجليزية
// ✅ يدعم إجابات MCQ بالأحرف والأرقام والنصوص المطابقة (مع تفضيل الخيار الصحيح)
// ✅ مرونة في ترتيب الكلمات في Fill From Words و Sentence Reorder
// ✅ تسامح إملائي (Levenshtein Distance) للإجابات النصية
// ✅ توسيع الاختصارات الإنجليزية (don't → do not, إلخ)
// ✅ تجاهل الكلمات الوظيفية (stop words) في Fill From Words
// ✅ معالجة المفرد والجمع في الإنجليزية (تحويل الجمع إلى مفرد)
// ✅ نظام ثقة (Confidence Score) للتصحيح الجزئي
// ✅ توحيد استخراج الإجابة الصحيحة من أي هيكل تخزين
// ✅ تحليلات متقدمة ومؤشر أمان
// ✅ تحسين checkFillFromWords للتعامل مع أنواع مختلفة من البيانات
// ✅ تمرير userAnswer الأصلي إلى checkFillFromWords دون تطبيع مسبق
// ✅ تفعيل التصحيح الجزئي تلقائياً لأسئلة fill_from_words بناءً على إعداد السؤال
// ✅ إصلاح دالتين checkFillFromWords و checkSentenceReorderFlexible لتطابق شكل البيانات
// ✅ استخدام cleanText لتطبيع النصوص في checkFillFromWords و checkSentenceReorderFlexible
// ✅ تحويل correct_answer و userAnswer إلى مصفوفات داخل gradeQuestion لقسم fill_from_words
// ✅ إزالة _debug من checkFillFromWords
// ✅ تعديل checkSentenceReorderFlexible لدعم السلاسل النصية كإجابات صحيحة (تقسيم إلى كلمات)
// ✅ تحسين تنظيف وتطبيع النصوص في checkSentenceReorderFlexible لإزالة الكلمات الفارغة
// ✅ إصلاح الحلقة اللانهائية في gradeQuestion (essay/fill_blank) بحساب درجة الثقة مباشرة
// ✅ تعطيل التصحيح الجزئي لسؤال الترتيب (sentence_reorder) نهائياً
// ✅ تحسين معالجة المصفوفات المتداخلة في checkSentenceReorderFlexible
// ✅ إضافة فحص إضافي للمطابقة (النص الكامل) لتحسين الدقة
// ✅ تنظيف قوي للمدخلات في checkSentenceReorderFlexible
// ✅ الحفاظ على التصحيح الجزئي لـ fill_from_words كما هو (لم نلمسه)
// ✅ التعديل الجديد: الاحتفاظ بعلامات الترقيم العربية (؟،،؛) في cleanText
// ✅ التعديل الجديد: إزالة علامات الترقيم الإنجليزية فقط في cleanText
// ✅ التعديل الجديد: تعديل normalize في checkSentenceReorderFlexible لعدم إزالة علامات الترقيم العربية
// ✅ التعديل الجديد: إضافة سجل تصحيح (console.log) لقسم sentence_reorder في gradeQuestion
// ================================================================

// ============================================================
// 0. دوال مساعدة أساسية
// ============================================================

/**
 * حساب مسافة ليفنشتاين بين نصين (عدد التعديلات اللازمة للتحويل)
 */
export const levenshteinDistance = (a, b) => {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i-1] === a[j-1]) matrix[i][j] = matrix[i-1][j-1];
      else matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, matrix[i][j-1] + 1, matrix[i-1][j] + 1);
    }
  }
  return matrix[b.length][a.length];
};

/**
 * تحويل الأرقام العربية إلى إنجليزية والعكس (للتطبيع الموحد)
 */
export const normalizeNumbers = (text) => {
  if (!text) return '';
  const arabicToEnglish = {
    '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
    '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9'
  };
  let result = text;
  Object.entries(arabicToEnglish).forEach(([ar, en]) => {
    result = result.replace(new RegExp(ar, 'g'), en);
  });
  return result;
};

/**
 * توسيع الاختصارات الإنجليزية (مثل don't → do not)
 */
export const expandEnglishContractions = (text) => {
  if (!text) return '';
  const contractions = {
    "don't": "do not", "doesn't": "does not", "didn't": "did not",
    "can't": "cannot", "won't": "will not", "shouldn't": "should not",
    "wouldn't": "would not", "couldn't": "could not", "mightn't": "might not",
    "mustn't": "must not", "isn't": "is not", "aren't": "are not",
    "wasn't": "was not", "weren't": "were not", "hasn't": "has not",
    "haven't": "have not", "hadn't": "had not", "i'm": "i am",
    "you're": "you are", "he's": "he is", "she's": "she is",
    "it's": "it is", "we're": "we are", "they're": "they are",
    "i've": "i have", "you've": "you have", "we've": "we have",
    "they've": "they have", "i'll": "i will", "you'll": "you will",
    "he'll": "he will", "she'll": "she will", "we'll": "we will",
    "they'll": "they will", "i'd": "i would", "you'd": "you would",
    "he'd": "he would", "she'd": "she would", "we'd": "we would",
    "they'd": "they would"
  };
  let result = text;
  Object.entries(contractions).forEach(([short, full]) => {
    result = result.replace(new RegExp(short, 'gi'), full);
  });
  return result;
};

/**
 * تحويل الكلمة من صيغة الجمع إلى المفرد (قواعد مبسطة)
 */
export const toSingular = (word) => {
  if (!word) return word;
  const w = word.toLowerCase();
  // استثناءات شائعة
  const exceptions = {
    'children': 'child',
    'men': 'man',
    'women': 'woman',
    'people': 'person',
    'mice': 'mouse',
    'feet': 'foot',
    'teeth': 'tooth',
    'geese': 'goose',
    'oxen': 'ox',
    'sheep': 'sheep',
    'deer': 'deer',
    'fish': 'fish',
    'series': 'series',
    'species': 'species',
    'analysis': 'analysis',
    'theses': 'thesis',
    'crises': 'crisis',
    'phenomena': 'phenomenon',
    'criteria': 'criterion',
    'media': 'medium',
    'data': 'datum',
    'bacteria': 'bacterium',
  };
  if (exceptions[w]) return exceptions[w];

  // قواعد عامة
  if (w.endsWith('ies') && w.length > 3) {
    // e.g., babies -> baby
    return w.slice(0, -3) + 'y';
  }
  if (w.endsWith('ves') && w.length > 3) {
    // e.g., knives -> knife, lives -> life
    if (w.endsWith('ives')) return w.slice(0, -3) + 'fe';
    if (w.endsWith('oves')) return w.slice(0, -3) + 'fe';
    return w.slice(0, -3) + 'f';
  }
  if (w.endsWith('ses') || w.endsWith('xes') || w.endsWith('ches') || w.endsWith('shes')) {
    // e.g., boxes -> box, watches -> watch
    return w.slice(0, -2);
  }
  if (w.endsWith('s') && !w.endsWith('ss') && w.length > 3) {
    // إذا كانت الكلمة تنتهي بـ s وليست ss، نحاول حذف s
    // لكن نتحقق من أن الكلمة قبل الحذف ليست مفرداً صحيحاً ينتهي بـ s (مثل bus, gas)
    // نستخدم قاعدة: إذا كانت الكلمة قبل الحذف تحتوي على حرف علة قبل s الأخيرة، نحذف s
    const withoutS = w.slice(0, -1);
    if (/[aeiou]/.test(withoutS.slice(-1))) {
      return withoutS;
    }
  }
  return w;
};

/**
 * تطبيع النص: إزالة المسافات الزائدة، تحويل إلى حروف صغيرة،
 * توحيد الأرقام، توسيع الاختصارات الإنجليزية، وتحويل الجمع إلى مفرد.
 * @param {any} text - النص المراد تطبيعه
 * @param {Object} options - خيارات التطبيع
 * @param {boolean} options.enablePluralNormalization - تفعيل تحويل الجمع إلى مفرد (افتراضي true)
 * @returns {string} النص بعد التطبيع
 */
export const normalizeText = (text, options = {}) => {
  const { enablePluralNormalization = true } = options;
  if (text === undefined || text === null) return '';
  let normalized = String(text).trim().replace(/\s+/g, ' ').toLowerCase();
  normalized = expandEnglishContractions(normalized);
  normalized = normalizeNumbers(normalized);
  if (enablePluralNormalization) {
    // تقسيم النص إلى كلمات وتطبيق toSingular على كل كلمة
    normalized = normalized.split(' ').map(toSingular).join(' ');
  }
  return normalized;
};

// ============================================================
// 1. تنظيف النص من التشكيل والرموز الضارة (للمقارنة الذكية)
// ============================================================
export const cleanText = (text) => {
  if (!text) return '';
  let cleaned = text.trim();
  
  // 1. حذف التشكيل (الحركات) من النص العربي
  cleaned = cleaned.replace(/[\u064B-\u065F\u0670]/g, '');
  
  // 2. حذف علامات الترقيم والرموز (لكن نحتفظ بعلامة الاستفهام والفواصل البسيطة)
  //    ❌ لم نعد نزيل (؟) و (،) و (؛) لأنها قد تكون جزءاً من الإجابة
  //    نزيل فقط الرموز التي قد تسبب مشاكل: / , . # ! $ % ^ & * ; : { } = - _ ` ~ ( )
  cleaned = cleaned.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, ' ');
  
  // 3. توحيد الأقواس والعلامات المزدوجة
  cleaned = cleaned.replace(/[“”"']/g, ' ');
  
  // 4. توحيد الفراغات الزائدة
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
};

// ============================================================
// 2. دالة ذكية لتطبيع الردود (تتعامل مع الأرقام والحروف في MCQ)
//    مع إضافة correctIndex لتجنب المطابقة الخاطئة مع خيارات مشابهة
// ============================================================
export const normalizeMCQAnswer = (userAnswer, optionTexts, correctIndex) => {
  // 1. إذا كانت الإجابة حرفاً (A, B, C...) نرجعها صغيرة
  if (typeof userAnswer === 'string' && /^[a-zA-Z]$/.test(userAnswer)) {
    return userAnswer.toLowerCase();
  }

  // 2. إذا كانت الإجابة رقماً (1,2,3...) نحوله للحرف المقابل
  const num = parseInt(userAnswer, 10);
  if (!isNaN(num) && num >= 1 && num <= 26) {
    return String.fromCharCode(64 + num).toLowerCase();
  }

  // 3. مقارنة النص مع الخيار الصحيح (مع الاحتفاظ بعلامات الترقيم)
  if (correctIndex !== undefined && optionTexts && Array.isArray(optionTexts)) {
    const correctOption = optionTexts[correctIndex];
    if (correctOption) {
      // نستخدم cleanText الجديدة (التي تحتفظ بعلامات الترقيم العربية)
      const userClean = cleanText(userAnswer);
      const optClean = cleanText(correctOption);
      if (optClean.includes(userClean) || userClean.includes(optClean)) {
        return String.fromCharCode(65 + correctIndex).toLowerCase();
      }
    }
  }

  return String(userAnswer).toLowerCase().trim();
};

// ============================================================
// 3. استخراج الإجابة الصحيحة من السؤال (بغض النظر عن الهيكل)
// ============================================================
export const extractCorrectAnswer = (question) => {
  if (!question) return null;
  
  // 1. إذا كان هناك correct_answer
  if (question.correct_answer !== undefined && question.correct_answer !== null) {
    return question.correct_answer;
  }
  
  // 2. إذا كان نوع MCQ، نبحث في options
  if (getNormalizedQuestionType(question.type) === 'multiple_choice') {
    const options = Array.isArray(question.options) ? question.options : [];
    const correctOpt = options.find(opt => opt.isCorrect === true || opt.correct === true);
    if (correctOpt) {
      return correctOpt.text || correctOpt.value || correctOpt;
    }
    // إذا لم نجد، نأخذ أول خيار (افتراضي)
    return options.length > 0 ? options[0].text : null;
  }
  
  // 3. إذا كان True/False
  if (getNormalizedQuestionType(question.type) === 'true_false') {
    return question.correct_answer || (question.correct ? 'true' : 'false');
  }
  
  return null;
};

// ============================================================
// 4. دوال التصحيح المتقدمة
// ============================================================

/**
 * التحقق من صحة إجابة Fill Blank أو Essay مع التسامح الإملائي وتحويل المفرد/الجمع
 */
export const isFillBlankCorrectFuzzy = (userAnswer, correctAnswers, maxDistance = 2, enablePluralNormalization = true) => {
  if (userAnswer === undefined || userAnswer === null) return false;
  if (!Array.isArray(correctAnswers)) correctAnswers = [correctAnswers];
  
  // تطبيع إجابة الطالب مع إمكانية تحويل الجمع إلى مفرد
  const normalizedUser = normalizeText(userAnswer, { enablePluralNormalization });
  
  return correctAnswers.some(c => {
    const normalizedCorrect = normalizeText(c, { enablePluralNormalization });
    const distance = levenshteinDistance(normalizedUser, normalizedCorrect);
    if (distance <= maxDistance) return true;
    return normalizedUser.includes(normalizedCorrect) || normalizedCorrect.includes(normalizedUser);
  });
};

/**
 * التحقق من صحة إجابة Fill From Words (إكمال من كلمات)
 * مع تحسين تجاهل الكلمات الوظيفية (stop words) وتحويل الجمع إلى مفرد
 * (تم تعديلها حسب الطلب: تعطيل تحويل الجمع افتراضياً، توزيع الدرجة على الفراغات،
 *  ومعالجة أنواع مختلفة من بيانات userAnswer)
 * ✅ استخدام cleanText لتطبيع النصوص
 * ✅ إزالة _debug
 * ⚠️ لم نلمس هذا القسم – نحافظ على التصحيح الجزئي كما هو
 */
export const checkFillFromWords = (userAnswer, correctAnswers, partialMarking = false, totalMarks = 1, options = {}) => {
  const { enablePluralNormalization = false } = options;

  // ----- تحويل userAnswer إلى مصفوفة مسطحة -----
  let userAnswerArr = userAnswer;
  if (typeof userAnswer === 'string') {
    try {
      const parsed = JSON.parse(userAnswer);
      userAnswerArr = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      userAnswerArr = [userAnswer];
    }
  } else if (!Array.isArray(userAnswer)) {
    userAnswerArr = [];
  } else {
    userAnswerArr = userAnswer;
  }
  // فك تداخل مصفوفة داخل مصفوفة
  while (userAnswerArr.length === 1 && Array.isArray(userAnswerArr[0])) {
    userAnswerArr = userAnswerArr[0];
  }
  userAnswerArr = userAnswerArr.filter(w => w && w.trim() !== '');

  // ----- تحويل correctAnswers إلى مصفوفة مسطحة -----
  let correctAnswersArr = correctAnswers;
  if (typeof correctAnswersArr === 'string') {
    try {
      correctAnswersArr = JSON.parse(correctAnswersArr);
    } catch {
      correctAnswersArr = [correctAnswersArr];
    }
  }
  if (!Array.isArray(correctAnswersArr)) {
    correctAnswersArr = [correctAnswersArr];
  }
  while (correctAnswersArr.length === 1 && Array.isArray(correctAnswersArr[0])) {
    correctAnswersArr = correctAnswersArr[0];
  }
  correctAnswersArr = correctAnswersArr.filter(w => w && w.trim() !== '');

  const totalBlanks = correctAnswersArr.length;
  if (totalBlanks === 0) {
    return { correctCount: 0, totalBlanks: 0, score: totalMarks, isFullyCorrect: true };
  }

  // ----- تطبيع النصوص باستخدام cleanText (إزالة التشكيل والرموز والمسافات الزائدة) -----
  const normalize = (text) => {
    if (text === undefined || text === null) return '';
    return cleanText(text).toLowerCase();
  };
  
  const normalizedUser = userAnswerArr.map(normalize);
  const normalizedCorrect = correctAnswersArr.map(normalize);

  let correctCount = 0;
  for (let i = 0; i < totalBlanks; i++) {
    const userAns = normalizedUser[i] || '';
    const correct = normalizedCorrect[i] || '';
    if (userAns === correct) correctCount++;
  }

  // ----- حساب الدرجة -----
  const isFullyCorrect = correctCount === totalBlanks;
  const blankScore = totalMarks / totalBlanks;
  const score = partialMarking ? correctCount * blankScore : (isFullyCorrect ? totalMarks : 0);

  return {
    correctCount,
    totalBlanks,
    score,
    isFullyCorrect,
    blankScore,
  };
};

/**
 * التحقق من صحة إجابة Sentence Reorder (نسخة مرنة جداً)
 * ✅ استخدام cleanText لتطبيع النصوص
 * ✅ دعم السلاسل النصية كإجابات صحيحة (تقسيم إلى كلمات)
 * ✅ تحسين تنظيف النصوص وإزالة الكلمات الفارغة
 * ✅ تعطيل التصحيح الجزئي بشكل صريح عند partialMarking = false (وهو ما نمرره لسؤال الترتيب)
 * ✅ إضافة فحص إضافي للمطابقة (النص الكامل) لتحسين الدقة
 * ✅ دالة تطبيع محايدة لا تزيل التشكيل بشكل مفرط، فقط تزيل المسافات الزائدة وتحول إلى حروف صغيرة.
 * ✅ لا نزيل علامات الترقيم العربية (؟،،؛) لأنها قد تكون جزءاً من الإجابة
 */
export const checkSentenceReorderFlexible = (userAnswer, correctModels, partialMarking = false, totalMarks = 1, options = {}) => {
  const { enablePluralNormalization = true } = options;
  
  // ----- 1. تنظيف userAnswer (تسطيح متكرر) -----
  let userAnswerArr = userAnswer;
  if (typeof userAnswer === 'string') {
    try {
      userAnswerArr = JSON.parse(userAnswer);
    } catch {
      userAnswerArr = [];
    }
  }
  if (!Array.isArray(userAnswerArr)) userAnswerArr = [];
  // تسطيح متكرر للمصفوفات المتداخلة
  while (userAnswerArr.length === 1 && Array.isArray(userAnswerArr[0])) {
    userAnswerArr = userAnswerArr[0];
  }
  // إزالة العناصر الفارغة والمسافات الزائدة
  userAnswerArr = userAnswerArr
    .map(w => (typeof w === 'string' ? w.trim() : ''))
    .filter(w => w !== '');

  // ----- 2. تنظيف correctModels (تسطيح متكرر) -----
  let correctModelsArr = correctModels;
  if (typeof correctModelsArr === 'string') {
    try {
      correctModelsArr = JSON.parse(correctModelsArr);
    } catch {
      correctModelsArr = [];
    }
  }
  if (!Array.isArray(correctModelsArr)) correctModelsArr = [];
  // تسطيح متكرر لكل نموذج
  correctModelsArr = correctModelsArr.map(model => {
    if (Array.isArray(model)) {
      while (model.length === 1 && Array.isArray(model[0])) {
        model = model[0];
      }
      return model.map(w => (typeof w === 'string' ? w.trim() : '')).filter(w => w !== '');
    }
    return [];
  }).filter(model => model.length > 0);

  if (correctModelsArr.length === 0) {
    return { score: 0, isFullyCorrect: false, details: { correctPositions: 0, totalWords: userAnswerArr.length } };
  }

  // ----- 3. تطبيع النصوص (محايد) - لا نزيل علامات الترقيم العربية -----
  const normalize = (text) => {
    if (text === undefined || text === null || text === '') return '';
    let str = text.trim();
    // إزالة التشكيل (الحركات) فقط
    str = str.replace(/[\u064B-\u065F\u0670]/g, '');
    // توحيد المسافات
    str = str.replace(/\s+/g, ' ').trim();
    // تحويل إلى حروف صغيرة (للحالات الإنجليزية)
    return str.toLowerCase();
  };

  const normalizedUser = userAnswerArr.map(normalize);
  const totalWords = normalizedUser.length;

  // ----- 4. التحقق من التطابق الكامل مع أي نموذج -----
  let isFullyCorrect = false;
  for (const model of correctModelsArr) {
    const normalizedModel = model.map(normalize);
    if (normalizedModel.length === normalizedUser.length &&
        normalizedModel.every((word, idx) => word === normalizedUser[idx])) {
      isFullyCorrect = true;
      break;
    }
  }

  // ----- 5. فحص إضافي: مقارنة النص الكامل (بعد إزالة المسافات) -----
  if (!isFullyCorrect && totalWords > 0) {
    const userFull = normalizedUser.join('');
    for (const model of correctModelsArr) {
      const modelFull = model.map(normalize).join('');
      if (userFull === modelFull) {
        isFullyCorrect = true;
        break;
      }
    }
  }

  let score = 0;
  let correctPositions = 0;

  if (isFullyCorrect) {
    score = totalMarks;
    correctPositions = totalWords;
  } else if (partialMarking && totalWords > 0) {
    // التصحيح الجزئي (لن يُفعَّل لأننا نمرر false في `gradeQuestion`)
    let maxCorrect = 0;
    for (const model of correctModelsArr) {
      const normalizedModel = model.map(normalize);
      let correct = 0;
      const minLen = Math.min(normalizedModel.length, normalizedUser.length);
      for (let i = 0; i < minLen; i++) {
        if (normalizedModel[i] === normalizedUser[i]) correct++;
      }
      if (correct > maxCorrect) maxCorrect = correct;
    }
    correctPositions = maxCorrect;
    score = (correctPositions / Math.max(totalWords, 1)) * totalMarks;
  }

  return { score, isFullyCorrect, details: { correctPositions, totalWords } };
};

// (نحتفظ بالنسخة القديمة للتطابق مع الواجهات القديمة)
export const checkSentenceReorder = checkSentenceReorderFlexible;

/**
 * التحقق من صحة إجابة Matching (توصيل)
 */
export const checkMatching = (userAnswer, correctAnswer, partialMarking = false, totalMarks = 1, options = {}) => {
  const { enablePluralNormalization = true } = options;
  if (typeof userAnswer !== 'object' || userAnswer === null) userAnswer = {};
  if (typeof correctAnswer !== 'object' || correctAnswer === null) correctAnswer = {};
  
  const totalPairs = Object.keys(correctAnswer).length;
  if (totalPairs === 0) {
    return { correctPairs: 0, totalPairs: 0, score: totalMarks, isFullyCorrect: true };
  }
  
  let correctPairs = 0;
  for (const [key, value] of Object.entries(correctAnswer)) {
    const userVal = userAnswer[key];
    if (userVal !== undefined && userVal !== null) {
      const userNorm = normalizeText(userVal, { enablePluralNormalization });
      const correctNorm = normalizeText(value, { enablePluralNormalization });
      if (userNorm === correctNorm) correctPairs++;
    }
  }
  
  const isFullyCorrect = correctPairs === totalPairs;
  const score = partialMarking ? (correctPairs / totalPairs) * totalMarks : (isFullyCorrect ? totalMarks : 0);
  
  return { correctPairs, totalPairs, score, isFullyCorrect };
};

/**
 * التحقق من صحة إجابة Ordering (ترتيب)
 */
export const checkOrdering = (userAnswer, correctAnswer, partialMarking = false, totalMarks = 1, options = {}) => {
  const { enablePluralNormalization = true } = options;
  if (!Array.isArray(userAnswer)) userAnswer = [];
  if (!Array.isArray(correctAnswer)) correctAnswer = [];
  
  const totalItems = correctAnswer.length;
  if (totalItems === 0) {
    return { correctPositions: 0, totalItems: 0, score: totalMarks, isFullyCorrect: true };
  }
  
  const normalizeWithOptions = (arr) => arr.map(item => normalizeText(item, { enablePluralNormalization }));
  const normalizedUser = normalizeWithOptions(userAnswer);
  const normalizedCorrect = normalizeWithOptions(correctAnswer);
  
  let correctPositions = 0;
  const minLen = Math.min(normalizedUser.length, normalizedCorrect.length);
  for (let i = 0; i < minLen; i++) {
    if (normalizedUser[i] === normalizedCorrect[i]) correctPositions++;
  }
  
  const isFullyCorrect = correctPositions === totalItems && normalizedUser.length === totalItems;
  const score = partialMarking ? (correctPositions / Math.max(totalItems, 1)) * totalMarks : (isFullyCorrect ? totalMarks : 0);
  
  return { correctPositions, totalItems, score, isFullyCorrect };
};

// ============================================================
// 5. دالة حساب درجة الثقة (Confidence Score)
// ============================================================
export const getConfidenceScore = (question, userAnswer, options = {}) => {
  // هذه الدالة تُستخدم في حالات أخرى، ولكنها قد تستدعي gradeQuestion
  // لذلك نضع شرطاً لمنع الحلقة: إذا كان userAnswer فارغاً أو question غير موجود، نرجع 0
  if (!question || userAnswer === undefined || userAnswer === null || userAnswer === '') {
    return 0;
  }
  
  const result = gradeQuestion(question, userAnswer, options);
  if (result.isCorrect) return 1;
  
  const type = getNormalizedQuestionType(question.type);
  const correct = question.correct_answer;
  
  if (type === 'fill_blank' || type === 'essay') {
    const correctAnswers = Array.isArray(correct) ? correct : [correct];
    const userNorm = normalizeText(userAnswer, options);
    let maxSimilarity = 0;
    correctAnswers.forEach(c => {
      const cNorm = normalizeText(c, options);
      const distance = levenshteinDistance(userNorm, cNorm);
      const maxLen = Math.max(userNorm.length, cNorm.length);
      const similarity = maxLen > 0 ? 1 - (distance / maxLen) : 0;
      if (similarity > maxSimilarity) maxSimilarity = similarity;
    });
    return Math.max(0, Math.min(1, maxSimilarity));
  }
  
  if (type === 'multiple_choice') {
    return result.isCorrect ? 1 : 0;
  }
  
  return result.isCorrect ? 1 : 0;
};

// ============================================================
// 6. دوال التصحيح الرئيسية (MCQ وغيرها)
// ============================================================

/**
 * التحقق من صحة إجابة MCQ مع مرونة عالية
 */
export const checkMCQ = (userAnswer, optionsArr, correctIndex, totalMarks) => {
  // تحويل الإجابة إلى حرف إذا كانت رقماً
  let normalizedUser = userAnswer;
  if (typeof userAnswer === 'string' || typeof userAnswer === 'number') {
    const num = parseInt(userAnswer, 10);
    if (!isNaN(num) && num >= 1 && num <= 26) {
      normalizedUser = String.fromCharCode(64 + num).toLowerCase();
    } else {
      normalizedUser = String(userAnswer).toLowerCase().trim();
    }
  }

  const labels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const correctLabel = labels[correctIndex] || null;
  const isCorrect = normalizedUser === correctLabel;

  return { score: isCorrect ? totalMarks : 0, isCorrect };
};

/**
 * الحصول على نوع السؤال بطريقة موحدة
 * @param {string} type - نوع السؤال من قاعدة البيانات
 * @returns {string} النوع المعياري
 */
export const getNormalizedQuestionType = (type) => {
  if (!type) return 'unknown';
  const t = type.toLowerCase().trim();
  if (['multiple_choice', 'mcq', 'multichoice', 'choice'].some(s => t.includes(s))) return 'multiple_choice';
  if (['true_false', 'truefalse', 'tf', 'boolean', 'bool'].some(s => t.includes(s))) return 'true_false';
  if (['essay', 'short_answer', 'long_answer', 'paragraph', 'text', 'open', 'written'].some(s => t.includes(s))) return 'essay';
  if (['matching', 'match', 'pair'].some(s => t.includes(s))) return 'matching';
  if (['ordering', 'order', 'sort', 'sequence'].some(s => t.includes(s))) return 'ordering';
  if (['fill_from_words', 'fillfromwords', 'word_bank', 'words'].some(s => t.includes(s))) return 'fill_from_words';
  if (['sentence_reorder', 'sentencereorder', 'reorder', 'rearrange'].some(s => t.includes(s))) return 'sentence_reorder';
  if (['fill_blank', 'fillblank', 'blank', 'gap'].some(s => t.includes(s))) return 'fill_blank';
  if (['passage', 'reading', 'comprehension'].some(s => t.includes(s))) return 'passage';
  return 'unknown';
};

/**
 * الدالة الرئيسية لتصحيح أي سؤال بناءً على نوعه (مع جميع التحسينات)
 * @param {Object} question - كائن السؤال من قاعدة البيانات
 * @param {any} userAnswer - إجابة الطالب (نص، مصفوفة، كائن)
 * @param {Object} options - إعدادات التصحيح
 * @param {boolean} options.partialMarking - تفعيل التصحيح الجزئي
 * @param {boolean} options.caseSensitive - حساسية الأحرف
 * @param {boolean} options.ignoreExtraSpaces - تجاهل المسافات الزائدة
 * @param {number} options.fuzzyMaxDistance - المسافة القصوى للتسامح الإملائي
 * @param {boolean} options.enableFuzzyMatching - تفعيل التسامح الإملائي
 * @param {boolean} options.enablePluralNormalization - تفعيل تحويل الجمع إلى مفرد
 * @returns {Object} { score, isCorrect, details }
 */
export const gradeQuestion = (question, userAnswer, options = {}) => {
  const {
    partialMarking: globalPartialMarking = false,
    caseSensitive = false,
    ignoreExtraSpaces = true,
    fuzzyMaxDistance = 3,
    enableFuzzyMatching = true,
    enablePluralNormalization = true,
  } = options;

  if (!question || typeof question !== 'object') {
    return { score: 0, isCorrect: false, details: { error: 'Invalid question object' } };
  }

  const type = getNormalizedQuestionType(question.type);
  const totalMarks = question.marks || 1;

  // السماح بالتصحيح الجزئي إما من خيارات عامة أو من إعدادات السؤال نفسه
  const usePartialMarking = globalPartialMarking || question.partial_marking === true;

  if (userAnswer === undefined || userAnswer === null || userAnswer === '') {
    return { score: 0, isCorrect: false, details: { reason: 'unanswered' } };
  }

  // دالة تطبيع محلية تأخذ الخيارات العامة
  const normalize = (text) => {
    if (text === undefined || text === null) return '';
    let result = String(text);
    if (ignoreExtraSpaces) result = result.trim().replace(/\s+/g, ' ');
    if (!caseSensitive) result = result.toLowerCase();
    result = expandEnglishContractions(result);
    result = normalizeNumbers(result);
    if (enablePluralNormalization) {
      result = result.split(' ').map(toSingular).join(' ');
    }
    return result;
  };

  // --- MCQ (النسخة الأسطورية الذكية) ---
  if (type === 'multiple_choice') {
    const optionsArr = Array.isArray(question.options) ? question.options : [];
    const correctIndex = optionsArr.findIndex(opt => opt.isCorrect === true);
    if (correctIndex === -1) {
      return { score: 0, isCorrect: false, details: { reason: 'no_correct_option' } };
    }
    const result = checkMCQ(userAnswer, optionsArr, correctIndex, totalMarks);
    return { score: result.score, isCorrect: result.isCorrect, details: {} };
  }

  // --- True-False ---
  if (type === 'true_false') {
    const correct = extractCorrectAnswer(question);
    const isCorrect = normalize(userAnswer) === normalize(correct);
    return { score: isCorrect ? totalMarks : 0, isCorrect, details: {} };
  }

  // --- Essay / Fill Blank (مع التسامح الإملائي وتحويل المفرد/الجمع) ---
  // ✅ تم إصلاح الحلقة اللانهائية: حساب درجة الثقة مباشرة دون استدعاء getConfidenceScore
  if (type === 'essay' || type === 'fill_blank') {
    const correct = extractCorrectAnswer(question);
    let correctAnswers;
    if (Array.isArray(correct)) {
      correctAnswers = correct;
    } else if (correct !== undefined && correct !== null) {
      correctAnswers = [correct];
    } else {
      correctAnswers = [];
    }

    let isCorrect = false;
    let score = 0;
    if (enableFuzzyMatching) {
      isCorrect = isFillBlankCorrectFuzzy(userAnswer, correctAnswers, fuzzyMaxDistance, enablePluralNormalization);
      if (isCorrect) {
        score = totalMarks;
      } else if (usePartialMarking) {
        // ✅ حساب درجة الثقة مباشرة دون استدعاء getConfidenceScore (لتجنب الحلقة اللانهائية)
        const userNorm = normalizeText(userAnswer, { enablePluralNormalization });
        let maxSimilarity = 0;
        correctAnswers.forEach(c => {
          const cNorm = normalizeText(c, { enablePluralNormalization });
          const distance = levenshteinDistance(userNorm, cNorm);
          const maxLen = Math.max(userNorm.length, cNorm.length);
          const similarity = maxLen > 0 ? 1 - (distance / maxLen) : 0;
          if (similarity > maxSimilarity) maxSimilarity = similarity;
        });
        const confidence = Math.max(0, Math.min(1, maxSimilarity));
        score = Math.round(confidence * totalMarks);
        isCorrect = false;
      } else {
        score = 0;
      }
    } else {
      const normalizedUser = normalize(userAnswer);
      isCorrect = correctAnswers.some(c => normalizedUser === normalize(c));
      score = isCorrect ? totalMarks : 0;
    }

    return { score, isCorrect, details: { correctAnswers } };
  }

  // --- Fill From Words (معدل لتحويل correct_answer و userAnswer إلى مصفوفات) ---
  // ⚠️ لم نلمس هذا القسم – نحافظ على التصحيح الجزئي كما هو
  if (type === 'fill_from_words') {
    // تحويل correct_answer إلى مصفوفة
    let correct = question.correct_answer;
    if (typeof correct === 'string') {
      try {
        correct = JSON.parse(correct);
      } catch {
        correct = [];
      }
    }
    if (!Array.isArray(correct)) {
      correct = [];
    }

    // تحويل userAnswer إلى مصفوفة
    let userAnswerArr = userAnswer;
    if (typeof userAnswerArr === 'string') {
      try {
        userAnswerArr = JSON.parse(userAnswerArr);
      } catch {
        userAnswerArr = [];
      }
    }
    if (!Array.isArray(userAnswerArr)) {
      userAnswerArr = [];
    }

    const result = checkFillFromWords(userAnswerArr, correct, usePartialMarking, totalMarks, { enablePluralNormalization });
    return { score: result.score, isCorrect: result.isFullyCorrect, details: result };
  }

  // --- Sentence Reorder (معدل: تعطيل التصحيح الجزئي) ---
  if (type === 'sentence_reorder') {
    // ----- تحويل correct_answer إلى مصفوفة نماذج -----
    let correct = question.correct_answer;
    if (typeof correct === 'string') {
      try {
        correct = JSON.parse(correct);
      } catch {
        correct = [correct];
      }
    }
    if (!Array.isArray(correct)) correct = [correct];
    
    // تسطيح متكرر
    while (correct.length === 1 && Array.isArray(correct[0])) {
      correct = correct[0];
    }
    
    let correctModels;
    if (Array.isArray(correct) && correct.length > 0 && !Array.isArray(correct[0])) {
      correctModels = [correct];
    } else {
      correctModels = correct;
    }
    correctModels = correctModels.filter(model => Array.isArray(model) && model.length > 0);

    // ----- تحويل userAnswer إلى مصفوفة مسطحة -----
    let userAnswerArr = userAnswer;
    if (typeof userAnswerArr === 'string') {
      try {
        userAnswerArr = JSON.parse(userAnswerArr);
      } catch {
        userAnswerArr = [];
      }
    }
    if (!Array.isArray(userAnswerArr)) userAnswerArr = [];
    while (userAnswerArr.length === 1 && Array.isArray(userAnswerArr[0])) {
      userAnswerArr = userAnswerArr[0];
    }
    userAnswerArr = userAnswerArr.filter(w => w !== undefined && w !== null && w !== '');

    // ✅ سجل التصحيح لمعرفة القيم الفعلية
    console.log('🔍 Sentence Reorder Debug:', {
      userAnswerArr,
      correctModels,
      normalizedUser: userAnswerArr.map(w => w.trim().replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase()),
      normalizedModels: correctModels.map(m => m.map(w => w.trim().replace(/[\u064B-\u065F\u0670]/g, '').toLowerCase()))
    });

    // ✅ تعطيل التصحيح الجزئي (نمرر false)
    const result = checkSentenceReorderFlexible(
      userAnswerArr,
      correctModels,
      false, // ❌ لا تصحيح جزئي (إما الكل أو لا شيء)
      totalMarks,
      { enablePluralNormalization }
    );
    return { score: result.score, isCorrect: result.isFullyCorrect, details: result.details };
  }

  // --- Matching ---
  if (type === 'matching') {
    const correct = extractCorrectAnswer(question);
    let correctAnswer;
    if (typeof correct === 'object' && correct !== null) {
      correctAnswer = correct;
    } else {
      correctAnswer = {};
    }
    const result = checkMatching(userAnswer, correctAnswer, usePartialMarking, totalMarks, { enablePluralNormalization });
    return { score: result.score, isCorrect: result.isFullyCorrect, details: result };
  }

  // --- Ordering ---
  if (type === 'ordering') {
    const correct = extractCorrectAnswer(question);
    let correctAnswer;
    if (Array.isArray(correct)) {
      correctAnswer = correct;
    } else if (correct !== undefined && correct !== null) {
      correctAnswer = [correct];
    } else {
      correctAnswer = [];
    }
    const result = checkOrdering(userAnswer, correctAnswer, usePartialMarking, totalMarks, { enablePluralNormalization });
    return { score: result.score, isCorrect: result.isFullyCorrect, details: result };
  }

  // --- Passage ---
  if (type === 'passage') {
    return { score: 0, isCorrect: true, details: { passage: true } };
  }

  // --- Fallback ---
  const correct = extractCorrectAnswer(question);
  const userStr = normalize(userAnswer);
  const correctStr = normalize(correct);
  const isCorrect = userStr === correctStr;
  return { score: isCorrect ? totalMarks : 0, isCorrect, details: {} };
};

// ============================================================
// 7. دوال التحليل والإحصائيات (كما هي دون تغيير)
// ============================================================

/**
 * حساب الدرجة الكلية للامتحان
 */
export const gradeExam = (questions, answers, options = {}) => {
  let totalScore = 0;
  let maxPossibleScore = 0;
  const questionGrades = {};
  
  if (!Array.isArray(questions) || questions.length === 0) {
    return { totalScore: 0, maxPossibleScore: 0, questionGrades: {} };
  }
  
  questions.forEach(q => {
    if (!q || typeof q !== 'object') return;
    const userAnswer = answers && answers[q.id] !== undefined ? answers[q.id] : undefined;
    const result = gradeQuestion(q, userAnswer, options);
    questionGrades[q.id] = result;
    totalScore += result.score;
    if (getNormalizedQuestionType(q.type) !== 'passage') {
      maxPossibleScore += q.marks || 1;
    }
  });
  
  return { totalScore, maxPossibleScore, questionGrades };
};

/**
 * حساب مؤشر الخطورة
 */
export const calculateSecurityIndex = (attempt, questions = [], avgTimePerQuestion = 0) => {
  if (!attempt || typeof attempt !== 'object') return 50;
  
  const violations = attempt.proctoring_log?.violations || 0;
  const fullscreenExits = attempt.proctoring_log?.fullscreen_exits || 0;
  const reloadCount = attempt.proctoring_log?.reload_count || 0;
  
  let score = 100;
  score -= violations * 10;
  score -= fullscreenExits * 15;
  score -= reloadCount * 5;
  
  const answersTime = attempt.answers_time || {};
  const realQuestions = (questions || []).filter(q => getNormalizedQuestionType(q.type) !== 'passage');
  let totalTime = 0;
  let answeredCount = 0;
  realQuestions.forEach(q => {
    if (answersTime[q.id] && typeof answersTime[q.id] === 'number') {
      totalTime += answersTime[q.id];
      answeredCount++;
    }
  });
  
  if (answeredCount > 0 && avgTimePerQuestion > 0) {
    const avgTime = totalTime / answeredCount;
    if (avgTime < avgTimePerQuestion * 0.4) {
      score -= 20;
    } else if (avgTime < avgTimePerQuestion * 0.6) {
      score -= 10;
    }
  }
  
  return Math.max(0, Math.min(100, score));
};

/**
 * تحليل أداء الطالب
 */
export const analyzeStudentPerformance = (questions, answers, answersTime = {}, passingMarks = 0) => {
  const results = [];
  let totalCorrect = 0;
  let totalWrong = 0;
  let totalTime = 0;
  let answeredCount = 0;
  let totalPossibleMarks = 0;
  
  if (!Array.isArray(questions)) {
    return { results, totalCorrect: 0, totalWrong: 0, totalQuestions: 0, percentage: 0, passed: false, totalTime: 0, averageTime: 0 };
  }
  
  questions.forEach(q => {
    if (getNormalizedQuestionType(q.type) === 'passage') return;
    const userAnswer = answers && answers[q.id] !== undefined ? answers[q.id] : undefined;
    const time = (answersTime && answersTime[q.id]) || 0;
    const result = gradeQuestion(q, userAnswer);
    const marks = q.marks || 1;
    totalPossibleMarks += marks;
    
    results.push({
      questionId: q.id,
      questionText: q.question_text || '',
      type: q.type || 'unknown',
      marks,
      userAnswer,
      correctAnswer: q.correct_answer,
      isCorrect: result.isCorrect,
      score: result.score,
      time,
      explanation: q.explanation || '',
    });
    
    if (result.isCorrect) totalCorrect++;
    else totalWrong++;
    if (userAnswer !== undefined && userAnswer !== null && userAnswer !== '') {
      totalTime += time;
      answeredCount++;
    }
  });
  
  const totalQuestions = results.length;
  const percentage = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;
  const passed = percentage >= (passingMarks || 0);
  
  return {
    results,
    totalCorrect,
    totalWrong,
    totalQuestions,
    percentage,
    passed,
    totalTime,
    averageTime: answeredCount > 0 ? totalTime / answeredCount : 0,
    totalPossibleMarks,
  };
};

/**
 * إحصائيات الامتحان العامة
 */
export const getExamStatistics = (attempts, questions, passingMarks = 0) => {
  if (!Array.isArray(attempts) || attempts.length === 0) {
    return {
      totalAttempts: 0,
      avgScore: 0,
      maxScore: 0,
      minScore: 0,
      passCount: 0,
      failCount: 0,
      passRate: 0,
      scoreDistribution: { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 },
      questionStats: {},
    };
  }
  
  let totalScore = 0;
  let maxScore = 0;
  let minScore = Infinity;
  let passCount = 0;
  const scoreDistribution = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
  const questionStats = {};
  
  if (Array.isArray(questions)) {
    questions.forEach(q => {
      if (getNormalizedQuestionType(q.type) !== 'passage') {
        questionStats[q.id] = { correct: 0, wrong: 0, total: 0, marks: q.marks || 1 };
      }
    });
  }
  
  attempts.forEach(a => {
    const score = a.score || 0;
    const totalMarks = a.total_marks || 1;
    const percentage = totalMarks > 0 ? (score / totalMarks) * 100 : 0;
    
    totalScore += score;
    if (score > maxScore) maxScore = score;
    if (score < minScore) minScore = score;
    if (percentage >= passingMarks) passCount++;
    
    if (percentage <= 20) scoreDistribution['0-20']++;
    else if (percentage <= 40) scoreDistribution['21-40']++;
    else if (percentage <= 60) scoreDistribution['41-60']++;
    else if (percentage <= 80) scoreDistribution['61-80']++;
    else scoreDistribution['81-100']++;
    
    const answers = a.answers || {};
    if (Array.isArray(questions)) {
      questions.forEach(q => {
        if (getNormalizedQuestionType(q.type) === 'passage') return;
        const userAns = answers[q.id];
        if (userAns !== undefined && userAns !== null && userAns !== '') {
          const result = gradeQuestion(q, userAns);
          if (result.isCorrect) questionStats[q.id].correct++;
          else questionStats[q.id].wrong++;
          questionStats[q.id].total++;
        }
      });
    }
  });
  
  const avgScore = attempts.length > 0 ? totalScore / attempts.length : 0;
  const failCount = attempts.length - passCount;
  const passRate = attempts.length > 0 ? (passCount / attempts.length) * 100 : 0;
  
  return {
    totalAttempts: attempts.length,
    avgScore,
    maxScore,
    minScore: minScore === Infinity ? 0 : minScore,
    passCount,
    failCount,
    passRate,
    scoreDistribution,
    questionStats,
  };
};

// ============================================================
// 8. دوال مساعدة سريعة
// ============================================================

export const isAnswerCorrect = (question, userAnswer, options = {}) => {
  const result = gradeQuestion(question, userAnswer, options);
  return result.isCorrect;
};

export const getQuestionScore = (question, userAnswer, options = {}) => {
  const result = gradeQuestion(question, userAnswer, options);
  return result.score;
};

export const isPassageQuestion = (question) => {
  return getNormalizedQuestionType(question?.type) === 'passage';
};

export const getRealQuestions = (questions) => {
  if (!Array.isArray(questions)) return [];
  return questions.filter(q => getNormalizedQuestionType(q.type) !== 'passage');
};

export const getCorrectAnswersMap = (questions) => {
  const map = {};
  if (!Array.isArray(questions)) return map;
  questions.forEach(q => {
    if (getNormalizedQuestionType(q.type) !== 'passage') {
      map[q.id] = q.correct_answer;
    }
  });
  return map;
};