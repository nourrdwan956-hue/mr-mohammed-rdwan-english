'use client';

// ============================================================
// صفحة إنشاء بنك أسئلة جديد – المساعد
// ============================================================

import { AssistantLayout } from '@/components/AssistantLayout';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import * as Icons from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme';
import { hasPermission } from '@/lib/permissions';

// ============================================================
// الترجمات
// ============================================================
const translations = {
  ar: {
    title: '📚 إنشاء بنك أسئلة جديد',
    subtitle: 'أضف بنكاً جديداً لتنظيم أسئلتك',
    bankTitle: 'عنوان البنك',
    bankDescription: 'وصف البنك',
    tags: 'الوسوم',
    tagsPlaceholder: 'رياضيات, جبر, معادلات',
    published: 'منشور',
    create: 'إنشاء',
    creating: 'جاري الإنشاء...',
    cancel: 'إلغاء',
    backToBanks: 'العودة إلى البنوك',
    noPermission: 'ليس لديك صلاحية لإنشاء بنك أسئلة',
    loading: 'جاري التحقق من الصلاحيات...',
    createSuccess: 'تم إنشاء البنك بنجاح',
    createFailed: 'فشل إنشاء البنك',
    titleRequired: 'الرجاء إدخال عنوان البنك',
  },
  en: {
    title: '📚 Create New Question Bank',
    subtitle: 'Add a new bank to organize your questions',
    bankTitle: 'Bank Title',
    bankDescription: 'Bank Description',
    tags: 'Tags',
    tagsPlaceholder: 'Math, Algebra, Equations',
    published: 'Published',
    create: 'Create',
    creating: 'Creating...',
    cancel: 'Cancel',
    backToBanks: 'Back to Banks',
    noPermission: 'You do not have permission to create a question bank',
    loading: 'Checking permissions...',
    createSuccess: 'Bank created successfully',
    createFailed: 'Failed to create bank',
    titleRequired: 'Please enter a bank title',
  },
};

// ============================================================
// الصفحة الرئيسية
// ============================================================
export default function NewQuestionBankPage() {
  const router = useRouter();
  const { theme, toggleTheme, language, toggleLanguage, styles } = useTheme();
  const t = translations[language];

  const [assistantId, setAssistantId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [hasCreatePermission, setHasCreatePermission] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [isPublished, setIsPublished] = useState(false);
  const [loading, setLoading] = useState(false);

  // جلب بيانات المساعد والصلاحيات
  useEffect(() => {
    const fetchAssistantData = () => {
      try {
        const sessionData = sessionStorage.getItem('assistantData');
        if (!sessionData) {
          router.replace('/assistant-login');
          return;
        }
        const parsed = JSON.parse(sessionData);
        setAssistantId(parsed.id);
        const perms = JSON.parse(sessionStorage.getItem('assistantPermissions') || '[]');
        setPermissions(perms);
        const canCreate = hasPermission(perms, 'question_bank', 'can_create');
        setHasCreatePermission(canCreate);
        if (!canCreate) {
          toast.error(t.noPermission);
          setTimeout(() => router.push('/dashboard/assistant/question-bank'), 2000);
        }
        setLoadingAuth(false);
      } catch (err) {
        console.error('Error fetching assistant data:', err);
        router.replace('/assistant-login');
      }
    };
    fetchAssistantData();
  }, [router, t]);

  // معالجة النموذج
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t.titleRequired);
      return;
    }

    if (!assistantId || !hasCreatePermission) {
      toast.error(t.noPermission);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/assistant/question-bank', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-assistant-id': assistantId,
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          is_published: isPublished,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || t.createFailed);

      toast.success(t.createSuccess);
      router.push('/dashboard/assistant/question-bank');
    } catch (err) {
      console.error(err);
      toast.error(err.message || t.createFailed);
    } finally {
      setLoading(false);
    }
  };

  // حالات التحميل والصلاحية
  if (loadingAuth) {
    return (
      <AssistantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-gray-400">{t.loading}</div>
        </div>
      </AssistantLayout>
    );
  }

  if (!hasCreatePermission) {
    return (
      <AssistantLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center text-red-400">{t.noPermission}</div>
        </div>
      </AssistantLayout>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <AssistantLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} transition-all duration-300`}>
        <div className="max-w-3xl mx-auto p-4 md:p-6">
          {/* الهيدر */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => router.push('/dashboard/assistant/question-bank')}
              className={`p-2 rounded-xl transition ${styles.card} border ${styles.border} hover:border-yellow-400/50`}
            >
              <Icons.ArrowRight className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-extrabold">{t.title}</h1>
              <p className={`text-sm ${styles.subtext}`}>{t.subtitle}</p>
            </div>
            <div className="mr-auto flex gap-2">
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-xl transition ${styles.card} border ${styles.border}`}
                title={theme === 'dark' ? 'الوضع الفاتح' : 'الوضع الداكن'}
              >
                {theme === 'dark' ? (
                  <Icons.Sun className="h-5 w-5 text-yellow-400" />
                ) : (
                  <Icons.Moon className="h-5 w-5 text-gray-600" />
                )}
              </button>
              <button
                onClick={toggleLanguage}
                className={`p-2 rounded-xl transition ${styles.card} border ${styles.border} text-sm font-medium`}
              >
                {language === 'ar' ? 'EN' : 'عربي'}
              </button>
            </div>
          </div>

          {/* النموذج */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`${styles.card} border ${styles.border} rounded-2xl p-6`}
          >
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t.bankTitle} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border ${styles.border} ${styles.input} focus:border-yellow-400/50 focus:outline-none transition`}
                  placeholder={t.bankTitle}
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t.bankDescription}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className={`w-full px-4 py-2.5 rounded-xl border ${styles.border} ${styles.input} focus:border-yellow-400/50 focus:outline-none transition resize-none`}
                  placeholder={t.bankDescription}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  {t.tags}
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className={`w-full px-4 py-2.5 rounded-xl border ${styles.border} ${styles.input} focus:border-yellow-400/50 focus:outline-none transition`}
                  placeholder={t.tagsPlaceholder}
                />
                <p className="text-xs text-gray-400 mt-1">
                  افصل بين الوسوم بفاصلة (مثال: رياضيات, جبر, معادلات)
                </p>
              </div>

              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublished}
                    onChange={(e) => setIsPublished(e.target.checked)}
                    className="w-4 h-4 accent-yellow-400"
                  />
                  <span className="text-sm">{t.published}</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Icons.Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icons.Save className="h-5 w-5" />
                  )}
                  {loading ? t.creating : t.create}
                </button>
                <button
                  type="button"
                  onClick={() => router.push('/dashboard/assistant/question-bank')}
                  className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </AssistantLayout>
  );
}