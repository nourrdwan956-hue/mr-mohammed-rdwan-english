'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { TeacherLayout } from '@/components/TeacherLayout';
import { useTheme } from '@/lib/hooks/useTheme';

// ================================================================
// دوال مساعدة لتوليد الأكواد
// ================================================================

/**
 * توليد كود عشوائي من 10 خانات (أحرف وأرقام)
 * مع تجنب الأحرف المتشابهة (O, 0, I, 1)
 * @returns {string} كود بالتنسيق ABCD-EFG-HIJ
 */
function generateAccessCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 10; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code.slice(0, 4) + '-' + code.slice(4, 7) + '-' + code.slice(7, 10);
}

/**
 * توليد مجموعة من الأكواد مع ضمان عدم التكرار
 * @param {number} count - عدد الأكواد المطلوبة
 * @returns {string[]} مصفوفة من الأكواد
 */
function generateBulkCodes(count) {
  const codes = [];
  const seen = new Set();
  for (let i = 0; i < count; i++) {
    let code;
    let attempts = 0;
    do {
      code = generateAccessCode();
      attempts++;
      if (attempts > 100) break;
    } while (seen.has(code));
    if (!seen.has(code)) {
      seen.add(code);
      codes.push(code);
    }
  }
  return codes;
}

// ================================================================
// المكون الرئيسي
// ================================================================

export default function GenerateCodesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;
  const { theme, styles, language } = useTheme();
  const isArabic = language === 'ar';

  // ===== حالات الصفحة =====
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [codes, setCodes] = useState([]);
  const [count, setCount] = useState(5);
  const [expiryDays, setExpiryDays] = useState(30);
  const [notes, setNotes] = useState('');
  const [showCopied, setShowCopied] = useState(false);

  // ===== جلب بيانات الكورس =====
  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const { data, error } = await supabase
          .from('courses')
          .select('title, price, is_free, teacher_id')
          .eq('id', courseId)
          .single();

        if (error) throw error;
        if (data.is_free) {
          toast.error(isArabic ? 'الكورس مجاني، لا حاجة لأكواد' : 'Course is free, no codes needed');
          router.push(`/dashboard/teacher/courses/${courseId}`);
          return;
        }
        setCourse(data);
      } catch (err) {
        console.error(err);
        toast.error(isArabic ? 'فشل جلب بيانات الكورس' : 'Failed to load course');
        router.push('/dashboard/teacher/courses');
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, [courseId, router, isArabic]);

  // ===== توليد الأكواد وحفظها في قاعدة البيانات =====
  const handleGenerateCodes = async () => {
    if (count < 1 || count > 100) {
      toast.error(isArabic ? 'عدد الأكواد يجب أن يكون بين 1 و 100' : 'Number of codes must be between 1 and 100');
      return;
    }

    setGenerating(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error(isArabic ? 'يرجى تسجيل الدخول' : 'Please login');
        return;
      }

      const rawCodes = generateBulkCodes(count);
      const now = new Date();
      const expiresAt = new Date(now);
      expiresAt.setDate(expiresAt.getDate() + expiryDays);

      // ========== التعديل: max_devices = 2 ==========
      const codesToInsert = rawCodes.map(code => ({
        course_id: courseId,
        code: code,
        max_devices: 2,          // ← كل كود صالح لجهازين
        generated_by: user.id,
        expires_at: expiresAt.toISOString(),
        notes: notes.trim() || null,
        is_active: true,
        is_used: false,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      }));

      const { data, error } = await supabase
        .from('course_access_codes')
        .insert(codesToInsert)
        .select();

      if (error) throw error;

      setCodes(data);
      toast.success(isArabic ? `تم توليد ${data.length} كود بنجاح` : `${data.length} codes generated successfully`);
      setShowCopied(false);
    } catch (err) {
      console.error('Error generating codes:', err);
      toast.error(isArabic ? 'فشل توليد الأكواد' : 'Failed to generate codes');
    } finally {
      setGenerating(false);
    }
  };

  // ===== نسخ الأكواد إلى الحافظة =====
  const copyCodesToClipboard = () => {
    if (codes.length === 0) return;
    const text = codes.map(c => c.code).join('\n');
    navigator.clipboard.writeText(text)
      .then(() => {
        setShowCopied(true);
        toast.success(isArabic ? 'تم نسخ الأكواد' : 'Codes copied');
        setTimeout(() => setShowCopied(false), 3000);
      })
      .catch(() => {
        toast.error(isArabic ? 'فشل نسخ الأكواد' : 'Failed to copy');
      });
  };

  // ===== تصدير الأكواد كملف نصي =====
  const exportCodesAsText = () => {
    if (codes.length === 0) return;
    const text = codes.map(c => c.code).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `codes_${courseId}_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(isArabic ? 'تم تصدير الأكواد' : 'Codes exported');
  };

  // ===== حذف كود =====
  const deleteCode = async (codeId) => {
    const confirmMessage = isArabic ? 'هل أنت متأكد من حذف هذا الكود؟' : 'Are you sure you want to delete this code?';
    if (!window.confirm(confirmMessage)) return;
    try {
      const { error } = await supabase
        .from('course_access_codes')
        .delete()
        .eq('id', codeId);
      if (error) throw error;
      setCodes(prev => prev.filter(c => c.id !== codeId));
      toast.success(isArabic ? 'تم حذف الكود' : 'Code deleted');
    } catch (err) {
      console.error(err);
      toast.error(isArabic ? 'فشل حذف الكود' : 'Failed to delete code');
    }
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className={`${styles.bg} min-h-screen p-6`}>
        <div className="max-w-5xl mx-auto">
          {/* رأس الصفحة */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className={`text-3xl font-extrabold ${styles.text}`}>🎫 أكواد الشحن</h1>
              <p className={`${styles.subtext} mt-1`}>
                {isArabic 
                  ? `توليد أكواد شحن للكورس "${course?.title}"` 
                  : `Generate access codes for "${course?.title}"`}
              </p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/teacher/courses/${courseId}`)}
              className={`px-4 py-2 ${styles.card} border rounded-xl text-sm ${styles.hover} transition flex items-center gap-2`}
            >
              <Icons.ArrowRight className="h-4 w-4" />
              {isArabic ? 'العودة للكورس' : 'Back to Course'}
            </button>
          </div>

          {/* نموذج توليد الأكواد */}
          <div className={`${styles.card} border rounded-2xl p-6 mb-8 ${styles.hover} transition`}>
            <h2 className={`text-lg font-bold ${styles.text} mb-4`}>
              {isArabic ? 'توليد أكواد جديدة' : 'Generate New Codes'}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                  {isArabic ? 'عدد الأكواد' : 'Number of Codes'}
                </label>
                <input
                  type="number"
                  value={count}
                  onChange={(e) => setCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                  className={`w-full p-3 ${styles.input} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                  min="1"
                  max="100"
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                  {isArabic ? 'مدة الصلاحية (أيام)' : 'Expiry (Days)'}
                </label>
                <input
                  type="number"
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(Math.min(365, Math.max(1, parseInt(e.target.value) || 30)))}
                  className={`w-full p-3 ${styles.input} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
                  min="1"
                  max="365"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleGenerateCodes}
                  disabled={generating}
                  className="w-full py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 disabled:opacity-50"
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Icons.Loader2 className="h-5 w-5 animate-spin" />
                      {isArabic ? 'جاري التوليد...' : 'Generating...'}
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Icons.Plus className="h-5 w-5" />
                      {isArabic ? 'توليد الأكواد' : 'Generate Codes'}
                    </span>
                  )}
                </button>
              </div>
            </div>
            <div className="mt-4">
              <label className={`block text-sm font-medium ${styles.label} mb-1.5`}>
                {isArabic ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder={isArabic ? 'ملاحظات حول هذه الأكواد...' : 'Notes about these codes...'}
                className={`w-full p-3 ${styles.input} border rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
              />
            </div>
            {/* ===== التعديل: النص التوضيحي ===== */}
            <div className={`mt-3 text-sm ${styles.subtext}`}>
              {isArabic 
                ? `⚠️ كل كود صالح لـ جهازين فقط لمدة ${expiryDays} يوم من تاريخ التفعيل` 
                : `⚠️ Each code is valid for only 2 devices and expires after ${expiryDays} days`}
            </div>
          </div>

          {/* عرض الأكواد المولدة */}
          <AnimatePresence>
            {codes.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`${styles.card} border rounded-2xl p-6`}
              >
                <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                  <h3 className={`text-lg font-bold ${styles.text}`}>
                    {isArabic 
                      ? `الأكواد المولدة (${codes.length})` 
                      : `Generated Codes (${codes.length})`}
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={copyCodesToClipboard}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl transition flex items-center gap-2 text-sm"
                    >
                      <Icons.Copy className="h-4 w-4" />
                      {showCopied ? (isArabic ? 'تم النسخ ✓' : 'Copied ✓') : (isArabic ? 'نسخ الكل' : 'Copy All')}
                    </button>
                    <button
                      onClick={exportCodesAsText}
                      className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl transition flex items-center gap-2 text-sm"
                    >
                      <Icons.Download className="h-4 w-4" />
                      {isArabic ? 'تصدير' : 'Export'}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {codes.map((code, idx) => (
                    <motion.div
                      key={code.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.03 }}
                      className={`p-3 rounded-xl ${styles.card} border ${styles.border} flex items-center justify-between group`}
                    >
                      <div>
                        <span className={`font-mono text-lg font-bold ${styles.text}`}>
                          {code.code}
                        </span>
                        <p className={`text-[10px] ${styles.subtext}`}>
                          {isArabic 
                            ? `ينتهي: ${new Date(code.expires_at).toLocaleDateString('ar-EG')}` 
                            : `Expires: ${new Date(code.expires_at).toLocaleDateString()}`}
                        </p>
                      </div>
                      <button
                        onClick={() => deleteCode(code.id)}
                        className="opacity-0 group-hover:opacity-100 transition text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-red-500/20"
                      >
                        <Icons.Trash2 className="h-4 w-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  {isArabic 
                    ? '⚠️ هذه الأكواد غير مستخدمة حالياً. يمكنك حذف أي كود قبل استخدامه.' 
                    : '⚠️ These codes are currently unused. You can delete any code before it is used.'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* تعليمات للاستخدام */}
          <div className={`${styles.card} border rounded-2xl p-6 mt-8 ${styles.hover} transition`}>
            <h3 className={`text-sm font-bold ${styles.text} mb-2 flex items-center gap-2`}>
              <Icons.Info className="h-5 w-5 text-yellow-400" />
              {isArabic ? 'تعليمات الاستخدام' : 'Usage Instructions'}
            </h3>
            <ul className={`text-sm ${styles.subtext} space-y-1 list-disc pr-5`}>
              <li>{isArabic 
                ? 'كل كود صالح لـ جهازين فقط من أول مرة يتم تفعيله فيها.' 
                : 'Each code is valid for two devices only from the first activation.'}</li>
              <li>{isArabic 
                ? 'صلاحية الكود تنتهي بعد المدة المحددة (افتراضياً 30 يوم) من تاريخ التوليد.' 
                : 'Code expires after the specified period (default 30 days) from generation date.'}</li>
              <li>{isArabic 
                ? 'يمكنك نسخ الأكواد وإرسالها للطلاب، وسيتم تفعيلها تلقائياً عند إدخالها.' 
                : 'You can copy the codes and send them to students; they will be activated automatically.'}</li>
              <li>{isArabic 
                ? 'بعد استهلاك كود، لن يمكن استخدامه مرة أخرى حتى لو تم حذفه من القائمة.' 
                : 'Once a code is used, it cannot be reused even if deleted from the list.'}</li>
            </ul>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}