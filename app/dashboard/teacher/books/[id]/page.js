// ============================================================
// app/dashboard/teacher/books/[id]/page.js
// تفاصيل الكتاب – معاينة وإدارة متكاملة V8 (معدلة للثيم الموحد)
// ============================================================

'use client';

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ الثيم المركزي

// ============================================================
// 1. خلفية الجسيمات (أنيقة)
// ============================================================

const ParticleBackground = () => {
  const canvasRef = useRef(null);

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

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        r: Math.random() * 2 + 1,
        opacity: Math.random() * 0.2 + 0.05,
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 215, 0, ${p.opacity})`;
        ctx.fill();

        for (let j = i + 1; j < particles.length; j++) {
          const dx = p.x - particles[j].x;
          const dy = p.y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(255, 215, 0, ${0.03 * (1 - dist / 120)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      });
      requestAnimationFrame(draw);
    };
    draw();

    return () => window.removeEventListener('resize', resize);
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

// ============================================================
// 2. عداد متحرك
// ============================================================

const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const step = target / (duration / 16);
          const timer = setInterval(() => {
            start += step;
            if (start >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
          return () => clearInterval(timer);
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="font-extrabold">
      {count}{suffix}
    </span>
  );
};

// ============================================================
// 3. بطاقة إحصائية (معدلة للثيم المركزي)
// ============================================================

const StatCard = ({ stat, styles }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative ${styles.card} border ${styles.border} rounded-2xl p-5 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/10 overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`${styles.subtext} text-sm`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && <p className={`text-xs ${styles.subtext} mt-1`}>{stat.sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: isHovered ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ============================================================
// 4. دوال مساعدة
// ============================================================

const formatDate = (date) => {
  if (!date) return 'غير محدد';
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getStatus = (book) => {
  if (!book.is_published) {
    return { label: 'مسودة', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Icons.FileText };
  }
  return { label: 'منشور', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Icons.CheckCircle };
};

// ============================================================
// 5. مكون عرض الصفحة (معاينة داخل الكتاب) – معدل للثيم المركزي
// ============================================================

const PageViewer = ({ page, index, styles }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`${styles.card} border ${styles.border} rounded-xl overflow-hidden hover:border-yellow-400/30 transition-all duration-300`}
    >
      <div
        className={`flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition ${styles.text}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">صفحة {index + 1}</span>
          {page.title && <h4 className={`font-semibold ${styles.text}`}>{page.title}</h4>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">{page.content ? page.content.length : 0} حرف</span>
          <Icons.ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
        </div>
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="px-4 pb-4"
          >
            <div
              className={`prose prose-invert max-w-none ${styles.text} text-sm leading-relaxed`}
              dangerouslySetInnerHTML={{ __html: page.content || `<p class="${styles.subtext}">لا يوجد محتوى</p>` }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ============================================================
// 6. الصفحة الرئيسية – تفاصيل الكتاب (معدلة للثيم المركزي)
// ============================================================

export default function TeacherBookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id;

  // ===== الثيم المركزي =====
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme(); // ✅ استخدام الثيم المركزي

  // ===== حالات عامة =====
  const [book, setBook] = useState(null);
  const [course, setCourse] = useState(null);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ===== جلب البيانات =====
  const fetchBookData = useCallback(async () => {
    setIsRefreshing(true);
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. جلب الكتاب
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .single();

      if (bookError) throw bookError;
      if (!bookData) {
        router.push('/dashboard/teacher/books');
        return;
      }

      // التحقق من الملكية
      if (bookData.teacher_id !== user.id) {
        toast.error('غير مصرح لك بمشاهدة هذا الكتاب');
        router.push('/dashboard/teacher/books');
        return;
      }

      setBook(bookData);

      // 2. جلب الكورس المرتبط (إن وجد)
      if (bookData.course_id) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', bookData.course_id)
          .single();
        setCourse(courseData);
      }

      // 3. معالجة الصفحات (المحتوى)
      let pagesData = [];
      if (bookData.content) {
        try {
          pagesData = typeof bookData.content === 'string' ? JSON.parse(bookData.content) : bookData.content;
        } catch (e) {
          pagesData = [];
        }
      }
      setPages(Array.isArray(pagesData) ? pagesData : []);

    } catch (err) {
      console.error('Error fetching book:', err);
      setError('فشل جلب بيانات الكتاب: ' + err.message);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [bookId, router]);

  useEffect(() => {
    if (bookId) fetchBookData();
  }, [bookId, fetchBookData]);

  // ===== دوال التحكم =====
  const handleEdit = () => {
    router.push(`/dashboard/teacher/books/${bookId}/edit`);
  };

  const handleDelete = async () => {
    if (!confirm('هل أنت متأكد من حذف هذا الكتاب؟ هذا الإجراء لا يمكن التراجع عنه.')) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);
      if (error) throw error;
      toast.success('✅ تم حذف الكتاب بنجاح');
      router.push('/dashboard/teacher/books');
    } catch (err) {
      console.error('Error deleting book:', err);
      toast.error('فشل حذف الكتاب');
    } finally {
      setIsDeleting(false);
    }
  };

  const togglePublish = async () => {
    try {
      const { error } = await supabase
        .from('books')
        .update({
          is_published: !book.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId);
      if (error) throw error;
      toast.success(`✅ تم ${book.is_published ? 'إلغاء نشر' : 'نشر'} الكتاب`);
      fetchBookData();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/books/${book.slug}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('تم نسخ رابط الكتاب'))
      .catch(() => toast.error('فشل نسخ الرابط'));
  };

  // ===== دوال التنقل =====
  const goBack = () => {
    if (book?.course_id) {
      router.push(`/dashboard/teacher/courses/${book.course_id}`);
    } else {
      router.push('/dashboard/teacher/books');
    }
  };

  // ===== حالة التحميل =====
  if (loading) {
    return (
      <TeacherLayout>
        <div className={`flex items-center justify-center py-20 ${styles.bg}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  if (!book) {
    return (
      <TeacherLayout>
        <div className={`text-center py-20 ${styles.bg}`}>
          <Icons.AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg">الكتاب غير موجود</p>
          <button onClick={goBack} className="text-yellow-400 hover:underline mt-2">العودة</button>
        </div>
      </TeacherLayout>
    );
  }

  const status = getStatus(book);
  const StatusIcon = status.icon;
  const pagesCount = pages.length;

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'عدد الصفحات', value: pagesCount, suffix: '', icon: Icons.BookOpen, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'المشاهدات', value: book.views || 0, suffix: '', icon: Icons.Eye, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'التحميلات', value: book.downloads || 0, suffix: '', icon: Icons.Download, color: 'from-purple-400 to-purple-600', delay: 0.2 },
    { id: 4, label: 'تاريخ الإنشاء', value: formatDate(book.created_at), suffix: '', icon: Icons.Calendar, color: 'from-yellow-400 to-yellow-600', delay: 0.3 },
  ];

  return (
    <TeacherLayout>
      <div className={`relative ${styles.bg}`}>
        <ParticleBackground />

        <div className="relative z-10">
          {/* ===== شريط التنقل الداخلي ===== */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={goBack}
                className={`${styles.subtext} hover:text-yellow-400 transition p-1.5`}
              >
                <Icons.ArrowRight className="h-5 w-5" />
              </button>
              <h1 className={`text-xl font-extrabold ${styles.text} truncate max-w-[200px] md:max-w-md`}>
                {book.title}
              </h1>
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                <StatusIcon className="h-3 w-3" /> {status.label}
              </span>
              {course && (
                <Link
                  href={`/dashboard/teacher/courses/${course.id}`}
                  className={`text-xs ${styles.subtext} hover:text-yellow-400 transition flex items-center gap-1`}
                >
                  <Icons.Book className="h-3 w-3" /> {course.title}
                </Link>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={fetchBookData}
                disabled={isRefreshing}
                className={`p-2 rounded-xl transition ${isRefreshing ? 'animate-spin' : 'hover:bg-white/5'} ${styles.card} border ${styles.border}`}
                title="تحديث"
              >
                <Icons.RefreshCw className="h-4 w-4" />
              </button>
              <button
                onClick={handleExportPDF}
                className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Icons.FileText className="h-3 w-3" /> PDF
              </button>
              <button
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Icons.Copy className="h-3 w-3" /> نسخ الرابط
              </button>
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-xs font-semibold transition flex items-center gap-1"
              >
                <Icons.Edit className="h-3 w-3" /> تعديل
              </button>
              <button
                onClick={togglePublish}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                  book.is_published
                    ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400'
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
              >
                {book.is_published ? <Icons.EyeOff className="h-3 w-3" /> : <Icons.Eye className="h-3 w-3" />}
                {book.is_published ? 'إلغاء النشر' : 'نشر'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-semibold transition flex items-center gap-1 disabled:opacity-50"
              >
                <Icons.Trash2 className="h-3 w-3" /> حذف
              </button>
            </div>
          </div>

          {/* ===== الأخطاء والنجاحات ===== */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-xl mb-4 flex items-center gap-3 text-sm"
              >
                <Icons.AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="flex-1">{error}</span>
                <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                  <Icons.X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-green-500/10 border border-green-500/30 text-green-400 p-3 rounded-xl mb-4 flex items-center gap-3 text-sm"
              >
                <Icons.CheckCircle className="h-5 w-5" />
                <span className="flex-1">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== بطاقة الكتاب والإحصائيات ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-1">
              <div className={`${styles.card} border ${styles.border} rounded-2xl overflow-hidden hover:border-yellow-400/30 transition-all duration-500`}>
                <div className="aspect-[3/4] bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center relative">
                  {book.cover_image ? (
                    <img src={book.cover_image} alt={book.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <Icons.BookOpen className="h-20 w-20 text-gray-600" />
                      <span className="text-sm text-gray-400">بدون غلاف</span>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                      <StatusIcon className="h-3 w-3" /> {status.label}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h2 className={`text-xl font-bold ${styles.text}`}>{book.title}</h2>
                  <p className={`text-sm ${styles.subtext} mt-2 line-clamp-3`}>{book.description || 'لا يوجد وصف'}</p>
                  {course && (
                    <Link
                      href={`/dashboard/teacher/courses/${course.id}`}
                      className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition mt-3"
                    >
                      <Icons.Book className="h-3 w-3" /> {course.title}
                    </Link>
                  )}
                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className={`${styles.card} rounded-lg p-2 text-center`}>
                      <span className={styles.subtext}>الـ Slug</span>
                      <p className={`font-medium ${styles.text} truncate`}>{book.slug}</p>
                    </div>
                    <div className={`${styles.card} rounded-lg p-2 text-center`}>
                      <span className={styles.subtext}>آخر تحديث</span>
                      <p className={`font-medium ${styles.text}`}>{formatDate(book.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {statsData.map((stat) => <StatCard key={stat.id} stat={stat} styles={styles} />)}
              </div>
            </div>
          </div>

          {/* ===== محتويات الكتاب ===== */}
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-5 hover:border-yellow-400/30 transition-all duration-500`}>
            <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
              <Icons.BookOpen className="h-5 w-5 text-yellow-400" /> محتويات الكتاب ({pagesCount} صفحة)
            </h3>
            {pagesCount === 0 ? (
              <div className="text-center py-8">
                <Icons.BookOpen className="h-12 w-12 text-gray-600 mx-auto mb-2" />
                <p className={styles.subtext}>لا توجد صفحات في هذا الكتاب</p>
                <button
                  onClick={handleEdit}
                  className="mt-3 px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition"
                >
                  أضف صفحات
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {pages.map((page, index) => (
                  <PageViewer key={index} page={page} index={index} styles={styles} />
                ))}
              </div>
            )}
          </div>

          {/* ===== روابط سريعة ===== */}
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 mt-6`}>
            <h3 className={`text-sm font-semibold ${styles.text} mb-2 flex items-center gap-2`}>
              <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
            </h3>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/teacher" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>الرئيسية</Link>
              <Link href="/dashboard/teacher/courses" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>الكورسات</Link>
              <Link href="/dashboard/teacher/videos" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>الفيديوهات</Link>
              <Link href="/dashboard/teacher/exams" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>الامتحانات</Link>
              <Link href="/dashboard/teacher/students" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text} hover:text-yellow-300`}>الطلاب</Link>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}

//تم التعديل بنجاح في مرحلة الثيم