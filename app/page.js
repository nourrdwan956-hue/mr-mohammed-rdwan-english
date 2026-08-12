// app/page.js
// ================================================================
// 🏛️ الصفحة الرئيسية – منصة مستر محمد رضوان
// ✅ 6 طبقات متكررة من نفس الكورس (نسخ متراكبة)
// ✅ إطار أخضر فاتح جداً عند Hover (opacity منخفض)
// ✅ أسهم معكوسة (يمين → التالي، يسار → السابق)
// ✅ توقيع المبرمج بتأثير فريد
// ✅ نسبة الصورة 16:9
// ================================================================

'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';

// ================================================================
// 📌 مميزات المنصة
// ================================================================

const PLATFORM_FEATURES = [
  {
    id: 'feature-1',
    icon: Icons.Headphones,
    title: 'دعم فني متواصل',
    description: 'فريق دعم متاح طول اليوم لحل أي مشكلة تقنية في أسرع وقت.',
    gradient: 'from-blue-400 to-cyan-400',
  },
  {
    id: 'feature-2',
    icon: Icons.GraduationCap,
    title: 'متابعة شخصية من المستر',
    description: 'مستر محمد رضوان يتابع أداءك ويحدد نقاط القوة والضعف لديك.',
    gradient: 'from-green-400 to-emerald-400',
  },
  {
    id: 'feature-3',
    icon: Icons.StickyNote,
    title: 'ملاحظاتك الخاصة',
    description: 'مكان آمن لتسجيل ملاحظاتك والرجوع إليها في أي وقت.',
    gradient: 'from-blue-400 to-indigo-400',
  },
  {
    id: 'feature-4',
    icon: Icons.Calendar,
    title: 'جدول مذاكرة ذكي',
    description: 'نظم وقتك بذكاء مع جدول مرن يناسب روتينك اليومي.',
    gradient: 'from-green-400 to-teal-400',
  },
  {
    id: 'feature-5',
    icon: Icons.MessageCircle,
    title: 'تواصل مباشر مع المستر',
    description: 'أرسل سؤالك على واتساب، وسيرد عليك المستر بنفسه.',
    gradient: 'from-blue-400 to-sky-400',
  },
  {
    id: 'feature-6',
    icon: Icons.Inbox,
    title: 'رسائل تهمك',
    description: 'المستر يرسل لك تنبيهات وملاحظات لتحسين مستواك.',
    gradient: 'from-green-400 to-lime-400',
  },
];

// ================================================================
// 🎁 العرض الترويجي الخاص – لأوائل الطلاب
// ================================================================

const PROMO_TOP_STUDENTS = {
  id: 'promo-top-students',
  title: '🎯 عرض خاص لأوائل الطلاب',
  subtitle: 'كورس الترم التاني مجاناً بالكامل',
  description: 'الطلاب اللي هيجيبو أكثر من 90% من درجة الإنجليزي في الترم الأول يبعتو نتيجتهم على الواتساب وهيتفتح لهم كورس الترم التاني الخاص بيهم كامل مجانا (يشمل المراجعة النهائية للترم التاني). لكن الحق ابعت لانو لأول 3 طلاب هيبعتو نتائجهم فقط.',
  cta: '💬 ابعت نتيجتك على واتساب',
  ctaLink: 'https://wa.me/201552191172',
};

// ================================================================
// 🌐 روابط التواصل الاجتماعي
// ================================================================

const SOCIAL_LINKS = [
  {
    id: 'social-youtube',
    icon: Icons.Play,
    label: 'يوتيوب',
    url: 'https://www.youtube.com/@mohamedradwan.easy.english',
    color: 'bg-red-500',
    textColor: 'text-red-400',
    isPrimary: true,
  },
  {
    id: 'social-facebook',
    icon: Icons.Share2,
    label: 'فيسبوك',
    url: 'https://www.facebook.com/share/1BTGeaLqLh/',
    color: 'bg-blue-600',
    textColor: 'text-blue-400',
  },
  {
    id: 'social-whatsapp-master',
    icon: Icons.MessageCircle,
    label: 'واتساب (المستر)',
    url: 'https://wa.me/201552191172',
    color: 'bg-green-500',
    textColor: 'text-green-400',
  },
  {
    id: 'social-whatsapp-support',
    icon: Icons.MessageCircle,
    label: 'واتساب (الدعم)',
    url: 'https://wa.me/201148553118',
    color: 'bg-green-500',
    textColor: 'text-green-400',
  },
  {
    id: 'social-email',
    icon: Icons.Mail,
    label: 'البريد الإلكتروني',
    url: 'mailto:mohamed.smartguy@gmail.com',
    color: 'bg-gray-600',
    textColor: 'text-gray-400',
  },
  {
    id: 'social-phone',
    icon: Icons.Phone,
    label: 'اتصال',
    url: 'tel:01148553118',
    color: 'bg-purple-500',
    textColor: 'text-purple-400',
    isPhone: true,
    phoneNumbers: ['01552191172', '01148553118'],
  },
];

// ================================================================
// ⏳ العداد التنازلي
// ================================================================

const CountdownTimer = ({ isDark }) => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [isClient, setIsClient] = useState(false);

  const targetDate = new Date('2027-06-26T09:00:00').getTime();

  useEffect(() => {
    setIsClient(true);
    const interval = setInterval(() => {
      const now = Date.now();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(interval);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(interval);
  }, [targetDate]);

  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-20">
        <div className="w-6 h-6 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  const items = [
    { label: 'أيام', value: timeLeft.days, color: 'from-yellow-400 to-amber-500' },
    { label: 'ساعات', value: timeLeft.hours, color: 'from-blue-400 to-cyan-500' },
    { label: 'دقائق', value: timeLeft.minutes, color: 'from-green-400 to-emerald-500' },
    { label: 'ثواني', value: timeLeft.seconds, color: 'from-pink-400 to-rose-500' },
  ];

  return (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-blue-400/5 to-green-400/5 blur-2xl -z-10" />
      
      <div className={`relative overflow-hidden rounded-2xl border border-yellow-400/30 p-4 sm:p-6 text-center backdrop-blur-xl ${
        isDark ? 'bg-white/5' : 'bg-white/70'
      } shadow-lg shadow-yellow-400/10`}>
        
        <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/10 via-blue-400/10 to-green-400/10 opacity-20 animate-pulse" />
        
        <div className="relative z-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Icons.Clock className="h-8 w-8 text-yellow-400" />
            </motion.div>
            <h3 className="text-base sm:text-lg font-bold text-yellow-400">
              ⏳ المتبقي على امتحانات الثانوية العامة
            </h3>
          </div>

          <div className="grid grid-cols-4 gap-2 sm:gap-3 max-w-lg mx-auto">
            {items.map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                className={`relative p-2 sm:p-3 rounded-xl bg-gradient-to-br ${item.color} bg-opacity-15 border border-white/10 backdrop-blur-sm`}
              >
                <div className="text-2xl sm:text-3xl md:text-4xl font-black tabular-nums text-white drop-shadow-lg">
                  {String(item.value).padStart(2, '0')}
                </div>
                <div className="text-[8px] sm:text-[10px] font-bold text-white/70 mt-0.5 uppercase tracking-wider">
                  {item.label}
                </div>
              </motion.div>
            ))}
          </div>

          <p className={`text-[10px] sm:text-xs mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            📅 يبدأ الامتحان يوم <span className="font-bold text-yellow-400">السبت 26 يونيو 2027</span> الساعة <span className="font-bold text-blue-400">9:00 صباحاً</span>
          </p>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// 🎨 خلفية متطورة
// ================================================================

const ElegantBackground = ({ isDark }) => {
  const [dots, setDots] = useState([]);
  const { scrollY } = useScroll();

  const y1 = useTransform(scrollY, [0, 1000], [0, -60]);
  const y2 = useTransform(scrollY, [0, 1000], [0, 50]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.03]);

  useEffect(() => {
    const count = window.innerWidth < 640 ? 20 : 45;
    const generatedDots = Array.from({ length: count }, () => ({
      top: Math.random() * 100,
      left: Math.random() * 100,
      delay: Math.random() * 6,
      duration: 3 + Math.random() * 5,
      size: 1 + Math.random() * (window.innerWidth < 640 ? 2 : 3),
    }));
    setDots(generatedDots);
  }, []);

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
      <div
        className={`absolute inset-0 transition-all duration-1000 ${
          isDark ? 'bg-[#0a0e1a]' : 'bg-white'
        }`}
      />

      <motion.div
        style={{ y: y1, scale }}
        className={`absolute top-[-35%] right-[-25%] w-[70%] h-[70%] rounded-full blur-3xl ${
          isDark ? 'bg-blue-500/8' : 'bg-blue-400/6'
        }`}
      />
      <motion.div
        style={{ y: y2 }}
        className={`absolute bottom-[-35%] left-[-25%] w-[60%] h-[60%] rounded-full blur-3xl ${
          isDark ? 'bg-green-500/8' : 'bg-green-400/6'
        }`}
      />

      {dots.length > 0 && (
        <div className="absolute inset-0 hidden sm:block">
          {dots.map((dot, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full ${
                isDark ? 'bg-blue-400/20' : 'bg-blue-400/15'
              }`}
              style={{
                top: `${dot.top}%`,
                left: `${dot.left}%`,
                width: dot.size,
                height: dot.size,
              }}
              animate={{
                opacity: [0.1, 0.6, 0.1],
                scale: [1, 2, 1],
              }}
              transition={{
                duration: dot.duration,
                repeat: Infinity,
                delay: dot.delay,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ================================================================
// 🧭 مؤشر التمرير
// ================================================================

const ScrollIndicator = ({ targetId }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const handler = () => setVisible(window.scrollY < 80);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.2, duration: 0.6 }}
      className="absolute bottom-2 left-1/2 -translate-x-1/2 cursor-pointer z-20"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
    >
      <div className="flex flex-col items-center gap-0.5">
        <motion.div
          animate={{ y: [0, -5, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-px h-6 bg-gradient-to-b from-blue-400 to-transparent"
        />
        <div className="w-5 h-5 rounded-full border border-blue-400/30 bg-white/5 backdrop-blur flex items-center justify-center hover:border-blue-400/70 transition-all duration-300 group">
          <Icons.ChevronDown className="h-2.5 w-2.5 text-blue-400 group-hover:text-blue-300 transition-colors" />
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// ⬆️ زر العودة للأعلى
// ================================================================

const ScrollToTopButton = ({ show, onClick }) => (
  <AnimatePresence>
    {show && (
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={onClick}
        className="fixed bottom-3 right-3 sm:bottom-4 sm:right-4 z-50 p-1.5 sm:p-2 rounded-full bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-300 group"
      >
        <Icons.ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 group-hover:-translate-y-0.5 transition-transform" />
      </motion.button>
    )}
  </AnimatePresence>
);

// ================================================================
// 🃏 بطاقة الكورس – مع 6 طبقات متكررة وإطار أخضر فاتح
// ================================================================

const CourseCard3D = ({ course, teacher, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const [layerOffset, setLayerOffset] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setRotation({ x: rotateX, y: rotateY });
    const offsetX = ((x - centerX) / centerX) * 12;
    const offsetY = ((y - centerY) / centerY) * 12;
    setLayerOffset({ x: offsetX, y: offsetY });
  };

  const handleMouseLeave = () => {
    setRotation({ x: 0, y: 0 });
    setLayerOffset({ x: 0, y: 0 });
    setIsHovered(false);
  };

  const stats = [
    { label: 'فيديوهات', count: course.videos_count || 0, icon: Icons.Video, color: 'text-blue-400' },
    { label: 'امتحانات', count: course.exams_count || 0, icon: Icons.FileText, color: 'text-purple-400' },
    { label: 'كتب', count: course.books_count || 0, icon: Icons.Book, color: 'text-orange-400' },
  ];

  const totalItems = stats.reduce((sum, s) => sum + s.count, 0);

  // ✅ 6 طبقات متكررة من نفس البطاقة (نسخ متراكبة)
  const LAYER_COUNT = 6;

  return (
    <motion.div
      ref={cardRef}
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.07 }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      onClick={() => router.push(`/dashboard/student/courses/${course.id}`)}
      className="group cursor-pointer relative"
      style={{ perspective: '1400px' }}
    >
      <motion.div
        className="relative rounded-2xl overflow-visible"
        animate={{
          scale: isHovered ? 1.04 : 1,
          zIndex: isHovered ? 30 : 10,
          y: isHovered ? -10 : 0,
        }}
        transition={{ duration: 0.3 }}
        style={{
          transformStyle: 'preserve-3d',
        }}
      >
        {/* ===== الطبقات المتكررة (6 نسخ متراكبة) ===== */}
        <div
          className="absolute inset-0 -z-10"
          style={{
            transform: `translateZ(-20px) rotateX(${rotation.x * 0.5}deg) rotateY(${rotation.y * 0.5}deg)`,
            transformStyle: 'preserve-3d',
          }}
        >
          {Array.from({ length: LAYER_COUNT }).map((_, idx) => {
            const depth = (idx + 1) * 18;
            const scale = 1 - (idx + 1) * 0.025;
            const opacity = 0.5 - idx * 0.07;

            return (
              <motion.div
                key={idx}
                className="absolute rounded-2xl border border-white/20"
                style={{
                  backgroundColor: isDark
                    ? `rgba(26, 35, 50, ${0.4 + idx * 0.05})`
                    : `rgba(232, 236, 240, ${0.4 + idx * 0.05})`,
                  width: '100%',
                  height: '100%',
                  transform: `translateZ(${-depth}px) scale(${scale}) translateX(${layerOffset.x * (idx + 1) * 0.7}px) translateY(${layerOffset.y * (idx + 1) * 0.7}px)`,
                  opacity: opacity,
                  boxShadow: `0 8px 30px rgba(0,0,0,0.12)`,
                  backdropFilter: 'blur(2px)',
                }}
                animate={{
                  scale: isHovered ? scale * 1.02 : scale,
                  opacity: isHovered ? opacity + 0.1 : opacity,
                }}
                transition={{ duration: 0.3 }}
              />
            );
          })}
        </div>

        {/* ===== الإطار المتحرك – أخضر فاتح جداً ===== */}
        <div className="absolute inset-[-3px] rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 rounded-2xl p-[3px]">
            <div
              className={`absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-green-300/30 to-transparent transition-opacity duration-300 ${
                isHovered ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                animation: isHovered ? 'borderFlow 3s linear infinite' : 'none',
                backgroundSize: '300% 100%',
              }}
            />
          </div>
        </div>

        {/* ===== البطاقة الأمامية (الظاهرة) ===== */}
        <motion.div
          className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${
            isDark
              ? 'bg-white/10 border-white/15'
              : 'bg-white/90 border-gray-200/50'
          } border backdrop-blur-md shadow-xl hover:shadow-2xl`}
          style={{
            transform: `rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: 'preserve-3d',
            transition: 'transform 0.15s ease-out',
            minHeight: '400px',
            maxHeight: '500px',
          }}
        >
          {/* تأثير إضاءة 3D */}
          <div
            className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: `radial-gradient(circle at ${50 + rotation.y * 3}% ${50 + rotation.x * 3}%, rgba(255,255,255,0.2) 0%, transparent 70%)`,
            }}
          />

          {/* صورة الغلاف – نسبة 16:9 */}
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {course?.cover_image ? (
              <>
                <motion.img
                  src={course.cover_image}
                  alt={course.title}
                  className="w-full h-full object-cover object-center"
                  style={{
                    filter: 'brightness(1.15) contrast(1.1) saturate(1.08)',
                    backgroundColor: '#e8ecf0',
                  }}
                  animate={{ scale: isHovered ? 1.08 : 1 }}
                  transition={{ duration: 0.6 }}
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400/20 to-green-400/20">
                <Icons.BookOpen className="h-20 w-20 text-gray-400/30" />
              </div>
            )}

            {/* شارات */}
            <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-10">
              <motion.span
                className={`text-[8px] sm:text-[9px] px-2.5 py-0.5 rounded-full font-bold backdrop-blur-lg border border-white/15 shadow-lg ${
                  course?.is_free
                    ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                }`}
                whileHover={{ scale: 1.05 }}
              >
                {course?.is_free ? 'مجاني' : `${course?.price} ج.م`}
              </motion.span>
              {course?.is_published && (
                <span className="text-[8px] sm:text-[9px] px-2.5 py-0.5 rounded-full bg-gradient-to-r from-blue-400 to-cyan-500 text-white font-bold backdrop-blur-lg border border-white/15 shadow-lg">
                  متاح
                </span>
              )}
            </div>

            <div className="absolute bottom-3 right-3 flex gap-1.5 z-10">
              <span className="text-[7px] sm:text-[8px] px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white/90 border border-white/10 shadow-lg">
                {course?.grade_stage === 'primary' ? 'ابتدائي' :
                 course?.grade_stage === 'middle' ? 'إعدادي' :
                 course?.grade_stage === 'secondary' ? 'ثانوي' : 'عام'}
              </span>
              {course?.grade_level && (
                <span className="text-[7px] sm:text-[8px] px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white/90 border border-white/10 shadow-lg">
                  صف {course.grade_level}
                </span>
              )}
            </div>

            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
              <div className="p-4 rounded-full bg-black/40 backdrop-blur-md border border-white/20 shadow-2xl group-hover:scale-110 transition-transform duration-300">
                <Icons.Play className="h-8 w-8 text-white" />
              </div>
            </div>
          </div>

          {/* محتوى البطاقة */}
          <div className="p-4 flex flex-col flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <h3 className={`text-sm sm:text-base font-bold mb-0.5 line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  {course?.title || 'كورس'}
                </h3>
                {teacher && (
                  <p className={`text-[9px] sm:text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} flex items-center gap-1`}>
                    <Icons.User className="h-3 w-3 text-blue-400" />
                    {teacher.full_name}
                  </p>
                )}
              </div>
              <div className="flex-shrink-0">
                <span className="text-[10px] sm:text-xs font-extrabold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  {totalItems} عنصر
                </span>
              </div>
            </div>

            <p className={`text-[9px] sm:text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} leading-relaxed line-clamp-2 mt-1 flex-1`}>
              {course?.description || 'لا يوجد وصف'}
            </p>

            <div className="flex items-center justify-between mt-2 gap-1 flex-wrap">
              {stats.map((stat, idx) => (
                <div key={idx} className="flex items-center gap-1 text-[8px] sm:text-[9px]">
                  <stat.icon className={`h-3 w-3 ${stat.color}`} />
                  <span className={`${isDark ? 'text-gray-300' : 'text-gray-700'} font-bold`}>{stat.count}</span>
                  <span className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{stat.label}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2 text-[7px] sm:text-[8px] text-gray-400">
                <span className="flex items-center gap-0.5">
                  <Icons.Clock className="h-3 w-3" />
                  {course?.subscription_duration_days || 30} يوم
                </span>
                <span className="flex items-center gap-0.5">
                  <Icons.Monitor className="h-3 w-3" />
                  {course?.max_devices || 2} جهاز
                </span>
              </div>
              <motion.span
                className={`text-[8px] sm:text-[9px] font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'} flex items-center gap-0.5`}
                whileHover={{ x: -3 }}
                transition={{ duration: 0.2 }}
              >
                {course?.is_free ? 'ابدأ مجاناً' : 'اشترك'}
                <Icons.ArrowLeft className="h-3 w-3" />
              </motion.span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      <style jsx>{`
        @keyframes borderFlow {
          0% { background-position: 0% 0%; }
          50% { background-position: 100% 0%; }
          100% { background-position: 200% 0%; }
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </motion.div>
  );
};

// ================================================================
// 🎠 عرض الكورسات – Carousel مع 6 طبقات وأسهم معكوسة
// ================================================================

const CoursesCarousel3D = ({ courses, teachers, isDark, loading }) => {
  const containerRef = useRef(null);
  const [cardWidth, setCardWidth] = useState(340);

  useEffect(() => {
    const updateWidth = () => {
      const w = window.innerWidth;
      if (w < 640) setCardWidth(280);
      else if (w < 1024) setCardWidth(320);
      else setCardWidth(370);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  if (loading) {
    return (
      <div className="text-center py-8">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
          className="w-8 h-8 border-4 border-blue-400/30 border-t-blue-400 rounded-full mx-auto"
        />
        <p className={`text-xs mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>جاري تحميل الكورسات...</p>
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-8">
        <Icons.BookOpen className="h-16 w-16 text-gray-500/20 mx-auto mb-2" />
        <h3 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>مفيش كورسات متاحة حالياً</h3>
        <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>هتنزل قريب جداً، تابعنا!</p>
      </div>
    );
  }

  const visibleCourses = courses.slice(0, 8);

  const scrollForward = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: cardWidth + 20, behavior: 'smooth' });
    }
  };

  const scrollBackward = () => {
    if (containerRef.current) {
      containerRef.current.scrollBy({ left: -(cardWidth + 20), behavior: 'smooth' });
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
      <div
        ref={containerRef}
        className="flex gap-5 overflow-x-auto pb-6 snap-x snap-mandatory scrollbar-hide"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {visibleCourses.map((course, index) => (
          <div
            key={course.id}
            className="snap-center flex-shrink-0"
            style={{ width: 'clamp(280px, 32vw, 400px)' }}
          >
            <CourseCard3D
              course={course}
              teacher={teachers[course.teacher_id] || null}
              index={index}
            />
          </div>
        ))}
      </div>

      {visibleCourses.length > 3 && (
        <div className="flex justify-center gap-4 mt-6">
          <motion.button
            onClick={scrollBackward}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            className={`p-3 rounded-full ${
              isDark ? 'bg-white/15 hover:bg-white/25' : 'bg-gray-200 hover:bg-gray-300'
            } transition shadow-lg hover:shadow-xl flex items-center justify-center`}
            aria-label="السابق"
          >
            <Icons.ChevronLeft className="h-6 w-6 text-blue-400" />
          </motion.button>
          <motion.button
            onClick={scrollForward}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            className={`p-3 rounded-full ${
              isDark ? 'bg-white/15 hover:bg-white/25' : 'bg-gray-200 hover:bg-gray-300'
            } transition shadow-lg hover:shadow-xl flex items-center justify-center`}
            aria-label="التالي"
          >
            <Icons.ChevronRight className="h-6 w-6 text-blue-400" />
          </motion.button>
        </div>
      )}

      <div className="text-center mt-4">
        <Link
          href="/dashboard/student/courses"
          className={`inline-flex items-center gap-1.5 px-5 py-2 text-xs rounded-full border-2 transition-all duration-300 hover:scale-105 font-bold ${
            isDark
              ? 'border-blue-400/30 bg-white/5 hover:bg-white/10 hover:border-blue-400/60 text-white'
              : 'border-blue-400/30 bg-white/40 hover:bg-white hover:border-blue-400/60 text-gray-800'
          }`}
        >
          <Icons.ArrowLeft className="h-3 w-3" />
          شوف كل الكورسات
        </Link>
      </div>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

// ================================================================
// 🃏 بطاقة المميزات
// ================================================================

const FeatureCard = ({ feature, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.35 }}
      viewport={{ once: true }}
      whileHover={{ y: -2 }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`p-3 rounded-xl border transition-all duration-300 ${
          isDark
            ? 'bg-white/8 border-white/10 hover:border-blue-400/40 hover:shadow-lg hover:shadow-blue-400/10'
            : 'bg-white/70 border-gray-200/40 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-400/10'
        } backdrop-blur-sm relative overflow-hidden`}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-green-400/10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.4 }}
        />

        <div className="flex items-start gap-2 relative z-10">
          <motion.div
            className={`flex-shrink-0 p-1.5 rounded-lg bg-gradient-to-br ${feature.gradient} bg-opacity-20`}
            animate={{
              rotate: isHovered ? [0, 4, -4, 0] : 0,
              scale: isHovered ? 1.08 : 1,
            }}
            transition={{ duration: 0.3 }}
          >
            <feature.icon className={`h-4 w-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </motion.div>
          <div>
            <h3 className={`text-[10px] xs:text-xs font-bold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {feature.title}
            </h3>
            <p className={`text-[8px] xs:text-[9px] sm:text-[10px] ${isDark ? 'text-gray-400' : 'text-gray-500'} leading-relaxed`}>
              {feature.description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 🃏 بطاقة التواصل
// ================================================================

const SocialCard = ({ link, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isPrimary = link.isPrimary || false;
  const isPhone = link.isPhone || false;

  if (isPhone && link.phoneNumbers) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.03, duration: 0.3 }}
        viewport={{ once: true }}
        whileHover={{ scale: 1.02, y: -1 }}
        className={`flex items-center gap-2 p-2 xs:p-2.5 rounded-xl border transition-all duration-300 ${
          isDark
            ? 'bg-white/8 border-white/10 hover:border-blue-400/40 hover:bg-white/12'
            : 'bg-white/70 border-gray-200/40 hover:border-blue-400/50 hover:bg-white/85'
        } backdrop-blur-sm`}
      >
        <div className={`p-1 rounded-lg ${link.color} bg-opacity-15 flex-shrink-0`}>
          <link.icon className={`h-3 w-3 ${link.textColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] xs:text-[10px] font-bold ${isDark ? 'text-white' : 'text-gray-900'} whitespace-nowrap`}>
            {link.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {link.phoneNumbers.map((phone, idx) => (
              <a
                key={idx}
                href={`tel:${phone}`}
                className={`text-[7px] xs:text-[8px] ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} transition font-mono`}
                dir="ltr"
              >
                {phone}
              </a>
            ))}
          </div>
        </div>
        <Icons.Phone className={`h-2 w-2 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
      </motion.div>
    );
  }

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03, duration: 0.3 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02, y: -1 }}
      className={`flex items-center gap-2 p-2 xs:p-2.5 rounded-xl border transition-all duration-300 ${
        isPrimary
          ? isDark
            ? 'bg-blue-400/15 border-blue-400/30 hover:border-blue-400/70 hover:bg-blue-400/25'
            : 'bg-blue-400/15 border-blue-400/30 hover:border-blue-400/70 hover:bg-blue-400/25'
          : isDark
            ? 'bg-white/8 border-white/10 hover:border-blue-400/40 hover:bg-white/12'
            : 'bg-white/70 border-gray-200/40 hover:border-blue-400/50 hover:bg-white/85'
      } backdrop-blur-sm`}
    >
      <div className={`p-1 rounded-lg ${link.color} bg-opacity-15 flex-shrink-0`}>
        <link.icon className={`h-3 w-3 ${link.textColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-[9px] xs:text-[10px] font-bold ${isDark ? 'text-white' : 'text-gray-900'} ${isPrimary ? 'text-blue-400' : ''} whitespace-nowrap`}>
          {link.label}
          {isPrimary && (
            <span className="mr-1 text-[5px] xs:text-[6px] bg-blue-400/20 text-blue-400 px-1 py-0.5 rounded-full whitespace-nowrap">
              رئيسي
            </span>
          )}
        </p>
        <p className={`text-[6px] xs:text-[7px] ${isDark ? 'text-gray-500' : 'text-gray-400'} truncate`}>
          {link.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
        </p>
      </div>
      <Icons.ExternalLink className={`h-2 w-2 flex-shrink-0 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
    </motion.a>
  );
};

// ================================================================
// 📐 أقسام الصفحة الرئيسية
// ================================================================

const HeroSection = ({ isDark }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 30]);

  return (
    <section className="relative min-h-[85vh] flex items-center justify-center px-3 sm:px-4 pt-10 sm:pt-12 pb-4 sm:pb-6 overflow-hidden">
      <motion.div style={{ y }} className="container mx-auto max-w-4xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.35 }}
            className="mb-2 sm:mb-3"
          >
            <div className="inline-block px-3 py-0.5 sm:px-4 sm:py-1 rounded-full bg-blue-400/10 border border-blue-400/20 backdrop-blur">
              <p className="text-[7px] sm:text-[10px] text-blue-400 font-arabic tracking-wider">
                اللهم صل على سيدنا محمد
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.3 }}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-400/15 border border-blue-400/20 text-blue-400 text-[7px] sm:text-[9px] mb-2 sm:mb-3"
          >
            <Icons.Sparkles className="h-2 w-2 sm:h-2.5 sm:w-2.5 animate-pulse" />
            <span>تعلم اللغة الإنجليزية بطريقة مختلفة</span>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] mb-1.5 sm:mb-3 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
              مستر محمد رضوان
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35, duration: 0.4 }}
            className={`text-xs sm:text-sm md:text-base max-w-2xl mx-auto leading-relaxed mb-3 sm:mb-4 ${
              isDark ? 'text-gray-300' : 'text-gray-600'
            }`}
          >
            لو عايز تتعلم إنجليزي باحترافية، تفهم القواعد بسهولة، وتتكلم بثقة، فأنت في المكان الصح.
            هنا مش هتلاقي مجرد فيديوهات، هتلاقي نظام متكامل بيخليك تحب اللغة وتتقدم خطوة بخطوة مع متابعة شخصية من المستر.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.35 }}
            className="flex flex-wrap justify-center gap-2 sm:gap-3 mb-3 sm:mb-4"
          >
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              href="#courses"
              className="inline-flex items-center gap-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold px-4 py-1.5 sm:px-6 sm:py-2 rounded-full shadow-lg shadow-blue-500/40 hover:shadow-blue-500/60 transition-all duration-300 text-[9px] sm:text-xs md:text-sm"
            >
              <Icons.Play className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              شوف الكورسات
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.95 }}
              href="#features"
              className={`inline-flex items-center gap-1 px-4 py-1.5 sm:px-6 sm:py-2 rounded-full border-2 transition-all duration-300 text-[9px] sm:text-xs md:text-sm font-bold ${
                isDark
                  ? 'border-blue-400/30 bg-white/5 hover:bg-white/10 hover:border-blue-400/60 text-white'
                  : 'border-blue-400/30 bg-white/40 hover:bg-white hover:border-blue-400/60 text-gray-800'
              }`}
            >
              <Icons.Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
              شوف المميزات
            </motion.a>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.4 }}
            className="max-w-2xl mx-auto"
          >
            <div
              className={`relative p-3 sm:p-4 rounded-xl border-2 ${
                isDark
                  ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-yellow-400/40'
                  : 'bg-gradient-to-br from-amber-100/80 to-yellow-100/80 border-yellow-400/60'
              } backdrop-blur shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 transition-all duration-400 overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 via-transparent to-amber-400/10 animate-pulse" />

              <div className="relative flex flex-col sm:flex-row items-center gap-2 sm:gap-3 text-center sm:text-right">
                <motion.div
                  className="flex-shrink-0 p-2 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 shadow-lg shadow-yellow-400/30"
                  animate={{
                    scale: [1, 1.06, 1],
                    rotate: [0, 3, -3, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Icons.Trophy className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </motion.div>

                <div className="flex-1">
                  <p className={`text-xs sm:text-sm font-bold ${isDark ? 'text-yellow-300' : 'text-amber-700'}`}>
                    {PROMO_TOP_STUDENTS.title}
                  </p>
                  <p className={`text-[10px] sm:text-xs font-bold ${isDark ? 'text-amber-300' : 'text-amber-600'}`}>
                    {PROMO_TOP_STUDENTS.subtitle}
                  </p>
                  <p className={`text-[8px] sm:text-[10px] ${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-lg mx-auto sm:mx-0 mt-0.5 leading-relaxed`}>
                    {PROMO_TOP_STUDENTS.description}
                  </p>
                </div>

                <motion.a
                  href={PROMO_TOP_STUDENTS.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-3 py-1.5 sm:px-4 sm:py-2 bg-gradient-to-r from-yellow-500 to-amber-500 text-white font-bold rounded-lg hover:from-yellow-600 hover:to-amber-600 transition shadow-lg shadow-yellow-500/30 hover:shadow-yellow-500/50 text-[8px] sm:text-[10px] flex items-center gap-1"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icons.MessageCircle className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {PROMO_TOP_STUDENTS.cta}
                </motion.a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>

      <ScrollIndicator targetId="courses" />
    </section>
  );
};

const CoursesSection = ({ isDark, courses, teachers, loading }) => {
  return (
    <section id="courses" className={`py-6 sm:py-8 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]' : 'bg-white'}`}>
      <div className="container mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          viewport={{ once: true }}
          className="text-center mb-4 sm:mb-6"
        >
          <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            كورسات <span className="text-blue-400">مستر محمد رضوان</span>
          </h2>
          <p className={`text-[10px] sm:text-xs max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            اختار الكورس المناسب ليك، وابدأ رحلة التعلم بخطوات مدروسة.
          </p>
        </motion.div>

        <CoursesCarousel3D
          courses={courses}
          teachers={teachers}
          isDark={isDark}
          loading={loading}
        />
      </div>
    </section>
  );
};

const FeaturesSection = ({ isDark }) => {
  return (
    <section id="features" className={`py-4 sm:py-6 md:py-8 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]/60' : 'bg-white'}`}>
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          viewport={{ once: true }}
          className="text-center mb-3 sm:mb-4"
        >
          <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            إيه اللي هتستفيده معانا؟
          </h2>
          <p className={`text-[10px] sm:text-xs max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            نظام تعليمي متكامل مصمم عشان تتعلم بسهولة وتوصل لهدفك.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
          {PLATFORM_FEATURES.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const CountdownSection = ({ isDark }) => {
  return (
    <section id="countdown" className={`py-4 sm:py-6 md:py-8 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]/60' : 'bg-white'}`}>
      <div className="container mx-auto max-w-3xl">
        <CountdownTimer isDark={isDark} />
      </div>
    </section>
  );
};

const ContactSection = ({ isDark }) => {
  const sortedLinks = useMemo(() => {
    const primary = SOCIAL_LINKS.find(l => l.isPrimary);
    const phone = SOCIAL_LINKS.find(l => l.isPhone);
    const others = SOCIAL_LINKS.filter(l => !l.isPrimary && !l.isPhone);
    return [primary, ...others, phone].filter(Boolean);
  }, []);

  return (
    <section id="contact" className={`py-4 sm:py-6 md:py-8 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]/60' : 'bg-white'}`}>
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
          viewport={{ once: true }}
          className="text-center mb-3 sm:mb-4"
        >
          <h2 className={`text-lg sm:text-xl md:text-2xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            تواصل <span className="text-blue-400">مع مستر محمد رضوان</span>
          </h2>
          <p className={`text-[10px] sm:text-xs max-w-2xl mx-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            تابعنا على منصات التواصل، أو تواصل مباشرة مع المستر.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {sortedLinks.map((link, index) => (
            <SocialCard key={link.id} link={link} index={index} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          viewport={{ once: true }}
          className={`mt-3 sm:mt-4 p-3 sm:p-4 rounded-xl border text-center ${
            isDark ? 'bg-white/8 border-white/10' : 'bg-white/70 border-gray-200/40'
          } backdrop-blur-sm`}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-1">
              <Icons.MessageCircle className="h-4 w-4 sm:h-5 sm:w-5 text-blue-400" />
            </div>
            <p className={`text-[9px] sm:text-[10px] leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'} font-arabic`}>
              عن أبي سعيدٍ الخدري رضي الله عنه عن رسول الله صلى الله عليه وسلم قال:
            </p>
            <p className={`text-[10px] sm:text-xs md:text-sm font-bold leading-relaxed mt-0.5 sm:mt-1 ${isDark ? 'text-blue-300' : 'text-blue-700'} font-arabic`}>
              "سيأتيكم أقوامٌ يطلبون العلم، فإذا رأيتموهم فقولوا لهم: مرحبًا مرحبًا بوصية رسول الله صلى الله عليه وسلم، واقْنُوهم"
            </p>
            <div className="flex justify-center gap-2 mt-1 text-[7px] sm:text-[8px] text-gray-400">
              <span>📖 صحيح</span>
              <span>•</span>
              <span>🤲 دعاء</span>
              <span>•</span>
              <span>💡 علم</span>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const FooterSection = ({ isDark }) => {
  return (
    <footer className={`${isDark ? 'bg-[#030812]/90 border-white/5' : 'bg-white/90 border-gray-200/40'} border-t py-3 sm:py-4 px-3 sm:px-4 backdrop-blur`}>
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="h-6 w-6 sm:h-7 sm:w-7 rounded-full overflow-hidden shadow-lg shadow-blue-400/20">
                <img src="/images/logo.png" alt="مستر محمد رضوان" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-sm sm:text-base font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                مستر محمد رضوان
              </h3>
            </div>
            <p className={`text-[9px] sm:text-[10px] max-w-md leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              منصة تعليمية متخصصة في تدريس اللغة الإنجليزية، نقدم تجربة تعلم مختلفة ومتطورة تجمع بين التقنية والتميز.
            </p>
            <div className="mt-1">
              <p className={`text-[7px] sm:text-[8px] ${isDark ? 'text-blue-400/30' : 'text-blue-600/30'} font-arabic tracking-wider`}>
                اللهم صل على سيدنا محمد
              </p>
            </div>
          </div>

          <div>
            <h4 className={`font-bold mb-1.5 text-[10px] sm:text-xs ${isDark ? 'text-white' : 'text-gray-900'}`}>روابط سريعة</h4>
            <ul className="space-y-1 text-[9px] sm:text-[10px]">
              <li><a href="#courses" className={`${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} transition`}>الكورسات</a></li>
              <li><a href="#features" className={`${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} transition`}>المميزات</a></li>
              <li><a href="#countdown" className={`${isDark ? 'text-gray-400 hover:text-yellow-400' : 'text-gray-500 hover:text-yellow-600'} transition`}>⏳المتبقي على امتحانات الثانوية العامة</a></li>
              <li><a href="#contact" className={`${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} transition`}>تواصل معنا</a></li>
            </ul>
          </div>
        </div>

        <div className={`flex justify-center mt-3 pt-2 border-t ${isDark ? 'border-white/5' : 'border-gray-200/40'}`}>
          <Link
            href="/assistant-login"
            className={`inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-1.5 rounded-full border-2 transition-all duration-300 hover:scale-105 text-[7px] sm:text-[9px] font-bold ${
              isDark
                ? 'border-green-400/20 text-green-400 hover:bg-green-400/10 hover:border-green-400/40'
                : 'border-green-400/20 text-green-600 hover:bg-green-400/10 hover:border-green-400/40'
            }`}
          >
            <Icons.UserCog className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            Teacher Assistant
          </Link>
        </div>

        {/* توقيع المبرمج – تصميم فريد */}
        <div className={`border-t ${isDark ? 'border-white/5' : 'border-gray-200/40'} mt-2 pt-2`}>
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            className="text-center relative"
          >
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-8 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-red-400/10 blur-xl rounded-full" />
            <p className="text-[7px] sm:text-[9px] font-mono tracking-wider flex items-center justify-center gap-1.5 flex-wrap relative z-10">
              <span className={isDark ? 'text-blue-400/40' : 'text-blue-400/60'}>⚡</span>
              <span className={isDark ? 'text-gray-400' : 'text-gray-500'}>Built with ❤️ by</span>
              <motion.span
                className={`font-bold transition-all duration-300 inline-block ${
                  isDark
                    ? 'text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-pink-400 to-purple-400'
                    : 'text-transparent bg-clip-text bg-gradient-to-r from-red-600 via-pink-600 to-purple-600'
                }`}
                style={{
                  textShadow: isDark
                    ? '0 0 30px rgba(244, 63, 94, 0.3)'
                    : '0 0 30px rgba(220, 38, 38, 0.2)',
                }}
                animate={{
                  backgroundPosition: ['0%', '100%', '0%'],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              >
                Nour El-Saeed
              </motion.span>
              <span className={isDark ? 'text-blue-400/20' : 'text-blue-400/30'}>•</span>
              <span className={`text-[6px] sm:text-[8px] ${isDark ? 'text-blue-400/30' : 'text-blue-400/40'}`}>
                Developer &amp; Designer
              </span>
            </p>
          </motion.div>
        </div>
      </div>
    </footer>
  );
};

// ================================================================
// 🏠 الصفحة الرئيسية – التجميع النهائي
// ================================================================

export default function Home() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [scrolled, setScrolled] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState({});
  const [loading, setLoading] = useState(true);
  const [scrollProgress, setScrollProgress] = useState(0);

  const { scrollY } = useScroll();

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 40);
      setShowBackToTop(scrollY > 350);
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      setScrollProgress(maxScroll > 0 ? scrollY / maxScroll : 0);
    };
    window.addEventListener('scroll', handleScroll);
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: coursesData, error: coursesError } = await supabase
          .from('courses')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(8);

        if (coursesError) throw coursesError;

        if (coursesData?.length) {
          const courseIds = coursesData.map(c => c.id);

          const { data: videosData, error: videosError } = await supabase
            .from('videos')
            .select('course_id')
            .in('course_id', courseIds)
            .eq('is_published', true);

          if (videosError) throw videosError;

          const videoCounts = {};
          videosData?.forEach(v => {
            videoCounts[v.course_id] = (videoCounts[v.course_id] || 0) + 1;
          });

          const { data: examsData, error: examsError } = await supabase
            .from('exams')
            .select('course_id')
            .in('course_id', courseIds)
            .eq('is_published', true);

          if (examsError) throw examsError;

          const examCounts = {};
          examsData?.forEach(e => {
            examCounts[e.course_id] = (examCounts[e.course_id] || 0) + 1;
          });

          const { data: booksData, error: booksError } = await supabase
            .from('books')
            .select('course_id')
            .in('course_id', courseIds)
            .eq('is_published', true);

          if (booksError) throw booksError;

          const bookCounts = {};
          booksData?.forEach(b => {
            bookCounts[b.course_id] = (bookCounts[b.course_id] || 0) + 1;
          });

          const coursesWithStats = coursesData.map(course => ({
            ...course,
            videos_count: videoCounts[course.id] || 0,
            exams_count: examCounts[course.id] || 0,
            books_count: bookCounts[course.id] || 0,
          }));

          setCourses(coursesWithStats);

          const teacherIds = [...new Set(coursesData.map(c => c.teacher_id).filter(Boolean))];
          if (teacherIds.length) {
            const { data: teachersData } = await supabase
              .from('profiles')
              .select('id, full_name')
              .in('id', teacherIds);
            if (teachersData) {
              const map = {};
              teachersData.forEach(t => map[t.id] = t);
              setTeachers(map);
            }
          }
        }
        setLoading(false);
      } catch (err) {
        console.error('Error fetching courses:', err);
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const headerBg = scrolled
    ? isDark
      ? 'bg-[#0a0e1a]/90 backdrop-blur-xl border-b border-white/5'
      : 'bg-white/90 backdrop-blur-xl border-b border-gray-200/30'
    : 'bg-transparent';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'} overflow-x-hidden transition-colors duration-500 antialiased`}>
      <ElegantBackground isDark={isDark} />

      <motion.div
        className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 origin-left"
        style={{ scaleX: scrollProgress }}
      />

      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-400 ${headerBg}`}>
        <div className="container mx-auto px-3 sm:px-4 py-1.5 sm:py-2 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 group">
            <div className="h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full overflow-hidden shadow-lg shadow-blue-400/20 group-hover:scale-105 transition duration-300">
              <img src="/images/logo.png" alt="مستر محمد رضوان" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-[10px] sm:text-xs md:text-sm font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                مستر محمد رضوان
              </h1>
              <p className={`text-[5px] sm:text-[6px] md:text-[7px] leading-none mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                منصة تعليمية متكاملة
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-3 text-[9px] sm:text-[10px] font-bold">
            {[
              { label: 'الكورسات', href: '#courses' },
              { label: 'المميزات', href: '#features' },
              { label: '⏳المتبقي على امتحانات الثانوية العامة', href: '#countdown' },
              { label: 'تواصل', href: '#contact' },
            ].map((item, i) => (
              <a
                key={i}
                href={item.href}
                className={`${isDark ? 'text-gray-300 hover:text-yellow-400' : 'text-gray-700 hover:text-yellow-600'} transition relative after:absolute after:bottom-0 after:right-0 after:w-0 after:h-0.5 after:bg-yellow-400 after:transition-all hover:after:w-full ${item.label.includes('⏳') ? 'text-yellow-400 font-bold' : ''}`}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={toggleTheme}
              className="relative w-7 h-3.5 sm:w-8 sm:h-4 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 shadow-inner shadow-black/10 transition-all duration-500 hover:scale-105"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-white shadow-md transition-all duration-500 flex items-center justify-center text-[5px] sm:text-[6px] ${
                  isDark ? 'translate-x-[14px] sm:translate-x-[17px]' : 'translate-x-0'
                }`}
              >
                {isDark ? '🌙' : '☀️'}
              </span>
            </button>

            <Link
              href="/login"
              className={`px-2 py-0.5 rounded-full text-[7px] sm:text-[9px] lg:text-xs font-bold border-2 transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'border-blue-400/30 text-blue-400 hover:bg-blue-400/10'
                  : 'border-blue-400/30 text-blue-600 hover:bg-blue-400/10'
              } lg:px-3 lg:py-1`}
            >
              <Icons.LogIn className="h-2 w-2 sm:h-2.5 sm:w-2.5 inline ml-0.5" />
              تسجيل الدخول
            </Link>

            <Link
              href="/register"
              className="px-2 py-0.5 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold shadow-lg shadow-blue-500/30 hover:scale-105 transition-all duration-300 flex items-center gap-0.5 text-[7px] sm:text-[9px] lg:text-xs lg:px-3 lg:py-1"
            >
              <Icons.UserPlus className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
              انشاء حساب
            </Link>
          </div>
        </div>
      </header>

      <HeroSection isDark={isDark} />
      <CoursesSection isDark={isDark} courses={courses} teachers={teachers} loading={loading} />
      <FeaturesSection isDark={isDark} />
      <CountdownSection isDark={isDark} />
      <ContactSection isDark={isDark} />
      <FooterSection isDark={isDark} />

      <ScrollToTopButton show={showBackToTop} onClick={scrollToTop} />

      <style jsx global>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 8s ease infinite;
          background-size: 200% 200%;
        }
        .line-clamp-1 {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .font-arabic {
          font-family: 'Scheherazade New', 'Amiri', serif;
        }
        .tracking-wider {
          letter-spacing: 0.05em;
        }
        .tracking-widest {
          letter-spacing: 0.1em;
        }
        .antialiased {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .tabular-nums {
          font-variant-numeric: tabular-nums;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
}