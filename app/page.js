// app/page.js
// ================================================================
// 🏛️ الصفحة الرئيسية – منصة مستر محمد رضوان
// نسخة متجاوبة بالكامل – مع تحجيم مثالي لجميع الأجهزة
// Teacher Assistant موجود في الفوتر فقط
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
// 📌 البيانات الثابتة – مميزات المنصة
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
// 🎁 العروض الترويجية
// ================================================================

const PROMO_THIRD_SECONDARY = {
  id: 'promo-third-secondary',
  title: 'عرض خاص لطلاب 3 ثانوي',
  subtitle: 'أعلى 3 طلاب في الامتحان الشامل = الترم التاني مجاني',
  description: 'لو أنت في 3 ثانوي وكنت معانا وحققت من أعلى الدرجات في الامتحان الشامل (اللي من 60) على منصتنا، الترم التاني والمراجعة النهائية هيكونوا مجانيين بالكامل لأعلى 3 طلاب. ربنا يوفقكم جميعاً.',
  cta: 'شارك الآن واحجز مكانك',
  ctaLink: 'https://wa.me/201552191172',
};

const PROMO_GENERAL = {
  id: 'promo-general',
  title: '🎯 الترم التاني مجاناً',
  subtitle: 'أعلى 3 طلاب يحققون أعلى الدرجات في امتحان الإنجليزي',
  description: 'لو أنت من أوائل الطلاب اللي حققوا أعلى الدرجات في امتحان اللغة الإنجليزية في الترم الأول، الكورس الخاص بالترم التاني هيكون مجاني ليك بالكامل. بس لأعلى 3 طلاب هيبعتوا نتائجهم على واتساب المستر.',
  cta: 'بادر بالمشاركة عشان تكون من الأعلى',
  ctaLink: 'https://wa.me/201552191172',
};

// ================================================================
// 🌐 روابط التواصل الاجتماعي (مع إضافة خانة الاتصال)
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
    url: 'tel:01552191172',
    color: 'bg-purple-500',
    textColor: 'text-purple-400',
    isPhone: true,
    phoneNumbers: ['01552191172', '01148553118'],
  },
];

// ================================================================
// 🎨 خلفية متطورة مع تأثيرات متحركة (مبسطة للجوال)
// ================================================================

const ElegantBackground = ({ isDark }) => {
  const [dots, setDots] = useState([]);
  const { scrollY } = useScroll();

  const y1 = useTransform(scrollY, [0, 1000], [0, -80]);
  const y2 = useTransform(scrollY, [0, 1000], [0, 60]);
  const scale = useTransform(scrollY, [0, 500], [1, 1.05]);

  useEffect(() => {
    // تقليل عدد النقاط على الجوال
    const count = window.innerWidth < 640 ? 25 : 60;
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
        className={`absolute top-[-40%] right-[-30%] w-[80%] h-[80%] rounded-full blur-3xl ${
          isDark ? 'bg-blue-500/10' : 'bg-blue-400/8'
        }`}
      />
      <motion.div
        style={{ y: y2 }}
        className={`absolute bottom-[-40%] left-[-30%] w-[70%] h-[70%] rounded-full blur-3xl ${
          isDark ? 'bg-green-500/10' : 'bg-green-400/8'
        }`}
      />

      {dots.length > 0 && (
        <div className="absolute inset-0 hidden sm:block">
          {dots.map((dot, i) => (
            <motion.div
              key={i}
              className={`absolute rounded-full ${
                isDark ? 'bg-blue-400/30' : 'bg-blue-400/20'
              }`}
              style={{
                top: `${dot.top}%`,
                left: `${dot.left}%`,
                width: dot.size,
                height: dot.size,
              }}
              animate={{
                opacity: [0.1, 0.8, 0.1],
                scale: [1, 2.5, 1],
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
    const handler = () => setVisible(window.scrollY < 100);
    window.addEventListener('scroll', handler);
    return () => window.removeEventListener('scroll', handler);
  }, []);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.5, duration: 0.8 }}
      className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 cursor-pointer z-20"
      onClick={() => document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' })}
    >
      <div className="flex flex-col items-center gap-2">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
          className="w-px h-10 sm:h-16 bg-gradient-to-b from-blue-400 to-transparent"
        />
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-blue-400/40 bg-white/5 backdrop-blur-xl flex items-center justify-center hover:border-blue-400/80 hover:scale-110 transition-all duration-300 group">
          <Icons.ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-400 group-hover:text-blue-300 transition-colors" />
        </div>
        <span className="text-[6px] sm:text-[7px] tracking-[0.3em] text-blue-400/40 font-light uppercase hidden sm:block">
          استكشف
        </span>
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
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 p-3 sm:p-4 rounded-full bg-gradient-to-r from-blue-500 to-green-500 text-white shadow-2xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 group"
      >
        <Icons.ChevronUp className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-y-0.5 transition-transform" />
      </motion.button>
    )}
  </AnimatePresence>
);

// ================================================================
// 🃏 بطاقة الكورس – تصميم متطور مع تأثيرات 3D
// ================================================================

const CourseCard = ({ course, teacher, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const router = useRouter();
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
      viewport={{ once: true }}
      whileHover={{ y: -6 }}
      className="group cursor-pointer perspective-1000"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => router.push(`/dashboard/student/courses/${course.id}`)}
    >
      <motion.div
        ref={cardRef}
        className={`relative overflow-hidden rounded-xl sm:rounded-2xl border transition-all duration-500 ${
          isDark
            ? 'bg-white/10 border-white/15 hover:border-blue-400/60'
            : 'bg-white/90 border-gray-200/60 hover:border-blue-400/70'
        } backdrop-blur-xl shadow-lg hover:shadow-xl hover:shadow-blue-400/20`}
        animate={{
          rotateX: isHovered ? 2 : 0,
          rotateY: isHovered ? 2 : 0,
          scale: isHovered ? 1.01 : 1,
        }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-400/10 via-transparent to-green-400/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

        <div className="relative h-36 sm:h-44 md:h-48 overflow-hidden">
          {course?.cover_image ? (
            <motion.img
              src={course.cover_image}
              alt={course.title}
              className="w-full h-full object-cover"
              animate={{ scale: isHovered ? 1.05 : 1 }}
              transition={{ duration: 0.5 }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-400/20 to-green-400/20">
              <Icons.BookOpen className="h-10 w-10 sm:h-14 sm:w-14 text-gray-500/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

          <div className="absolute top-2 right-2 flex flex-col gap-1">
            <motion.span
              className={`text-[8px] sm:text-[9px] px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-bold backdrop-blur-xl border border-white/20 ${
                course?.is_free
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
              whileHover={{ scale: 1.05 }}
            >
              {course?.is_free ? 'مجاني' : `${course?.price} ج.م`}
            </motion.span>
            {course?.is_published && (
              <span className="text-[8px] sm:text-[9px] px-2 py-0.5 sm:px-3 sm:py-1 rounded-full bg-blue-400 text-white font-bold backdrop-blur-xl border border-white/20">
                متاح
              </span>
            )}
          </div>

          <div className="absolute bottom-2 right-2 flex gap-1">
            <span className="text-[6px] sm:text-[7px] px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white/90 border border-white/10">
              {course?.grade_stage === 'primary' ? 'ابتدائي' :
               course?.grade_stage === 'middle' ? 'إعدادي' :
               course?.grade_stage === 'secondary' ? 'ثانوي' : 'عام'}
            </span>
            {course?.grade_level && (
              <span className="text-[6px] sm:text-[7px] px-1.5 py-0.5 rounded-full bg-black/70 backdrop-blur-sm text-white/90 border border-white/10">
                صف {course.grade_level}
              </span>
            )}
          </div>
        </div>

        <div className="p-3 sm:p-4">
          <h3 className={`text-sm sm:text-base font-bold mb-0.5 line-clamp-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {course?.title || 'كورس'}
          </h3>
          {teacher && (
            <p className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'} flex items-center gap-1 mb-1.5`}>
              <Icons.User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-blue-400" />
              {teacher.full_name}
            </p>
          )}
          <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed line-clamp-2 mb-2`}>
            {course?.description || 'لا يوجد وصف'}
          </p>
          <div className="flex items-center justify-between pt-2 border-t border-white/10">
            <div className="flex items-center gap-2 sm:gap-3 text-[9px] sm:text-[11px] text-gray-400">
              <span className="flex items-center gap-0.5 sm:gap-1">
                <Icons.Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {course?.subscription_duration_days || 30} يوم
              </span>
              <span className="flex items-center gap-0.5 sm:gap-1">
                <Icons.Monitor className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                {course?.max_devices || 2} جهاز
              </span>
            </div>
            <motion.span
              className={`text-[10px] sm:text-xs font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'} flex items-center gap-0.5`}
              whileHover={{ x: -4 }}
              transition={{ duration: 0.2 }}
            >
              {course?.is_free ? 'ابدأ مجاناً' : 'اشترك'}
              <Icons.ArrowLeft className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </motion.span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 🃏 بطاقة المميزات – مع تأثيرات hover متقدمة
// ================================================================

const FeatureCard = ({ feature, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.5 }}
      viewport={{ once: true }}
      whileHover={{ y: -4 }}
      className="group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`p-4 sm:p-5 rounded-xl border transition-all duration-400 ${
          isDark
            ? 'bg-white/10 border-white/15 hover:border-blue-400/50 hover:shadow-lg hover:shadow-blue-400/20'
            : 'bg-white/80 border-gray-200/50 hover:border-blue-400/60 hover:shadow-lg hover:shadow-blue-400/20'
        } backdrop-blur-xl relative overflow-hidden`}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-blue-400/15 via-transparent to-green-400/15"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.5 }}
        />

        <div className="flex items-start gap-3 relative z-10">
          <motion.div
            className={`flex-shrink-0 p-2.5 rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-30`}
            animate={{
              rotate: isHovered ? [0, 6, -6, 0] : 0,
              scale: isHovered ? 1.1 : 1,
            }}
            transition={{ duration: 0.4 }}
          >
            <feature.icon className={`h-4 w-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </motion.div>
          <div>
            <h3 className={`text-sm sm:text-base font-bold mb-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {feature.title}
            </h3>
            <p className={`text-xs sm:text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} leading-relaxed`}>
              {feature.description}
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 🃏 بطاقة التواصل – مع دعم خانة الأرقام
// ================================================================

const SocialCard = ({ link, index }) => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const isPrimary = link.isPrimary || false;
  const isPhone = link.isPhone || false;

  if (isPhone && link.phoneNumbers) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05, duration: 0.4 }}
        viewport={{ once: true }}
        whileHover={{ scale: 1.02, y: -3 }}
        className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
          isDark
            ? 'bg-white/10 border-white/15 hover:border-blue-400/50 hover:bg-white/15'
            : 'bg-white/80 border-gray-200/50 hover:border-blue-400/60 hover:bg-white/90'
        } backdrop-blur-xl`}
      >
        <div className={`p-2 rounded-xl ${link.color} bg-opacity-20 flex-shrink-0`}>
          <link.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${link.textColor}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} whitespace-nowrap`}>
            {link.label}
          </p>
          <div className="flex flex-col gap-0.5 mt-0.5">
            {link.phoneNumbers.map((phone, idx) => (
              <a
                key={idx}
                href={`tel:${phone}`}
                className={`text-[10px] sm:text-xs ${isDark ? 'text-gray-400 hover:text-blue-400' : 'text-gray-500 hover:text-blue-600'} transition font-mono`}
                dir="ltr"
              >
                {phone}
              </a>
            ))}
          </div>
        </div>
        <Icons.Phone className={`h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
      </motion.div>
    );
  }

  return (
    <motion.a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      viewport={{ once: true }}
      whileHover={{ scale: 1.02, y: -3 }}
      className={`flex items-center gap-3 p-3 sm:p-4 rounded-xl border transition-all duration-300 ${
        isPrimary
          ? isDark
            ? 'bg-blue-400/20 border-blue-400/50 hover:border-blue-400/80 hover:bg-blue-400/30'
            : 'bg-blue-400/20 border-blue-400/50 hover:border-blue-400/80 hover:bg-blue-400/30'
          : isDark
            ? 'bg-white/10 border-white/15 hover:border-blue-400/50 hover:bg-white/15'
            : 'bg-white/80 border-gray-200/50 hover:border-blue-400/60 hover:bg-white/90'
      } backdrop-blur-xl`}
    >
      <div className={`p-2 rounded-xl ${link.color} bg-opacity-20 flex-shrink-0`}>
        <link.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${link.textColor}`} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs sm:text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'} ${isPrimary ? 'text-blue-400' : ''} whitespace-nowrap`}>
          {link.label}
          {isPrimary && (
            <span className="mr-1 text-[7px] sm:text-[8px] bg-blue-400/30 text-blue-400 px-1 py-0.5 rounded-full whitespace-nowrap">
              رئيسي
            </span>
          )}
        </p>
        <p className={`text-[9px] sm:text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} truncate`}>
          {link.url.replace(/^https?:\/\//, '').replace(/\/.*$/, '')}
        </p>
      </div>
      <Icons.ExternalLink className={`h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
    </motion.a>
  );
};

// ================================================================
// 📐 أقسام الصفحة الرئيسية
// ================================================================

const HeroSection = ({ isDark }) => {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 60]);

  return (
    <section className="relative min-h-screen flex items-center justify-center px-3 sm:px-4 pt-20 sm:pt-24 md:pt-28 pb-10 sm:pb-16 overflow-hidden">
      <motion.div style={{ y }} className="container mx-auto max-w-5xl text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="mb-4 sm:mb-6"
          >
            <div className="inline-block px-4 py-1.5 sm:px-6 sm:py-2 rounded-full bg-blue-400/15 border border-blue-400/30 backdrop-blur-xl">
              <p className="text-[10px] sm:text-sm md:text-base text-blue-400 font-arabic tracking-wider">
                اللهم صل على سيدنا محمد
              </p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 sm:px-4 sm:py-2 rounded-full bg-blue-400/20 border border-blue-400/30 text-blue-400 text-[9px] sm:text-xs mb-4 sm:mb-6"
          >
            <Icons.Sparkles className="h-3 w-3 sm:h-4 sm:w-4 animate-pulse" />
            <span>تعلم اللغة الإنجليزية بطريقة مختلفة</span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-3 sm:mb-5 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
              مستر محمد رضوان
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className={`text-sm sm:text-base md:text-lg max-w-2xl mx-auto leading-relaxed mb-6 sm:mb-8 ${
              isDark ? 'text-gray-200' : 'text-gray-700'
            }`}
          >
            لو عايز تتعلم إنجليزي باحترافية، تفهم القواعد بسهولة، وتتكلم بثقة، فأنت في المكان الصح.
            هنا مش هتلاقي مجرد فيديوهات، هتلاقي نظام متكامل بيخليك تحب اللغة وتتقدم خطوة بخطوة مع متابعة شخصية من المستر.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.5 }}
            className="flex flex-wrap justify-center gap-3 sm:gap-4 mb-6 sm:mb-10"
          >
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="#courses"
              className="inline-flex items-center gap-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-full shadow-xl shadow-blue-500/50 hover:shadow-blue-500/70 transition-all duration-300 text-[11px] sm:text-sm"
            >
              <Icons.Play className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              شوف الكورسات
            </motion.a>
            <motion.a
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              href="#features"
              className={`inline-flex items-center gap-1.5 px-5 py-2.5 sm:px-7 sm:py-3.5 rounded-full border-2 transition-all duration-300 text-[11px] sm:text-sm font-bold ${
                isDark
                  ? 'border-blue-400/40 bg-white/5 hover:bg-white/10 hover:border-blue-400/70 text-white'
                  : 'border-blue-400/40 bg-white/50 hover:bg-white hover:border-blue-400/70 text-gray-900'
              }`}
            >
              <Icons.Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              شوف المميزات
            </motion.a>
          </motion.div>

          {/* عرض ترويجي – PROMO_GENERAL */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="max-w-2xl mx-auto"
          >
            <div
              className={`relative p-4 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border-2 ${
                isDark
                  ? 'bg-gradient-to-br from-blue-500/30 to-green-500/30 border-blue-400/60'
                  : 'bg-gradient-to-br from-blue-100/90 to-green-100/90 border-blue-400/70'
              } backdrop-blur-2xl shadow-xl shadow-blue-400/40 hover:shadow-blue-400/60 transition-all duration-500 overflow-hidden`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-400/15 via-transparent to-green-400/15 animate-pulse" />

              <div className="relative flex flex-col md:flex-row items-center gap-3 md:gap-4 text-center md:text-right">
                <motion.div
                  className="flex-shrink-0 p-3 rounded-full bg-gradient-to-br from-blue-400 to-green-400 shadow-lg shadow-blue-400/40"
                  animate={{
                    scale: [1, 1.05, 1],
                    rotate: [0, 3, -3, 0],
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                >
                  <Icons.Trophy className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-white" />
                </motion.div>

                <div className="flex-1">
                  <p className={`text-sm sm:text-base md:text-lg font-bold ${isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                    🎯 {PROMO_GENERAL.title}
                  </p>
                  <p className={`text-xs sm:text-sm md:text-base font-bold ${isDark ? 'text-green-300' : 'text-green-700'}`}>
                    {PROMO_GENERAL.subtitle}
                  </p>
                  <p className={`text-[10px] sm:text-xs md:text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-lg mx-auto md:mx-0 mt-1 leading-relaxed`}>
                    {PROMO_GENERAL.description}
                  </p>
                </div>

                <motion.a
                  href={PROMO_GENERAL.ctaLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-shrink-0 px-4 py-2 sm:px-5 sm:py-2.5 md:px-6 md:py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-xl shadow-green-500/40 hover:shadow-green-500/60 text-[10px] sm:text-xs md:text-sm flex items-center gap-1.5"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icons.MessageCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4" />
                  {PROMO_GENERAL.cta}
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
  if (loading) {
    return (
      <section className={`py-12 sm:py-20 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]' : 'bg-white'}`}>
        <div className="container mx-auto max-w-6xl text-center py-10 sm:py-20">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full mx-auto"
          />
          <p className={`text-xs sm:text-sm mt-3 sm:mt-4 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>جاري تحميل الكورسات...</p>
        </div>
      </section>
    );
  }

  return (
    <section id="courses" className={`py-12 sm:py-16 md:py-20 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]' : 'bg-white'}`}>
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            كورسات <span className="text-blue-400">مستر محمد رضوان</span>
          </h2>
          <p className={`text-sm sm:text-base max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            اختار الكورس المناسب ليك، وابدأ رحلة التعلم بخطوات مدروسة.
          </p>
        </motion.div>

        {courses.length === 0 ? (
          <div className="text-center py-10 sm:py-16">
            <Icons.BookOpen className="h-16 w-16 sm:h-20 sm:w-20 text-gray-600/20 mx-auto mb-3" />
            <h3 className={`text-lg sm:text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>مفيش كورسات متاحة حالياً</h3>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} text-xs sm:text-sm mt-1`}>هتنزل قريب جداً، تابعنا!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                teacher={teachers[course.teacher_id] || null}
                index={index}
              />
            ))}
          </div>
        )}

        {courses.length > 0 && (
          <div className="text-center mt-8 sm:mt-10">
            <Link
              href="/dashboard/student/courses"
              className={`inline-flex items-center gap-2 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm rounded-full border-2 transition-all duration-300 hover:scale-105 font-bold ${
                isDark
                  ? 'border-blue-400/40 bg-white/5 hover:bg-white/10 hover:border-blue-400/70 text-white'
                  : 'border-blue-400/40 bg-white/50 hover:bg-white hover:border-blue-400/70 text-gray-900'
              }`}
            >
              <Icons.ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              شوف كل الكورسات
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

const FeaturesSection = ({ isDark }) => {
  return (
    <section id="features" className={`py-12 sm:py-16 md:py-20 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]/80' : 'bg-white'}`}>
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            إيه اللي هتستفيده معانا؟
          </h2>
          <p className={`text-sm sm:text-base max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            نظام تعليمي متكامل مصمم عشان تتعلم بسهولة وتوصل لهدفك.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {PLATFORM_FEATURES.map((feature, index) => (
            <FeatureCard key={feature.id} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

const PromoSection = ({ isDark }) => {
  return (
    <section id="promo" className={`py-12 sm:py-16 md:py-20 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]' : 'bg-white'}`}>
      <div className="container mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          viewport={{ once: true }}
          className={`relative overflow-hidden rounded-xl sm:rounded-2xl p-6 sm:p-8 md:p-12 text-center border-2 border-blue-400/50 ${
            isDark ? 'bg-white/10' : 'bg-white/90'
          } backdrop-blur-2xl shadow-xl shadow-blue-400/20`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-400/20 via-transparent to-green-400/20 pointer-events-none" />
          <div className="relative z-10">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="inline-flex p-3 sm:p-4 rounded-full bg-blue-400/30 mb-4 sm:mb-5"
            >
              <Icons.Clock className="h-7 w-7 sm:h-8 sm:w-8 md:h-10 md:w-10 text-blue-400" />
            </motion.div>
            <h3 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {PROMO_THIRD_SECONDARY.title}
            </h3>
            <p className={`text-base sm:text-lg mb-1 ${isDark ? 'text-blue-300' : 'text-blue-700'} font-bold`}>
              {PROMO_THIRD_SECONDARY.subtitle}
            </p>
            <p className={`text-xs sm:text-sm max-w-lg mx-auto mb-4 sm:mb-5 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {PROMO_THIRD_SECONDARY.description}
            </p>
            <a
              href={PROMO_THIRD_SECONDARY.ctaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 sm:px-7 sm:py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold rounded-xl hover:from-green-600 hover:to-emerald-600 transition shadow-xl shadow-green-500/30 text-xs sm:text-sm"
            >
              <Icons.MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {PROMO_THIRD_SECONDARY.cta}
            </a>
            <p className={`text-[9px] sm:text-xs mt-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              * العرض لأعلى 3 طلاب يحققون أعلى الدرجات، ربنا يوفقكم جميعاً
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// ================================================================
// 📞 قسم التواصل – مع خانة الأرقام الجديدة والحديث الشريف
// ================================================================

const ContactSection = ({ isDark }) => {
  const sortedLinks = useMemo(() => {
    const primary = SOCIAL_LINKS.find(l => l.isPrimary);
    const phone = SOCIAL_LINKS.find(l => l.isPhone);
    const others = SOCIAL_LINKS.filter(l => !l.isPrimary && !l.isPhone);
    return [primary, ...others, phone].filter(Boolean);
  }, []);

  return (
    <section id="contact" className={`py-12 sm:py-16 md:py-20 px-3 sm:px-4 ${isDark ? 'bg-[#0a0e1a]/80' : 'bg-white'}`}>
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-8 sm:mb-12"
        >
          <h2 className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-2 sm:mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
            تواصل <span className="text-blue-400">مع مستر محمد رضوان</span>
          </h2>
          <p className={`text-sm sm:text-base max-w-2xl mx-auto ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            تابعنا على منصات التواصل، أو تواصل مباشرة مع المستر.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sortedLinks.map((link, index) => (
            <SocialCard key={link.id} link={link} index={index} />
          ))}
        </div>

        {/* حديث شريف */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className={`mt-6 sm:mt-8 p-4 sm:p-5 md:p-6 rounded-xl border text-center ${
            isDark ? 'bg-white/10 border-white/15' : 'bg-white/80 border-gray-200/50'
          } backdrop-blur-xl`}
        >
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-2 sm:mb-3">
              <Icons.MessageCircle className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 text-blue-400" />
            </div>
            <p className={`text-xs sm:text-sm leading-relaxed ${isDark ? 'text-gray-200' : 'text-gray-700'} font-arabic`}>
              عن أبي سعيدٍ الخدري رضي الله عنه عن رسول الله صلى الله عليه وسلم قال:
            </p>
            <p className={`text-sm sm:text-base md:text-lg font-bold leading-relaxed mt-1 sm:mt-2 ${isDark ? 'text-blue-300' : 'text-blue-700'} font-arabic`}>
              "سيأتيكم أقوامٌ يطلبون العلم، فإذا رأيتموهم فقولوا لهم: مرحبًا مرحبًا بوصية رسول الله صلى الله عليه وسلم، واقْنُوهم"
            </p>
            <div className="flex justify-center gap-3 mt-2 sm:mt-4 text-[9px] sm:text-xs text-gray-400">
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

// ================================================================
// 📌 FooterSection – مع زر Teacher Assistant واسم مبرمج واضح
// ================================================================

const FooterSection = ({ isDark }) => {
  return (
    <footer className={`${isDark ? 'bg-[#030812]/90 border-white/5' : 'bg-white/90 border-gray-200/50'} border-t py-8 sm:py-12 px-3 sm:px-4 backdrop-blur-xl`}>
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
              <div className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 rounded-full overflow-hidden shadow-lg shadow-blue-400/30">
                <img src="/images/logo.png" alt="مستر محمد رضوان" className="w-full h-full object-cover" />
              </div>
              <h3 className="text-base sm:text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                مستر محمد رضوان
              </h3>
            </div>
            <p className={`text-xs sm:text-sm max-w-md leading-relaxed ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              منصة تعليمية متخصصة في تدريس اللغة الإنجليزية، نقدم تجربة تعلم مختلفة ومتطورة تجمع بين التقنية والتميز.
            </p>
            <div className="mt-2 sm:mt-3">
              <p className={`text-[9px] sm:text-xs ${isDark ? 'text-blue-400/40' : 'text-blue-600/40'} font-arabic tracking-wider`}>
                اللهم صل على سيدنا محمد
              </p>
            </div>
          </div>

          <div>
            <h4 className={`font-bold mb-2 sm:mb-3 text-xs sm:text-sm ${isDark ? 'text-white' : 'text-gray-900'}`}>روابط سريعة</h4>
            <ul className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
              <li><a href="#courses" className={`${isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition font-medium`}>الكورسات</a></li>
              <li><a href="#features" className={`${isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition font-medium`}>المميزات</a></li>
              <li><a href="#promo" className={`${isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition font-medium`}>العروض</a></li>
              <li><a href="#contact" className={`${isDark ? 'text-gray-300 hover:text-blue-400' : 'text-gray-600 hover:text-blue-600'} transition font-medium`}>تواصل معنا</a></li>
            </ul>
          </div>
        </div>

        {/* ===== زر Teacher Assistant في الفوتر ===== */}
        <div className={`flex justify-center mt-6 sm:mt-8 pt-4 sm:pt-5 border-t ${isDark ? 'border-white/5' : 'border-gray-200/50'}`}>
          <Link
            href="/assistant-login"
            className={`inline-flex items-center gap-2 px-4 py-2 sm:px-5 sm:py-2.5 rounded-full border-2 transition-all duration-300 hover:scale-105 text-[10px] sm:text-xs font-bold ${
              isDark
                ? 'border-green-400/30 text-green-300 hover:bg-green-400/10 hover:border-green-400/60'
                : 'border-green-400/30 text-green-700 hover:bg-green-400/10 hover:border-green-400/60'
            }`}
          >
            <Icons.UserCog className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Teacher Assistant
          </Link>
        </div>

        {/* ===== خط فاصل فوق اسم المبرمج ===== */}
        <div className={`border-t ${isDark ? 'border-white/5' : 'border-gray-200/50'} mt-4 sm:mt-5 pt-4 sm:pt-5`}>
          <motion.div
            initial={{ opacity: 0.6 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 2, repeat: Infinity, repeatType: 'reverse' }}
            className="text-center"
          >
            <p className="text-[10px] sm:text-xs md:text-sm text-blue-400/50 font-mono tracking-widest">
              ⚡ Built with ❤️ by{' '}
              <span className="text-blue-400/80 font-extrabold hover:text-blue-400 transition-colors duration-300 text-xs sm:text-sm md:text-base">
                Nour El-Saeed
              </span>
              {' '}
              <span className="text-blue-400/30">•</span>
              {' '}
              <span className="text-blue-400/40 text-[8px] sm:text-[9px] md:text-[10px]">
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
// 🏠 الصفحة الرئيسية
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
      setScrolled(scrollY > 50);
      setShowBackToTop(scrollY > 400);
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
          .limit(6);

        if (coursesError) throw coursesError;

        if (coursesData?.length) {
          setCourses(coursesData);
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
          <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  const headerBg = scrolled
    ? isDark
      ? 'bg-[#0a0e1a]/95 backdrop-blur-2xl border-b border-white/5'
      : 'bg-white/95 backdrop-blur-2xl border-b border-gray-200/40'
    : 'bg-transparent';

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[#0a0e1a]' : 'bg-white'} ${isDark ? 'text-white' : 'text-gray-900'} overflow-x-hidden transition-colors duration-500 antialiased`}>
      <ElegantBackground isDark={isDark} />

      <motion.div
        className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-blue-400 via-cyan-400 to-green-400 origin-left"
        style={{ scaleX: scrollProgress }}
      />

      <header className={`fixed top-0 left-0 right-0 z-40 transition-all duration-500 ${headerBg}`}>
        <div className="container mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group">
            <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full overflow-hidden shadow-lg shadow-blue-400/30 group-hover:scale-105 transition duration-300">
              <img src="/images/logo.png" alt="مستر محمد رضوان" className="w-full h-full object-cover" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent leading-none">
                مستر محمد رضوان
              </h1>
              <p className={`text-[7px] sm:text-[8px] md:text-[9px] leading-none mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                منصة تعليمية متكاملة
              </p>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-5 text-xs sm:text-sm font-bold">
            {['الكورسات', 'المميزات', 'العروض', 'تواصل'].map((item, i) => (
              <a
                key={i}
                href={`#${['courses', 'features', 'promo', 'contact'][i]}`}
                className={`${isDark ? 'text-gray-200 hover:text-blue-400' : 'text-gray-700 hover:text-blue-600'} transition relative after:absolute after:bottom-0 after:right-0 after:w-0 after:h-0.5 after:bg-blue-400 after:transition-all hover:after:w-full`}
              >
                {item}
              </a>
            ))}
          </div>

          {/* ===== الأزرار في الهيدر ===== */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={toggleTheme}
              className="relative w-10 h-5 sm:w-11 sm:h-5.5 md:w-12 md:h-6 rounded-full bg-gradient-to-r from-blue-400 to-cyan-400 shadow-inner shadow-black/10 transition-all duration-500 hover:scale-105"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 sm:w-4.5 sm:h-4.5 md:w-5 md:h-5 rounded-full bg-white shadow-md transition-all duration-500 flex items-center justify-center text-[8px] sm:text-[9px] ${
                  isDark ? 'translate-x-[22px] sm:translate-x-[25px] md:translate-x-[28px]' : 'translate-x-0'
                }`}
              >
                {isDark ? '🌙' : '☀️'}
              </span>
            </button>

            <Link
              href="/login"
              className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full text-[9px] sm:text-xs font-bold border-2 transition-all duration-300 hover:scale-105 ${
                isDark
                  ? 'border-blue-400/40 text-blue-400 hover:bg-blue-400/10'
                  : 'border-blue-400/40 text-blue-600 hover:bg-blue-400/10'
              }`}
            >
              <Icons.LogIn className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline ml-1" />
              تسجيل الدخول
            </Link>

            <Link
              href="/register"
              className="px-3 py-1 sm:px-3.5 sm:py-1.5 md:px-4 md:py-1.5 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold rounded-full text-[9px] sm:text-xs shadow-xl shadow-blue-500/30 hover:scale-105 transition-all duration-300 flex items-center gap-0.5 sm:gap-1"
            >
              <Icons.UserPlus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              انشاء حساب جديد
            </Link>
          </div>
        </div>
      </header>

      <HeroSection isDark={isDark} />
      <CoursesSection isDark={isDark} courses={courses} teachers={teachers} loading={loading} />
      <FeaturesSection isDark={isDark} />
      <PromoSection isDark={isDark} />
      <ContactSection isDark={isDark} />
      <FooterSection isDark={isDark} />

      <ScrollToTopButton show={showBackToTop} onClick={scrollToTop} />

      <style jsx>{`
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
        .perspective-1000 {
          perspective: 1000px;
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
      `}</style>
    </div>
  );
}