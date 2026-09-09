// ============================================================
// app/dashboard/teacher/courses/new/page.js
// إنشاء كورس جديد – النسخة الأسطورية المتكاملة V16
// ✅ رفع صورة الغلاف مع معاينة وحذف (عرض كامل باستخدام object-contain)
// ✅ منطق ذكي: إذا كان الكورس مجانياً، يتم تعطيل الدفع تلقائياً
// ✅ تطبيق الحد الأقصى للطلاب، عدد الأجهزة، مدة الاشتراك، أكواد الشحن
// ✅ ربط ببنوك الأسئلة (موجود أو إنشاء جديد)
// ✅ معاينة مباشرة تعكس جميع التغييرات
// ✅ دعم الثيم الداكن والفاتح عبر useTheme
// ============================================================

'use client';

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';

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

// ============================================================
// 2. مكون المعاينة المباشرة (Live Preview)
// ============================================================

const CoursePreview = ({ formData, styles }) => {
  const hasImage = formData.cover_image && formData.cover_image.length > 0;
  const gradeDisplay = formData.grade_stage && formData.grade_level
    ? `${formData.grade_stage} - الصف ${formData.grade_level}`
    : 'المرحلة والصف غير محددين';

  // تحديد إذا كان الكورس مجانيًا (يؤثر على عرض السعر)
  const isFree = formData.is_free || !formData.enable_payment;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={`relative ${styles.card} border rounded-2xl overflow-hidden ${styles.hover} transition-all duration-500 ${styles.shadow}`}
    >
      <div className="aspect-[16/9] bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center relative">
        {hasImage ? (
          <img
            src={formData.cover_image}
            alt={formData.title || 'صورة الكورس'}
            className="w-full h-full object-contain" // ✅ عرض الصورة كاملة
          />
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Icons.BookOpen className="h-16 w-16 text-gray-500/50" />
            <span className={`text-sm ${styles.subtext}`}>لا توجد صورة</span>
          </div>
        )}
        <div className="absolute top-3 right-3">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-500/80 text-white border border-gray-400/30">
            {formData.is_published ? 'منشور' : 'مسودة (معاينة)'}
          </span>
        </div>
        {isFree && (
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
            {isFree ? '🎁 مجاني' : `${formData.price || 0} ج.م`}
          </span>
        </div>

        {/* معلومات الدفع والأجهزة في المعاينة */}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px]">
          <span className={`px-2 py-0.5 rounded-full ${formData.enable_payment ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
            {formData.enable_payment ? '💳 دفع مفعل' : '💳 دفع معطل'}
          </span>
          <span className={`px-2 py-0.5 rounded-full ${formData.access_code_enabled ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'}`}>
            {formData.access_code_enabled ? '🎫 أكواد مفعلة' : '🎫 أكواد معطلة'}
          </span>
          <span className={styles.subtext}>الأجهزة: {formData.max_devices || 2}</span>
          <span className={styles.subtext}>المدة: {formData.subscription_duration_days || 30} يوم</span>
        </div>

        {formData.max_students && (
          <p className={`text-xs ${styles.subtext} mt-1`}>
            الحد الأقصى للطلاب: {formData.max_students}
          </p>
        )}
        {formData.start_date && (
          <p className={`text-xs ${styles.subtext} mt-1`}>
            بداية: {new Date(formData.start_date).toLocaleDateString('ar-EG')}
          </p>
        )}
        {formData.end_date && (
          <p className={`text-xs ${styles.subtext}`}>
            نهاية: {new Date(formData.end_date).toLocaleDateString('ar-EG')}
          </p>
        )}
        {formData.tags && (
          <div className="flex flex-wrap gap-1 mt-2">
            {formData.tags.split(',').map((tag, i) => (
              <span
                key={i}
                className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded-full"
              >
                {tag.trim()}
              </span>
            ))}
          </div>
        )}
        {formData.link_bank && (
          <p className={`text-xs text-purple-400 mt-2 flex items-center gap-1`}>
            <Icons.Database className="h-3 w-3" /> مرتبط ببنك أسئلة
          </p>
        )}
      </div>
    </motion.div>
  );
};

// ============================================================
// 3. الصفحة الرئيسية – إنشاء كورس جديد
// ============================================================

export default function NewCoursePage() {
  const router = useRouter();
  const formRef = useRef(null);
  // استخدام الثيم المركزي
  const { theme, toggleTheme, language } = useTheme();

  // بناء أنماط محلية تعتمد على theme
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
    border: 'border-white/20',
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
    border: 'border-gray-300',
  };

  // ===== حالات النموذج =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    grade_stage: '',
    grade_level: '',
    cover_image: '',
    is_free: false,
    start_date: '',
    end_date: '',
    max_students: '',
    is_published: false,
    tags: '',
    link_bank: false,
    existing_bank_id: '',
    create_new_bank: false,
    new_bank_title: '',
    max_devices: 2,
    subscription_duration_days: 30,
    enable_payment: true,
    access_code_enabled: true,
  });

  // ===== حالات الصورة =====
  const [uploadedImage, setUploadedImage] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const [uploadError, setUploadError] = useState('');

  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [slugPreview, setSlugPreview] = useState('');
  const [draftMode, setDraftMode] = useState(false);

  // ===== قائمة البنوك =====
  const [banksList, setBanksList] = useState([]);

  // ===== جلب قائمة البنوك =====
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data } = await supabase
          .from('question_banks')
          .select('id, title')
          .eq('teacher_id', user.id)
          .order('title');
        setBanksList(data || []);
      } catch (err) {
        console.error('Error fetching banks:', err);
      }
    };
    fetchBanks();
  }, []);

  // ===== تحديث المعاينة المباشرة للـ slug =====
  useEffect(() => {
    if (formData.title.trim()) {
      setSlugPreview(generateSlug(formData.title.trim()));
    } else {
      setSlugPreview('');
    }
  }, [formData.title]);

  // ============================================================
  // ✅ دوال رفع الصورة (بدون محاولة إنشاء الباكيت من العميل)
  // ============================================================

  const uploadCoverImage = async (file) => {
    if (!file) return null;
    setUploadingImage(true);
    setUploadError('');

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

      if (error) {
        // معالجة الأخطاء الشائعة
        if (error.message.includes('duplicate') || error.message.includes('already exists')) {
          // إذا كان الملف مكرراً، جرب إعادة الرفع مع اسم جديد
          const fallbackFileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${fileExt}`;
          const { data: fallbackData, error: fallbackError } = await supabase.storage
            .from('course-covers')
            .upload(fallbackFileName, file, {
              cacheControl: '3600',
              upsert: false,
            });
          if (fallbackError) {
            if (fallbackError.message.includes('bucket not found')) {
              throw new Error('حاوية التخزين غير موجودة، يرجى التواصل مع الدعم الفني');
            }
            throw fallbackError;
          }
          const { data: urlData } = supabase.storage
            .from('course-covers')
            .getPublicUrl(fallbackFileName);
          return urlData.publicUrl;
        }
        // خطأ آخر
        if (error.message.includes('bucket not found')) {
          throw new Error('حاوية التخزين غير موجودة، يرجى التواصل مع الدعم الفني');
        }
        throw error;
      }

      // الحصول على الرابط العام
      const { data: urlData } = supabase.storage
        .from('course-covers')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      const message = error.message || 'فشل رفع الصورة';
      setUploadError(message);
      toast.error('فشل رفع الصورة: ' + message);
      return null;
    } finally {
      setUploadingImage(false);
    }
  };

  // ===== معالج اختيار الصورة =====
  const handleImageChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // تحقق من حجم الملف (حد أقصى 5 ميجابايت)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('حجم الصورة كبير جداً (الحد الأقصى 5 ميجابايت)');
      return;
    }

    // تحقق من نوع الملف
    if (!file.type.startsWith('image/')) {
      toast.error('الرجاء اختيار ملف صورة صالح (JPG, PNG, GIF)');
      return;
    }

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
    // حذف الملف من التخزين
    if (formData.cover_image) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // استخراج مسار الملف من الرابط
          const urlParts = formData.cover_image.split('/');
          const fileName = urlParts[urlParts.length - 1];
          const filePath = `${user.id}/${fileName}`;
          await supabase.storage
            .from('course-covers')
            .remove([filePath]);
        }
      } catch (e) {
        console.warn('Could not delete old image:', e);
        // تجاهل الأخطاء عند الحذف
      }
    }
    setUploadedImage(null);
    setImagePreview('');
    setFormData(prev => ({ ...prev, cover_image: '' }));
    toast.success('تم إزالة الصورة');
  };

  // ============================================================
  // منطق ذكي: إذا كان الكورس مجانياً، يتم تعطيل الدفع تلقائياً
  // ============================================================

  const handleFreeToggle = (checked) => {
    setFormData((prev) => ({
      ...prev,
      is_free: checked,
      // إذا كان مجانياً، نلغي تفعيل الدفع ونخفي السعر
      price: checked ? '' : prev.price,
      enable_payment: checked ? false : prev.enable_payment, // ✅ منطق ذكي
    }));
    if (checked) {
      // إذا أصبح مجانياً، نعطيل خيار الدفع أيضاً
      setFormData((prev) => ({
        ...prev,
        enable_payment: false,
      }));
    }
  };

  // ============================================================
  // دوال النموذج الأساسية
  // ============================================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // معالجة خاصة لـ enable_payment عند التغيير
    if (name === 'enable_payment') {
      // إذا كان الكورس مجانياً، لا نسمح بتفعيل الدفع
      if (formData.is_free) {
        toast.error('لا يمكن تفعيل الدفع لكورس مجاني');
        return;
      }
      setFormData((prev) => ({
        ...prev,
        enable_payment: checked,
        // إذا تم تفعيل الدفع، نجعل is_free = false
        is_free: checked ? false : prev.is_free,
        price: checked ? prev.price : '',
      }));
      if (formErrors[name]) setFormErrors((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    // معالجة تغيير is_free من خلال الـ checkbox
    if (name === 'is_free') {
      handleFreeToggle(checked);
      return;
    }
    
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  // ===== التحقق من صحة النموذج =====
  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'عنوان الكورس مطلوب';
    if (!formData.description.trim()) errors.description = 'الوصف مطلوب';
    // التحقق من السعر: إذا كان الكورس مدفوع (enable_payment = true) وليس مجاني
    if (formData.enable_payment && !formData.is_free && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.price = 'السعر مطلوب (أو اختر مجاني)';
    }
    if (!formData.grade_stage.trim()) errors.grade_stage = 'المرحلة الدراسية مطلوبة';
    if (!formData.grade_level.trim()) errors.grade_level = 'الصف الدراسي مطلوب';
    if (formData.max_devices < 1) {
      errors.max_devices = 'عدد الأجهزة يجب أن يكون 1 على الأقل';
    }
    if (formData.subscription_duration_days < 1) {
      errors.subscription_duration_days = 'مدة الاشتراك يجب أن تكون يوم واحد على الأقل';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // ===== إنشاء الكورس =====
  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

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

      let slug = generateSlug(formData.title.trim());
      const { data: existing } = await supabase
        .from('courses')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();
      if (existing) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      const finalIsPublished = draftMode ? false : formData.is_published;

      // بناء كائن البيانات مع مراعاة المنطق الذكي
      const isFree = formData.is_free || !formData.enable_payment;
      const finalPrice = isFree ? 0 : parseFloat(formData.price);

      const courseData = {
        teacher_id: user.id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        price: finalPrice,
        grade_stage: formData.grade_stage.trim(),
        grade_level: parseInt(formData.grade_level),
        cover_image: formData.cover_image || null,
        is_free: isFree,
        slug: slug,
        is_published: finalIsPublished,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        max_students: formData.max_students ? parseInt(formData.max_students) : null,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        max_devices: formData.max_devices,
        subscription_duration_days: formData.subscription_duration_days,
        enable_payment: formData.enable_payment && !isFree, // إذا كان مجاني، تعطيل الدفع
        access_code_enabled: formData.access_code_enabled,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('courses')
        .insert(courseData)
        .select()
        .single();

      if (error) throw error;

      // ربط بنك الأسئلة
      if (formData.link_bank && formData.existing_bank_id) {
        const { error: updateError } = await supabase
          .from('question_banks')
          .update({ course_id: data.id })
          .eq('id', formData.existing_bank_id);
        if (updateError) {
          console.error('Error linking bank:', updateError);
          toast.warning('تم إنشاء الكورس لكن فشل ربط البنك المحدد');
        } else {
          toast.success('✅ تم ربط البنك بالكورس');
        }
      }

      if (formData.create_new_bank && formData.new_bank_title.trim()) {
        const newBank = {
          teacher_id: user.id,
          title: formData.new_bank_title.trim(),
          course_id: data.id,
          is_published: false,
          archived: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const { error: bankError } = await supabase
          .from('question_banks')
          .insert(newBank);
        if (bankError) {
          console.error('Error creating bank:', bankError);
          toast.warning('تم إنشاء الكورس لكن فشل إنشاء البنك المرتبط');
        } else {
          toast.success('✅ تم إنشاء البنك وربطه بالكورس');
        }
      }

      const successMsg = draftMode
        ? '✅ تم حفظ الكورس كمسودة بنجاح!'
        : finalIsPublished
        ? '✅ تم إنشاء الكورس ونشره بنجاح!'
        : '✅ تم إنشاء الكورس كمسودة بنجاح!';

      setSuccess(successMsg);
      toast.success(successMsg);

      setDraftMode(false);

      setTimeout(() => {
        router.push(`/dashboard/teacher/courses/${data.id}`);
      }, 1500);
    } catch (err) {
      console.error('Error creating course:', err);
      setError('فشل إنشاء الكورس: ' + err.message);
      toast.error('فشل إنشاء الكورس');
      setDraftMode(false);
    } finally {
      setSubmitting(false);
    }
  };

  // ===== دوال التنقل =====
  const goToList = () => router.push('/dashboard/teacher/courses');
  const goToDashboard = () => router.push('/dashboard/teacher');

  return (
    <TeacherLayout>
      <div className={`${styles.bg} min-h-screen p-4 md:p-6`}>
        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className={`text-3xl font-extrabold ${styles.text}`}>➕ إنشاء كورس جديد</h1>
            <p className={`${styles.subtext} text-sm mt-1`}>
              أضف كورساً تعليمياً جديداً وانشر محتواك للطلاب
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            <Link
              href="/dashboard/teacher/videos/new"
              className="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-xs transition flex items-center gap-1"
            >
              <Icons.Video className="h-3 w-3" /> فيديو
            </Link>
            <Link
              href="/dashboard/teacher/exams/new"
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs transition flex items-center gap-1"
            >
              <Icons.FileText className="h-3 w-3" /> امتحان
            </Link>
            <Link
              href="/dashboard/teacher/books/new"
              className="px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-xs transition flex items-center gap-1"
            >
              <Icons.Book className="h-3 w-3" /> كتاب
            </Link>
            <Link
              href="/dashboard/teacher/question-bank"
              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-xs transition flex items-center gap-1"
            >
              <Icons.Database className="h-3 w-3" /> بنك
            </Link>
            <button
              onClick={goToList}
              className={`px-3 py-1.5 ${styles.card} border rounded-lg text-xs ${styles.hover} transition flex items-center gap-1`}
            >
              <Icons.ArrowRight className="h-3 w-3" /> قائمة الكورسات
            </button>
            <button
              onClick={goToDashboard}
              className={`px-3 py-1.5 ${styles.card} border rounded-lg text-xs ${styles.hover} transition flex items-center gap-1`}
            >
              <Icons.Home className="h-3 w-3" /> الرئيسية
            </button>
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

        {/* ===== نموذج الإنشاء مع معاينة مباشرة ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* النموذج */}
          <div className="lg:col-span-2">
            <div className={`${styles.card} border rounded-2xl p-6 ${styles.hover} transition-all duration-500`}>
              <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
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
                      formErrors.title ? 'border-red-500' : styles.border
                    } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                  />
                  {formErrors.title && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>
                  )}
                  <p className={`text-xs ${styles.subtext} mt-1`}>
                    المعرف الفريد للكورس:{' '}
                    <span className="text-yellow-400 font-mono">
                      {slugPreview || '(سيتولد تلقائياً)'}
                    </span>
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
                      formErrors.description ? 'border-red-500' : styles.border
                    } rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition resize-none`}
                  />
                  {formErrors.description && (
                    <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>
                  )}
                </div>

                {/* السعر والمجاني مع منطق ذكي */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                      السعر (ج.م) {!formData.is_free && formData.enable_payment && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="250"
                      disabled={formData.is_free || !formData.enable_payment}
                      className={`w-full p-3 ${styles.input} border ${
                        formErrors.price ? 'border-red-500' : styles.border
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
                        handleFreeToggle(checked);
                      }}
                      className="w-5 h-5 accent-yellow-400 rounded"
                    />
                    <label className={`text-sm ${styles.label} font-medium cursor-pointer`}>
                      🎁 كورس مجاني
                    </label>
                  </div>
                </div>

                {/* المرحلة الدراسية */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                    المرحلة الدراسية <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="grade_stage"
                    value={formData.grade_stage}
                    onChange={handleChange}
                    className={`w-full p-3 ${styles.select} border ${
                      formErrors.grade_stage ? 'border-red-500' : styles.border
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

                {/* الصف الدراسي (يظهر عند اختيار المرحلة) */}
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
                        formErrors.grade_level ? 'border-red-500' : styles.border
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

                {/* صورة الغلاف (رفع ملف مع معاينة) - عرض كامل باستخدام object-contain */}
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
                          className="w-full h-32 object-contain rounded-xl border border-white/20 bg-black/10" // ✅ object-contain لعرض كامل
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
                        onClick={() => document.getElementById('image-upload').click()}
                      >
                        <Icons.Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                        <p className={`text-sm ${styles.subtext}`}>
                          اضغط لاختيار صورة أو اسحبها هنا
                        </p>
                        <p className="text-xs text-gray-500">يدعم JPG, PNG, GIF حتى 5 ميجابايت</p>
                      </div>
                    )}
                    <input
                      id="image-upload"
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
                    {uploadError && (
                      <p className="text-red-400 text-xs">{uploadError}</p>
                    )}
                  </div>
                </div>

                {/* التواريخ والحد الأقصى للطلاب */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                      تاريخ البدء (اختياري)
                    </label>
                    <input
                      type="date"
                      name="start_date"
                      value={formData.start_date}
                      onChange={handleChange}
                      className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                    />
                  </div>
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                      تاريخ الانتهاء (اختياري)
                    </label>
                    <input
                      type="date"
                      name="end_date"
                      value={formData.end_date}
                      onChange={handleChange}
                      className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                    />
                  </div>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                    الحد الأقصى للطلاب (اختياري) – سيتم تطبيقه عند التسجيل
                  </label>
                  <input
                    type="number"
                    name="max_students"
                    value={formData.max_students}
                    onChange={handleChange}
                    placeholder="غير محدود"
                    min="0"
                    className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                    الوسوم (اختياري) – افصل بينها بفاصلة
                  </label>
                  <input
                    type="text"
                    name="tags"
                    value={formData.tags}
                    onChange={handleChange}
                    placeholder="مثال: جرامر, لغة عربية, ترم أول"
                    className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                  />
                </div>

                {/* ربط ببنوك الأسئلة */}
                <div className="border-t border-white/5 pt-4 mt-2">
                  <h4 className={`text-sm font-semibold ${styles.text} mb-3 flex items-center gap-2`}>
                    <Icons.Database className="h-4 w-4 text-purple-400" /> ربط ببنوك الأسئلة (اختياري)
                  </h4>
                  <div className="flex items-center gap-3 mb-3">
                    <input
                      type="checkbox"
                      name="link_bank"
                      checked={formData.link_bank}
                      onChange={handleChange}
                      className="w-5 h-5 accent-yellow-400 rounded"
                    />
                    <label className={`text-sm ${styles.label}`}>ربط الكورس ببنك أسئلة موجود</label>
                  </div>
                  {formData.link_bank && (
                    <div className="space-y-3">
                      <div>
                        <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                          اختر بنك أسئلة موجود
                        </label>
                        <select
                          name="existing_bank_id"
                          value={formData.existing_bank_id}
                          onChange={handleChange}
                          className={`w-full p-3 ${styles.select} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                        >
                          <option value="">-- اختر بنكاً --</option>
                          {banksList.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.title}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          name="create_new_bank"
                          checked={formData.create_new_bank}
                          onChange={handleChange}
                          className="w-5 h-5 accent-yellow-400 rounded"
                        />
                        <label className={`text-sm ${styles.label}`}>
                          أو إنشاء بنك جديد مرتبط بهذا الكورس
                        </label>
                      </div>
                      {formData.create_new_bank && (
                        <div>
                          <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                            عنوان البنك الجديد
                          </label>
                          <input
                            type="text"
                            name="new_bank_title"
                            value={formData.new_bank_title}
                            onChange={handleChange}
                            placeholder={`بنك أسئلة لـ ${formData.title || 'الكورس'}`}
                            className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* إعدادات الدفع والأجهزة (مع منطق ذكي) */}
                <div className="border-t border-white/5 pt-4 mt-2">
                  <h4 className={`text-sm font-semibold ${styles.text} mb-3 flex items-center gap-2`}>
                    <Icons.Coins className="h-4 w-4 text-yellow-400" /> إعدادات الدفع والأجهزة
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1.5 ${styles.label}`}>
                        عدد الأجهزة المسموحة
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="max_devices"
                        value={formData.max_devices}
                        onChange={handleChange}
                        min="1"
                        max="10"
                        className={`w-full p-3 ${styles.input} border ${
                          formErrors.max_devices ? 'border-red-500' : styles.border
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
                        مدة الاشتراك (أيام)
                        <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        name="subscription_duration_days"
                        value={formData.subscription_duration_days}
                        onChange={handleChange}
                        min="1"
                        max="365"
                        className={`w-full p-3 ${styles.input} border ${
                          formErrors.subscription_duration_days ? 'border-red-500' : styles.border
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

                  <div className="flex flex-wrap items-center gap-6 pt-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        name="enable_payment"
                        checked={formData.enable_payment}
                        onChange={handleChange}
                        disabled={formData.is_free} // ✅ تعطيل إذا كان مجانياً
                        className={`w-5 h-5 accent-yellow-400 rounded ${formData.is_free ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      <label className={`text-sm ${styles.label} font-medium cursor-pointer ${formData.is_free ? 'opacity-50 cursor-not-allowed' : ''}`}>
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
                </div>

                {/* خيار النشر */}
                <div className="flex items-center gap-3 pt-4 border-t border-white/5">
                  <input
                    type="checkbox"
                    name="is_published"
                    checked={formData.is_published}
                    onChange={handleChange}
                    className="w-5 h-5 accent-yellow-400 rounded"
                  />
                  <label className={`text-sm ${styles.label} font-medium cursor-pointer`}>
                    <Icons.Eye className="h-4 w-4 inline mr-1" /> نشر الكورس فوراً (بدلاً من حفظه كمسودة)
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
                        <Icons.Plus className="h-5 w-5" /> إنشاء الكورس
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDraftMode(true);
                      if (formRef.current) {
                        formRef.current.requestSubmit();
                      }
                    }}
                    disabled={submitting}
                    className={`px-6 py-3 ${styles.card} border ${styles.text} rounded-xl hover:bg-white/10 transition flex items-center gap-2 disabled:opacity-70`}
                  >
                    <Icons.FileText className="h-5 w-5" /> حفظ كمسودة
                  </button>

                  <button
                    type="button"
                    onClick={goToList}
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
                <Icons.Eye className="h-4 w-4 text-yellow-400" /> معاينة مباشرة للكورس
              </h3>
              <CoursePreview formData={formData} styles={styles} />
              <p className={`text-[10px] ${styles.subtext} mt-2 text-center`}>
                هذه معاينة تقريبية للكورس بعد الإنشاء
              </p>
            </div>
          </div>
        </div>

        {/* روابط سريعة */}
        <div className={`${styles.card} border rounded-2xl p-4 mt-6`}>
          <h3 className={`text-sm font-semibold ${styles.text} mb-2 flex items-center gap-2`}>
            <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
          </h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/dashboard/teacher" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text}`}>
              الرئيسية
            </Link>
            <Link href="/dashboard/teacher/courses" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text}`}>
              قائمة الكورسات
            </Link>
            <Link href="/dashboard/teacher/exams" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text}`}>
              الامتحانات
            </Link>
            <Link href="/dashboard/teacher/videos" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text}`}>
              الفيديوهات
            </Link>
            <Link href="/dashboard/teacher/books" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text}`}>
              الكتب
            </Link>
            <Link href="/dashboard/teacher/question-bank" className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition text-purple-300 hover:text-purple-200">
              بنوك الأسئلة
            </Link>
            <Link href="/dashboard/teacher/students" className={`text-xs ${styles.card} hover:bg-white/10 px-3 py-1.5 rounded-lg transition ${styles.text}`}>
              الطلاب
            </Link>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}

// ============================================================
// تم التعديل بنجاح – عرض الصورة كاملة (object-contain) + منطق ذكي للمجاني والدفع
// ============================================================