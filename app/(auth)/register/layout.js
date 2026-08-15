// app/(auth)/register/layout.js
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
  }, [pathname, steps]);

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  if (!mounted) {
    return (
      <div className={`min-h-screen w-full ${styles.bg} flex items-center justify-center`}>
        <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen w-full ${styles.bg} ${styles.text} relative overflow-hidden transition-colors duration-500`}>
      {/* خلفية موحدة (تأتي من الثيم) – بدون تدرج إضافي */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className={`absolute top-0 -left-20 w-[600px] h-[600px] rounded-full blur-3xl animate-pulse ${
          theme === 'dark' ? 'bg-yellow-400/10' : 'bg-yellow-300/20'
        }`} />
        <div className={`absolute bottom-0 -right-20 w-[700px] h-[700px] rounded-full blur-3xl animate-pulse delay-1000 ${
          theme === 'dark' ? 'bg-purple-500/8' : 'bg-purple-300/15'
        }`} />
      </div>

      {/* الهيدر – متجاوب */}
      <div className="container mx-auto px-3 sm:px-4 pt-3 sm:pt-4 flex items-center justify-between relative z-10">
        <Link href="/" className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition group">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.05 }}
            className="h-8 w-8 sm:h-10 sm:w-10 rounded-full overflow-hidden shadow-lg shadow-yellow-400/20"
          >
            <img src="/images/logo.png" alt="محمد رضوان" className="w-full h-full object-cover" />
          </motion.div>
          <div>
            <h1 className="text-sm sm:text-lg font-extrabold bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent leading-none">
              محمد رضوان
            </h1>
            <p className={`text-[8px] sm:text-[10px] ${styles.subtext} leading-none mt-0.5`}>منصة تعليمية</p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* زر اللغة */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleLanguage}
            className={`p-1.5 sm:p-2.5 rounded-xl ${styles.card} border ${styles.border} transition-all duration-300 hover:border-yellow-400/50`}
          >
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Icons.Globe className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.subtext}`} />
              <span className={`text-[10px] sm:text-xs font-medium ${styles.subtext}`}>
                {language === 'ar' ? 'EN' : 'AR'}
              </span>
            </div>
          </motion.button>

          {/* زر الثيم */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleTheme}
            className={`p-1.5 sm:p-2.5 rounded-xl ${styles.card} border ${styles.border} transition-all duration-300 hover:border-yellow-400/50`}
          >
            {theme === 'dark' ? (
              <Icons.Sun className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-400" />
            ) : (
              <Icons.Moon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-700" />
            )}
          </motion.button>

          {/* زر العودة */}
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Link
              href="/"
              className={`p-1.5 sm:p-2.5 rounded-xl ${styles.card} border ${styles.border} transition-all duration-300 hover:border-yellow-400/50 inline-block`}
            >
              <Icons.ArrowRight className={`h-4 w-4 sm:h-5 sm:w-5 ${styles.subtext}`} />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* شريط التقدم – متجاوب */}
      <div className="container mx-auto px-3 sm:px-4 pt-4 sm:pt-6 relative z-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex justify-between mb-1.5 relative">
            <div className="absolute top-4 sm:top-5 left-0 right-0 h-0.5 bg-gray-200 dark:bg-white/10 -z-10">
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
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-all duration-500 text-xs sm:text-base ${
                      isActive 
                        ? 'bg-yellow-400 text-black shadow-lg shadow-yellow-400/40' 
                        : isCurrent 
                          ? `border-2 border-yellow-400 ${styles.text} shadow-lg shadow-yellow-400/10` 
                          : `bg-white/5 border border-white/10 ${styles.subtext}`
                    }`}
                  >
                    <step.icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </motion.div>
                  <span className={`text-[8px] sm:text-[10px] mt-1 hidden sm:block font-medium transition-colors ${
                    isActive ? 'text-yellow-400' : styles.subtext
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
          <div className="w-full h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>
      </div>

      {/* المحتوى */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 relative z-10">
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

      {/* تذييل */}
      <div className="container mx-auto px-3 sm:px-4 py-3 text-center relative z-10">
        <span className={`text-[10px] sm:text-xs ${styles.subtext} opacity-60`}>
          © 2026 منصة محمد رضوان - جميع الحقوق محفوظة
        </span>
      </div>
    </div>
  );
}