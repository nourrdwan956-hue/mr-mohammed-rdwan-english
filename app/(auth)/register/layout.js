'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as Icons from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/hooks/useTheme';

export default function RegisterLayout({ children }) {
  const pathname = usePathname();
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();
  const [currentStep, setCurrentStep] = useState(1);
  const [mounted, setMounted] = useState(false);

  // ✅ حل مشكلة Hydration: تأخير التطبيق حتى تحميل العميل
  useEffect(() => {
    setMounted(true);
  }, []);

  const steps = [
    { id: 1, label: 'البيانات الأساسية', icon: Icons.User, path: '/register' },
    { id: 2, label: 'بيانات التواصل', icon: Icons.Phone, path: '/register/2' },
    { id: 3, label: 'البيانات التعليمية', icon: Icons.School, path: '/register/3' },
    { id: 4, label: 'تأكيد الهوية', icon: Icons.Shield, path: '/register/4' },
    { id: 5, label: 'إكمال التسجيل', icon: Icons.CheckCircle, path: '/register/5' },
  ];

  useEffect(() => {
    const current = steps.find(step => pathname === step.path);
    if (current) setCurrentStep(current.id);
  }, [pathname]);

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const isDark = theme === 'dark';

  // ✅ أنماط عالية التباين حسب الثيم
  const bgGradient = isDark 
    ? 'bg-gradient-to-br from-[#0b0e1a] via-[#111827] to-[#0b0e1a]'
    : 'bg-gradient-to-br from-gray-50 via-white to-gray-100';

  const cardBg = isDark 
    ? 'bg-white/5 backdrop-blur-xl border-white/10'
    : 'bg-white/80 backdrop-blur-xl border-gray-200/50';

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-300' : 'text-gray-700';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  // ✅ حالة تحميل لتجنب Hydration Mismatch
  if (!mounted) {
    return (
      <div className={`min-h-screen w-full ${isDark ? 'bg-[#0b0e1a]' : 'bg-gray-50'} flex items-center justify-center`}>
        <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${bgGradient} ${textPrimary} relative overflow-hidden transition-all duration-500`}>

      {/* ===== خلفية متحركة فاخرة ===== */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className={`absolute top-0 -left-20 w-[600px] h-[600px] rounded-full blur-3xl animate-pulse ${
          isDark ? 'bg-yellow-400/10' : 'bg-yellow-300/20'
        }`} />
        <div className={`absolute bottom-0 -right-20 w-[700px] h-[700px] rounded-full blur-3xl animate-pulse delay-1000 ${
          isDark ? 'bg-purple-500/8' : 'bg-purple-300/15'
        }`} />
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse delay-2000 ${
          isDark ? 'bg-blue-500/5' : 'bg-blue-300/10'
        }`} />
        
        {/* شبكة نقاط خلفية */}
        <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')]" />
      </div>

      {/* ===== الشريط العلوي ===== */}
      <div className="container mx-auto px-4 pt-4 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition group">
          {/* ✅ أيقونة الشعار الجديدة – استبدلت حرف "م" بالصورة */}
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="h-10 w-10 rounded-full overflow-hidden shadow-lg shadow-yellow-400/20"
          >
            <img
              src="/images/logo.png"
              alt="محمد رضوان"
              className="w-full h-full object-cover"
            />
          </motion.div>
          <div>
            <h1 className="text-lg font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent leading-none">
              محمد رضوان
            </h1>
            <p className={`text-[10px] ${textMuted} leading-none mt-0.5`}>منصة تعليمية احترافية</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          {/* زر اللغة */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleLanguage}
            className={`p-2.5 rounded-xl ${cardBg} border transition-all duration-300 hover:border-yellow-400/50`}
            aria-label="تبديل اللغة"
          >
            <div className="flex items-center gap-1.5">
              <Icons.Globe className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
              <span className={`text-xs font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {language === 'ar' ? 'EN' : 'AR'}
              </span>
            </div>
          </motion.button>

          {/* ✅ زر تبديل الثيم – مع suppressHydrationWarning */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className={`p-2.5 rounded-xl ${cardBg} border transition-all duration-300 hover:border-yellow-400/50`}
            aria-label="تبديل الثيم"
            suppressHydrationWarning
          >
            {isDark ? (
              <Icons.Sun className="h-5 w-5 text-yellow-400" />
            ) : (
              <Icons.Moon className="h-5 w-5 text-gray-700" />
            )}
          </motion.button>

          {/* زر العودة */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Link
              href="/"
              className={`p-2.5 rounded-xl ${cardBg} border transition-all duration-300 hover:border-yellow-400/50 inline-block`}
              aria-label="العودة للمنصة"
            >
              <Icons.ArrowRight className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ===== شريط التقدم المحسّن ===== */}
      <div className="container mx-auto px-4 pt-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between mb-2 relative">
            {/* خط الاتصال بين النقاط */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-white/10 -z-10">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>

            {steps.map((step) => {
              const isActive = step.id <= currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <div key={step.id} className="flex flex-col items-center group">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-500 ${
                      isActive 
                        ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/40' 
                        : isCurrent 
                          ? `border-2 border-yellow-400 ${textPrimary} shadow-lg shadow-yellow-400/10` 
                          : `bg-white/5 border border-white/10 ${textMuted}`
                    }`}
                  >
                    <step.icon className="h-5 w-5" />
                  </motion.div>
                  <span className={`text-[10px] mt-1.5 hidden sm:block font-medium transition-colors ${
                    isActive ? 'text-yellow-400' : textMuted
                  }`}>
                    {step.label}
                  </span>
                  {isCurrent && (
                    <motion.span
                      layoutId="activeStep"
                      className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-yellow-400"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </div>
              );
            })}
          </div>
          <div className="w-full h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* ===== المحتوى ===== */}
      <div className="container mx-auto px-4 py-6 relative z-10">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="max-w-2xl mx-auto"
        >
          {children}
        </motion.div>
      </div>

      {/* ===== التذييل ===== */}
      <div className="container mx-auto px-4 py-4 text-center relative z-10">
        <span className={`text-xs ${textMuted} opacity-60`}>
          © 2026 منصة محمد رضوان - جميع الحقوق محفوظة
        </span>
      </div>
    </div>
  );
}