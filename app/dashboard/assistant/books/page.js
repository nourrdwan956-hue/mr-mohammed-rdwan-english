// app/dashboard/assistant/books/page.js
'use client';

// ================================================================
// 📚 قائمة الكتب – إصدار متطور جداً V4
// ================================================================
// الميزات:
// - عرض جميع الكتب المتاحة للمساعد حسب صلاحياته
// - بحث متقدم (عنوان، وصف، اسم الكورس)
// - فلترة حسب الحالة (منشور/مسودة)، الكورس
// - ترتيب حسب الأحدث، الأقدم، الأكثر تنزيلاً، الأكثر مشاهدة، العنوان
// - إحصائيات سريعة (إجمالي، منشور، مسودة، إجمالي التنزيلات)
// - أزرار ديناميكية حسب الصلاحيات (عرض، نشر/إلغاء النشر، تحميل، تعديل، حذف)
// - مودال تأكيد الحذف
// - دعم كامل للوضعين الفاتح والداكن مع وضوح تام للخطوط
// - Glassmorphism فاخر وأنيميشن سلس
// - منع التحميل اللانهائي
// ================================================================

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

// ================================================================
// 1. عداد متحرك
// ================================================================
const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

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
  }, [isVisible, target, duration]);

  return <span ref={ref} className="font-extrabold">{count}{suffix}</span>;
};

// ================================================================
// 2. بطاقة إحصائية
// ================================================================
const StatCard = ({ stat, styles }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative ${styles.card} border ${styles.border} rounded-2xl p-5 ${styles.hover} transition-all duration-300 hover:shadow-2xl ${styles.shadow} overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`${styles.subtext} text-sm font-medium`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1 tracking-tight`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && (
            <p className={`text-xs ${styles.subtext} mt-1 opacity-70`}>{stat.sub}</p>
          )}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: hovered ? '100%' : '70%' }}
          transition={{ duration: 0.8 }}
        />
      </div>
    </motion.div>
  );
};

// ================================================================
// 3. حقل الإدخال للبحث
// ================================================================
const SearchInput = ({ value, onChange, placeholder, styles }) => {
  const [isFocused, setIsFocused] = useState(false);
  return (
    <div className="relative flex-1 min-w-[180px]">
      <Icons.Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-300 ${
        isFocused ? 'text-purple-400' : 'text-gray-400'
      }`} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        placeholder={placeholder}
        className={`w-full p-2.5 pr-11 ${styles.input} border ${
          isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : 'border-gray-200 dark:border-white/20'
        } rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm`}
      />
    </div>
  );
};

// ================================================================
// 4. مكون فلترة
// ================================================================
const FilterSelect = ({ value, onChange, options, styles }) => {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition appearance-none text-sm min-w-[120px]`}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
};

// ================================================================
// 5. بطاقة الكتاب
// ================================================================
const BookCard = ({ book, courses, permissions, styles, onView, onEdit, onDelete, onTogglePublish, onDownload }) => {
  const [isHovered, setIsHovered] = useState(false);

  // صلاحيات الكتاب
  const canEdit = permissions.some(p => p.module === 'books' && (p.can_edit || p.can_manage));
  const canDelete = permissions.some(p => p.module === 'books' && (p.can_delete || p.can_manage));
  const canPublish = permissions.some(p => p.module === 'books' && (p.can_publish || p.can_manage));
  const canDownload = permissions.some(p => p.module === 'books' && (p.can_edit || p.can_manage || p.can_view));

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const courseTitle = courses.find(c => c.id === book.course_id)?.title || 'بدون كورس';

  // تحديد ما إذا كان الكتاب يحتوي على محتوى (لتفعيل زر التحميل)
  const hasContent = !!book.content;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative ${styles.card} border ${styles.border} rounded-2xl overflow-hidden ${styles.hover} transition-all duration-500 hover:shadow-2xl ${styles.shadow}`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-purple-400/5 via-transparent to-transparent rounded-2xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative z-10 p-5">
        <div className="flex flex-col gap-3">
          {/* الرأس: العنوان والحالة */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h3 className={`text-lg font-bold ${styles.text} group-hover:text-purple-400 transition-colors cursor-pointer`}>
                {book.title}
              </h3>
              {book.description && (
                <p className={`text-sm ${styles.subtext} mt-1 line-clamp-2`}>
                  {book.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full border ${
                  book.is_published
                    ? 'bg-green-500/20 text-green-400 border-green-400/30'
                    : 'bg-gray-500/20 text-gray-400 border-gray-400/30'
                }`}
              >
                {book.is_published ? '📢 منشور' : '📝 مسودة'}
              </span>
              {book.cover_image && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 border border-purple-400/30">
                  🖼️ غلاف
                </span>
              )}
              {hasContent && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-400/30">
                  📄 محتوى
                </span>
              )}
            </div>
          </div>

          {/* المعلومات المصغرة */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
              <Icons.BookOpen className="h-3.5 w-3.5" />
              {courseTitle}
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
              <Icons.Eye className="h-3.5 w-3.5" />
              {book.views || 0} مشاهدة
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
              <Icons.Download className="h-3.5 w-3.5" />
              {book.downloads || 0} تحميل
            </span>
            <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
              <Icons.Calendar className="h-3.5 w-3.5" />
              {formatDate(book.created_at)}
            </span>
          </div>

          {/* معلومات إضافية (المرحلة والصف) */}
          {(book.grade_stage || book.grade_level) && (
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Icons.GraduationCap className="h-3.5 w-3.5" />
              <span>
                {book.grade_stage || ''} {book.grade_level ? `- الصف ${book.grade_level}` : ''}
              </span>
            </div>
          )}

          {/* الأزرار (تظهر حسب الصلاحيات) */}
          <div className="flex flex-wrap items-center gap-2 mt-2 pt-3 border-t border-white/5">
            <button
              onClick={() => onView(book.id)}
              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/30 transition flex items-center gap-1"
            >
              <Icons.Eye className="h-3 w-3" /> عرض
            </button>

            {canPublish && (
              <button
                onClick={() => onTogglePublish(book)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                  book.is_published
                    ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {book.is_published ? (
                  <Icons.EyeOff className="h-3 w-3" />
                ) : (
                  <Icons.Eye className="h-3 w-3" />
                )}
                {book.is_published ? 'إلغاء النشر' : 'نشر'}
              </button>
            )}

            {canDownload && book.is_published && hasContent && (
              <button
                onClick={() => onDownload(book.id)}
                className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/30 transition flex items-center gap-1"
              >
                <Icons.Download className="h-3 w-3" /> تحميل
              </button>
            )}

            {canEdit && (
              <button
                onClick={() => onEdit(book.id)}
                className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition flex items-center gap-1"
              >
                <Icons.Edit className="h-3 w-3" /> تعديل
              </button>
            )}

            {canDelete && (
              <button
                onClick={() => onDelete(book.id)}
                className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/30 transition flex items-center gap-1"
              >
                <Icons.Trash2 className="h-3 w-3" /> حذف
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 6. مودال تأكيد الحذف
// ================================================================
const DeleteModal = ({ isOpen, onClose, onConfirm, title }) => {
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
        className="bg-[#1a1f2e] dark:bg-[#1a1f2e] border border-white/10 rounded-3xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <Icons.AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">تأكيد الحذف</h3>
          <p className="text-gray-400 text-sm mb-6">
            هل أنت متأكد من حذف "{title}"؟ هذا الإجراء لا يمكن التراجع عنه.
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
              تأكيد الحذف
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 7. الصفحة الرئيسية
// ================================================================
export default function AssistantBooksPage() {
  const router = useRouter();
  const { theme, toggleTheme, styles } = useTheme();

  // ===== حالات البيانات =====
  const [books, setBooks] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);

  // ===== حالات البحث والفلترة =====
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCourse, setFilterCourse] = useState('all');
  const [sortBy, setSortBy] = useState('newest');

  // ===== حالات العمليات =====
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    drafts: 0,
    totalDownloads: 0,
  });

  // ===== التحقق من الصلاحيات =====
  const hasPermission = useCallback((module, permission) => {
    if (!permissions || permissions.length === 0) return false;
    const perm = permissions.find(p => p.module === module);
    return perm?.[permission] || perm?.can_manage || false;
  }, [permissions]);

  const canCreate = useCallback(() => {
    return hasPermission('books', 'can_create');
  }, [hasPermission]);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setDataReady(false);

      // 1. جلب بيانات المساعد
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        router.replace('/assistant-login');
        return;
      }

      const parsed = JSON.parse(sessionData);
      setAssistant(parsed);

      // 2. جلب الصلاحيات
      const { data: permsData, error: permsError } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('assistant_id', parsed.id);

      if (permsError) throw permsError;
      setPermissions(permsData || []);

      // 3. التحقق من صلاحية العرض
      const hasView = permsData?.some(p => p.module === 'books' && (p.can_view || p.can_manage));
      if (!hasView) {
        toast.error('غير مصرح لك بمشاهدة الكتب');
        router.push('/dashboard/assistant');
        return;
      }

      const teacherId = parsed.teacher_id;
      if (!teacherId) {
        toast.error('لا يوجد معلم مرتبط بهذا المساعد');
        router.push('/dashboard/assistant');
        return;
      }

      // 4. جلب الكورسات
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', teacherId)
        .order('title');

      setCourses(coursesData || []);

      // 5. جلب الكتب
      const { data: booksData, error: booksError } = await supabase
        .from('books')
        .select('*')
        .eq('teacher_id', teacherId)
        .order('created_at', { ascending: false });

      if (booksError) throw booksError;

      setBooks(booksData || []);

      // 6. حساب الإحصائيات
      const total = booksData?.length || 0;
      const published = booksData?.filter(b => b.is_published).length || 0;
      const drafts = total - published;
      const totalDownloads = booksData?.reduce((acc, b) => acc + (b.downloads || 0), 0) || 0;

      setStats({ total, published, drafts, totalDownloads });
      setDataReady(true);

    } catch (err) {
      console.error('❌ خطأ في جلب الكتب:', err);
      toast.error('فشل جلب الكتب');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== الفلترة والبحث والترتيب =====
  const filteredBooks = useMemo(() => {
    if (!dataReady) return [];

    let result = [...books];

    // بحث
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(b =>
        b.title.toLowerCase().includes(q) ||
        b.description?.toLowerCase().includes(q)
      );
    }

    // فلترة حسب الحالة
    if (filterStatus !== 'all') {
      result = result.filter(b => b.is_published === (filterStatus === 'published'));
    }

    // فلترة حسب الكورس
    if (filterCourse !== 'all') {
      result = result.filter(b => b.course_id === filterCourse);
    }

    // ترتيب
    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'downloads':
        result.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
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
  }, [books, searchQuery, filterStatus, filterCourse, sortBy, dataReady]);

  // ===== العمليات =====
  const handleView = (id) => {
    router.push(`/dashboard/assistant/books/${id}`);
  };

  const handleEdit = (id) => {
    router.push(`/dashboard/assistant/books/${id}/edit`);
  };

  const handleDelete = (id) => {
    if (!hasPermission('books', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الكتب');
      return;
    }
    const book = books.find(b => b.id === id);
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

      toast.success('✅ تم حذف الكتاب');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('❌ خطأ في حذف الكتاب:', err);
      toast.error('فشل حذف الكتاب');
    }
  };

  const handleTogglePublish = async (book) => {
    if (!hasPermission('books', 'can_publish')) {
      toast.error('ليس لديك صلاحية لتغيير حالة النشر');
      return;
    }

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
      fetchData();
    } catch (err) {
      console.error('❌ خطأ في تغيير حالة النشر:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleDownload = async (id) => {
    if (!hasPermission('books', 'can_view') && !hasPermission('books', 'can_edit') && !hasPermission('books', 'can_manage')) {
      toast.error('ليس لديك صلاحية لتحميل الكتب');
      return;
    }

    const book = books.find(b => b.id === id);
    if (!book || !book.content) {
      toast.error('هذا الكتاب لا يحتوي على محتوى قابل للتحميل');
      return;
    }

    try {
      // تحديث عدد مرات التحميل
      await supabase
        .from('books')
        .update({
          downloads: (book.downloads || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      // هنا يمكن إضافة منطق تحميل الكتاب الفعلي (مثل تحويل المحتوى إلى PDF أو تنزيله)
      // حالياً سنعرض رسالة نجاح ونفتح المحتوى في نافذة جديدة
      toast.success('✅ جاري تحميل الكتاب... (سيتم تنفيذ هذه الميزة بشكل كامل لاحقاً)');

      // يمكن فتح المحتوى في نافذة جديدة
      if (book.content) {
        const win = window.open('', '_blank');
        if (win) {
          win.document.write(`
            <html>
              <head>
                <title>${book.title}</title>
                <style>
                  body { direction: rtl; font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: auto; line-height: 1.8; }
                  h1 { color: #8b5cf6; }
                  .content { margin-top: 20px; }
                </style>
              </head>
              <body>
                <h1>📖 ${book.title}</h1>
                <div class="content">${book.content}</div>
              </body>
            </html>
          `);
          win.document.close();
        }
      }

      fetchData();
    } catch (err) {
      console.error('❌ خطأ في تحميل الكتاب:', err);
      toast.error('فشل تحميل الكتاب');
    }
  };

  // ===== إحصائيات البطاقات =====
  const statsData = [
    {
      id: 1,
      label: 'إجمالي الكتب',
      value: stats.total,
      icon: Icons.BookOpen,
      color: 'from-blue-400 to-blue-600',
      delay: 0,
    },
    {
      id: 2,
      label: 'منشور',
      value: stats.published,
      icon: Icons.CheckCircle,
      color: 'from-green-400 to-green-600',
      delay: 0.1,
    },
    {
      id: 3,
      label: 'مسودات',
      value: stats.drafts,
      icon: Icons.FileText,
      color: 'from-gray-400 to-gray-600',
      delay: 0.2,
    },
    {
      id: 4,
      label: 'إجمالي التنزيلات',
      value: stats.totalDownloads,
      icon: Icons.Download,
      color: 'from-purple-400 to-purple-600',
      delay: 0.3,
    },
  ];

  // ===== حالة التحميل =====
  if (loading || !dataReady) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
            </div>
          </div>
          <p className={`text-sm ${styles.subtext} animate-pulse`}>
            جاري تحميل الكتب...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden`}>
      <div className="max-w-7xl mx-auto">
        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Icons.Book className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className={`text-3xl font-extrabold ${styles.text}`}>📚 الكتب</h1>
                <p className={`text-sm ${styles.subtext} mt-1`}>
                  إدارة الكتب والمذكرات التعليمية • {filteredBooks.length} كتاب
                  {assistant && (
                    <span className="mr-2 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-400/20">
                      {assistant.display_name || assistant.full_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
            {canCreate() && (
              <Link
                href="/dashboard/assistant/books/new"
                className="px-5 py-2.5 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-purple-500/20 flex items-center gap-2"
              >
                <Icons.Plus className="h-5 w-5" /> كتاب جديد
              </Link>
            )}
          </div>
        </div>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {statsData.map((stat) => (
            <StatCard key={stat.id} stat={stat} styles={styles} />
          ))}
        </div>

        {/* ===== البحث والفلترة ===== */}
        <div className="flex flex-col md:flex-row gap-3 mb-6 flex-wrap">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="ابحث عن كتاب (عنوان أو وصف)..."
            styles={styles}
          />
          <FilterSelect
            value={filterStatus}
            onChange={setFilterStatus}
            options={[
              { value: 'all', label: 'كل الحالات' },
              { value: 'published', label: 'منشور' },
              { value: 'draft', label: 'مسودة' },
            ]}
            styles={styles}
          />
          <FilterSelect
            value={filterCourse}
            onChange={setFilterCourse}
            options={[
              { value: 'all', label: 'كل الكورسات' },
              ...courses.map(c => ({ value: c.id, label: c.title })),
            ]}
            styles={styles}
          />
          <FilterSelect
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: 'newest', label: 'الأحدث' },
              { value: 'oldest', label: 'الأقدم' },
              { value: 'downloads', label: 'الأكثر تنزيلاً' },
              { value: 'views', label: 'الأكثر مشاهدة' },
              { value: 'title', label: 'العنوان' },
            ]}
            styles={styles}
          />
        </div>

        {/* ===== قائمة الكتب ===== */}
        {filteredBooks.length === 0 ? (
          <div className={`${styles.card} border ${styles.border} rounded-3xl p-12 text-center`}>
            <Icons.Book className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className={`text-xl font-semibold ${styles.text}`}>
              {searchQuery || filterStatus !== 'all' || filterCourse !== 'all'
                ? 'لا توجد نتائج تطابق البحث'
                : 'لا توجد كتب متاحة'}
            </h3>
            <p className={`${styles.subtext} text-sm mt-2`}>
              {searchQuery || filterStatus !== 'all' || filterCourse !== 'all'
                ? 'حاول تغيير معايير البحث'
                : 'سيظهر هنا الكتب المتاحة لك'}
            </p>
            {canCreate() && !searchQuery && filterStatus === 'all' && filterCourse === 'all' && (
              <Link
                href="/dashboard/assistant/books/new"
                className="mt-4 inline-block px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition"
              >
                إنشاء أول كتاب
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredBooks.map((book) => (
              <BookCard
                key={book.id}
                book={book}
                courses={courses}
                permissions={permissions}
                styles={styles}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onTogglePublish={handleTogglePublish}
                onDownload={handleDownload}
              />
            ))}
          </div>
        )}

        {/* ===== تذييل ===== */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className={`text-[10px] ${styles.subtext} opacity-60`}>
            © 2026 منصة محمد رضوان • جميع الحقوق محفوظة
          </p>
        </div>
      </div>

      {/* ===== مودال تأكيد الحذف ===== */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={deleteTarget?.title}
      />
    </div>
  );
}