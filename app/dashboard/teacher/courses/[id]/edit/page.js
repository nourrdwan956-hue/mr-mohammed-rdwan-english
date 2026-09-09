// ============================================================
// app/dashboard/teacher/courses/[id]/edit/page.js
// تعديل الكورس – النسخة الأسطورية المتكاملة V11
// ✅ تم التعديل لاستخدام الثيم المركزي من useTheme
// ✅ إضافة دعم الكورسات المدفوعة (عدد الأجهزة، مدة الاشتراك، تفعيل الدفع، أكواد الشحن)
// ✅ رفع صورة الغلاف مباشرة مع معاينة وحذف (مثل صفحة الإنشاء)
// ============================================================

'use client';

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد

// ============================================================
// 1. دوال مساعدة
// ============================================================

const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
};

// ============================================================
// 2. مكون المعاينة المباشرة (Live Preview)
// ============================================================

const CoursePreview = ({ formData, styles }) => {
  const [isHovered, setIsHovered] = useState(false);
  const hasImage = formData.cover_image && formData.cover_image.length > 0;
  const gradeDisplay = formData.grade_stage && formData.grade_level
    ? `${formData.grade_stage} - الصف ${formData.grade_level}`
    : 'المرحلة والصف غير محددين';

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative ${styles.card} border rounded-2xl overflow-hidden ${styles.hover} transition-all duration-500 ${styles.shadow}`}
    >
      <div className="aspect-[16/9] bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center relative">
        {hasImage ? (
          <img
            src={formData.cover_image}
            alt={formData.title || 'صورة الكورس'}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Icons.BookOpen className="h-16 w-16 text-gray-500/50" />
            <span className={`text-sm ${styles.subtext}`}>لا توجد صورة</span>
          </div>
        )}
        {/* حالة النشر (افتراضية) */}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/80 text-white border border-gray-400/30">
            مسودة (معاينة)
          </span>
        </div>
        {formData.is_free && (
          <div className="absolute top-3 left-3">
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/80 text-white border border-green-400/30">
              🎁 مجاني
            </span>
          </div>
        )}
      </div>
      <div className="p-4">
        <h3 className={`text-lg font-bold ${styles.text} truncate`}>
          {formData.title || 'عنوان الكورس'}
        </h3>
        <p className={`text-sm ${styles.subtext} mt-1 line-clamp-2`}>
          {formData.description || 'وصف الكورس سيظهر هنا'}
        </p>
        <div className="flex items-center justify-between mt-3 text-xs">
          <span className={styles.subtext}>
            {gradeDisplay}
          </span>
          <span className="font-extrabold text-yellow-400">
            {formData.is_free ? '🎁 مجاني' : `${formData.price || 0} ج.م`}
          </span>
        </div>
        {/* ✅ عرض معلومات الكورس المدفوع (عدد الأجهزة، مدة الاشتراك) */}
        <div className="flex items-center justify-between mt-2 text-xs">
          <span className={styles.subtext}>
            الأجهزة المسموحة: {formData.max_devices || 2}
          </span>
          <span className={styles.subtext}>
            مدة الاشتراك: {formData.subscription_duration_days || 30} يوم
          </span>
        </div>
        {formData.enable_payment && (
          <div className="text-[10px] text-green-400 mt-1">
            💳 الدفع مفعل
          </div>
        )}
        {formData.access_code_enabled && (
          <div className="text-[10px] text-purple-400 mt-0.5">
            🎫 أكواد الشحن مفعلة
          </div>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================
// 3. الصفحة الرئيسية – تعديل الكورس
// ============================================================

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;
  // ✅ استخدام الثيم المركزي
  const { theme, toggleTheme } = useTheme();

  // ✅ بناء أنماط محلية تعتمد على theme (نفس بنية الكود السابق)
  const styles = theme === 'dark' ? {
    bg: 'bg-[#0b0e1a]',
    text: 'text-white',
    subtext: 'text-gray-400',
    card: 'bg-white/5 backdrop-blur-sm border-white/10',
    input: 'bg-white/10 border-white/20 text-white placeholder-gray-500',
    label: 'text-gray-300',
    select: 'bg-white/10 border-white/20 text-white',
    hover: 'hover:border-yellow-400/50',
    shadow: 'shadow-yellow-400/10',
  } : {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    subtext: 'text-gray-600',
    card: 'bg-white/90 backdrop-blur-sm border-gray-200',
    input: 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400',
    label: 'text-gray-700',
    select: 'bg-gray-100 border-gray-300 text-gray-900',
    hover: 'hover:border-yellow-400/70',
    shadow: 'shadow-yellow-400/30',
  };

  // ===== حالات عامة =====
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [course, setCourse] = useState(null);

  // ===== حالة النموذج (مع الحقول الجديدة للكورسات المدفوعة) =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    grade_stage: '',
    grade_level: '',
    cover_image: '',
    is_free: false,
    // ✅ حقول جديدة للكورسات المدفوعة
    max_devices: 2,
    subscription_duration_days: 30,
    enable_payment: true,
    access_code_enabled: true,
  });
  const [formErrors, setFormErrors] = useState({});
  const [slug, setSlug] = useState('');

  // ===== حالات الصورة (تم إضافتها حسب المطلوب) =====
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');

  // ===== جلب بيانات الكورس =====
  const fetchCourse = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      if (!data) {
        toast.error('الكورس غير موجود');
        router.push('/dashboard/teacher/courses');
        return;
      }

      // التحقق من ملكية المعلم
      if (data.teacher_id !== user.id) {
        toast.error('غير مصرح لك بتعديل هذا الكورس');
        router.push('/dashboard/teacher/courses');
        return;
      }

      setCourse(data);
      // ✅ تحديث الحالة مع الحقول الجديدة (مع قيم افتراضية)
      setFormData({
        title: data.title || '',
        description: data.description || '',
        price: data.price?.toString() || '',
        grade_stage: data.grade_stage || '',
        grade_level: data.grade_level?.toString() || '',
        cover_image: data.cover_image || '',
        is_free: data.is_free || false,
        max_devices: data.max_devices ?? 2,
        subscription_duration_days: data.subscription_duration_days ?? 30,
        enable_payment: data.enable_payment ?? true,
        access_code_enabled: data.access_code_enabled ?? true,
      });
      setSlug(data.slug || '');

      // ✅ إذا كانت هناك صورة موجودة، عرضها في المعاينة
      if (data.cover_image) {
        setImagePreview(data.cover_image);
      }
    } catch (err) {
      console.error('Error fetching course:', err);
      setError('فشل جلب بيانات الكورس: ' + err.message);
      toast.error('فشل جلب بيانات الكورس');
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    fetchCourse();
  }, [fetchCourse]);

  // ===== دالة رفع الصورة =====
  const uploadCoverImage = async (file) => {
    if (!file) return null;
    setUploadingImage(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مصرح');

      // إنشاء اسم ملف فريد
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = fileName;

      // رفع الملف إلى Supabase Storage
      const { data, error } = await supabase.storage
        .from('course-covers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // الحصول على الرابط العام
      const { data: urlData } = supabase.storage
        .from('course-covers')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('فشل رفع الصورة: ' + error.message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // ===== معالج اختيار الصورة =====
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // معاينة الصورة
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
    };
    reader.readAsDataURL(file);

    // رفع الصورة
    const publicUrl = await uploadCoverImage(file);
    if (publicUrl) {
      setUploadedImage(file);
      setFormData(prev => ({ ...prev, cover_image: publicUrl }));
      toast.success('✅ تم رفع الصورة بنجاح');
    } else {
      setImagePreview('');
    }
  };

  // ===== حذف الصورة =====
  const removeImage = async () => {
    // حذف الملف من التخزين (اختياري)
    if (formData.cover_image) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const oldPath = formData.cover_image.split('/').pop();
          await supabase.storage
            .from('course-covers')
            .remove([`${user.id}/${oldPath}`]);
        }
      } catch (e) { /* تجاهل */ }
    }
    setUploadedImage(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, cover_image: '' }));
  };

  // ===== دوال النموذج =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    // ✅ معالجة الحقول الرقمية والمنطقية بشكل صحيح
    let processedValue = value;
    if (type === 'checkbox') {
      processedValue = checked;
    } else if (name === 'max_devices' || name === 'subscription_duration_days') {
      processedValue = value === '' ? '' : parseInt(value, 10);
    }

    setFormData(prev => ({
      ...prev,
      [name]: processedValue,
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // ===== التحقق من صحة النموذج (مع الحقول الجديدة) =====
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'عنوان الكورس مطلوب';
    if (!formData.description.trim()) errors.description = 'الوصف مطلوب';
    if (!formData.is_free && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.price = 'السعر مطلوب (أو اختر مجاني)';
    }
    if (!formData.grade_stage.trim()) errors.grade_stage = 'المرحلة الدراسية مطلوبة';
    if (!formData.grade_level.trim()) errors.grade_level = 'الصف الدراسي مطلوب';
    // ✅ التحقق من عدد الأجهزة ومدة الاشتراك
    if (formData.max_devices < 1) {
      errors.max_devices = 'عدد الأجهزة يجب أن يكون 1 على الأقل';
    }
    if (formData.subscription_duration_days < 1) {
      errors.subscription_duration_days = 'مدة الاشتراك يجب أن تكون يوم واحد على الأقل';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== تحديث الكورس =====
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

      // تحديد الـ slug الجديد
      let newSlug = slug;
      if (formData.title.trim() !== course.title) {
        let generated = generateSlug(formData.title.trim());
        // التحقق من عدم التكرار
        const { data: existing } = await supabase
          .from('courses')
          .select('slug')
          .eq('slug', generated)
          .neq('id', courseId)
          .maybeSingle();
        if (existing) {
          generated = `${generated}-${Date.now().toString().slice(-4)}`;
        }
        newSlug = generated;
      }

      // ✅ تحديث البيانات مع الحقول الجديدة
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: formData.is_free ? 0 : parseFloat(formData.price),
        grade_stage: formData.grade_stage.trim(),
        grade_level: parseInt(formData.grade_level),
        cover_image: formData.cover_image || null,
        is_free: formData.is_free,
        slug: newSlug,
        updated_at: new Date().toISOString(),
        // ✅ إضافة الحقول الجديدة
        max_devices: formData.max_devices,
        subscription_duration_days: formData.subscription_duration_days,
        enable_payment: formData.enable_payment,
        access_code_enabled: formData.access_code_enabled,
      };

      const { error } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', courseId);

      if (error) throw error;

      setSuccess('✅ تم تحديث الكورس بنجاح!');
      toast.success('تم تحديث الكورس بنجاح');
      setTimeout(() => {
        router.push(`/dashboard/teacher/courses/${courseId}`);
      }, 1500);
    } catch (err) {
      console.error('Error updating course:', err);
      setError('فشل تحديث الكورس: ' + err.message);
      toast.error('فشل تحديث الكورس');
    } finally {
      setSubmitting(false);
    }
  };

  // ===== دوال التنقل =====
  const goBack = () => router.push(`/dashboard/teacher/courses/${courseId}`);
  const goToList = () => router.push('/dashboard/teacher/courses');

  if (loading) {
    return (
      <TeacherLayout>
        <div className={`flex items-center justify-center py-20 ${theme === 'dark' ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  if (!course) {
    return (
      <TeacherLayout>
        <div className={`text-center py-20 ${theme === 'dark' ? 'bg-[#0b0e1a]' : 'bg-gray-50'}`}>
          <Icons.AlertCircle className="h-16 w-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-400 text-lg">الكورس غير موجود</p>
          <button onClick={goToList} className="text-yellow-400 hover:underline mt-2">
            العودة إلى القائمة
          </button>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className={`${styles.bg} min-h-screen p-4 md:p-6`}>
        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-extrabold ${styles.text}`}>✏️ تعديل الكورس</h1>
            <p className={`${styles.subtext} text-sm mt-1`}>
              قم بتحديث بيانات الكورس "{course.title}"
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
            <button
              onClick={goBack}
              className={`px-4 py-2 ${styles.card} border rounded-xl text-sm ${styles.hover} transition flex items-center gap-2`}
            >
              <Icons.ArrowRight className="h-4 w-4" /> العودة للتفاصيل
            </button>
            <button
              onClick={goToList}
              className={`px-4 py-2 ${styles.card} border rounded-xl text-sm ${styles.hover} transition flex items-center gap-2`}
            >
              <Icons.Book className="h-4 w-4" /> قائمة الكورسات
            </button>
            {/* ✅ زر تبديل الثيم – يستخدم toggleTheme من السياق المركزي */}
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition hover:bg-white/5 ${styles.card} border`}
              title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
            >
              {theme === 'dark' ? (
                <Icons.Sun className="h-4 w-4 text-yellow-400" />
              ) : (
                <Icons.Moon className="h-4 w-4 text-gray-600" />
              )}
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
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3"
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
              className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-4 flex items-center gap-3"
            >
              <Icons.CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== نموذج التعديل مع معاينة مباشرة ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* النموذج */}
          <div className="lg:col-span-2">
            <div className={`${styles.card} border rounded-2xl p-6 ${styles.hover} transition-all duration-500`}>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* عنوان الكورس */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                    عنوان الكورس <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="مثال: جرامر الترم الأول"
                    className={`w-full p-3 ${styles.input} border ${
                      formErrors.title ? 'border-red-500' : 'border-white/20'
                    } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                  />
                  {formErrors.title && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>
                  )}
                  <p className={`text-xs ${styles.subtext} mt-1`}>
                    المعرف الفريد للكورس: <span className="text-yellow-400 font-mono">{slug}</span>
                  </p>
                </div>

                {/* الوصف */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                    الوصف <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    placeholder="وصف مختصر للكورس ومحتوياته"
                    className={`w-full p-3 ${styles.input} border ${
                      formErrors.description ? 'border-red-500' : 'border-white/20'
                    } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition resize-none`}
                  />
                  {formErrors.description && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>
                  )}
                </div>

                {/* السعر والمجاني */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                      السعر (ج.م) {!formData.is_free && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="250"
                      disabled={formData.is_free}
                      className={`w-full p-3 ${styles.input} border ${
                        formErrors.price ? 'border-red-500' : 'border-white/20'
                      } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition disabled:opacity-50 disabled:cursor-not-allowed`}
                    />
                    {formErrors.price && (
                      <p className="text-red-400 text-xs mt-1">{formErrors.price}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      name="is_free"
                      checked={formData.is_free}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData((prev) => ({
                          ...prev,
                          is_free: checked,
                          price: checked ? '' : prev.price,
                        }));
                      }}
                      className="w-5 h-5 accent-yellow-400 rounded"
                    />
                    <label className={`text-sm ${styles.label} font-medium cursor-pointer`}>
                      🎁 كورس مجاني
                    </label>
                  </div>
                </div>

                {/* ===== قسم الكورسات المدفوعة: عدد الأجهزة ومدة الاشتراك ===== */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                      عدد الأجهزة المسموحة <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      name="max_devices"
                      value={formData.max_devices}
                      onChange={handleChange}
                      min="1"
                      max="10"
                      className={`w-full p-3 ${styles.input} border ${
                        formErrors.max_devices ? 'border-red-500' : 'border-white/20'
                      } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                    />
                    {formErrors.max_devices && (
                      <p className="text-red-400 text-xs mt-1">{formErrors.max_devices}</p>
                    )}
                    <p className={`text-xs ${styles.subtext} mt-1`}>
                      عدد الأجهزة التي يمكن للطالب استخدامها للوصول إلى هذا الكورس (افتراضي: 2)
                    </p>
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                      مدة الاشتراك (أيام) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="number"
                      name="subscription_duration_days"
                      value={formData.subscription_duration_days}
                      onChange={handleChange}
                      min="1"
                      max="365"
                      className={`w-full p-3 ${styles.input} border ${
                        formErrors.subscription_duration_days ? 'border-red-500' : 'border-white/20'
                      } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                    />
                    {formErrors.subscription_duration_days && (
                      <p className="text-red-400 text-xs mt-1">{formErrors.subscription_duration_days}</p>
                    )}
                    <p className={`text-xs ${styles.subtext} mt-1`}>
                      عدد الأيام التي يستمر فيها اشتراك الطالب بعد الدفع (افتراضي: 30)
                    </p>
                  </div>
                </div>

                {/* ===== تفعيل الدفع وأكواد الشحن ===== */}
                <div className="flex flex-wrap items-center gap-6 pt-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="enable_payment"
                      checked={formData.enable_payment}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          enable_payment: checked,
                          // إذا تم تعطيل الدفع، نجعل الكورس مجانياً
                          is_free: checked ? prev.is_free : true,
                          price: checked ? prev.price : '',
                        }));
                      }}
                      className="w-5 h-5 accent-yellow-400 rounded"
                    />
                    <label className={`text-sm ${styles.label} font-medium cursor-pointer`}>
                      💳 تفعيل الدفع للكورس
                    </label>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="access_code_enabled"
                      checked={formData.access_code_enabled}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded"
                    />
                    <label className={`text-sm ${styles.label} font-medium cursor-pointer`}>
                      🎫 تفعيل أكواد الشحن
                    </label>
                  </div>
                </div>

                {/* ===== صورة الغلاف (رفع ملف مع معاينة) – تم استبدال الحقل النصي بهذا ===== */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                    صورة الغلاف (اختياري)
                  </label>
                  <div className="flex flex-col gap-3">
                    {imagePreview ? (
                      <div className="relative w-full max-w-xs">
                        <img
                          src={imagePreview}
                          alt="معاينة الصورة"
                          className="w-full h-32 object-cover rounded-xl border border-white/20"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          disabled={uploadingImage}
                          className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-600 rounded-full text-white transition disabled:opacity-50"
                        >
                          <Icons.X className="h-4 w-4" />
                        </button>
                        {uploadingImage && (
                          <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                            <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        className={`border-2 border-dashed ${styles.border} rounded-xl p-6 text-center hover:border-yellow-400/50 transition cursor-pointer ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}
                        onClick={() => document.getElementById('image-upload-edit').click()}
                      >
                        <Icons.Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className={`text-sm ${styles.subtext}`}>
                          اضغط لاختيار صورة أو اسحبها هنا
                        </p>
                        <p className="text-xs text-gray-500">يدعم JPG, PNG, GIF حتى 5 ميجابايت</p>
                      </div>
                    )}
                    <input
                      id="image-upload-edit"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      disabled={uploadingImage}
                      className="hidden"
                    />
                    {uploadingImage && (
                      <div className="flex items-center gap-2 text-sm text-yellow-400">
                        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
                        جاري رفع الصورة...
                      </div>
                    )}
                  </div>
                </div>

                {/* ===== المرحلة الدراسية ===== */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                    المرحلة الدراسية <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="grade_stage"
                    value={formData.grade_stage}
                    onChange={handleChange}
                    className={`w-full p-3 ${styles.select} border ${
                      formErrors.grade_stage ? 'border-red-500' : 'border-white/20'
                    } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition appearance-none`}
                  >
                    <option value="">اختر المرحلة</option>
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="اعدادي">اعدادي</option>
                    <option value="ثانوي">ثانوي</option>
                  </select>
                  {formErrors.grade_stage && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.grade_stage}</p>
                  )}
                </div>

                {/* ===== الصف الدراسي (يظهر عند اختيار المرحلة) ===== */}
                {formData.grade_stage && (
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                      الصف الدراسي <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="grade_level"
                      value={formData.grade_level}
                      onChange={handleChange}
                      className={`w-full p-3 ${styles.select} border ${
                        formErrors.grade_level ? 'border-red-500' : 'border-white/20'
                      } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition appearance-none`}
                    >
                      <option value="">اختر الصف</option>
                      {(() => {
                        const levels = {
                          'ابتدائي': [1, 2, 3, 4, 5, 6],
                          'اعدادي': [1, 2, 3],
                          'ثانوي': [1, 2, 3],
                        };
                        return (levels[formData.grade_stage] || []).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ));
                      })()}
                    </select>
                    {formErrors.grade_level && (
                      <p className="text-red-400 text-xs mt-1">{formErrors.grade_level}</p>
                    )}
                  </div>
                )}

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
                        جاري التحديث...
                      </>
                    ) : (
                      <>
                        <Icons.Save className="h-5 w-5" /> تحديث الكورس
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={goBack}
                    className={`px-6 py-3 ${styles.card} border ${styles.text} rounded-xl hover:bg-white/10 transition`}
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* المعاينة المباشرة */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className={`text-sm font-semibold ${styles.text} mb-3 flex items-center gap-2`}>
                <Icons.Eye className="h-4 w-4 text-yellow-400" /> معاينة مباشرة
              </h3>
              <CoursePreview formData={formData} styles={styles} />
              <p className={`text-[10px] ${styles.subtext} mt-2 text-center`}>
                هذه معاينة تقريبية للكورس بعد التعديلات
              </p>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}