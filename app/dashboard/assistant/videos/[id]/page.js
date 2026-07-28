// app/dashboard/assistant/videos/[id]/page.js
'use client';

// ================================================================
// 🎬 تفاصيل الفيديو – إصدار متطور جداً V4
// ================================================================
// الميزات:
// - عرض جميع تفاصيل الفيديو (العنوان، الوصف، الكورس، المدة، المشاهدات، الوسوم، المرحلة، الصف، الحالة، وضع العرض، الرابط)
// - مشغل فيديو مدمج (يدعم YouTube و Self-Hosted)
// - إحصائيات سريعة (المشاهدات، المدة، تاريخ الإنشاء)
// - أزرار ديناميكية حسب الصلاحيات (تعديل، نشر/إلغاء النشر، تبديل وضع العرض، حذف)
// - مودال تأكيد الحذف
// - دعم كامل للوضعين الفاتح والداكن مع وضوح تام للخطوط
// - Glassmorphism فاخر وأنيميشن سلس
// - منع التحميل اللانهائي
// ================================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { useTheme } from '@/lib/hooks/useTheme';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import ReactPlayer from 'react-player';

// ================================================================
// 1. عداد متحرك
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

    if (ref.current) {
      observer.observe(ref.current);
    }

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
// 2. بطاقة إحصائية صغيرة
// ================================================================
const StatCard = ({ stat, styles }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -4, scale: 1.02 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative ${styles.card} border ${styles.border} rounded-2xl p-4 ${styles.hover} transition-all duration-300 hover:shadow-2xl ${styles.shadow} overflow-hidden group`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-center gap-4">
        <div className={`p-2.5 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
          <stat.icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className={`text-xs ${styles.subtext} opacity-70`}>{stat.label}</p>
          <p className={`text-xl font-extrabold ${styles.text}`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 3. مودال تأكيد الحذف
// ================================================================
const DeleteModal = ({ isOpen, onClose, onConfirm, title }) => {
  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        className="bg-[#1a1f2e] dark:bg-[#1a1f2e] border border-white/10 rounded-3xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mb-4">
            <Icons.AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">تأكيد الحذف</h3>
          <p className="text-gray-400 text-sm mb-6">
            هل أنت متأكد من حذف "{title}"؟ هذا الإجراء لا يمكن التراجع عنه.
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
// 4. الصفحة الرئيسية
// ================================================================
export default function AssistantVideoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const videoId = params.id;
  const { theme, toggleTheme, styles } = useTheme();

  // ===== حالات البيانات =====
  const [loading, setLoading] = useState(true);
  const [dataReady, setDataReady] = useState(false);
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [video, setVideo] = useState(null);
  const [course, setCourse] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // ===== التحقق من الصلاحيات =====
  const hasPermission = useCallback((module, permission) => {
    if (!permissions || permissions.length === 0) return false;
    const perm = permissions.find(p => p.module === module);
    return perm?.[permission] || perm?.can_manage || false;
  }, [permissions]);

  const canEdit = useCallback(() => {
    return hasPermission('videos', 'can_edit');
  }, [hasPermission]);

  const canDelete = useCallback(() => {
    return hasPermission('videos', 'can_delete');
  }, [hasPermission]);

  const canPublish = useCallback(() => {
    return hasPermission('videos', 'can_publish');
  }, [hasPermission]);

  const canManageDisplay = useCallback(() => {
    return hasPermission('videos', 'can_edit');
  }, [hasPermission]);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setDataReady(false);

      // 1. جلب بيانات المساعد
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        router.replace('/assistant-login');
        return;
      }

      const parsed = JSON.parse(sessionData);
      setAssistant(parsed);

      // 2. جلب الصلاحيات
      const { data: permsData, error: permsError } = await supabase
        .from('assistant_permissions')
        .select('*')
        .eq('assistant_id', parsed.id);

      if (permsError) throw permsError;
      setPermissions(permsData || []);

      // 3. التحقق من صلاحية العرض
      const hasView = permsData?.some(p => p.module === 'videos' && (p.can_view || p.can_manage));
      if (!hasView) {
        toast.error('غير مصرح لك بمشاهدة تفاصيل الفيديو');
        router.push('/dashboard/assistant');
        return;
      }

      const teacherId = parsed.teacher_id;
      if (!teacherId) {
        toast.error('لا يوجد معلم مرتبط بهذا المساعد');
        router.push('/dashboard/assistant');
        return;
      }

      // 4. جلب بيانات الفيديو
      const { data: videoData, error: videoError } = await supabase
        .from('videos')
        .select('*')
        .eq('id', videoId)
        .eq('teacher_id', teacherId)
        .single();

      if (videoError) {
        if (videoError.code === 'PGRST116') {
          toast.error('الفيديو غير موجود');
          router.push('/dashboard/assistant/videos');
          return;
        }
        throw videoError;
      }

      setVideo(videoData);

      // 5. جلب اسم الكورس
      if (videoData.course_id) {
        const { data: courseData } = await supabase
          .from('courses')
          .select('id, title')
          .eq('id', videoData.course_id)
          .single();

        setCourse(courseData);
      }

      setDataReady(true);
    } catch (err) {
      console.error('❌ خطأ في جلب تفاصيل الفيديو:', err);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [videoId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ===== العمليات =====
  const handleTogglePublish = async () => {
    if (!canPublish()) {
      toast.error('ليس لديك صلاحية لتغيير حالة النشر');
      return;
    }

    try {
      const newStatus = !video.is_published;
      const { error } = await supabase
        .from('videos')
        .update({
          is_published: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId);

      if (error) throw error;

      setVideo(prev => ({ ...prev, is_published: newStatus }));
      toast.success(`✅ تم ${newStatus ? 'نشر' : 'إلغاء نشر'} الفيديو`);
    } catch (err) {
      console.error('❌ خطأ في تغيير حالة النشر:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleToggleDisplayMode = async () => {
    if (!canManageDisplay()) {
      toast.error('ليس لديك صلاحية لتغيير وضع العرض');
      return;
    }

    const newMode = video.display_mode === 'protected' ? 'normal' : 'protected';

    try {
      const { error } = await supabase
        .from('videos')
        .update({
          display_mode: newMode,
          updated_at: new Date().toISOString(),
        })
        .eq('id', videoId);

      if (error) throw error;

      setVideo(prev => ({ ...prev, display_mode: newMode }));
      toast.success(`✅ تم تغيير وضع العرض إلى ${newMode === 'protected' ? 'محمي' : 'عادي'}`);
    } catch (err) {
      console.error('❌ خطأ في تغيير وضع العرض:', err);
      toast.error('فشل تغيير وضع العرض');
    }
  };

  const handleDelete = async () => {
    if (!canDelete()) {
      toast.error('ليس لديك صلاحية لحذف الفيديوهات');
      return;
    }

    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', videoId);

      if (error) throw error;

      toast.success('✅ تم حذف الفيديو');
      setShowDeleteModal(false);
      router.push('/dashboard/assistant/videos');
    } catch (err) {
      console.error('❌ خطأ في حذف الفيديو:', err);
      toast.error('فشل حذف الفيديو');
    }
  };

  // ===== تنسيق التاريخ =====
  const formatDate = (date) => {
    if (!date) return 'غير محدد';
    return new Date(date).toLocaleDateString('ar-EG', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // ===== تنسيق المدة =====
  const formatDuration = (seconds) => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ===== الحصول على رابط الفيديو =====
  const getVideoUrl = () => {
    if (!video) return '';
    if (video.storage_type === 'youtube') {
      return video.video_url;
    }
    return video.video_url;
  };

  // ===== حالة التحميل =====
  if (loading || !dataReady) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-purple-400/20 border-t-purple-400 rounded-full animate-spin" style={{ animationDuration: '0.8s' }} />
            </div>
          </div>
          <p className={`text-sm ${styles.subtext} animate-pulse`}>
            جاري تحميل تفاصيل الفيديو...
          </p>
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className={`min-h-screen ${styles.bg} flex items-center justify-center`}>
        <div className="text-center">
          <Icons.Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
          <h2 className={`text-xl font-bold ${styles.text}`}>الفيديو غير موجود</h2>
          <Link
            href="/dashboard/assistant/videos"
            className="mt-4 inline-block px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-xl transition"
          >
            العودة للقائمة
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${styles.bg} ${styles.text} relative overflow-x-hidden`}>
      <div className="max-w-4xl mx-auto">
        {/* ===== الهيدر ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-2">
              <Icons.Video className="h-8 w-8 text-purple-400" />
              <div>
                <h1 className={`text-3xl font-extrabold ${styles.text}`}>🎬 تفاصيل الفيديو</h1>
                <p className={`text-sm ${styles.subtext} mt-1`}>
                  {video.title}
                  {assistant && (
                    <span className="mr-2 text-[10px] bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-400/20">
                      {assistant.display_name || assistant.full_name}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            <Link
              href="/dashboard/assistant/videos"
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition flex items-center gap-1"
            >
              <Icons.ArrowRight className="h-4 w-4" /> العودة
            </Link>
            {canEdit() && (
              <Link
                href={`/dashboard/assistant/videos/${videoId}/edit`}
                className="px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-xl text-sm transition flex items-center gap-1"
              >
                <Icons.Edit className="h-4 w-4" /> تعديل
              </Link>
            )}
            {canDelete() && (
              <button
                onClick={() => setShowDeleteModal(true)}
                className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm transition flex items-center gap-1"
              >
                <Icons.Trash2 className="h-4 w-4" /> حذف
              </button>
            )}
          </div>
        </div>

        {/* ===== مشغل الفيديو ===== */}
        <div className={`${styles.card} border ${styles.border} rounded-2xl p-4 mb-6 overflow-hidden`}>
          <div className="aspect-video rounded-xl overflow-hidden bg-black/50">
            {getVideoUrl() ? (
              <ReactPlayer
                url={getVideoUrl()}
                width="100%"
                height="100%"
                controls
                playing={false}
                config={{
                  youtube: {
                    playerVars: {
                      modestbranding: 1,
                      rel: 0,
                      showinfo: 0,
                      controls: 1,
                    },
                  },
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center">
                  <Icons.Video className="h-16 w-16 text-gray-600 mx-auto mb-3" />
                  <p className={`text-sm ${styles.subtext}`}>لا يوجد رابط فيديو</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ===== إحصائيات سريعة ===== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { id: 'views', label: 'المشاهدات', value: video.views || 0, icon: Icons.Eye, color: 'from-blue-400 to-blue-600', delay: 0 },
            { id: 'duration', label: 'المدة', value: formatDuration(video.duration), icon: Icons.Clock, color: 'from-purple-400 to-purple-600', delay: 0.1, suffix: '' },
            { id: 'created', label: 'تاريخ الإنشاء', value: formatDate(video.created_at), icon: Icons.Calendar, color: 'from-green-400 to-green-600', delay: 0.2 },
            { id: 'status', label: 'الحالة', value: video.is_published ? 'منشور' : 'مسودة', icon: Icons.CheckCircle, color: video.is_published ? 'from-green-400 to-green-600' : 'from-gray-400 to-gray-600', delay: 0.3 },
          ].map((stat, index) => (
            <StatCard key={stat.id} stat={{ ...stat, delay: index * 0.1, suffix: stat.suffix || '' }} styles={styles} />
          ))}
        </div>

        {/* ===== معلومات الفيديو ===== */}
        <div className={`${styles.card} border ${styles.border} rounded-2xl p-6`}>
          <h2 className={`text-lg font-bold ${styles.text} mb-4 flex items-center gap-2`}>
            <Icons.Info className="h-5 w-5 text-purple-400" />
            معلومات الفيديو
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <p className={`text-xs ${styles.subtext} opacity-60`}>العنوان</p>
              <p className={`text-base font-semibold ${styles.text}`}>{video.title}</p>
            </div>

            <div className="md:col-span-2">
              <p className={`text-xs ${styles.subtext} opacity-60`}>الوصف</p>
              <p className={`text-sm ${styles.subtext} mt-1 leading-relaxed`}>
                {video.description || 'لا يوجد وصف'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>الكورس</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {course?.title || 'بدون كورس'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>المرحلة</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {video.grade_stage || 'غير محدد'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>الصف</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {video.grade_level ? `الصف ${video.grade_level}` : 'غير محدد'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>نوع التخزين</p>
              <p className={`text-base font-semibold ${styles.text}`}>
                {video.storage_type === 'youtube' ? '▶️ يوتيوب' : '📁 خادم ذاتي'}
              </p>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>وضع العرض</p>
              <span className={`inline-block text-xs px-3 py-1 rounded-full border ${
                video.display_mode === 'protected'
                  ? 'bg-orange-500/20 text-orange-400 border-orange-400/30'
                  : 'bg-cyan-500/20 text-cyan-400 border-cyan-400/30'
              }`}>
                {video.display_mode === 'protected' ? '🛡️ محمي' : '👁️ عادي'}
              </span>
            </div>

            <div>
              <p className={`text-xs ${styles.subtext} opacity-60`}>رابط الفيديو</p>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-mono ${styles.subtext} truncate flex-1`}>
                  {video.video_url || 'لا يوجد رابط'}
                </p>
                {video.video_url && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(video.video_url);
                      toast.success('✅ تم نسخ الرابط');
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/5 text-gray-400 hover:text-purple-400 transition"
                    title="نسخ الرابط"
                  >
                    <Icons.Copy className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {video.tags && video.tags.length > 0 && (
              <div className="md:col-span-2">
                <p className={`text-xs ${styles.subtext} opacity-60`}>الوسوم</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {video.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="text-xs px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-400/20"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {video.is_scheduled && video.scheduled_date && (
              <div>
                <p className={`text-xs ${styles.subtext} opacity-60`}>موعد النشر المجدول</p>
                <p className={`text-base font-semibold ${styles.text}`}>
                  {formatDate(video.scheduled_date)}
                </p>
              </div>
            )}
          </div>

          {/* أزرار الإجراءات السريعة */}
          <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-white/5">
            {canPublish() && (
              <button
                onClick={handleTogglePublish}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1 ${
                  video.is_published
                    ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                    : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                }`}
              >
                {video.is_published ? (
                  <Icons.EyeOff className="h-4 w-4" />
                ) : (
                  <Icons.Eye className="h-4 w-4" />
                )}
                {video.is_published ? 'إلغاء النشر' : 'نشر الفيديو'}
              </button>
            )}

            {canManageDisplay() && (
              <button
                onClick={handleToggleDisplayMode}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-1 ${
                  video.display_mode === 'protected'
                    ? 'bg-orange-500/20 text-orange-400 hover:bg-orange-500/30'
                    : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                }`}
              >
                <Icons.Shield className="h-4 w-4" />
                {video.display_mode === 'protected' ? 'إلغاء الحماية' : 'تفعيل الحماية'}
              </button>
            )}
          </div>
        </div>

        {/* ===== تذييل ===== */}
        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className={`text-[10px] ${styles.subtext} opacity-60`}>
            © 2026 منصة محمد رضوان • جميع الحقوق محفوظة
          </p>
        </div>
      </div>

      {/* ===== مودال تأكيد الحذف ===== */}
      <DeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
        title={video?.title}
      />
    </div>
  );
}