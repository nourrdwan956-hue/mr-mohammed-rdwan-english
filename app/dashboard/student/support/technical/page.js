'use client';
// ================================================================
// 🛠️ المسار: app/dashboard/student/support/technical/page.js
// صفحة إنشاء شكوى فنية – تجربة فاخرة مع معاينة وتحقق ذكي
// ================================================================

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
const MAX_DESC_LENGTH = 500;

// ================================================================
// المكون الرئيسي
// ================================================================
export default function NewTechnicalComplaintPage() {
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
  const [description, setDescription] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // حالة المعاينة
  const [showPreview, setShowPreview] = useState(false);

  // ألوان متغيرة للبطاقات
  const [subjectColor, setSubjectColor] = useState(CARD_COLORS[3]); // أحمر
  const [descColor, setDescColor] = useState(CARD_COLORS[2]); // برتقالي
  const [courseColor, setCourseColor] = useState(CARD_COLORS[0]); // أزرق
  const [previewColor, setPreviewColor] = useState(CARD_COLORS[4]); // بنفسجي
  const [tipsColor, setTipsColor] = useState(CARD_COLORS[5]); // نعناعي

  // ---------- جلب بيانات المستخدم والكورسات والحظر ----------
  const fetchInitialData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError || !currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      // جلب الكورسات المسجل بها الطالب مع teacher_id
      const { data: enrolls, error: enrollError } = await supabase
        .from('enrollments')
        .select('course_id, courses!inner(id, title, teacher_id)')
        .eq('student_id', currentUser.id);

      if (enrollError) throw enrollError;
      const courseList = enrolls?.map(e => e.courses) || [];
      setCourses(courseList);

      // التحقق من الحظر
      const { data: banData, error: banError } = await supabase
        .from('support_bans')
        .select('*')
        .eq('student_id', currentUser.id)
        .is('unbanned_at', null)
        .maybeSingle();

      if (banError) console.error('Ban check error:', banError);
      else if (banData) {
        setIsBanned(true);
        setBanInfo(banData);
      } else {
        setIsBanned(false);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      toast.error(isArabic ? 'فشل تحميل البيانات' : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [router, isArabic]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  // ---------- تحقق بسيط من صحة النموذج (مع جعل الكورس إجباري) ----------
  const isValid = useMemo(() => {
    return subject.trim().length >= 5 && 
           description.trim().length >= 10 && 
           selectedCourse !== ''; // ✅ الكورس أصبح إجباري
  }, [subject, description, selectedCourse]);

  // ---------- معالجة الإرسال ----------
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isBanned || !isValid || !user) return;

    setSubmitting(true);
    try {
      // تحديد teacher_id من الكورس المختار
      const course = courses.find(c => c.id === selectedCourse);
      const teacherId = course?.teacher_id;

      if (!teacherId) {
        toast.error(isArabic ? 'لا يمكن تحديد المعلم المسؤول' : 'Cannot determine responsible teacher');
        setSubmitting(false);
        return;
      }

      const ticketPayload = {
        student_id: user.id,
        assigned_to: teacherId,
        subject: subject.trim(),
        description: description.trim(),
        course_id: selectedCourse,
        status: 'open',
        priority: 'medium',
        support_type: 'technical',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await supabase
        .from('tickets')
        .insert(ticketPayload);

      if (insertError) throw insertError;

      toast.success(isArabic ? 'تم إرسال الشكوى الفنية بنجاح' : 'Technical complaint submitted successfully');
      router.push('/dashboard/student/support');
    } catch (err) {
      console.error('Submission error:', err);
      toast.error(isArabic ? 'فشل إرسال الشكوى' : 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- عداد الحروف ----------
  const descriptionCount = description.length;

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
        <WaveBorderCard initialColor={CARD_COLORS[0].name}>
          <div className="flex items-center gap-4 p-5">
            <button
              onClick={() => router.push('/dashboard/student/support')}
              className={`p-2.5 rounded-xl hover:bg-white/10 dark:hover:bg-white/5 transition ${styles.card} border ${styles.border}`}
            >
              <Icons.ArrowLeft className="h-6 w-6" />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-red-500 to-orange-500 dark:from-red-400 dark:to-orange-400 bg-clip-text text-transparent">
                {isArabic ? 'شكوى فنية' : 'Technical Complaint'}
              </h1>
              <p className={`text-base ${styles.subtext} mt-1`}>
                {isArabic
                  ? 'أخبرنا بالمشكلة التقنية التي تواجهها وسنساعدك في حلها.'
                  : 'Let us know the technical issue you are facing, and we will help resolve it.'}
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
                      {isArabic ? 'محظور من الإرسال' : 'Banned from submitting'}
                    </h3>
                    <p className="text-base text-red-300">
                      {isArabic
                        ? 'لا يمكنك إرسال شكوى فنية حالياً. يرجى التواصل مع معلمك.'
                        : 'You cannot submit a technical complaint at the moment. Please contact your teacher.'}
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
            {/* الأعمدة اليسرى: حقول الإدخال */}
            <div className="lg:col-span-3 space-y-6">
              {/* الموضوع */}
              <WaveBorderCard initialColor={subjectColor.name} onColorChange={setSubjectColor}>
                <div className="p-6">
                  <label className={`block text-base font-bold ${styles.label} mb-2`}>
                    {isArabic ? 'موضوع الشكوى' : 'Complaint Subject'}
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={isArabic ? 'مثلاً: الفيديو لا يعمل في الكورس...' : 'e.g., Video not working in course...'}
                    className={`w-full p-4 text-lg ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-red-500/40 outline-none transition`}
                    disabled={isBanned}
                    required
                    minLength={5}
                  />
                  <p className={`text-sm ${styles.subtext} mt-2`}>
                    {isArabic ? 'يجب أن يكون الموضوع واضحاً ومختصراً (5 أحرف على الأقل).' : 'Subject must be clear and concise (min 5 characters).'}
                  </p>
                </div>
              </WaveBorderCard>

              {/* الوصف */}
              <WaveBorderCard initialColor={descColor.name} onColorChange={setDescColor}>
                <div className="p-6">
                  <label className={`block text-base font-bold ${styles.label} mb-2`}>
                    {isArabic ? 'وصف المشكلة' : 'Problem Description'}
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={6}
                    maxLength={MAX_DESC_LENGTH}
                    placeholder={isArabic
                      ? 'اشرح المشكلة بالتفصيل... ماذا حدث؟ متى؟ ما الرسالة التي ظهرت؟'
                      : 'Describe the problem in detail... What happened? When? Any error messages?'}
                    className={`w-full p-4 text-lg ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-red-500/40 outline-none transition resize-none`}
                    disabled={isBanned}
                    required
                    minLength={10}
                  />
                  <div className="flex justify-between items-center mt-2">
                    <p className={`text-sm ${styles.subtext}`}>
                      {isArabic ? `${MAX_DESC_LENGTH - descriptionCount} حرف متبقي` : `${MAX_DESC_LENGTH - descriptionCount} characters remaining`}
                    </p>
                    {descriptionCount >= MAX_DESC_LENGTH && (
                      <span className="text-sm text-red-500">{isArabic ? 'الحد الأقصى' : 'Max limit'}</span>
                    )}
                  </div>
                </div>
              </WaveBorderCard>

              {/* اختيار الكورس (إجباري الآن) */}
              <WaveBorderCard initialColor={courseColor.name} onColorChange={setCourseColor}>
                <div className="p-6">
                  <label className={`block text-base font-bold ${styles.label} mb-2`}>
                    {isArabic ? 'الكورس المرتبط' : 'Related Course'}
                    <span className="text-red-500 mr-1">*</span>
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className={`w-full p-4 text-lg ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-red-500/40 outline-none transition`}
                    disabled={isBanned}
                    required
                  >
                    <option value="">{isArabic ? '-- اختر الكورس --' : '-- Select course --'}</option>
                    {courses.map((c) => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </select>
                  <p className={`text-sm ${styles.subtext} mt-2`}>
                    {isArabic 
                      ? 'اختر الكورس الذي يظهر فيه الخلل لنساعدك بدقة أكبر.' 
                      : 'Select the course where the issue occurs for more accurate assistance.'}
                  </p>
                  {courses.length === 0 && !isBanned && (
                    <p className="text-sm text-amber-500 mt-2">
                      {isArabic 
                        ? '⚠️ لا توجد كورسات مسجلة. يرجى التسجيل في كورس أولاً.' 
                        : '⚠️ No courses enrolled. Please enroll in a course first.'}
                    </p>
                  )}
                </div>
              </WaveBorderCard>

              {/* أزرار الإرسال والإلغاء */}
              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={!isValid || submitting || isBanned || courses.length === 0}
                  className="flex-1 py-4 text-lg bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold rounded-xl hover:scale-[1.02] transition shadow-2xl shadow-red-500/30 dark:shadow-red-400/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                >
                  {submitting ? (
                    <Icons.Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <Icons.Send className="h-6 w-6" />
                  )}
                  {isArabic ? 'إرسال الشكوى' : 'Submit Complaint'}
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

            {/* العمود الأيمن: المعاينة والتلميحات */}
            <div className="lg:col-span-2 space-y-6">
              {/* معاينة حية */}
              <WaveBorderCard initialColor={previewColor.name} onColorChange={setPreviewColor}>
                <div className="p-6">
                  <h3 className={`text-lg font-bold ${styles.text} flex items-center gap-2 mb-4`}>
                    <Icons.Eye className="h-6 w-6 text-purple-500 dark:text-purple-400" />
                    {isArabic ? 'معاينة الشكوى' : 'Preview'}
                  </h3>
                  {subject || description || selectedCourse ? (
                    <div className="space-y-4 text-base">
                      <div>
                        <span className={`text-sm ${styles.subtext}`}>{isArabic ? 'الموضوع:' : 'Subject:'}</span>
                        <p className={`font-bold text-lg ${styles.text}`}>{subject || '—'}</p>
                      </div>
                      <div>
                        <span className={`text-sm ${styles.subtext}`}>{isArabic ? 'الوصف:' : 'Description:'}</span>
                        <p className={`${styles.text} whitespace-pre-wrap`}>{description || '—'}</p>
                      </div>
                      <div>
                        <span className={`text-sm ${styles.subtext}`}>{isArabic ? 'الكورس:' : 'Course:'}</span>
                        <p className={`font-bold ${styles.text}`}>
                          {selectedCourse 
                            ? courses.find(c => c.id === selectedCourse)?.title || selectedCourse
                            : (isArabic ? 'غير محدد' : 'Not selected')}
                        </p>
                      </div>
                      <div className="pt-4 border-t border-[var(--border-color)]">
                        <p className={`text-sm ${styles.subtext}`}>
                          {isArabic ? 'النوع: شكوى فنية' : 'Type: Technical Complaint'}
                        </p>
                        <p className={`text-sm ${styles.subtext}`}>
                          {isArabic ? 'الحالة: مفتوحة' : 'Status: Open'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className={`text-base ${styles.subtext}`}>
                      {isArabic
                        ? 'أدخل بيانات الشكوى لرؤية المعاينة.'
                        : 'Enter complaint details to see preview.'}
                    </p>
                  )}
                </div>
              </WaveBorderCard>

              {/* تلميحات */}
              <WaveBorderCard initialColor={tipsColor.name} onColorChange={setTipsColor}>
                <div className="p-6">
                  <p className={`text-base font-bold ${styles.text} flex items-center gap-2 mb-3`}>
                    <Icons.Info className="h-6 w-6 text-teal-500 dark:text-teal-400" />
                    {isArabic ? 'نصائح لشكوى فعالة' : 'Tips for effective complaint'}
                  </p>
                  <ul className={`text-sm ${styles.subtext} space-y-2 list-disc pr-5`}>
                    <li>{isArabic ? 'حدد مكان المشكلة بالضبط (رابط الصفحة، اسم الزر...).' : 'Specify the exact location (page URL, button name...).'}</li>
                    <li>{isArabic ? 'اذكر نوع الجهاز والمتصفح الذي تستخدمه.' : 'Mention your device and browser.'}</li>
                    <li>{isArabic ? 'أرفق لقطة شاشة إن أمكن وأرسلها على رقم واتساب المستر .' : 'Attach a screenshot if possible.'}</li>
                    <li>{isArabic ? 'اختر الكورس الصحيح لضمان الــوصول إلـــي الخطأ الذي يواجهك.' : 'Select the correct course to ensure the complaint reaches the right teacher.'}</li>
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