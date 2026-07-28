// ============================================================
// app/dashboard/teacher/books/new/page.js
// إنشاء كتاب تفاعلي – النسخة الأسطورية V9.1 (مصححة)
// ✅ تم التعديل لاستخدام الثيم المركزي من useTheme
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
import dynamic from 'next/dynamic';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد

// ============================================================
// 1. تحميل محرر النصوص (متوافق مع React 19)
// ============================================================

const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-64 bg-white/5 border border-white/10 rounded-xl animate-pulse flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-8 h-8 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        <span className="text-gray-400 text-sm">جاري تحميل المحرر...</span>
      </div>
    </div>
  ),
});
import 'react-quill-new/dist/quill.snow.css';

// ============================================================
// 2. خلفية الجسيمات (أنيقة)
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
// 3. دوال مساعدة
// ============================================================

const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100);
};

const PAGE_TEMPLATES = {
  blank: { label: 'صفحة فارغة', icon: Icons.File, default: '<p><br></p>' },
  lesson: {
    label: 'درس تعليمي',
    icon: Icons.BookOpen,
    default: '<h2>عنوان الدرس</h2><p>محتوى الدرس...</p><ul><li>نقطة مهمة 1</li><li>نقطة مهمة 2</li></ul>',
  },
  exercise: {
    label: 'تدريبات',
    icon: Icons.Pencil,
    default: '<h2>تدريبات</h2><p><strong>السؤال 1:</strong> ...</p><p><strong>السؤال 2:</strong> ...</p>',
  },
  summary: {
    label: 'ملخص',
    icon: Icons.List,
    default: '<h2>ملخص الدرس</h2><ul><li>نقطة أساسية 1</li><li>نقطة أساسية 2</li></ul>',
  },
};

// ============================================================
// 4. مكون محرر الصفحة (داخلي)
// ============================================================

const PageEditor = ({ page, index, onUpdate, onDelete, onMove, totalPages }) => {
  const [content, setContent] = useState(page.content || '');
  const [title, setTitle] = useState(page.title || '');
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    onUpdate(index, { ...page, content, title });
  }, [content, title]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-4 hover:border-yellow-400/30 transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">صفحة {index + 1}</span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="عنوان الصفحة"
            className="bg-transparent border border-white/10 rounded-lg px-3 py-1 text-white text-sm focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
          />
        </div>
        <div className="flex items-center gap-2">
          {index > 0 && (
            <button
              onClick={() => onMove(index, -1)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
              title="تحريك لأعلى"
            >
              <Icons.ChevronUp className="h-4 w-4" />
            </button>
          )}
          {index < totalPages - 1 && (
            <button
              onClick={() => onMove(index, 1)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition text-gray-400 hover:text-white"
              title="تحريك لأسفل"
            >
              <Icons.ChevronDown className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => onDelete(index)}
            className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-red-400 hover:text-red-300"
            title="حذف الصفحة"
          >
            <Icons.Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      <ReactQuill
        theme="snow"
        value={content}
        onChange={setContent}
        placeholder="اكتب محتوى الصفحة هنا..."
        modules={{
          toolbar: [
            [{ header: [1, 2, 3, 4, 5, 6, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ list: 'ordered' }, { list: 'bullet' }],
            ['link', 'image', 'video'],
            ['clean'],
          ],
        }}
        className="bg-[#0b0e1a] rounded-xl text-white"
      />
    </motion.div>
  );
};

// ============================================================
// 5. مكون معاينة الكتاب (Live Preview)
// ============================================================

const BookPreview = ({ formData, pages }) => {
  const hasImage = formData.cover_image && formData.cover_image.length > 0;
  const pagesCount = pages.length;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden hover:border-yellow-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10"
    >
      <div className="aspect-[3/4] bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center relative">
        {hasImage ? (
          <img
            src={formData.cover_image}
            alt={formData.title || 'صورة الكتاب'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Icons.BookOpen className="h-16 w-16 text-gray-500/50" />
            <span className="text-sm text-gray-400">لا توجد صورة</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/80 text-white border border-gray-400/30">
            مسودة (معاينة)
          </span>
        </div>
        {formData.is_published && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/80 text-white border border-green-400/30">
              منشور
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className="text-lg font-bold text-white truncate">
          {formData.title || 'عنوان الكتاب'}
        </h3>
        <p className="text-sm text-gray-400 mt-1 line-clamp-2">
          {formData.description || 'وصف الكتاب سيظهر هنا'}
        </p>
        <div className="flex items-center justify-between mt-3 text-xs">
          <span className="text-gray-400">{pagesCount} صفحة</span>
          <span className="font-extrabold text-yellow-400">
            {formData.course_id ? 'مرتبط بكورس' : 'بدون كورس'}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// 6. الصفحة الرئيسية – إنشاء كتاب جديد
// ============================================================

export default function NewBookPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseIdParam = searchParams.get('course_id');
  // ✅ استخدام الثيم المركزي
  const { theme, styles } = useTheme();

  // ===== حالات النموذج =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: courseIdParam || '',
    cover_image: '',
    is_published: false,
  });

  const [pages, setPages] = useState([
    { title: 'الصفحة الأولى', content: '<h1>مرحباً بكم في الكتاب التفاعلي</h1><p>ابدأ بكتابة المحتوى الخاص بك هنا...</p>' },
  ]);

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [slugPreview, setSlugPreview] = useState('');

  // ===== تحديث المعاينة المباشرة للـ slug =====
  useEffect(() => {
    if (formData.title.trim()) {
      setSlugPreview(generateSlug(formData.title.trim()));
    } else {
      setSlugPreview('');
    }
  }, [formData.title]);

  // ===== جلب الكورسات =====
  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }
        const { data, error } = await supabase
          .from('courses')
          .select('id, title')
          .eq('teacher_id', user.id)
          .eq('is_published', true)
          .order('title');

        if (error) throw error;
        setCourses(data || []);

        // إذا كان هناك course_id في URL ولم يكن في القائمة، نضيفه (للكورسات غير المنشورة)
        if (courseIdParam && !data?.some(c => c.id === courseIdParam)) {
          const { data: single } = await supabase
            .from('courses')
            .select('id, title')
            .eq('id', courseIdParam)
            .eq('teacher_id', user.id)
            .single();
          if (single) {
            setCourses(prev => [single, ...prev]);
          }
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        toast.error('فشل جلب الكورسات');
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
  }, [router, courseIdParam]);

  // ===== دوال النموذج =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ===== دوال إدارة الصفحات =====
  const addPage = useCallback(
    (template = 'blank') => {
      const templateData = PAGE_TEMPLATES[template] || PAGE_TEMPLATES.blank;
      setPages((prev) => [
        ...prev,
        {
          title: `صفحة ${prev.length + 1}`,
          content: templateData.default || '<p><br></p>',
        },
      ]);
    },
    []
  );

  const updatePage = useCallback((index, pageData) => {
    setPages((prev) => prev.map((p, i) => (i === index ? pageData : p)));
  }, []);

  const deletePage = useCallback(
    (index) => {
      if (pages.length <= 1) {
        toast.error('يجب أن يكون هناك صفحة واحدة على الأقل');
        return;
      }
      setPages((prev) => prev.filter((_, i) => i !== index));
    },
    [pages.length]
  );

  const movePage = useCallback(
    (index, direction) => {
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= pages.length) return;
      setPages((prev) => {
        const result = [...prev];
        const [removed] = result.splice(index, 1);
        result.splice(newIndex, 0, removed);
        return result;
      });
    },
    [pages.length]
  );

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'عنوان الكتاب مطلوب';
    if (!formData.description.trim()) errors.description = 'الوصف مطلوب';
    if (pages.some((p) => !p.content || p.content === '<p><br></p>')) {
      errors.pages = 'جميع الصفحات يجب أن تحتوي على محتوى';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== إنشاء الكتاب =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // إنشاء Slug
      let slug = generateSlug(formData.title.trim());
      const { data: existing } = await supabase
        .from('books')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      const bookData = {
        teacher_id: user.id,
        course_id: formData.course_id || null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        cover_image: formData.cover_image || null,
        slug: slug,
        content: JSON.stringify(pages),
        is_published: formData.is_published || false,
        views: 0,
        downloads: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('books')
        .insert(bookData)
        .select()
        .single();

      if (error) throw error;

      setSuccess('✅ تم إنشاء الكتاب بنجاح!');
      toast.success('تم إنشاء الكتاب بنجاح!');
      setTimeout(() => {
        router.push(`/dashboard/teacher/books/${data.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating book:', err);
      setError('فشل إنشاء الكتاب: ' + err.message);
      toast.error('فشل إنشاء الكتاب');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== دوال التنقل =====
  const goBack = () => {
    if (courseIdParam) {
      router.push(`/dashboard/teacher/courses/${courseIdParam}`);
    } else {
      router.push('/dashboard/teacher/books');
    }
  };

  return (
    <TeacherLayout>
      <div className="relative">
        <ParticleBackground />

        <div className="relative z-10">
          {/* ===== رأس الصفحة ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-extrabold text-white">📖 إنشاء كتاب جديد</h1>
              <p className="text-gray-400 text-sm mt-1">
                أنشئ كتاباً تفاعلياً مع صفحات متعددة ومحتوى غني
                {courseIdParam && courses.find((c) => c.id === courseIdParam) && (
                  <span className="text-yellow-400">
                    {' – '}
                    {courses.find((c) => c.id === courseIdParam)?.title}
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={goBack}
              className="mt-3 md:mt-0 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm hover:border-yellow-400/50 transition flex items-center gap-2"
            >
              <Icons.ArrowRight className="h-4 w-4" /> العودة
            </button>
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
              </motion.div>
            )}
          </AnimatePresence>

          {/* ===== نموذج الإنشاء مع معاينة ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-yellow-400/30 transition-all duration-500">
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* المعلومات الأساسية */}
                  <div>
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                      <Icons.BookOpen className="h-5 w-5 text-yellow-400" /> المعلومات الأساسية
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                          عنوان الكتاب <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="text"
                          name="title"
                          value={formData.title}
                          onChange={handleChange}
                          placeholder="مثال: ملزمة جرامر الترم الأول"
                          className={`w-full p-3 bg-white/10 border ${
                            formErrors.title ? 'border-red-500' : 'border-white/20'
                          } rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        />
                        {formErrors.title && (
                          <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          المعرف الفريد للكتاب:{' '}
                          <span className="text-yellow-400 font-mono">{slugPreview || '(سيتولد تلقائياً)'}</span>
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">
                          الوصف <span className="text-red-400">*</span>
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows="3"
                          placeholder="وصف مختصر للكتاب ومحتوياته"
                          className={`w-full p-3 bg-white/10 border ${
                            formErrors.description ? 'border-red-500' : 'border-white/20'
                          } rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition resize-none`}
                        />
                        {formErrors.description && (
                          <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">الكورس المرتبط (اختياري)</label>
                        <select
                          name="course_id"
                          value={formData.course_id}
                          onChange={handleChange}
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 outline-none transition appearance-none"
                          disabled={loadingCourses}
                        >
                          <option value="">بدون كورس</option>
                          {courses.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.title}
                            </option>
                          ))}
                        </select>
                        {loadingCourses && <p className="text-xs text-gray-500 mt-1">جاري تحميل الكورسات...</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1.5">رابط صورة الغلاف (اختياري)</label>
                        <input
                          type="text"
                          name="cover_image"
                          value={formData.cover_image}
                          onChange={handleChange}
                          placeholder="https://example.com/book-cover.jpg"
                          className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
                        />
                      </div>
                    </div>
                  </div>

                  {/* إدارة الصفحات */}
                  <div className="pt-4 border-t border-white/5">
                    <div className="flex flex-wrap items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Icons.BookOpen className="h-5 w-5 text-yellow-400" /> الصفحات ({pages.length})
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => addPage('blank')}
                          className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-sm hover:bg-blue-500/30 transition flex items-center gap-1"
                        >
                          <Icons.Plus className="h-4 w-4" /> صفحة فارغة
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowTemplateModal(true)}
                          className="px-3 py-1.5 bg-purple-500/20 text-purple-400 rounded-xl text-sm hover:bg-purple-500/30 transition flex items-center gap-1"
                        >
                          <Icons.Layout className="h-4 w-4" /> قوالب
                        </button>
                      </div>
                    </div>

                    <AnimatePresence>
                      {pages.map((page, index) => (
                        <PageEditor
                          key={index}
                          page={page}
                          index={index}
                          onUpdate={updatePage}
                          onDelete={deletePage}
                          onMove={movePage}
                          totalPages={pages.length}
                        />
                      ))}
                    </AnimatePresence>
                    {formErrors.pages && <p className="text-red-400 text-xs mt-1">{formErrors.pages}</p>}
                  </div>

                  {/* خيارات النشر */}
                  <div className="pt-4 border-t border-white/5 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_published"
                        checked={formData.is_published}
                        onChange={handleChange}
                        className="w-5 h-5 accent-yellow-400 rounded"
                      />
                      <span className="text-sm text-gray-300">نشر الكتاب فوراً</span>
                    </label>
                  </div>

                  {/* أزرار الإرسال */}
                  <div className="flex flex-wrap gap-4 pt-4 border-t border-white/5">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2 disabled:opacity-70"
                    >
                      {submitting ? (
                        <>
                          <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          جاري الإنشاء...
                        </>
                      ) : (
                        <>
                          <Icons.Plus className="h-5 w-5" /> إنشاء الكتاب
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={goBack}
                      className="px-6 py-3 bg-white/5 border border-white/10 text-white rounded-xl hover:bg-white/10 transition"
                    >
                      إلغاء
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* ===== المعاينة الجانبية ===== */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 space-y-4">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Icons.Eye className="h-4 w-4 text-yellow-400" /> معاينة الكتاب
                </h3>
                <BookPreview formData={formData} pages={pages} />
                <p className="text-[10px] text-gray-500 text-center">
                  هذه معاينة تقريبية للكتاب بعد الإنشاء
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== نافذة القوالب ===== */}
      <AnimatePresence>
        {showTemplateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => setShowTemplateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-[#1a1f2e] border border-white/10 rounded-3xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">اختر قالباً للصفحة</h3>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl transition text-gray-400"
                >
                  <Icons.X className="h-6 w-6" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(PAGE_TEMPLATES).map(([key, template]) => {
                  const Icon = template.icon;
                  return (
                    <button
                      key={key}
                      onClick={() => {
                        addPage(key);
                        setShowTemplateModal(false);
                      }}
                      className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center hover:border-yellow-400/50 transition-all duration-300 hover:bg-white/10 group"
                    >
                      <Icon className="h-10 w-10 text-yellow-400 mx-auto mb-3 group-hover:scale-110 transition" />
                      <h4 className="text-white font-semibold">{template.label}</h4>
                      <p className="text-xs text-gray-400 mt-1">إضافة صفحة جديدة بهذا القالب</p>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </TeacherLayout>
  );
}
// تم التعديل بنجاح في مرحلة الثيم