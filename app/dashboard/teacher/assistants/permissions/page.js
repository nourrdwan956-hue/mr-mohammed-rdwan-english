'use client';

// ================================================================
// 🔑 مركز صلاحيات المساعدين – لوحة التحكم والإدارة المركزية
// ================================================================
// الميزات:
// - عرض جميع المساعدين وصلاحياتهم في جدول شامل
// - تعديل صلاحيات مساعد معين بسرعة (مودال سريع)
// - نسخ صلاحيات من مساعد إلى آخر
// - إعادة تعيين صلاحيات مساعد إلى الإعدادات الافتراضية
// - فلترة حسب الدور، الوحدة، حالة النشاط
// - بحث حسب اسم المساعد
// - إحصائيات توزيع الصلاحيات (رسوم بيانية)
// - عرض عدد المساعدين الذين لديهم صلاحية على كل وحدة
// - تصدير تقرير الصلاحيات كـ CSV
// - دعم الوضع الفاتح والداكن
// - ربط كامل بقاعدة البيانات (assistants, assistant_permissions)
// ================================================================

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as Icons from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import { useTheme } from '@/lib/hooks/useTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

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
// 3. مودال تعديل الصلاحيات السريع
// ================================================================
const QuickEditModal = ({ isOpen, onClose, assistant, permissions, modules, onSave, styles }) => {
  const [perms, setPerms] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assistant && permissions) {
      const initial = {};
      modules.forEach(mod => {
        const p = permissions.find(perm => perm.module === mod.id);
        initial[mod.id] = {
          can_view: p?.can_view || false,
          can_create: p?.can_create || false,
          can_edit: p?.can_edit || false,
          can_delete: p?.can_delete || false,
          can_publish: p?.can_publish || false,
          can_manage: p?.can_manage || false,
        };
      });
      setPerms(initial);
    }
  }, [assistant, permissions, modules]);

  const toggleAllPermissions = (moduleId, value) => {
    setPerms(prev => ({
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
    setPerms(prev => ({
      ...prev,
      [moduleId]: {
        ...prev[moduleId],
        [permission]: value,
      },
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const permissionsData = [];
      Object.entries(perms).forEach(([moduleId, permsObj]) => {
        const anyActive = Object.values(permsObj).some(v => v === true);
        if (anyActive) {
          permissionsData.push({
            assistant_id: assistant.id,
            module: moduleId,
            ...permsObj,
          });
        }
      });
      await onSave(assistant.id, permissionsData);
      onClose();
    } catch (err) {
      toast.error('فشل حفظ الصلاحيات');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !assistant) return null;

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
        className={`${styles.card} border ${styles.border} rounded-3xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className={`text-2xl font-bold ${styles.text}`}>
            ✏️ تعديل صلاحيات {assistant.display_name || assistant.full_name}
          </h3>
          <button onClick={onClose} className={`p-2 rounded-xl hover:bg-white/5 transition ${styles.subtext}`}>
            <Icons.X className="h-6 w-6" />
          </button>
        </div>

        <div className="space-y-4 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {modules.map((mod) => {
            const p = perms[mod.id] || {};
            const anyActive = Object.values(p).some(v => v === true);
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
                          checked={p[perm] || false}
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

        <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition disabled:opacity-70"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ التغييرات'}
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-3 ${styles.card} border ${styles.border} rounded-xl hover:bg-white/5 transition`}
          >
            إلغاء
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 4. مودال تأكيد الحذف (إعادة تعيين)
// ================================================================
const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, styles }) => {
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
          <Icons.AlertTriangle className="h-12 w-12 text-yellow-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 text-sm mb-6">{message}</p>
          <div className="flex gap-3 justify-center">
            <button onClick={onClose} className="px-6 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition">إلغاء</button>
            <button onClick={onConfirm} className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black font-bold rounded-xl transition">تأكيد</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ================================================================
// 5. مكون صف المساعد في الجدول
// ================================================================
const AssistantPermissionRow = ({ assistant, modules, onQuickEdit, onCopy, onReset, styles }) => {
  const [expanded, setExpanded] = useState(false);
  const [showActions, setShowActions] = useState(false);

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
    chief: 'bg-red-500/20 text-red-400',
    expert: 'bg-purple-500/20 text-purple-400',
    technical: 'bg-blue-500/20 text-blue-400',
    supervisor: 'bg-orange-500/20 text-orange-400',
    coordinator: 'bg-cyan-500/20 text-cyan-400',
    assistant: 'bg-green-500/20 text-green-400',
    intern: 'bg-gray-500/20 text-gray-400',
  };

  // حساب عدد الصلاحيات النشطة
  const activePermissions = assistant.permissions?.filter(p =>
    p.can_view || p.can_create || p.can_edit || p.can_delete || p.can_publish || p.can_manage
  ).length || 0;

  // حساب الوحدات الممنوحة
  const modulesWithPermissions = assistant.permissions?.filter(p =>
    p.can_view || p.can_create || p.can_edit || p.can_delete || p.can_publish || p.can_manage
  ).map(p => p.module) || [];

  return (
    <motion.tr
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`border-b ${styles.border} hover:bg-white/5 transition`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <td className="py-3 px-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400/30 to-yellow-600/30 flex items-center justify-center text-yellow-400 font-bold text-sm flex-shrink-0">
            {assistant.display_name?.charAt(0) || assistant.full_name?.charAt(0) || 'م'}
          </div>
          <div>
            <p className={`text-sm font-medium ${styles.text}`}>{assistant.display_name || assistant.full_name}</p>
            <p className={`text-xs ${styles.subtext}`}>{assistant.full_name}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3">
        <span className={`text-xs px-2 py-0.5 rounded-full ${roleColors[assistant.role] || roleColors.assistant}`}>
          {roleLabels[assistant.role] || assistant.role}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`text-xs ${assistant.is_active ? 'text-green-400' : 'text-gray-400'}`}>
          {assistant.is_active ? '🟢 نشط' : '🔴 غير نشط'}
        </span>
      </td>
      <td className="py-3 px-3 text-center">
        <span className={`text-sm font-bold ${styles.text}`}>{activePermissions}</span>
      </td>
      <td className="py-3 px-3">
        <div className="flex flex-wrap gap-1">
          {modulesWithPermissions.slice(0, 3).map(mod => (
            <span key={mod} className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/20">
              {mod}
            </span>
          ))}
          {modulesWithPermissions.length > 3 && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10">
              +{modulesWithPermissions.length - 3}
            </span>
          )}
        </div>
      </td>
      <td className="py-3 px-3 text-center">
        <div className="flex items-center justify-center gap-1">
          <AnimatePresence>
            {showActions && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex gap-1"
              >
                <button
                  onClick={() => onQuickEdit(assistant)}
                  className="p-1.5 rounded-lg hover:bg-yellow-400/20 transition text-yellow-400"
                  title="تعديل سريع"
                >
                  <Icons.Edit className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onCopy(assistant)}
                  className="p-1.5 rounded-lg hover:bg-cyan-400/20 transition text-cyan-400"
                  title="نسخ الصلاحيات"
                >
                  <Icons.Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onReset(assistant)}
                  className="p-1.5 rounded-lg hover:bg-red-400/20 transition text-red-400"
                  title="إعادة تعيين"
                >
                  <Icons.RefreshCw className="h-4 w-4" />
                </button>
                <Link
                  href={`/dashboard/teacher/assistants/${assistant.id}`}
                  className="p-1.5 rounded-lg hover:bg-blue-400/20 transition text-blue-400"
                  title="عرض التفاصيل"
                >
                  <Icons.Eye className="h-4 w-4" />
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </td>
    </motion.tr>
  );
};

// ================================================================
// 6. الصفحة الرئيسية – مركز صلاحيات المساعدين
// ================================================================
export default function PermissionsPage() {
  const router = useRouter();
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

  // ===== حالات البيانات =====
  const [loading, setLoading] = useState(true);
  const [assistants, setAssistants] = useState([]);
  const [error, setError] = useState('');

  // ===== حالات الفلترة والبحث =====
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterModule, setFilterModule] = useState('all');

  // ===== حالات المودالات =====
  const [quickEditAssistant, setQuickEditAssistant] = useState(null);
  const [quickEditPermissions, setQuickEditPermissions] = useState([]);
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTarget, setResetTarget] = useState(null);
  const [copySource, setCopySource] = useState(null);
  const [copyTarget, setCopyTarget] = useState(null);
  const [showCopyModal, setShowCopyModal] = useState(false);

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    totalPermissions: 0,
    avgPermissions: 0,
    moduleStats: {},
  });

  // ===== وحدات النظام (محدثة) =====
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

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
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
          permissions:assistant_permissions (*)
        `)
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAssistants(data || []);

      // حساب الإحصائيات
      const total = data?.length || 0;
      const active = data?.filter(a => a.is_active).length || 0;
      let totalPerms = 0;
      const moduleStats = {};
      data?.forEach(a => {
        const perms = a.permissions || [];
        const activePerms = perms.filter(p =>
          p.can_view || p.can_create || p.can_edit || p.can_delete || p.can_publish || p.can_manage
        );
        totalPerms += activePerms.length;
        activePerms.forEach(p => {
          moduleStats[p.module] = (moduleStats[p.module] || 0) + 1;
        });
      });

      setStats({
        total,
        active,
        totalPermissions: totalPerms,
        avgPermissions: total > 0 ? Math.round(totalPerms / total) : 0,
        moduleStats,
      });

    } catch (err) {
      console.error('Error fetching permissions data:', err);
      setError('فشل جلب الصلاحيات');
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

    if (filterModule !== 'all') {
      result = result.filter(a =>
        a.permissions?.some(p =>
          p.module === filterModule &&
          (p.can_view || p.can_create || p.can_edit || p.can_delete || p.can_publish || p.can_manage)
        )
      );
    }

    return result;
  }, [assistants, searchQuery, filterRole, filterStatus, filterModule]);

  // ===== دوال الإجراءات =====
  const handleQuickEdit = (assistant) => {
    setQuickEditAssistant(assistant);
    setQuickEditPermissions(assistant.permissions || []);
    setShowQuickEdit(true);
  };

  const handleQuickEditSave = async (assistantId, permissionsData) => {
    // حذف الصلاحيات القديمة
    await supabase
      .from('assistant_permissions')
      .delete()
      .eq('assistant_id', assistantId);

    // إدراج الصلاحيات الجديدة
    if (permissionsData.length > 0) {
      const { error } = await supabase
        .from('assistant_permissions')
        .insert(permissionsData);
      if (error) throw error;
    }

    toast.success('✅ تم تحديث الصلاحيات بنجاح');
    fetchData();
    setShowQuickEdit(false);
    setQuickEditAssistant(null);
  };

  const handleCopy = (source) => {
    setCopySource(source);
    setShowCopyModal(true);
  };

  const handleCopyConfirm = async (targetId) => {
    if (!copySource || !targetId) return;
    try {
      // نسخ الصلاحيات من المصدر إلى الهدف
      const sourcePerms = copySource.permissions || [];
      const permissionsData = sourcePerms.map(p => ({
        assistant_id: targetId,
        module: p.module,
        can_view: p.can_view,
        can_create: p.can_create,
        can_edit: p.can_edit,
        can_delete: p.can_delete,
        can_publish: p.can_publish,
        can_manage: p.can_manage,
      }));

      // حذف الصلاحيات القديمة للهدف
      await supabase
        .from('assistant_permissions')
        .delete()
        .eq('assistant_id', targetId);

      // إدراج الصلاحيات الجديدة
      if (permissionsData.length > 0) {
        const { error } = await supabase
          .from('assistant_permissions')
          .insert(permissionsData);
        if (error) throw error;
      }

      toast.success('✅ تم نسخ الصلاحيات بنجاح');
      fetchData();
      setShowCopyModal(false);
      setCopySource(null);
      setCopyTarget(null);
    } catch (err) {
      toast.error('فشل نسخ الصلاحيات');
    }
  };

  const handleReset = (assistant) => {
    setResetTarget(assistant);
    setShowResetModal(true);
  };

  const handleResetConfirm = async () => {
    if (!resetTarget) return;
    try {
      // حذف جميع الصلاحيات
      await supabase
        .from('assistant_permissions')
        .delete()
        .eq('assistant_id', resetTarget.id);

      toast.success('✅ تم إعادة تعيين صلاحيات المساعد');
      fetchData();
      setShowResetModal(false);
      setResetTarget(null);
    } catch (err) {
      toast.error('فشل إعادة تعيين الصلاحيات');
    }
  };

  // ===== خيارات الأدوار للفلترة =====
  const roleOptions = [
    { value: 'all', label: 'جميع الأدوار' },
    { value: 'chief', label: 'رئيس' },
    { value: 'expert', label: 'خبير' },
    { value: 'technical', label: 'تقني' },
    { value: 'supervisor', label: 'مشرف' },
    { value: 'coordinator', label: 'منسق' },
    { value: 'assistant', label: 'مساعد' },
    { value: 'intern', label: 'متدرب' },
  ];

  const moduleOptions = [
    { value: 'all', label: 'جميع الوحدات' },
    ...modules.map(m => ({ value: m.id, label: m.label })),
  ];

  // ===== بيانات الرسوم البيانية =====
  const chartData = useMemo(() => {
    const labels = Object.keys(stats.moduleStats).map(key => {
      const map = {
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
      return map[key] || key;
    });
    const data = Object.values(stats.moduleStats);

    return {
      labels,
      datasets: [{
        label: 'عدد المساعدين',
        data,
        backgroundColor: [
          'rgba(251, 191, 36, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(52, 211, 153, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(251, 146, 60, 0.7)',
          'rgba(236, 72, 153, 0.7)',
          'rgba(20, 184, 166, 0.7)',
          'rgba(99, 102, 241, 0.7)',
          'rgba(244, 63, 94, 0.7)',
        ],
        borderColor: [
          '#fbbf24', '#3b82f6', '#22c55e', '#a855f7', '#f97316',
          '#ec4899', '#14b8a6', '#6366f1', '#f43f5e',
        ],
        borderWidth: 2,
      }],
    };
  }, [stats.moduleStats]);

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

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي المساعدين', value: stats.total, suffix: '', icon: Icons.Users, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'نشط', value: stats.active, suffix: '', icon: Icons.UserCheck, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'إجمالي الصلاحيات', value: stats.totalPermissions, suffix: '', icon: Icons.Shield, color: 'from-purple-400 to-purple-600', delay: 0.2 },
    { id: 4, label: 'متوسط الصلاحيات', value: stats.avgPermissions, suffix: '', icon: Icons.BarChart, color: 'from-yellow-400 to-yellow-600', delay: 0.3 },
  ];

  return (
    <TeacherLayout>
      <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden`}>
        <div className="max-w-7xl mx-auto p-4 md:p-6">
          {/* ===== الهيدر ===== */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-yellow-300 via-orange-400 to-yellow-300 bg-clip-text text-transparent bg-[length:200%] animate-gradient">
                🔑 مركز الصلاحيات
              </h1>
              <p className={`${styles.subtext} text-sm mt-1 flex items-center gap-2 flex-wrap`}>
                إدارة صلاحيات جميع المساعدين في مكان واحد
                <span className="text-[10px] bg-yellow-400/10 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-400/20">
                  <Icons.Shield className="h-3 w-3 inline ml-1" /> تحكم كامل
                </span>
              </p>
            </div>
            <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
              <button
                onClick={fetchData}
                className={`p-2 rounded-xl transition ${styles.card} border ${styles.border}`}
                title="تحديث البيانات"
              >
                <Icons.RefreshCw className="h-5 w-5" />
              </button>
              <Link
                href="/dashboard/teacher/assistants/new"
                className="px-4 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Icons.Plus className="h-4 w-4" /> إضافة مساعد
              </Link>
            </div>
          </div>

          {/* ===== الإحصائيات ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {statsData.map((stat) => (
              <StatCard key={stat.id} stat={stat} styles={styles} />
            ))}
          </div>

          {/* ===== الرسم البياني ===== */}
          {Object.keys(stats.moduleStats).length > 0 && (
            <div className={`${styles.card} border ${styles.border} rounded-2xl p-5 mb-6`}>
              <h3 className={`text-sm font-bold ${styles.text} mb-4 text-center`}>توزيع الصلاحيات حسب الوحدة</h3>
              <div className="h-48 max-w-lg mx-auto">
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { display: false },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { color: theme === 'dark' ? '#ccc' : '#333' },
                        grid: { color: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
                      },
                      x: {
                        ticks: { color: theme === 'dark' ? '#ccc' : '#333', font: { size: 9 } },
                        grid: { display: false },
                      },
                    },
                  }}
                />
              </div>
            </div>
          )}

          {/* ===== الفلترة والبحث ===== */}
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
              {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
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

            <select
              value={filterModule}
              onChange={(e) => setFilterModule(e.target.value)}
              className={`p-2.5 ${styles.input} border ${styles.border} rounded-xl focus:ring-2 focus:ring-yellow-400/50 outline-none transition`}
            >
              {moduleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          {/* ===== جدول الصلاحيات ===== */}
          <div className={`${styles.card} border ${styles.border} rounded-2xl overflow-hidden`}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className={`border-b ${styles.border}`}>
                  <tr className={`text-xs ${styles.subtext}`}>
                    <th className="text-right py-3 px-3">المساعد</th>
                    <th className="text-right py-3 px-3">الدور</th>
                    <th className="text-center py-3 px-3">الحالة</th>
                    <th className="text-center py-3 px-3">الصلاحيات</th>
                    <th className="text-right py-3 px-3">الوحدات</th>
                    <th className="text-center py-3 px-3">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssistants.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="text-center py-12">
                        <Icons.Shield className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                        <p className={`${styles.subtext}`}>
                          {searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterModule !== 'all'
                            ? 'لا توجد نتائج تطابق معايير البحث'
                            : 'لا يوجد مساعدين لعرض صلاحياتهم'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredAssistants.map((assistant) => (
                      <AssistantPermissionRow
                        key={assistant.id}
                        assistant={assistant}
                        modules={modules}
                        onQuickEdit={handleQuickEdit}
                        onCopy={handleCopy}
                        onReset={handleReset}
                        styles={styles}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={`border-t ${styles.border} p-3 flex justify-between text-xs ${styles.subtext}`}>
              <span>إجمالي: {filteredAssistants.length} مساعد</span>
              <span>إجمالي الصلاحيات: {stats.totalPermissions}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== مودال تعديل سريع ===== */}
      <QuickEditModal
        isOpen={showQuickEdit}
        onClose={() => {
          setShowQuickEdit(false);
          setQuickEditAssistant(null);
        }}
        assistant={quickEditAssistant}
        permissions={quickEditPermissions}
        modules={modules}
        onSave={handleQuickEditSave}
        styles={styles}
      />

      {/* ===== مودال إعادة تعيين ===== */}
      <ConfirmModal
        isOpen={showResetModal}
        onClose={() => {
          setShowResetModal(false);
          setResetTarget(null);
        }}
        onConfirm={handleResetConfirm}
        title="إعادة تعيين الصلاحيات"
        message={`هل أنت متأكد من إعادة تعيين جميع صلاحيات "${resetTarget?.display_name || resetTarget?.full_name}"؟ سيتم حذف جميع الصلاحيات الحالية.`}
        styles={styles}
      />

      {/* ===== مودال نسخ الصلاحيات ===== */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4" style={{ display: showCopyModal ? 'flex' : 'none' }} onClick={() => setShowCopyModal(false)}>
        <div className={`${styles.card} border ${styles.border} rounded-3xl p-8 max-w-md w-full`} onClick={(e) => e.stopPropagation()}>
          <h3 className={`text-xl font-bold ${styles.text} mb-4`}>📋 نسخ الصلاحيات</h3>
          <p className={`${styles.subtext} text-sm mb-4`}>
            اختر المساعد المستهدف لنسخ صلاحيات "{copySource?.display_name || copySource?.full_name}" إليه.
          </p>
          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {assistants
              .filter(a => a.id !== copySource?.id)
              .map(a => (
                <button
                  key={a.id}
                  onClick={() => {
                    handleCopyConfirm(a.id);
                    setShowCopyModal(false);
                  }}
                  className={`w-full text-right px-3 py-2 ${styles.card} border ${styles.border} rounded-xl hover:${styles.hover} transition text-sm`}
                >
                  {a.display_name || a.full_name}
                  <span className={`text-xs ${styles.subtext} mr-2`}>({a.role})</span>
                </button>
              ))}
          </div>
          <button onClick={() => setShowCopyModal(false)} className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-white hover:bg-white/10 transition">إلغاء</button>
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