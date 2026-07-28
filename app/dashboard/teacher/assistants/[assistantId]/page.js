'use client';

// ================================================================
// 👥 تفاصيل المساعد – لوحة التحكم الشاملة V1
// المسار: app/dashboard/teacher/assistants/[assistantId]/page.js
// ================================================================
// الميزات:
// - عرض جميع بيانات المساعد (الاسم، الدور، مستوى الصلاحية، الحالة، التواريخ)
// - عرض الصلاحيات التفصيلية لكل وحدة مع تمثيل مرئي
// - عرض سجل النشاط (آخر 10 إجراءات)
// - عرض البطاقة التعريفية في معاينة مصغرة
// - أزرار إجراءات سريعة (تعديل، بطاقة، سجل، تفعيل/تعطيل، حذف)
// - إحصائيات سريعة (عدد الصلاحيات، آخر نشاط، عدد مرات الطباعة)
// - دعم الوضع الفاتح والداكن مع حفظ التفضيل
// - ربط كامل بقاعدة البيانات (assistants, assistant_permissions, assistant_logs, assistant_cards)
// - معالجة الأخطاء وحالات التحميل
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استخدام الثيم الموحد

// ================================================================
// 1. عداد متحرك
// ================================================================
const AnimatedCounter = ({ target, suffix = '', duration = 1500 }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
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
        }
      },
      { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return <span ref={ref} className="font-extrabold">{count}{suffix}</span>;
};

// ================================================================
// 2. مكون البطاقة الإحصائية المصغرة
// ================================================================
const MiniStatCard = ({ label, value, icon: Icon, color, styles }) => {
  return (
    <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 text-center ${styles.hover} transition-all duration-300`}>
      <div className={`p-2 rounded-xl bg-gradient-to-br ${color} bg-opacity-20 inline-block mb-2`}>
        <Icon className={`h-5 w-5 text-white`} />
      </div>
      <p className={`text-2xl font-extrabold ${styles.text}`}>
        <AnimatedCounter target={value} suffix="" />
      </p>
      <p className={`text-xs ${styles.subtext}`}>{label}</p>
    </div>
  );
};

// ================================================================
// 3. مودال تأكيد الحذف
// ================================================================
const DeleteModal = ({ isOpen, onClose, onConfirm, name }) => {
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
          <Icons.AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">تأكيد الحذف</h3>
          <p className="text-gray-400 text-sm mb-6">
            هل أنت متأكد من حذف المساعد "{name}"؟ هذا الإجراء لا يمكن التراجع عنه.
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
// 4. الصفحة الرئيسية – تفاصيل المساعد
// ================================================================
export default function AssistantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const assistantId = params.assistantId;
  const { theme, styles } = useTheme(); // ✅ استخدام الثيم الموحد (نحذف toggleTheme لأنه موجود في TeacherLayout)

  // ===== حالات البيانات =====
  const [loading, setLoading] = useState(true);
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [logs, setLogs] = useState([]);
  const [card, setCard] = useState(null);
  const [error, setError] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

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

      // التحقق من ملكية المعلم
      if (assistantData.teacher_id !== user.id) {
        toast.error('غير مصرح لك بمشاهدة هذا المساعد');
        router.push('/dashboard/teacher/assistants');
        return;
      }

      setAssistant(assistantData);

      // 2. جلب الصلاحيات
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('assistant_id', assistantId);

      if (permissionsError) throw permissionsError;
      setPermissions(permissionsData || []);

      // 3. جلب سجل النشاط (آخر 10)
      const { data: logsData, error: logsError } = await supabase
        .from('assistant_logs')
        .select('*')
        .eq('assistant_id', assistantId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (logsError) throw logsError;
      setLogs(logsData || []);

      // 4. جلب البطاقة التعريفية
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
      console.error('Error fetching assistant data:', err);
      setError('فشل جلب بيانات المساعد');
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [assistantId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== دوال الإجراءات =====
  const handleToggleActive = async () => {
    if (!assistant) return;
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ 
          is_active: !assistant.is_active, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', assistantId);

      if (error) throw error;
      toast.success(assistant.is_active ? '✅ تم تعطيل المساعد' : '✅ تم تفعيل المساعد');
      fetchData();
    } catch (err) {
      console.error('Error toggling active:', err);
      toast.error('فشل تغيير الحالة');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', assistantId);

      if (error) throw error;
      toast.success('✅ تم حذف المساعد');
      router.push('/dashboard/teacher/assistants');
    } catch (err) {
      console.error('Error deleting assistant:', err);
      toast.error('فشل حذف المساعد');
    }
  };

  const handleEdit = () => {
    router.push(`/dashboard/teacher/assistants/${assistantId}/edit`);
  };

  const handleCard = () => {
    router.push(`/dashboard/teacher/assistants/${assistantId}/card`);
  };

  const handleLogs = () => {
    router.push(`/dashboard/teacher/assistants/${assistantId}/logs`);
  };

  // ===== دوال مساعدة =====
  const roleLabels = {
    chief: 'رئيس المساعدين',
    expert: 'خبير',
    technical: 'تقني',
    supervisor: 'مشرف',
    coordinator: 'منسق',
    assistant: 'مساعد',
    intern: 'متدرب',
  };

  const roleColors = {
    chief: 'bg-red-500/20 text-red-400 border-red-400/20',
    expert: 'bg-purple-500/20 text-purple-400 border-purple-400/20',
    technical: 'bg-blue-500/20 text-blue-400 border-blue-400/20',
    supervisor: 'bg-orange-500/20 text-orange-400 border-orange-400/20',
    coordinator: 'bg-cyan-500/20 text-cyan-400 border-cyan-400/20',
    assistant: 'bg-green-500/20 text-green-400 border-green-400/20',
    intern: 'bg-gray-500/20 text-gray-400 border-gray-400/20',
  };

  // ✅ قائمة الوحدات المحدثة – النظام الجديد
  const moduleLabels = {
    courses: 'الكورسات',
    videos: 'الفيديوهات',
    exams: 'الامتحانات',
    books: 'الكتب',
    question_bank: 'بنوك الأسئلة',
    support: 'الدعم',
    announcements: 'الإعلانات',
    messages: 'المراسلات',
    notes: 'الملاحظات',
  };

  const permissionLabels = {
    can_view: 'عرض',
    can_create: 'إنشاء',
    can_edit: 'تعديل',
    can_delete: 'حذف',
    can_publish: 'نشر',
    can_manage: 'إدارة كاملة',
  };

  const formatDate = (date) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeSince = (date) => {
    if (!date) return '—';
    const diff = Date.now() - new Date(date).getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'أقل من ساعة';
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days} يوم${days > 1 ? 'ين' : ''}`;
    const months = Math.floor(days / 30);
    return `${months} شهر${months > 1 ? 'ين' : ''}`;
  };

  // ===== حساب الإحصائيات =====
  const stats = useMemo(() => {
    const totalPermissions = permissions.length;
    const activePermissions = permissions.filter(p => 
      p.can_view || p.can_create || p.can_edit || p.can_delete || p.can_publish || p.can_manage
    ).length;
    return { totalPermissions, activePermissions };
  }, [permissions]);

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
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/teacher/assistants"
                className={`p-2 rounded-xl hover:bg-white/5 transition ${styles.subtext}`}
              >
                <Icons.ArrowRight className="h-5 w-5" />
              </Link>
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold text-xl">
                    {assistant.display_name?.charAt(0) || assistant.full_name?.charAt(0) || 'م'}
                  </div>
                  <div>
                    <h1 className={`text-2xl font-extrabold ${styles.text}`}>
                      {assistant.display_name || assistant.full_name}
                    </h1>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${roleColors[assistant.role] || roleColors.assistant}`}>
                        {roleLabels[assistant.role] || assistant.role}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${
                        assistant.is_active
                          ? 'bg-green-500/20 text-green-400 border-green-400/20'
                          : 'bg-gray-500/20 text-gray-400 border-gray-400/20'
                      }`}>
                        {assistant.is_active ? '🟢 نشط' : '🔴 غير نشط'}
                      </span>
                      <span className="text-xs text-gray-500">مستوى {assistant.role_level}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              <button
                onClick={fetchData}
                className={`p-2 rounded-xl transition ${styles.card} border ${styles.border}`}
                title="تحديث البيانات"
              >
                <Icons.RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleToggleActive}
                disabled={isUpdating}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
                  assistant.is_active
                    ? 'bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-400'
                    : 'bg-green-500/20 hover:bg-green-500/30 text-green-400'
                }`}
              >
                {isUpdating ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : assistant.is_active ? <Icons.UserX className="h-4 w-4" /> : <Icons.UserCheck className="h-4 w-4" />}
                {assistant.is_active ? 'تعطيل' : 'تفعيل'}
              </button>
              <button
                onClick={handleEdit}
                className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Icons.Edit className="h-4 w-4" /> تعديل
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm font-semibold transition flex items-center gap-2"
              >
                <Icons.Trash2 className="h-4 w-4" /> حذف
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

          {/* ===== البطاقات الإحصائية ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <MiniStatCard label="الصلاحيات" value={stats.activePermissions} icon={Icons.Shield} color="from-purple-400 to-purple-600" styles={styles} />
            <MiniStatCard label="آخر نشاط" value={logs.length} icon={Icons.History} color="from-blue-400 to-blue-600" styles={styles} />
            <MiniStatCard label="طباعة البطاقة" value={card?.print_count || 0} icon={Icons.Printer} color="from-yellow-400 to-yellow-600" styles={styles} />
            <MiniStatCard label="مستوى الصلاحية" value={assistant.role_level || 1} icon={Icons.Star} color="from-green-400 to-green-600" styles={styles} />
          </div>

          {/* ===== المحتوى الرئيسي (شبكة 2/1) ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* العمود الرئيسي (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* المعلومات الأساسية */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
                <h3 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
                  <Icons.User className="h-5 w-5 text-yellow-400" /> المعلومات الأساسية
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الاسم الرباعي</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{assistant.full_name || '—'}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الاسم المعروض</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{assistant.display_name || '—'}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>الدور الوظيفي</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{roleLabels[assistant.role] || assistant.role}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>مستوى الصلاحية</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{assistant.role_level}/10</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>تاريخ الإنشاء</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{formatDate(assistant.created_at)}</p>
                  </div>
                  <div>
                    <p className={`text-xs ${styles.subtext}`}>آخر تسجيل دخول</p>
                    <p className={`text-sm font-medium ${styles.text}`}>{assistant.last_login ? `${formatDate(assistant.last_login)} (منذ ${getTimeSince(assistant.last_login)})` : '—'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <p className={`text-xs ${styles.subtext}`}>رمز الأمان</p>
                    <p className={`text-sm font-mono font-medium ${styles.text} bg-white/5 p-2 rounded-lg border ${styles.border}`} dir="ltr">
                      {assistant.access_code || '—'}
                    </p>
                  </div>
                </div>
              </div>

              {/* الصلاحيات التفصيلية */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-lg font-bold ${styles.text} flex items-center gap-2`}>
                    <Icons.Shield className="h-5 w-5 text-yellow-400" /> الصلاحيات
                  </h3>
                  <span className={`text-xs ${styles.subtext}`}>{permissions.length} وحدة • {stats.activePermissions} صلاحية نشطة</span>
                </div>

                {permissions.length === 0 ? (
                  <p className={`text-sm ${styles.subtext} text-center py-4`}>لا توجد صلاحيات محددة لهذا المساعد</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className={`border-b ${styles.border}`}>
                        <tr className={`text-xs ${styles.subtext}`}>
                          <th className="text-right py-2 px-2">الوحدة</th>
                          <th className="text-center py-2 px-1">عرض</th>
                          <th className="text-center py-2 px-1">إنشاء</th>
                          <th className="text-center py-2 px-1">تعديل</th>
                          <th className="text-center py-2 px-1">حذف</th>
                          <th className="text-center py-2 px-1">نشر</th>
                          <th className="text-center py-2 px-1">إدارة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {permissions.map((perm) => (
                          <tr key={perm.id} className={`border-b ${styles.border} hover:bg-white/5 transition`}>
                            <td className="py-2 px-2">
                              <span className={`text-sm ${styles.text}`}>{moduleLabels[perm.module] || perm.module}</span>
                            </td>
                            <td className="text-center py-2 px-1">
                              {perm.can_manage ? (
                                <span className="text-yellow-400">🔑</span>
                              ) : (
                                <span className={perm.can_view ? 'text-green-400' : 'text-gray-500'}>
                                  {perm.can_view ? '✅' : '❌'}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-1">
                              {perm.can_manage ? (
                                <span className="text-yellow-400">✅</span>
                              ) : (
                                <span className={perm.can_create ? 'text-green-400' : 'text-gray-500'}>
                                  {perm.can_create ? '✅' : '❌'}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-1">
                              {perm.can_manage ? (
                                <span className="text-yellow-400">✅</span>
                              ) : (
                                <span className={perm.can_edit ? 'text-green-400' : 'text-gray-500'}>
                                  {perm.can_edit ? '✅' : '❌'}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-1">
                              {perm.can_manage ? (
                                <span className="text-yellow-400">✅</span>
                              ) : (
                                <span className={perm.can_delete ? 'text-green-400' : 'text-gray-500'}>
                                  {perm.can_delete ? '✅' : '❌'}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-1">
                              {perm.can_manage ? (
                                <span className="text-yellow-400">✅</span>
                              ) : (
                                <span className={perm.can_publish ? 'text-green-400' : 'text-gray-500'}>
                                  {perm.can_publish ? '✅' : '❌'}
                                </span>
                              )}
                            </td>
                            <td className="text-center py-2 px-1">
                              <span className={perm.can_manage ? 'text-yellow-400 font-bold' : 'text-gray-500'}>
                                {perm.can_manage ? '✅' : '❌'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* العمود الجانبي (1/3) */}
            <div className="space-y-6">
              {/* البطاقة التعريفية */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6 text-center`}>
                <h3 className={`text-sm font-bold ${styles.text} mb-3 flex items-center justify-center gap-2`}>
                  <Icons.CreditCard className="h-4 w-4 text-yellow-400" /> البطاقة التعريفية
                </h3>
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold text-2xl mx-auto">
                  {assistant.display_name?.charAt(0) || assistant.full_name?.charAt(0) || 'م'}
                </div>
                <p className={`text-sm font-bold ${styles.text} mt-2`}>
                  {assistant.display_name || assistant.full_name}
                </p>
                <p className={`text-xs ${styles.subtext}`}>{roleLabels[assistant.role] || assistant.role}</p>
                {card && (
                  <div className={`mt-3 ${styles.card} border ${styles.border} rounded-xl p-3 text-xs`}>
                    <p className={styles.subtext}>رقم البطاقة: <span className={`${styles.text} font-mono`}>{card.card_number}</span></p>
                    <p className={styles.subtext}>طبعت {card.print_count || 0} مرة</p>
                    <p className={styles.subtext}>آخر طباعة: {card.printed_at ? formatDate(card.printed_at) : '—'}</p>
                  </div>
                )}
                <button
                  onClick={handleCard}
                  className="mt-4 w-full py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  <Icons.Eye className="h-4 w-4" /> عرض البطاقة
                </button>
              </div>

              {/* آخر النشاطات */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
                <h3 className={`text-sm font-bold ${styles.text} mb-3 flex items-center gap-2`}>
                  <Icons.History className="h-4 w-4 text-yellow-400" /> آخر النشاطات
                </h3>
                {logs.length === 0 ? (
                  <p className={`text-xs ${styles.subtext} text-center py-2`}>لا توجد نشاطات</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {logs.map((log) => (
                      <div key={log.id} className={`${styles.card} border ${styles.border} rounded-xl p-2 text-xs`}>
                        <div className="flex justify-between">
                          <span className={styles.text}>{log.action}</span>
                          <span className={styles.subtext}>{log.module}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className={styles.subtext}>{log.details?.target_id ? `ID: ${log.details.target_id.slice(0, 8)}` : '—'}</span>
                          <span className={styles.subtext}>{formatDate(log.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={handleLogs}
                  className="mt-3 w-full py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-2"
                >
                  <Icons.Eye className="h-3.5 w-3.5" /> عرض السجل الكامل
                </button>
              </div>

              {/* إجراءات سريعة */}
              <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
                <h3 className={`text-sm font-bold ${styles.text} mb-3`}>إجراءات سريعة</h3>
                <div className="space-y-2">
                  <Link
                    href={`/dashboard/teacher/assistants/${assistantId}/edit`}
                    className={`w-full flex items-center gap-2 px-3 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition text-sm`}
                  >
                    <Icons.Edit className="h-4 w-4 text-yellow-400" /> تعديل البيانات
                  </Link>
                  <Link
                    href={`/dashboard/teacher/assistants/${assistantId}/card`}
                    className={`w-full flex items-center gap-2 px-3 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition text-sm`}
                  >
                    <Icons.CreditCard className="h-4 w-4 text-purple-400" /> عرض البطاقة
                  </Link>
                  <Link
                    href={`/dashboard/teacher/assistants/${assistantId}/logs`}
                    className={`w-full flex items-center gap-2 px-3 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition text-sm`}
                  >
                    <Icons.History className="h-4 w-4 text-cyan-400" /> سجل النشاط
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ===== مودال تأكيد الحذف ===== */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        name={assistant.display_name || assistant.full_name}
      />

      {/* ===== CSS إضافي ===== */}
      <style jsx>{`
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