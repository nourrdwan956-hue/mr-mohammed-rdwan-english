'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { signUp } from '@/lib/auth';
import { Mail, Lock, User, Phone, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (formData.password !== formData.confirmPassword) {
      setError('كلمة المرور غير متطابقة');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone,
        'student'
      );

      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
      setTimeout(() => {
        router.push('/dashboard/student');
      }, 2000);
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
            <CardTitle className="text-3xl font-extrabold text-white">انضم إلينا</CardTitle>
            <p className="text-gray-400 text-sm mt-2">أنشئ حسابك في منصة محمد رضوان</p>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="bg-green-500/10 border border-green-500/30 text-green-400 text-center px-4 py-6 rounded-xl">
                <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-400" />
                <p className="text-lg font-bold">تم إنشاء الحساب بنجاح!</p>
                <p className="text-sm mt-1">جاري تحويلك إلى لوحة التحكم...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}
                <div>
                  <Label htmlFor="fullName">الاسم الكامل</Label>
                  <div className="relative">
                    <User className="absolute right-3 top-3.5 h-5 w-5 text-gray-500" />
                    <Input
                      id="fullName"
                      type="text"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="محمد رضوان"
                      className="pr-11"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">البريد الإلكتروني</Label>
                  <div className="relative">
                    <Mail className="absolute right-3 top-3.5 h-5 w-5 text-gray-500" />
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="example@email.com"
                      className="pr-11"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="phone">رقم الهاتف</Label>
                  <div className="relative">
                    <Phone className="absolute right-3 top-3.5 h-5 w-5 text-gray-500" />
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="0123456789"
                      className="pr-11"
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
                      value={formData.password}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="pr-11"
                      required
                      minLength={6}
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
                <div>
                  <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
                  <div className="relative">
                    <Lock className="absolute right-3 top-3.5 h-5 w-5 text-gray-500" />
                    <Input
                      id="confirmPassword"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      placeholder="••••••••"
                      className="pr-11"
                      required
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold py-3.5 text-base rounded-xl hover:scale-[1.02] transition-all duration-300 shadow-lg shadow-yellow-400/20 disabled:opacity-70"
                >
                  {loading ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
                  <ArrowRight className="mr-2 h-5 w-5" />
                </Button>
                <p className="text-center text-sm text-gray-400 mt-4">
                  لديك حساب بالفعل؟{' '}
                  <Link href="/login" className="text-yellow-400 hover:text-yellow-300 font-semibold transition">
                    سجل الدخول
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}