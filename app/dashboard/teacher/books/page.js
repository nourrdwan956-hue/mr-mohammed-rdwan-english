// ============================================================
// app/dashboard/teacher/books/page.js
// إدارة الكتب – النسخة الأسطورية المتكاملة V7 (مع صلاحيات المساعد)
// ============================================================

'use client';

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ الثيم المركزي

// ===== استيراد دوال الصلاحيات =====
import { getCachedAssistantPermissions, hasPermission } from '@/lib/permissions';

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
// 3. بطاقة إحصائية (معدلة لاستخدام الثيم المركزي)
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
  });
};

const getStatus = (book) => {
  if (!book.is_published) {
    return { label: 'مسودة', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: Icons.FileText };
  }
  return { label: 'منشور', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: Icons.CheckCircle };
};

// ============================================================
// 5. بطاقة الكتاب (مضخمة جداً) مع الصلاحيات (معدلة للثيم المركزي)
// ============================================================

const BookCard = ({
  book,
  courseTitle,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onTogglePublish,
  index,
  permissions,
  isAssistant,
  styles, // ✅ تمرير الثيم
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const status = getStatus(book);
  const StatusIcon = status.icon;
  const pagesCount = book.content && typeof book.content === 'object' ? book.content.length : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative ${styles.card} border ${styles.border} rounded-2xl overflow-hidden hover:border-yellow-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-purple-500/5 to-transparent rounded-2xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative z-10 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* صورة الغلاف */}
          <div className="md:w-32 h-40 md:h-auto rounded-xl overflow-hidden bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 relative group/image">
            {book.cover_image ? (
              <img
                src={book.cover_image}
                alt={book.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110"
              />
            ) : (
              <div className="flex flex-col items-center gap-1">
                <Icons.BookOpen className="h-12 w-12 text-gray-600" />
                <span className="text-xs text-gray-500">بدون غلاف</span>
              </div>
            )}
            <div className="absolute top-2 right-2">
              <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full border ${status.color}`}>
                <StatusIcon className="h-3 w-3" />
                {status.label}
              </span>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <div>
                <h3 className={`text-lg font-bold ${styles.text} group-hover:text-yellow-300 transition-colors cursor-pointer`} onClick={() => onView(book.id)}>
                  {book.title}
                </h3>
                {courseTitle && (
                  <p className={`text-xs ${styles.subtext} flex items-center gap-1 mt-0.5`}>
                    <Icons.Book className="h-3 w-3" /> {courseTitle}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-extrabold text-yellow-400">{pagesCount} صفحة</span>
              </div>
            </div>

            <p className={`text-sm ${styles.subtext} mt-1 line-clamp-2`}>
              {book.description || 'لا يوجد وصف'}
            </p>

            <div className={`flex flex-wrap items-center gap-3 mt-3 text-xs ${styles.subtext}`}>
              <span className={`flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full ${styles.border}`}>
                <Icons.Eye className="h-3.5 w-3.5" />
                {book.views || 0}
              </span>
              <span className={`flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full ${styles.border}`}>
                <Icons.Download className="h-3.5 w-3.5" />
                {book.downloads || 0}
              </span>
              <span className={`flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full ${styles.border}`}>
                <Icons.Calendar className="h-3.5 w-3.5" />
                {formatDate(book.created_at)}
              </span>
              {book.slug && (
                <span className={`flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full ${styles.border}`}>
                  <Icons.Link className="h-3.5 w-3.5" />
                  {book.slug}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5">
              {/* زر العرض – دائماً متاح */}
              <button
                onClick={() => onView(book.id)}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/30 transition flex items-center gap-1"
              >
                <Icons.Eye className="h-3 w-3" /> معاينة
              </button>

              {/* زر التعديل – يظهر فقط إذا كان معلم أو مساعد لديه can_edit */}
              {(!isAssistant || hasPermission(permissions, 'books', 'can_edit')) && (
                <button
                  onClick={() => onEdit(book.id)}
                  className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition flex items-center gap-1"
                >
                  <Icons.Edit className="h-3 w-3" /> تعديل
                </button>
              )}

              {/* زر نسخ – يظهر فقط إذا كان معلم أو مساعد لديه can_create */}
              {(!isAssistant || hasPermission(permissions, 'books', 'can_create')) && (
                <button
                  onClick={() => onDuplicate(book)}
                  className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/30 transition flex items-center gap-1"
                >
                  <Icons.Copy className="h-3 w-3" /> نسخ
                </button>
              )}

              {/* زر النشر/إلغاء النشر – يظهر فقط إذا كان معلم أو مساعد لديه can_publish */}
              {(!isAssistant || hasPermission(permissions, 'books', 'can_publish')) && (
                <button
                  onClick={() => onTogglePublish(book)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    book.is_published
                      ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {book.is_published ? <Icons.EyeOff className="h-3 w-3" /> : <Icons.Eye className="h-3 w-3" />}
                  {book.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
              )}

              {/* زر الحذف – يظهر فقط إذا كان معلم أو مساعد لديه can_delete */}
              {(!isAssistant || hasPermission(permissions, 'books', 'can_delete')) && (
                <button
                  onClick={() => onDelete(book)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/30 transition flex items-center gap-1"
                >
                  <Icons.Trash2 className="h-3 w-3" /> حذف
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// 6. نافذة تأكيد الحذف (معدلة للثيم المركزي)
// ============================================================

const DeleteModal = ({ isOpen, onClose, onConfirm, title, count, isBatch, styles }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className={`${styles.card} border ${styles.border} rounded-3xl p-8 max-w-md w-full`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <Icons.AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className={`text-xl font-bold ${styles.text} mb-2`}>
            {isBatch ? `حذف ${count} كتاب` : 'تأكيد الحذف'}
          </h3>
          <p className={`${styles.subtext} text-sm mb-6`}>
            {isBatch
              ? `هل أنت متأكد من حذف ${count} كتاب؟ هذا الإجراء لا يمكن التراجع عنه.`
              : `هل أنت متأكد من حذف "${title}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition"
            >
              إلغاء
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition"
            >
              حذف
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ============================================================
// 7. الصفحة الرئيسية – إدارة الكتب (مع الصلاحيات) – معدلة للثيم المركزي
// ============================================================

export default function TeacherBooksPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('courseId');

  // ===== الثيم المركزي =====
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme(); // ✅ استخدام الثيم المركزي

  // ===== حالات عامة =====
  const [books, setBooks] = useState([]);
  const [courses, setCourses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ===== فلترة وبحث =====
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState(courseIdParam || 'all');
  const [sortBy, setSortBy] = useState('newest');

  // ===== تحديد متعدد =====
  const [selectedIds, setSelectedIds] = useState([]);

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    totalViews: 0,
    totalDownloads: 0,
  });

  // ===== صلاحيات المساعد (إن وجد) =====
  const [permissions, setPermissions] = useState(null);
  const [isAssistant, setIsAssistant] = useState(false);

  // ===== حالات الحذف =====
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // ===== جلب الكتب =====
  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // ===== جلب صلاحيات المساعد =====
      const perms = await getCachedAssistantPermissions(user.id);
      if (perms !== null) {
        setIsAssistant(true);
        setPermissions(perms);
      } else {
        setIsAssistant(false);
        setPermissions(null);
      }

      // ===== التحقق من صلاحية العرض =====
      if (perms !== null && !hasPermission(perms, 'books', 'can_view')) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // 1. جلب جميع الكورسات التابعة للمعلم
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', user.id);

      const courseMap = {};
      (coursesData || []).forEach(c => { courseMap[c.id] = c.title; });
      setCourses(courseMap);

      // 2. جلب الكتب
      let query = supabase
        .from('books')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (courseIdParam && courseIdParam !== 'all') {
        query = query.eq('course_id', courseIdParam);
      }

      const { data, error } = await query;

      if (error) throw error;

      setBooks(data || []);

      // 3. حساب الإحصائيات
      const total = data?.length || 0;
      const published = data?.filter(b => b.is_published).length || 0;
      const drafts = total - published;
      const totalViews = data?.reduce((acc, b) => acc + (b.views || 0), 0) || 0;
      const totalDownloads = data?.reduce((acc, b) => acc + (b.downloads || 0), 0) || 0;

      setStats({ total, published, drafts, totalViews, totalDownloads });

    } catch (err) {
      console.error('Error fetching books:', err);
      setError('فشل جلب الكتب: ' + err.message);
      toast.error('فشل جلب الكتب');
    } finally {
      setLoading(false);
    }
  }, [courseIdParam, router]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // ===== الفلترة والبحث =====
  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter(b =>
        filterStatus === 'published' ? b.is_published : !b.is_published
      );
    }

    if (filterCourse && filterCourse !== 'all') {
      result = result.filter(b => b.course_id === filterCourse);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'views':
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return result;
  }, [books, searchQuery, filterStatus, filterCourse, sortBy]);

  // ===== قائمة الكورسات للفلترة =====
  const courseOptions = useMemo(() => {
    const uniqueCourses = {};
    books.forEach(b => {
      if (b.course_id && !uniqueCourses[b.course_id]) {
        uniqueCourses[b.course_id] = courses[b.course_id] || 'كورس غير معروف';
      }
    });
    return Object.entries(uniqueCourses).map(([id, title]) => ({ id, title }));
  }, [books, courses]);

  // ===== دوال التحكم =====
  const handleCreate = () => {
    const url = courseIdParam && courseIdParam !== 'all'
      ? `/dashboard/teacher/books/new?course_id=${courseIdParam}`
      : '/dashboard/teacher/books/new';
    router.push(url);
  };

  const handleView = (bookId) => {
    router.push(`/dashboard/teacher/books/${bookId}`);
  };

  const handleEdit = (bookId) => {
    router.push(`/dashboard/teacher/books/${bookId}/edit`);
  };

  const handleDuplicate = async (book) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('books')
        .insert({
          teacher_id: user.id,
          course_id: book.course_id || null,
          title: `${book.title} (نسخة)`,
          description: book.description,
          cover_image: book.cover_image,
          slug: `${book.slug}-copy-${Date.now().toString().slice(-4)}`,
          content: book.content || '[]',
          is_published: false,
          views: 0,
          downloads: 0,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('✅ تم نسخ الكتاب بنجاح');
      fetchBooks();
    } catch (err) {
      console.error('Error duplicating book:', err);
      toast.error('فشل نسخ الكتاب');
    }
  };

  const handleDeleteClick = (book) => {
    setDeleteTarget(book);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('✅ تم حذف الكتاب بنجاح');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchBooks();
    } catch (err) {
      console.error('Error deleting book:', err);
      toast.error('فشل حذف الكتاب');
    }
  };

  const togglePublish = async (book) => {
    try {
      const { error } = await supabase
        .from('books')
        .update({
          is_published: !book.is_published,
          updated_at: new Date().toISOString(),
        })
        .eq('id', book.id);
      if (error) throw error;
      toast.success(`✅ تم ${book.is_published ? 'إلغاء نشر' : 'نشر'} الكتاب`);
      fetchBooks();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  // ===== تحديد متعدد =====
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredBooks.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredBooks.map(b => b.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ===== العمليات الجماعية مع الصلاحيات =====
  const confirmBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    
    if (isAssistant && !hasPermission(permissions, 'books', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الكتب');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`✅ تم حذف ${selectedIds.length} كتاب`);
      setSelectedIds([]);
      setIsBatchDeleteModalOpen(false);
      fetchBooks();
    } catch (err) {
      console.error('Error batch deleting:', err);
      toast.error('فشل حذف الكتب المحددة');
    }
  };

  const handleBatchPublish = async () => {
    if (selectedIds.length === 0) return;
    
    if (isAssistant && !hasPermission(permissions, 'books', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر الكتب');
      return;
    }
    
    try {
      const { error } = await supabase
        .from('books')
        .update({ is_published: true })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`✅ تم نشر ${selectedIds.length} كتاب`);
      setSelectedIds([]);
      fetchBooks();
    } catch (err) {
      console.error('Error batch publishing:', err);
      toast.error('فشل نشر الكتب');
    }
  };

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي الكتب', value: stats.total, suffix: '', icon: Icons.BookOpen, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'منشور', value: stats.published, suffix: '', icon: Icons.CheckCircle, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'مسودات', value: stats.drafts, suffix: '', icon: Icons.FileText, color: 'from-gray-400 to-gray-600', delay: 0.2 },
    { id: 4, label: 'إجمالي المشاهدات', value: stats.totalViews, suffix: '', icon: Icons.Eye, color: 'from-purple-400 to-purple-600', delay: 0.3 },
    { id: 5, label: 'إجمالي التحميلات', value: stats.totalDownloads, suffix: '', icon: Icons.Download, color: 'from-orange-400 to-orange-600', delay: 0.4 },
  ];

  if (loading) {
    return (
      <TeacherLayout>
        <div className={`flex items-center justify-center py-20 ${styles.bg}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className={`relative ${styles.bg}`}>
        <ParticleBackground />

        <div className="relative z-10">
          {/* ===== رأس الصفحة ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className={`text-3xl font-extrabold ${styles.text}`}>📚 إدارة الكتب والملازم</h1>
              <p className={`${styles.subtext} text-sm mt-1`}>
                {courseIdParam && courseIdParam !== 'all' && courses[courseIdParam]
                  ? `كتب الكورس: ${courses[courseIdParam]}`
                  : 'جميع الكتب'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
              {/* زر إنشاء كتاب – يظهر فقط إذا كان معلم أو مساعد لديه can_create */}
              {(!isAssistant || hasPermission(permissions, 'books', 'can_create')) && (
                <button
                  onClick={handleCreate}
                  className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
                >
                  <Icons.Plus className="h-5 w-5" /> إنشاء كتاب جديد
                </button>
              )}
              {/* زر العودة للمساعد */}
              {isAssistant && (
                <button
                  onClick={() => router.push('/dashboard/assistant')}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm transition flex items-center gap-2"
                >
                  <Icons.ArrowRight className="h-4 w-4" /> العودة للوحة التحكم
                </button>
              )}
            </div>
          </div>

          {/* ===== الأخطاء والنجاحات ===== */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3"
              >
                <Icons.AlertCircle className="h-5 w-5" />
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
                className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-4 flex items-center gap-3"
              >
                <Icons.CheckCircle className="h-5 w-5" />
                <span className="flex-1">{success}</span>
                <button onClick={() => setSuccess('')} className="text-green-400/70 hover:text-green-400">
                  <Icons.X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== الإحصائيات ===== */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {statsData.map((stat) => <StatCard key={stat.id} stat={stat} styles={styles} />)}
          </div>

          {/* ===== الفلتر والبحث ===== */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن كتاب (عنوان أو وصف)..."
                className={`w-full p-2.5 pr-10 ${styles.input} border ${styles.border} rounded-xl ${styles.text} placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              <option value="all">كل الحالات</option>
              <option value="published">منشور</option>
              <option value="draft">مسودة</option>
            </select>
            <select
              value={filterCourse}
              onChange={(e) => setFilterCourse(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              <option value="all">جميع الكورسات</option>
              {courseOptions.map(c => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl ${styles.text} focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              <option value="newest">الأحدث</option>
              <option value="oldest">الأقدم</option>
              <option value="views">الأكثر مشاهدة</option>
              <option value="title">العنوان</option>
            </select>
          </div>

          {/* ===== أزرار التحكم الجماعي ===== */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {filteredBooks.length > 0 && (
              <>
                <button
                  onClick={toggleSelectAll}
                  className={`px-3 py-1.5 ${styles.card} border ${styles.border} rounded-xl text-xs hover:border-yellow-400/50 transition ${styles.text}`}
                >
                  {selectedIds.length === filteredBooks.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
                {selectedIds.length > 0 && (
                  <>
                    {(!isAssistant || hasPermission(permissions, 'books', 'can_delete')) && (
                      <button
                        onClick={() => setIsBatchDeleteModalOpen(true)}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs transition flex items-center gap-1"
                      >
                        <Icons.Trash2 className="h-3 w-3" /> حذف المحدد ({selectedIds.length})
                      </button>
                    )}
                    {(!isAssistant || hasPermission(permissions, 'books', 'can_publish')) && (
                      <button
                        onClick={handleBatchPublish}
                        className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-xs transition flex items-center gap-1"
                      >
                        <Icons.Eye className="h-3 w-3" /> نشر المحدد ({selectedIds.length})
                      </button>
                    )}
                  </>
                )}
              </>
            )}
          </div>

          {/* ===== قائمة الكتب ===== */}
          {filteredBooks.length === 0 ? (
            <div className={`text-center py-20 ${styles.card} border ${styles.border} rounded-3xl`}>
              <Icons.BookOpen className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold ${styles.text}`}>
                {searchQuery || filterStatus !== 'all' || filterCourse !== 'all'
                  ? 'لا توجد نتائج تطابق البحث'
                  : 'لا توجد كتب بعد'}
              </h3>
              <p className={`${styles.subtext} text-sm mt-2`}>
                {searchQuery || filterStatus !== 'all' || filterCourse !== 'all'
                  ? 'حاول تغيير معايير البحث'
                  : 'قم بإنشاء أول كتاب لك'}
              </p>
              {!searchQuery && filterStatus === 'all' && filterCourse === 'all' && (
                (!isAssistant || hasPermission(permissions, 'books', 'can_create')) && (
                  <button
                    onClick={handleCreate}
                    className="mt-4 px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
                  >
                    إنشاء كتاب الآن
                  </button>
                )
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredBooks.map((book, index) => (
                <BookCard
                  key={book.id}
                  book={book}
                  index={index}
                  courseTitle={courses[book.course_id]}
                  onView={handleView}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onDuplicate={handleDuplicate}
                  onTogglePublish={togglePublish}
                  permissions={permissions}
                  isAssistant={isAssistant}
                  styles={styles} // ✅ تمرير الثيم
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== نافذة تأكيد الحذف (فردي) ===== */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={deleteTarget?.title}
        styles={styles}
      />

      {/* ===== نافذة تأكيد الحذف (جماعي) ===== */}
      <DeleteModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        onConfirm={confirmBatchDelete}
        count={selectedIds.length}
        isBatch={true}
        styles={styles}
      />

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
          <Link href="/dashboard/teacher/question-bank" className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition text-purple-300 hover:text-purple-200">بنوك الأسئلة</Link>
        </div>
      </div>
    </TeacherLayout>
  );
}

//تم التعديل بنجاح في مرحلة الثيم