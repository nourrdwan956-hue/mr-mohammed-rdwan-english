'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const handleHash = async () => {
      try {
        const hash = window.location.hash;
        console.log('🔑 الـ hash المستلم:', hash);

        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');
          const type = params.get('type');

          console.log('📦 access_token:', accessToken ? 'موجود' : 'غير موجود');
          console.log('📦 type:', type);

          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (error) {
              console.error('❌ خطأ في setSession:', error);
              setError('انتهت صلاحية الرابط أو أنه غير صالح. يرجى طلب رابط جديد.');
              setCheckingSession(false);
              return;
            }

            console.log('✅ تم تثبيت الجلسة بنجاح');
            setSessionReady(true);
            setCheckingSession(false);
            return;
          } else {
            console.warn('⚠️ الـ hash موجود لكن لا يحتوي على access_token');
            setError('الرابط غير صحيح. يرجى طلب رابط جديد.');
            setCheckingSession(false);
            return;
          }
        }

        console.log('🔄 لا يوجد hash، نحاول استعادة الجلسة الحالية...');
        const { data, error } = await supabase.auth.getSession();
        if (error || !data?.session) {
          console.error('❌ لا توجد جلسة صالحة:', error);
          setError('لا توجد جلسة صالحة. يرجى طلب رابط جديد لإعادة تعيين كلمة المرور.');
          setCheckingSession(false);
        } else {
          console.log('✅ تم استعادة الجلسة الحالية');
          setSessionReady(true);
          setCheckingSession(false);
        }
      } catch (err) {
        console.error('❌ خطأ غير متوقع:', err);
        setError('حدث خطأ أثناء التحقق من الجلسة. حاول مرة أخرى.');
        setCheckingSession(false);
      }
    };

    handleHash();
  }, []);

  useEffect(() => {
    if (!checkingSession && !sessionReady && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`🔄 محاولة إعادة التحقق #${retryCount + 1}`);
        setRetryCount(prev => prev + 1);
        supabase.auth.getSession().then(({ data, error }) => {
          if (!error && data?.session) {
            console.log('✅ تم استعادة الجلسة في المحاولة المتأخرة');
            setSessionReady(true);
            setCheckingSession(false);
          }
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [checkingSession, sessionReady, retryCount]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        console.error('❌ فشل تحديث كلمة المرور:', updateError);
        throw updateError;
      }
      toast.success('✅ تم تغيير كلمة المرور بنجاح');
      router.push('/login');
    } catch (err) {
      console.error('❌ خطأ في updateUser:', err);
      setError(err.message || 'فشل تحديث كلمة المرور. تأكد من صحة الرابط أو حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a]">
        <motion.div
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white text-center"
        >
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto mb-4" />
          <p>جاري التحقق من الجلسة...</p>
        </motion.div>
      </div>
    );
  }

  if (error && !sessionReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a] px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 text-center"
        >
          <div className="text-6xl mb-4">🔒</div>
          <h2 className="text-2xl font-bold text-white mb-2">انتهت صلاحية الرابط</h2>
          <p className="text-gray-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push('/reset-password')}
            className="px-6 py-2.5 bg-yellow-400/20 text-yellow-400 rounded-xl hover:bg-yellow-400/30 transition"
          >
            طلب رابط جديد
          </button>
          <div className="mt-4">
            <Link href="/login" className="text-sm text-gray-500 hover:text-gray-400">
              العودة لتسجيل الدخول
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a] px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-emerald-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-[700px] h-[700px] bg-yellow-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-8">
          <div className="text-center mb-6">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center text-black font-extrabold text-2xl shadow-lg shadow-emerald-400/20"
            >
              <Icons.Key className="h-8 w-8" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-white mt-4">كلمة مرور جديدة</h1>
            <p className="text-gray-400 text-sm mt-1">أدخل كلمة المرور الجديدة لحسابك</p>
          </div>

          {error && sessionReady && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-red-400 text-sm bg-red-400/10 rounded-lg p-2 mb-4">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">كلمة المرور الجديدة</label>
              <div className="relative">
                <Icons.Lock className="absolute right-3 top-3 text-gray-500 h-5 w-5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                  required
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute left-3 top-3 text-gray-500 hover:text-gray-300">
                  {showPassword ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">تأكيد كلمة المرور</label>
              <div className="relative">
                <Icons.Lock className="absolute right-3 top-3 text-gray-500 h-5 w-5" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                  required
                  disabled={loading}
                />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute left-3 top-3 text-gray-500 hover:text-gray-300">
                  {showConfirm ? <Icons.EyeOff className="h-5 w-5" /> : <Icons.Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-black font-bold rounded-xl transition-all duration-300 shadow-lg shadow-emerald-400/20 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  جاري التحديث...
                </>
              ) : (
                <>
                  <Icons.Save className="h-5 w-5" />
                  حفظ كلمة المرور الجديدة
                </>
              )}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}