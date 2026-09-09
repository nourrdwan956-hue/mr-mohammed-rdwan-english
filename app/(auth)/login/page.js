// app/(auth)/login/page.js
'use client';

import { Suspense } from 'react';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/hooks/useTheme';

// نصوص دينية
const DHIKR = [
  'سبحان الله وبحمده، سبحان الله العظيم',
  'اللهم صلِّ وسلم على نبينا محمد ﷺ',
  'لا إله إلا الله وحده لا شريك له',
  'سبحان الله، والحمد لله، ولا إله إلا الله، والله أكبر',
  'أستغفر الله العظيم وأتوب إليه',
  'اللهم إني أسألك علماً نافعاً ورزقاً طيباً وعملاً متقبلاً',
];

// ================================================================
// 🧩 مكون المحتوى الداخلي
// ================================================================

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom');
  const { theme, styles, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const [rememberMe, setRememberMe] = useState(true);
  const [currentDhikr, setCurrentDhikr] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDhikr(prev => (prev + 1) % DHIKR.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (redirectedFrom) {
      setError('يرجى تسجيل الدخول أولاً للوصول إلى هذه الصفحة');
    }
  }, [redirectedFrom]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('يرجى ملء جميع الحقول');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });

      if (signInError) {
        console.error('SignIn error:', signInError);
        if (signInError.message.includes('Invalid login credentials')) {
          setError('❌ البريد الإلكتروني أو كلمة المرور غير صحيحة');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('❌ يجب تأكيد البريد الإلكتروني أولاً. تحقق من صندوق الوارد');
        } else {
          setError(`❌ ${signInError.message}`);
        }
        setLoading(false);
        return;
      }

      if (data?.user) {
        const role = data.user.user_metadata?.role || 'student';
        const redirectPath = role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';
        setTimeout(() => {
          window.location.href = redirectPath;
        }, 500);
      } else {
        setError('❌ حدث خطأ غير متوقع. حاول مرة أخرى.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('❌ حدث خطأ في الاتصال بالخادم. حاول مرة أخرى.');
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Icons.Video,
      title: 'فيديوهات تعليمية عالية الجودة',
      desc: 'محتوى مسجل بدقة عالية مع شرح وافٍ لكل التفاصيل',
      color: isDark ? 'from-blue-500/20 to-blue-600/20 border-blue-500/30' : 'from-blue-100/80 to-blue-200/80 border-blue-300/50',
      iconColor: isDark ? 'text-blue-400' : 'text-blue-600',
      textColor: isDark ? 'text-white' : 'text-gray-800',
      descColor: isDark ? 'text-gray-300' : 'text-gray-600',
    },
    {
      icon: Icons.FileText,
      title: 'امتحانات تفاعلية وتصحيح فوري',
      desc: 'اختبر مستواك مع امتحانات ذكية وتصحيح آلي فوري',
      color: isDark ? 'from-purple-500/20 to-purple-600/20 border-purple-500/30' : 'from-purple-100/80 to-purple-200/80 border-purple-300/50',
      iconColor: isDark ? 'text-purple-400' : 'text-purple-600',
      textColor: isDark ? 'text-white' : 'text-gray-800',
      descColor: isDark ? 'text-gray-300' : 'text-gray-600',
    },
    {
      icon: Icons.Headphones,
      title: 'متابعة مستمرة مع المعلم',
      desc: 'تواصل مباشر مع معلمك للإجابة عن أسئلتك',
      color: isDark ? 'from-emerald-500/20 to-emerald-600/20 border-emerald-500/30' : 'from-emerald-100/80 to-emerald-200/80 border-emerald-300/50',
      iconColor: isDark ? 'text-emerald-400' : 'text-emerald-600',
      textColor: isDark ? 'text-white' : 'text-gray-800',
      descColor: isDark ? 'text-gray-300' : 'text-gray-600',
    },
    {
      icon: Icons.Award,
      title: 'شهادات معتمدة بعد الإتمام',
      desc: 'احصل على شهادة إلكترونية بعد إكمال كل كورس',
      color: isDark ? 'from-yellow-500/20 to-yellow-600/20 border-yellow-500/30' : 'from-yellow-100/80 to-yellow-200/80 border-yellow-300/50',
      iconColor: isDark ? 'text-yellow-400' : 'text-yellow-600',
      textColor: isDark ? 'text-white' : 'text-gray-800',
      descColor: isDark ? 'text-gray-300' : 'text-gray-600',
    },
  ];

  return (
    <div className={`min-h-screen flex ${styles.bg} transition-colors duration-300 relative overflow-hidden`}>
      {/* خلفية الجسيمات – تتغير حسب الوضع */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {isDark ? (
          <>
            <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute top-1/2 -right-20 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[100px] animate-pulse delay-1000" />
            <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] bg-blue-500/5 rounded-full blur-[130px] animate-pulse delay-2000" />
            <div className="absolute top-1/4 left-1/2 w-[300px] h-[300px] bg-yellow-400/5 rounded-full blur-[80px] animate-pulse delay-1500" />
          </>
        ) : (
          <>
            <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-yellow-200/30 rounded-full blur-[120px] animate-pulse" />
            <div className="absolute top-1/2 -right-20 w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[100px] animate-pulse delay-1000" />
            <div className="absolute bottom-0 left-1/3 w-[700px] h-[700px] bg-blue-200/15 rounded-full blur-[130px] animate-pulse delay-2000" />
            <div className="absolute top-1/4 left-1/2 w-[300px] h-[300px] bg-yellow-200/15 rounded-full blur-[80px] animate-pulse delay-1500" />
          </>
        )}
      </div>

      <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 min-h-screen">
        {/* ========== العمود الأيمن: نموذج تسجيل الدخول ========== */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="flex items-center justify-center p-4 md:p-8 order-2 md:order-1"
        >
          <div className={`w-full max-w-md ${styles.card} backdrop-blur-2xl border ${styles.border} rounded-3xl shadow-2xl shadow-yellow-400/5 p-8 relative transition-colors duration-300`}>
            {/* ✅ زر العودة للصفحة الرئيسية + تبديل الثيم */}
            <div className="absolute top-4 right-4 md:top-6 md:right-6 flex items-center gap-2">
              {/* زر تبديل الثيم */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 text-gray-300 hover:text-white"
                title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}
              >
                {isDark ? <Icons.Sun className="h-4 w-4" /> : <Icons.Moon className="h-4 w-4" />}
              </button>
              <Link
                href="/"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 transition-all duration-300 group text-sm text-gray-300 hover:text-white"
              >
                <Icons.ArrowRight className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                <span className="hidden sm:inline">الرئيسية</span>
              </Link>
            </div>

            {/* شعار المنصة */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-center mb-6"
            >
              <motion.div
                animate={{ scale: [1, 1.05, 1], rotate: [0, 1, -1, 0] }}
                transition={{ duration: 4, repeat: Infinity }}
                className={`mx-auto h-24 w-24 rounded-2xl ${styles.card} backdrop-blur-sm border ${styles.border} flex items-center justify-center shadow-2xl shadow-yellow-400/20 overflow-hidden`}
              >
                <img
                  src="/images/logo.png"
                  alt="محمد رضوان"
                  className="w-full h-full object-cover"
                />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className={`text-3xl font-extrabold ${styles.text} mt-4`}
              >
                مرحباً بعودتك
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className={`${styles.subtext} text-sm mt-1`}
              >
                سجل الدخول إلى منصة محمد رضوان للغة الإنجليزية
              </motion.p>
            </motion.div>

            {/* رسالة الخطأ */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10, height: 0 }}
                  animate={{ opacity: 1, y: 0, height: 'auto' }}
                  exit={{ opacity: 0, y: -10, height: 0 }}
                  className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl mb-4 flex items-start gap-2 backdrop-blur-sm"
                >
                  <Icons.AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* نموذج تسجيل الدخول */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <label className={`block text-sm font-semibold ${styles.text} mb-1.5 flex items-center gap-1.5`}>
                  <Icons.Mail className="h-4 w-4 text-yellow-400" />
                  البريد الإلكتروني
                </label>
                <div className={`relative transition-all duration-300 rounded-xl ${
                  focusedField === 'email' ? 'ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-400/10' : ''
                }`}>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onFocus={() => setFocusedField('email')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="example@email.com"
                    className={`w-full px-4 py-3 ${styles.card} border ${styles.border} rounded-xl ${styles.text} placeholder-gray-500 focus:outline-none transition-all`}
                    required
                    disabled={loading}
                  />
                  {focusedField === 'email' && (
                    <motion.div
                      layoutId="focus-bar"
                      className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
                    />
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 }}
              >
                <label className={`block text-sm font-semibold ${styles.text} mb-1.5 flex items-center gap-1.5`}>
                  <Icons.Lock className="h-4 w-4 text-yellow-400" />
                  كلمة المرور
                </label>
                <div className={`relative transition-all duration-300 rounded-xl ${
                  focusedField === 'password' ? 'ring-2 ring-yellow-400/50 shadow-lg shadow-yellow-400/10' : ''
                }`}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onFocus={() => setFocusedField('password')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="••••••••"
                    className={`w-full px-4 py-3 pr-11 ${styles.card} border ${styles.border} rounded-xl ${styles.text} placeholder-gray-500 focus:outline-none transition-all`}
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className={`absolute left-3 top-1/2 -translate-y-1/2 ${styles.subtext} hover:${styles.text} transition`}
                  >
                    {showPassword ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex items-center justify-between text-sm"
              >
                <label className={`flex items-center gap-2 cursor-pointer ${styles.subtext} hover:${styles.text} transition`}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={() => setRememberMe(!rememberMe)}
                    className="w-4 h-4 rounded accent-yellow-400 cursor-pointer"
                  />
                  تذكرني
                </label>
                <Link href="/reset-password" className="text-yellow-400 hover:text-yellow-300 transition font-medium">
                  نسيت كلمة المرور؟
                </Link>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 }}
              >
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold rounded-xl transition-all duration-300 shadow-xl shadow-yellow-400/20 hover:shadow-yellow-400/40 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      جاري الدخول...
                    </>
                  ) : (
                    <>
                      <Icons.LogIn className="h-5 w-5" />
                      تسجيل الدخول
                    </>
                  )}
                </button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className={`text-center text-sm ${styles.subtext} mt-2`}
              >
                ليس لديك حساب؟{' '}
                <Link href="/register" className="text-yellow-400 hover:text-yellow-300 font-semibold transition">
                  أنشئ حساباً الآن
                </Link>
              </motion.div>
            </form>

            {/* قسم الدعم الفني */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="mt-6 pt-6 border-t border-white/5"
            >
              <p className={`text-xs ${styles.subtext} text-center mb-3`}>تواصل مع الدعم الفني</p>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href="tel:01552191172"
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl ${styles.card} border ${styles.border} ${styles.subtext} text-sm hover:bg-white/10 transition group`}
                >
                  <Icons.Phone className="h-4 w-4 text-blue-400 group-hover:scale-110 transition" />
                  اتصال
                </a>
                <a
                  href="https://wa.me/201552191172"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-sm hover:bg-green-500/20 transition group"
                >
                  <Icons.MessageCircle className="h-4 w-4 group-hover:scale-110 transition" />
                  واتساب
                </a>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* ========== العمود الأيسر: محتوى جذاب وذكي ========== */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="hidden md:flex flex-col justify-center items-center p-8 order-1 md:order-2 relative"
        >
          <div className="text-center max-w-md w-full">
            {/* شعار كبير مع تأثير */}
            <motion.div
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className={`inline-flex p-6 rounded-3xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border border-yellow-400/30 backdrop-blur-xl mb-8 overflow-hidden`}
            >
              <img
                src="/images/logo.png"
                alt="محمد رضوان"
                className="h-20 w-20 object-cover"
              />
            </motion.div>

            <h2 className={`text-4xl font-extrabold ${styles.text} mb-2`}>
              منصة محمد رضوان
            </h2>
            <p className={`text-lg ${styles.subtext} mb-8`}>
              للغة الإنجليزية
            </p>

            {/* بطاقات المزايا */}
            <div className="space-y-4 mb-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6 + index * 0.15 }}
                  className={`bg-gradient-to-br ${feature.color} backdrop-blur-md border rounded-2xl p-4 flex items-center gap-4 text-right group hover:scale-[1.02] transition-all duration-300`}
                >
                  <div className={`p-3 rounded-xl bg-white/10 ${feature.iconColor}`}>
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`text-sm font-bold ${feature.textColor} mb-0.5`}>{feature.title}</h3>
                    <p className={`text-xs ${feature.descColor}`}>{feature.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* الذكر الدوار */}
            <div className="mb-4">
              <AnimatePresence mode="wait">
                <motion.p
                  key={currentDhikr}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 0.9, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.6 }}
                  className="text-xl font-bold text-yellow-400 font-arabic leading-relaxed"
                >
                  {DHIKR[currentDhikr]}
                </motion.p>
              </AnimatePresence>
            </div>

            {/* اقتباس تحفيزي */}
            <div className={`relative p-6 rounded-2xl ${styles.card} border ${styles.border} backdrop-blur-sm`}>
              <Icons.Quote className="absolute -top-3 -right-3 h-10 w-10 text-yellow-400/20" />
              <p className={`text-sm ${styles.subtext} italic leading-relaxed`}>
                "التعليم هو أقوى سلاح يمكنك استخدامه لتغيير العالم."
              </p>
              <p className="text-xs text-yellow-400 mt-2 font-semibold">نيلسون مانديلا</p>
            </div>
          </div>
        </motion.div>

        {/* النسخة المصغرة للجوال */}
        <div className="md:hidden col-span-1 px-4 pb-8 text-center order-3">
          <div className="grid grid-cols-2 gap-3 mb-4">
            {features.slice(0, 4).map((feature, index) => (
              <div
                key={index}
                className={`bg-gradient-to-br ${feature.color} backdrop-blur-md border rounded-xl p-3 text-center`}
              >
                <feature.icon className={`h-6 w-6 mx-auto mb-1 ${feature.iconColor}`} />
                <p className={`text-xs font-medium ${feature.textColor}`}>{feature.title}</p>
              </div>
            ))}
          </div>
          <div className="mb-4">
            <AnimatePresence mode="wait">
              <motion.p
                key={currentDhikr}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 0.9, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.6 }}
                className="text-lg font-bold text-yellow-400 font-arabic"
              >
                {DHIKR[currentDhikr]}
              </motion.p>
            </AnimatePresence>
          </div>
          <p className={`text-[10px] ${styles.subtext} mt-4`}>
            © 2026 منصة محمد رضوان - جميع الحقوق محفوظة
          </p>
        </div>
      </div>
    </div>
  );
}

// ================================================================
// 🏠 المكون الرئيسي – مع Suspense
// ================================================================

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0b0e1a] via-[#0f1225] to-[#0a0d18]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className="text-gray-400 text-sm">جاري التحميل...</p>
        </div>
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}