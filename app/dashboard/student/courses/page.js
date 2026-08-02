// app/dashboard/student/courses/page.js
// ================================================================
// 🏛️ صفحة قائمة الكورسات – متجاوبة بالكامل ومضغوطة
// ✅ تصغير الأحجام والهوامش
// ✅ إضافة عرض محتوى الكورس (فيديوهات - امتحانات - كتب) قبل الشراء
// ✅ منع التشغيل حتى الدفع
// ================================================================

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// ================================================================
// ألوان البطاقات المتغيرة – لوحة غنية ومتنوعة
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20', glow: 'shadow-blue-500/30' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20', glow: 'shadow-green-500/30' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20', glow: 'shadow-orange-500/30' },
  { name: 'red', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10 dark:bg-red-400/10', border: 'border-red-400/30 dark:border-red-400/20', glow: 'shadow-red-500/30' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20', glow: 'shadow-purple-500/30' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20', glow: 'shadow-teal-500/30' },
  { name: 'pink', text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10 dark:bg-pink-400/10', border: 'border-pink-400/30 dark:border-pink-400/20', glow: 'shadow-pink-500/30' },
  { name: 'indigo', text: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-500/10 dark:bg-indigo-400/10', border: 'border-indigo-400/30 dark:border-indigo-400/20', glow: 'shadow-indigo-500/30' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  if (available.length === 0) return CARD_COLORS[0];
  return available[Math.floor(Math.random() * available.length)];
};

// ================================================================
// 🌊 مكون الحدود الموجية المتطورة (Wave Border)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange, intensity = 1 }) => {
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
        const newRot = prev + 2 * intensity;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, 50 / intensity);
    return () => {
      isMounted.current = false;
      clearInterval(interval);
    };
  }, [onColorChange, intensity]);

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
    <div className={`relative rounded-2xl overflow-hidden group ${className}`}>
      <div className="absolute inset-0 rounded-2xl" style={gradientStyle} />
      <div className="relative z-10 h-full w-full rounded-2xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)] transition-all duration-300 group-hover:shadow-2xl">
        {children}
      </div>
    </div>
  );
};

// ================================================================
// الثوابت
// ================================================================
const GRADE_STAGES = [
  { id: 'primary', ar: 'ابتدائي', en: 'Primary' },
  { id: 'middle', ar: 'إعدادي', en: 'Middle' },
  { id: 'high', ar: 'ثانوي', en: 'High' },
];

const COURSES_PER_PAGE = 6;

// ================================================================
// دالة استخراج المرحلة والصف
// ================================================================
function parseGrade(gradeText) {
  if (!gradeText) return { stageEn: null, stageAr: null, level: null };
  const text = gradeText.trim();
  let stageEn = null, stageAr = null;
  if (text.includes('ابتدائي')) { stageEn = 'primary'; stageAr = 'ابتدائي'; }
  else if (text.includes('إعدادي')) { stageEn = 'middle'; stageAr = 'إعدادي'; }
  else if (text.includes('ثانوي')) { stageEn = 'high'; stageAr = 'ثانوي'; }
  if (!stageEn) return { stageEn: null, stageAr: null, level: null };

  const levelMap = {
    'الأول': 1, 'الثاني': 2, 'الثالث': 3,
    'الرابع': 4, 'الخامس': 5, 'السادس': 6,
  };
  let level = null;
  for (const [arabic, num] of Object.entries(levelMap)) {
    if (text.includes(arabic)) { level = num; break; }
  }
  return { stageEn, stageAr, level };
}

// ================================================================
// 🎴 بطاقة كورس – تصميم فاخر مع غلاف 16:9 ومحتوى الكورس المعروض
// ================================================================
const CourseCard = ({
  course,
  isEnrolled,
  progress,
  isFavorite,
  isPinned,
  onToggleFavorite,
  onTogglePin,
  onEnroll,
  onPayment,
  styles,
  language
}) => {
  const [enrolling, setEnrolling] = useState(false);
  const [cardColor, setCardColor] = useState(CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]);
  const [isHovered, setIsHovered] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [courseContent, setCourseContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const price = course.price || 0;
  const isFree = course.is_free || price === 0;
  const videosCount = course.videos_count || 0;
  const duration = course.duration || null;

  // جلب محتوى الكورس (فيديوهات، امتحانات، كتب)
  const fetchCourseContent = useCallback(async () => {
    if (courseContent) return;
    setLoadingContent(true);
    try {
      const [videosRes, examsRes, booksRes] = await Promise.all([
        supabase.from('videos').select('id, title, display_mode, is_published').eq('course_id', course.id).order('order_index', { ascending: true }),
        supabase.from('exams').select('id, title, is_published').eq('course_id', course.id).order('created_at', { ascending: true }),
        supabase.from('books').select('id, title, file_url, drive_file_id, is_published').eq('course_id', course.id).order('created_at', { ascending: true })
      ]);

      setCourseContent({
        videos: videosRes.data || [],
        exams: examsRes.data || [],
        books: booksRes.data || [],
      });
    } catch (err) {
      console.error('Error fetching course content:', err);
    } finally {
      setLoadingContent(false);
    }
  }, [course.id, courseContent]);

  const handleToggleContent = (e) => {
    e.stopPropagation();
    if (!showContent && !courseContent) {
      fetchCourseContent();
    }
    setShowContent(!showContent);
  };

  const handleColorChange = (newColor) => setCardColor(newColor);

  const handleEnroll = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (enrolling || isEnrolled) return;
    setEnrolling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error(language === 'ar' ? 'يجب تسجيل الدخول' : 'Login required'); return; }
      const { error } = await supabase.from('enrollments').insert({ student_id: user.id, course_id: course.id, progress: 0 });
      if (error) {
        if (error.code === '23505') toast.error(language === 'ar' ? 'مسجل بالفعل' : 'Already enrolled');
        else throw error;
      } else {
        toast.success(language === 'ar' ? 'تم الاشتراك!' : 'Enrolled!');
        if (onEnroll) onEnroll(course.id);
      }
    } catch (err) { toast.error(language === 'ar' ? 'فشل الاشتراك' : 'Enrollment failed'); }
    finally { setEnrolling(false); }
  };

  const handlePayment = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (onPayment) onPayment(course.id);
  };

  const priceDisplay = isFree 
    ? <span className="text-green-400 font-bold text-lg">{language === 'ar' ? 'مجاني' : 'Free'}</span>
    : <span className="text-yellow-400 font-bold text-xl">{price} <span className="text-xs font-normal text-gray-400">ج.م</span></span>;

  // عرض محتوى الكورس
  const renderContent = () => {
    if (loadingContent) {
      return (
        <div className="flex justify-center py-2">
          <Icons.Loader2 className="h-4 w-4 animate-spin text-blue-400" />
        </div>
      );
    }
    if (!courseContent) return null;

    const { videos, exams, books } = courseContent;
    const hasContent = videos.length > 0 || exams.length > 0 || books.length > 0;

    if (!hasContent) {
      return (
        <p className={`text-xs ${styles.subtext} opacity-60`}>
          {language === 'ar' ? 'لا يوجد محتوى مضاف بعد' : 'No content added yet'}
        </p>
      );
    }

    return (
      <div className="space-y-2 text-xs">
        {/* الفيديوهات */}
        {videos.length > 0 && (
          <div>
            <div className={`flex items-center gap-1.5 font-semibold ${cardColor.text} mb-0.5`}>
              <Icons.Video className="h-3 w-3" />
              <span>{language === 'ar' ? 'فيديوهات' : 'Videos'} ({videos.length})</span>
            </div>
            <ul className="space-y-0.5 pr-2">
              {videos.slice(0, 5).map((v, idx) => (
                <li key={v.id} className={`flex items-center gap-1 text-[10px] ${styles.subtext} opacity-70`}>
                  <span className="w-4 text-center text-[8px] text-gray-400">{idx + 1}.</span>
                  <span className="truncate">{v.title}</span>
                  {!isEnrolled && (
                    <span className="text-[8px] text-yellow-400/60 mr-auto">🔒</span>
                  )}
                </li>
              ))}
              {videos.length > 5 && (
                <li className={`text-[9px] ${styles.subtext} opacity-50 pr-4`}>
                  + {videos.length - 5} {language === 'ar' ? 'فيديو إضافي' : 'more videos'}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* الامتحانات */}
        {exams.length > 0 && (
          <div>
            <div className={`flex items-center gap-1.5 font-semibold ${cardColor.text} mb-0.5`}>
              <Icons.FileText className="h-3 w-3" />
              <span>{language === 'ar' ? 'امتحانات' : 'Exams'} ({exams.length})</span>
            </div>
            <ul className="space-y-0.5 pr-2">
              {exams.slice(0, 3).map((e, idx) => (
                <li key={e.id} className={`flex items-center gap-1 text-[10px] ${styles.subtext} opacity-70`}>
                  <span className="w-4 text-center text-[8px] text-gray-400">{idx + 1}.</span>
                  <span className="truncate">{e.title}</span>
                  {!isEnrolled && (
                    <span className="text-[8px] text-yellow-400/60 mr-auto">🔒</span>
                  )}
                </li>
              ))}
              {exams.length > 3 && (
                <li className={`text-[9px] ${styles.subtext} opacity-50 pr-4`}>
                  + {exams.length - 3} {language === 'ar' ? 'امتحان إضافي' : 'more exams'}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* الكتب */}
        {books.length > 0 && (
          <div>
            <div className={`flex items-center gap-1.5 font-semibold ${cardColor.text} mb-0.5`}>
              <Icons.Book className="h-3 w-3" />
              <span>{language === 'ar' ? 'كتب' : 'Books'} ({books.length})</span>
            </div>
            <ul className="space-y-0.5 pr-2">
              {books.slice(0, 3).map((b, idx) => (
                <li key={b.id} className={`flex items-center gap-1 text-[10px] ${styles.subtext} opacity-70`}>
                  <span className="w-4 text-center text-[8px] text-gray-400">{idx + 1}.</span>
                  <span className="truncate">{b.title}</span>
                  {!isEnrolled && (
                    <span className="text-[8px] text-yellow-400/60 mr-auto">🔒</span>
                  )}
                </li>
              ))}
              {books.length > 3 && (
                <li className={`text-[9px] ${styles.subtext} opacity-50 pr-4`}>
                  + {books.length - 3} {language === 'ar' ? 'كتاب إضافي' : 'more books'}
                </li>
              )}
            </ul>
          </div>
        )}

        {!isEnrolled && (
          <p className={`text-[9px] ${styles.subtext} opacity-40 mt-1 flex items-center gap-1`}>
            <Icons.Lock className="h-2.5 w-2.5" />
            {language === 'ar' ? 'المحتوى مقفل، اشترك لفتحه' : 'Content locked, subscribe to unlock'}
          </p>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ y: -4 }}
      transition={{ duration: 0.4, type: 'spring', stiffness: 300, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full max-w-5xl mx-auto"
    >
      <WaveBorderCard initialColor={cardColor.name} onColorChange={handleColorChange} intensity={1}>
        <div className="relative overflow-hidden rounded-2xl">
          {/* غلاف 16:9 – أصغر قليلاً */}
          <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-800/80 via-gray-900/60 to-gray-950/90 overflow-hidden">
            {course.cover_image ? (
              <>
                <img
                  src={course.cover_image}
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </>
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <Icons.BookOpen className="h-16 w-16 sm:h-20 sm:w-20 text-gray-600/40" />
              </div>
            )}

            {/* شارة الحالة */}
            {isEnrolled && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                <span className="px-2 py-1 sm:px-3 sm:py-1 rounded-full text-[8px] sm:text-[10px] font-bold bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white backdrop-blur-md border border-blue-400/40 shadow-lg shadow-blue-500/30">
                  ✅ {language === 'ar' ? 'مشترك' : 'Enrolled'}
                </span>
              </div>
            )}

            {/* شريط التقدم */}
            {isEnrolled && progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/10 backdrop-blur-sm">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 shadow-lg shadow-yellow-500/50"
                />
                <span className="absolute bottom-1.5 right-1.5 text-[7px] sm:text-[9px] font-bold text-white/90 bg-black/50 px-1.5 py-0.5 rounded-full backdrop-blur-sm">
                  {Math.round(progress)}%
                </span>
              </div>
            )}

            {/* عنوان الكورس يظهر عند التمرير */}
            <div className="absolute bottom-2 left-2 right-14 sm:bottom-3 sm:left-3 sm:right-16 z-10">
              <h3 className={`text-sm sm:text-base md:text-lg font-bold text-white drop-shadow-lg line-clamp-2 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                {course.title}
              </h3>
            </div>
          </div>

          {/* ===== المحتوى السفلي – مضغوط ===== */}
          <div className="p-3 sm:p-4 flex flex-col gap-3">
            {/* الصف العلوي: العنوان + السعر */}
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm sm:text-base font-bold ${styles.text} line-clamp-1`}>
                  {course.title}
                </h3>
                <p className={`text-[10px] sm:text-xs ${styles.subtext} line-clamp-1 opacity-70`}>
                  {course.description || (language === 'ar' ? 'كورس مميز في اللغة الإنجليزية' : 'Featured English course')}
                </p>
                {/* إحصائيات صغيرة */}
                <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[9px] sm:text-[10px] text-gray-400">
                  {videosCount > 0 && (
                    <span className="flex items-center gap-0.5 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/5">
                      <Icons.Video className="h-2.5 w-2.5" /> {videosCount}
                    </span>
                  )}
                  {duration && (
                    <span className="flex items-center gap-0.5 bg-white/5 px-1.5 py-0.5 rounded-full border border-white/5">
                      <Icons.Clock className="h-2.5 w-2.5" /> {duration}
                    </span>
                  )}
                </div>
              </div>

              {/* السعر والأزرار */}
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                {!isEnrolled && (
                  <div className={`px-2.5 py-1 rounded-lg border ${isFree ? 'border-green-400/30 bg-green-500/10' : 'border-yellow-400/30 bg-yellow-500/10'} shadow-sm min-w-[55px] text-center`}>
                    {priceDisplay}
                  </div>
                )}

                <div className="flex items-center gap-0.5">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(course.id); }}
                    className={`p-1.5 rounded-full transition-all duration-300 hover:scale-110 ${
                      isFavorite ? 'bg-red-500/20' : 'hover:bg-white/10'
                    }`}
                  >
                    <Icons.Heart className={`h-3.5 w-3.5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(course.id); }}
                    className={`p-1.5 rounded-full transition-all duration-300 hover:scale-110 ${
                      isPinned ? 'bg-yellow-500/20' : 'hover:bg-white/10'
                    }`}
                  >
                    <Icons.Pin className={`h-3.5 w-3.5 transition-colors ${isPinned ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                  </button>
                </div>

                {isEnrolled ? (
                  <Link
                    href={`/dashboard/student/courses/${course.id}`}
                    className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-[10px] sm:text-xs hover:scale-105 transition-all duration-300 shadow-lg shadow-yellow-400/30 flex items-center gap-1 whitespace-nowrap"
                  >
                    <Icons.Play className="h-2.5 w-2.5" />
                    {language === 'ar' ? 'متابعة' : 'Continue'}
                  </Link>
                ) : (
                  <button
                    onClick={isFree ? handleEnroll : handlePayment}
                    disabled={enrolling}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] sm:text-xs transition-all duration-300 flex items-center gap-1 whitespace-nowrap ${
                      isFree
                        ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 hover:scale-105 border border-green-400/30'
                        : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:scale-105 shadow-lg shadow-blue-500/30'
                    }`}
                  >
                    {enrolling ? <Icons.Loader2 className="h-2.5 w-2.5 animate-spin" /> : (isFree ? <Icons.UserPlus className="h-2.5 w-2.5" /> : <Icons.ShoppingCart className="h-2.5 w-2.5" />)}
                    {enrolling ? (language === 'ar' ? 'جاري...' : 'Loading...') : (isFree ? (language === 'ar' ? 'اشترك' : 'Enroll') : (language === 'ar' ? 'اشترِ' : 'Buy'))}
                  </button>
                )}
              </div>
            </div>

            {/* ===== قسم محتوى الكورس (جديد) ===== */}
            <div className="border-t border-white/10 pt-2">
              <button
                onClick={handleToggleContent}
                className={`flex items-center gap-1.5 text-[10px] sm:text-xs font-semibold ${cardColor.text} hover:opacity-80 transition-all duration-300 w-full text-right`}
              >
                <Icons.List className="h-3.5 w-3.5" />
                <span>{language === 'ar' ? 'محتوى الكورس' : 'Course Content'}</span>
                <motion.div
                  animate={{ rotate: showContent ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="mr-auto"
                >
                  <Icons.ChevronDown className="h-3.5 w-3.5" />
                </motion.div>
                <span className={`text-[8px] ${styles.subtext} opacity-50 mr-1`}>
                  ({courseContent ? `${courseContent.videos.length + courseContent.exams.length + courseContent.books.length}` : '...'})
                </span>
              </button>

              <AnimatePresence>
                {showContent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pt-2 pb-0.5">
                      {renderContent()}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* تأثير توهج عند hover */}
          {isHovered && (
            <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t from-${cardColor.name}-500/10 via-transparent to-transparent transition-opacity duration-500 rounded-2xl`} />
          )}
        </div>
      </WaveBorderCard>
    </motion.div>
  );
};

// ================================================================
// الصفحة الرئيسية – مع أسهم تمرير في منتصف الشاشة (مضغوطة)
// ================================================================
export default function StudentCoursesPage() {
  const router = useRouter();
  const { theme, styles, language } = useTheme();
  const [allCourses, setAllCourses] = useState([]);
  const [enrollments, setEnrollments] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterFree, setFilterFree] = useState(null);
  const [filterStage, setFilterStage] = useState(null);
  const [filterLevel, setFilterLevel] = useState(null);
  const [sort, setSort] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [studentGradeInfo, setStudentGradeInfo] = useState({ stageEn: null, stageAr: null, level: null });
  const [showAllCourses, setShowAllCourses] = useState(false);
  const [error, setError] = useState('');
  const fetchedRef = useRef(false);
  const containerRef = useRef(null);
  const scrollTimeoutRef = useRef(null);

  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(true);
  const [hideArrows, setHideArrows] = useState(false);

  // المفضلة
  useEffect(() => {
    try { const stored = localStorage.getItem('studentFavorites'); if (stored) setFavorites(JSON.parse(stored)); } catch (e) {}
  }, []);
  const saveFavorites = (favs) => { setFavorites(favs); localStorage.setItem('studentFavorites', JSON.stringify(favs)); };
  const toggleFavorite = (id) => saveFavorites(favorites.includes(id) ? favorites.filter(i => i !== id) : [...favorites, id]);

  // التثبيتات
  useEffect(() => {
    try { const stored = localStorage.getItem('studentPinnedCourses'); if (stored) setPinned(JSON.parse(stored)); } catch (e) {}
  }, []);
  const savePinned = (pinnedIds) => { setPinned(pinnedIds); localStorage.setItem('studentPinnedCourses', JSON.stringify(pinnedIds)); };
  const togglePin = (id) => savePinned(pinned.includes(id) ? pinned.filter(i => i !== id) : [...pinned, id]);

  // جلب البيانات
  const fetchAllCourses = async () => {
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { window.location.href = '/login'; return; }

      const { data: profile } = await supabase.from('profiles').select('grade').eq('id', user.id).single();
      const gradeInfo = parseGrade(profile?.grade);
      setStudentGradeInfo(gradeInfo);

      const { data: courses } = await supabase
        .from('courses')
        .select('*, teacher:teacher_id(full_name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });
      setAllCourses(courses || []);

      const { data: enrolls } = await supabase.from('enrollments').select('course_id, progress').eq('student_id', user.id);
      const map = {};
      enrolls?.forEach(e => { map[e.course_id] = { enrolled: true, progress: e.progress }; });
      setEnrollments(map);
    } catch (err) {
      console.error(err);
      setError(language === 'ar' ? 'فشل تحميل الكورسات' : 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (!fetchedRef.current) { fetchedRef.current = true; fetchAllCourses(); } }, []);

  // مراقبة التمرير للأسهم
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateArrows = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const atTop = scrollTop < 30;
      const atBottom = scrollTop + clientHeight >= scrollHeight - 30;

      setShowScrollUp(!atTop);
      setShowScrollDown(!atBottom);
    };

    const onScroll = () => {
      setHideArrows(false);
      updateArrows();

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setHideArrows(true);
      }, 1500);
    };

    container.addEventListener('scroll', onScroll);
    setTimeout(updateArrows, 200);

    return () => {
      container.removeEventListener('scroll', onScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, []);

  const scrollUp = () => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollBy({ top: -250, behavior: 'smooth' });
    setHideArrows(false);
    setTimeout(() => setHideArrows(true), 1500);
  };

  const scrollDown = () => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollBy({ top: 250, behavior: 'smooth' });
    setHideArrows(false);
    setTimeout(() => setHideArrows(true), 1500);
  };

  // فلترة وترتيب
  const filteredCourses = useMemo(() => {
    let result = allCourses;
    if (!showAllCourses && studentGradeInfo.stageEn) {
      const { stageEn, stageAr, level } = studentGradeInfo;
      result = result.filter(c => {
        const isGeneral = !c.grade_stage && !c.grade_level;
        if (isGeneral) return true;
        const stageMatch = c.grade_stage === stageEn || c.grade_stage === stageAr;
        if (!stageMatch) return false;
        if (level !== null) return String(c.grade_level ?? '').trim() === String(level).trim();
        return true;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(c => c.title.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q));
    }
    if (filterFree === true) result = result.filter(c => c.is_free || c.price === 0);
    else if (filterFree === false) result = result.filter(c => !c.is_free && c.price > 0);
    if (filterStage) result = result.filter(c => c.grade_stage === filterStage || GRADE_STAGES.find(s => s.id === filterStage)?.ar === c.grade_stage);
    if (filterLevel) result = result.filter(c => String(c.grade_level) === String(filterLevel));

    const pinnedIds = pinned || [];
    const pinnedCourses = [];
    const unpinnedCourses = [];
    result.forEach(c => {
      if (pinnedIds.includes(c.id)) pinnedCourses.push(c);
      else unpinnedCourses.push(c);
    });

    switch (sort) {
      case 'popular':
        unpinnedCourses.sort((a, b) => (b.students_count || 0) - (a.students_count || 0));
        break;
      case 'priceAsc':
        unpinnedCourses.sort((a, b) => (a.price || 0) - (b.price || 0));
        break;
      case 'priceDesc':
        unpinnedCourses.sort((a, b) => (b.price || 0) - (a.price || 0));
        break;
      default:
        unpinnedCourses.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
    }

    return [...pinnedCourses, ...unpinnedCourses];
  }, [allCourses, search, filterFree, filterStage, filterLevel, sort, showAllCourses, studentGradeInfo, pinned]);

  const totalPages = Math.ceil(filteredCourses.length / COURSES_PER_PAGE);
  const paginatedCourses = useMemo(
    () => filteredCourses.slice((currentPage - 1) * COURSES_PER_PAGE, currentPage * COURSES_PER_PAGE),
    [filteredCourses, currentPage]
  );

  const handleEnrollSuccess = (courseId) => {
    setEnrollments(prev => ({ ...prev, [courseId]: { enrolled: true, progress: 0 } }));
  };

  const handlePaymentRedirect = (courseId) => {
    router.push(`/dashboard/student/courses/${courseId}/payment`);
  };

  useEffect(() => { setCurrentPage(1); }, [search, filterFree, filterStage, filterLevel, sort, showAllCourses]);

  const stageDisplayName = studentGradeInfo.stageEn ? GRADE_STAGES.find(s => s.id === studentGradeInfo.stageEn)?.ar || '' : '';
  const totalCoursesCount = allCourses.length;

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`${styles.subtext} text-sm sm:text-base font-medium`}>{language === 'ar' ? 'جاري تحميل الكورسات...' : 'Loading courses...'}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center">
          <Icons.AlertTriangle className="h-10 w-10 sm:h-12 sm:w-12 text-red-400 mx-auto mb-3" />
          <p className={`text-sm sm:text-base font-semibold ${styles.text}`}>{error}</p>
          <button onClick={fetchAllCourses} className="mt-3 px-4 py-2 sm:px-5 sm:py-2.5 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition font-bold text-xs sm:text-sm">
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  const hasCourses = paginatedCourses.length > 0;

  return (
    <div className={`w-full min-h-screen ${styles.bg} transition-colors duration-500 relative`}>
      <div 
        ref={containerRef}
        className="h-screen overflow-y-auto scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 pb-12 sm:pb-16">
          {/* الهيدر – مضغوط */}
          {hasCourses && (
            <motion.div 
              initial={{ opacity: 0, y: -15 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
              className="mb-4 sm:mb-5 space-y-3 sm:space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className={`text-2xl sm:text-3xl md:text-4xl font-black tracking-tight ${styles.text} flex flex-wrap items-center gap-1.5 sm:gap-2`}>
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                      {language === 'ar' ? '📚 استكشف' : '📚 Explore'}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">|</span>
                    <span className={`${styles.text}`}>
                      {language === 'ar' ? 'الكورسات' : 'Courses'}
                    </span>
                  </h1>
                  <p className={`mt-0.5 text-xs sm:text-sm ${styles.subtext} max-w-xl opacity-70`}>
                    {language === 'ar'
                      ? `اختر الكورس المناسب لك من بين ${totalCoursesCount} كورس`
                      : `Choose the right course from ${totalCoursesCount} courses`
                    }
                  </p>
                  {studentGradeInfo.stageEn && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-1 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 text-[9px] sm:text-xs font-bold border border-blue-400/30 backdrop-blur-sm">
                        {stageDisplayName} {studentGradeInfo.level ? `- الصف ${studentGradeInfo.level}` : ''}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowAllCourses(!showAllCourses)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all duration-300 flex items-center gap-1.5 whitespace-nowrap ${
                    showAllCourses 
                      ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-500 border border-blue-400/30 shadow-lg shadow-blue-500/20' 
                      : `${styles.card} border ${styles.border} ${styles.text} hover:border-blue-400/50 hover:shadow-lg`
                  }`}
                >
                  {showAllCourses ? (
                    <><Icons.Filter className="h-3 w-3" /> {language === 'ar' ? 'عرض صفي فقط' : 'My Grade Only'}</>
                  ) : (
                    <><Icons.Grid2X2 className="h-3 w-3" /> {language === 'ar' ? 'عرض الكل' : 'Show All'}</>
                  )}
                </button>
              </div>

              {/* شريط البحث والفلترة – مضغوط */}
              <div className="flex flex-col sm:flex-row gap-1.5 sm:gap-2 items-stretch">
                <div className="relative flex-1 group">
                  <Icons.Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text" 
                    value={search} 
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث عن كورس...' : 'Search courses...'}
                    className={`w-full pl-8 sm:pl-10 pr-3 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm ${styles.input} border ${styles.border} focus:ring-3 focus:ring-blue-400/30 outline-none transition-all duration-300 placeholder:text-gray-400/50`}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <select 
                    value={sort} 
                    onChange={(e) => setSort(e.target.value)} 
                    className={`flex-1 sm:flex-none px-2.5 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium ${styles.input} border ${styles.border} focus:ring-2 focus:ring-blue-400/30 outline-none transition-all cursor-pointer min-w-[80px]`}
                  >
                    <option value="newest">{language === 'ar' ? 'الأحدث' : 'Newest'}</option>
                    <option value="popular">{language === 'ar' ? 'الأكثر شعبية' : 'Popular'}</option>
                    <option value="priceAsc">{language === 'ar' ? 'الأقل سعراً' : 'Price ↑'}</option>
                    <option value="priceDesc">{language === 'ar' ? 'الأعلى سعراً' : 'Price ↓'}</option>
                  </select>
                  <div className={`flex rounded-lg border ${styles.border} overflow-hidden shadow-sm`}>
                    <button 
                      onClick={() => setFilterFree(null)} 
                      className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-semibold transition-all duration-300 ${
                        filterFree === null 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30' 
                          : `${styles.card} ${styles.text} hover:bg-white/10`
                      }`}
                    >
                      {language === 'ar' ? 'الكل' : 'All'}
                    </button>
                    <button 
                      onClick={() => setFilterFree(true)} 
                      className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-semibold transition-all duration-300 ${
                        filterFree === true 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30' 
                          : `${styles.card} ${styles.text} hover:bg-white/10`
                      }`}
                    >
                      {language === 'ar' ? 'مجاني' : 'Free'}
                    </button>
                    <button 
                      onClick={() => setFilterFree(false)} 
                      className={`px-2.5 sm:px-4 py-1.5 sm:py-2 text-[8px] sm:text-[10px] font-semibold transition-all duration-300 ${
                        filterFree === false 
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/30' 
                          : `${styles.card} ${styles.text} hover:bg-white/10`
                      }`}
                    >
                      {language === 'ar' ? 'مدفوع' : 'Paid'}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* شبكة الكورسات */}
          <div className="grid grid-cols-1 gap-4 sm:gap-5">
            {paginatedCourses.length > 0 ? (
              paginatedCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-50px' }}
                  transition={{ duration: 0.4, delay: index * 0.04 }}
                >
                  <CourseCard
                    course={course}
                    isEnrolled={enrollments[course.id]?.enrolled || false}
                    progress={enrollments[course.id]?.progress || 0}
                    isFavorite={favorites.includes(course.id)}
                    isPinned={pinned.includes(course.id)}
                    onToggleFavorite={toggleFavorite}
                    onTogglePin={togglePin}
                    onEnroll={handleEnrollSuccess}
                    onPayment={handlePaymentRedirect}
                    styles={styles}
                    language={language}
                  />
                </motion.div>
              ))
            ) : (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="col-span-full flex flex-col items-center justify-center py-12 sm:py-16"
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-gradient-to-br from-gray-500/10 to-gray-600/10 flex items-center justify-center mb-3 border border-gray-400/20">
                  <Icons.BookOpen className="h-10 w-10 sm:h-14 sm:w-14 text-gray-500/40" />
                </div>
                <h2 className={`text-xl sm:text-2xl font-bold ${styles.text} mb-1.5`}>
                  {language === 'ar' ? 'لا يوجد كورسات حالية' : 'No Courses Available'}
                </h2>
                <p className={`${styles.subtext} text-center max-w-md text-xs sm:text-sm opacity-70`}>
                  {language === 'ar' 
                    ? 'يمكنك تغيير الفلاتر أو الانتظار لإضافة كورسات جديدة.' 
                    : 'You can change filters or wait for new courses to be added.'}
                </p>
                {!showAllCourses && allCourses.length > 0 && (
                  <button 
                    onClick={() => setShowAllCourses(true)} 
                    className="mt-4 px-5 py-2 sm:px-6 sm:py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg hover:scale-105 transition-all duration-300 shadow-lg shadow-blue-500/30 text-xs sm:text-sm"
                  >
                    {language === 'ar' ? 'عرض جميع الكورسات' : 'Show All Courses'}
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* ترقيم الصفحات */}
          {totalPages > 1 && hasCourses && (
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-5 sm:mt-6 pb-4">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))} 
                disabled={currentPage === 1} 
                className={`p-1.5 sm:p-2 rounded-lg border ${styles.border} ${styles.card} disabled:opacity-30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105`}
              >
                <Icons.ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
              <div className="flex gap-1 sm:gap-1.5">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page;
                  if (totalPages <= 7) page = i + 1;
                  else if (currentPage <= 4) page = i + 1;
                  else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                  else page = currentPage - 3 + i;
                  
                  if (page < 1 || page > totalPages) return null;
                  
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-7 h-7 sm:w-9 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 ${
                        currentPage === page 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/40 scale-105' 
                          : `${styles.card} border ${styles.border} ${styles.text} hover:border-blue-400/50 hover:scale-105`
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} 
                disabled={currentPage === totalPages} 
                className={`p-1.5 sm:p-2 rounded-lg border ${styles.border} ${styles.card} disabled:opacity-30 hover:border-blue-400/50 transition-all duration-300 hover:scale-105`}
              >
                <Icons.ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* أسهم التمرير – مضغوطة */}
      <AnimatePresence>
        {showScrollUp && !hideArrows && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            onClick={scrollUp}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-[50px] sm:-translate-y-[60px] z-50 p-2.5 sm:p-3 rounded-full bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white shadow-2xl shadow-blue-500/30 hover:scale-110 hover:opacity-100 transition-all duration-300 backdrop-blur-md border border-white/20"
          >
            <Icons.ChevronUp className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showScrollDown && !hideArrows && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            onClick={scrollDown}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 translate-y-[50px] sm:translate-y-[60px] z-50 p-2.5 sm:p-3 rounded-full bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white shadow-2xl shadow-green-500/30 hover:scale-110 hover:opacity-100 transition-all duration-300 backdrop-blur-md border border-white/20"
          >
            <Icons.ChevronDown className="h-5 w-5 sm:h-6 sm:w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}