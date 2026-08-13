// app/dashboard/teacher/courses/[id]/devices/page.js
'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@/lib/hooks/useTheme';
import { toast } from 'react-hot-toast';
import { supabase } from '@/lib/supabaseClient';
import {
  Monitor,
  Smartphone,
  Laptop,
  Tablet,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  Users,
  Search,
  Filter,
  ChevronDown,
  Trash2,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// ================================================================
// 1. مكونات مساعدة
// ================================================================

const WaveBorderCard = ({ children, className, isDark }) => (
  <div
    className={`relative overflow-hidden rounded-2xl border ${
      isDark ? 'border-gray-700/50 bg-gray-800/30' : 'border-gray-200/50 bg-white/30'
    } backdrop-blur-xl shadow-xl ${className}`}
  >
    <div className="absolute inset-0 bg-gradient-to-br from-transparent via-amber-500/5 to-amber-600/5" />
    <div className="relative z-10 p-4 sm:p-6">{children}</div>
  </div>
);

const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
      active
        ? 'bg-green-500/20 text-green-700 dark:text-green-400'
        : 'bg-gray-500/20 text-gray-600 dark:text-gray-400'
    }`}
  >
    {active ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    {active ? 'نشط' : 'غير نشط'}
  </span>
);

const DeviceIcon = ({ deviceInfo }) => {
  if (!deviceInfo) return <Monitor className="w-5 h-5" />;
  const type = deviceInfo.deviceType || deviceInfo.type || '';
  if (type.includes('mobile') || type.includes('phone')) return <Smartphone className="w-5 h-5" />;
  if (type.includes('tablet')) return <Tablet className="w-5 h-5" />;
  if (type.includes('laptop') || type.includes('desktop')) return <Laptop className="w-5 h-5" />;
  return <Monitor className="w-5 h-5" />;
};

// ================================================================
// 2. الصفحة الرئيسية
// ================================================================

export default function TeacherCourseDevicesPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id;
  const { theme, isDark } = useTheme();

  const [loading, setLoading] = useState(true);
  const [course, setCourse] = useState(null);
  const [devices, setDevices] = useState([]);
  const [filteredDevices, setFilteredDevices] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyActive, setShowOnlyActive] = useState(false);
  const [showOnlyBlocked, setShowOnlyBlocked] = useState(false);
  const [updatingDeviceId, setUpdatingDeviceId] = useState(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState(null);
  const fetchedRef = useRef(false);

  // ===== جلب البيانات =====
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // جلب معلومات الكورس
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, max_devices, subscription_duration_days')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // جلب الأجهزة مع بيانات الطلاب
      const { data: devicesData, error: devicesError } = await supabase
        .from('course_devices')
        .select(
          `
          id,
          device_fingerprint,
          device_name,
          device_info,
          is_active,
          is_primary,
          first_used_at,
          last_used_at,
          student:student_id (id, full_name, email, avatar_url)
        `
        )
        .eq('course_id', courseId)
        .order('last_used_at', { ascending: false });

      if (devicesError) throw devicesError;

      // معالجة البيانات
      const devicesList = (devicesData || []).map((item) => ({
        ...item,
        student: item.student || { id: null, full_name: 'غير معروف', email: '', avatar_url: null },
      }));

      setDevices(devicesList);
      setFilteredDevices(devicesList);
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('حدث خطأ أثناء تحميل الأجهزة');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadData();
  }, [loadData]);

  // ===== فلترة الأجهزة =====
  useEffect(() => {
    let filtered = devices;

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.student?.full_name?.toLowerCase().includes(term) ||
          d.device_name?.toLowerCase().includes(term) ||
          d.device_fingerprint?.toLowerCase().includes(term)
      );
    }

    if (showOnlyActive) {
      filtered = filtered.filter((d) => d.is_active === true);
    }

    if (showOnlyBlocked) {
      filtered = filtered.filter((d) => d.is_active === false);
    }

    setFilteredDevices(filtered);
  }, [searchTerm, showOnlyActive, showOnlyBlocked, devices]);

  // ===== تبديل حالة الجهاز (تفعيل/تعطيل) =====
  const toggleDeviceStatus = async (deviceId, currentStatus) => {
    try {
      setUpdatingDeviceId(deviceId);
      const newStatus = !currentStatus;

      const { error } = await supabase
        .from('course_devices')
        .update({ is_active: newStatus })
        .eq('id', deviceId);

      if (error) throw error;

      setDevices((prev) =>
        prev.map((d) => (d.id === deviceId ? { ...d, is_active: newStatus } : d))
      );

      toast.success(`تم ${newStatus ? 'تفعيل' : 'تعطيل'} الجهاز بنجاح`);
    } catch (error) {
      console.error('Error toggling device status:', error);
      toast.error('حدث خطأ أثناء تحديث حالة الجهاز');
    } finally {
      setUpdatingDeviceId(null);
    }
  };

  // ===== ✅ حذف جهاز (نهائياً) =====
  const deleteDevice = async (deviceId) => {
    if (!confirm('هل أنت متأكد من حذف هذا الجهاز نهائياً؟')) return;

    try {
      setDeletingDeviceId(deviceId);
      const { error } = await supabase.from('course_devices').delete().eq('id', deviceId);

      if (error) throw error;

      setDevices((prev) => prev.filter((d) => d.id !== deviceId));
      toast.success('تم حذف الجهاز بنجاح');
    } catch (error) {
      console.error('Error deleting device:', error);
      toast.error('حدث خطأ أثناء حذف الجهاز');
    } finally {
      setDeletingDeviceId(null);
    }
  };

  // ===== إعادة ضبط أجهزة طالب معين (حذف جميع أجهزته في هذا الكورس) =====
  const resetStudentDevices = async (studentId) => {
    if (!confirm('هل أنت متأكد من حذف جميع أجهزة هذا الطالب في هذا الكورس؟')) return;

    try {
      const { error } = await supabase
        .from('course_devices')
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', studentId);

      if (error) throw error;

      setDevices((prev) => prev.filter((d) => d.student?.id !== studentId));
      toast.success('تم حذف جميع أجهزة الطالب بنجاح');
    } catch (error) {
      console.error('Error resetting student devices:', error);
      toast.error('حدث خطأ أثناء حذف الأجهزة');
    }
  };

  // ===== إحصائيات الأجهزة =====
  const stats = useMemo(() => {
    const total = devices.length;
    const active = devices.filter((d) => d.is_active).length;
    const inactive = devices.filter((d) => !d.is_active).length;
    const students = new Set(devices.map((d) => d.student?.id).filter(Boolean)).size;
    return { total, active, inactive, students };
  }, [devices]);

  // ===== العودة =====
  const goBack = () => {
    router.push(`/dashboard/teacher/courses/${courseId}`);
  };

  // ===== عرض التحميل =====
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  // ===== العرض الرئيسي =====
  return (
    <div className="min-h-screen p-4 sm:p-6 space-y-6">
      {/* شريط العنوان + العودة */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={goBack}
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/50'
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-800'}`}>
              أجهزة الطلاب
            </h1>
            {course && (
              <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {course.title} • الحد الأقصى للأجهزة: {course.max_devices ?? 2} جهاز لكل طالب
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              isDark ? 'bg-gray-800/50' : 'bg-white/50'
            } backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <Users className="w-4 h-4 text-amber-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
              {stats.students} طالب
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              isDark ? 'bg-gray-800/50' : 'bg-white/50'
            } backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <Monitor className="w-4 h-4 text-amber-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
              {stats.total} جهاز
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              isDark ? 'bg-gray-800/50' : 'bg-white/50'
            } backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
              {stats.active} نشط
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              isDark ? 'bg-gray-800/50' : 'bg-white/50'
            } backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <XCircle className="w-4 h-4 text-red-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
              {stats.inactive} غير نشط
            </span>
          </div>
          <button
            onClick={loadData}
            className={`p-2 rounded-xl transition ${
              isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/50'
            }`}
            title="تحديث"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* أدوات البحث والفلترة */}
      <WaveBorderCard isDark={isDark} className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search
              className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${
                isDark ? 'text-gray-400' : 'text-gray-500'
              }`}
            />
            <input
              type="text"
              placeholder="بحث باسم الطالب، الجهاز، أو البصمة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2.5 rounded-xl border ${
                isDark
                  ? 'bg-gray-800/50 border-gray-700 text-white placeholder-gray-400'
                  : 'bg-white/50 border-gray-200 text-gray-800 placeholder-gray-500'
              } focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition`}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowOnlyActive(!showOnlyActive)}
              className={`px-4 py-2.5 rounded-xl border transition ${
                showOnlyActive
                  ? 'bg-amber-500 text-white border-amber-500'
                  : isDark
                  ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                  : 'bg-white/50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
              }`}
            >
              نشط فقط
            </button>
            <button
              onClick={() => setShowOnlyBlocked(!showOnlyBlocked)}
              className={`px-4 py-2.5 rounded-xl border transition ${
                showOnlyBlocked
                  ? 'bg-red-500 text-white border-red-500'
                  : isDark
                  ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                  : 'bg-white/50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
              }`}
            >
              غير نشط فقط
            </button>
            {(showOnlyActive || showOnlyBlocked || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowOnlyActive(false);
                  setShowOnlyBlocked(false);
                }}
                className={`px-4 py-2.5 rounded-xl border ${
                  isDark
                    ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                    : 'bg-white/50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
                }`}
              >
                إعادة ضبط
              </button>
            )}
          </div>
        </div>
      </WaveBorderCard>

      {/* قائمة الأجهزة */}
      {filteredDevices.length === 0 ? (
        <WaveBorderCard isDark={isDark} className="p-8 text-center">
          <AlertCircle
            className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            لا توجد أجهزة مسجلة
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            لم يقم أي طالب بتسجيل جهاز لهذا الكورس بعد.
          </p>
        </WaveBorderCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredDevices.map((device, index) => (
              <motion.div
                key={device.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <WaveBorderCard isDark={isDark} className="p-4 hover:shadow-2xl transition-shadow">
                  <div className="flex flex-col gap-3">
                    {/* رأس البطاقة: اسم الطالب + حالة الجهاز */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isDark ? 'bg-gray-800/50' : 'bg-white/50'
                          } border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                        >
                          <DeviceIcon deviceInfo={device.device_info} />
                        </div>
                        <div>
                          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {device.student?.full_name || 'طالب غير معروف'}
                          </h3>
                          {device.student?.email && (
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {device.student.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <StatusBadge active={device.is_active} />
                    </div>

                    {/* تفاصيل الجهاز */}
                    <div className={`grid grid-cols-2 gap-2 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                      <div>
                        <span className="font-medium">اسم الجهاز:</span>
                        <span className="mr-1">{device.device_name || 'غير مسمى'}</span>
                      </div>
                      <div>
                        <span className="font-medium">البصمة:</span>
                        <span className="mr-1 font-mono text-xs truncate" title={device.device_fingerprint}>
                          {device.device_fingerprint?.slice(0, 12)}...
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">أول استخدام:</span>
                        <span className="mr-1" dir="ltr">
                          {format(new Date(device.first_used_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">آخر استخدام:</span>
                        <span className="mr-1" dir="ltr">
                          {format(new Date(device.last_used_at), 'dd/MM/yyyy HH:mm', { locale: ar })}
                        </span>
                      </div>
                      {device.is_primary && (
                        <div className="col-span-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 dark:text-amber-400 text-xs">
                            <CheckCircle className="w-3 h-3" /> الجهاز الأساسي
                          </span>
                        </div>
                      )}
                    </div>

                    {/* أزرار الإجراءات */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-200/20 flex-wrap">
                      <button
                        onClick={() => toggleDeviceStatus(device.id, device.is_active)}
                        disabled={updatingDeviceId === device.id}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          device.is_active
                            ? isDark
                              ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                              : 'bg-red-50 text-red-600 hover:bg-red-100'
                            : isDark
                            ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                            : 'bg-green-50 text-green-600 hover:bg-green-100'
                        }`}
                      >
                        {updatingDeviceId === device.id ? (
                          <span className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                        ) : device.is_active ? (
                          'تعطيل'
                        ) : (
                          'تفعيل'
                        )}
                      </button>

                      {/* ✅ زر حذف الجهاز */}
                      <button
                        onClick={() => deleteDevice(device.id)}
                        disabled={deletingDeviceId === device.id}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center gap-1 ${
                          isDark
                            ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                      >
                        {deletingDeviceId === device.id ? (
                          <span className="inline-block w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            حذف
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => resetStudentDevices(device.student?.id)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                          isDark
                            ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                            : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                        }`}
                      >
                        إعادة ضبط الكل
                      </button>
                    </div>
                  </div>
                </WaveBorderCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}