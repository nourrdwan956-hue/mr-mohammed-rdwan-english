'use client';
// ================================================================
// 🎓 المسار: app/dashboard/student/support/academic/page.js
// صفحة السؤال الأكاديمي – بدون رفع الصور
// ================================================================

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// ألوان البطاقات المتغيرة (نفس نظام الرئيسية)
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20' },
  { name: 'red', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 dark:bg-red-400/10', border: 'border-red-400/30 dark:border-red-400/20' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  if (available.length === 0) return CARD_COLORS[0];
  return available[Math.floor(Math.random() * available.length)];
};

// ================================================================
// مكون الحدود الموجية (Wave Border)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange }) => {
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!isMounted.current) return;
      setRotation(prev => {
        const newRot = prev + 2;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, 50);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [onColorChange]);

  const waveColors = [
    `rgba(59, 130, 246, 0.6)`,
    `rgba(37, 99, 235, 0.3)`,
    `rgba(96, 165, 250, 0.5)`,
    `rgba(59, 130, 246, 0.7)`,
    `rgba(37, 99, 235, 0.2)`,
  ];

  const gradientStyle = {
    background: `conic-gradient(from ${rotation}deg, ${waveColors.join(', ')})`,
    borderRadius: '1.5rem',
    padding: '3px',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
  };

  return (
    <div className={`relative rounded-3xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-3xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)]">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// الثوابت
// ================================================================
const QUESTION_CATEGORIES = [
  { key: 'grammar', ar: 'قواعد', en: 'Grammar' },
  { key: 'vocabulary', ar: 'مفردات', en: 'Vocabulary' },
  { key: 'reading', ar: 'قراءة', en: 'Reading' },
  { key: 'writing', ar: 'كتابة', en: 'Writing' },
  { key: 'listening', ar: 'استماع', en: 'Listening' },
  { key: 'speaking', ar: 'تحدث', en: 'Speaking' },
  { key: 'exam_prep', ar: 'تحضير امتحان', en: 'Exam Preparation' },
  { key: 'other', ar: 'أخرى', en: 'Other' },
];

const MAX_DESC_LENGTH = 1000;

// ================================================================
// المكون الرئيسي
// ================================================================
export default function NewAcademicQuestionPage() {
  const router = useRouter();
  const { theme, language, styles } = useTheme();
  const isArabic = language === 'ar';

  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banInfo, setBanInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // حقول النموذج
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('grammar');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [unit, setUnit] = useState('');
  const [description, setDescription] = useState('');

  // ألوان متغيرة للبطاقات
  const [headerColor, setHeaderColor] = useState(CARD_COLORS[0]);
  const [subjectColor, setSubjectColor] = useState(CARD_COLORS[0]);
  const [categoryColor, setCategoryColor] = useState(CARD_COLORS[4]);
  const [courseColor, setCourseColor] = useState(CARD_COLORS[2]);
  const [unitColor, setUnitColor] = useState(CARD_COLORS[5]);
  const [descColor, setDescColor] = useState(CARD_COLORS[1]);
  const [previewColor, setPreviewColor] = useState(CARD_COLORS[4]);
  const [tipsColor, setTipsColor] = useState(CARD_COLORS[5]);

  // ---------- جلب بيانات المستخدم والكورسات ----------
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) { router.push('/login'); return; }
      setUser(currentUser);

      const { data: enrolls, error } = await supabase
        .from('enrollments')
        .select('course_id, courses!inner(id, title, teacher_id)')
        .eq('student_id', currentUser.id);

      if (error) throw error;
      const courseList = enrolls?.map(e => e.courses).filter(Boolean) || [];
      setCourses(courseList);

      const { data: banData } = await supabase
        .from('support_bans')
        .select('*')
        .eq('student_id', currentUser.id)
        .is('unbanned_at', null)
        .maybeSingle();

      if (banData) { setIsBanned(true); setBanInfo(banData); }
      else setIsBanned(false);
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [router, isArabic]);

  useEffect(() => { fetchInitialData(); }, [fetchInitialData]);

  // ---------- التحقق من صحة النموذج (الكورس إجباري) ----------
  const isValid = useMemo(() => {
    return subject.trim().length >= 5 && 
           description.trim().length >= 10 && 
           selectedCourse !== '';
  }, [subject, description, selectedCourse]);

  // ---------- إرسال السؤال (بدون صورة) ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBanned || !isValid || !user) return;

    setSubmitting(true);
    try {
      const course = courses.find(c => c.id === selectedCourse);
      if (!course?.teacher_id) {
        toast.error(isArabic ? 'لا يمكن تحديد المعلم المسؤول' : 'Cannot determine teacher');
        setSubmitting(false);
        return;
      }

      let finalDescription = description.trim();
      if (unit) finalDescription = `[الوحدة/الدرس: ${unit}]\n\n${finalDescription}`;

      const payload = {
        student_id: user.id,
        assigned_to: course.teacher_id,
        course_id: selectedCourse,
        subject: subject.trim(),
        description: finalDescription,
        status: 'open',
        priority: 'medium',
        support_type: 'academic',
        question_category: category,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('tickets').insert(payload);
      if (error) throw error;

      toast.success(isArabic ? 'تم إرسال السؤال الأكاديمي بنجاح' : 'Academic question submitted successfully');
      router.push('/dashboard/student/support');
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? 'فشل إرسال السؤال' : 'Failed to submit question');
    } finally {
      setSubmitting(false);
    }
  };

  const previewCategory = QUESTION_CATEGORIES.find(c => c.key === category)?.[language] || category;

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} p-6 md:p-8`} dir={isArabic ? 'rtl' : 'ltr'}>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* ---------- رأس الصفحة مع Wave Border ---------- */}
        <WaveBorderCard initialColor={headerColor.name} onColorChange={setHeaderColor}>
          <div className="flex items-center gap-4 p-5">
            <button
              onClick={() => router.push('/dashboard/student/support')}
              className={`p-2.5 rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition ${styles.card} border ${styles.border}`}
            >
              <Icons.ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-blue-500 to-indigo-500 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
                {isArabic ? 'سؤال أكاديمي' : 'Academic Question'}
              </h1>
              <p className={`text-base ${styles.subtext} mt-1`}>
                {isArabic ? 'اطرح سؤالك حول منهج اللغة الإنجليزية وسيرد معلمك مباشرة.' : 'Ask your question about the English curriculum and your teacher will respond.'}
              </p>
            </div>
          </div>
        </WaveBorderCard>

        {/* ---------- تنبيه الحظر ---------- */}
        <AnimatePresence>
          {isBanned && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <WaveBorderCard initialColor="red">
                <div className="p-5 flex items-start gap-4">
                  <Icons.AlertTriangle className="h-8 w-8 text-red-400 flex-shrink-0" />
                  <div>
                    <h3 className="font-bold text-red-400 text-lg">
                      {isArabic ? 'محظور' : 'Banned'}
                    </h3>
                    <p className="text-base text-red-300">
                      {isArabic ? 'لا يمكنك إرسال أسئلة حالياً.' : 'You cannot submit questions right now.'}
                    </p>
                  </div>
                </div>
              </WaveBorderCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------- النموذج الرئيسي ---------- */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* الأعمدة اليسرى: الحقول */}
            <div className="lg:col-span-3 space-y-6">
              {/* الموضوع */}
              <WaveBorderCard initialColor={subjectColor.name} onColorChange={setSubjectColor}>
                <div className="p-6">
                  <label className={`block text-base font-bold ${styles.label} mb-2`}>
                    {isArabic ? 'عنوان السؤال' : 'Question Title'} <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={isArabic ? 'مثلاً: قاعدة if الشرطية' : 'e.g., Conditional if rule'}
                    className={`w-full p-4 text-lg ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition`}
                    disabled={isBanned}
                    required
                  />
                </div>
              </WaveBorderCard>

              {/* تصنيف السؤال + اختيار الكورس (صف واحد) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <WaveBorderCard initialColor={categoryColor.name} onColorChange={setCategoryColor}>
                  <div className="p-6">
                    <label className={`block text-base font-bold ${styles.label} mb-3`}>
                      {isArabic ? 'تصنيف السؤال' : 'Question Category'}
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {QUESTION_CATEGORIES.slice(0, 6).map(cat => (
                        <button
                          type="button"
                          key={cat.key}
                          onClick={() => setCategory(cat.key)}
                          className={`px-3 py-2 text-sm rounded-xl border transition ${
                            category === cat.key
                              ? 'bg-blue-500/20 border-blue-500 text-blue-600 dark:text-blue-400 font-bold'
                              : `${styles.input} border ${styles.border}`
                          }`}
                        >
                          {cat[language]}
                        </button>
                      ))}
                    </div>
                  </div>
                </WaveBorderCard>

                <WaveBorderCard initialColor={courseColor.name} onColorChange={setCourseColor}>
                  <div className="p-6">
                    <label className={`block text-base font-bold ${styles.label} mb-2`}>
                      {isArabic ? 'الكورس' : 'Course'} <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={selectedCourse}
                      onChange={(e) => setSelectedCourse(e.target.value)}
                      className={`w-full p-4 text-lg ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition`}
                      disabled={isBanned}
                      required
                    >
                      <option value="">{isArabic ? '-- اختر الكورس --' : '-- Select course --'}</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.title}</option>
                      ))}
                    </select>
                    {courses.length === 0 && !isBanned && (
                      <p className="text-sm text-amber-500 mt-2">
                        {isArabic ? '⚠️ لا توجد كورسات مسجلة.' : '⚠️ No courses enrolled.'}
                      </p>
                    )}
                  </div>
                </WaveBorderCard>
              </div>

              {/* الوحدة / الدرس */}
              <WaveBorderCard initialColor={unitColor.name} onColorChange={setUnitColor}>
                <div className="p-6">
                  <label className={`block text-base font-bold ${styles.label} mb-2`}>
                    {isArabic ? 'الوحدة / الدرس (اختياري)' : 'Unit / Lesson (optional)'}
                  </label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder={isArabic ? 'مثلاً: Unit 3 - Lesson 2' : 'e.g., Unit 3 - Lesson 2'}
                    className={`w-full p-4 text-lg ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition`}
                    disabled={isBanned}
                  />
                </div>
              </WaveBorderCard>

              {/* وصف السؤال (بدون رفع صورة) */}
              <WaveBorderCard initialColor={descColor.name} onColorChange={setDescColor}>
                <div className="p-6">
                  <label className={`block text-base font-bold ${styles.label} mb-2`}>
                    {isArabic ? 'تفاصيل السؤال' : 'Question Details'} <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    maxLength={MAX_DESC_LENGTH}
                    placeholder={isArabic
                      ? 'اكتب سؤالك بوضوح... اذكر ما فهمته وما الصعوبة التي تواجهها.'
                      : 'Write your question clearly... mention what you understood and the difficulty.'}
                    className={`w-full p-4 text-lg ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-blue-500/40 outline-none transition resize-none`}
                    disabled={isBanned}
                    required
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className={`text-sm ${description.length >= MAX_DESC_LENGTH ? 'text-red-500' : styles.subtext}`}>
                      {description.length}/{MAX_DESC_LENGTH} {isArabic ? 'حرف' : 'characters'}
                    </span>
                  </div>
                </div>
              </WaveBorderCard>

              {/* أزرار الإرسال والإلغاء */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={!isValid || submitting || isBanned || courses.length === 0}
                  className="flex-1 py-4 text-lg bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-xl hover:scale-[1.02] transition shadow-2xl shadow-blue-500/30 dark:shadow-blue-400/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {submitting ? <Icons.Loader2 className="h-6 w-6 animate-spin" /> : <Icons.Send className="h-6 w-6" />}
                  {isArabic ? 'إرسال السؤال' : 'Submit Question'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className={`px-8 py-4 text-lg ${styles.card} border ${styles.border} rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition font-bold`}
                >
                  {isArabic ? 'إلغاء' : 'Cancel'}
                </button>
              </div>
            </div>

            {/* العمود الأيمن: المعاينة + ملخص */}
            <div className="lg:col-span-2 space-y-6">
              {/* بطاقة المعاينة */}
              <WaveBorderCard initialColor={previewColor.name} onColorChange={setPreviewColor}>
                <div className="p-6">
                  <h3 className={`text-lg font-bold ${styles.text} flex items-center gap-2 mb-4`}>
                    <Icons.Eye className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                    {isArabic ? 'معاينة السؤال' : 'Preview'}
                  </h3>
                  {subject || description ? (
                    <div className="space-y-4 text-base">
                      <div>
                        <span className={`text-sm ${styles.subtext}`}>{isArabic ? 'العنوان:' : 'Title:'}</span>
                        <p className={`font-bold text-lg ${styles.text}`}>{subject || '—'}</p>
                      </div>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className={`px-3 py-1 rounded-full bg-blue-500/20 text-blue-600 dark:text-blue-400 font-medium`}>
                          {previewCategory}
                        </span>
                        {selectedCourse && (
                          <span className={`${styles.subtext} px-3 py-1 rounded-full border ${styles.border}`}>
                            {courses.find(c => c.id === selectedCourse)?.title}
                          </span>
                        )}
                      </div>
                      {unit && <p className={`text-sm ${styles.subtext}`}>📘 {unit}</p>}
                      <div>
                        <span className={`text-sm ${styles.subtext}`}>{isArabic ? 'التفاصيل:' : 'Details:'}</span>
                        <p className={`${styles.text} whitespace-pre-wrap leading-relaxed`}>{description || '—'}</p>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-base ${styles.subtext}`}>
                      {isArabic ? 'أدخل بيانات السؤال' : 'Enter question details'}
                    </p>
                  )}
                </div>
              </WaveBorderCard>

              {/* نصائح - تم تحديث النص (بدون ذكر الصورة) */}
              <WaveBorderCard initialColor={tipsColor.name} onColorChange={setTipsColor}>
                <div className="p-6">
                  <p className={`text-base font-bold ${styles.text} flex items-center gap-2 mb-3`}>
                    <Icons.Info className="h-6 w-6 text-teal-500 dark:text-teal-400" />
                    {isArabic ? 'نصائح لسؤال جيد' : 'Tips for a good question'}
                  </p>
                  <ul className={`text-sm ${styles.subtext} space-y-2 list-disc pr-5`}>
                    <li>{isArabic ? 'اذكر القاعدة أو المثال الذي يسبب الحيرة.' : 'Mention the rule or example causing confusion.'}</li>
                    <li>{isArabic ? 'حدد الجزء الذي فهمته والجزء الغامض.' : 'Specify what you understood and what is unclear.'}</li>
                    <li>{isArabic ? 'عشان مستر محمد يقدر يساعدك: لازم تكتب مشكلتك بشكل سليم يا بطل' : 'So Mr. Muhammad can help you: write your problem clearly, champion!'}</li>
                  </ul>
                </div>
              </WaveBorderCard>

              {/* حالة النموذج */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-5`}>
                <p className={`text-sm font-bold ${styles.text} mb-2`}>
                  {isArabic ? 'حالة النموذج' : 'Form Status'}
                </p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className={styles.subtext}>{isArabic ? 'الموضوع' : 'Subject'}</span>
                    <span className={subject.trim().length >= 5 ? 'text-green-500' : 'text-red-500'}>
                      {subject.trim().length >= 5 ? '✅' : '❌'} {subject.trim().length}/5
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={styles.subtext}>{isArabic ? 'الوصف' : 'Description'}</span>
                    <span className={description.trim().length >= 10 ? 'text-green-500' : 'text-red-500'}>
                      {description.trim().length >= 10 ? '✅' : '❌'} {description.trim().length}/10
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className={styles.subtext}>{isArabic ? 'الكورس' : 'Course'}</span>
                    <span className={selectedCourse !== '' ? 'text-green-500' : 'text-red-500'}>
                      {selectedCourse !== '' ? '✅' : '❌'} {isArabic ? 'مطلوب' : 'Required'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}