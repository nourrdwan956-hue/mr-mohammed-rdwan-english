'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { useEffect, useState, useRef } from 'react';

// ===== بيانات الكورسات =====
const coursesData = [
  {
    id: 1,
    title: 'جرامر الترم الأول',
    description: 'شرح كامل لقواعد اللغة الإنجليزية للترم الأول مع تدريبات وامتحانات تفاعلية.',
    price: 250,
    originalPrice: 350,
    level: 'ثانوية عامة',
    students: 180,
    rating: 4.9,
    badge: 'الأكثر طلباً',
    features: ['12 فيديو', '3 امتحانات', 'ملزمة تفاعلية'],
  },
  {
    id: 2,
    title: 'كلمات الترم الأول',
    description: 'أهم المفردات والكلمات مع جمل أمثلة وتمارين حفظ مبتكرة.',
    price: 100,
    originalPrice: 150,
    level: 'ثانوية عامة',
    students: 95,
    rating: 4.7,
    badge: 'عرض خاص',
    features: ['8 فيديو', 'قاموس تفاعلي', 'اختبارات أسبوعية'],
  },
  {
    id: 3,
    title: 'منهج ثانوية عامة (كامل)',
    description: 'المنهج كامل للثانوية العامة: جرامر، كلمات، قراءة، كتابة، استماع، ومحادثة.',
    price: 500,
    originalPrice: 700,
    level: 'ثانوية عامة',
    students: 320,
    rating: 4.9,
    badge: 'الأفضل قيمة',
    features: ['30 فيديو', '10 امتحانات', 'كتاب تفاعلي', 'بث مباشر أسبوعي'],
  },
  {
    id: 4,
    title: 'تأسيس اللغة (مبتدئ)',
    description: 'من الصفر إلى الاحتراف: الحروف، الأرقام، الجمل البسيطة، والمحادثات اليومية.',
    price: 200,
    originalPrice: 280,
    level: 'مبتدئ',
    students: 210,
    rating: 4.8,
    badge: 'للمبتدئين',
    features: ['15 فيديو', '5 اختبارات', 'كتاب تفاعلي'],
  },
  {
    id: 5,
    title: 'المحادثة والاستماع (متوسط)',
    description: 'تطوير مهارات الاستماع والتحدث عبر محادثات حقيقية وتمارين تفاعلية.',
    price: 180,
    originalPrice: 250,
    level: 'متوسط',
    students: 85,
    rating: 4.6,
    features: ['10 فيديو', '4 اختبارات', 'مكتبة صوتية'],
  },
  {
    id: 6,
    title: 'الكتابة والتعبير (متقدم)',
    description: 'إتقان الكتابة الأكاديمية والإبداعية مع تصحيح آلي وملاحظات.',
    price: 220,
    originalPrice: 300,
    level: 'متقدم',
    students: 60,
    rating: 4.8,
    badge: 'حصري',
    features: ['12 فيديو', '6 اختبارات', 'ملزمة كتابة'],
  },
];

// ===== بيانات المميزات (من المستند) =====
const featuresData = [
  {
    icon: Icons.Video,
    title: 'فيديوهات محمية',
    description: 'تشفير متقدم، بصمة مائية ديناميكية، ومنع التحميل لحماية محتواك.',
    badge: 'حصري',
  },
  {
    icon: Icons.Shield,
    title: 'امتحانات فائقة الأمان',
    description: 'متصفح مؤمن، مراقبة بالذكاء الاصطناعي، وكشف الخروج الفوري.',
    badge: 'مبتكر',
  },
  {
    icon: Icons.BookOpen,
    title: 'كتب رقمية تفاعلية',
    description: 'إضافة ملاحظات، فيديوهات مدمجة، وحماية ضد الطباعة والتحميل.',
  },
  {
    icon: Icons.Brain,
    title: 'المعلم الذكي (AI)',
    description: 'روبوت دردشة يجيب على أسئلتك بناءً على محتوى الأستاذ فقط 24/7.',
    badge: 'ذكاء اصطناعي',
  },
  {
    icon: Icons.Gamepad2,
    title: 'ألعاب وتحديات',
    description: 'نقاط، شخصيات افتراضية، ومسابقات أسبوعية على لوحة الشرف.',
  },
  {
    icon: Icons.BarChart,
    title: 'تحليلات معمقة',
    description: 'خريطة حرارة للفيديو، تقارير نقاط الضعف، ومقارنة الأداء.',
  },
  {
    icon: Icons.Play,
    title: 'بث مباشر تفاعلي',
    description: 'فصل افتراضي مع سبورة، رفع يد، استفتاءات، وغرف نقاش.',
  },
  {
    icon: Icons.Megaphone,
    title: 'نظام تسويق مدمج',
    description: 'كوبونات، اشتراكات، صفحة هبوط احترافية، وبوابات دفع متعددة.',
  },
];

// ===== بيانات آراء الطلاب =====
const testimonialsData = [
  {
    id: 1,
    name: 'أحمد خالد',
    role: 'طالب ثانوية عامة',
    content: 'منصة غيرت طريقة تعلمي للغة الإنجليزية. الفيديوهات واضحة والامتحانات آمنة جداً.',
    rating: 5,
    avatar: 'أ',
  },
  {
    id: 2,
    name: 'سارة علي',
    role: 'طالبة جامعية',
    content: 'المعلم الذكي ساعدني في أوقات متأخرة، والألعاب جعلت التعلم ممتعاً.',
    rating: 5,
    avatar: 'س',
  },
  {
    id: 3,
    name: 'يوسف حسن',
    role: 'طالب إعدادي',
    content: 'الكورسات منظمة، والكتب التفاعلية ساعدتني في المراجعة بسرعة. أفضل منصة.',
    rating: 5,
    avatar: 'ي',
  },
  {
    id: 4,
    name: 'ليلى محمد',
    role: 'طالبة جامعية',
    content: 'نظام المراقبة بالذكاء الاصطناعي رائع، يمنع الغش ويشعرني بالعدالة.',
    rating: 5,
    avatar: 'ل',
  },
  {
    id: 5,
    name: 'نور إبراهيم',
    role: 'طالبة متقدمة',
    content: 'البث المباشر التفاعلي جعل الحصص أكثر حيوية، والسبورة الرقمية ساعدت في الفهم.',
    rating: 5,
    avatar: 'ن',
  },
];

// ===== مكونات مساعدة =====
const CourseCard = ({ course, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.08, duration: 0.6 }}
    viewport={{ once: true }}
    whileHover={{ y: -12, scale: 1.01 }}
    className="group relative"
  >
    <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/10 to-purple-500/10 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
    <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden hover:border-yellow-400/60 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10">
      <div className="relative h-56 bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-yellow-400/30 backdrop-blur flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
            <Icons.Play className="h-10 w-10 text-yellow-400 ml-1" />
          </div>
        </div>
        {course.badge && (
          <div className="absolute top-4 right-4 bg-yellow-400/90 text-black text-xs font-bold px-4 py-1.5 rounded-full shadow-lg backdrop-blur border border-yellow-300/50">
            {course.badge}
          </div>
        )}
        <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-gray-300 border border-white/10">
          {course.level}
        </div>
        {course.originalPrice && (
          <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-gray-400 line-through">
            {course.originalPrice} ج.م
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-bold text-white group-hover:text-yellow-300 transition-colors duration-300">
            {course.title}
          </h3>
          <span className="text-2xl font-extrabold text-yellow-400">
            {course.price} <span className="text-sm font-normal text-gray-400">ج.م</span>
          </span>
        </div>
        <p className="text-gray-400 text-sm leading-relaxed mb-4 line-clamp-2">
          {course.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-yellow-400">
            <Icons.Star className="h-4 w-4 fill-yellow-400" />
            <span className="text-sm font-semibold">{course.rating}</span>
            <span className="text-gray-500 text-xs mx-1">•</span>
            <Icons.Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-400 text-sm">{course.students}</span>
          </div>
          <div className="flex gap-1">
            {course.features.slice(0, 2).map((feat, i) => (
              <span key={i} className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-gray-400 border border-white/5">
                {feat}
              </span>
            ))}
            {course.features.length > 2 && (
              <span className="text-[10px] bg-white/5 px-2 py-1 rounded-full text-gray-400 border border-white/5">
                +{course.features.length - 2}
              </span>
            )}
          </div>
        </div>
        <div className="mt-5 pt-4 border-t border-white/5 flex gap-3">
          <Link href={`/courses/${course.id}`} className="flex-1 text-center bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 text-sm font-semibold py-2.5 rounded-xl transition-colors duration-300">
            تفاصيل
          </Link>
          <Link href={`/enroll/${course.id}`} className="flex-1 text-center bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold py-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/20">
            اشترك الآن
          </Link>
        </div>
      </div>
    </div>
  </motion.div>
);

const FeatureCard = ({ feature, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, duration: 0.5 }}
    viewport={{ once: true }}
    whileHover={{ y: -8 }}
    className="group"
  >
    <div className="h-full bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8 text-center hover:border-yellow-400/60 transition-all duration-500 hover:bg-white/10 hover:shadow-2xl hover:shadow-yellow-400/10 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-yellow-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="relative z-10">
        <div className="inline-flex p-4 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 mb-5 group-hover:scale-110 transition-transform duration-300">
          <feature.icon className="h-10 w-10 text-yellow-400" strokeWidth={1.5} />
        </div>
        {feature.badge && (
          <span className="inline-block px-3 py-1 text-xs font-bold bg-yellow-400/20 text-yellow-300 rounded-full mb-3 border border-yellow-400/30">
            {feature.badge}
          </span>
        )}
        <h3 className="text-xl font-bold mb-3 text-white group-hover:text-yellow-300 transition-colors duration-300">
          {feature.title}
        </h3>
        <p className="text-gray-400 text-sm leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
          {feature.description}
        </p>
      </div>
    </div>
  </motion.div>
);

export default function Home() {
  // ===== حالات اللغة والثيم =====
  const [language, setLanguage] = useState('ar');
  const [theme, setTheme] = useState('dark');
  const [color, setColor] = useState('gold');
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [isColorMenuOpen, setIsColorMenuOpen] = useState(false);
  const heroRef = useRef(null);

  // ===== ألوان متعددة =====
  const colorOptions = [
    { name: 'ذهبي', value: 'gold', color: '#c9a84c' },
    { name: 'أزرق', value: 'blue', color: '#4a8fe0' },
    { name: 'أخضر', value: 'green', color: '#38b27a' },
    { name: 'أحمر', value: 'red', color: '#e05a5a' },
    { name: 'بنفسجي', value: 'purple', color: '#9b6bcc' },
  ];

  // ===== تأثيرات التمرير =====
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ===== دوال التنقل في آراء الطلاب =====
  const nextTestimonial = () => {
    setActiveTestimonial((prev) => (prev + 1) % testimonialsData.length);
  };
  const prevTestimonial = () => {
    setActiveTestimonial((prev) => (prev - 1 + testimonialsData.length) % testimonialsData.length);
  };

  // ===== تبديل اللغة =====
  const toggleLanguage = () => {
    setLanguage(language === 'ar' ? 'en' : 'ar');
  };

  // ===== تبديل الثيم =====
  const toggleTheme = () => {
    const themes = ['dark', 'light'];
    const currentIndex = themes.indexOf(theme);
    setTheme(themes[(currentIndex + 1) % themes.length]);
  };

  // ===== تغيير اللون =====
  const changeColor = (colorValue) => {
    setColor(colorValue);
    setIsColorMenuOpen(false);
  };

  // ===== نصوص متعددة اللغات =====
  const texts = {
    ar: {
      brand: 'محمد رضوان',
      subtitle: 'منصة تعليمية احترافية',
      navCourses: 'الكورسات',
      navFeatures: 'المميزات',
      navTestimonials: 'آراء الطلاب',
      navContact: 'اتصل بنا',
      navRegister: 'سجل الآن',
      heroBadge: 'منصة تعليمية متطورة 2026-2027',
      heroTitle: 'منصة محمد رضوان',
      heroDesc: 'تعلم الإنجليزية باحترافية مع أقوى نظام تعليمي تفاعلي، فيديوهات محمية، امتحانات آمنة، ومعلم ذكي يجاوبك 24/7.',
      heroBtn1: 'استعرض الكورسات',
      heroBtn2: 'اكتشف المميزات',
      statsStudents: 'طلاب',
      statsVideos: 'فيديو',
      statsRating: 'نسبة رضا',
      coursesTitle: 'كورسات محمد رضوان',
      coursesSub: 'اختر ما يناسبك من كورساتنا المتنوعة، واستمتع بتجربة تعلم فريدة.',
      coursesViewAll: 'عرض جميع الكورسات',
      featuresTitle: 'مميزات تجعلنا الأفضل',
      featuresSub: 'كل ما تحتاجه في مكان واحد، صمم خصيصاً ليكون الأكثر أماناً وتفاعلاً.',
      testimonialsTitle: 'آراء طلابنا',
      testimonialsSub: 'ما يقوله الطلاب عن تجربتهم مع منصة محمد رضوان.',
      ctaTitle: 'انضم إلى منصة محمد رضوان اليوم',
      ctaSub: 'احصل على تجربة تعلم استثنائية وكن الأفضل في لغتك مع أقوى نظام تعليمي في العالم العربي.',
      ctaBtn: 'ابدأ رحلتك الآن',
      ctaContact: 'تواصل معنا',
      footerAbout: 'منصة تعليمية متكاملة تجمع بين التقنية والتميز، لتعلم الإنجليزية بكل احترافية وأمان.',
      footerQuickLinks: 'روابط سريعة',
      footerSupport: 'الدعم',
      footerAboutUs: 'من نحن',
      footerTerms: 'الشروط والأحكام',
      footerPrivacy: 'سياسة الخصوصية',
      footerFAQ: 'الأسئلة الشائعة',
      footerRights: 'جميع الحقوق محفوظة. تصميم عربي متطور.',
      contactPhone1: '01552191172',
      contactPhone2: '01148553118',
      aboutUs: 'منصة محمد رضوان هي منصة تعليمية مصرية متخصصة في تدريس اللغة الإنجليزية، أسسها الأستاذ محمد رضوان بهدف تقديم تعليم عالي الجودة للطلاب في جميع المراحل الدراسية. نقدم محتوى تعليمي متكامل يشمل فيديوهات محمية، امتحانات آمنة، كتب تفاعلية، ومعلم ذكي يعمل بالذكاء الاصطناعي. نهدف إلى تمكين الطلاب من إتقان اللغة الإنجليزية بأسلوب عصري ومبتكر، مع توفير بيئة تعليمية آمنة ومحفزة.',
      terms: 'نرحب بكم في منصة محمد رضوان. باستخدامكم لهذه المنصة، فإنكم توافقون على الالتزام بالشروط والأحكام التالية: 1. جميع المحتويات المعروضة على المنصة هي ملكية فكرية للأستاذ محمد رضوان ولا يجوز نسخها أو توزيعها. 2. الاشتراكات المدفوعة غير قابلة للاسترداد بعد تفعيلها. 3. يتحمل الطالب مسؤولية الحفاظ على سرية بيانات حسابه. 4. يحق للمنصة إيقاف أي حساب يخالف قوانين الاستخدام. 5. الأسعار قابلة للتعديل وفقاً لتحديثات المحتوى.',
      privacy: 'نحن في منصة محمد رضوان نلتزم بحماية خصوصية بياناتك: 1. لا نقوم بمشاركة بياناتك الشخصية مع أي طرف ثالث. 2. نستخدم بياناتك فقط لتقديم الخدمات التعليمية وتحسين تجربتك. 3. يمكنك طلب حذف حسابك وبياناتك في أي وقت. 4. جميع المدفوعات تتم عبر بوابات دفع آمنة ومشفرة. 5. نحن نلتزم بمعايير حماية البيانات العالمية (GDPR) لحماية معلوماتك.',
    },
    en: {
      brand: 'Mohamed Radwan',
      subtitle: 'Professional Education Platform',
      navCourses: 'Courses',
      navFeatures: 'Features',
      navTestimonials: 'Testimonials',
      navContact: 'Contact',
      navRegister: 'Sign Up',
      heroBadge: 'Advanced Education Platform 2026-2027',
      heroTitle: 'Mohamed Radwan Platform',
      heroDesc: 'Learn English professionally with the most powerful interactive educational system, protected videos, secure exams, and an AI tutor available 24/7.',
      heroBtn1: 'Browse Courses',
      heroBtn2: 'Discover Features',
      statsStudents: 'Students',
      statsVideos: 'Videos',
      statsRating: 'Satisfaction',
      coursesTitle: 'Mohamed Radwan Courses',
      coursesSub: 'Choose from our diverse courses and enjoy a unique learning experience.',
      coursesViewAll: 'View All Courses',
      featuresTitle: 'Features That Make Us the Best',
      featuresSub: 'Everything you need in one place, designed to be the most secure and interactive.',
      testimonialsTitle: 'Our Students Say',
      testimonialsSub: 'What students say about their experience with Mohamed Radwan Platform.',
      ctaTitle: 'Join Mohamed Radwan Platform Today',
      ctaSub: 'Get an exceptional learning experience and become the best in your language with the strongest educational system in the Arab world.',
      ctaBtn: 'Start Your Journey',
      ctaContact: 'Contact Us',
      footerAbout: 'An integrated educational platform combining technology and excellence to learn English with professionalism and security.',
      footerQuickLinks: 'Quick Links',
      footerSupport: 'Support',
      footerAboutUs: 'About Us',
      footerTerms: 'Terms & Conditions',
      footerPrivacy: 'Privacy Policy',
      footerFAQ: 'FAQ',
      footerRights: 'All rights reserved. Advanced Arabic Design.',
      contactPhone1: '01552191172',
      contactPhone2: '01148553118',
      aboutUs: 'Mohamed Radwan Platform is an Egyptian educational platform specializing in teaching English, founded by Mr. Mohamed Radwan to provide high-quality education for students at all levels. We offer integrated educational content including protected videos, secure exams, interactive books, and an AI-powered smart tutor. We aim to empower students to master English in a modern and innovative way, providing a safe and stimulating learning environment.',
      terms: 'Welcome to Mohamed Radwan Platform. By using this platform, you agree to comply with the following terms: 1. All content displayed is the intellectual property of Mr. Mohamed Radwan and may not be copied or distributed. 2. Paid subscriptions are non-refundable after activation. 3. Students are responsible for maintaining the confidentiality of their account data. 4. The platform reserves the right to suspend any account that violates usage rules. 5. Prices are subject to change based on content updates.',
      privacy: 'At Mohamed Radwan Platform, we are committed to protecting your privacy: 1. We do not share your personal data with any third party. 2. We only use your data to provide educational services and improve your experience. 3. You can request to delete your account and data at any time. 4. All payments are processed through secure and encrypted payment gateways. 5. We comply with international data protection standards (GDPR) to safeguard your information.',
    },
  };

  const t = texts[language];

  // ===== ألوان الثيم =====
  const getThemeStyles = () => {
    const base = {
      dark: { bg: 'bg-[#0b0e1a]', text: 'text-white', card: 'bg-white/5', border: 'border-white/10' },
      light: { bg: 'bg-[#f5f7fa]', text: 'text-gray-900', card: 'bg-white/80', border: 'border-gray-200' },
    };
    return base[theme] || base.dark;
  };

  const themeStyles = getThemeStyles();

  // ===== ألوان مميزة =====
  const getColorClass = () => {
    const colors = {
      gold: 'from-yellow-400 to-yellow-600',
      blue: 'from-blue-400 to-blue-600',
      green: 'from-green-400 to-green-600',
      red: 'from-red-400 to-red-600',
      purple: 'from-purple-400 to-purple-600',
    };
    return colors[color] || colors.gold;
  };

  const colorClass = getColorClass();

  return (
    <div className={`min-h-screen ${themeStyles.bg} ${themeStyles.text} overflow-x-hidden transition-all duration-500 selection:bg-yellow-400/30 selection:text-black`}>
      
      {/* ===== شريط التنقل ===== */}
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? `${themeStyles.bg}/95 backdrop-blur-xl border-b ${themeStyles.border} shadow-2xl` : 'bg-transparent'}`}>
        <div className="container mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-11 w-11 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-black font-extrabold text-xl shadow-lg shadow-yellow-400/20`}>
              {language === 'ar' ? 'م' : 'M'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent leading-none">
                {t.brand}
              </h1>
              <p className="text-[10px] text-gray-500 leading-none mt-0.5">{t.subtitle}</p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-400">
            <Link href="#courses" className="hover:text-yellow-400 transition-colors duration-300 relative after:absolute after:bottom-0 after:right-0 after:w-0 after:h-0.5 after:bg-yellow-400 after:transition-all after:duration-300 hover:after:w-full">{t.navCourses}</Link>
            <Link href="#features" className="hover:text-yellow-400 transition-colors duration-300 relative after:absolute after:bottom-0 after:right-0 after:w-0 after:h-0.5 after:bg-yellow-400 after:transition-all after:duration-300 hover:after:w-full">{t.navFeatures}</Link>
            <Link href="#testimonials" className="hover:text-yellow-400 transition-colors duration-300 relative after:absolute after:bottom-0 after:right-0 after:w-0 after:h-0.5 after:bg-yellow-400 after:transition-all after:duration-300 hover:after:w-full">{t.navTestimonials}</Link>
            <Link href="#contact" className="hover:text-yellow-400 transition-colors duration-300 relative after:absolute after:bottom-0 after:right-0 after:w-0 after:h-0.5 after:bg-yellow-400 after:transition-all after:duration-300 hover:after:w-full">{t.navContact}</Link>
          </div>

          <div className="flex items-center gap-2">
            {/* ===== زر تبديل اللغة ===== */}
            <button onClick={toggleLanguage} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/20 hover:border-yellow-400/50 text-xs text-gray-300 hover:text-yellow-300 transition-all duration-300">
              <Icons.Globe className="h-4 w-4" />
              <span>{language === 'ar' ? 'English' : 'عربي'}</span>
            </button>

            {/* ===== زر تبديل الثيم ===== */}
            <button onClick={toggleTheme} className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/20 hover:border-yellow-400/50 text-xs text-gray-300 hover:text-yellow-300 transition-all duration-300">
              {theme === 'dark' ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
            </button>

            {/* ===== زر اختيار اللون ===== */}
            <div className="relative">
              <button 
                onClick={() => setIsColorMenuOpen(!isColorMenuOpen)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-full border border-white/20 hover:border-yellow-400/50 text-xs text-gray-300 hover:text-yellow-300 transition-all duration-300"
              >
                <Icons.Palette className="h-4 w-4" />
              </button>
              <AnimatePresence>
                {isColorMenuOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="absolute left-0 mt-2 p-3 bg-[#1a1f2e] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl flex gap-2 z-50"
                  >
                    {colorOptions.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => changeColor(c.value)}
                        className={`w-8 h-8 rounded-full transition-all duration-300 hover:scale-110 ${color === c.value ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1f2e]' : ''}`}
                        style={{ backgroundColor: c.color }}
                        title={c.name}
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Link href="/register" className={`px-5 py-2.5 bg-gradient-to-r ${colorClass} text-black font-bold rounded-full text-sm shadow-lg shadow-yellow-400/20 hover:scale-105 transition-all duration-300 hover:shadow-yellow-400/40`}>
              {t.navRegister}
            </Link>
          </div>
        </div>
      </header>

      {/* ===== القسم الترويجي (Hero) ===== */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center px-4 pt-24 overflow-hidden">
        {/* خلفية متحركة */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 -right-20 w-[700px] h-[700px] bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        </div>

        <div className="container mx-auto max-w-6xl text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-yellow-400/10 border border-yellow-400/20 text-yellow-300 text-sm mb-8 backdrop-blur-sm">
              <Icons.Sparkles className="h-4 w-4" />
              <span>{t.heroBadge}</span>
            </div>
            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.1] mb-6">
              <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
                {t.heroTitle}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed mb-8">
              {t.heroDesc}
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Link href="#courses" className={`inline-flex items-center gap-2 bg-gradient-to-r ${colorClass} text-black font-bold px-8 py-4 text-lg rounded-full shadow-2xl shadow-yellow-400/30 hover:scale-105 transition-all duration-300 hover:shadow-yellow-400/50`}>
                <Icons.Play className="h-5 w-5" />
                {t.heroBtn1}
              </Link>
              <Link href="#features" className="inline-flex items-center gap-2 px-8 py-4 text-lg rounded-full border-2 border-white/20 bg-white/5 backdrop-blur hover:bg-white/10 hover:border-yellow-400/50 transition-all duration-300">
                <Icons.Eye className="h-5 w-5" />
                {t.heroBtn2}
              </Link>
            </div>
            <div className="grid grid-cols-3 gap-8 max-w-2xl mx-auto">
              {[
                { icon: Icons.Users, value: '+15,000', label: t.statsStudents },
                { icon: Icons.Video, value: '+120', label: t.statsVideos },
                { icon: Icons.Award, value: '98%', label: t.statsRating },
              ].map((stat, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.1 }} className="text-center">
                  <stat.icon className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
                  <p className="text-3xl md:text-4xl font-extrabold text-yellow-400">{stat.value}</p>
                  <p className="text-gray-500 text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* سهم التمرير */}
        <motion.div animate={{ y: [0, -12, 0] }} transition={{ repeat: Infinity, duration: 2.5 }} className="absolute bottom-8 left-1/2 -translate-x-1/2">
          <div className="w-6 h-10 border-2 border-white/20 rounded-full flex justify-center backdrop-blur-sm">
            <div className="w-1.5 h-3 bg-yellow-400/60 rounded-full mt-2 animate-bounce" />
          </div>
        </motion.div>
      </section>

      {/* ===== قسم الكورسات ===== */}
      <section id="courses" className={`py-24 px-4 ${theme === 'dark' ? 'bg-gradient-to-b from-[#0b0e1a] to-[#131826]' : 'bg-gradient-to-b from-[#f5f7fa] to-[#e8ecf4]'}`}>
        <div className="container mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              {t.coursesTitle}
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.coursesSub}
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {coursesData.map((course, index) => (
              <CourseCard key={course.id} course={course} index={index} />
            ))}
          </div>
          <div className="text-center mt-14">
            <Link href="/all-courses" className="inline-flex items-center gap-2 px-8 py-4 text-lg rounded-full border-2 border-white/20 bg-white/5 backdrop-blur hover:bg-white/10 hover:border-yellow-400/50 transition-all duration-300">
              {t.coursesViewAll}
              <Icons.ArrowLeft className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ===== قسم المميزات ===== */}
      <section id="features" className={`py-24 px-4 ${theme === 'dark' ? 'bg-[#0b0e1a]' : 'bg-[#f5f7fa]'} relative overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-b from-yellow-400/5 via-transparent to-purple-500/5 pointer-events-none" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              {t.featuresTitle}
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.featuresSub}
            </p>
          </motion.div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuresData.map((feature, index) => (
              <FeatureCard key={index} feature={feature} index={index} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== قسم آراء الطلاب ===== */}
      <section id="testimonials" className={`py-24 px-4 ${theme === 'dark' ? 'bg-gradient-to-b from-[#131826] to-[#0b0e1a]' : 'bg-gradient-to-b from-[#e8ecf4] to-[#f5f7fa]'}`}>
        <div className="container mx-auto max-w-5xl">
          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              {t.testimonialsTitle}
            </h2>
            <p className={`text-lg max-w-2xl mx-auto ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              {t.testimonialsSub}
            </p>
          </motion.div>
          <div className="relative">
            <div className="overflow-hidden rounded-3xl">
              <motion.div
                className="flex transition-transform duration-700 ease-in-out"
                style={{ transform: `translateX(-${activeTestimonial * 100}%)` }}
              >
                {testimonialsData.map((t) => (
                  <div key={t.id} className="w-full flex-shrink-0 px-4">
                    <div className={`${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-white/80 border-gray-200'} backdrop-blur-xl border rounded-3xl p-10 md:p-12 text-center hover:border-yellow-400/30 transition-all duration-500`}>
                      <div className="flex justify-center gap-1 text-yellow-400 mb-6">
                        {[...Array(5)].map((_, i) => (
                          <Icons.Star key={i} className="h-5 w-5 fill-yellow-400" />
                        ))}
                      </div>
                      <blockquote className={`text-lg md:text-xl ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'} leading-relaxed max-w-2xl mx-auto`}>
                        "{t.content}"
                      </blockquote>
                      <div className="flex items-center justify-center gap-4 mt-8">
                        <div className={`h-14 w-14 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-black font-bold text-xl shadow-lg shadow-yellow-400/20`}>
                          {t.avatar}
                        </div>
                        <div className="text-right">
                          <p className={`font-bold text-lg ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.name}</p>
                          <p className="text-gray-500 text-sm">{t.role}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            </div>
            <div className="flex justify-center gap-4 mt-10">
              <button onClick={prevTestimonial} className="w-12 h-12 rounded-full border border-white/20 bg-white/5 backdrop-blur hover:bg-white/10 hover:border-yellow-400/50 transition-all duration-300 flex items-center justify-center">
                <Icons.ChevronRight className="h-5 w-5" />
              </button>
              <div className="flex gap-2 items-center">
                {testimonialsData.map((_, i) => (
                  <button key={i} onClick={() => setActiveTestimonial(i)} className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${i === activeTestimonial ? 'bg-yellow-400 w-8' : 'bg-white/20 hover:bg-white/40'}`} />
                ))}
              </div>
              <button onClick={nextTestimonial} className="w-12 h-12 rounded-full border border-white/20 bg-white/5 backdrop-blur hover:bg-white/10 hover:border-yellow-400/50 transition-all duration-300 flex items-center justify-center">
                <Icons.ChevronLeft className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== قسم من نحن / الشروط / الخصوصية ===== */}
      <section id="contact" className={`py-24 px-4 ${theme === 'dark' ? 'bg-[#0b0e1a]' : 'bg-[#f5f7fa]'} border-y border-white/5`}>
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* من نحن */}
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
              <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icons.Info className="h-6 w-6 text-yellow-400" />
                {t.footerAboutUs}
              </h3>
              <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} leading-relaxed`}>
                {t.aboutUs}
              </p>
              <div className="mt-6 space-y-2">
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
                  <Icons.Phone className="h-4 w-4 text-yellow-400" />
                  <span dir="ltr">{t.contactPhone1}</span>
                </p>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
                  <Icons.Phone className="h-4 w-4 text-yellow-400" />
                  <span dir="ltr">{t.contactPhone2}</span>
                </p>
                <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}>
                  <Icons.Mail className="h-4 w-4 text-yellow-400" />
                  <span>info@mohamedradwan.com</span>
                </p>
              </div>
            </motion.div>

            {/* الشروط والخصوصية */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Icons.FileText className="h-5 w-5 text-yellow-400" />
                    {t.footerTerms}
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed`}>
                    {t.terms}
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                    <Icons.Shield className="h-5 w-5 text-yellow-400" />
                    {t.footerPrivacy}
                  </h3>
                  <p className={`${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'} text-sm leading-relaxed`}>
                    {t.privacy}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ===== قسم الدعوة ===== */}
      <section className={`py-24 px-4 bg-gradient-to-r from-yellow-400/10 via-yellow-500/5 to-yellow-400/10 border-y border-white/5 ${theme === 'dark' ? '' : 'bg-white/5'}`}>
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6 }} viewport={{ once: true }}>
            <h2 className="text-4xl md:text-5xl font-extrabold mb-4">
              {t.ctaTitle}
            </h2>
            <p className={`text-lg max-w-2xl mx-auto mb-8 ${theme === 'dark' ? 'text-gray-300' : 'text-gray-700'}`}>
              {t.ctaSub}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link href="/register" className={`inline-flex items-center gap-2 bg-gradient-to-r ${colorClass} text-black font-bold px-10 py-5 text-lg rounded-full shadow-2xl shadow-yellow-400/30 hover:scale-105 transition-all duration-300 hover:shadow-yellow-400/50`}>
                <Icons.GraduationCap className="h-6 w-6" />
                {t.ctaBtn}
              </Link>
              <Link href="#contact" className="inline-flex items-center gap-2 px-8 py-5 text-lg rounded-full border-2 border-white/20 bg-white/5 backdrop-blur hover:bg-white/10 hover:border-yellow-400/50 transition-all duration-300">
                <Icons.MessageSquare className="h-5 w-5" />
                {t.ctaContact}
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== التذييل ===== */}
      <footer className={`${theme === 'dark' ? 'bg-[#080b16]' : 'bg-[#e8ecf4]'} border-t border-white/5 py-12 px-4`}>
        <div className="container mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-black font-extrabold text-lg shadow-lg shadow-yellow-400/20`}>
                  {language === 'ar' ? 'م' : 'M'}
                </div>
                <h3 className="text-xl font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">
                  {t.brand}
                </h3>
              </div>
              <p className={`${theme === 'dark' ? 'text-gray-500' : 'text-gray-600'} text-sm max-w-sm leading-relaxed`}>
                {t.footerAbout}
              </p>
              <div className="flex gap-4 mt-6">
                {['Facebook', 'YouTube', 'Instagram', 'WhatsApp'].map((social) => (
                  <a key={social} href="#" className={`h-10 w-10 rounded-full ${theme === 'dark' ? 'bg-white/5 border-white/10' : 'bg-gray-200 border-gray-300'} border flex items-center justify-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'} hover:text-yellow-400 hover:border-yellow-400/50 transition-all duration-300 hover:bg-white/10`}>
                    <span className="sr-only">{social}</span>
                    <div className="h-5 w-5 bg-current opacity-60" />
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h4 className={`font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.footerQuickLinks}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="#courses" className="hover:text-yellow-400 transition-colors">{t.navCourses}</Link></li>
                <li><Link href="#features" className="hover:text-yellow-400 transition-colors">{t.navFeatures}</Link></li>
                <li><Link href="#testimonials" className="hover:text-yellow-400 transition-colors">{t.navTestimonials}</Link></li>
                <li><Link href="#contact" className="hover:text-yellow-400 transition-colors">{t.navContact}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className={`font-bold mb-4 ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{t.footerSupport}</h4>
              <ul className="space-y-2 text-sm text-gray-500">
                <li><Link href="#" className="hover:text-yellow-400 transition-colors">{t.footerAboutUs}</Link></li>
                <li><Link href="#" className="hover:text-yellow-400 transition-colors">{t.footerTerms}</Link></li>
                <li><Link href="#" className="hover:text-yellow-400 transition-colors">{t.footerPrivacy}</Link></li>
                <li><Link href="#" className="hover:text-yellow-400 transition-colors">{t.footerFAQ}</Link></li>
              </ul>
            </div>
          </div>
          <div className={`border-t ${theme === 'dark' ? 'border-white/5' : 'border-gray-300'} mt-8 pt-8 text-center ${theme === 'dark' ? 'text-gray-600' : 'text-gray-500'} text-sm`}>
            &copy; 2026 {t.brand} - {t.footerRights}
          </div>
        </div>
      </footer>

      {/* ===== CSS مخصص ===== */}
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
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}