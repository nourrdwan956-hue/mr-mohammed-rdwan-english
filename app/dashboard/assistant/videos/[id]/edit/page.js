// app/dashboard/assistant/videos/[id]/edit/page.js
'use client';

// ================================================================
// ✏️ تعديل الفيديو – إصدار متطور جداً V4
// ================================================================
// الميزات:
// - جلب بيانات الفيديو الحالية وعرضها في النموذج
// - تعديل جميع بيانات الفيديو (العنوان، الوصف، الكورس، نوع التخزين، الرابط/الملف، المدة، الوسوم، المرحلة، الصف، الخيارات المتقدمة)
// - دعم تغيير نوع التخزين مع معالجة الملفات القديمة والجديدة
// - رفع ملف فيديو جديد مع حذف القديم من التخزين
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
// 1. مكون حقل الإدخال (مستعار)
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
// 2. مكون اختيار نوع التخزين
// ================================================================
const StorageTypeSelector = ({ value, onChange, styles }) => {
  const options = [
    { value: 'youtube', label: '▶️ يوتيوب', description: 'رابط فيديو من YouTube' },
    { value: 'self_hosted', label: '📁 خادم ذاتي', description: 'رفع ملف فيديو محلي' },
  ];

  return (
    <div className="space-y-2">
      <label className={`block text-sm font-medium ${styles.label}`}>
        نوع التخزين <span className="text-red-400">*</span>
      </label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {options.map((opt) => (
          <motion.div
            key={opt.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(opt.value)}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
              value === opt.value
                ? 'border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                : 'border-white/10 hover:border-white/30'
            } ${styles.card}`}
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${
                value === opt.value ? 'bg-purple-500/20' : 'bg-white/5'
              }`}>
                <span className="text-xl">{opt.label.split(' ')[0]}</span>
              </div>
              <div>
                <p className={`text-sm font-medium ${styles.text}`}>{opt.label}</p>
                <p className={`text-xs ${styles.subtext} opacity-60`}>{opt.description}</p>
              </div>
              {value === opt.value && (
                <Icons.CheckCircle className="mr-auto h-5 w-5 text-purple-400" />
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
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
export default function AssistantVideoEditPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.id;
  const { theme, toggleTheme, styles } = useTheme();

  // ===== حالات البيانات =====
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [originalVideo, setOriginalVideo] = useState(null);

  // ===== بيانات النموذج =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    storage_type: 'youtube',
    video_url: '',
    video_file: null,
    duration: '',
    tags: '',
    grade_stage: '',
    grade_level: '',
    is_free: false,
    is_published: false,
    is_scheduled: false,
    scheduled_date: '',
    display_mode: 'normal',
  });

  // ===== أخطاء النموذج =====
  const [errors, setErrors] = useState({});

  // ===== خيارات المرحلة والصف =====
  const gradeStages = ['ابتدائي', 'إعدادي', 'ثانوي'];
  const gradeLevels = {
    'ابتدائي': [1, 2, 3, 4, 5, 6],
    'إعدادي': [1, 2, 3],
    'ثانوي': [1, 2, 3],
  };

  // ===== التحقق من الصلاحيات =====
  const hasPermission = useCallback((module, permission) => {
    if (!permissions || permissions.length === 0) return false;
    const perm = permissions.find(p => p.module === module);
    return perm?.[permission] || perm?.can_manage || false;
  }, [permissions]);

  const canEdit = useCallback(() => {
    return hasPermission('videos', 'can_edit');
  }, [hasPermission]);

  const canDelete = useCallback(() => {
    return hasPermission('videos', 'can_delete');
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

      const hasEdit = permsData?.some(p => p.module === 'videos' && (p.can_edit || p.can_manage));
      if (!hasEdit) {
        toast.error('غير مصرح لك بتعديل الفيديوهات');
        router.push('/dashboard/assistant/videos');
        return;
      }

      // جلب الكورسات
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', parsed.teacher_id)
        .order('title');

      setCourses(coursesData || []);

      // جلب بيانات الفيديو
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('teacher_id', parsed.teacher_id)
        .single();

      if (videoError) {
        if (videoError.code === 'PGRST116') {
          toast.error('الفيديو غير موجود');
          router.push('/dashboard/assistant/videos');
          return;
        }
        throw videoError;
      }

      setOriginalVideo(videoData);

      // تعبئة النموذج
      setFormData({
        title: videoData.title || '',
        description: videoData.description || '',
        course_id: videoData.course_id || '',
        storage_type: videoData.storage_type || 'youtube',
        video_url: videoData.video_url || '',
        video_file: null,
        duration: videoData.duration?.toString() || '',
        tags: videoData.tags?.join(', ') || '',
        grade_stage: videoData.grade_stage || '',
        grade_level: videoData.grade_level?.toString() || '',
        is_free: videoData.is_free || false,
        is_published: videoData.is_published || false,
        is_scheduled: videoData.is_scheduled || false,
        scheduled_date: videoData.scheduled_date || '',
        display_mode: videoData.display_mode || 'normal',
      });

      setDataReady(true);
    } catch (err) {
      console.error('❌ خطأ في تحميل البيانات:', err);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [videoId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== معالجة تغيير الحقول =====
  const handleChange = (e) => {
    const { name, value, type, checked, files } = e.target;

    if (type === 'file') {
      const file = files?.[0];
      if (file) {
        if (file.size > 500 * 1024 * 1024) {
          toast.error('حجم الملف يتجاوز الحد الأقصى (500MB)');
          return;
        }
        const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
        if (!validTypes.includes(file.type)) {
          toast.error('صيغة الملف غير مدعومة. الصيغ المدعومة: MP4, WEBM, OGG, MOV');
          return;
        }
        setFormData(prev => ({ ...prev, video_file: file }));
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

  // ===== معالجة تغيير نوع التخزين =====
  const handleStorageTypeChange = (value) => {
    setFormData(prev => ({
      ...prev,
      storage_type: value,
      // إذا كان التغيير إلى يوتيوب، نحتفظ بالرابط القديم إن وجد
      // إذا كان التغيير إلى خادم ذاتي، نمسح الرابط ونطلب رفع ملف جديد
      video_url: value === 'youtube' ? (originalVideo?.video_url || '') : '',
      video_file: null,
    }));
    if (errors.video_url) {
      setErrors(prev => ({ ...prev, video_url: '' }));
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

  // ===== معالجة الوسوم =====
  const handleTagsChange = (e) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, tags: value }));
    if (errors.tags) {
      setErrors(prev => ({ ...prev, tags: '' }));
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

    if (formData.storage_type === 'youtube') {
      if (!formData.video_url.trim()) {
        newErrors.video_url = 'رابط الفيديو مطلوب';
      } else if (!formData.video_url.includes('youtube.com/watch?v=') && !formData.video_url.includes('youtu.be/')) {
        newErrors.video_url = 'يرجى إدخال رابط YouTube صحيح';
      }
    } else {
      // إذا كان نوع التخزين خادم ذاتي، يجب أن يكون هناك ملف مرفوع أو رابط موجود مسبقاً
      if (!formData.video_file && !originalVideo?.video_url) {
        newErrors.video_url = 'يرجى اختيار ملف فيديو جديد أو الاحتفاظ بالملف الحالي';
      }
    }

    if (!formData.grade_stage) {
      newErrors.grade_stage = 'المرحلة مطلوبة';
    }

    if (!formData.grade_level) {
      newErrors.grade_level = 'الصف مطلوب';
    }

    if (formData.is_scheduled && !formData.scheduled_date) {
      newErrors.scheduled_date = 'تاريخ الجدولة مطلوب';
    }

    if (formData.is_scheduled && formData.scheduled_date) {
      const scheduledDate = new Date(formData.scheduled_date);
      if (scheduledDate <= new Date()) {
        newErrors.scheduled_date = 'تاريخ الجدولة يجب أن يكون في المستقبل';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ===== حذف ملف الفيديو القديم من التخزين =====
  const deleteOldVideoFile = async (url) => {
    if (!url) return;
    try {
      // استخراج مسار الملف من الرابط
      const path = url.split('/').pop();
      if (path) {
        await supabase.storage
          .from('videos')
          .remove([`videos/${path}`]);
      }
    } catch (err) {
      console.warn('⚠️ فشل حذف الملف القديم:', err);
    }
  };

  // ===== رفع ملف فيديو جديد =====
  const uploadVideoFile = async (file) => {
    if (!file) return null;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `videos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('videos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('videos')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (err) {
      console.error('❌ خطأ في رفع الفيديو:', err);
      throw new Error('فشل رفع ملف الفيديو');
    } finally {
      setIsUploading(false);
    }
  };

  // ===== معالجة الوسوم =====
  const processTags = (tagsString) => {
    if (!tagsString.trim()) return [];
    return tagsString
      .split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0);
  };

  // ===== حفظ التعديلات =====
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) {
      toast.error('يرجى تصحيح الأخطاء في النموذج');
      return;
    }

    if (!canEdit()) {
      toast.error('ليس لديك صلاحية لتعديل الفيديوهات');
      return;
    }

    setIsSubmitting(true);

    try {
      let videoUrl = formData.video_url;

      // إذا كان النوع خادم ذاتي ومع وجود ملف جديد للرفع
      if (formData.storage_type === 'self_hosted' && formData.video_file) {
        // حذف الملف القديم إن وجد
        if (originalVideo?.video_url && originalVideo.storage_type === 'self_hosted') {
          await deleteOldVideoFile(originalVideo.video_url);
        }
        // رفع الملف الجديد
        videoUrl = await uploadVideoFile(formData.video_file);
        if (!videoUrl) {
          throw new Error('فشل رفع الفيديو الجديد');
        }
      } else if (formData.storage_type === 'self_hosted' && !formData.video_file && originalVideo?.video_url) {
        // الاحتفاظ بالملف القديم
        videoUrl = originalVideo.video_url;
      }

      // معالجة الوسوم
      const tagsArray = processTags(formData.tags);

      // إعداد بيانات التحديث
      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        course_id: formData.course_id,
        video_url: videoUrl,
        storage_type: formData.storage_type,
        duration: formData.duration ? parseInt(formData.duration) : null,
        tags: tagsArray,
        grade_stage: formData.grade_stage,
        grade_level: parseInt(formData.grade_level),
        is_free: formData.is_free,
        is_published: formData.is_published,
        display_mode: formData.display_mode,
        is_scheduled: formData.is_scheduled,
        scheduled_date: formData.is_scheduled ? formData.scheduled_date : null,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('videos')
        .update(updateData)
        .eq('id', videoId);

      if (updateError) throw updateError;

      toast.success('✅ تم تحديث الفيديو بنجاح');
      router.push(`/dashboard/assistant/videos/${videoId}`);
    } catch (err) {
      console.error('❌ خطأ في تحديث الفيديو:', err);
      toast.error(err.message || 'فشل تحديث الفيديو');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ===== حذف الفيديو =====
  const handleDelete = async () => {
    if (!canDelete()) {
      toast.error('ليس لديك صلاحية لحذف الفيديوهات');
      return;
    }

    try {
      // حذف الملف من التخزين إذا كان من نوع self_hosted
      if (originalVideo?.storage_type === 'self_hosted' && originalVideo.video_url) {
        await deleteOldVideoFile(originalVideo.video_url);
      }

      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      toast.success('✅ تم حذف الفيديو بنجاح');
      setShowDeleteModal(false);
      router.push('/dashboard/assistant/videos');
    } catch (err) {
      console.error('❌ خطأ في حذف الفيديو:', err);
      toast.error('فشل حذف الفيديو');
    }
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
            جاري تحميل بيانات الفيديو...
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
            لا تملك صلاحية لتعديل هذا الفيديو
          </p>
          <Link
            href="/dashboard/assistant/videos"
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
      <div className="max-w-3xl mx-auto">
        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Icons.Edit className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className={`text-3xl font-extrabold ${styles.text}`}>✏️ تعديل الفيديو</h1>
                <p className={`text-sm ${styles.subtext} mt-1`}>
                  {formData.title || 'تعديل بيانات الفيديو'}
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
              href={`/dashboard/assistant/videos/${videoId}`}
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
            placeholder="مثال: شرح درس النحو - الجزء الأول"
            icon={Icons.Video}
            required
          />

          {/* الوصف */}
          <FormInput
            label="الوصف"
            name="description"
            value={formData.description}
            onChange={handleChange}
            error={errors.description}
            placeholder="وصف مختصر عن محتوى الفيديو..."
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

          {/* نوع التخزين */}
          <StorageTypeSelector
            value={formData.storage_type}
            onChange={handleStorageTypeChange}
            styles={styles}
          />

          {/* رابط/ملف الفيديو حسب النوع */}
          {formData.storage_type === 'youtube' ? (
            <FormInput
              label="رابط الفيديو (YouTube)"
              name="video_url"
              value={formData.video_url}
              onChange={handleChange}
              error={errors.video_url}
              placeholder="https://www.youtube.com/watch?v=..."
              icon={Icons.Link}
              required
            />
          ) : (
            <div>
              <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                ملف الفيديو
              </label>
              <div className={`relative ${styles.input} border ${errors.video_url ? 'border-red-400' : styles.border} rounded-xl p-4 cursor-pointer hover:border-purple-400/50 transition-all duration-300`}>
                <input
                  type="file"
                  name="video_file"
                  accept="video/*"
                  onChange={handleChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex items-center gap-3">
                  <Icons.Upload className="h-6 w-6 text-purple-400" />
                  <div>
                    <p className={`text-sm ${styles.text}`}>
                      {formData.video_file
                        ? formData.video_file.name
                        : originalVideo?.video_url
                          ? '📁 ملف موجود (اختر ملفاً جديداً لاستبداله)'
                          : 'اختر ملف فيديو'}
                    </p>
                    <p className={`text-xs ${styles.subtext} opacity-60`}>
                      {formData.video_file
                        ? `${(formData.video_file.size / (1024 * 1024)).toFixed(1)} MB`
                        : originalVideo?.video_url
                          ? 'سيتم الاحتفاظ بالملف الحالي إذا لم تختر ملفاً جديداً'
                          : 'الصيغ المدعومة: MP4, WEBM, OGG, MOV • الحد الأقصى: 500MB'}
                    </p>
                  </div>
                </div>
              </div>
              {errors.video_url && (
                <p className="text-red-400 text-xs mt-1">{errors.video_url}</p>
              )}
            </div>
          )}

          {/* المدة */}
          <FormInput
            label="المدة (بالثواني - اختياري)"
            name="duration"
            type="number"
            value={formData.duration}
            onChange={handleChange}
            error={errors.duration}
            placeholder="مثال: 360 (يساوي 6 دقائق)"
            icon={Icons.Clock}
          />

          {/* الوسوم */}
          <div>
            <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
              الوسوم (اختياري)
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleTagsChange}
              placeholder="مثال: نحو, قواعد, شرح, درس"
              className={`w-full p-3 ${styles.input} border ${errors.tags ? 'border-red-400' : styles.border} rounded-xl focus:ring-2 focus:ring-purple-400/50 outline-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500`}
            />
            <p className={`text-[10px] ${styles.subtext} opacity-60 mt-1`}>
              اكتب الوسوم مفصولة بفواصل (مثال: نحو, قواعد, شرح)
            </p>
          </div>

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

          {/* خيارات متقدمة */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className={`flex items-center gap-3 cursor-pointer ${styles.text}`}>
                <input
                  type="checkbox"
                  name="is_free"
                  checked={formData.is_free}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                فيديو مجاني
              </label>

              <label className={`flex items-center gap-3 cursor-pointer ${styles.text}`}>
                <input
                  type="checkbox"
                  name="is_published"
                  checked={formData.is_published}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                الفيديو منشور
              </label>
            </div>

            <div className="space-y-3">
              <label className={`flex items-center gap-3 cursor-pointer ${styles.text}`}>
                <input
                  type="checkbox"
                  name="is_scheduled"
                  checked={formData.is_scheduled}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                جدولة النشر
              </label>

              {formData.is_scheduled && (
                <FormInput
                  label="تاريخ الجدولة"
                  name="scheduled_date"
                  type="datetime-local"
                  value={formData.scheduled_date}
                  onChange={handleChange}
                  error={errors.scheduled_date}
                  required={formData.is_scheduled}
                />
              )}
            </div>
          </div>

          {/* وضع العرض */}
          <div>
            <label className={`block text-sm font-medium ${styles.label} mb-2`}>
              وضع العرض
            </label>
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormData(prev => ({ ...prev, display_mode: 'normal' }))}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  formData.display_mode === 'normal'
                    ? 'border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                    : 'border-white/10 hover:border-white/30'
                } ${styles.card}`}
              >
                <div className="flex items-center gap-3">
                  <Icons.Eye className="h-5 w-5 text-cyan-400" />
                  <div>
                    <p className={`text-sm font-medium ${styles.text}`}>👁️ عادي</p>
                    <p className={`text-xs ${styles.subtext} opacity-60`}>عرض الفيديو بشكل طبيعي</p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setFormData(prev => ({ ...prev, display_mode: 'protected' }))}
                className={`p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                  formData.display_mode === 'protected'
                    ? 'border-purple-400 bg-purple-500/10 shadow-lg shadow-purple-500/20'
                    : 'border-white/10 hover:border-white/30'
                } ${styles.card}`}
              >
                <div className="flex items-center gap-3">
                  <Icons.Shield className="h-5 w-5 text-orange-400" />
                  <div>
                    <p className={`text-sm font-medium ${styles.text}`}>🛡️ محمي</p>
                    <p className={`text-xs ${styles.subtext} opacity-60`}>مع بصمة مائية ومنع تحميل</p>
                  </div>
                </div>
              </motion.div>
            </div>
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
                  {isUploading ? 'جاري رفع الفيديو...' : 'جاري الحفظ...'}
                </>
              ) : (
                <>
                  <Icons.Save className="h-5 w-5" />
                  حفظ التغييرات
                </>
              )}
            </button>
            <Link
              href={`/dashboard/assistant/videos/${videoId}`}
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
        title={originalVideo?.title}
      />
    </div>
  );
}