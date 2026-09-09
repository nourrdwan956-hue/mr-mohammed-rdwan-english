'use client';

// ================================================================
// ✏️ تعديل بيانات المساعد – نموذج متكامل مع معاينة البطاقة
// المسار: app/dashboard/teacher/assistants/[assistantId]/edit/page.js
// ================================================================
// الميزات:
// - جلب بيانات المساعد الحالية (الاسم، الدور، مستوى الصلاحية، الحالة، الصلاحيات)
// - تعديل جميع البيانات (الاسم الرباعي، المعروض، الدور، مستوى الصلاحية، الحالة)
// - تحديث الصلاحيات لكل وحدة (عرض، إنشاء، تعديل، حذف، نشر، إدارة كاملة)
// - معاينة البطاقة بشكل حيوي مع التعديلات
// - دعم الوضع الفاتح والداكن
// - زر إعادة تعيين كلمة المرور ورمز الأمان (اختياري)
// - حفظ التغييرات مع معالجة الأخطاء
// - العودة إلى صفحة التفاصيل بعد الحفظ
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد

// ================================================================
// 1. دوال توليد كلمة المرور ورمز الأمان (لإعادة التعيين)
// ================================================================
const generatePassword = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+';
  let password = '';
  for (let i = 0; i < 10; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

const generateAccessCode = async () => {
  let code = '';
  let exists = true;
  while (exists) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    code = '';
    for (let i = 0; i < 10; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const { data } = await supabase
      .from('assistants')
      .select('access_code')
      .eq('access_code', code)
      .single();
    exists = !!data;
  }
  return code;
};

// ================================================================
// 2. مكون معاينة البطاقة (مختصر)
// ================================================================
const AssistantCardPreview = ({ assistant, styles }) => {
  const roleLabels = {
    chief: 'رئيس المساعدين',
    expert: 'خبير',
    technical: 'تقني',
    supervisor: 'مشرف',
    coordinator: 'منسق',
    assistant: 'مساعد',
    intern: 'متدرب',
  };

  if (!assistant) return null;

  const displayName = assistant.display_name || assistant.full_name || 'مساعد';
  const roleLabel = roleLabels[assistant.role] || assistant.role || 'مساعد';

  return (
    <div className={`${styles.cardBg || 'bg-white/5'} border ${styles.border} rounded-3xl p-6 shadow-2xl`}>
      <div className="text-center border-b border-yellow-400/20 pb-4 mb-4">
        <h1 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
          🏫 منصة محمد رضوان
        </h1>
        <p className="text-xs text-gray-400">التعليمية المتكاملة</p>
      </div>

      <div className="flex flex-col items-center mb-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold text-3xl">
          {displayName.charAt(0)}
        </div>
        <h2 className="text-xl font-bold text-white mt-2">{displayName}</h2>
        <span className="text-xs bg-yellow-400/20 text-yellow-400 px-3 py-1 rounded-full border border-yellow-400/20 mt-1">
          {roleLabel}
        </span>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <span className="text-gray-400">الاسم الرباعي</span>
          <span className="text-white font-medium">{assistant.full_name || '—'}</span>
        </div>
        <div className="flex justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <span className="text-gray-400">مستوى الصلاحية</span>
          <span className="text-yellow-400 font-medium">{assistant.role_level || 1}</span>
        </div>
        <div className="flex justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <span className="text-gray-400">كلمة المرور</span>
          <span className="text-green-400 font-mono text-sm" dir="ltr">{assistant.password || '••••••••••'}</span>
        </div>
        <div className="flex justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <span className="text-gray-400">رمز الأمان</span>
          <span className="text-blue-400 font-mono text-sm" dir="ltr">{assistant.access_code || '••••••••••'}</span>
        </div>
      </div>

      <div className="mt-4 text-center border-t border-yellow-400/20 pt-3">
        <div className="flex justify-center gap-4 text-xs text-gray-500">
          <span>🔒 محمية</span>
          <span>🖨️ قابلة للطباعة</span>
          <span>📱 صالحة للاستخدام</span>
        </div>
      </div>
    </div>
  );
};

// ================================================================
// 3. الصفحة الرئيسية – تعديل المساعد
// ================================================================
export default function EditAssistantPage() {
  const router = useRouter();
  const params = useParams();
  const assistantId = params.assistantId;
  // ✅ استخدام الثيم المركزي
  const { theme } = useTheme();

  // ✅ بناء أنماط محلية تعتمد على theme
  const styles = theme === 'dark' ? {
    bg: 'bg-[#0b0e1a]',
    text: 'text-white',
    subtext: 'text-gray-300',
    card: 'bg-white/5 backdrop-blur-sm border-white/10',
    input: 'bg-white/10 border-white/20 text-white placeholder-gray-300',
    label: 'text-white',
    hover: 'hover:border-yellow-400/50',
    shadow: 'shadow-yellow-400/10',
    border: 'border-white/10',
    cardBg: 'bg-gradient-to-br from-yellow-400/10 via-purple-500/10 to-blue-500/10',
  } : {
    bg: 'bg-gray-50',
    text: 'text-gray-900',
    subtext: 'text-gray-700',
    card: 'bg-white/90 backdrop-blur-sm border-gray-200',
    input: 'bg-gray-100 border-gray-300 text-gray-900 placeholder-gray-400',
    label: 'text-gray-800',
    hover: 'hover:border-yellow-400/70',
    shadow: 'shadow-yellow-400/30',
    border: 'border-gray-200',
    cardBg: 'bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20',
  };

  // ===== حالات النموذج =====
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('assistant');
  const [roleLevel, setRoleLevel] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [originalAccessCode, setOriginalAccessCode] = useState('');
  const [originalPassword, setOriginalPassword] = useState('');

  // ===== قائمة الوحدات المحدثة – النظام الجديد =====
  const modules = [
    { id: 'courses', label: 'الكورسات' },
    { id: 'videos', label: 'الفيديوهات' },
    { id: 'exams', label: 'الامتحانات' },
    { id: 'books', label: 'الكتب' },
    { id: 'question_bank', label: 'بنوك الأسئلة' },
    { id: 'support', label: 'الدعم' },
    { id: 'announcements', label: 'الإعلانات' },
    { id: 'messages', label: 'المراسلات' },
    { id: 'notes', label: 'الملاحظات' },
  ];

  const [permissions, setPermissions] = useState({});

  // ===== جلب بيانات المساعد =====
  const fetchAssistant = useCallback(async () => {
    if (!assistantId) return;
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // 1. جلب بيانات المساعد
      const { data: assistantData, error: assistantError } = await supabase
        .from('assistants')
        .select('*')
        .eq('id', assistantId)
        .single();

      if (assistantError) throw assistantError;
      if (!assistantData) {
        toast.error('المساعد غير موجود');
        router.push('/dashboard/teacher/assistants');
        return;
      }

      if (assistantData.teacher_id !== user.id) {
        toast.error('غير مصرح لك بتعديل هذا المساعد');
        router.push('/dashboard/teacher/assistants');
        return;
      }

      setFullName(assistantData.full_name || '');
      setDisplayName(assistantData.display_name || '');
      setRole(assistantData.role || 'assistant');
      setRoleLevel(assistantData.role_level || 1);
      setIsActive(assistantData.is_active || false);
      setOriginalAccessCode(assistantData.access_code || '');
      setOriginalPassword(assistantData.password_hash || '');

      // 2. جلب الصلاحيات
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('assistant_id', assistantId);

      if (permissionsError) throw permissionsError;

      // تحويل الصلاحيات إلى كائن
      const permsObj = {};
      modules.forEach(mod => {
        permsObj[mod.id] = { can_view: false, can_create: false, can_edit: false, can_delete: false, can_publish: false, can_manage: false };
      });
      permissionsData?.forEach(p => {
        if (permsObj[p.module]) {
          permsObj[p.module] = {
            can_view: p.can_view || false,
            can_create: p.can_create || false,
            can_edit: p.can_edit || false,
            can_delete: p.can_delete || false,
            can_publish: p.can_publish || false,
            can_manage: p.can_manage || false,
          };
        }
      });
      setPermissions(permsObj);

    } catch (err) {
      console.error('Error fetching assistant:', err);
      setError('فشل جلب بيانات المساعد');
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [assistantId, router]); // ✅ تم حذف modules من التبعيات

  useEffect(() => {
    fetchAssistant();
  }, [fetchAssistant]);

  // ===== دوال الصلاحيات =====
  const toggleAllPermissions = (moduleId, value) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        can_view: value,
        can_create: value,
        can_edit: value,
        can_delete: value,
        can_publish: value,
        can_manage: value,
      },
    }));
  };

  const togglePermission = (moduleId, permission, value) => {
    setPermissions(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [permission]: value,
      },
    }));
  };

  // ===== التحقق من صحة النموذج =====
  const validate = () => {
    if (!fullName.trim()) {
      toast.error('الاسم الرباعي مطلوب');
      return false;
    }
    if (fullName.trim().split(' ').length < 3) {
      toast.error('يرجى إدخال الاسم الرباعي كاملاً (ثلاثة أسماء على الأقل)');
      return false;
    }
    if (!displayName.trim()) {
      toast.error('الاسم المعروض مطلوب');
      return false;
    }
    return true;
  };

  // ===== حفظ التغييرات =====
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');

      // 1. تحديث بيانات المساعد
      const updateData = {
        full_name: fullName.trim(),
        display_name: displayName.trim(),
        role: role,
        role_level: parseInt(roleLevel),
        is_active: isActive,
        updated_at: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from('assistants')
        .update(updateData)
        .eq('id', assistantId);

      if (updateError) throw updateError;

      // 2. تحديث الصلاحيات (حذف القديمة وإدراج الجديدة)
      // حذف الصلاحيات القديمة
      const { error: deleteError } = await supabase
        .from('assistant_permissions')
        .delete()
        .eq('assistant_id', assistantId);

      if (deleteError) throw deleteError;

      // إدراج الصلاحيات الجديدة
      const permissionsData = [];
      Object.entries(permissions).forEach(([moduleId, perms]) => {
        const anyActive = Object.values(perms).some(v => v === true);
        if (anyActive) {
          permissionsData.push({
            assistant_id: assistantId,
            module: moduleId,
            ...perms,
          });
        }
      });

      if (permissionsData.length > 0) {
        const { error: insertError } = await supabase
          .from('assistant_permissions')
          .insert(permissionsData);
        if (insertError) throw insertError;
      }

      setSuccess('✅ تم تحديث بيانات المساعد بنجاح');
      toast.success('تم تحديث بيانات المساعد');

      setTimeout(() => {
        router.push(`/dashboard/teacher/assistants/${assistantId}`);
      }, 1500);

    } catch (err) {
      console.error('Error updating assistant:', err);
      setError('فشل تحديث المساعد: ' + err.message);
      toast.error('فشل تحديث المساعد');
    } finally {
      setSaving(false);
    }
  };

  // ===== إعادة تعيين كلمة المرور =====
  const handleResetPassword = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين كلمة المرور؟ سيتم إنشاء كلمة مرور جديدة.')) return;
    try {
      const newPassword = generatePassword();
      const { error } = await supabase
        .from('assistants')
        .update({ password_hash: newPassword, updated_at: new Date().toISOString() })
        .eq('id', assistantId);
      if (error) throw error;
      setOriginalPassword(newPassword);
      toast.success('✅ تم إعادة تعيين كلمة المرور');
    } catch (err) {
      toast.error('فشل إعادة تعيين كلمة المرور');
    }
  };

  // ===== إعادة تعيين رمز الأمان =====
  const handleResetAccessCode = async () => {
    if (!confirm('هل أنت متأكد من إعادة تعيين رمز الأمان؟ سيتم إنشاء رمز جديد.')) return;
    try {
      const newCode = await generateAccessCode();
      const { error } = await supabase
        .from('assistants')
        .update({ access_code: newCode, updated_at: new Date().toISOString() })
        .eq('id', assistantId);
      if (error) throw error;
      setOriginalAccessCode(newCode);
      toast.success('✅ تم إعادة تعيين رمز الأمان');
    } catch (err) {
      toast.error('فشل إعادة تعيين رمز الأمان');
    }
  };

  // ===== العودة =====
  const goBack = () => {
    router.push(`/dashboard/teacher/assistants/${assistantId}`);
  };

  // ===== كائن المساعد للمعاينة =====
  const assistantPreview = useMemo(() => ({
    full_name: fullName || 'الاسم الرباعي',
    display_name: displayName || 'الاسم المعروض',
    role: role,
    role_level: roleLevel,
    password: originalPassword || '••••••••••',
    access_code: originalAccessCode || '••••••••••',
  }), [fullName, displayName, role, roleLevel, originalPassword, originalAccessCode]);

  // ===== حالة التحميل =====
  if (loading) {
    return (
      <TeacherLayout>
        <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden`}>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {/* ===== الهيدر ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
                ✏️ تعديل المساعد
              </h1>
              <p className={`${styles.subtext} text-sm mt-1`}>
                تحديث بيانات وصلاحيات المساعد
                <span className="text-yellow-400 mr-2">— {displayName || fullName}</span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              {/* ❌ تم حذف زر تبديل الثيم المكرر */}
              <button
                onClick={goBack}
                className={`px-4 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition flex items-center gap-2`}
              >
                <Icons.ArrowRight className="h-4 w-4" /> العودة للتفاصيل
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

          {/* ===== النموذج والمعاينة ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* النموذج */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* البيانات الأساسية */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6 ${styles.hover} transition-all duration-500`}>
                <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                  <Icons.User className="h-5 w-5 text-yellow-400" /> البيانات الأساسية
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                      الاسم الرباعي <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="مثال: أحمد محمد علي حسن"
                      className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      required
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                      الاسم المعروض <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="مثال: الأستاذ أحمد"
                      className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                        الدور الوظيفي <span className="text-red-400">*</span>
                      </label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      >
                        <option value="chief">رئيس المساعدين</option>
                        <option value="expert">خبير</option>
                        <option value="technical">تقني</option>
                        <option value="supervisor">مشرف</option>
                        <option value="coordinator">منسق</option>
                        <option value="assistant">مساعد</option>
                        <option value="intern">متدرب</option>
                      </select>
                    </div>
                    <div>
                      <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                        مستوى الصلاحية (1-10)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={roleLevel}
                        onChange={(e) => setRoleLevel(parseInt(e.target.value) || 1)}
                        className={`w-full p-3 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-5 h-5 accent-yellow-400 rounded"
                    />
                    <label className={`text-sm ${styles.text}`}>المساعد مفعل</label>
                  </div>
                </div>
              </div>

              {/* الصلاحيات */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6 ${styles.hover} transition-all duration-500`}>
                <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                  <Icons.Shield className="h-5 w-5 text-yellow-400" /> الصلاحيات
                </h3>
                <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                  {modules.map((mod) => {
                    const perms = permissions[mod.id] || {};
                    const anyActive = Object.values(perms).some(v => v === true);
                    return (
                      <div key={mod.id} className={`${styles.card} border ${styles.border} rounded-xl p-4 ${anyActive ? 'border-yellow-400/30' : ''}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-sm font-medium ${styles.text}`}>{mod.label}</span>
                          <button
                            type="button"
                            onClick={() => toggleAllPermissions(mod.id, !anyActive)}
                            className={`text-xs px-2 py-1 rounded-lg ${anyActive ? 'bg-yellow-400/20 text-yellow-400' : 'bg-white/5 text-gray-400'} hover:bg-yellow-400/30 transition`}
                          >
                            {anyActive ? 'إلغاء الكل' : 'تحديد الكل'}
                          </button>
                        </div>
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-xs">
                          {['can_view', 'can_create', 'can_edit', 'can_delete', 'can_publish', 'can_manage'].map((perm) => {
                            const labels = {
                              can_view: 'عرض',
                              can_create: 'إنشاء',
                              can_edit: 'تعديل',
                              can_delete: 'حذف',
                              can_publish: 'نشر',
                              can_manage: 'إدارة كاملة',
                            };
                            return (
                              <label key={perm} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={perms[perm] || false}
                                  onChange={(e) => togglePermission(mod.id, perm, e.target.checked)}
                                  className="w-3.5 h-3.5 accent-yellow-400 rounded"
                                />
                                <span className={`${styles.subtext} text-[10px]`}>{labels[perm]}</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* أزرار الإرسال */}
              <div className="flex flex-wrap gap-4">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {saving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Icons.Save className="h-5 w-5" /> حفظ التغييرات
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={goBack}
                  className={`px-6 py-3 ${styles.card} border ${styles.border} rounded-xl hover:bg-white/5 transition`}
                >
                  إلغاء
                </button>
              </div>
            </form>

            {/* ===== العمود الأيمن: معاينة البطاقة + إعادة تعيين ===== */}
            <div className="space-y-4">
              {/* معاينة البطاقة */}
              <div>
                <h3 className={`text-sm font-bold ${styles.text} flex items-center gap-2 mb-3`}>
                  <Icons.CreditCard className="h-4 w-4 text-yellow-400" />
                  معاينة البطاقة
                </h3>
                <AssistantCardPreview assistant={assistantPreview} styles={styles} />
              </div>

              {/* إعادة تعيين كلمة المرور ورمز الأمان */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
                <h3 className={`text-sm font-bold ${styles.text} mb-3 flex items-center gap-2`}>
                  <Icons.Key className="h-4 w-4 text-yellow-400" /> إدارة بيانات الاعتماد
                </h3>
                <div className="space-y-3">
                  <div className={`${styles.card} border ${styles.border} rounded-xl p-3`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`text-xs ${styles.subtext}`}>كلمة المرور</p>
                        <p className={`text-sm font-mono ${styles.text}`} dir="ltr">{originalPassword || '••••••••••'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetPassword}
                        className="px-3 py-1.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Icons.RefreshCw className="h-3.5 w-3.5" /> إعادة تعيين
                      </button>
                    </div>
                  </div>
                  <div className={`${styles.card} border ${styles.border} rounded-xl p-3`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <p className={`text-xs ${styles.subtext}`}>رمز الأمان</p>
                        <p className={`text-sm font-mono ${styles.text}`} dir="ltr">{originalAccessCode || '••••••••••'}</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleResetAccessCode}
                        className="px-3 py-1.5 bg-blue-400/20 hover:bg-blue-400/30 text-blue-400 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                      >
                        <Icons.RefreshCw className="h-3.5 w-3.5" /> إعادة تعيين
                      </button>
                    </div>
                  </div>
                </div>
                <p className={`text-[10px] ${styles.subtext} mt-2 opacity-60`}>
                  سيؤدي إعادة التعيين إلى إنشاء بيانات جديدة، تأكد من إبلاغ المساعد بها.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== CSS إضافي ===== */}
      <style jsx>{`
        @keyframes gradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .animate-gradient {
          animation: gradient 8s ease infinite;
          background-size: 200% 200%;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 215, 0, 0.3);
          border-radius: 10px;
        }
      `}</style>
    </TeacherLayout>
  );
}