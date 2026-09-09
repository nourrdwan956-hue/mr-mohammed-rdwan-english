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
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Search,
  Trash2,
  RefreshCw,
  ArrowLeft,
  User,
  Eye,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import Link from 'next/link';

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
  const [students, setStudents] = useState([]); // ✅ الطلاب المسجلين
  const [devices, setDevices] = useState([]); // ✅ الأجهزة المسجلة
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyWithDevices, setShowOnlyWithDevices] = useState(false);
  const [updatingDeviceId, setUpdatingDeviceId] = useState(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState(null);
  const fetchedRef = useRef(false);

  // ===== جلب البيانات =====
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // 1. جلب معلومات الكورس
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('id, title, max_devices, subscription_duration_days')
        .eq('id', courseId)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // 2. جلب الطلاب المسجلين في الكورس مع بياناتهم
      const { data: enrollmentsData, error: enrollError } = await supabase
        .from('enrollments')
        .select(`
          student_id,
          progress,
          completed_at,
          profiles:student_id (id, full_name, email, avatar_url)
        `)
        .eq('course_id', courseId);

      if (enrollError) throw enrollError;

      const studentsList = (enrollmentsData || []).map((en) => ({
        id: en.student_id,
        full_name: en.profiles?.full_name || 'طالب غير معروف',
        email: en.profiles?.email || '',
        avatar_url: en.profiles?.avatar_url || null,
        progress: en.progress || 0,
        completed_at: en.completed_at,
      }));

      setStudents(studentsList);

      // 3. جلب الأجهزة المسجلة لهذا الكورس
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
          student_id
        `
        )
        .eq('course_id', courseId)
        .order('last_used_at', { ascending: false });

      if (devicesError) throw devicesError;
      setDevices(devicesData || []);

      // 4. دمج الأجهزة مع الطلاب
      // نضيف لكل طالب قائمة أجهزته
      const studentsWithDevices = studentsList.map((student) => {
        const studentDevices = (devicesData || []).filter(
          (d) => d.student_id === student.id
        );
        return {
          ...student,
          devices: studentDevices,
          deviceCount: studentDevices.length,
          activeDeviceCount: studentDevices.filter((d) => d.is_active).length,
        };
      });

      setFilteredStudents(studentsWithDevices);

      // تحديث الأجهزة الكلية للعرض
      setDevices(devicesData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    loadData();
  }, [loadData]);

  // ===== فلترة الطلاب =====
  useEffect(() => {
    let filtered = students.map((student) => ({
      ...student,
      devices: devices.filter((d) => d.student_id === student.id),
      deviceCount: devices.filter((d) => d.student_id === student.id).length,
      activeDeviceCount: devices.filter((d) => d.student_id === student.id && d.is_active).length,
    }));

    if (searchTerm.trim()) {
      const term = searchTerm.trim().toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.full_name.toLowerCase().includes(term) ||
          s.email.toLowerCase().includes(term)
      );
    }

    if (showOnlyWithDevices) {
      filtered = filtered.filter((s) => s.deviceCount > 0);
    }

    setFilteredStudents(filtered);
  }, [searchTerm, showOnlyWithDevices, students, devices]);

  // ===== تبديل حالة الجهاز =====
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

  // ===== حذف جهاز =====
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

  // ===== إعادة ضبط أجهزة طالب =====
  const resetStudentDevices = async (studentId) => {
    if (!confirm('هل أنت متأكد من حذف جميع أجهزة هذا الطالب في هذا الكورس؟')) return;

    try {
      const { error } = await supabase
        .from('course_devices')
        .delete()
        .eq('course_id', courseId)
        .eq('student_id', studentId);

      if (error) throw error;

      setDevices((prev) => prev.filter((d) => d.student_id !== studentId));
      toast.success('تم حذف جميع أجهزة الطالب بنجاح');
    } catch (error) {
      console.error('Error resetting student devices:', error);
      toast.error('حدث خطأ أثناء حذف الأجهزة');
    }
  };

  // ===== إحصائيات =====
  const stats = useMemo(() => {
    const totalStudents = students.length;
    const totalDevices = devices.length;
    const activeDevices = devices.filter((d) => d.is_active).length;
    const inactiveDevices = devices.filter((d) => !d.is_active).length;
    const studentsWithDevices = new Set(devices.map((d) => d.student_id)).size;

    return {
      totalStudents,
      totalDevices,
      activeDevices,
      inactiveDevices,
      studentsWithDevices,
    };
  }, [students, devices]);

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
              {stats.totalStudents} طالب
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              isDark ? 'bg-gray-800/50' : 'bg-white/50'
            } backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <Monitor className="w-4 h-4 text-amber-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
              {stats.totalDevices} جهاز
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              isDark ? 'bg-gray-800/50' : 'bg-white/50'
            } backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
              {stats.activeDevices} نشط
            </span>
          </div>
          <div
            className={`flex items-center gap-2 px-4 py-2 rounded-xl ${
              isDark ? 'bg-gray-800/50' : 'bg-white/50'
            } backdrop-blur-sm border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
          >
            <XCircle className="w-4 h-4 text-red-500" />
            <span className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-700'}`}>
              {stats.inactiveDevices} غير نشط
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
              placeholder="بحث باسم الطالب أو البريد الإلكتروني..."
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
              onClick={() => setShowOnlyWithDevices(!showOnlyWithDevices)}
              className={`px-4 py-2.5 rounded-xl border transition ${
                showOnlyWithDevices
                  ? 'bg-amber-500 text-white border-amber-500'
                  : isDark
                  ? 'bg-gray-800/50 border-gray-700 text-gray-300 hover:bg-gray-700/50'
                  : 'bg-white/50 border-gray-200 text-gray-600 hover:bg-gray-100/50'
              }`}
            >
              لديهم أجهزة فقط
            </button>
            {(showOnlyWithDevices || searchTerm) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setShowOnlyWithDevices(false);
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

      {/* ===== قائمة الطلاب مع أجهزتهم ===== */}
      {filteredStudents.length === 0 ? (
        <WaveBorderCard isDark={isDark} className="p-8 text-center">
          <AlertCircle
            className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}
          />
          <h3 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
            لا يوجد طلاب مسجلين في هذا الكورس
          </h3>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            حتى الآن لم يقم أي طالب بالتسجيل في هذا الكورس.
          </p>
          <Link
            href={`/dashboard/teacher/courses/${courseId}`}
            className="mt-4 inline-block px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition"
          >
            العودة إلى الكورس
          </Link>
        </WaveBorderCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <AnimatePresence>
            {filteredStudents.map((student, index) => (
              <motion.div
                key={student.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <WaveBorderCard isDark={isDark} className="p-4 hover:shadow-2xl transition-shadow">
                  <div className="flex flex-col gap-3">
                    {/* رأس البطاقة: اسم الطالب + إحصائيات أجهزته */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2.5 rounded-xl ${
                            isDark ? 'bg-gray-800/50' : 'bg-white/50'
                          } border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                        >
                          {student.avatar_url ? (
                            <img
                              src={student.avatar_url}
                              alt={student.full_name}
                              className="w-8 h-8 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <h3 className={`font-semibold ${isDark ? 'text-white' : 'text-gray-800'}`}>
                            {student.full_name}
                          </h3>
                          {student.email && (
                            <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                              {student.email}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                              {student.deviceCount} جهاز
                            </span>
                            <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full">
                              {student.activeDeviceCount} نشط
                            </span>
                            {student.progress > 0 && (
                              <span className="text-xs bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-2 py-0.5 rounded-full">
                                تقدم {student.progress}%
                              </span>
                            )}
                            {student.completed_at && (
                              <span className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                                ✅ مكتمل
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/teacher/students/${student.id}`}
                        className={`p-1.5 rounded-lg transition ${
                          isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-100/50'
                        }`}
                        title="عرض الطالب"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                    </div>

                    {/* أجهزة الطالب (إن وجدت) */}
                    {student.devices.length > 0 ? (
                      <div className="space-y-2">
                        {student.devices.map((device) => (
                          <div
                            key={device.id}
                            className={`flex items-center justify-between p-2 rounded-lg ${
                              isDark ? 'bg-gray-800/30' : 'bg-gray-50'
                            } border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <DeviceIcon deviceInfo={device.device_info} />
                              <div className="min-w-0">
                                <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'} truncate`}>
                                  {device.device_name || 'جهاز غير مسمى'}
                                </p>
                                <p className="text-xs text-gray-400 truncate">
                                  {device.device_fingerprint?.slice(0, 12)}...
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <StatusBadge active={device.is_active} />
                              <button
                                onClick={() => toggleDeviceStatus(device.id, device.is_active)}
                                disabled={updatingDeviceId === device.id}
                                className={`px-2 py-1 rounded text-xs font-medium transition ${
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
                                  <span className="inline-block w-3 h-3 border-2 border-t-transparent rounded-full animate-spin" />
                                ) : device.is_active ? (
                                  'تعطيل'
                                ) : (
                                  'تفعيل'
                                )}
                              </button>
                              <button
                                onClick={() => deleteDevice(device.id)}
                                disabled={deletingDeviceId === device.id}
                                className={`p-1 rounded transition ${
                                  isDark
                                    ? 'hover:bg-red-500/20 text-red-400'
                                    : 'hover:bg-red-100 text-red-600'
                                }`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'} text-center py-2`}>
                        لم يسجل هذا الطالب أي جهاز بعد.
                      </p>
                    )}

                    {/* زر إعادة ضبط جميع أجهزة الطالب */}
                    {student.devices.length > 0 && (
                      <div className="flex justify-end">
                        <button
                          onClick={() => resetStudentDevices(student.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                            isDark
                              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                              : 'bg-amber-50 text-amber-600 hover:bg-amber-100'
                          }`}
                        >
                          إعادة ضبط جميع أجهزة هذا الطالب
                        </button>
                      </div>
                    )}
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