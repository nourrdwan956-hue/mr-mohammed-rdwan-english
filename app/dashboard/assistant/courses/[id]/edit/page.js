// ================================================================
// 📁 app/dashboard/assistant/courses/[id]/edit/page.js
// ✏️ تعديل الكورس للمساعد – النسخة المتطورة V1
// ================================================================
// - مستوحاة من نسخة المعلم مع تحسينات خاصة بالمساعد
// - دعم كامل للصلاحيات (can_edit)
// - دعم الثيم الفاتح/الداكن عبر useTheme
// - استخدام APIs خاصة بالمساعد لجلب البيانات وتحديثها
// - معاينة مباشرة للتعديلات
// ================================================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import {
  ArrowRight,
  BookOpen,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Eye,
  Sun,
  Moon,
  Book,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/app/theme/ThemeProvider';

// ================================================================
// 🔧 دوال مساعدة
// ================================================================

const generateSlug = (text) => {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
};

const hasPermission = (permissions, module, permission) => {
  if (!permissions || permissions.length === 0) return false;
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true;
  return perm[permission] === true;
};

// ================================================================
// 🎨 مكون المعاينة المباشرة
// ================================================================

const CoursePreview = ({ formData, isDark }) => {
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
      className={`relative rounded-2xl overflow-hidden transition-all duration-500 ${
        isDark
          ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
          : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
      }`}
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
            <BookOpen className={`h-16 w-16 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
              لا توجد صورة
            </span>
          </div>
        )}
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
        <h3 className={`text-lg font-bold truncate ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
          {formData.title || 'عنوان الكورس'}
        </h3>
        <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
          {formData.description || 'وصف الكورس سيظهر هنا'}
        </p>
        <div className="flex items-center justify-between mt-3 text-xs">
          <span className={isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}>
            {gradeDisplay}
          </span>
          <span className="font-extrabold text-yellow-400">
            {formData.is_free ? '🎁 مجاني' : `${formData.price || 0} ج.م`}
          </span>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 📄 الصفحة الرئيسية – تعديل الكورس للمساعد
// ================================================================

export default function AssistantEditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.id;
  const { isDark, toggleTheme } = useTheme();

  // ===== حالات عامة =====
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [course, setCourse] = useState(null);
  const [permissions, setPermissions] = useState([]);

  // ===== حالة النموذج =====
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    grade_stage: '',
    grade_level: '',
    cover_image: '',
    is_free: false,
  });
  const [formErrors, setFormErrors] = useState({});
  const [slug, setSlug] = useState('');

  // ===== جلب بيانات الكورس والصلاحيات =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 1. جلب بيانات المساعد من sessionStorage
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        toast.error('الرجاء تسجيل الدخول أولاً');
        router.replace('/assistant-login');
        return;
      }
      const parsed = JSON.parse(sessionData);

      // 2. جلب الصلاحيات
      const permsRes = await fetch('/api/assistant-data', {
        headers: { 'x-assistant-id': parsed.id },
      });
      const permsData = await permsRes.json();
      if (permsRes.ok && permsData.success) {
        setPermissions(permsData.permissions || []);
      }

      // 3. التحقق من صلاحية التعديل
      if (!hasPermission(permsData.permissions || [], 'courses', 'can_edit')) {
        toast.error('ليس لديك صلاحية لتعديل الكورسات');
        router.replace('/dashboard/assistant');
        return;
      }

      // 4. جلب بيانات الكورس
      const res = await fetch(`/api/assistant/courses/${courseId}?teacher_id=${parsed.teacher_id}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل جلب بيانات الكورس');
      }

      const c = data.course;
      if (!c) {
        toast.error('الكورس غير موجود');
        router.replace('/dashboard/assistant/courses');
        return;
      }

      setCourse(c);
      setFormData({
        title: c.title || '',
        description: c.description || '',
        price: c.price?.toString() || '',
        grade_stage: c.grade_stage || '',
        grade_level: c.grade_level?.toString() || '',
        cover_image: c.cover_image || '',
        is_free: c.is_free || false,
      });
      setSlug(c.slug || '');

    } catch (err) {
      console.error('Error fetching course:', err);
      setError('فشل جلب بيانات الكورس: ' + err.message);
      toast.error('فشل جلب بيانات الكورس');
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== دوال النموذج =====
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'عنوان الكورس مطلوب';
    if (!formData.description.trim()) errors.description = 'الوصف مطلوب';
    if (!formData.is_free && (!formData.price || parseFloat(formData.price) <= 0)) {
      errors.price = 'السعر مطلوب (أو اختر مجاني)';
    }
    if (!formData.grade_stage.trim()) errors.grade_stage = 'المرحلة الدراسية مطلوبة';
    if (!formData.grade_level.trim()) errors.grade_level = 'الصف الدراسي مطلوب';
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
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        toast.error('الرجاء تسجيل الدخول أولاً');
        return;
      }
      const parsed = JSON.parse(sessionData);

      // تحديد الـ slug الجديد
      let newSlug = slug;
      if (formData.title.trim() !== course.title) {
        let generated = generateSlug(formData.title.trim());
        // التحقق من عدم التكرار (يُفضل أن يقوم API بذلك)
        newSlug = generated;
      }

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
      };

      const res = await fetch(`/api/assistant/courses/${courseId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'فشل تحديث الكورس');
      }

      setSuccess('✅ تم تحديث الكورس بنجاح!');
      toast.success('تم تحديث الكورس بنجاح');
      setTimeout(() => {
        router.push(`/dashboard/assistant/courses/${courseId}`);
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
  const goBack = () => router.push(`/dashboard/assistant/courses/${courseId}`);
  const goToList = () => router.push('/dashboard/assistant/courses');

  // ===== حالة التحميل =====
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
            جاري تحميل بيانات الكورس...
          </p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <AlertCircle className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-400' : 'text-gray-300'}`} />
          <h2 className={`text-2xl font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
            الكورس غير موجود
          </h2>
          <button
            onClick={goToList}
            className="mt-4 px-6 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
          >
            العودة إلى قائمة الكورسات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">✏️ تعديل الكورس</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
              قم بتحديث بيانات الكورس "{course.title}"
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
            <button
              onClick={goBack}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 text-gray-600 shadow-sm'
              }`}
            >
              <ArrowRight className="h-4 w-4" /> العودة للتفاصيل
            </button>
            <button
              onClick={goToList}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-2 ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50 text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 text-gray-600 shadow-sm'
              }`}
            >
              <Book className="h-4 w-4" /> قائمة الكورسات
            </button>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
              }`}
            >
              {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-gray-600" />}
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
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
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
              className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-4 flex items-center gap-3"
            >
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{success}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== نموذج التعديل مع معاينة مباشرة ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* النموذج */}
          <div className="lg:col-span-2">
            <div className={`rounded-2xl p-6 transition-all duration-500 ${
              isDark
                ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
                : 'bg-white border border-gray-200 shadow-sm'
            }`}>
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* عنوان الكورس */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                    عنوان الكورس <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="مثال: جرامر الترم الأول"
                    className={`w-full p-3 rounded-xl border outline-none transition ${
                      isDark
                        ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.title ? 'border-red-500' : ''}`
                        : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.title ? 'border-red-500' : ''}`
                    }`}
                  />
                  {formErrors.title && <p className="text-red-400 text-xs mt-1">{formErrors.title}</p>}
                  <p className={`text-xs mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                    المعرف الفريد للكورس: <span className="text-yellow-400 font-mono">{slug}</span>
                  </p>
                </div>

                {/* الوصف */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                    الوصف <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows="4"
                    placeholder="وصف مختصر للكورس ومحتوياته"
                    className={`w-full p-3 rounded-xl border outline-none transition resize-none ${
                      isDark
                        ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.description ? 'border-red-500' : ''}`
                        : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.description ? 'border-red-500' : ''}`
                    }`}
                  />
                  {formErrors.description && <p className="text-red-400 text-xs mt-1">{formErrors.description}</p>}
                </div>

                {/* السعر والمجاني */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                      السعر (ج.م) {!formData.is_free && <span className="text-red-400">*</span>}
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleChange}
                      placeholder="250"
                      disabled={formData.is_free}
                      className={`w-full p-3 rounded-xl border outline-none transition ${
                        isDark
                          ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.price ? 'border-red-500' : ''} disabled:opacity-50 disabled:cursor-not-allowed`
                          : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.price ? 'border-red-500' : ''} disabled:opacity-50 disabled:cursor-not-allowed`
                      }`}
                    />
                    {formErrors.price && <p className="text-red-400 text-xs mt-1">{formErrors.price}</p>}
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <input
                      type="checkbox"
                      name="is_free"
                      checked={formData.is_free}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          is_free: checked,
                          price: checked ? '' : prev.price,
                        }));
                      }}
                      className="w-5 h-5 accent-yellow-400 rounded cursor-pointer"
                    />
                    <label className={`text-sm font-medium cursor-pointer ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                      🎁 كورس مجاني
                    </label>
                  </div>
                </div>

                {/* المرحلة الدراسية */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                    المرحلة الدراسية <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="grade_stage"
                    value={formData.grade_stage}
                    onChange={handleChange}
                    className={`w-full p-3 rounded-xl border outline-none transition appearance-none ${
                      isDark
                        ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.grade_stage ? 'border-red-500' : ''}`
                        : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.grade_stage ? 'border-red-500' : ''}`
                    }`}
                  >
                    <option value="">اختر المرحلة</option>
                    <option value="ابتدائي">ابتدائي</option>
                    <option value="اعدادي">اعدادي</option>
                    <option value="ثانوي">ثانوي</option>
                  </select>
                  {formErrors.grade_stage && <p className="text-red-400 text-xs mt-1">{formErrors.grade_stage}</p>}
                </div>

                {/* الصف الدراسي */}
                {formData.grade_stage && (
                  <div>
                    <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                      الصف الدراسي <span className="text-red-400">*</span>
                    </label>
                    <select
                      name="grade_level"
                      value={formData.grade_level}
                      onChange={handleChange}
                      className={`w-full p-3 rounded-xl border outline-none transition appearance-none ${
                        isDark
                          ? `bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50 ${formErrors.grade_level ? 'border-red-500' : ''}`
                          : `bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50 ${formErrors.grade_level ? 'border-red-500' : ''}`
                      }`}
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
                    {formErrors.grade_level && <p className="text-red-400 text-xs mt-1">{formErrors.grade_level}</p>}
                  </div>
                )}

                {/* صورة الغلاف */}
                <div>
                  <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-700'}`}>
                    رابط صورة الغلاف (اختياري)
                  </label>
                  <input
                    type="text"
                    name="cover_image"
                    value={formData.cover_image}
                    onChange={handleChange}
                    placeholder="https://example.com/image.jpg"
                    className={`w-full p-3 rounded-xl border outline-none transition ${
                      isDark
                        ? 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                        : 'bg-gray-50 border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
                    }`}
                  />
                  <p className={`text-xs mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                    أدخل رابط صورة الغلاف (اختياري)
                  </p>
                </div>

                {/* أزرار الإرسال */}
                <div className="flex flex-wrap gap-4 pt-4 border-t border-[var(--border-color)]">
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
                        <Save className="h-5 w-5" /> تحديث الكورس
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
              </form>
            </div>
          </div>

          {/* المعاينة المباشرة */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
                <Eye className="h-4 w-4 text-yellow-400" /> معاينة مباشرة
              </h3>
              <CoursePreview formData={formData} isDark={isDark} />
              <p className={`text-[10px] mt-2 text-center ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                هذه معاينة تقريبية للكورس بعد التعديلات
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}