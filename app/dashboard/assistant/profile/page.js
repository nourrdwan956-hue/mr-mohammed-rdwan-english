'use client';

// ================================================================
// 👤 الملف الشخصي للمساعد – النسخة المتطورة V5
// ================================================================
// الميزات:
// - استخدام useAssistantData للحصول على بيانات المساعد والصلاحيات
// - دعم الترجمة العربية والإنجليزية
// - عرض إحصائيات سريعة (عدد النشاطات، آخر تسجيل دخول، مستوى الصلاحية)
// - عرض آخر 5 نشاطات مع أيقونات مميزة
// - إمكانية تعديل الاسم المعروض مع تحديث فوري
// - دعم كامل للوضعين الفاتح والداكن مع وضوح تام للخطوط
// - Glassmorphism فاخر وأنيميشن سلس
// ================================================================

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { useAssistantData } from '@/lib/hooks/useAssistantData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

// ================================================================
// 1. الترجمات
// ================================================================
const translations = {
  ar: {
    title: '👤 الملف الشخصي',
    subtitle: 'معلومات حساب المساعد',
    back: 'العودة',
    accountInfo: 'معلومات الحساب',
    fullName: 'الاسم الكامل',
    displayName: 'الاسم المعروض',
    role: 'الدور',
    roleLevel: 'مستوى الصلاحية',
    accessCode: 'رمز الأمان',
    lastLogin: 'آخر تسجيل دخول',
    createdDate: 'تاريخ إنشاء الحساب',
    status: 'حالة الحساب',
    active: '🟢 نشط',
    inactive: '🔴 غير نشط',
    cardVersion: 'إصدار البطاقة',
    activitiesTitle: 'آخر النشاطات',
    noActivities: 'لا توجد نشاطات حديثة',
    viewAllActivities: 'عرض جميع النشاطات',
    totalActivities: 'إجمالي النشاطات',
    editDisplayName: 'تعديل الاسم المعروض',
    editDisplayNameLabel: 'الاسم المعروض',
    editDisplayNameHint: 'سيظهر هذا الاسم في لوحة التحكم وفي التواصل مع الطلاب',
    save: 'حفظ',
    cancel: 'إلغاء',
    copy: 'نسخ',
    copied: 'تم النسخ',
    updateSuccess: '✅ تم تحديث الاسم المعروض بنجاح',
    updateFailed: 'فشل تحديث الاسم',
    fetchFailed: 'فشل جلب البيانات',
    loading: 'جاري تحميل الملف الشخصي...',
    notFound: 'لم يتم العثور على البيانات',
    goBack: 'العودة للوحة التحكم',
  },
  en: {
    title: '👤 Profile',
    subtitle: 'Assistant Account Information',
    back: 'Back',
    accountInfo: 'Account Information',
    fullName: 'Full Name',
    displayName: 'Display Name',
    role: 'Role',
    roleLevel: 'Permission Level',
    accessCode: 'Access Code',
    lastLogin: 'Last Login',
    createdDate: 'Account Created',
    status: 'Account Status',
    active: '🟢 Active',
    inactive: '🔴 Inactive',
    cardVersion: 'Card Version',
    activitiesTitle: 'Recent Activities',
    noActivities: 'No recent activities',
    viewAllActivities: 'View All Activities',
    totalActivities: 'Total Activities',
    editDisplayName: 'Edit Display Name',
    editDisplayNameLabel: 'Display Name',
    editDisplayNameHint: 'This name will appear in the dashboard and when communicating with students',
    save: 'Save',
    cancel: 'Cancel',
    copy: 'Copy',
    copied: 'Copied',
    updateSuccess: '✅ Display name updated successfully',
    updateFailed: 'Failed to update display name',
    fetchFailed: 'Failed to fetch data',
    loading: 'Loading profile...',
    notFound: 'No data found',
    goBack: 'Go back to dashboard',
  },
};

// ================================================================
// 2. عداد متحرك
// ================================================================
const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [isVisible, target, duration]);

  return <span ref={ref} className="font-extrabold">{count}{suffix}</span>;
};

// ================================================================
// 3. بطاقة إحصائية
// ================================================================
const StatCard = ({ stat, styles, t }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay || 0 }}
      whileHover={{ y: -4, scale: 1.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative ${styles.card} border ${styles.border} rounded-2xl p-5 ${styles.hover} transition-all duration-300 hover:shadow-2xl ${styles.shadow} overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
          <stat.icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className={`text-xs ${styles.subtext} opacity-70`}>{stat.label}</p>
          <p className={`text-2xl font-extrabold ${styles.text}`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 4. عنصر النشاط (محسّن مع معالجة details)
// ================================================================
const ActivityItem = ({ activity, styles, t }) => {
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString(
      t?.lang === 'ar' ? 'ar-EG' : 'en-US',
      { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    );
  };

  const getActionIcon = (action) => {
    const icons = {
      view: Icons.Eye,
      create: Icons.Plus,
      edit: Icons.Edit,
      delete: Icons.Trash2,
      publish: Icons.Megaphone,
      login: Icons.LogIn,
      logout: Icons.LogOut,
      update: Icons.RefreshCw,
      add_question: Icons.Plus,
      create_question_bank: Icons.FolderPlus,
    };
    const Icon = icons[action] || Icons.Activity;
    return Icon;
  };

  const getActionColor = (action) => {
    const colors = {
      view: 'text-blue-400',
      create: 'text-green-400',
      edit: 'text-yellow-400',
      delete: 'text-red-400',
      publish: 'text-purple-400',
      login: 'text-cyan-400',
      logout: 'text-gray-400',
      add_question: 'text-green-400',
      create_question_bank: 'text-purple-400',
    };
    return colors[action] || 'text-gray-400';
  };

  // ✅ دالة لاستخراج نص مقروء من details
  const getActivityText = (action, details) => {
    if (!details) return action;

    // إذا كان details نصاً، نعيده مباشرة
    if (typeof details === 'string') return details;

    // إذا كان كائن، نصنع وصفاً مقروءاً
    try {
      if (action === 'add_question' && details.question_id) {
        return `أضاف سؤالاً (ID: ${details.question_id})`;
      }
      if (action === 'create_question_bank' && details.bank_id) {
        return `أنشأ بنك أسئلة (ID: ${details.bank_id})`;
      }
      if (action === 'edit_question' && details.question_id) {
        return `عدّل سؤالاً (ID: ${details.question_id})`;
      }
      if (action === 'delete_question' && details.question_id) {
        return `حذف سؤالاً (ID: ${details.question_id})`;
      }
      // إذا لم نتعرف على النوع، نعرض JSON مختصر
      return `${action}: ${JSON.stringify(details).slice(0, 50)}...`;
    } catch {
      return action;
    }
  };

  const ActionIcon = getActionIcon(activity.action);
  const activityText = getActivityText(activity.action, activity.details);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 p-3 rounded-xl ${styles.card} border ${styles.border} transition-all duration-300 hover:bg-white/5`}
    >
      <div className={`p-1.5 rounded-lg bg-purple-500/10 flex-shrink-0 ${getActionColor(activity.action)}`}>
        <ActionIcon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${styles.text} truncate font-medium`}>
          {activityText}
        </p>
        <p className={`text-[10px] ${styles.subtext} opacity-60`}>
          {formatDate(activity.created_at)}
        </p>
      </div>
    </motion.div>
  );
};

// ================================================================
// 5. مودال تعديل الاسم المعروض
// ================================================================
const EditDisplayNameModal = ({ isOpen, onClose, onSave, currentName, isLoading, t }) => {
  const [displayName, setDisplayName] = useState(currentName || '');

  useEffect(() => {
    setDisplayName(currentName || '');
  }, [currentName]);

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
        className="bg-[#1a1f2e] dark:bg-[#1a1f2e] border border-white/10 rounded-3xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-right">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 rounded-xl bg-purple-500/10">
              <Icons.User className="h-6 w-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{t.editDisplayName}</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm block mb-1">{t.editDisplayNameLabel}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="الاسم الذي سيظهر للمستخدمين"
                className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-400/50 outline-none transition"
                dir="rtl"
              />
              <p className="text-[10px] text-gray-400 mt-1">{t.editDisplayNameHint}</p>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition"
            >
              {t.cancel}
            </button>
            <button
              onClick={() => onSave(displayName.trim())}
              disabled={!displayName.trim() || isLoading}
              className="px-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icons.Check className="h-4 w-4" />
              )}
              {t.save}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 6. الصفحة الرئيسية
// ================================================================
export default function AssistantProfilePage() {
  const router = useRouter();
  const { theme, toggleTheme, styles, language } = useTheme();
  const { assistant, permissions, loading: assistantLoading, mutate: mutateAssistant } = useAssistantData();

  // ===== اختيار الترجمة =====
  const t = translations[language] || translations.ar;

  // ===== حالات =====
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActivities: 0,
    lastLogin: null,
  });
  const [recentActivities, setRecentActivities] = useState([]);

  // ===== حالات المودال =====
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ===== جلب الإحصائيات والنشاطات =====
  const fetchStatsAndActivities = useCallback(async () => {
    if (!assistant?.id) return;
    try {
      // جلب إجمالي النشاطات
      const { count: totalActivities } = await supabase
        .from('assistant_logs')
        .select('*', { count: 'exact', head: true })
        .eq('assistant_id', assistant.id);

      // جلب آخر تسجيل دخول
      const { data: loginLog } = await supabase
        .from('assistant_logs')
        .select('created_at')
        .eq('assistant_id', assistant.id)
        .eq('action', 'login')
        .order('created_at', { ascending: false })
        .limit(1);

      // جلب آخر 5 نشاطات
      const { data: activities } = await supabase
        .from('assistant_logs')
        .select('*')
        .eq('assistant_id', assistant.id)
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        totalActivities: totalActivities || 0,
        lastLogin: loginLog?.[0]?.created_at || null,
      });
      setRecentActivities(activities || []);
    } catch (err) {
      console.error('❌ Error fetching stats:', err);
      toast.error(t.fetchFailed);
    }
  }, [assistant?.id, t]);

  useEffect(() => {
    if (!assistantLoading && assistant) {
      fetchStatsAndActivities();
      setLoading(false);
    } else if (!assistantLoading && !assistant) {
      setLoading(false);
    }
  }, [assistantLoading, assistant, fetchStatsAndActivities]);

  // ===== تحديث الاسم المعروض =====
  const handleUpdateDisplayName = async (newName) => {
    if (!newName || newName === assistant?.display_name) {
      setEditModalOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({
          display_name: newName,
          updated_at: new Date().toISOString(),
        })
        .eq('id', assistant.id);

      if (error) throw error;

      // تحديث البيانات في sessionStorage (للتأكد)
      const sessionData = sessionStorage.getItem('assistantData');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.display_name = newName;
        sessionStorage.setItem('assistantData', JSON.stringify(parsed));
      }

      // تحديث السياق
      await mutateAssistant();

      toast.success(t.updateSuccess);
      setEditModalOpen(false);
    } catch (err) {
      console.error('❌ Error updating display name:', err);
      toast.error(t.updateFailed);
    } finally {
      setIsSaving(false);
    }
  };

  // ===== تنسيق التاريخ =====
  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString(
      language === 'ar' ? 'ar-EG' : 'en-US',
      {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }
    );
  };

  // ===== بيانات الإحصائيات =====
  const statsData = useMemo(() => [
    {
      id: 'activities',
      label: t.totalActivities,
      value: stats.totalActivities || 0,
      icon: Icons.Activity,
      color: 'from-blue-400 to-blue-600',
      delay: 0,
    },
    {
      id: 'level',
      label: t.roleLevel,
      value: assistant?.role_level || 0,
      suffix: '/10',
      icon: Icons.TrendingUp,
      color: 'from-purple-400 to-purple-600',
      delay: 0.1,
    },
  ], [stats.totalActivities, assistant?.role_level, t]);

  // ===== حالات التحميل =====
  if (assistantLoading || loading) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
            </div>
          </div>
          <p className={`text-sm ${styles.subtext} animate-pulse`}>{t.loading}</p>
        </div>
      </div>
    );
  }

  if (!assistant) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="text-center">
          <Icons.User className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${styles.text}`}>{t.notFound}</h2>
          <button
            onClick={() => router.push('/dashboard/assistant')}
            className="mt-4 px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition"
          >
            {t.goBack}
          </button>
        </div>
      </div>
    );
  }

  // ===== الدور =====
  const roleLabels = {
    chief: '🔑 رئيس المساعدين',
    expert: '⭐ خبير',
    technical: '🛠️ تقني',
    supervisor: '👀 مشرف',
    coordinator: '📋 منسق',
    assistant: '🤝 مساعد',
    intern: '📚 متدرب',
  };

  // ===== العرض الرئيسي =====
  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden transition-colors duration-300`}>
      <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">

        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Icons.User className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className={`text-3xl font-extrabold ${styles.text}`}>{t.title}</h1>
                <p className={`text-sm ${styles.subtext} mt-1 flex flex-wrap items-center gap-2`}>
                  {t.subtitle}
                  {assistant && (
                    <span className="text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-400/20">
                      {roleLabels[assistant.role] || assistant.role}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 md:mt-0">
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-xl transition ${
                styles.card
              } border ${styles.border} hover:border-purple-400/50`}
            >
              {theme === 'dark' ? (
                <Icons.Sun className="h-5 w-5 text-yellow-400" />
              ) : (
                <Icons.Moon className="h-5 w-5 text-gray-600" />
              )}
            </button>
            <button
              onClick={() => router.push('/dashboard/assistant')}
              className={`px-4 py-2 rounded-xl text-sm transition flex items-center gap-1 ${
                styles.card
              } border ${styles.border} hover:border-purple-400/50`}
            >
              <Icons.ArrowRight className="h-4 w-4" /> {t.back}
            </button>
          </div>
        </div>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {statsData.map((stat) => (
            <StatCard key={stat.id} stat={stat} styles={styles} t={t} />
          ))}
        </div>

        {/* ===== معلومات الحساب ===== */}
        <div className={`${styles.card} border ${styles.border} rounded-2xl p-6 mb-6`}>
          <h2 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
            <Icons.Info className="h-5 w-5 text-purple-400" />
            {t.accountInfo}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>{t.fullName}</p>
              <p className={`text-base font-semibold ${styles.text}`}>{assistant.full_name}</p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>{t.displayName}</p>
              <div className="flex items-center gap-2">
                <p className={`text-base font-semibold ${styles.text}`}>
                  {assistant.display_name || assistant.full_name}
                </p>
                <button
                  onClick={() => setEditModalOpen(true)}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition"
                  title={t.editDisplayName}
                >
                  <Icons.Edit className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>{t.role}</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {roleLabels[assistant.role] || assistant.role}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>{t.roleLevel}</p>
              <div className="flex items-center gap-2">
                <p className={`text-base font-semibold ${styles.text}`}>{assistant.role_level || 0} / 10</p>
                <div className="flex-1 max-w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-500"
                    style={{ width: `${((assistant.role_level || 0) / 10) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>{t.accessCode}</p>
              <div className="flex items-center gap-2">
                <p className={`text-base font-mono font-semibold ${styles.text}`}>{assistant.access_code}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(assistant.access_code);
                    toast.success(t.copied);
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition"
                  title={t.copy}
                >
                  <Icons.Copy className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>{t.lastLogin}</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {formatDate(stats.lastLogin)}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>{t.createdDate}</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {formatDate(assistant.created_at)}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>{t.status}</p>
              <span className={`inline-block text-xs px-3 py-1 rounded-full border ${
                assistant.is_active
                  ? 'bg-green-500/20 text-green-400 border-green-400/30'
                  : 'bg-red-500/20 text-red-400 border-red-400/30'
              }`}>
                {assistant.is_active ? t.active : t.inactive}
              </span>
            </div>

            {assistant.card_version && (
              <div>
                <p className={`text-xs ${styles.subtext} opacity-60`}>{t.cardVersion}</p>
                <p className={`text-base font-semibold ${styles.text}`}>v{assistant.card_version}</p>
              </div>
            )}
          </div>
        </div>

        {/* ===== آخر النشاطات ===== */}
        <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
          <h2 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
            <Icons.History className="h-5 w-5 text-purple-400" />
            {t.activitiesTitle}
          </h2>

          {recentActivities.length === 0 ? (
            <div className="text-center py-6">
              <Icons.History className="h-10 w-10 text-gray-600 mx-auto mb-2" />
              <p className={`text-sm ${styles.subtext}`}>{t.noActivities}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentActivities.map((activity) => (
                <ActivityItem key={activity.id} activity={activity} styles={styles} t={t} />
              ))}
            </div>
          )}

          {recentActivities.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/5 text-center">
              <Link
                href="/dashboard/assistant/logs"
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {t.viewAllActivities}
              </Link>
            </div>
          )}
        </div>

        {/* ===== تذييل ===== */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className={`text-[10px] ${styles.subtext} opacity-60`}>
            © 2026 منصة محمد رضوان • جميع الحقوق محفوظة
          </p>
        </div>
      </div>

      {/* ===== مودال تعديل الاسم المعروض ===== */}
      <EditDisplayNameModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleUpdateDisplayName}
        currentName={assistant?.display_name || assistant?.full_name || ''}
        isLoading={isSaving}
        t={t}
      />
    </div>
  );
}