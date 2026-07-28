// app/dashboard/assistant/books/[id]/edit/page.js
'use client';

// ================================================================
// ✏️ تعديل الكتاب – إصدار متطور جداً V4
// ================================================================
// الميزات:
// - جلب بيانات الكتاب الحالية وعرضها في النموذج
// - تعديل جميع بيانات الكتاب (العنوان، الوصف، المحتوى، الكورس، المرحلة، الصف، صورة الغلاف، الحالة)
// - محرر Rich Text متقدم (react-quill-new) لتعديل المحتوى
// - رفع صورة غلاف جديدة مع حذف القديمة من التخزين
// - معاينة صورة الغلاف الحالية والجديدة
// - التحقق من صحة المدخلات
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
import dynamic from 'next/dynamic';

// استيراد المحرر بشكل ديناميكي لتجنب مشاكل SSR
const ReactQuill = dynamic(() => import('react-quill-new'), {
  ssr: false,
  loading: () => (
    <div className="h-64 w-full bg-white/5 rounded-xl animate-pulse flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
    </div>
  ),
});

// استيراد CSS الخاص بالمحرر
import 'react-quill-new/dist/quill.snow.css';

// ================================================================
// 1. مكون حقل الإدخال
// ================================================================
const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  icon: Icon,
  required = false,
  rows,
  options,
  isTextarea = false,
  isSelect = false,
  disabled = false,
}) => {
  const { styles } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [isTouched, setIsTouched] = useState(false);
  const hasError = error && isTouched;

  return (
    <div>
      <label className={`block text-sm font-medium ${styles.label} mb-1.5`} htmlFor={name}>
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="relative group">
        {Icon && !isSelect && !isTextarea && (
          <div className={`absolute right-3 top-1/2 -translate-y-1/2 transition-all duration-300 ${
            isFocused ? 'text-purple-400 scale-110' : 'text-gray-400'
          }`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        {isSelect ? (
          <select
            id={name}
            name={name}
            value={value}
            onChange={(e) => { onChange(e); setIsTouched(true); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            disabled={disabled}
            className={`w-full p-3 ${styles.input} border ${
              hasError ? 'border-red-400' : isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : 'border-gray-200 dark:border-white/20'
            } rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 appearance-none ${
              disabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <option value="">اختر...</option>
            {options?.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : isTextarea ? (
          <textarea
            id={name}
            name={name}
            rows={rows || 4}
            value={value}
            onChange={(e) => { onChange(e); setIsTouched(true); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full p-3 ${Icon ? 'pr-11' : 'pr-4'} ${styles.input} border ${
              hasError ? 'border-red-400' : isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : 'border-gray-200 dark:border-white/20'
            } rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-y ${
              disabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
        ) : (
          <input
            id={name}
            type={type}
            name={name}
            value={value}
            onChange={(e) => { onChange(e); setIsTouched(true); }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => { setIsFocused(false); setIsTouched(true); }}
            placeholder={placeholder}
            disabled={disabled}
            className={`w-full p-3 ${Icon ? 'pr-11' : 'pr-4'} ${styles.input} border ${
              hasError ? 'border-red-400' : isFocused ? 'border-purple-400 shadow-lg shadow-purple-400/10' : 'border-gray-200 dark:border-white/20'
            } rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500 ${
              disabled ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          />
        )}
        {isFocused && !disabled && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transform scale-x-0 origin-right transition-transform duration-300 group-focus-within:scale-x-100" />
        )}
      </div>
      <AnimatePresence>
        {hasError && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="text-red-400 text-xs mt-1"
          >
            {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
};

// ================================================================
// 2. مكون معاينة الصورة
// ================================================================
const ImagePreview = ({ imageUrl, onRemove, onReplace, styles, isUploading }) => {
  if (!imageUrl) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative w-32 h-40 rounded-2xl overflow-hidden border border-white/10 group"
    >
      <img src={imageUrl} alt="صورة الغلاف" className="w-full h-full object-cover" />
      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-2">
        <button
          onClick={onReplace}
          disabled={isUploading}
          className="p-2 rounded-full bg-blue-500/80 hover:bg-blue-600 text-white transition-all duration-300"
          title="تغيير الصورة"
        >
          <Icons.RefreshCw className="h-4 w-4" />
        </button>
        <button
          onClick={onRemove}
          disabled={isUploading}
          className="p-2 rounded-full bg-red-500/80 hover:bg-red-600 text-white transition-all duration-300"
          title="إزالة الصورة"
        >
          <Icons.X className="h-4 w-4" />
        </button>
      </div>
      {isUploading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
        </div>
      )}
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
export default function AssistantBookEditPage() {
  const router = useRouter();
  const params = useParams();
  const bookId = params.id;
  const { theme, toggleTheme, styles } = useTheme();

  // ===== حالات البيانات =====
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [originalBook, setOriginalBook] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ===== بيانات النموذج =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    course_id: '',
    grade_stage: '',
    grade_level: '',
    cover_image: null,
    existing_cover: null,
    is_published: false,
    slug: '',
  });

  // ===== أخطاء النموذج =====
  const [errors, setErrors] = useState({});

  // ===== معاينة الصورة =====
  const [previewUrl, setPreviewUrl] = useState(null);

  // ===== خيارات المرحلة والصف =====
  const gradeStages = ['ابتدائي', 'إعدادي', 'ثانوي'];
  const gradeLevels = {
    'ابتدائي': [1, 2, 3, 4, 5, 6],
    'إعدادي': [1, 2, 3],
    'ثانوي': [1, 2, 3],
  };

  // ===== إعدادات محرر النصوص =====
  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ color: [] }, { background: [] }],
      ['blockquote', 'code-block'],
      ['link', 'image', 'video'],
      ['clean'],
    ],
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list', 'bullet',
    'color', 'background',
    'blockquote', 'code-block',
    'link', 'image', 'video',
  ];

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

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setDataReady(false);

      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        router.replace('/assistant-login');
        return;
      }

      const parsed = JSON.parse(sessionData);
      setAssistant(parsed);

      const { data: permsData, error: permsError } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('assistant_id', parsed.id);

      if (permsError) throw permsError;
      setPermissions(permsData || []);

      const hasEdit = permsData?.some(p => p.module === 'books' && (p.can_edit || p.can_manage));
      if (!hasEdit) {
        toast.error('غير مصرح لك بتعديل الكتب');
        router.push('/dashboard/assistant/books');
        return;
      }

      // جلب الكورسات
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', parsed.teacher_id)
        .order('title');

      setCourses(coursesData || []);

      // جلب بيانات الكتاب
      const { data: bookData, error: bookError } = await supabase
        .from('books')
        .select('*')
        .eq('id', bookId)
        .eq('teacher_id', parsed.teacher_id)
        .single();

      if (bookError) {
        if (bookError.code === 'PGRST116') {
          toast.error('الكتاب غير موجود');
          router.push('/dashboard/assistant/books');
          return;
        }
        throw bookError;
      }

      setOriginalBook(bookData);

      // تعبئة النموذج
      setFormData({
        title: bookData.title || '',
        description: bookData.description || '',
        content: bookData.content || '',
        course_id: bookData.course_id || '',
        grade_stage: bookData.grade_stage || '',
        grade_level: bookData.grade_level?.toString() || '',
        cover_image: null,
        existing_cover: bookData.cover_image || null,
        is_published: bookData.is_published || false,
        slug: bookData.slug || '',
      });

      if (bookData.cover_image) {
        setPreviewUrl(bookData.cover_image);
      }

      setDataReady(true);
    } catch (err) {
      console.error('❌ خطأ في تحميل البيانات:', err);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [bookId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== معالجة تغيير الحقول =====
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === 'file') {
      const file = files?.[0];
      if (file) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error('حجم الصورة يتجاوز الحد الأقصى (5MB)');
          return;
        }
        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
          toast.error('صيغة الصورة غير مدعومة. الصيغ المدعومة: JPG, PNG, WEBP, GIF');
          return;
        }
        setFormData(prev => ({ ...prev, cover_image: file }));
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
      }
      return;
    }

    if (type === 'checkbox') {
      setFormData(prev => ({ ...prev, [name]: checked }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ===== معالجة تغيير المحتوى (Rich Text) =====
  const handleContentChange = (value) => {
    setFormData(prev => ({ ...prev, content: value }));
    if (errors.content) {
      setErrors(prev => ({ ...prev, content: '' }));
    }
  };

  // ===== معالجة تغيير المرحلة =====
  const handleGradeStageChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({
      ...prev,
      grade_stage: value,
      grade_level: '',
    }));
    if (errors.grade_stage) {
      setErrors(prev => ({ ...prev, grade_stage: '' }));
    }
  };

  // ===== إزالة الصورة =====
  const handleRemoveImage = async () => {
    if (formData.existing_cover) {
      try {
        const path = formData.existing_cover.split('/').pop();
        if (path) {
          await supabase.storage
            .from('book-covers')
            .remove([`book-covers/${path}`]);
        }
      } catch (err) {
        console.warn('⚠️ فشل حذف الصورة القديمة:', err);
      }
    }

    setFormData(prev => ({
      ...prev,
      cover_image: null,
      existing_cover: null,
    }));
    setPreviewUrl(null);
  };

  // ===== رفع صورة جديدة =====
  const uploadNewImage = async (file) => {
    if (!file) return null;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `book-covers/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('book-covers')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('book-covers')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('❌ خطأ في رفع الصورة:', err);
      throw new Error('فشل رفع صورة الغلاف');
    } finally {
      setIsUploading(false);
    }
  };

  // ===== التحقق من صحة النموذج =====
  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'العنوان مطلوب';
    } else if (formData.title.length < 3) {
      newErrors.title = 'العنوان يجب أن يكون 3 أحرف على الأقل';
    }

    if (!formData.course_id) {
      newErrors.course_id = 'الكورس مطلوب';
    }

    if (!formData.grade_stage) {
      newErrors.grade_stage = 'المرحلة مطلوبة';
    }

    if (!formData.grade_level) {
      newErrors.grade_level = 'الصف مطلوب';
    }

    if (!formData.content.trim() || formData.content === '<p><br></p>') {
      newErrors.content = 'محتوى الكتاب مطلوب';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== حفظ التعديلات =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('يرجى تصحيح الأخطاء في النموذج');
      return;
    }

    if (!canEdit()) {
      toast.error('ليس لديك صلاحية لتعديل الكتب');
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. معالجة الصورة
      let coverImageUrl = formData.existing_cover;

      if (formData.cover_image instanceof File) {
        if (formData.existing_cover) {
          try {
            const path = formData.existing_cover.split('/').pop();
            if (path) {
              await supabase.storage
                .from('book-covers')
                .remove([`book-covers/${path}`]);
            }
          } catch (err) {
            console.warn('⚠️ فشل حذف الصورة القديمة:', err);
          }
        }
        coverImageUrl = await uploadNewImage(formData.cover_image);
      }

      // 2. تحديث الكتاب
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        content: formData.content,
        course_id: formData.course_id,
        grade_stage: formData.grade_stage,
        grade_level: parseInt(formData.grade_level),
        is_published: formData.is_published,
        cover_image: coverImageUrl,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('books')
        .update(updateData)
        .eq('id', bookId);

      if (updateError) throw updateError;

      toast.success('✅ تم تحديث الكتاب بنجاح');
      router.push(`/dashboard/assistant/books/${bookId}`);
    } catch (err) {
      console.error('❌ خطأ في تحديث الكتاب:', err);
      toast.error(err.message || 'فشل تحديث الكتاب');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== حذف الكتاب =====
  const handleDelete = async () => {
    if (!canDelete()) {
      toast.error('ليس لديك صلاحية لحذف الكتب');
      return;
    }

    try {
      // حذف صورة الغلاف إن وجدت
      if (originalBook?.cover_image) {
        try {
          const path = originalBook.cover_image.split('/').pop();
          if (path) {
            await supabase.storage
              .from('book-covers')
              .remove([`book-covers/${path}`]);
          }
        } catch (err) {
          console.warn('⚠️ فشل حذف الصورة:', err);
        }
      }

      const { error } = await supabase
        .from('books')
        .delete()
        .eq('id', bookId);

      if (error) throw error;

      toast.success('✅ تم حذف الكتاب بنجاح');
      setShowDeleteModal(false);
      router.push('/dashboard/assistant/books');
    } catch (err) {
      console.error('❌ خطأ في حذف الكتاب:', err);
      toast.error('فشل حذف الكتاب');
    }
  };

  // ===== توليد الرابط المختصر =====
  const generateSlug = (title) => {
    return title
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\u0600-\u06FF\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 100);
  };

  // ===== تحديث الرابط المختصر تلقائياً =====
  useEffect(() => {
    if (formData.title && !formData.slug) {
      setFormData(prev => ({ ...prev, slug: generateSlug(prev.title) }));
    }
  }, [formData.title]);

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
            جاري تحميل بيانات الكتاب...
          </p>
        </div>
      </div>
    );
  }

  if (!canEdit()) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="text-center">
          <Icons.Shield className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${styles.text}`}>غير مصرح لك</h2>
          <p className={`${styles.subtext} text-sm mt-2`}>
            لا تملك صلاحية لتعديل هذا الكتاب
          </p>
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
              <Icons.Edit className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className={`text-3xl font-extrabold ${styles.text}`}>✏️ تعديل الكتاب</h1>
                <p className={`text-sm ${styles.subtext} mt-1`}>
                  {formData.title || 'تعديل بيانات الكتاب'}
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
            {canDelete() && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm transition flex items-center gap-1"
              >
                <Icons.Trash2 className="h-4 w-4" /> حذف
              </button>
            )}
            <Link
              href={`/dashboard/assistant/books/${bookId}`}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition flex items-center gap-1"
            >
              <Icons.ArrowRight className="h-4 w-4" /> العودة
            </Link>
          </div>
        </div>

        {/* ===== النموذج ===== */}
        <form onSubmit={handleSubmit} className={`${styles.card} border ${styles.border} rounded-3xl p-6 space-y-5`}>
          {/* العنوان */}
          <FormInput
            label="العنوان"
            name="title"
            value={formData.title}
            onChange={handleChange}
            error={errors.title}
            placeholder="مثال: مذكرة النحو للصف الثالث الابتدائي"
            icon={Icons.BookOpen}
            required
          />

          {/* الرابط المختصر */}
          <div>
            <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
              الرابط المختصر
            </label>
            <div className={`p-3 ${styles.input} border ${styles.border} rounded-xl bg-white/5 text-sm text-gray-400`}>
              {formData.title ? generateSlug(formData.title) : formData.slug || 'سيتم إنشاؤه تلقائياً'}
            </div>
            <p className={`text-[10px] ${styles.subtext} opacity-60 mt-1`}>
              يتم إنشاء الرابط تلقائياً من العنوان
            </p>
          </div>

          {/* الوصف */}
          <FormInput
            label="الوصف"
            name="description"
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            placeholder="وصف مختصر عن الكتاب..."
            icon={Icons.FileText}
            isTextarea
            rows={3}
          />

          {/* الكورس */}
          <FormInput
            label="الكورس"
            name="course_id"
            value={formData.course_id}
            onChange={handleChange}
            error={errors.course_id}
            isSelect
            options={courses.map(c => ({ value: c.id, label: c.title }))}
            required
          />

          {/* المرحلة والصف */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormInput
              label="المرحلة"
              name="grade_stage"
              value={formData.grade_stage}
              onChange={handleGradeStageChange}
              error={errors.grade_stage}
              isSelect
              options={gradeStages.map(g => ({ value: g, label: g }))}
              required
            />

            <FormInput
              label="الصف"
              name="grade_level"
              value={formData.grade_level}
              onChange={handleChange}
              error={errors.grade_level}
              isSelect
              options={formData.grade_stage ? gradeLevels[formData.grade_stage]?.map(l => ({ value: l.toString(), label: `الصف ${l}` })) || [] : []}
              required
            />
          </div>

          {/* صورة الغلاف */}
          <div>
            <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
              صورة الغلاف (اختياري)
            </label>
            <div className="flex flex-wrap items-center gap-4">
              {!previewUrl && (
                <div className={`relative ${styles.input} border ${styles.border} rounded-xl p-4 cursor-pointer hover:border-purple-400/50 transition-all duration-300`}>
                  <input
                    type="file"
                    name="cover_image"
                    accept="image/*"
                    onChange={handleChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="flex items-center gap-3">
                    <Icons.Image className="h-6 w-6 text-purple-400" />
                    <div>
                      <p className={`text-sm ${styles.text}`}>اختر صورة جديدة</p>
                      <p className={`text-xs ${styles.subtext} opacity-60`}>
                        الصيغ المدعومة: JPG, PNG, WEBP, GIF • الحجم الأقصى: 5MB
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <ImagePreview
                imageUrl={previewUrl}
                onRemove={handleRemoveImage}
                onReplace={() => {
                  document.querySelector('input[name="cover_image"]')?.click();
                }}
                styles={styles}
                isUploading={isUploading}
              />
            </div>
            {formData.existing_cover && !formData.cover_image && (
              <p className={`text-[10px] ${styles.subtext} opacity-60 mt-1`}>
                الصورة الحالية سيتم الاحتفاظ بها
              </p>
            )}
          </div>

          {/* محتوى الكتاب (Rich Text Editor) */}
          <div>
            <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
              محتوى الكتاب <span className="text-red-400">*</span>
            </label>
            {errors.content && (
              <p className="text-red-400 text-xs mb-2">{errors.content}</p>
            )}
            <div className={`${styles.card} border ${errors.content ? 'border-red-400' : styles.border} rounded-xl overflow-hidden`}>
              <ReactQuill
                theme="snow"
                value={formData.content}
                onChange={handleContentChange}
                modules={quillModules}
                formats={quillFormats}
                placeholder="اكتب محتوى الكتاب هنا..."
                className="bg-transparent text-white"
                style={{
                  minHeight: '300px',
                  background: 'transparent',
                  color: theme === 'dark' ? '#e5e7eb' : '#1f2937',
                }}
              />
            </div>
            <p className={`text-[10px] ${styles.subtext} opacity-60 mt-1`}>
              يمكنك استخدام أدوات التنسيق لتنسيق المحتوى (عناوين، قوائم، صور، روابط، إلخ)
            </p>
          </div>

          {/* حالة النشر */}
          <div className="flex items-center gap-3">
            <label className={`flex items-center gap-2 cursor-pointer ${styles.text}`}>
              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
                onChange={handleChange}
                className="w-4 h-4 rounded accent-purple-500"
              />
              الكتاب منشور
            </label>
            <span className="text-[10px] text-gray-400">(يمكن تغيير هذا في أي وقت)</span>
          </div>

          {/* أزرار الإجراء */}
          <div className="flex flex-wrap gap-3 pt-4 border-t border-white/5">
            <button
              type="submit"
              disabled={isSubmitting || isUploading}
              className="flex-1 min-w-[150px] py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting || isUploading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isUploading ? 'جاري رفع الصورة...' : 'جاري الحفظ...'}
                </>
              ) : (
                <>
                  <Icons.Save className="h-5 w-5" />
                  حفظ التغييرات
                </>
              )}
            </button>
            <Link
              href={`/dashboard/assistant/books/${bookId}`}
              className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-medium transition flex items-center gap-2"
            >
              إلغاء
            </Link>
          </div>
        </form>

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
        title={originalBook?.title}
      />

      {/* ===== CSS مخصص لمحرر النصوص ===== */}
      <style jsx global>{`
        .ql-container {
          font-family: inherit !important;
          font-size: 16px !important;
          min-height: 300px;
        }
        .ql-editor {
          min-height: 300px;
          color: ${theme === 'dark' ? '#e5e7eb' : '#1f2937'} !important;
          direction: rtl;
          text-align: right;
        }
        .ql-editor.ql-blank::before {
          color: ${theme === 'dark' ? '#6b7280' : '#9ca3af'} !important;
          font-style: normal !important;
          right: 20px;
          left: auto;
          text-align: right;
        }
        .ql-toolbar {
          background: ${theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)'} !important;
          border-color: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;
          border-radius: 12px 12px 0 0 !important;
          direction: rtl;
        }
        .ql-toolbar .ql-stroke {
          stroke: ${theme === 'dark' ? '#e5e7eb' : '#374151'} !important;
        }
        .ql-toolbar .ql-fill {
          fill: ${theme === 'dark' ? '#e5e7eb' : '#374151'} !important;
        }
        .ql-toolbar .ql-picker {
          color: ${theme === 'dark' ? '#e5e7eb' : '#374151'} !important;
        }
        .ql-container {
          border-color: ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;
          border-radius: 0 0 12px 12px !important;
          background: transparent !important;
        }
        .ql-editor h1, .ql-editor h2, .ql-editor h3 {
          color: ${theme === 'dark' ? '#c4b5fd' : '#6d2b8a'} !important;
        }
        .ql-editor a {
          color: #8b5cf6 !important;
        }
        .ql-editor blockquote {
          border-right-color: #8b5cf6 !important;
          color: ${theme === 'dark' ? '#9ca3af' : '#6b7280'} !important;
        }
      `}</style>
    </div>
  );
}