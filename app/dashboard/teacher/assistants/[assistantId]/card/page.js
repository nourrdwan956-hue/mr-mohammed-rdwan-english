// app/dashboard/teacher/assistants/[assistantId]/card/page.js
'use client';

// ================================================================
// 🪪 بطاقة المساعد – العرض والطباعة (نسخة متوافقة مع html2canvas)
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useRef, useCallback, useMemo, forwardRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
const html2canvas = (await import('html2canvas')).default;
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد

// ================================================================
// 1. مكون البطاقة (مع forwardRef)
// ================================================================
const AssistantCard = forwardRef(({ assistant, card, cardStyle = 'modern', showWatermark = true, theme }, ref) => {
  const roleLabels = {
    chief: 'رئيس المساعدين',
    expert: 'خبير',
    technical: 'تقني',
    supervisor: 'مشرف',
    coordinator: 'منسق',
    assistant: 'مساعد',
    intern: 'متدرب',
  };

  const displayName = assistant?.display_name || assistant?.full_name || 'مساعد';
  const roleLabel = roleLabels[assistant?.role] || assistant?.role || 'مساعد';

  const cardNumber = card?.card_number || '••••••••••';
  const printCount = card?.print_count || 0;
  const printedAt = card?.printed_at ? new Date(card.printed_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  const isModern = cardStyle === 'modern';

  // ✅ استخدام ألوان عادية بدلاً من Gradients
  const bgStyle = isModern
    ? {
        background: '#1a1f2e',
        borderColor: 'rgba(251, 191, 36, 0.3)',
      }
    : {
        background: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
      };

  // ✅ تحديد ألوان النصوص حسب الثيم (للطباعة لا يُستخدم هنا لأن البطاقة نفسها داكنة دائماً)
  // لكننا نستخدم الثيم لتحديد خلفية الصفحة، البطاقة نفسها تبقى بنفس التصميم

  return (
    <div
      ref={ref} // ✅ استخدام ref المُمرر
      className={`relative border rounded-3xl p-6 shadow-2xl transition-all duration-500 ${isModern ? 'backdrop-blur-xl' : ''}`}
      style={{
        ...bgStyle,
        borderColor: isModern ? 'rgba(251, 191, 36, 0.3)' : 'rgba(255, 255, 255, 0.1)',
      }}
    >
      {/* شريط ذهبي علوي - باستخدام border بدلاً من gradient */}
      <div
        className={`absolute top-0 left-0 right-0 h-1.5 rounded-t-3xl ${
          isModern ? 'bg-yellow-400' : 'bg-yellow-400/30'
        }`}
      />

      {/* الهيدر */}
      <div className="text-center border-b border-yellow-400/20 pb-4 mb-4 pt-2">
        <h1 className={`text-2xl font-extrabold ${isModern ? 'text-yellow-400' : 'text-white'}`}>
          🏫 منصة محمد رضوان
        </h1>
        <p className="text-xs text-gray-400">التعليمية المتكاملة</p>
        <div className="flex justify-center mt-2">
          <span className={`text-[10px] px-3 py-0.5 rounded-full border ${isModern ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' : 'bg-white/5 text-gray-400 border-white/10'}`}>
            بطاقة تعريفية • إصدار {card?.card_version || 1}
          </span>
        </div>
      </div>

      {/* المحتوى */}
      <div className="flex flex-col items-center mb-4">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-yellow-400/40 to-yellow-600/40 flex items-center justify-center text-yellow-400 font-bold text-4xl border-2 border-yellow-400/30 shadow-lg">
          {displayName.charAt(0)}
        </div>
        <h2 className="text-xl font-bold text-white mt-3">{displayName}</h2>
        <span className={`text-xs px-3 py-1 rounded-full border ${isModern ? 'bg-yellow-400/20 text-yellow-400 border-yellow-400/30' : 'bg-white/5 text-gray-400 border-white/10'} mt-1`}>
          {roleLabel}
        </span>
      </div>

      {/* الحقول - كلها بألوان عادية */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between bg-white/10 rounded-xl px-3 py-2 border border-white/10">
          <span className="text-gray-400">الاسم الرباعي</span>
          <span className="text-white font-medium">
            {assistant?.full_name || assistant?.display_name || '—'}
          </span>
        </div>
        <div className="flex justify-between bg-white/10 rounded-xl px-3 py-2 border border-white/10">
          <span className="text-gray-400">مستوى الصلاحية</span>
          <span className="text-yellow-400 font-medium">{assistant?.role_level || 1} / 10</span>
        </div>
        <div className="flex justify-between bg-white/10 rounded-xl px-3 py-2 border border-white/10">
          <span className="text-gray-400">كلمة المرور</span>
          <span className="text-green-400 font-mono text-sm" dir="ltr">{assistant?.password_hash || '••••••••••'}</span>
        </div>
        <div className="flex justify-between bg-white/10 rounded-xl px-3 py-2 border border-white/10">
          <span className="text-gray-400">رمز الأمان</span>
          <span className="text-blue-400 font-mono text-sm" dir="ltr">{assistant?.access_code || '••••••••••'}</span>
        </div>
        <div className="flex justify-between bg-white/10 rounded-xl px-3 py-2 border border-white/10">
          <span className="text-gray-400">رقم البطاقة</span>
          <span className="text-purple-400 font-mono text-sm">{cardNumber}</span>
        </div>
        <div className="flex justify-between bg-white/10 rounded-xl px-3 py-2 border border-white/10">
          <span className="text-gray-400">تاريخ الإصدار</span>
          <span className="text-white">{printedAt}</span>
        </div>
      </div>

      {/* تذييل */}
      <div className="mt-4 text-center border-t border-yellow-400/20 pt-3">
        <div className="flex justify-center gap-4 text-xs text-gray-500">
          <span>🔒 محمية</span>
          <span>🖨️ قابلة للطباعة</span>
          <span>📱 صالحة للاستخدام</span>
          <span>🔄 طبعت {printCount} مرة</span>
        </div>
      </div>
    </div>
  );
});

AssistantCard.displayName = 'AssistantCard';

// ================================================================
// 2. مودال تنزيل البطاقة
// ================================================================
const DownloadModal = ({ isOpen, onClose, cardRef, assistant, card, theme }) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setLoading(true);
    try {
      // ✅ استخدام إعدادات متوافقة مع html2canvas
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#0b0e1a',
        useCORS: true,
        logging: false,
        // ✅ تجنب أي تأثيرات قد تسبب مشاكل
        allowTaint: false,
        width: 500,
        height: 700,
      });
      const link = document.createElement('a');
      link.download = `بطاقة_${assistant?.display_name || 'مساعد'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('✅ تم تنزيل البطاقة كصورة');
      onClose();
    } catch (err) {
      console.error('Error downloading card:', err);
      toast.error('فشل تنزيل البطاقة: ' + (err.message || 'خطأ غير معروف'));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1a1f2e] border border-white/10 rounded-3xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <Icons.Image className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">تنزيل البطاقة كصورة</h3>
          <p className="text-gray-400 text-sm mb-6">
            سيتم تنزيل البطاقة كصورة PNG بدقة عالية، مناسبة للطباعة أو المشاركة.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={handleDownload}
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition disabled:opacity-70"
            >
              {loading ? 'جاري التنزيل...' : 'تنزيل'}
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition"
            >
              إلغاء
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 3. الصفحة الرئيسية
// ================================================================
export default function AssistantCardPage() {
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
  };

  const [loading, setLoading] = useState(true);
  const [assistant, setAssistant] = useState(null);
  const [card, setCard] = useState(null);
  const [cardStyle, setCardStyle] = useState('modern');
  const [error, setError] = useState('');
  const [isPrinting, setIsPrinting] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const cardRef = useRef(null);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    if (!assistantId) return;
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

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
        toast.error('غير مصرح لك بمشاهدة هذه البطاقة');
        router.push('/dashboard/teacher/assistants');
        return;
      }

      // ✅ التأكد من وجود full_name
      if (!assistantData.full_name || assistantData.full_name.trim().length < 3) {
        assistantData.full_name = assistantData.display_name || 'مساعد';
      }

      setAssistant(assistantData);

      const { data: cardData, error: cardError } = await supabase
        .from('assistant_cards')
        .select('*')
        .eq('assistant_id', assistantId)
        .order('printed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cardError && cardError.code !== 'PGRST116') throw cardError;
      setCard(cardData || null);

    } catch (err) {
      console.error('Error fetching card data:', err);
      setError('فشل جلب بيانات البطاقة');
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [assistantId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== طباعة البطاقة =====
  const handlePrint = () => {
    if (!cardRef.current) return;
    setIsPrinting(true);

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      toast.error('يرجى السماح بالنوافذ المنبثقة للطباعة');
      setIsPrinting(false);
      return;
    }

    const content = cardRef.current.innerHTML;
    const isDark = theme === 'dark';

    printWindow.document.write(`
      <html dir="rtl">
        <head>
          <title>بطاقة المساعد</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              background: ${isDark ? '#0b0e1a' : '#f5f5f5'};
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
              background: ${isDark ? '#1a1f2e' : '#ffffff'};
              border-radius: 24px;
              padding: 30px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              border: ${isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #ddd'};
              color: ${isDark ? '#fff' : '#1a1a1a'};
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
              color: ${isDark ? '#fbbf24' : '#1a1a1a'};
            }
            .card-header p {
              font-size: 12px;
              color: ${isDark ? '#9ca3af' : '#666'};
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
              background: linear-gradient(135deg, #fbbf24, #f59e0b);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
              font-weight: bold;
              color: #000;
              margin: 0 auto 10px;
              border: 3px solid ${isDark ? '#fbbf24' : '#1a1a1a'};
            }
            .card-field {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              background: ${isDark ? 'rgba(255,255,255,0.05)' : '#f9f9f9'};
              border-radius: 10px;
              border: 1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#e5e5e5'};
            }
            .card-field .label {
              color: ${isDark ? '#9ca3af' : '#555'};
              font-size: 12px;
              font-weight: 600;
            }
            .card-field .value {
              color: ${isDark ? '#fff' : '#1a1a1a'};
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
              color: ${isDark ? '#6b7280' : '#888'};
              border-top: 1px solid ${isDark ? 'rgba(255,255,255,0.05)' : '#eee'};
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
              border: 1px solid ${isDark ? '#fbbf24' : '#1a1a1a'};
            }
            @media print {
              body { background: white !important; }
              .card-container { 
                box-shadow: none !important; 
                border: 1px solid #ccc !important;
                background: white !important;
                color: #1a1a1a !important;
              }
              .card-header h1 { color: #1a1a1a !important; }
              .card-field { background: #f5f5f5 !important; border-color: #ddd !important; }
              .card-field .label { color: #555 !important; }
              .card-field .value { color: #1a1a1a !important; }
              .card-footer { color: #888 !important; border-color: #eee !important; }
              .card-avatar { border-color: #1a1a1a !important; }
              .card-badge { border-color: #1a1a1a !important; }
            }
          </style>
        </head>
        <body>
          <div class="card-container">
            ${content}
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    updatePrintCount();
    setIsPrinting(false);
  };

  // ===== تحديث عدد مرات الطباعة =====
  const updatePrintCount = async () => {
    try {
      if (card) {
        const { error } = await supabase
          .from('assistant_cards')
          .update({
            print_count: (card.print_count || 0) + 1,
            printed_at: new Date().toISOString(),
          })
          .eq('id', card.id);
        if (error) throw error;
        setCard(prev => ({ ...prev, print_count: (prev?.print_count || 0) + 1, printed_at: new Date().toISOString() }));
      }
    } catch (err) {
      console.error('Error updating print count:', err);
    }
  };

  // ===== العودة =====
  const goBack = () => {
    router.push(`/dashboard/teacher/assistants/${assistantId}`);
  };

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

  if (!assistant) {
    return (
      <TeacherLayout>
        <div className={`min-h-screen flex items-center justify-center ${styles.bg}`}>
          <div className="text-center">
            <Icons.UserX className="h-16 w-16 text-gray-500 mx-auto mb-4" />
            <p className={`${styles.text} text-lg`}>المساعد غير موجود</p>
            <Link href="/dashboard/teacher/assistants" className="text-yellow-400 hover:underline mt-2 block">
              العودة إلى المساعدين
            </Link>
          </div>
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
              <div className="flex items-center gap-3">
                <Link
                  href={`/dashboard/teacher/assistants/${assistantId}`}
                  className={`p-2 rounded-xl hover:bg-white/5 transition ${styles.subtext}`}
                >
                  <Icons.ArrowRight className="h-5 w-5" />
                </Link>
                <div>
                  <h1 className={`text-2xl font-extrabold ${styles.text}`}>
                    🪪 بطاقة {assistant.display_name || assistant.full_name}
                  </h1>
                  <p className={`text-sm ${styles.subtext}`}>
                    عرض وطباعة البطاقة التعريفية للمساعد
                    <span className="mr-2 text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                      <Icons.CreditCard className="h-3 w-3 inline ml-1" /> إصدار {card?.card_version || 1}
                    </span>
                  </p>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              {/* ❌ تم حذف زر تبديل الثيم المكرر */}
              <button
                onClick={() => setShowDownloadModal(true)}
                className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Icons.Download className="h-4 w-4" /> تنزيل كصورة
              </button>
              <button
                onClick={handlePrint}
                disabled={isPrinting}
                className={`px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2 disabled:opacity-70`}
              >
                {isPrinting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                    جاري الطباعة...
                  </>
                ) : (
                  <>
                    <Icons.Printer className="h-4 w-4" /> طباعة
                  </>
                )}
              </button>
              <button
                onClick={goBack}
                className={`px-4 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition flex items-center gap-2`}
              >
                <Icons.ArrowRight className="h-4 w-4" /> العودة
              </button>
            </div>
          </div>

          {/* ===== الأخطاء ===== */}
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

          {/* ===== معاينة البطاقة ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold ${styles.text}`}>معاينة البطاقة</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCardStyle('modern')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      cardStyle === 'modern'
                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                        : `${styles.card} border ${styles.border} hover:border-yellow-400/30`
                    }`}
                  >
                    عصري
                  </button>
                  <button
                    onClick={() => setCardStyle('classic')}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                      cardStyle === 'classic'
                        ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/30'
                        : `${styles.card} border ${styles.border} hover:border-yellow-400/30`
                    }`}
                  >
                    كلاسيكي
                  </button>
                </div>
              </div>

              {/* ✅ تمرير ref و theme إلى AssistantCard */}
              <AssistantCard
                ref={cardRef}
                assistant={assistant}
                card={card}
                cardStyle={cardStyle}
                showWatermark={true}
                theme={theme}
              />

              {/* معلومات إضافية */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 grid grid-cols-2 gap-4 text-center`}>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>رقم البطاقة</p>
                  <p className={`text-sm font-mono font-bold ${styles.text}`}>{card?.card_number || '—'}</p>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>عدد مرات الطباعة</p>
                  <p className={`text-sm font-bold ${styles.text}`}>{card?.print_count || 0}</p>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>آخر طباعة</p>
                  <p className={`text-sm font-medium ${styles.text}`}>
                    {card?.printed_at ? new Date(card.printed_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }) : '—'}
                  </p>
                </div>
                <div>
                  <p className={`text-xs ${styles.subtext}`}>إصدار البطاقة</p>
                  <p className={`text-sm font-bold ${styles.text}`}>{card?.card_version || 1}</p>
                </div>
              </div>
            </div>

            {/* العمود الجانبي: معلومات وإجراءات */}
            <div className="space-y-4">
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
                <h3 className={`text-sm font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                  <Icons.Info className="h-4 w-4 text-yellow-400" /> معلومات المساعد
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الاسم الرباعي</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{assistant.full_name}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الاسم المعروض</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{assistant.display_name}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الدور</p>
                    <p className={`text-sm font-medium ${styles.text}`}>
                      {{
                        chief: 'رئيس المساعدين',
                        expert: 'خبير',
                        technical: 'تقني',
                        supervisor: 'مشرف',
                        coordinator: 'منسق',
                        assistant: 'مساعد',
                        intern: 'متدرب',
                      }[assistant.role] || assistant.role}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>مستوى الصلاحية</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{assistant.role_level} / 10</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الحالة</p>
                    <p className={`text-sm font-medium ${assistant.is_active ? 'text-green-400' : 'text-gray-400'}`}>
                      {assistant.is_active ? '🟢 نشط' : '🔴 غير نشط'}
                    </p>
                  </div>
                </div>
              </div>

              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
                <h3 className={`text-sm font-bold ${styles.text} mb-3 flex items-center gap-2`}>
                  <Icons.Shield className="h-4 w-4 text-yellow-400" /> إجراءات سريعة
                </h3>
                <div className="space-y-2">
                  <Link
                    href={`/dashboard/teacher/assistants/${assistantId}`}
                    className={`w-full flex items-center gap-2 px-3 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition text-sm`}
                  >
                    <Icons.Eye className="h-4 w-4 text-blue-400" /> العودة للتفاصيل
                  </Link>
                  <Link
                    href={`/dashboard/teacher/assistants/${assistantId}/edit`}
                    className={`w-full flex items-center gap-2 px-3 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition text-sm`}
                  >
                    <Icons.Edit className="h-4 w-4 text-yellow-400" /> تعديل البيانات
                  </Link>
                  <Link
                    href={`/dashboard/teacher/assistants/${assistantId}/logs`}
                    className={`w-full flex items-center gap-2 px-3 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition text-sm`}
                  >
                    <Icons.History className="h-4 w-4 text-cyan-400" /> سجل النشاط
                  </Link>
                </div>
              </div>

              {/* نصائح */}
              <div className="bg-gradient-to-br from-yellow-400/10 via-purple-500/5 to-blue-500/10 border border-yellow-400/20 rounded-2xl p-4">
                <h4 className={`text-sm font-bold ${styles.text} flex items-center gap-2 mb-2`}>
                  <Icons.Lightbulb className="h-4 w-4 text-yellow-400" /> نصائح للبطاقة
                </h4>
                <ul className="space-y-1.5 text-xs text-gray-300">
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>يمكن طباعة البطاقة على ورق مقوى للحفاظ عليها</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>يجب الاحتفاظ بكلمة المرور ورمز الأمان في مكان آمن</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-yellow-400">•</span>
                    <span>يمكن إعادة طباعة البطاقة في أي وقت من هذه الصفحة</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== مودال تنزيل الصورة ===== */}
      <DownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
        cardRef={cardRef}
        assistant={assistant}
        card={card}
        theme={theme}
      />
    </TeacherLayout>
  );
}
// تم التعديل بنجاح في مرحلة الثيم