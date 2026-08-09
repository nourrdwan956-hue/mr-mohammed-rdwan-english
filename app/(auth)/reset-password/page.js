// app/(auth)/reset-password/page.js
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import * as Icons from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!email.trim()) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }

    setLoading(true);

    try {
      // ✅ الرابط الأساسي للموقع من المتصفح (مضمون 100%)
      const appUrl = window.location.origin;
      const redirectTo = `${appUrl}/update-password`;

      console.log('📧 محاولة إرسال رابط الاستعادة إلى:', email.trim());
      console.log('🔗 رابط العودة:', redirectTo);

      // 🔹 المحاولة الأولى: استخدام Supabase Auth (قد يفشل إذا كانت إعدادات SMTP غير صحيحة)
      const { error: supabaseError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        { redirectTo }
      );

      // لو نجح Supabase، نعتبر المهمة تمت
      if (!supabaseError) {
        setSuccess(true);
        toast.success('✅ تم إرسال رابط الاستعادة إلى بريدك الإلكتروني');
        setLoading(false);
        return;
      }

      // 🔹 إذا فشل Supabase، نستخدم Resend عبر API الخاص بنا
      console.warn('⚠️ فشل Supabase reset، نحاول عبر Resend API:', supabaseError);

      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), redirectTo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'فشل إرسال البريد عبر الخدمة البديلة');
      }

      setSuccess(true);
      toast.success('✅ تم إرسال رابط الاستعادة بنجاح');
    } catch (err) {
      console.error('❌ فشل إرسال رابط الاستعادة:', err);
      setError(err.message || 'فشل إرسال رابط الاستعادة، تأكد من البريد الإلكتروني وحاول مرة أخرى');
      toast.error('❌ فشل إرسال الرابط');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a] px-4 relative overflow-hidden">
      {/* خلفية زجاجية مع تأثيرات */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-[700px] h-[700px] bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
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
              className="mx-auto h-16 w-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-extrabold text-2xl shadow-lg shadow-yellow-400/20"
            >
              <Icons.Lock className="h-8 w-8" />
            </motion.div>
            <h1 className="text-3xl font-extrabold text-white mt-4">نسيت كلمة المرور؟</h1>
            <p className="text-gray-400 text-sm mt-1">
              {success ? 'تم الإرسال! تحقق من بريدك' : 'أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور'}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {!success ? (
              <motion.form
                key="form"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleSubmit}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">البريد الإلكتروني</label>
                  <div className="relative">
                    <Icons.Mail className="absolute right-3 top-3 text-gray-500 h-5 w-5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="example@email.com"
                      className="w-full px-4 py-2.5 pr-11 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 transition-all"
                      required
                      disabled={loading}
                    />
                  </div>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-400 text-sm bg-red-400/10 rounded-lg p-2"
                  >
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-black font-bold rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/20 disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      جاري الإرسال...
                    </>
                  ) : (
                    <>
                      <Icons.Send className="h-5 w-5" />
                      إرسال رابط الاستعادة
                    </>
                  )}
                </button>

                <div className="text-center text-sm text-gray-400">
                  <Link href="/login" className="text-yellow-400 hover:underline">
                    العودة إلى تسجيل الدخول
                  </Link>
                </div>
              </motion.form>
            ) : (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4"
              >
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="text-6xl"
                >
                  📧
                </motion.div>
                <p className="text-gray-300 text-sm">
                  تم إرسال رابط الاستعادة إلى{' '}
                  <span className="text-yellow-400 font-bold">{email}</span>
                </p>
                <p className="text-xs text-gray-500">تفقد صندوق الوارد (والبريد غير المرغوب فيه أيضاً)</p>
                <Link
                  href="/login"
                  className="inline-block mt-4 px-6 py-2.5 bg-yellow-400/20 text-yellow-400 rounded-xl hover:bg-yellow-400/30 transition"
                >
                  العودة لتسجيل الدخول
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}