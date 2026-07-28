'use client';

// ================================================================
// 👥 إضافة مساعد جديد – نموذج متكامل مع معاينة البطاقة V2
// المسار: app/dashboard/teacher/assistants/new/page.js
// ================================================================
// الميزات:
// - نموذج إدخال بيانات المساعد (الاسم الرباعي، الاسم المعروض، الدور، مستوى الصلاحية)
// - توليد تلقائي لكلمة مرور قوية (10 خانات) ورمز أمان فريد (10 خانات) مع إمكانية تجديدهما
// - اختيار الصلاحيات لكل وحدة (الفيديوهات، الامتحانات، الكتب، بنوك الأسئلة، الدعم، الإعلانات، المراسلات، الملاحظات)
// - معاينة البطاقة التعريفية بشكل حيوي مع إمكانية الطباعة (نسخة فاخرة V2)
// - تصميم البطاقة احترافي مع نمطين (عصري/كلاسيكي) ودعم الطباعة بالأبيض والأسود
// - دعم الوضع الفاتح والداكن
// - حفظ البيانات في قاعدة البيانات مع ربط الصلاحيات وإنشاء البطاقة
// - إشعارات وتأكيدات
// - التحقق من صلاحية المستخدم (معلم فقط)
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// 1. دوال توليد كلمة المرور ورمز الأمان
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
// 2. مكون معاينة البطاقة – النسخة الفاخرة V2
// ================================================================
const AssistantCardPreview = ({ assistant, styles }) => {
  const cardRef = useRef(null);
  const [cardStyle, setCardStyle] = useState('modern');

  const roleLabels = {
    chief: 'رئيس المساعدين',
    expert: 'خبير',
    technical: 'تقني',
    supervisor: 'مشرف',
    coordinator: 'منسق',
    assistant: 'مساعد',
    intern: 'متدرب',
  };

  const printCard = () => {
    if (cardRef.current) {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) {
        toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
        return;
      }
      const content = cardRef.current.innerHTML;
      printWindow.document.write(`
        <html dir="rtl">
          <head>
            <title>بطاقة المساعد</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              body {
                background: #f5f5f5;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                padding: 20px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .card-container {
                max-width: 500px;
                width: 100%;
                background: #ffffff;
                border-radius: 24px;
                padding: 30px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                border: 1px solid #ddd;
                color: #1a1a1a;
                position: relative;
              }
              .card-header {
                text-align: center;
                border-bottom: 2px solid #fbbf24;
                padding-bottom: 15px;
                margin-bottom: 20px;
              }
              .card-header h1 {
                font-size: 24px;
                font-weight: 800;
                color: #1a1a1a;
                letter-spacing: 1px;
              }
              .card-header p {
                font-size: 12px;
                color: #666;
                margin-top: 4px;
              }
              .card-body {
                display: flex;
                flex-direction: column;
                gap: 12px;
              }
              .card-avatar {
                width: 80px;
                height: 80px;
                border-radius: 50%;
                background: #fbbf24;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 32px;
                font-weight: bold;
                color: #1a1a1a;
                margin: 0 auto 10px;
                border: 3px solid #1a1a1a;
              }
              .card-field {
                display: flex;
                justify-content: space-between;
                padding: 8px 12px;
                background: #f9f9f9;
                border-radius: 10px;
                border: 1px solid #e5e5e5;
              }
              .card-field .label {
                color: #555;
                font-size: 12px;
                font-weight: 600;
              }
              .card-field .value {
                color: #1a1a1a;
                font-weight: 700;
                font-size: 14px;
                direction: ltr;
                text-align: left;
                font-family: 'Courier New', monospace;
              }
              .card-footer {
                margin-top: 20px;
                text-align: center;
                font-size: 10px;
                color: #888;
                border-top: 1px solid #eee;
                padding-top: 15px;
              }
              .card-badge {
                display: inline-block;
                background: #fbbf24;
                color: #1a1a1a;
                padding: 4px 14px;
                border-radius: 20px;
                font-size: 12px;
                font-weight: 700;
                border: 1px solid #1a1a1a;
              }
              .qr-placeholder {
                width: 60px;
                height: 60px;
                background: #f0f0f0;
                border: 2px dashed #aaa;
                border-radius: 10px;
                margin: 0 auto 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #888;
                font-size: 10px;
              }
              .card-watermark {
                position: relative;
              }
              .card-watermark::after {
                content: "منصة محمد رضوان";
                position: absolute;
                bottom: 10px;
                right: 20px;
                font-size: 12px;
                color: #ccc;
                opacity: 0.4;
                transform: rotate(-5deg);
                white-space: nowrap;
                pointer-events: none;
              }
              @media print {
                body { background: white; }
                .card-container { box-shadow: none; border: 1px solid #ccc; }
                .card-field { background: #f5f5f5; }
                .card-avatar { border-color: #333; }
                .card-badge { border-color: #333; }
              }
            </style>
          </head>
          <body>
            <div class="card-container card-watermark">
              ${content}
            </div>
            <script>
              window.onload = function() { window.print(); }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!assistant) return null;

  const displayName = assistant.display_name || assistant.full_name || 'مساعد';
  const roleLabel = roleLabels[assistant.role] || assistant.role || 'مساعد';

  return (
    <div className="space-y-4">
      <div className="flex gap-2 justify-center">
        <button
          onClick={() => setCardStyle('modern')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            cardStyle === 'modern'
              ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
              : `${styles.card} border ${styles.border} hover:border-yellow-400/30`
          }`}
        >
          عصري
        </button>
        <button
          onClick={() => setCardStyle('classic')}
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
            cardStyle === 'classic'
              ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
              : `${styles.card} border ${styles.border} hover:border-yellow-400/30`
          }`}
        >
          كلاسيكي
        </button>
      </div>

      <div
        ref={cardRef}
        className={`${styles.cardBg} border ${styles.border} rounded-3xl p-6 shadow-2xl transition-all duration-500 ${
          cardStyle === 'modern'
            ? 'bg-gradient-to-br from-yellow-400/20 via-purple-500/10 to-blue-500/20'
            : 'bg-white/10'
        }`}
      >
        <div className="text-center border-b-2 border-yellow-400/30 pb-4 mb-4">
          <h1 className="text-2xl font-extrabold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
            🏫 منصة محمد رضوان
          </h1>
          <p className="text-xs text-gray-400">التعليمية المتكاملة</p>
        </div>

        <div className="flex flex-col items-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-400/40 to-yellow-600/40 flex items-center justify-center text-yellow-400 font-bold text-3xl border-2 border-yellow-400/30 shadow-lg">
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
            <span className="text-green-400 font-mono text-sm" dir="ltr">{assistant.password || '—'}</span>
          </div>
          <div className="flex justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5">
            <span className="text-gray-400">رمز الأمان</span>
            <span className="text-blue-400 font-mono text-sm" dir="ltr">{assistant.access_code || '—'}</span>
          </div>
          <div className="flex justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5">
            <span className="text-gray-400">رقم البطاقة</span>
            <span className="text-purple-400 font-mono text-sm">{assistant.card_number || '—'}</span>
          </div>
          <div className="flex justify-between bg-white/5 rounded-xl px-3 py-2 border border-white/5">
            <span className="text-gray-400">تاريخ الإصدار</span>
            <span className="text-white">{new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
          </div>
        </div>

        <div className="mt-4 text-center border-t-2 border-yellow-400/20 pt-3">
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <span>🔒 محمية</span>
            <span>🖨️ قابلة للطباعة</span>
            <span>📱 صالحة للاستخدام</span>
          </div>
        </div>
      </div>

      <button
        onClick={printCard}
        className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center justify-center gap-2"
      >
        <Icons.Printer className="h-5 w-5" /> طباعة البطاقة
      </button>
    </div>
  );
};

// ================================================================
// 3. الصفحة الرئيسية – إضافة مساعد جديد
// ================================================================
export default function NewAssistantPage() {
  const router = useRouter();
  const { theme } = useTheme();

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

  const [fullName, setFullName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('assistant');
  const [roleLevel, setRoleLevel] = useState(1);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [generatedAccessCode, setGeneratedAccessCode] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ✅ قائمة الوحدات المحدثة – النظام الجديد
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

  const [permissions, setPermissions] = useState(() => {
    const initial = {};
    modules.forEach(m => {
      initial[m.id] = { can_view: false, can_create: false, can_edit: false, can_delete: false, can_publish: false, can_manage: false };
    });
    return initial;
  });

  useEffect(() => {
    const generateCredentials = async () => {
      const password = generatePassword();
      const accessCode = await generateAccessCode();
      setGeneratedPassword(password);
      setGeneratedAccessCode(accessCode);
      const cardNum = 'CRD-' + Date.now().toString().slice(-8) + Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      setCardNumber(cardNum);
    };
    generateCredentials();
  }, []);

  const regeneratePassword = () => {
    const newPass = generatePassword();
    setGeneratedPassword(newPass);
    toast.success('تم توليد كلمة مرور جديدة');
  };

  const regenerateAccessCode = async () => {
    const newCode = await generateAccessCode();
    setGeneratedAccessCode(newCode);
    toast.success('تم توليد رمز أمان جديد');
  };

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('يجب تسجيل الدخول');

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || profile?.role !== 'teacher') {
        throw new Error('غير مصرح لك، يجب أن تكون معلماً لإضافة مساعد');
      }

      const assistantData = {
        teacher_id: user.id,
        full_name: fullName.trim(),
        display_name: displayName.trim(),
        role: role,
        role_level: parseInt(roleLevel),
        password_hash: generatedPassword,
        access_code: generatedAccessCode,
        is_active: isActive,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        card_version: 1,
      };

      const { data: assistant, error: assistantError } = await supabase
        .from('assistants')
        .insert(assistantData)
        .select()
        .single();

      if (assistantError) throw assistantError;

      const permissionsData = [];
      Object.entries(permissions).forEach(([moduleId, perms]) => {
        const anyActive = Object.values(perms).some(v => v === true);
        if (anyActive) {
          permissionsData.push({
            assistant_id: assistant.id,
            module: moduleId,
            ...perms,
          });
        }
      });

      if (permissionsData.length > 0) {
        const { error: permError } = await supabase
          .from('assistant_permissions')
          .insert(permissionsData);
        if (permError) throw permError;
      }

      const cardData = {
        assistant_id: assistant.id,
        card_number: cardNumber,
        card_data: {
          full_name: fullName.trim(),
          display_name: displayName.trim(),
          role: role,
          role_level: roleLevel,
          password: generatedPassword,
          access_code: generatedAccessCode,
          issue_date: new Date().toISOString(),
        },
        printed_at: new Date().toISOString(),
        print_count: 0,
      };

      const { error: cardError } = await supabase
        .from('assistant_cards')
        .insert(cardData);
      if (cardError) throw cardError;

      toast.success('✅ تم إضافة المساعد بنجاح');
      router.push(`/dashboard/teacher/assistants/${assistant.id}/card`);
    } catch (err) {
      console.error('Error creating assistant:', err);
      setError(err.message || 'حدث خطأ أثناء إنشاء المساعد');
      toast.error('فشل إنشاء المساعد: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const goBack = () => {
    router.push('/dashboard/teacher/assistants');
  };

  const assistantPreview = useMemo(() => ({
    full_name: fullName || 'الاسم الرباعي',
    display_name: displayName || 'الاسم المعروض',
    role: role,
    role_level: roleLevel,
    password: generatedPassword || '••••••••••',
    access_code: generatedAccessCode || '••••••••••',
    card_number: cardNumber || '••••••••••',
  }), [fullName, displayName, role, roleLevel, generatedPassword, generatedAccessCode, cardNumber]);

  return (
    <TeacherLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden`}>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
                ➕ إضافة مساعد جديد
              </h1>
              <p className={`${styles.subtext} text-sm mt-1 flex items-center gap-2 flex-wrap`}>
                إضافة مساعد مع صلاحيات محددة وإنشاء بطاقة تعريفية
                <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  <Icons.Shield className="h-3 w-3 inline ml-1" /> صلاحيات متقدمة
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              <button
                onClick={goBack}
                className={`px-4 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition flex items-center gap-2`}
              >
                <Icons.ArrowRight className="h-4 w-4" /> العودة
              </button>
            </div>
          </div>

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
          </AnimatePresence>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* النموذج */}
            <div className="space-y-6">
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6 ${styles.hover} transition-all duration-500`}>
                <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                  <Icons.User className="h-5 w-5 text-yellow-400" /> البيانات الأساسية
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
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
                    <p className={`text-xs ${styles.subtext} mt-1`}>يجب أن يكون ثلاثة أسماء على الأقل</p>
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

                  <div>
                    <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>بيانات الاعتماد</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${styles.text}`}>كلمة المرور</span>
                          <button
                            type="button"
                            onClick={regeneratePassword}
                            className="p-1.5 rounded-lg hover:bg-yellow-400/20 transition text-yellow-400"
                            title="توليد جديدة"
                          >
                            <Icons.RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className={`flex items-center gap-2 p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
                          <span className="font-mono text-sm text-green-400 flex-1" dir="ltr">{generatedPassword}</span>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(generatedPassword); toast.success('تم النسخ'); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition"
                          >
                            <Icons.Copy className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm ${styles.text}`}>رمز الأمان</span>
                          <button
                            type="button"
                            onClick={regenerateAccessCode}
                            className="p-1.5 rounded-lg hover:bg-yellow-400/20 transition text-yellow-400"
                            title="توليد جديد"
                          >
                            <Icons.RefreshCw className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <div className={`flex items-center gap-2 p-2.5 ${styles.input} border ${styles.border} rounded-xl`}>
                          <span className="font-mono text-sm text-blue-400 flex-1" dir="ltr">{generatedAccessCode}</span>
                          <button
                            type="button"
                            onClick={() => { navigator.clipboard.writeText(generatedAccessCode); toast.success('تم النسخ'); }}
                            className="p-1 hover:bg-white/10 rounded-lg transition"
                          >
                            <Icons.Copy className="h-4 w-4 text-gray-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <p className={`text-xs ${styles.subtext} mt-2`}>
                      <Icons.Info className="h-3 w-3 inline ml-1" />
                      سيتم استخدام هذه البيانات لتسجيل دخول المساعد. تأكد من حفظها بشكل آمن.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="w-5 h-5 accent-yellow-400 rounded"
                    />
                    <label className={`text-sm ${styles.text}`}>تفعيل المساعد فوراً</label>
                  </div>
                </form>
              </div>

              {/* الصلاحيات */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6 ${styles.hover} transition-all duration-500`}>
                <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                  <Icons.Shield className="h-5 w-5 text-yellow-400" /> الصلاحيات
                </h3>
                <p className={`text-xs ${styles.subtext} mb-4`}>
                  حدد الصلاحيات التي سيتمتع بها المساعد في كل وحدة. يمكنك تحديد "إدارة كاملة" لمنح جميع الصلاحيات.
                </p>
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

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2 disabled:opacity-70"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      جاري الإنشاء...
                    </>
                  ) : (
                    <>
                      <Icons.Plus className="h-5 w-5" /> إضافة المساعد
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
            </div>

            {/* العمود الأيمن: معاينة البطاقة */}
            <div className="space-y-4">
              <h3 className={`text-sm font-bold ${styles.text} flex items-center gap-2`}>
                <Icons.CreditCard className="h-4 w-4 text-yellow-400" />
                معاينة البطاقة التعريفية
              </h3>
              <AssistantCardPreview assistant={assistantPreview} styles={styles} />
              <p className={`text-[10px] ${styles.subtext} text-center opacity-60`}>
                البطاقة قابلة للطباعة • تحتوي على جميع بيانات المساعد
              </p>
            </div>
          </div>
        </div>
      </div>

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