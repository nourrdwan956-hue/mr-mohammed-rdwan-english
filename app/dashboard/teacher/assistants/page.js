'use client';

// ================================================================
// 👥 المساعدين – لوحة التحكم الرئيسية V1
// ================================================================
// الميزات:
// - عرض جميع المساعدين مع بياناتهم (الاسم، الدور، الحالة، تاريخ الإنشاء، آخر تسجيل دخول)
// - إحصائيات سريعة (الإجمالي، النشطاء، الأدوار المختلفة)
// - فلترة حسب الدور والحالة
// - بحث حسب الاسم أو البريد الإلكتروني
// - أزرار إجراءات (تفاصيل، تعديل، تعطيل/تفعيل، حذف، بطاقة، سجل)
// - دعم الوضع الفاتح والداكن
// - ربط كامل بقاعدة البيانات (assistants + profiles)
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/lib/hooks/useTheme'; // ✅ استيراد الثيم الموحد

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
// 2. بطاقة إحصائية
// ================================================================
const StatCard = ({ stat, styles }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      className={`${styles.card} border ${styles.border} rounded-2xl p-5 ${styles.hover} transition-all duration-300 hover:shadow-2xl ${styles.shadow}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className={`${styles.subtext} text-sm`}>{stat.label}</p>
          <p className={`text-3xl font-extrabold ${styles.text} mt-1`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
          {stat.sub && <p className={`text-xs ${styles.subtext} mt-0.5 opacity-70`}>{stat.sub}</p>}
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 3. مكون المساعد (Assistant Item)
// ================================================================
const AssistantItem = ({ assistant, styles, onToggleActive, onDelete, onView, onEdit, onCard, onLogs }) => {
  const [showActions, setShowActions] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const roleLabels = {
    chief: 'رئيس',
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

  const handleToggleActive = async () => {
    setIsUpdating(true);
    try {
      await onToggleActive(assistant.id);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      className={`${styles.card} border ${styles.border} rounded-2xl p-4 ${styles.hover} transition-all duration-300 cursor-pointer`}
    >
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {/* العمود الأول: معلومات المساعد */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${roleColors[assistant.role] || roleColors.assistant}`}>
              {roleLabels[assistant.role] || assistant.role}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              assistant.is_active
                ? 'bg-green-500/20 text-green-400 border-green-400/20'
                : 'bg-gray-500/20 text-gray-400 border-gray-400/20'
            }`}>
              {assistant.is_active ? '🟢 نشط' : '🔴 غير نشط'}
            </span>
            <span className="text-[10px] text-gray-500 flex items-center gap-1">
              <Icons.Calendar className="h-3 w-3" />
              {new Date(assistant.created_at).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            {assistant.last_login && (
              <span className="text-[10px] text-gray-500 flex items-center gap-1">
                <Icons.LogIn className="h-3 w-3" />
                آخر دخول: {new Date(assistant.last_login).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
              {assistant.display_name?.charAt(0) || 'م'}
            </div>
            <div>
              <p className={`text-sm font-bold ${styles.text}`}>
                {assistant.display_name || assistant.full_name}
              </p>
              <p className={`text-xs ${styles.subtext}`}>
                {assistant.full_name}
                <span className="mr-2 text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  مستوى {assistant.role_level || 1}
                </span>
              </p>
            </div>
          </div>

          {/* عرض ملخص الصلاحيات (اختصار) */}
          <div className="flex flex-wrap gap-1 mt-1.5">
            {assistant.permissions?.slice(0, 4).map((p) => (
              <span key={p.module} className={`text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border ${styles.border} ${styles.subtext}`}>
                {p.module}
                {p.can_manage && ' 🔑'}
              </span>
            ))}
            {assistant.permissions?.length > 4 && (
              <span className={`text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 border ${styles.border} ${styles.subtext}`}>
                +{assistant.permissions.length - 4}
              </span>
            )}
          </div>
        </div>

        {/* العمود الثاني: الإجراءات */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleActive(); }}
            disabled={isUpdating}
            className={`p-2 rounded-xl transition ${
              assistant.is_active
                ? 'hover:bg-yellow-400/20 text-yellow-400'
                : 'hover:bg-green-500/20 text-green-400'
            }`}
            title={assistant.is_active ? 'تعطيل' : 'تفعيل'}
          >
            {isUpdating ? <Icons.Loader2 className="h-4 w-4 animate-spin" /> : assistant.is_active ? <Icons.UserX className="h-4 w-4" /> : <Icons.UserCheck className="h-4 w-4" />}
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onCard(assistant.id); }}
            className="p-2 rounded-xl hover:bg-purple-500/20 transition text-purple-400"
            title="البطاقة التعريفية"
          >
            <Icons.CreditCard className="h-4 w-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onLogs(assistant.id); }}
            className="p-2 rounded-xl hover:bg-cyan-500/20 transition text-cyan-400"
            title="سجل النشاط"
          >
            <Icons.History className="h-4 w-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onEdit(assistant.id); }}
            className="p-2 rounded-xl hover:bg-yellow-400/20 transition text-yellow-400"
            title="تعديل"
          >
            <Icons.Edit className="h-4 w-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(assistant.id); }}
            className="p-2 rounded-xl hover:bg-red-500/20 transition text-red-400"
            title="حذف"
          >
            <Icons.Trash2 className="h-4 w-4" />
          </button>

          <button
            onClick={(e) => { e.stopPropagation(); onView(assistant.id); }}
            className="p-2 rounded-xl hover:bg-blue-500/20 transition text-blue-400"
            title="تفاصيل"
          >
            <Icons.Eye className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 4. مودال تأكيد الحذف
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
// 5. الصفحة الرئيسية
// ================================================================
export default function AssistantsPage() {
  const router = useRouter();
  // ✅ استخدام الثيم المركزي (نحتاج فقط theme، ولا نستخدم toggleTheme أو language هنا)
  const { theme } = useTheme();

  // ✅ بناء أنماط محلية تعتمد على theme بنفس بنية الكود السابق
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
  const [assistants, setAssistants] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // ===== جلب البيانات =====
  const fetchAssistants = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // جلب المساعدين مع صلاحياتهم
      const { data, error } = await supabase
        .from('assistants')
        .select(`
          *,
          permissions:assistant_permissions (module, can_view, can_create, can_edit, can_delete, can_publish, can_manage)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssistants(data || []);
    } catch (err) {
      console.error('Error fetching assistants:', err);
      setError('فشل جلب المساعدين');
      toast.error('فشل جلب المساعدين');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchAssistants();
  }, [fetchAssistants]);

  // ===== الفلترة والبحث =====
  const filteredAssistants = useMemo(() => {
    let result = [...assistants];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(a =>
        a.full_name.toLowerCase().includes(q) ||
        a.display_name.toLowerCase().includes(q)
      );
    }

    if (filterRole !== 'all') {
      result = result.filter(a => a.role === filterRole);
    }

    if (filterStatus !== 'all') {
      result = result.filter(a => a.is_active === (filterStatus === 'active'));
    }

    return result;
  }, [assistants, searchQuery, filterRole, filterStatus]);

  // ===== إحصائيات =====
  const stats = useMemo(() => {
    const total = assistants.length;
    const active = assistants.filter(a => a.is_active).length;
    const roles = {};
    assistants.forEach(a => { roles[a.role] = (roles[a.role] || 0) + 1; });
    return { total, active, inactive: total - active, roles };
  }, [assistants]);

  // ===== دوال الإجراءات =====
  const handleToggleActive = async (id) => {
    const assistant = assistants.find(a => a.id === id);
    if (!assistant) return;
    try {
      const { error } = await supabase
        .from('assistants')
        .update({ is_active: !assistant.is_active, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      toast.success(assistant.is_active ? '✅ تم تعطيل المساعد' : '✅ تم تفعيل المساعد');
      fetchAssistants();
    } catch (err) {
      console.error('Error toggling active:', err);
      toast.error('فشل تغيير الحالة');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('assistants')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('✅ تم حذف المساعد');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchAssistants();
    } catch (err) {
      console.error('Error deleting assistant:', err);
      toast.error('فشل حذف المساعد');
    }
  };

  const handleView = (id) => {
    router.push(`/dashboard/teacher/assistants/${id}`);
  };

  const handleEdit = (id) => {
    router.push(`/dashboard/teacher/assistants/${id}/edit`);
  };

  const handleCard = (id) => {
    router.push(`/dashboard/teacher/assistants/${id}/card`);
  };

  const handleLogs = (id) => {
    router.push(`/dashboard/teacher/assistants/${id}/logs`);
  };

  const handleNewAssistant = () => {
    router.push('/dashboard/teacher/assistants/new');
  };

  // ===== خيارات الأدوار للفلترة =====
  const roleOptions = [
    { value: 'chief', label: 'رئيس' },
    { value: 'expert', label: 'خبير' },
    { value: 'technical', label: 'تقني' },
    { value: 'supervisor', label: 'مشرف' },
    { value: 'coordinator', label: 'منسق' },
    { value: 'assistant', label: 'مساعد' },
    { value: 'intern', label: 'متدرب' },
  ];

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي المساعدين', value: stats.total, suffix: '', icon: Icons.Users, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'نشط', value: stats.active, suffix: '', icon: Icons.UserCheck, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'غير نشط', value: stats.inactive, suffix: '', icon: Icons.UserX, color: 'from-gray-400 to-gray-600', delay: 0.2 },
  ];

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
                👥 إدارة المساعدين
              </h1>
              <p className={`${styles.subtext} text-sm mt-1 flex items-center gap-2 flex-wrap`}>
                إدارة فريق المساعدين وتوزيع الصلاحيات
                <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  <Icons.Shield className="h-3 w-3 inline ml-1" /> صلاحيات متقدمة
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              {/* ✅ تم حذف زر تبديل الثيم المكرر لأنه موجود في DashboardLayout */}
              <button
                onClick={fetchAssistants}
                className={`p-2 rounded-xl transition ${styles.card} border ${styles.border}`}
                title="تحديث البيانات"
              >
                <Icons.RefreshCw className="h-5 w-5" />
              </button>
              <button
                onClick={handleNewAssistant}
                className="px-5 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Icons.Plus className="h-5 w-5" /> إضافة مساعد
              </button>
            </div>
          </div>

          {/* ===== الإحصائيات ===== */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {statsData.map((stat) => (
              <StatCard key={stat.id} stat={stat} styles={styles} />
            ))}
          </div>

          {/* ===== الفلتر والبحث ===== */}
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث عن مساعد (الاسم الرباعي أو المعروض)..."
                className={`w-full p-2.5 pr-10 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
              />
            </div>

            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              <option value="all">جميع الأدوار</option>
              {roleOptions.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              <option value="all">جميع الحالات</option>
              <option value="active">نشط</option>
              <option value="inactive">غير نشط</option>
            </select>
          </div>

          {/* ===== قائمة المساعدين ===== */}
          {filteredAssistants.length === 0 ? (
            <div className="text-center py-20">
              <Icons.Users className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h3 className={`text-xl font-semibold ${styles.text}`}>
                {searchQuery || filterRole !== 'all' || filterStatus !== 'all'
                  ? 'لا توجد نتائج'
                  : 'لا يوجد مساعدين بعد'}
              </h3>
              <p className={`${styles.subtext} text-sm mt-2`}>
                {searchQuery || filterRole !== 'all' || filterStatus !== 'all'
                  ? 'حاول تغيير معايير البحث'
                  : 'أضف أول مساعد لك'}
              </p>
              {!searchQuery && filterRole === 'all' && filterStatus === 'all' && (
                <button
                  onClick={handleNewAssistant}
                  className="mt-4 px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
                >
                  إضافة مساعد الآن
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssistants.map((assistant) => (
                <AssistantItem
                  key={assistant.id}
                  assistant={assistant}
                  styles={styles}
                  onToggleActive={handleToggleActive}
                  onDelete={(id) => {
                    const a = assistants.find(ass => ass.id === id);
                    setDeleteTarget(a);
                    setIsDeleteModalOpen(true);
                  }}
                  onView={handleView}
                  onEdit={handleEdit}
                  onCard={handleCard}
                  onLogs={handleLogs}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===== مودال تأكيد الحذف ===== */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setDeleteTarget(null);
        }}
        onConfirm={handleDelete}
        name={deleteTarget?.display_name || deleteTarget?.full_name || ''}
      />

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
      `}</style>
    </TeacherLayout>
  );
}
//تم التعديل بنجاح في مرحلة الثيم 