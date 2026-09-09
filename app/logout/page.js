'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useTheme } from '@/lib/hooks/useTheme';
import * as Icons from 'lucide-react';
import toast from 'react-hot-toast';

export default function LogoutPage() {
  const router = useRouter();
  const { theme, toggleTheme, styles } = useTheme();
  const [status, setStatus] = useState('pending'); // 'pending' | 'logging-out' | 'done'
  const timeoutRef = useRef(null);

  const handleLogout = async () => {
    setStatus('logging-out');

    try {
      // 1. تسجيل الخروج من Supabase (للمعلم والطالب)
      const { error } = await supabase.auth.signOut();
      if (error) console.warn('Sign-out error (may already be logged out):', error.message);

      // 2. تنظيف الجلسات المحلية للمساعدين
      sessionStorage.removeItem('assistantData');
      sessionStorage.removeItem('assistantPermissions');
      localStorage.removeItem('sb-access-token');
      localStorage.removeItem('sb-refresh-token');
      localStorage.removeItem('supabase.auth.token');
    } catch (err) {
      console.error('Logout cleanup error:', err);
    }

    setStatus('done');
    toast.success('تم تسجيل الخروج بنجاح');

    // التوجيه إلى الرئيسية بعد فترة قصيرة لإظهار الرسالة
    timeoutRef.current = setTimeout(() => {
      router.replace('/');
    }, 1500);
  };

  const handleCancel = () => {
    router.back();
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`min-h-screen flex items-center justify-center transition-colors duration-500 ${styles.bg} ${styles.text} relative overflow-hidden`}
      dir="rtl"
    >
      {/* خلفية زخرفية */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-gradient-to-br from-yellow-400/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-gradient-to-tl from-blue-400/10 to-transparent rounded-full blur-3xl" />
      </div>

      <AnimatePresence mode="wait">
        {status === 'done' ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="text-center p-8"
          >
            <motion.div
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
              className="text-6xl mb-6"
            >
              👋
            </motion.div>
            <h1 className={`text-3xl font-extrabold mb-2 ${styles.text}`}>تم تسجيل الخروج</h1>
            <p className={`${styles.subtext} text-sm`}>نتمنى لك يوماً سعيداً! سيتم توجيهك إلى الصفحة الرئيسية...</p>
          </motion.div>
        ) : (
          <motion.div
            key="prompt"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className={`max-w-md w-full mx-4 p-8 rounded-3xl border backdrop-blur-xl shadow-2xl ${
              styles.card
            } border-[var(--border-color)]`}
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 mb-4">
                <Icons.LogOut className="h-8 w-8 text-yellow-400" />
              </div>
              <h2 className={`text-2xl font-extrabold ${styles.text}`}>تسجيل الخروج</h2>
              <p className={`mt-2 text-sm ${styles.subtext}`}>
                هل أنت متأكد أنك تريد تسجيل الخروج؟ يمكنك العودة في أي وقت.
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleLogout}
                disabled={status === 'logging-out'}
                className="w-full py-3 px-6 rounded-xl bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold text-lg hover:scale-[1.02] transition disabled:opacity-70 disabled:cursor-wait flex items-center justify-center gap-2"
              >
                {status === 'logging-out' ? (
                  <>
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    جاري تسجيل الخروج...
                  </>
                ) : (
                  <>
                    <Icons.LogOut className="h-5 w-5" />
                    نعم، أريد الخروج
                  </>
                )}
              </button>

              <button
                onClick={handleCancel}
                disabled={status === 'logging-out'}
                className={`w-full py-3 px-6 rounded-xl border ${styles.border} ${styles.hover} transition font-semibold text-sm disabled:opacity-50`}
              >
                <Icons.ArrowRight className="h-4 w-4 inline ml-1" />
                العودة للصفحة السابقة
              </button>

              <button
                onClick={toggleTheme}
                className={`w-full py-2 rounded-xl text-xs ${styles.subtext} hover:bg-white/5 transition flex items-center justify-center gap-1`}
              >
                {theme === 'dark' ? (
                  <>
                    <Icons.Sun className="h-4 w-4 text-yellow-400" /> الوضع الفاتح
                  </>
                ) : (
                  <>
                    <Icons.Moon className="h-4 w-4 text-gray-600" /> الوضع الداكن
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}