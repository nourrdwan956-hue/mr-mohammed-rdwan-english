'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { signIn } from '@/lib/auth';
import { Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }
      const userRole = data.user?.user_metadata?.role || 'student';
      if (userRole === 'teacher') {
        router.push('/dashboard/teacher');
      } else {
        router.push('/dashboard/student');
      }
    } catch (err) {
      setError('حدث خطأ غير متوقع. حاول مرة أخرى.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0b0e1a] px-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-yellow-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 -right-20 w-[700px] h-[700px] bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center text-black font-extrabold text-2xl shadow-lg shadow-yellow-400/20 mb-4">
              م
            </div>
            <CardTitle className="text-3xl font-extrabold text-white">مرحباً بعودتك</CardTitle>
            <p className="text-gray-400 text-sm mt-2">سجل الدخول إلى منصة محمد رضوان</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
              <div>
                <Label htmlFor="email">البريد الإلكتروني</Label>
                <div className="relative">
                  <Mail className="absolute right-3 top-3.5 h-5 w-5 text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="pr-11"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password">كلمة المرور</Label>
                <div className="relative">
                  <Lock className="absolute right-3 top-3.5 h-5 w-5 text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pr-11"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-3.5 text-gray-500 hover:text-gray-300 transition"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <Link href="/reset-password" className="text-yellow-400 hover:text-yellow-300 transition">
                  نسيت كلمة المرور؟
                </Link>
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold py-3.5 text-base rounded-xl hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-yellow-400/20 disabled:opacity-70"
              >
                {loading ? 'جاري الدخول...' : 'دخول'}
                <ArrowRight className="mr-2 h-5 w-5" />
              </Button>
              <p className="text-center text-sm text-gray-400 mt-4">
                ليس لديك حساب؟{' '}
                <Link href="/register" className="text-yellow-400 hover:text-yellow-300 font-semibold transition">
                  أنشئ حساباً الآن
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}