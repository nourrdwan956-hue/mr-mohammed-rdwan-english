// app/dashboard/assistant/books/[id]/page.js
'use client';

// ================================================================
// 📚 تفاصيل الكتاب – إصدار متطور جداً V4
// ================================================================
// الميزات:
// - عرض جميع تفاصيل الكتاب (العنوان، الوصف، المحتوى، الغلاف، الكورس، المرحلة، الصف، التواريخ)
// - عرض المحتوى بتنسيق HTML مع دعم Rich Text
// - إحصائيات سريعة (المشاهدات، التنزيلات، تاريخ الإنشاء، آخر تحديث)
// - معاينة غلاف الكتاب إن وجد
// - أزرار ديناميكية حسب الصلاحيات (تعديل، نشر/إلغاء النشر، تحميل، حذف)
// - مودال تأكيد الحذف
// - دعم كامل للوضعين الفاتح والداكن مع وضوح تام للخطوط
// - Glassmorphism فاخر وأنيميشن سلس
// - منع التحميل اللانهائي
// ================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
// 2. بطاقة إحصائية صغيرة
// ================================================================
const StatCard = ({ stat, styles }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative ${styles.card} border ${styles.border} rounded-2xl p-4 ${styles.hover} transition-all duration-300 hover:shadow-2xl ${styles.shadow} overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
          <stat.icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className={`text-xs ${styles.subtext} opacity-70`}>{stat.label}</p>
          <p className={`text-xl font-extrabold ${styles.text}`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 3. مودال تأكيد الحذف
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
// 4. الصفحة الرئيسية
// ================================================================
export default function AssistantBookDetailPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id;
  const { theme, toggleTheme, styles } = useTheme();

  // ===== حالات البيانات =====
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [book, setBook] = useState(null);
  const [course, setCourse] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // ===== التحقق من الصلاحيات =====
  const hasPermission = useCallback((module, permission) => {
    if (!permissions || permissions.length === 0) return false;
    const perm = permissions.find(p => p.module === module);
    return perm?.[permission] || perm?.can_manage || false;
  }, [permissions]);

  const canEdit = useCallback(() => {
    return hasPermission('books', 'can_edit');
  }, [hasPermission]);

  const canDelete = useCallback(() => {
    return hasPermission('books', 'can_delete');
  }, [hasPermission]);

  const canPublish = useCallback(() => {
    return hasPermission('books', 'can_publish');
  }, [hasPermission]);

  const canDownload = useCallback(() => {
    return hasPermission('books', 'can_view') || hasPermission('books', 'can_edit') || hasPermission('books', 'can_manage');
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
        toast.error('غير مصرح لك بمشاهدة تفاصيل الكتاب');
        router.push('/dashboard/assistant');
        return;
      }

      const teacherId = parsed.teacher_id;
      if (!teacherId) {
        toast.error('لا يوجد معلم مرتبط بهذا المساعد');
        router.push('/dashboard/assistant');
        return;
      }

      // 4. جلب بيانات الكتاب
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .eq('teacher_id', teacherId)
        .single();

      if (bookError) {
        if (bookError.code === 'PGRST116') {
          toast.error('الكتاب غير موجود');
          router.push('/dashboard/assistant/books');
          return;
        }
        throw bookError;
      }

      setBook(bookData);

      // 5. جلب اسم الكورس
      if (bookData.course_id) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', bookData.course_id)
          .single();
        setCourse(courseData);
      }

      setDataReady(true);
    } catch (err) {
      console.error('❌ خطأ في جلب تفاصيل الكتاب:', err);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [bookId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== العمليات =====
  const handleTogglePublish = async () => {
    if (!canPublish()) {
      toast.error('ليس لديك صلاحية لتغيير حالة النشر');
      return;
    }

    try {
      const newStatus = !book.is_published;
      const { error } = await supabase
        .from('books')
        .update({
          is_published: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId);

      if (error) throw error;

      setBook(prev => ({ ...prev, is_published: newStatus }));
      toast.success(`✅ تم ${newStatus ? 'نشر' : 'إلغاء نشر'} الكتاب`);
    } catch (err) {
      console.error('❌ خطأ في تغيير حالة النشر:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleDelete = async () => {
    if (!canDelete()) {
      toast.error('ليس لديك صلاحية لحذف الكتب');
      return;
    }

    try {
      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      toast.success('✅ تم حذف الكتاب');
      setShowDeleteModal(false);
      router.push('/dashboard/assistant/books');
    } catch (err) {
      console.error('❌ خطأ في حذف الكتاب:', err);
      toast.error('فشل حذف الكتاب');
    }
  };

  const handleDownload = async () => {
    if (!canDownload()) {
      toast.error('ليس لديك صلاحية لتحميل الكتب');
      return;
    }

    if (!book || !book.content) {
      toast.error('هذا الكتاب لا يحتوي على محتوى قابل للتحميل');
      return;
    }

    setIsDownloading(true);
    try {
      // تحديث عدد مرات التحميل
      await supabase
        .from('books')
        .update({
          downloads: (book.downloads || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('id', bookId);

      // عرض المحتوى في نافذة جديدة
      const win = window.open('', '_blank');
      if (win) {
        win.document.write(`
          <html>
            <head>
              <title>${book.title}</title>
              <style>
                body {
                  direction: rtl;
                  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                  padding: 40px;
                  max-width: 800px;
                  margin: auto;
                  line-height: 1.8;
                  background: #f8f9fa;
                  color: #1a1a2e;
                }
                .header {
                  border-bottom: 2px solid #8b5cf6;
                  padding-bottom: 20px;
                  margin-bottom: 30px;
                }
                h1 {
                  color: #8b5cf6;
                  font-size: 28px;
                }
                .meta {
                  color: #666;
                  font-size: 14px;
                  margin-top: 10px;
                }
                .content {
                  margin-top: 20px;
                  font-size: 16px;
                }
                .content h2 { color: #4a1a6b; margin-top: 25px; }
                .content h3 { color: #6d2b8a; margin-top: 20px; }
                .content p { margin: 10px 0; }
                .content ul, .content ol { padding-right: 25px; }
                .footer {
                  margin-top: 40px;
                  padding-top: 20px;
                  border-top: 1px solid #ddd;
                  text-align: center;
                  color: #999;
                  font-size: 12px;
                }
                @media print {
                  body { background: white; padding: 20px; }
                }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>📖 ${book.title}</h1>
                <div class="meta">
                  <span>📚 ${course?.title || 'بدون كورس'}</span>
                  ${book.grade_stage ? ` • 🎓 ${book.grade_stage} ${book.grade_level ? `- الصف ${book.grade_level}` : ''}` : ''}
                </div>
              </div>
              <div class="content">${book.content}</div>
              <div class="footer">
                © ${new Date().getFullYear()} منصة محمد رضوان • جميع الحقوق محفوظة
              </div>
            </body>
          </html>
        `);
        win.document.close();
        toast.success('✅ تم فتح الكتاب');
      } else {
        toast.error('تعذر فتح الكتاب، يرجى السماح للنوافذ المنبثقة');
      }

      // تحديث البيانات محلياً
      setBook(prev => ({ ...prev, downloads: (prev.downloads || 0) + 1 }));
    } catch (err) {
      console.error('❌ خطأ في تحميل الكتاب:', err);
      toast.error('فشل تحميل الكتاب');
    } finally {
      setIsDownloading(false);
    }
  };

  // ===== تنسيق التاريخ =====
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
            جاري تحميل تفاصيل الكتاب...
          </p>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="text-center">
          <Icons.Book className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${styles.text}`}>الكتاب غير موجود</h2>
          <Link
            href="/dashboard/assistant/books"
            className="mt-4 inline-block px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition"
          >
            العودة للقائمة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden`}>
      <div className="max-w-4xl mx-auto">
        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Icons.Book className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className={`text-3xl font-extrabold ${styles.text}`}>📚 تفاصيل الكتاب</h1>
                <p className={`text-sm ${styles.subtext} mt-1`}>
                  {book.title}
                  {assistant && (
                    <span className="mr-2 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-400/20">
                      {assistant.display_name || assistant.full_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            <Link
              href="/dashboard/assistant/books"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition flex items-center gap-1"
            >
              <Icons.ArrowRight className="h-4 w-4" /> العودة
            </Link>
            {canEdit() && (
              <Link
                href={`/dashboard/assistant/books/${bookId}/edit`}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl text-sm transition flex items-center gap-1"
              >
                <Icons.Edit className="h-4 w-4" /> تعديل
              </Link>
            )}
            {canDelete() && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm transition flex items-center gap-1"
              >
                <Icons.Trash2 className="h-4 w-4" /> حذف
              </button>
            )}
          </div>
        </div>

        {/* ===== معاينة الغلاف (إن وجد) ===== */}
        {book.cover_image && (
          <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 mb-6 overflow-hidden`}>
            <div className="flex items-center gap-4">
              <div className="w-32 h-40 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-purple-500/20 to-purple-700/20">
                <img
                  src={book.cover_image}
                  alt={book.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src = '';
                    e.target.className = 'w-full h-full flex items-center justify-center text-gray-400';
                    e.target.alt = '🖼️';
                  }}
                />
              </div>
              <div className="flex-1">
                <p className={`text-sm ${styles.subtext} opacity-60`}>صورة الغلاف</p>
                <p className={`text-sm ${styles.text}`}>{book.title}</p>
                <p className={`text-xs ${styles.subtext} opacity-60 mt-1`}>
                  {course?.title || 'بدون كورس'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ===== إحصائيات سريعة ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { id: 'views', label: 'المشاهدات', value: book.views || 0, icon: Icons.Eye, color: 'from-blue-400 to-blue-600', delay: 0 },
            { id: 'downloads', label: 'التنزيلات', value: book.downloads || 0, icon: Icons.Download, color: 'from-green-400 to-green-600', delay: 0.1 },
            { id: 'created', label: 'تاريخ الإنشاء', value: formatDate(book.created_at), icon: Icons.Calendar, color: 'from-purple-400 to-purple-600', delay: 0.2 },
            { id: 'status', label: 'الحالة', value: book.is_published ? 'منشور' : 'مسودة', icon: Icons.CheckCircle, color: book.is_published ? 'from-green-400 to-green-600' : 'from-gray-400 to-gray-600', delay: 0.3 },
          ].map((stat, index) => (
            <StatCard key={stat.id} stat={{ ...stat, delay: index * 0.1, suffix: stat.suffix || '' }} styles={styles} />
          ))}
        </div>

        {/* ===== معلومات الكتاب ===== */}
        <div className={`${styles.card} border ${styles.border} rounded-2xl p-6 mb-6`}>
          <h2 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
            <Icons.Info className="h-5 w-5 text-purple-400" />
            معلومات الكتاب
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <p className={`text-xs ${styles.subtext} opacity-60`}>العنوان</p>
              <p className={`text-base font-semibold ${styles.text}`}>{book.title}</p>
            </div>

            <div className="md:col-span-2">
              <p className={`text-xs ${styles.subtext} opacity-60`}>الوصف</p>
              <p className={`text-sm ${styles.subtext} mt-1 leading-relaxed`}>
                {book.description || 'لا يوجد وصف'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>الكورس</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {course?.title || 'بدون كورس'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>الحالة</p>
              <span className={`inline-block text-xs px-3 py-1 rounded-full border ${
                book.is_published
                  ? 'bg-green-500/20 text-green-400 border-green-400/30'
                  : 'bg-gray-500/20 text-gray-400 border-gray-400/30'
              }`}>
                {book.is_published ? '✅ منشور' : '📝 مسودة'}
              </span>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>المرحلة</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {book.grade_stage || 'غير محدد'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>الصف</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {book.grade_level ? `الصف ${book.grade_level}` : 'غير محدد'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>عدد المشاهدات</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {book.views || 0}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>عدد التنزيلات</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {book.downloads || 0}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>تاريخ الإنشاء</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {formatDate(book.created_at)}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>آخر تحديث</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {formatDate(book.updated_at)}
              </p>
            </div>
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/5">
            {canPublish() && (
              <button
                onClick={handleTogglePublish}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1 ${
                  book.is_published
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {book.is_published ? (
                  <Icons.EyeOff className="h-4 w-4" />
                ) : (
                  <Icons.Eye className="h-4 w-4" />
                )}
                {book.is_published ? 'إلغاء النشر' : 'نشر الكتاب'}
              </button>
            )}

            {canDownload() && book.is_published && book.content && (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl text-sm transition flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDownloading ? (
                  <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                ) : (
                  <Icons.Download className="h-4 w-4" />
                )}
                {isDownloading ? 'جاري التحميل...' : 'تحميل الكتاب'}
              </button>
            )}

            {!book.is_published && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Icons.Info className="h-4 w-4" />
                غير منشور، لا يمكن تحميله
              </span>
            )}

            {book.is_published && !book.content && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Icons.Info className="h-4 w-4" />
                لا يوجد محتوى للتحميل
              </span>
            )}
          </div>
        </div>

        {/* ===== محتوى الكتاب ===== */}
        <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
          <h2 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
            <Icons.FileText className="h-5 w-5 text-purple-400" />
            محتوى الكتاب
          </h2>

          {book.content ? (
            <div
              className={`prose prose-invert max-w-none ${styles.text}`}
              style={{
                direction: 'rtl',
                color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
              }}
            >
              <div
                dangerouslySetInnerHTML={{ __html: book.content }}
                className="book-content"
                style={{
                  fontFamily: 'inherit',
                  lineHeight: 1.8,
                }}
              />
            </div>
          ) : (
            <div className="text-center py-8">
              <Icons.FileText className="h-12 w-12 text-gray-600 mx-auto mb-3" />
              <p className={`text-sm ${styles.subtext}`}>لا يوجد محتوى لهذا الكتاب</p>
              {canEdit() && (
                <Link
                  href={`/dashboard/assistant/books/${bookId}/edit`}
                  className="mt-3 inline-block text-xs text-purple-400 hover:text-purple-300 transition"
                >
                  أضف محتوى الآن
                </Link>
              )}
            </div>
          )}
        </div>

        {/* ===== تذييل ===== */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className={`text-[10px] ${styles.subtext} opacity-60`}>
            © 2026 منصة محمد رضوان • جميع الحقوق محفوظة
          </p>
        </div>
      </div>

      {/* ===== مودال تأكيد الحذف ===== */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={book?.title}
      />

      {/* ===== CSS مخصص لعرض المحتوى ===== */}
      <style jsx>{`
        .book-content {
          direction: rtl;
          font-size: 16px;
          line-height: 1.8;
        }
        .book-content h1, .book-content h2, .book-content h3 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        .book-content h1 { font-size: 2em; color: #8b5cf6; }
        .book-content h2 { font-size: 1.5em; color: #a78bfa; }
        .book-content h3 { font-size: 1.17em; color: #c4b5fd; }
        .book-content p { margin: 0.5em 0; }
        .book-content ul, .book-content ol { padding-right: 1.5em; margin: 0.5em 0; }
        .book-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 0.5em 0; }
        .book-content blockquote {
          border-right: 4px solid #8b5cf6;
          padding-right: 1em;
          margin: 0.5em 0;
          color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'};
          font-style: italic;
        }
        .book-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.5em 0;
        }
        .book-content table th, .book-content table td {
          border: 1px solid ${theme === 'dark' ? '#374151' : '#d1d5db'};
          padding: 0.5em;
          text-align: right;
        }
        .book-content table th {
          background: ${theme === 'dark' ? '#1f2937' : '#f3f4f6'};
          font-weight: bold;
        }
      `}</style>
    </div>
  );
}