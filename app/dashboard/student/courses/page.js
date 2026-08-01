// app/dashboard/student/courses/page.js
// ================================================================
// 🏛️ صفحة قائمة الكورسات – نسخة متجاوبة بالكامل مع تحسينات الأداء
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
// 📱 Hook للكشف عن حجم الشاشة (بديل سريع لـ useMediaQuery)
// ================================================================
const useDeviceSize = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const checkSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
      setIsDesktop(width >= 1024);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  return { isMobile, isTablet, isDesktop };
};

// ================================================================
// 🎨 ألوان البطاقات المتغيرة (مبسطة)
// ================================================================
const CARD_COLORS = [
  { name: 'blue', text: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10 dark:bg-blue-400/10', border: 'border-blue-400/30 dark:border-blue-400/20' },
  { name: 'green', text: 'text-green-600 dark:text-green-400', bg: 'bg-green-500/10 dark:bg-green-400/10', border: 'border-green-400/30 dark:border-green-400/20' },
  { name: 'orange', text: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-500/10 dark:bg-orange-400/10', border: 'border-orange-400/30 dark:border-orange-400/20' },
  { name: 'purple', text: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10 dark:bg-purple-400/10', border: 'border-purple-400/30 dark:border-purple-400/20' },
  { name: 'teal', text: 'text-teal-600 dark:text-teal-400', bg: 'bg-teal-500/10 dark:bg-teal-400/10', border: 'border-teal-400/30 dark:border-teal-400/20' },
  { name: 'pink', text: 'text-pink-600 dark:text-pink-400', bg: 'bg-pink-500/10 dark:bg-pink-400/10', border: 'border-pink-400/30 dark:border-pink-400/20' },
];

const getRandomColor = (exclude = []) => {
  const available = CARD_COLORS.filter(c => !exclude.includes(c.name));
  return available.length ? available[Math.floor(Math.random() * available.length)] : CARD_COLORS[0];
};

// ================================================================
// 🌊 مكون الحدود الموجية المحسّن (يقلل الأنيمشن على الموبايل)
// ================================================================
const WaveBorderCard = ({ children, className = '', initialColor = 'blue', onColorChange, intensity = 1 }) => {
  const { isMobile } = useDeviceSize();
  const [color, setColor] = useState(CARD_COLORS.find(c => c.name === initialColor) || CARD_COLORS[0]);
  const [rotation, setRotation] = useState(0);
  const colorRef = useRef(color);
  const isMounted = useRef(true);
  const intervalRef = useRef(null);

  useEffect(() => {
    colorRef.current = color;
  }, [color]);

  useEffect(() => {
    // ⚡️ على الموبايل نقلل التحديثات بشكل كبير (كل 200ms بدل 50ms)
    const intervalMs = isMobile ? 200 : 50;
    const step = isMobile ? 0.5 : 2;

    intervalRef.current = setInterval(() => {
      if (!isMounted.current) return;
      setRotation(prev => {
        const newRot = prev + step * intensity;
        if (newRot >= 360) {
          const newColor = getRandomColor([colorRef.current.name]);
          setColor(newColor);
          if (onColorChange) onColorChange(newColor);
          return 0;
        }
        return newRot;
      });
    }, intervalMs);

    return () => {
      isMounted.current = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onColorChange, intensity, isMobile]);

  // تحسين الأداء: استخدام ألوان ثابتة بدلاً من التدرج المتغير في حالة الموبايل
  const borderStyle = isMobile
    ? { borderColor: color.border.replace('border-', ''), borderWidth: '2px', borderRadius: '1.5rem' }
    : {
        background: `conic-gradient(from ${rotation}deg, rgba(59,130,246,0.6), rgba(37,99,235,0.3), rgba(96,165,250,0.5), rgba(59,130,246,0.7), rgba(37,99,235,0.2))`,
        borderRadius: '1.5rem',
        padding: '3px',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
      };

  return (
    <div className={`relative rounded-2xl sm:rounded-3xl overflow-hidden group ${className}`}>
      {!isMobile && (
        <div className="absolute inset-0 rounded-2xl sm:rounded-3xl" style={borderStyle} />
      )}
      <div
        className={`relative z-10 h-full w-full rounded-2xl sm:rounded-3xl backdrop-blur-sm bg-[var(--bg-card)] border border-[var(--border-color)] transition-all duration-300 group-hover:shadow-2xl ${
          isMobile ? `border-2 ${color.border}` : ''
        }`}
      >
        {children}
      </div>
    </div>
  );
};

// ================================================================
// ثوابت ودوال مساعدة
// ================================================================
const GRADE_STAGES = [
  { id: 'primary', ar: 'ابتدائي', en: 'Primary' },
  { id: 'middle', ar: 'إعدادي', en: 'Middle' },
  { id: 'high', ar: 'ثانوي', en: 'High' },
];

const COURSES_PER_PAGE = 6;

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
// 🃏 بطاقة كورس محسّنة – متجاوبة بالكامل
// ================================================================
const CourseCard = React.memo(({
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
  const { isMobile } = useDeviceSize();
  const [enrolling, setEnrolling] = useState(false);
  const [cardColor, setCardColor] = useState(() => getRandomColor());
  const [isHovered, setIsHovered] = useState(false);

  const price = course.price || 0;
  const isFree = course.is_free || price === 0;
  const videosCount = course.videos_count || 0;
  const duration = course.duration || null;

  const handleColorChange = useCallback((newColor) => setCardColor(newColor), []);

  const handleEnroll = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (enrolling || isEnrolled) return;
    setEnrolling(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(language === 'ar' ? 'يجب تسجيل الدخول' : 'Login required');
        return;
      }
      const { error } = await supabase.from('enrollments').insert({
        student_id: user.id,
        course_id: course.id,
        progress: 0
      });
      if (error) {
        if (error.code === '23505') {
          toast.error(language === 'ar' ? 'مسجل بالفعل' : 'Already enrolled');
        } else {
          throw error;
        }
      } else {
        toast.success(language === 'ar' ? 'تم الاشتراك!' : 'Enrolled!');
        if (onEnroll) onEnroll(course.id);
      }
    } catch (err) {
      console.error(err);
      toast.error(language === 'ar' ? 'فشل الاشتراك' : 'Enrollment failed');
    } finally {
      setEnrolling(false);
    }
  };

  const handlePayment = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPayment) onPayment(course.id);
  };

  const priceDisplay = isFree
    ? <span className="text-green-400 font-bold text-clamp-base sm:text-clamp-lg">{language === 'ar' ? 'مجاني' : 'Free'}</span>
    : <span className="text-yellow-400 font-bold text-clamp-lg sm:text-clamp-xl">{price} <span className="text-xs font-normal text-gray-400">ج.م</span></span>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      whileHover={{ y: isMobile ? -3 : -6 }}
      transition={{ duration: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="w-full max-w-5xl mx-auto"
    >
      <WaveBorderCard initialColor={cardColor.name} onColorChange={handleColorChange} intensity={1.2}>
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl">
          {/* ✅ غلاف 16:9 */}
          <div className="relative w-full aspect-[16/9] bg-gradient-to-br from-gray-800/80 via-gray-900/60 to-gray-950/90 overflow-hidden">
            {course.cover_image ? (
              <>
                <img
                  src={course.cover_image}
                  alt={course.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              </>
            ) : (
              <div className="flex items-center justify-center w-full h-full">
                <Icons.BookOpen className="h-16 w-16 sm:h-20 sm:w-20 md:h-28 md:w-28 text-gray-600/40" />
              </div>
            )}

            {/* شارة الحالة */}
            {isEnrolled && (
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
                <span className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full text-[8px] sm:text-xs md:text-sm font-bold bg-gradient-to-r from-blue-500/90 to-indigo-500/90 text-white backdrop-blur-md border border-blue-400/40 shadow-xl shadow-blue-500/30">
                  {language === 'ar' ? '✅ مشترك' : '✅ Enrolled'}
                </span>
              </div>
            )}

            {/* شريط التقدم */}
            {isEnrolled && progress > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-1.5 sm:h-2 bg-white/10 backdrop-blur-sm">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(progress, 100)}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 shadow-lg shadow-yellow-500/50"
                />
                <span className="absolute bottom-1 right-1 sm:bottom-2 sm:right-2 text-[7px] sm:text-xs font-bold text-white/90 bg-black/50 px-1 py-0.5 sm:px-2 sm:py-0.5 rounded-full backdrop-blur-sm">
                  {Math.round(progress)}%
                </span>
              </div>
            )}

            {/* عنوان يظهر عند الهوفر */}
            <div className="absolute bottom-2 left-2 right-14 sm:bottom-3 sm:left-3 sm:right-16 z-10">
              <h3 className={`text-xs sm:text-base md:text-xl lg:text-2xl font-bold text-white drop-shadow-lg line-clamp-2 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity duration-500`}>
                {course.title}
              </h3>
            </div>
          </div>

          {/* ===== المحتوى السفلي ===== */}
          <div className="p-3 sm:p-4 md:p-5 lg:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            {/* النص */}
            <div className="flex-1 min-w-0">
              <h3 className={`text-sm sm:text-base md:text-lg lg:text-xl font-bold ${styles.text} line-clamp-2 mb-0.5`}>
                {course.title}
              </h3>
              <p className={`text-xs sm:text-sm md:text-base ${styles.subtext} line-clamp-2 opacity-80`}>
                {course.description || (language === 'ar' ? 'كورس مميز في اللغة الإنجليزية' : 'Featured English course')}
              </p>

              {/* إحصائيات */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-1.5 text-[8px] sm:text-xs text-gray-400 dark:text-gray-500">
                {videosCount > 0 && (
                  <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border border-white/5">
                    <Icons.Video className="h-2.5 w-2.5 sm:h-3 sm:w-3"/> {videosCount} {language === 'ar' ? 'فيديو' : 'videos'}
                  </span>
                )}
                {duration && (
                  <span className="flex items-center gap-1 bg-white/5 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-full border border-white/5">
                    <Icons.Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3"/> {duration}
                  </span>
                )}
              </div>
            </div>

            {/* ===== المستطيل الجانبي والأزرار ===== */}
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2 sm:gap-3 flex-shrink-0">
              {!isEnrolled && (
                <div className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border-2 ${isFree ? 'border-green-400/40 bg-green-500/10' : 'border-yellow-400/40 bg-yellow-500/10'} backdrop-blur-sm shadow-lg ${isFree ? 'shadow-green-500/20' : 'shadow-yellow-500/20'} min-w-[55px] sm:min-w-[70px] text-center`}>
                  {priceDisplay}
                </div>
              )}

              <div className="flex items-center gap-0.5">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleFavorite(course.id); }}
                  className={`p-1.5 sm:p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                    isFavorite ? 'bg-red-500/20' : 'hover:bg-white/10'
                  }`}
                  aria-label={language === 'ar' ? 'إضافة للمفضلة' : 'Add to favorites'}
                >
                  <Icons.Heart className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </button>
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onTogglePin(course.id); }}
                  className={`p-1.5 sm:p-2 rounded-full transition-all duration-300 hover:scale-110 ${
                    isPinned ? 'bg-yellow-500/20' : 'hover:bg-white/10'
                  }`}
                  title={language === 'ar' ? (isPinned ? 'إلغاء التثبيت' : 'تثبيت الكورس') : (isPinned ? 'Unpin' : 'Pin')}
                >
                  <Icons.Pin className={`h-3.5 w-3.5 sm:h-4 sm:w-4 transition-colors ${isPinned ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} />
                </button>
              </div>

              {isEnrolled ? (
                <Link
                  href={`/dashboard/student/courses/${course.id}`}
                  className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-[10px] sm:text-xs md:text-sm hover:scale-105 transition-all duration-300 shadow-lg shadow-yellow-400/40 flex items-center gap-1 whitespace-nowrap"
                >
                  <Icons.Play className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {language === 'ar' ? 'متابعة' : 'Continue'}
                </Link>
              ) : (
                <button
                  onClick={isFree ? handleEnroll : handlePayment}
                  disabled={enrolling}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg font-bold text-[10px] sm:text-xs md:text-sm transition-all duration-300 flex items-center gap-1 whitespace-nowrap ${
                    isFree
                      ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 hover:scale-105 border-2 border-green-400/40 hover:border-green-400/70'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:scale-105 shadow-xl shadow-blue-500/40'
                  }`}
                >
                  {enrolling ? <Icons.Loader2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 animate-spin" /> : (isFree ? <Icons.UserPlus className="h-2.5 w-2.5 sm:h-3 sm:w-3" /> : <Icons.ShoppingCart className="h-2.5 w-2.5 sm:h-3 sm:w-3" />)}
                  {enrolling ? (language === 'ar' ? 'جاري...' : 'Loading...') : (isFree ? (language === 'ar' ? 'اشترك' : 'Enroll') : (language === 'ar' ? 'اشترِ' : 'Buy'))}
                </button>
              )}
            </div>
          </div>

          {/* تأثير توهج */}
          {isHovered && !isMobile && (
            <div className={`absolute inset-0 pointer-events-none bg-gradient-to-t from-${cardColor.name}-500/10 via-transparent to-transparent transition-opacity duration-500 rounded-2xl sm:rounded-3xl`} />
          )}
        </div>
      </WaveBorderCard>
    </motion.div>
  );
});

CourseCard.displayName = 'CourseCard';

// ================================================================
// 🏠 الصفحة الرئيسية للكورسات – متجاوبة ومع تحسينات الأداء
// ================================================================
export default function StudentCoursesPage() {
  const router = useRouter();
  const { theme, styles, language } = useTheme();
  const { isMobile, isTablet } = useDeviceSize();

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
  const abortControllerRef = useRef(null);

  // حالات الأسهم
  const [showScrollUp, setShowScrollUp] = useState(false);
  const [showScrollDown, setShowScrollDown] = useState(true);
  const [hideArrows, setHideArrows] = useState(false);

  // المفضلة والتثبيتات
  useEffect(() => {
    try {
      const stored = localStorage.getItem('studentFavorites');
      if (stored) setFavorites(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const saveFavorites = useCallback((favs) => {
    setFavorites(favs);
    localStorage.setItem('studentFavorites', JSON.stringify(favs));
  }, []);

  const toggleFavorite = useCallback((id) => {
    saveFavorites(favorites.includes(id) ? favorites.filter(i => i !== id) : [...favorites, id]);
  }, [favorites, saveFavorites]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('studentPinnedCourses');
      if (stored) setPinned(JSON.parse(stored));
    } catch (e) {}
  }, []);

  const savePinned = useCallback((pinnedIds) => {
    setPinned(pinnedIds);
    localStorage.setItem('studentPinnedCourses', JSON.stringify(pinnedIds));
  }, []);

  const togglePin = useCallback((id) => {
    savePinned(pinned.includes(id) ? pinned.filter(i => i !== id) : [...pinned, id]);
  }, [pinned, savePinned]);

  // جلب البيانات مع AbortController
  const fetchAllCourses = useCallback(async () => {
    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('grade')
        .eq('id', user.id)
        .single();
      const gradeInfo = parseGrade(profile?.grade);
      setStudentGradeInfo(gradeInfo);

      const { data: courses, error: coursesError } = await supabase
        .from('courses')
        .select('*, teacher:teacher_id(full_name)')
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      if (coursesError) throw coursesError;
      setAllCourses(courses || []);

      const { data: enrolls } = await supabase
        .from('enrollments')
        .select('course_id, progress')
        .eq('student_id', user.id);
      const map = {};
      enrolls?.forEach(e => { map[e.course_id] = { enrolled: true, progress: e.progress }; });
      setEnrollments(map);

    } catch (err) {
      if (err.name === 'AbortError') return;
      console.error(err);
      setError(language === 'ar' ? 'فشل تحميل الكورسات' : 'Failed to load courses');
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [language]);

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchAllCourses();
    }
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchAllCourses]);

  // ===== مراقبة التمرير =====
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

  // دوال التمرير
  const scrollUp = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollBy({ top: -300, behavior: 'smooth' });
    setHideArrows(false);
    setTimeout(() => setHideArrows(true), 1500);
  }, []);

  const scrollDown = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollBy({ top: 300, behavior: 'smooth' });
    setHideArrows(false);
    setTimeout(() => setHideArrows(true), 1500);
  }, []);

  // الفلترة والترتيب
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

    if (filterStage) {
      result = result.filter(c => c.grade_stage === filterStage || GRADE_STAGES.find(s => s.id === filterStage)?.ar === c.grade_stage);
    }
    if (filterLevel) {
      result = result.filter(c => String(c.grade_level) === String(filterLevel));
    }

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

  const handleEnrollSuccess = useCallback((courseId) => {
    setEnrollments(prev => ({ ...prev, [courseId]: { enrolled: true, progress: 0 } }));
  }, []);

  const handlePaymentRedirect = useCallback((courseId) => {
    router.push(`/dashboard/student/courses/${courseId}/payment`);
  }, [router]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterFree, filterStage, filterLevel, sort, showAllCourses]);

  const stageDisplayName = studentGradeInfo.stageEn ? GRADE_STAGES.find(s => s.id === studentGradeInfo.stageEn)?.ar || '' : '';
  const totalCoursesCount = allCourses.length;
  const hasCourses = paginatedCourses.length > 0;

  // ===== شاشة التحميل =====
  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="flex flex-col items-center gap-3 sm:gap-4">
          <div className="w-10 h-10 sm:w-14 sm:h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className={`${styles.subtext} text-sm sm:text-base font-medium`}>
            {language === 'ar' ? 'جاري تحميل الكورسات...' : 'Loading courses...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="text-center px-4">
          <Icons.AlertTriangle className="h-10 w-10 sm:h-14 sm:w-14 text-red-400 mx-auto mb-3 sm:mb-4" />
          <p className={`text-base sm:text-lg font-semibold ${styles.text}`}>{error}</p>
          <button
            onClick={fetchAllCourses}
            className="mt-3 sm:mt-4 px-4 py-2 sm:px-6 sm:py-3 bg-blue-500/20 text-blue-500 rounded-xl hover:bg-blue-500/30 transition font-bold text-sm sm:text-base"
          >
            {language === 'ar' ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen ${styles.bg} transition-colors duration-500 relative`}>
      <div
        ref={containerRef}
        className="h-screen overflow-y-auto scroll-smooth"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-5 md:py-7 pb-16 sm:pb-20">
          {/* الهيدر */}
          {hasCourses && (
            <motion.div
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: 'spring', stiffness: 200 }}
              className="mb-4 sm:mb-6 space-y-3 sm:space-y-5"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <div>
                  <h1 className={`text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black tracking-tight ${styles.text} flex flex-wrap items-center gap-1.5 sm:gap-2`}>
                    <span className="bg-gradient-to-r from-blue-500 to-purple-500 bg-clip-text text-transparent">
                      {language === 'ar' ? '📚 استكشف' : '📚 Explore'}
                    </span>
                    <span className="text-gray-400 dark:text-gray-500 hidden sm:inline">|</span>
                    <span className={`${styles.text}`}>
                      {language === 'ar' ? 'الكورسات' : 'Courses'}
                    </span>
                  </h1>
                  <p className={`mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base ${styles.subtext} max-w-xl opacity-80`}>
                    {language === 'ar'
                      ? `اختر الكورس المناسب لك من بين ${totalCoursesCount} كورس، وتعرف على محتواه قبل الاشتراك.`
                      : `Choose the right course from ${totalCoursesCount} courses, and explore the content before subscribing.`
                    }
                  </p>
                  {studentGradeInfo.stageEn && (
                    <div className="mt-1.5 sm:mt-2 flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="px-2 py-1 sm:px-3 sm:py-1.5 rounded-full bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 text-[10px] sm:text-xs md:text-sm font-bold border border-blue-400/30 backdrop-blur-sm">
                        {stageDisplayName} {studentGradeInfo.level ? `- الصف ${studentGradeInfo.level}` : ''}
                      </span>
                      <span className={`text-[8px] sm:text-xs ${styles.subtext} opacity-60`}>
                        {language === 'ar' ? 'الكورسات المعروضة حسب صفك' : 'Courses filtered by your grade'}
                      </span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowAllCourses(!showAllCourses)}
                  className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-lg text-[10px] sm:text-xs md:text-sm font-bold transition-all duration-300 flex items-center gap-1.5 sm:gap-2 whitespace-nowrap ${
                    showAllCourses
                      ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-500 border-2 border-blue-400/40 shadow-lg shadow-blue-500/20'
                      : `${styles.card} border ${styles.border} ${styles.text} hover:border-blue-400/50 hover:shadow-lg`
                  }`}
                >
                  {showAllCourses ? (
                    <><Icons.Filter className="h-3 w-3 sm:h-4 sm:w-4" /> {language === 'ar' ? 'عرض صفي فقط' : 'My Grade Only'}</>
                  ) : (
                    <><Icons.Grid2X2 className="h-3 w-3 sm:h-4 sm:w-4" /> {language === 'ar' ? 'عرض الكل' : 'Show All'}</>
                  )}
                </button>
              </div>

              {/* شريط البحث والفلترة */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch">
                <div className="relative flex-1 group">
                  <Icons.Search className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-gray-400 group-focus-within:text-blue-400 transition-colors" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={language === 'ar' ? 'ابحث عن كورس...' : 'Search courses...'}
                    className={`w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-sm sm:text-base ${styles.input} border ${styles.border} focus:ring-3 focus:ring-blue-400/30 outline-none transition-all duration-300 placeholder:text-gray-400/50`}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                    className={`flex-1 sm:flex-none px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium ${styles.input} border ${styles.border} focus:ring-2 focus:ring-blue-400/30 outline-none transition-all cursor-pointer min-w-[80px] sm:min-w-[100px]`}
                  >
                    <option value="newest">{language === 'ar' ? 'الأحدث' : 'Newest'}</option>
                    <option value="popular">{language === 'ar' ? 'الأكثر شعبية' : 'Popular'}</option>
                    <option value="priceAsc">{language === 'ar' ? 'الأقل سعراً' : 'Price ↑'}</option>
                    <option value="priceDesc">{language === 'ar' ? 'الأعلى سعراً' : 'Price ↓'}</option>
                  </select>
                  <div className={`flex rounded-lg sm:rounded-xl border ${styles.border} overflow-hidden shadow-sm`}>
                    <button
                      onClick={() => setFilterFree(null)}
                      className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-[9px] sm:text-xs font-semibold transition-all duration-300 ${
                        filterFree === null
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30'
                          : `${styles.card} ${styles.text} hover:bg-white/10`
                      }`}
                    >
                      {language === 'ar' ? 'الكل' : 'All'}
                    </button>
                    <button
                      onClick={() => setFilterFree(true)}
                      className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-[9px] sm:text-xs font-semibold transition-all duration-300 ${
                        filterFree === true
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/30'
                          : `${styles.card} ${styles.text} hover:bg-white/10`
                      }`}
                    >
                      {language === 'ar' ? 'مجاني' : 'Free'}
                    </button>
                    <button
                      onClick={() => setFilterFree(false)}
                      className={`px-2.5 sm:px-4 py-2 sm:py-2.5 text-[9px] sm:text-xs font-semibold transition-all duration-300 ${
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
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:gap-6">
            {paginatedCourses.length > 0 ? (
              paginatedCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.4) }}
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
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="col-span-full flex flex-col items-center justify-center py-12 sm:py-16 md:py-20"
              >
                <div className="w-20 h-20 sm:w-28 sm:h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-gray-500/10 to-gray-600/10 flex items-center justify-center mb-3 sm:mb-4 border border-gray-400/20">
                  <Icons.BookOpen className="h-10 w-10 sm:h-14 sm:w-14 md:h-18 md:w-18 text-gray-500/40" />
                </div>
                <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold ${styles.text} mb-1 sm:mb-2`}>
                  {language === 'ar' ? 'لا يوجد كورسات حالية' : 'No Courses Available'}
                </h2>
                <p className={`${styles.subtext} text-center max-w-md text-xs sm:text-sm md:text-base opacity-70`}>
                  {language === 'ar'
                    ? 'يمكنك تغيير الفلاتر أو الانتظار لإضافة كورسات جديدة.'
                    : 'You can change filters or wait for new courses to be added.'}
                </p>
                {!showAllCourses && allCourses.length > 0 && (
                  <button
                    onClick={() => setShowAllCourses(true)}
                    className="mt-4 sm:mt-5 px-5 py-2.5 sm:px-6 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold rounded-lg sm:rounded-xl hover:scale-105 transition-all duration-300 shadow-2xl shadow-blue-500/30 text-sm sm:text-base"
                  >
                    {language === 'ar' ? 'عرض جميع الكورسات' : 'Show All Courses'}
                  </button>
                )}
              </motion.div>
            )}
          </div>

          {/* ترقيم الصفحات */}
          {totalPages > 1 && hasCourses && (
            <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-6 sm:mt-8 pb-4 sm:pb-6">
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
                      className={`w-7 h-7 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 ${
                        currentPage === page
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-xl shadow-blue-500/40 scale-105'
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

      {/* أسهم التمرير – متجاوبة مع تقليل الحجم على الموبايل */}
      <AnimatePresence>
        {showScrollUp && !hideArrows && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.8, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.25 }}
            onClick={scrollUp}
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-[50px] sm:-translate-y-[60px] z-50 p-2 sm:p-3 rounded-full bg-gradient-to-r from-blue-500/80 to-indigo-500/80 text-white shadow-2xl shadow-blue-500/30 hover:scale-110 hover:opacity-100 transition-all duration-300 backdrop-blur-md border border-white/20 ${
              isMobile ? 'p-2.5' : ''
            }`}
            aria-label="Scroll up"
          >
            <Icons.ChevronUp className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6 sm:h-7 sm:w-7'}`} />
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
            className={`fixed left-1/2 top-1/2 -translate-x-1/2 translate-y-[50px] sm:translate-y-[60px] z-50 p-2 sm:p-3 rounded-full bg-gradient-to-r from-green-500/80 to-emerald-500/80 text-white shadow-2xl shadow-green-500/30 hover:scale-110 hover:opacity-100 transition-all duration-300 backdrop-blur-md border border-white/20 ${
              isMobile ? 'p-2.5' : ''
            }`}
            aria-label="Scroll down"
          >
            <Icons.ChevronDown className={`${isMobile ? 'h-5 w-5' : 'h-6 w-6 sm:h-7 sm:w-7'}`} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}