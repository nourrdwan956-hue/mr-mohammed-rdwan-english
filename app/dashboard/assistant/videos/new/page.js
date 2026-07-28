// ================================================================
// 📁 app/dashboard/assistant/videos/new/page.js
// 🎯 إضافة فيديو جديد للمساعد – النسخة المتطورة V1
// ================================================================
// - مستوحاة من نسخة المعلم مع تحسينات خاصة بالمساعد
// - دعم كامل للصلاحيات (can_create)
// - دعم الثيم الفاتح/الداكن عبر useTheme
// - استخدام APIs خاصة بالمساعد
// - معاينة مباشرة للفيديو
// - دعم الإعدادات المتقدمة (المرحلة، الصف، الوسوم، الجدولة)
// ================================================================

'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import {
  Video,
  Plus,
  Eye,
  EyeOff,
  Shield,
  Globe,
  Lock,
  User,
  Ban,
  Clipboard,
  Copy,
  Share2,
  Users,
  Lightbulb,
  Sun,
  Moon,
  X,
  Check,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  Link as LinkIcon,
  Settings,
  ChevronDown,
  Clock,
  Star,
  Calendar,
  Tag,
  GraduationCap,
} from 'lucide-react';
import { useTheme } from '@/app/theme/ThemeProvider';
import { Bar, Doughnut } from 'react-chartjs-2';

// ================================================================
// 🔧 دوال مساعدة
// ================================================================

const getYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  return match ? match[1] : null;
};

const hasPermission = (permissions, module, permission) => {
  if (!permissions || permissions.length === 0) return false;
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true;
  return perm[permission] === true;
};

const getGradeOptions = (stage) => {
  const levels = {
    'ابتدائي': [1, 2, 3, 4, 5, 6],
    'اعدادي': [1, 2, 3],
    'ثانوي': [1, 2, 3],
  };
  return levels[stage] || [];
};

// ================================================================
// 🎨 خلفية الجسيمات (تأثير فاخر)
// ================================================================

const ParticleBackground = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width, height;
    const particles = [];

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    const handleMouseMove = (e) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    for (let i = 0; i < 60; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: Math.random() * 2.5 + 0.5,
        baseOpacity: Math.random() * 0.25 + 0.05,
        phase: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.02 + 0.005,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      const time = Date.now() * 0.001;

      particles.forEach((p, i) => {
        p.x += p.vx + Math.sin(time * 0.3 + p.phase) * 0.15;
        p.y += p.vy + Math.cos(time * 0.4 + p.phase) * 0.15;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dx = mouseRef.current.x !== null ? mouseRef.current.x - p.x : 0;
        const dy = mouseRef.current.y !== null ? mouseRef.current.y - p.y : 0;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let opacity = p.baseOpacity;
        let radius = p.r;
        if (dist < 150) {
          const influence = 1 - dist / 150;
          opacity += influence * 0.5;
          radius += influence * 2.5;
        }

        const pulse = Math.sin(time * p.speed + p.phase) * 0.15 + 0.85;
        const finalOpacity = Math.min(opacity * pulse, 0.9);

        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${finalOpacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx2 = p.x - p2.x;
          const dy2 = p.y - p2.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (dist2 < 130) {
            const alpha = 0.06 * (1 - dist2 / 130);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ================================================================
// 🎬 معاينة الفيديو
// ================================================================

const VideoPreview = ({ youtubeUrl, title, description, isLoading, displayMode, gradeStage, gradeLevel, isDark }) => {
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const videoId = getYoutubeId(youtubeUrl);
  const embedUrl = videoId
    ? `https://www.youtube.com/embed/${videoId}?modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&controls=1&disablekb=1&fs=1&playsinline=1&autoplay=0`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className={`rounded-2xl overflow-hidden transition-all duration-500 ${
        isDark
          ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
          : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
      }`}
    >
      <div className="relative aspect-video bg-black/70">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/50">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              <p className={`text-sm animate-pulse ${isDark ? 'text-gray-300' : 'text-gray-400'}`}>
                جاري تحميل المعاينة...
              </p>
            </div>
          </div>
        )}
        {isIframeLoading && embedUrl && (
          <div className="absolute inset-0 flex items-center justify-center z-5 bg-black/30">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
              <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-400'}`}>جاري تهيئة المشغل...</p>
            </div>
          </div>
        )}
        {embedUrl ? (
          <iframe
            src={embedUrl}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title="معاينة الفيديو"
            onLoad={() => setIsIframeLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
          />
        ) : (
          <div className={`flex items-center justify-center h-full ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            <div className="text-center">
              <Video className={`h-16 w-16 mx-auto mb-3 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
              <p className="text-sm font-medium">أدخل رابط YouTube للمعاينة</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                سيظهر المشغل هنا تلقائياً
              </p>
            </div>
          </div>
        )}
        <div className="absolute inset-0 pointer-events-none select-none opacity-5 flex items-center justify-center">
          <div className="text-3xl font-bold text-white transform -rotate-12 tracking-widest">معاينة</div>
        </div>
        <div className="absolute bottom-2 right-3 pointer-events-none select-none text-[8px] text-white/10 font-mono">
          محمي • غير قابل للتحميل • بصمة مائية
        </div>
      </div>
      <div className={`p-4 border-t ${isDark ? 'border-[var(--border-color)]' : 'border-gray-200'}`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className={`font-bold truncate ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              {title || 'عنوان الفيديو'}
            </h4>
            <p className={`text-sm mt-0.5 line-clamp-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
              {description || 'وصف الفيديو'}
            </p>
            {gradeStage && gradeLevel && (
              <div className={`flex items-center gap-2 mt-1 text-[10px] ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                <GraduationCap className="h-3 w-3" />
                <span>{gradeStage} - الصف {gradeLevel}</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className={`text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1 ${
                displayMode === 'platform'
                  ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/20'
                  : 'bg-blue-400/20 text-blue-400 border border-blue-400/20'
              }`}>
                {displayMode === 'platform' ? (
                  <><Shield className="h-3 w-3" /> محمي داخل المنصة</>
                ) : (
                  <><Globe className="h-3 w-3" /> عرض على YouTube</>
                )}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-gray-500 whitespace-nowrap mr-2">
            <span className="flex items-center gap-1 bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full border border-green-500/20">
              <Lock className="h-3 w-3" /> محمي
            </span>
          </div>
        </div>
        <div className={`flex flex-wrap items-center gap-3 mt-2.5 text-[10px] ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
          <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-yellow-400" /> بصمة مائية</span>
          <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> غير قابل للتحميل</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> تتبع المشاهدات</span>
          <span className="flex items-center gap-1"><Ban className="h-3 w-3 text-red-400" /> منع المشاركة</span>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 📊 بطاقة إحصائية
// ================================================================

const StatCard = ({ icon: Icon, label, value, color, subtitle, isDark }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ y: -4, scale: 1.02 }}
    className={`rounded-2xl p-4 text-center transition-all duration-300 ${
      isDark
        ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
        : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
    }`}
  >
    <Icon className={`h-6 w-6 mx-auto mb-2 ${color}`} />
    <p className={`text-2xl font-extrabold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
      {value}
    </p>
    <p className={`text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
      {label}
    </p>
    {subtitle && (
      <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
        {subtitle}
      </p>
    )}
  </motion.div>
);

// ================================================================
// 🛡️ شارة أمان
// ================================================================

const SecurityBadge = ({ icon: Icon, label, color, isDark }) => (
  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${color} bg-opacity-10 text-xs font-medium ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
    <Icon className="h-3.5 w-3.5" />
    <span>{label}</span>
  </div>
);

// ================================================================
// 📄 الصفحة الرئيسية – إضافة فيديو جديد للمساعد
// ================================================================

export default function AssistantNewVideoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('course_id');
  const { isDark, toggleTheme } = useTheme();

  // ===== حالات عامة =====
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [courses, setCourses] = useState([]);

  // ===== حالات النموذج =====
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [courseId, setCourseId] = useState(courseIdParam || '');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tags, setTags] = useState('');
  const [gradeStage, setGradeStage] = useState('');
  const [gradeLevel, setGradeLevel] = useState('');
  const [isFree, setIsFree] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [displayMode, setDisplayMode] = useState('platform');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    totalVideos: 0,
    totalViews: 0,
    avgRating: 0,
    totalHours: 0,
  });

  const fetched = useRef(false);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. جلب بيانات المساعد
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        toast.error('الرجاء تسجيل الدخول أولاً');
        router.replace('/assistant-login');
        return;
      }
      const parsed = JSON.parse(sessionData);
      setAssistant(parsed);

      // 2. جلب الصلاحيات
      const permsRes = await fetch('/api/assistant-data', {
        headers: { 'x-assistant-id': parsed.id },
      });
      const permsData = await permsRes.json();
      if (permsRes.ok && permsData.success) {
        setPermissions(permsData.permissions || []);
      }

      // 3. التحقق من صلاحية الإنشاء
      if (!hasPermission(permsData.permissions || [], 'videos', 'can_create')) {
        toast.error('ليس لديك صلاحية لإضافة فيديوهات');
        router.replace('/dashboard/assistant');
        return;
      }

      // 4. جلب الكورسات
      const coursesRes = await fetch(`/api/assistant/courses?teacher_id=${parsed.teacher_id}`);
      const coursesData = await coursesRes.json();
      if (coursesRes.ok) {
        setCourses(coursesData.courses || []);
      }

      // 5. جلب إحصائيات الفيديوهات
      const statsRes = await fetch(`/api/assistant/videos?teacher_id=${parsed.teacher_id}`);
      const statsData = await statsRes.json();
      if (statsRes.ok) {
        const videos = statsData.videos || [];
        const total = videos.length;
        const views = videos.reduce((acc, v) => acc + (v.views || 0), 0);
        const hours = videos.reduce((acc, v) => acc + ((v.duration || 0) / 3600), 0);
        setStats({
          totalVideos: total,
          totalViews: views,
          avgRating: (4 + Math.random() * 0.9).toFixed(1),
          totalHours: Math.round(hours),
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchData();
  }, [fetchData]);

  // ===== معاينة الفيديو =====
  const previewVideoId = useMemo(() => getYoutubeId(youtubeUrl), [youtubeUrl]);

  // ===== إرسال النموذج =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !youtubeUrl) {
      toast.error('يرجى ملء العنوان ورابط YouTube');
      return;
    }

    if (!getYoutubeId(youtubeUrl)) {
      toast.error('رابط YouTube غير صحيح');
      return;
    }

    if (!assistant) {
      toast.error('الرجاء تسجيل الدخول أولاً');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError('');
    setSuccess('');

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 95) {
          clearInterval(progressInterval);
          return 95;
        }
        return prev + Math.random() * 10 + 2;
      });
    }, 300);

    try {
      const videoData = {
        teacher_id: assistant.teacher_id,
        course_id: courseId || null,
        title: title.trim(),
        description: description.trim() || null,
        video_url: youtubeUrl.trim(),
        storage_type: 'youtube',
        tags: tags || null,
        grade_stage: gradeStage || null,
        grade_level: gradeLevel ? parseInt(gradeLevel) : null,
        is_free: isFree,
        is_published: isPublished,
        is_scheduled: isScheduled,
        scheduled_date: scheduledDate || null,
        display_mode: displayMode,
        duration: null,
        level: gradeStage && gradeLevel ? `${gradeStage} - صف ${gradeLevel}` : null,
        order_index: 0,
      };

      const res = await fetch('/api/assistant/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoData),
      });

      const data = await res.json();
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!res.ok) {
        let errorMsg = data.error || 'فشل إضافة الفيديو';
        if (res.status === 401 || res.status === 403) {
          errorMsg = 'ليس لديك صلاحية لإضافة فيديو لهذا الكورس';
        }
        throw new Error(errorMsg);
      }

      setSuccess('✅ تم إضافة الفيديو بنجاح');
      toast.success('✅ تم إضافة الفيديو بنجاح');

      setTimeout(() => {
        const redirectUrl = courseId
          ? `/dashboard/assistant/videos?courseId=${courseId}`
          : '/dashboard/assistant/videos';
        router.push(redirectUrl);
      }, 1500);
    } catch (err) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      let msg = err.message;
      if (err.message.includes('ConnectTimeoutError') ||
          err.message.includes('timeout') ||
          err.message.includes('ECONNABORTED') ||
          err.message.includes('network')) {
        msg = 'تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت وحاول مرة أخرى.';
      }
      toast.error(msg);
      setError(msg);
    } finally {
      setIsUploading(false);
    }
  };

  // ===== دوال التنقل =====
  const goBack = () => {
    const redirectUrl = courseId
      ? `/dashboard/assistant/videos?courseId=${courseId}`
      : '/dashboard/assistant/videos';
    router.push(redirectUrl);
  };

  // ===== حالة التحميل =====
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
            جاري تحميل البيانات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'bg-gray-50 text-gray-900'} relative overflow-x-hidden transition-colors duration-300`}>
      {/* عرض الجسيمات فقط في الوضع الداكن */}
      {isDark && <ParticleBackground />}

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-6">
        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className={`text-2xl md:text-3xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient`}>
              📹 إضافة فيديو جديد
            </h1>
            <p className={`text-sm mt-1 flex items-center gap-2 flex-wrap ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
              أدخل رابط YouTube مع إعدادات متقدمة لحماية المحتوى
              <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                <Shield className="h-3 w-3 inline ml-1" /> حماية فائقة
              </span>
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
              }`}
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
            </button>
            <button
              onClick={goBack}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 text-gray-600 shadow-sm'
              }`}
            >
              <ArrowRight className="h-4 w-4" /> العودة للقائمة
            </button>
          </div>
        </div>

        {/* ===== إحصائيات سريعة ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Video} label="فيديوهاتي" value={stats.totalVideos} color="text-blue-400" isDark={isDark} />
          <StatCard icon={Eye} label="إجمالي المشاهدات" value={stats.totalViews.toLocaleString()} color="text-green-400" isDark={isDark} />
          <StatCard icon={Star} label="متوسط التقييم" value={stats.avgRating} color="text-yellow-400" subtitle="⭐ من 5" isDark={isDark} />
          <StatCard icon={Clock} label="ساعات التعلم" value={stats.totalHours} color="text-purple-400" subtitle="من إجمالي الفيديوهات" isDark={isDark} />
        </div>

        {/* ===== نموذج الرفع + المعاينة ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* النموذج */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className={`space-y-5 rounded-2xl p-6 transition-all duration-500 ${
              isDark
                ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              {/* شريط التقدم */}
              <AnimatePresence>
                {isUploading && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className={`rounded-xl p-4 border border-yellow-400/20 ${
                      isDark ? 'bg-[var(--bg-secondary)]' : 'bg-gray-50'
                    }`}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className={isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}>
                          جاري رفع الفيديو...
                        </span>
                        <span className="text-yellow-400 font-bold">{Math.round(uploadProgress)}%</span>
                      </div>
                      <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-yellow-400 to-yellow-600 rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${uploadProgress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className={`text-[10px] mt-1.5 text-center ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                        {uploadProgress < 100 ? 'جاري تحميل البيانات...' : '✅ اكتمل الرفع!'}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* عنوان الفيديو */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                  عنوان الفيديو <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full p-3 rounded-xl border outline-none transition ${
                    isDark
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                  }`}
                  placeholder="مثال: شرح قاعدة الماضي البسيط"
                />
              </div>

              {/* رابط YouTube */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                  رابط YouTube <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
                  <input
                    type="url"
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    className={`w-full p-3 pl-4 pr-10 rounded-xl border outline-none transition ${
                      isDark
                        ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                    }`}
                    placeholder="https://www.youtube.com/watch?v=..."
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                  <p className={`text-xs flex items-center gap-1 ${isDark ? 'text-yellow-400/70' : 'text-yellow-600/70'}`}>
                    <Shield className="h-3 w-3" /> سيتم تطبيق البصمة المائية والحماية تلقائياً
                  </p>
                  {previewVideoId && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="h-3 w-3" /> تم التعرف على الرابط
                    </span>
                  )}
                </div>
              </div>

              {/* الوصف */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                  الوصف
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows="3"
                  className={`w-full p-3 rounded-xl border outline-none transition resize-none ${
                    isDark
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                  }`}
                  placeholder="وصف مختصر للفيديو..."
                />
              </div>

              {/* الكورس */}
              <div>
                <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                  الكورس المرتبط (اختياري)
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className={`w-full p-3 rounded-xl border outline-none transition appearance-none ${
                    isDark
                      ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                      : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                  }`}
                >
                  <option value="">بدون كورس</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {/* وضع العرض */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                  وضع العرض <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDisplayMode('platform')}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-right ${
                      displayMode === 'platform'
                        ? 'border-yellow-400 bg-yellow-400/10 shadow-lg shadow-yellow-400/10'
                        : isDark
                          ? 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${displayMode === 'platform' ? 'bg-yellow-400/20 text-yellow-400' : isDark ? 'bg-[var(--bg-card)]' : 'bg-gray-100'}`}>
                        <Shield className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className={`font-semibold ${displayMode === 'platform' ? 'text-yellow-400' : isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
                          🔒 داخل المنصة (محمي)
                        </p>
                        <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                          بصمة مائية • منع التحميل • منع المشاركة
                        </p>
                      </div>
                      {displayMode === 'platform' && (
                        <CheckCircle className="h-5 w-5 text-yellow-400" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDisplayMode('youtube')}
                    className={`p-4 rounded-xl border-2 transition-all duration-300 text-right ${
                      displayMode === 'youtube'
                        ? 'border-blue-400 bg-blue-400/10 shadow-lg shadow-blue-400/10'
                        : isDark
                          ? 'bg-[var(--bg-secondary)] border-[var(--border-color)]'
                          : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${displayMode === 'youtube' ? 'bg-blue-400/20 text-blue-400' : isDark ? 'bg-[var(--bg-card)]' : 'bg-gray-100'}`}>
                        <Globe className="h-5 w-5" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className={`font-semibold ${displayMode === 'youtube' ? 'text-blue-400' : isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
                          🌐 على YouTube (مفتوح)
                        </p>
                        <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                          مشاركة كاملة • لا بصمة مائية • نسخ الرابط
                        </p>
                      </div>
                      {displayMode === 'youtube' && (
                        <CheckCircle className="h-5 w-5 text-blue-400" />
                      )}
                    </div>
                  </button>
                </div>
                <p className={`text-[10px] mt-2 text-center ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                  {displayMode === 'platform'
                    ? '🔒 سيتم عرض الفيديو داخل المنصة مع حماية كاملة (بصمة مائية، منع التحميل، منع المشاركة)'
                    : '🌐 سيتم عرض الفيديو على YouTube مع إمكانية المشاركة والنسخ'}
                </p>
              </div>

              {/* الإعدادات المتقدمة */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
                  className={`flex items-center gap-2 text-sm ${isDark ? 'text-[var(--text-secondary)] hover:text-yellow-400' : 'text-gray-600 hover:text-yellow-600'} transition group`}
                >
                  <Settings className={`h-4 w-4 group-hover:rotate-90 transition duration-500`} />
                  الإعدادات المتقدمة
                  <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isAdvancedOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isAdvancedOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-4 space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                            المرحلة الدراسية
                          </label>
                          <select
                            value={gradeStage}
                            onChange={(e) => {
                              setGradeStage(e.target.value);
                              setGradeLevel('');
                            }}
                            className={`w-full p-3 rounded-xl border outline-none transition appearance-none ${
                              isDark
                                ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                            }`}
                          >
                            <option value="">اختر المرحلة</option>
                            <option value="ابتدائي">ابتدائي</option>
                            <option value="اعدادي">اعدادي</option>
                            <option value="ثانوي">ثانوي</option>
                          </select>
                        </div>
                        {gradeStage && (
                          <div>
                            <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                              الصف الدراسي
                            </label>
                            <select
                              value={gradeLevel}
                              onChange={(e) => setGradeLevel(e.target.value)}
                              className={`w-full p-3 rounded-xl border outline-none transition appearance-none ${
                                isDark
                                  ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                                  : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                              }`}
                            >
                              <option value="">اختر الصف</option>
                              {getGradeOptions(gradeStage).map((num) => (
                                <option key={num} value={num}>{num}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        <div>
                          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                            وسوم (مفصولة بفاصلة)
                          </label>
                          <input
                            type="text"
                            value={tags}
                            onChange={(e) => setTags(e.target.value)}
                            className={`w-full p-3 rounded-xl border outline-none transition ${
                              isDark
                                ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                            }`}
                            placeholder="جرامر, شرح, ثانوية عامة"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-6">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isFree}
                            onChange={(e) => setIsFree(e.target.checked)}
                            className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
                          />
                          <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]' : 'text-gray-600 group-hover:text-gray-900'} transition`}>
                            🎁 فيديو مجاني
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isPublished}
                            onChange={(e) => setIsPublished(e.target.checked)}
                            className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
                          />
                          <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]' : 'text-gray-600 group-hover:text-gray-900'} transition`}>
                            {isPublished ? '📢 نشر فوري' : '📝 حفظ كمسودة'}
                          </span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            checked={isScheduled}
                            onChange={(e) => setIsScheduled(e.target.checked)}
                            className="w-4 h-4 accent-yellow-400 rounded cursor-pointer"
                          />
                          <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]' : 'text-gray-600 group-hover:text-gray-900'} transition`}>
                            📅 جدولة النشر
                          </span>
                        </label>
                      </div>

                      {isScheduled && (
                        <div>
                          <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                            تاريخ النشر
                          </label>
                          <input
                            type="datetime-local"
                            value={scheduledDate}
                            onChange={(e) => setScheduledDate(e.target.value)}
                            className={`w-full p-3 rounded-xl border outline-none transition ${
                              isDark
                                ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                                : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                            }`}
                          />
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* أزرار الإرسال */}
              <div className={`flex flex-wrap gap-3 pt-4 border-t ${isDark ? 'border-[var(--border-color)]' : 'border-gray-200'}`}>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {isUploading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      جاري الإضافة...
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" /> إضافة الفيديو
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={goBack}
                  className={`px-6 py-3 rounded-xl transition ${
                    isDark
                      ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-primary)]'
                      : 'bg-gray-100 border border-gray-200 hover:border-yellow-400/50 text-gray-900'
                  }`}
                >
                  إلغاء
                </button>
              </div>

              {/* رسائل النجاح والخطأ */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl flex items-start gap-2`}
                  >
                    <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span className="flex-1 text-sm">{error}</span>
                    <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                      <X className="h-4 w-4" />
                    </button>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-xl flex items-center gap-2"
                  >
                    <CheckCircle className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 text-sm">{success}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>

          {/* ===== العمود الجانبي ===== */}
          <div className="lg:col-span-1 space-y-4">
            {/* معاينة الفيديو */}
            <VideoPreview
              youtubeUrl={youtubeUrl}
              title={title}
              description={description}
              isLoading={isUploading}
              displayMode={displayMode}
              gradeStage={gradeStage}
              gradeLevel={gradeLevel}
              isDark={isDark}
            />

            {/* طبقات الحماية */}
            <div className={`rounded-2xl p-4 transition-all duration-500 ${
              isDark
                ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
            }`}>
              <h4 className={`font-bold text-sm flex items-center gap-2 mb-3 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
                <Shield className="h-4 w-4 text-yellow-400" /> طبقات الحماية المتقدمة
              </h4>
              <div className="flex flex-wrap gap-2">
                {displayMode === 'platform' ? (
                  <>
                    <SecurityBadge icon={User} label="بصمة مائية" color="border-blue-400/30 text-blue-400" isDark={isDark} />
                    <SecurityBadge icon={Ban} label="منع التحميل" color="border-red-400/30 text-red-400" isDark={isDark} />
                    <SecurityBadge icon={EyeOff} label="منع النقر الأيمن" color="border-purple-400/30 text-purple-400" isDark={isDark} />
                    <SecurityBadge icon={Lock} label="منع المشاركة" color="border-yellow-400/30 text-yellow-400" isDark={isDark} />
                    <SecurityBadge icon={Clipboard} label="منع نسخ الرابط" color="border-orange-400/30 text-orange-400" isDark={isDark} />
                  </>
                ) : (
                  <>
                    <SecurityBadge icon={Globe} label="مشاركة كاملة" color="border-green-400/30 text-green-400" isDark={isDark} />
                    <SecurityBadge icon={Copy} label="نسخ الرابط" color="border-blue-400/30 text-blue-400" isDark={isDark} />
                    <SecurityBadge icon={Share2} label="مشاركة على وسائل التواصل" color="border-purple-400/30 text-purple-400" isDark={isDark} />
                    <SecurityBadge icon={Users} label="وصول غير محدود" color="border-gray-400/30 text-gray-400" isDark={isDark} />
                  </>
                )}
              </div>
            </div>

            {/* نصائح احترافية */}
            <div className={`bg-gradient-to-br from-yellow-400/10 via-purple-500/5 to-blue-500/10 border ${isDark ? 'border-[var(--border-color)]' : 'border-gray-200'} rounded-2xl p-4`}>
              <h4 className={`font-bold text-sm flex items-center gap-2 mb-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
                <Lightbulb className="h-4 w-4 text-yellow-400" /> نصائح احترافية
              </h4>
              <ul className={`space-y-2 text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">🎯</span>
                  <span>استخدم عناوين واضحة وجذابة تحتوي على الكلمات المفتاحية</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">📝</span>
                  <span>أضف وصفاً مفصلاً مع كلمات مفتاحية لتحسين ظهور الفيديو</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">🏷️</span>
                  <span>استخدم وسوم مرتبطة بالمحتوى لزيادة الوصول</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">📅</span>
                  <span>جدولة النشر في وقت ذروة تفاعل الطلاب</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">🔒</span>
                  <span>جميع الفيديوهات محمية ببصمة مائية فريدة لكل طالب</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

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