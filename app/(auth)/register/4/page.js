// app/(auth)/register/4/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { toast } from 'react-hot-toast';

// ================================================================
// 1. خلفية الجسيمات
// ================================================================
const ParticleBackground = ({ theme }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const particles = [];
    const particleCount = 80;
    const colors = theme === 'dark'
      ? ['rgba(255, 215, 0, 0.12)', 'rgba(255, 200, 0, 0.08)', 'rgba(255, 180, 0, 0.04)']
      : ['rgba(200, 180, 0, 0.06)', 'rgba(180, 160, 0, 0.04)', 'rgba(150, 130, 0, 0.02)'];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2.5 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.01,
      });
    }

    let animationId;
    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.pulse += p.pulseSpeed;
        if (p.x < 0 || p.x > width) p.dx *= -1;
        if (p.y < 0 || p.y > height) p.dy *= -1;
        const r = p.radius + Math.sin(p.pulse) * 0.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        particles.forEach((p2) => {
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const alpha = 0.05 * (1 - dist / 120);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = theme === 'dark'
              ? `rgba(255, 215, 0, ${alpha})`
              : `rgba(200, 180, 0, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });
      animationId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', handleResize);
    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ================================================================
// 2. شريط التقدم (مصغر على الهواتف)
// ================================================================
const ProgressBar = ({ currentStep, totalSteps = 5 }) => {
  const progress = (currentStep / totalSteps) * 100;
  return (
    <div className="w-full h-1 sm:h-1.5 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mb-4 sm:mb-6">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
      />
    </div>
  );
};

// ================================================================
// 3. نصائح ذكية (مصغرة على الهواتف)
// ================================================================
const SmartTips = ({ tips }) => {
  const [index, setIndex] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setIndex((prev) => (prev + 1) % tips.length), 5000);
    return () => clearInterval(interval);
  }, [tips.length]);

  return (
    <div className="flex items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-br from-yellow-400/10 to-yellow-600/5 dark:from-yellow-400/10 dark:to-yellow-600/5 border border-yellow-400/20 text-sm text-gray-700 dark:text-gray-300 transition-all duration-300 hover:shadow-lg hover:shadow-yellow-400/10 cursor-pointer">
      <div className="flex-shrink-0 p-1.5 sm:p-2 rounded-xl bg-yellow-400/20 dark:bg-yellow-400/20">
        <Icons.Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 dark:text-yellow-400" />
      </div>
      <div>
        <p className="text-[10px] sm:text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-0.5">💡 نصيحة ذكية</p>
        <AnimatePresence mode="wait">
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-xs sm:text-sm leading-relaxed"
          >
            {tips[index]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

// ================================================================
// 4. ✅ مكون إدخال OTP (مع LTR للخانات) – لوحة أرقام فقط
// ================================================================
const OtpInput = ({ value, onChange, error, onComplete }) => {
  const [otp, setOtp] = useState(value || ['', '', '', '', '', '']);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (value && value.length === 6) {
      setOtp(value.split(''));
    }
  }, [value]);

  const handleChange = (index, val) => {
    if (val.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = val.replace(/[^0-9]/g, '');
    setOtp(newOtp);
    onChange(newOtp.join(''));

    if (val && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newOtp.every((d) => d !== '') && onComplete) {
      onComplete(newOtp.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const newOtp = [...otp];
    pasted.split('').forEach((char, i) => {
      if (i < 6) newOtp[i] = char;
    });
    setOtp(newOtp);
    onChange(newOtp.join(''));
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  return (
    <div className="flex justify-center gap-2 sm:gap-3 mb-6" dir="ltr" onPaste={handlePaste}>
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          className={`w-11 h-13 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-bold bg-white/10 dark:bg-white/5 border-2 ${
            error ? 'border-red-400' : digit ? 'border-yellow-400' : 'border-gray-300 dark:border-white/20'
          } rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400 outline-none transition-all duration-300`}
          autoFocus={index === 0}
        />
      ))}
    </div>
  );
};

// ================================================================
// 5. الصفحة الرئيسية – الخطوة الرابعة (متجاوبة)
// ================================================================
export default function RegisterStep4() {
  const router = useRouter();
  const { theme, styles } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  const tips = [
    'تحقق من صندوق الوارد (Inbox) أو البريد المزعج (Spam)',
    'الرمز مكون من 6 أرقام ويُرسل إلى بريدك الإلكتروني',
    'الرمز صالح لمدة 5 دقائق فقط',
    'يمكنك طلب رمز جديد بعد 60 ثانية',
    'تأكد من كتابة الرقم بشكل صحيح',
  ];

  // التحقق من وجود بيانات الخطوات السابقة
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const saved = localStorage.getItem('registerData');
        if (!saved) {
          router.replace('/register');
          return;
        }
        const parsed = JSON.parse(saved);
        if (!parsed.firstName || !parsed.email) {
          router.replace('/register');
          return;
        }
        setUserEmail(parsed.email);
        setHasData(true);
        setIsLoading(false);
        sendOtp(parsed.email);
      } catch (err) {
        console.error('Error checking registration data:', err);
        router.replace('/register');
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [router]);

  // ===== إرسال OTP =====
  const sendOtp = async (email) => {
    if (!email) return;
    setIsSendingOtp(true);
    setError('');
    try {
      const savedData = localStorage.getItem('registerData');
      const studentData = savedData ? JSON.parse(savedData) : {};

      const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

      localStorage.setItem('otpData', JSON.stringify({
        email,
        otp: generatedOtp,
        expiresAt: Date.now() + 5 * 60 * 1000,
      }));

      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: generatedOtp,
          studentName: `${studentData.firstName || ''} ${studentData.secondName || ''} ${studentData.thirdName || ''} ${studentData.lastName || ''}`.trim(),
          phone: studentData.phone || 'غير مضاف',
          parentPhone: studentData.parentPhone || 'غير مضاف',
          school: studentData.school || 'غير مضاف',
          grade: studentData.grade || 'غير مضاف',
          governorate: studentData.governorate || 'غير مضاف',
        }),
      });

      if (!response.ok) throw new Error('فشل إرسال البريد');

      toast.success('✅ تم إرسال رمز التحقق إلى بريدك الإلكتروني');
      setTimer(60);
      setCanResend(false);
      const interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error('Error sending OTP:', err);
      setError('❌ فشل إرسال رمز التحقق، يرجى المحاولة مرة أخرى');
      toast.error('فشل إرسال رمز التحقق');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // ===== التحقق من OTP =====
  const verifyOtp = async (code) => {
    if (code.length < 6) {
      setError('يرجى إدخال الرمز المكون من 6 أرقام');
      return false;
    }

    setIsVerifying(true);
    setError('');

    try {
      const otpData = JSON.parse(localStorage.getItem('otpData') || '{}');
      if (!otpData.otp) {
        setError('لم يتم إرسال رمز بعد، يرجى طلب رمز جديد');
        return false;
      }

      if (Date.now() > otpData.expiresAt) {
        setError('انتهت صلاحية الرمز، يرجى طلب رمز جديد');
        return false;
      }

      if (otpData.otp !== code) {
        setError('❌ الرمز غير صحيح، يرجى المحاولة مرة أخرى');
        return false;
      }

      setSuccess(true);
      toast.success('✅ تم تأكيد الهوية بنجاح!');
      localStorage.removeItem('otpData');
      await new Promise((resolve) => setTimeout(resolve, 500));
      router.push('/register/5');
      return true;
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('حدث خطأ أثناء التحقق');
      return false;
    } finally {
      setIsVerifying(false);
    }
  };

  // ===== عند اكتمال كتابة OTP =====
  const handleOtpComplete = async (code) => {
    await verifyOtp(code);
  };

  // ===== إعادة الإرسال =====
  const handleResend = async () => {
    if (!canResend) return;
    await sendOtp(userEmail);
  };

  // ===== عرض حالة التحميل =====
  if (isLoading) {
    return (
      <div className={`min-h-screen w-full ${styles.bg} ${styles.text} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
          <p className={`text-xs sm:text-sm ${styles.subtext}`}>جاري التحقق من البيانات...</p>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return null;
  }

  return (
    <div key={theme} className={`min-h-screen w-full ${styles.bg} ${styles.text} relative overflow-hidden flex items-center justify-center p-3 sm:p-4`}>
      <ParticleBackground theme={theme} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* العنوان */}
        <div className="text-center mb-4 sm:mb-6">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex p-2.5 sm:p-3 rounded-2xl bg-yellow-400/10 dark:bg-yellow-400/10 mb-2 sm:mb-3"
          >
            <Icons.Shield className="h-6 w-6 sm:h-8 sm:w-8 text-yellow-500 dark:text-yellow-400" />
          </motion.div>
          <h2 className={`text-xl sm:text-2xl font-bold ${styles.text}`}>تأكيد الهوية</h2>
          <p className={`text-xs sm:text-sm ${styles.subtext} mt-0.5 sm:mt-1`}>
            أدخل الرمز المكون من 6 أرقام المرسل إلى بريدك الإلكتروني
          </p>
          <div className="mt-1.5 sm:mt-2 flex items-center justify-center gap-1.5 sm:gap-2">
            <Icons.Mail className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-yellow-400" />
            <span className={`text-xs sm:text-sm font-medium ${styles.text}`}>{userEmail}</span>
          </div>
          <div className="flex items-center justify-center gap-2 mt-1.5 text-[10px] sm:text-xs text-yellow-400">
            <Icons.ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>الخطوة 4 من 5</span>
          </div>
        </div>

        <ProgressBar currentStep={4} totalSteps={5} />

        <div className={`${styles.card} border ${styles.border} rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 shadow-2xl backdrop-blur-xl transition-all duration-500`}>
          {isSendingOtp ? (
            <div className="text-center py-8">
              <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin mx-auto" />
              <p className={`${styles.subtext} mt-3 text-sm`}>جاري إرسال رمز التحقق...</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); verifyOtp(otp); }}>
              {/* ✅ خانات OTP متجاوبة مع LTR – لوحة أرقام فقط */}
              <OtpInput
                value={otp}
                onChange={setOtp}
                error={error}
                onComplete={handleOtpComplete}
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="text-red-400 text-xs sm:text-sm text-center mb-4 bg-red-500/10 border border-red-500/30 rounded-xl py-2 px-4"
                  >
                    {error}
                  </motion.p>
                )}
                {success && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-400 text-xs sm:text-sm text-center mb-4 bg-green-500/10 border border-green-500/30 rounded-xl py-2 px-4"
                  >
                    ✅ تم التحقق بنجاح! جاري التوجيه...
                  </motion.p>
                )}
              </AnimatePresence>

              <div className="text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400 mb-4 sm:mb-6">
                {timer > 0 ? (
                  <span>إعادة الإرسال خلال <span className="font-bold text-yellow-400">{timer}</span> ثانية</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isSendingOtp}
                    className="text-yellow-600 dark:text-yellow-400 hover:underline font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSendingOtp ? 'جاري الإرسال...' : 'إعادة إرسال الرمز'}
                  </button>
                )}
              </div>

              <SmartTips tips={tips} />

              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => router.push('/register/3')}
                  className="order-2 sm:order-1 w-full sm:flex-1 py-3 sm:py-3.5 bg-white/10 dark:bg-white/5 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-white font-bold rounded-xl hover:bg-gray-100 dark:hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 text-sm sm:text-base"
                >
                  <Icons.ArrowRight className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>السابق</span>
                </button>
                <button
                  type="submit"
                  disabled={isVerifying || success || otp.length < 6}
                  className="order-1 sm:order-2 w-full sm:flex-1 py-3 sm:py-3.5 bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-yellow-400/20 hover:shadow-yellow-400/40 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed text-sm sm:text-base"
                >
                  {isVerifying ? (
                    <>
                      <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري التحقق...
                    </>
                  ) : success ? (
                    <>
                      <Icons.CheckCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      تم التحقق
                    </>
                  ) : (
                    <>
                      <span>تأكيد</span>
                      <Icons.ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="mt-4 sm:mt-6 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={() => router.push('/register/3')}
              className="text-yellow-600 dark:text-yellow-400 hover:underline font-medium transition-colors"
            >
              العودة إلى الخطوة السابقة
            </button>
          </div>
        </div>

        <div className="mt-3 sm:mt-4 text-center text-[10px] sm:text-xs text-gray-400 dark:text-gray-500">
          <span>🔒 جميع البيانات مشفرة • خطوة 4 من 5</span>
        </div>
      </motion.div>
    </div>
  );
}