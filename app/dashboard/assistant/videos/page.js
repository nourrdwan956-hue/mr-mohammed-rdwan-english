// ================================================================
// 📁 app/dashboard/assistant/videos/page.js
// 🎯 إدارة الفيديوهات للمساعد – النسخة المتطورة V1
// ================================================================
// - مستوحاة من نسخة المعلم مع تحسينات خاصة بالمساعد
// - دعم كامل للصلاحيات (can_view, can_create, can_edit, can_delete, can_publish)
// - دعم الثيم الفاتح/الداكن عبر useTheme
// - استخدام APIs خاصة بالمساعد
// - دعم تبديل وضع العرض (داخل المنصة / YouTube)
// ================================================================

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Video,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  MoreHorizontal,
  Book,
  Calendar,
  Tag,
  Shield,
  Globe,
  Lock,
  Play,
  CheckCircle,
  X,
  AlertCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  Link as LinkIcon,
  Home,
  FileText,
  BookOpen,
  Database,
  Users,
  Share2,
  Sun,
  Moon,
  Filter,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '@/app/theme/ThemeProvider';
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
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ================================================================
// 🔧 دوال مساعدة
// ================================================================

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const hasPermission = (permissions, module, permission) => {
  if (!permissions || permissions.length === 0) return false;
  const perm = permissions.find(p => p.module === module);
  if (!perm) return false;
  if (perm.can_manage) return true;
  return perm[permission] === true;
};

const getYoutubeId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
  return match ? match[1] : null;
};

// ================================================================
// 🧮 عداد متحرك
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

  return (
    <span ref={ref} className="font-extrabold tracking-tight">
      {count}{suffix}
    </span>
  );
};

// ================================================================
// 📊 بطاقة إحصائية
// ================================================================

const StatCard = ({ stat, isDark }) => {
  const [hover, setHover] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay || 0 }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`relative rounded-2xl p-5 transition-all duration-300 overflow-hidden group ${
        isDark
          ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
          : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
      }`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
            {stat.label}
          </p>
          <p className={`text-2xl md:text-3xl font-extrabold mt-1 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20 flex-shrink-0`}>
          <stat.icon className="h-5 w-5 text-white" />
        </div>
      </div>
      <div className="mt-3 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <motion.div
          className={`h-full bg-gradient-to-r ${stat.color} rounded-full`}
          initial={{ width: 0 }}
          animate={{ width: hover ? '100%' : `${Math.min((stat.value / (stat.max || 100)) * 100, 100)}%` }}
          transition={{ duration: 0.6 }}
        />
      </div>
    </motion.div>
  );
};

// ================================================================
// 📇 بطاقة الفيديو
// ================================================================

const VideoCard = ({
  video,
  courseTitle,
  onEdit,
  onDelete,
  onPlay,
  onTogglePublish,
  onToggleDisplayMode,
  isSelected,
  onSelect,
  isDark,
  permissions,
}) => {
  const [showActions, setShowActions] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const canEdit = hasPermission(permissions, 'videos', 'can_edit');
  const canDelete = hasPermission(permissions, 'videos', 'can_delete');
  const canPublish = hasPermission(permissions, 'videos', 'can_publish');
  const canView = hasPermission(permissions, 'videos', 'can_view');

  if (!canView) return null;

  const youtubeId = getYoutubeId(video.video_url) || video.telegram_file_id;
  const thumbnail = youtubeId ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg` : null;
  const displayMode = video.display_mode || 'platform';
  const isPlatform = displayMode === 'platform';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative rounded-2xl overflow-hidden transition-all duration-500 ${
        isDark
          ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
          : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
      } ${isSelected ? 'border-yellow-400/70 bg-yellow-400/5' : ''} hover:shadow-2xl hover:shadow-yellow-400/10`}
    >
      <div className={`absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-purple-500/5 to-transparent rounded-2xl transition-opacity duration-500 ${isHovered ? 'opacity-100' : 'opacity-0'}`} />

      <div className="relative z-10 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Checkbox + الصورة المصغرة */}
          <div className="flex items-start gap-3 md:w-48 flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(video.id)}
              className="mt-1 w-4 h-4 accent-yellow-400 cursor-pointer rounded border-[var(--border-color)] bg-white/5"
              title="تحديد الفيديو"
            />
            <div className="relative w-full h-32 md:h-auto rounded-xl overflow-hidden bg-gradient-to-br from-yellow-400/20 via-purple-500/20 to-blue-500/20 flex items-center justify-center flex-shrink-0 group/image">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={video.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover/image:scale-110"
                />
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <Video className={`h-10 w-10 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
                  <span className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>لا توجد صورة</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Play className="h-8 w-8 text-yellow-400" />
              </div>
              <div className={`absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full ${isDark ? 'bg-black/60 text-white border border-white/10' : 'bg-black/40 text-white'}`}>
                {video.storage_type === 'youtube' ? 'YouTube' : 'مباشر'}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <h3 className={`text-lg font-bold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'} group-hover:text-yellow-400 transition-colors cursor-pointer`}>
                {video.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {isPlatform && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/20 flex items-center gap-1">
                    <Lock className="h-3 w-3" /> محمي
                  </span>
                )}
                <span className={`text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
                  <Eye className="h-4 w-4 inline ml-1" />
                  {video.views || 0}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                  video.is_published ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {video.is_published ? 'منشور' : 'مسودة'}
                </span>
              </div>
            </div>

            {video.description && (
              <p className={`text-sm mt-1 line-clamp-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
                {video.description}
              </p>
            )}

            <div className={`flex flex-wrap items-center gap-2 mt-3 text-xs ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <Book className="h-3 w-3" />
                {courseTitle || 'بدون كورس'}
              </span>
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                <Calendar className="h-3 w-3" />
                {formatDate(video.created_at)}
              </span>
              {video.tags && video.tags.length > 0 && (
                <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <Tag className="h-3 w-3" />
                  {video.tags.join(', ')}
                </span>
              )}
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] ${
                isPlatform
                  ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/20'
                  : 'bg-blue-400/20 text-blue-300 border border-blue-400/20'
              }`}>
                {isPlatform ? <Shield className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                {isPlatform ? 'داخل المنصة 🔒' : 'على YouTube 🌐'}
              </span>
            </div>

            {/* الأزرار */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
              <button
                onClick={() => onPlay(video.id)}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/30 transition flex items-center gap-1"
              >
                <Eye className="h-3 w-3" /> مشاهدة
              </button>

              {canPublish && (
                <button
                  onClick={() => onTogglePublish(video)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    video.is_published
                      ? 'bg-yellow-400/20 text-yellow-300 hover:bg-yellow-400/30'
                      : 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                  }`}
                >
                  {video.is_published ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {video.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
              )}

              {canEdit && (
                <>
                  <button
                    onClick={() => onEdit(video.id)}
                    className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" /> تعديل
                  </button>
                  <button
                    onClick={() => onToggleDisplayMode(video)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                      isPlatform
                        ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                        : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                    }`}
                    title={isPlatform ? 'تحويل إلى العرض على YouTube' : 'تحويل إلى العرض داخل المنصة'}
                  >
                    {isPlatform ? <Globe className="h-3 w-3" /> : <Shield className="h-3 w-3" />}
                    {isPlatform ? 'عرض على يوتيوب' : 'عرض داخل المنصة'}
                  </button>
                </>
              )}

              {canDelete && (
                <button
                  onClick={() => onDelete(video.id, video.title)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/30 transition flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> حذف
                </button>
              )}

              {!isPlatform && (
                <>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/watch/${video.id}`;
                      if (navigator.share) {
                        navigator.share({
                          title: video.title,
                          text: video.description || 'شاهد هذا الفيديو',
                          url: shareUrl,
                        }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(shareUrl)
                          .then(() => toast.success('✅ تم نسخ الرابط'))
                          .catch(() => toast.error('فشل نسخ الرابط'));
                      }
                    }}
                    className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/30 transition flex items-center gap-1"
                    title="مشاركة الفيديو"
                  >
                    <Share2 className="h-3 w-3" /> مشاركة
                  </button>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/watch/${video.id}`;
                      navigator.clipboard.writeText(shareUrl)
                        .then(() => toast.success('✅ تم نسخ الرابط'))
                        .catch(() => toast.error('فشل نسخ الرابط'));
                    }}
                    className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-xl text-xs font-semibold hover:bg-gray-500/30 transition flex items-center gap-1"
                    title="نسخ رابط الفيديو"
                  >
                    <LinkIcon className="h-3 w-3" /> نسخ الرابط
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ================================================================
// 🗑️ نافذة تأكيد الحذف
// ================================================================

const DeleteModal = ({ isOpen, onClose, onConfirm, title, count, isBatch, isDark }) => {
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
        className={`rounded-3xl p-8 max-w-md w-full ${
          isDark
            ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
            : 'bg-white border border-gray-200 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
            {isBatch ? `حذف ${count} فيديو` : 'تأكيد الحذف'}
          </h3>
          <p className={`text-sm mb-6 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
            {isBatch
              ? `هل أنت متأكد من حذف ${count} فيديو؟ هذا الإجراء لا يمكن التراجع عنه.`
              : `هل أنت متأكد من حذف "${title}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className={`px-6 py-2.5 rounded-xl transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                  : 'bg-gray-100 border border-gray-200 hover:bg-gray-200'
              }`}
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
// 📄 الصفحة الرئيسية – إدارة الفيديوهات للمساعد
// ================================================================

export default function AssistantVideosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');
  const { isDark, toggleTheme } = useTheme();

  // ===== حالات عامة =====
  const [videos, setVideos] = useState([]);
  const [courses, setCourses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [assistant, setAssistant] = useState(null);
  const [permissions, setPermissions] = useState([]);

  // ===== فلترة وبحث =====
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState(courseId || 'all');
  const [sortBy, setSortBy] = useState('newest');
  const [filterDisplayMode, setFilterDisplayMode] = useState('all');

  // ===== تحديد متعدد =====
  const [selectedIds, setSelectedIds] = useState([]);

  // ===== إحصائيات =====
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    totalViews: 0,
    youtubeCount: 0,
    platformCount: 0,
  });

  // ===== حالات الحذف =====
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // ===== بيانات الرسم البياني =====
  const [chartData, setChartData] = useState(null);
  const fetched = useRef(false);

  // ===== جلب البيانات =====
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      // 1. جلب بيانات المساعد من sessionStorage
      const sessionData = sessionStorage.getItem('assistantData');
      if (!sessionData) {
        toast.error('الرجاء تسجيل الدخول أولاً');
        router.replace('/assistant-login');
        return;
      }
      const parsed = JSON.parse(sessionData);
      setAssistant(parsed);

      // 2. جلب الصلاحيات
      const permsRes = await fetch('/api/assistant-data', {
        headers: { 'x-assistant-id': parsed.id },
      });
      const permsData = await permsRes.json();
      if (permsRes.ok && permsData.success) {
        setPermissions(permsData.permissions || []);
      }

      // 3. التحقق من صلاحية العرض
      if (!hasPermission(permsData.permissions || [], 'videos', 'can_view')) {
        toast.error('ليس لديك صلاحية لعرض الفيديوهات');
        router.replace('/dashboard/assistant');
        return;
      }

      // 4. جلب الكورسات
      const coursesRes = await fetch(`/api/assistant/courses?teacher_id=${parsed.teacher_id}`);
      const coursesData = await coursesRes.json();
      const courseMap = {};
      (coursesData.courses || []).forEach((c) => {
        courseMap[c.id] = c.title;
      });
      setCourses(courseMap);

      // 5. جلب الفيديوهات
      let url = `/api/assistant/videos?teacher_id=${parsed.teacher_id}`;
      if (courseId && courseId !== 'all') {
        url += `&course_id=${courseId}`;
      }
      const videosRes = await fetch(url);
      const videosData = await videosRes.json();

      if (!videosRes.ok) {
        throw new Error(videosData.error || 'فشل جلب الفيديوهات');
      }

      setVideos(videosData.videos || []);

      // 6. حساب الإحصائيات
      const data = videosData.videos || [];
      const total = data.length;
      const published = data.filter((v) => v.is_published).length;
      const totalViews = data.reduce((acc, v) => acc + (v.views || 0), 0);
      const youtubeCount = data.filter((v) => v.storage_type === 'youtube').length;
      const platformCount = data.filter((v) => (v.display_mode || 'platform') === 'platform').length;

      setStats({ total, published, totalViews, youtubeCount, platformCount });

      // 7. إعداد الرسم البياني
      if (data.length > 0) {
        const sorted = [...data].sort((a, b) => (b.views || 0) - (a.views || 0));
        const labels = sorted.slice(0, 5).map((v) => v.title.substring(0, 20));
        const viewsData = sorted.slice(0, 5).map((v) => v.views || 0);
        setChartData({
          labels,
          datasets: [{
            label: 'المشاهدات',
            data: viewsData,
            backgroundColor: [
              'rgba(234, 179, 8, 0.7)',
              'rgba(59, 130, 246, 0.7)',
              'rgba(52, 211, 153, 0.7)',
              'rgba(168, 85, 247, 0.7)',
              'rgba(251, 146, 60, 0.7)',
            ],
            borderColor: [
              'rgb(234, 179, 8)',
              'rgb(59, 130, 246)',
              'rgb(52, 211, 153)',
              'rgb(168, 85, 247)',
              'rgb(251, 146, 60)',
            ],
            borderWidth: 2,
          }],
        });
      } else {
        setChartData(null);
      }

      setSelectedIds([]);
    } catch (err) {
      console.error('Error fetching videos:', err);
      setError('فشل جلب الفيديوهات: ' + err.message);
      toast.error('فشل جلب الفيديوهات');
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    if (fetched.current) return;
    fetched.current = true;
    fetchData();
  }, [fetchData]);

  // ===== الفلترة والبحث =====
  const filteredVideos = useMemo(() => {
    let result = [...videos];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (v) => v.title.toLowerCase().includes(q) || v.description?.toLowerCase().includes(q)
      );
    }

    if (filterCourse && filterCourse !== 'all') {
      result = result.filter((v) => v.course_id === filterCourse);
    }

    if (filterDisplayMode !== 'all') {
      const mode = filterDisplayMode === 'platform' ? 'platform' : 'youtube';
      result = result.filter((v) => (v.display_mode || 'platform') === mode);
    }

    switch (sortBy) {
      case 'newest':
        result.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case 'oldest':
        result.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        break;
      case 'views':
        result.sort((a, b) => (b.views || 0) - (a.views || 0));
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }

    return result;
  }, [videos, searchQuery, filterCourse, filterDisplayMode, sortBy]);

  // ===== دوال التحكم =====
  const handleDeleteClick = (id, title) => {
    setDeleteTarget({ id, title });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/assistant/videos?id=${deleteTarget.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الفيديو');

      toast.success('✅ تم حذف الفيديو بنجاح');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('فشل حذف الفيديو');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission(permissions, 'videos', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الفيديوهات');
      return;
    }
    try {
      const idsParam = selectedIds.join(',');
      const res = await fetch(`/api/assistant/videos?ids=${idsParam}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل حذف الفيديوهات');

      toast.success(`✅ تم حذف ${selectedIds.length} فيديو بنجاح`);
      setIsBatchDeleteModalOpen(false);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      console.error('Error batch deleting:', err);
      toast.error('فشل حذف الفيديوهات المحددة');
    }
  };

  const handleBatchPublish = async () => {
    if (selectedIds.length === 0) return;
    if (!hasPermission(permissions, 'videos', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر الفيديوهات');
      return;
    }
    try {
      // تحديث كل فيديو على حدة (أو يمكن إضافة API خاص للنشر الجماعي)
      const promises = selectedIds.map((id) =>
        fetch(`/api/assistant/videos?id=${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_published: true }),
        })
      );
      await Promise.all(promises);
      toast.success(`✅ تم نشر ${selectedIds.length} فيديو بنجاح`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      console.error('Error batch publishing:', err);
      toast.error('فشل نشر الفيديوهات');
    }
  };

  const handleEdit = (id) => {
    router.push(`/dashboard/assistant/videos/${id}/edit`);
  };

  const handlePlay = (id) => {
    router.push(`/watch/${id}`);
  };

  const handleTogglePublish = async (video) => {
    try {
      const res = await fetch(`/api/assistant/videos?id=${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !video.is_published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير حالة النشر');

      toast.success(`✅ تم ${video.is_published ? 'إلغاء نشر' : 'نشر'} الفيديو`);
      fetchData();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleToggleDisplayMode = async (video) => {
    const currentMode = video.display_mode || 'platform';
    const newMode = currentMode === 'platform' ? 'youtube' : 'platform';
    try {
      const res = await fetch(`/api/assistant/videos?id=${video.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ display_mode: newMode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تغيير وضع العرض');

      toast.success(`✅ تم تغيير وضع العرض إلى ${newMode === 'platform' ? 'داخل المنصة (محمي)' : 'على YouTube (مفتوح)'}`);
      fetchData();
    } catch (err) {
      console.error('Error toggling display mode:', err);
      toast.error('فشل تغيير وضع العرض');
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredVideos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVideos.map((v) => v.id));
    }
  };

  const handleAddVideo = () => {
    const url = courseId && courseId !== 'all'
      ? `/dashboard/assistant/videos/new?course_id=${courseId}`
      : '/dashboard/assistant/videos/new';
    router.push(url);
  };

  const handleExportVideos = () => {
    const data = filteredVideos.map((v) => ({
      title: v.title,
      description: v.description,
      course: courses[v.course_id] || 'بدون كورس',
      views: v.views || 0,
      published: v.is_published ? 'نعم' : 'لا',
      display_mode: (v.display_mode || 'platform') === 'platform' ? 'داخل المنصة' : 'YouTube',
      created_at: v.created_at,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `videos_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('✅ تم تصدير قائمة الفيديوهات');
  };

  // ===== قائمة الكورسات للفلترة =====
  const courseOptions = useMemo(() => {
    const uniqueCourses = {};
    videos.forEach((v) => {
      if (v.course_id && !uniqueCourses[v.course_id]) {
        uniqueCourses[v.course_id] = courses[v.course_id] || 'كورس غير معروف';
      }
    });
    return Object.entries(uniqueCourses).map(([id, title]) => ({ id, title }));
  }, [videos, courses]);

  // ===== إحصائيات البطاقات =====
  const statsData = [
    { id: 1, label: 'إجمالي الفيديوهات', value: stats.total, icon: Video, color: 'from-blue-400 to-blue-600', delay: 0 },
    { id: 2, label: 'منشور', value: stats.published, icon: CheckCircle, color: 'from-green-400 to-green-600', delay: 0.1 },
    { id: 3, label: 'إجمالي المشاهدات', value: stats.totalViews, icon: Eye, color: 'from-purple-400 to-purple-600', delay: 0.2 },
    { id: 4, label: 'فيديوهات YouTube', value: stats.youtubeCount, icon: Video, color: 'from-red-400 to-red-600', delay: 0.3 },
    { id: 5, label: 'محمية (داخل المنصة)', value: stats.platformCount || 0, icon: Shield, color: 'from-yellow-400 to-yellow-600', delay: 0.4 },
  ];

  // ===== خيارات الرسم البياني =====
  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { color: isDark ? '#9ca3af' : '#6b7280' },
        grid: { color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' },
      },
      x: {
        ticks: { color: isDark ? '#9ca3af' : '#6b7280', font: { size: 10 } },
        grid: { display: false },
      },
    },
  };

  const canCreate = hasPermission(permissions, 'videos', 'can_create');

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[var(--bg-primary)]' : 'bg-gray-50'}`}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className={`mt-4 text-sm ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
            جاري تحميل الفيديوهات...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? 'bg-[var(--bg-primary)] text-[var(--text-primary)]' : 'bg-gray-50 text-gray-900'} transition-colors duration-300`}>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">

        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold">📹 إدارة الفيديوهات</h1>
            <p className={`text-sm mt-1 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-600'}`}>
              {courseId && courseId !== 'all'
                ? `فيديوهات الكورس: ${courses[courseId] || ''}`
                : 'جميع الفيديوهات'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 md:mt-0">
            {selectedIds.length > 0 && (
              <>
                {hasPermission(permissions, 'videos', 'can_delete') && (
                  <button
                    onClick={() => setIsBatchDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm transition flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" /> حذف المحدد ({selectedIds.length})
                  </button>
                )}
                {hasPermission(permissions, 'videos', 'can_publish') && (
                  <button
                    onClick={handleBatchPublish}
                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm transition flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" /> نشر المحدد ({selectedIds.length})
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleExportVideos}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-sm transition flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> تصدير القائمة
            </button>
            {canCreate && (
              <button
                onClick={handleAddVideo}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Plus className="h-5 w-5" /> إضافة فيديو
              </button>
            )}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
              }`}
            >
              {isDark ? <Sun className="h-5 w-5 text-yellow-400" /> : <Moon className="h-5 w-5 text-gray-600" />}
            </button>
          </div>
        </div>

        {/* ===== الأخطاء والنجاحات ===== */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-xl mb-4 flex items-center gap-3"
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError('')} className="text-red-400/70 hover:text-red-400">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
          {success && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-green-500/10 border border-green-500/30 text-green-400 p-4 rounded-xl mb-4 flex items-center gap-3"
            >
              <CheckCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{success}</span>
              <button onClick={() => setSuccess('')} className="text-green-400/70 hover:text-green-400">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {statsData.map((stat) => (
            <StatCard key={stat.id} stat={stat} isDark={isDark} />
          ))}
        </div>

        {/* ===== الرسم البياني ===== */}
        {chartData && (
          <div className={`rounded-2xl p-5 mb-6 ${
            isDark
              ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            <h3 className={`text-sm font-semibold mb-4 text-center ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              أكثر الفيديوهات مشاهدة
            </h3>
            <div className="max-w-sm mx-auto h-48">
              <Bar data={chartData} options={barOptions} />
            </div>
          </div>
        )}

        {/* ===== الفلتر والبحث ===== */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن فيديو (عنوان أو وصف)..."
              className={`w-full p-2.5 pr-10 rounded-xl border outline-none transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-gray-500 focus:ring-2 focus:ring-yellow-400/50'
                  : 'bg-white border-gray-200 text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-yellow-400/50'
              }`}
            />
          </div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${
              isDark
                ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
            }`}
          >
            <option value="all">جميع الكورسات</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${
              isDark
                ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
            }`}
          >
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="views">الأكثر مشاهدة</option>
            <option value="title">العنوان</option>
          </select>
          <select
            value={filterDisplayMode}
            onChange={(e) => setFilterDisplayMode(e.target.value)}
            className={`p-2.5 rounded-xl border outline-none transition ${
              isDark
                ? 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-yellow-400/50'
                : 'bg-white border-gray-200 text-gray-900 focus:ring-2 focus:ring-yellow-400/50'
            }`}
          >
            <option value="all">كل أوضاع العرض</option>
            <option value="platform">داخل المنصة 🔒</option>
            <option value="youtube">على YouTube 🌐</option>
          </select>
          {filteredVideos.length > 0 && (
            <button
              onClick={handleSelectAll}
              className={`px-4 py-2 rounded-xl text-sm transition ${
                isDark
                  ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                  : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
              }`}
            >
              {selectedIds.length === filteredVideos.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
          )}
          <button
            onClick={() => {
              setSearchQuery('');
              setFilterCourse('all');
              setFilterDisplayMode('all');
              setSortBy('newest');
            }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition ${
              isDark
                ? 'bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-yellow-400/50'
                : 'bg-white border border-gray-200 hover:border-yellow-400/50 shadow-sm'
            }`}
          >
            <Filter className="h-4 w-4 inline ml-1" /> إعادة ضبط
          </button>
        </div>

        {/* ===== قائمة الفيديوهات ===== */}
        {filteredVideos.length === 0 ? (
          <div className={`text-center py-20 rounded-3xl ${
            isDark
              ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
              : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            <Video className={`h-16 w-16 mx-auto mb-4 ${isDark ? 'text-gray-600' : 'text-gray-300'}`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
              {searchQuery || filterCourse !== 'all' || filterDisplayMode !== 'all'
                ? 'لا توجد نتائج تطابق البحث'
                : 'لا توجد فيديوهات بعد'}
            </h3>
            <p className={`text-sm mt-2 ${isDark ? 'text-[var(--text-secondary)]' : 'text-gray-500'}`}>
              {searchQuery || filterCourse !== 'all' || filterDisplayMode !== 'all'
                ? 'حاول تغيير معايير البحث'
                : 'قم بإضافة أول فيديو لك'}
            </p>
            {!searchQuery && filterCourse === 'all' && filterDisplayMode === 'all' && canCreate && (
              <button
                onClick={handleAddVideo}
                className="mt-4 px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
              >
                إضافة فيديو الآن
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {filteredVideos.map((video, index) => (
              <VideoCard
                key={video.id}
                video={video}
                courseTitle={courses[video.course_id]}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onPlay={handlePlay}
                onTogglePublish={handleTogglePublish}
                onToggleDisplayMode={handleToggleDisplayMode}
                isSelected={selectedIds.includes(video.id)}
                onSelect={handleToggleSelect}
                isDark={isDark}
                permissions={permissions}
              />
            ))}
          </div>
        )}
      </div>

      {/* ===== نوافذ التأكيد ===== */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={deleteTarget?.title}
        isDark={isDark}
      />

      <DeleteModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        onConfirm={handleBatchDelete}
        count={selectedIds.length}
        isBatch={true}
        isDark={isDark}
      />

      {/* ===== روابط سريعة ===== */}
      <div className={`rounded-2xl p-4 mt-6 ${
        isDark
          ? 'bg-[var(--bg-card)] border border-[var(--border-color)]'
          : 'bg-white border border-gray-200 shadow-sm'
      }`}>
        <h3 className={`text-sm font-semibold mb-2 flex items-center gap-2 ${isDark ? 'text-[var(--text-primary)]' : 'text-gray-900'}`}>
          <LinkIcon className="h-4 w-4 text-yellow-400" /> روابط سريعة
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/dashboard/assistant" className={`text-xs px-3 py-1.5 rounded-lg transition ${
            isDark
              ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}>
            <Home className="h-3 w-3 inline ml-1" /> الرئيسية
          </Link>
          <Link href="/dashboard/assistant/courses" className={`text-xs px-3 py-1.5 rounded-lg transition ${
            isDark
              ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}>
            <BookOpen className="h-3 w-3 inline ml-1" /> الكورسات
          </Link>
          <Link href="/dashboard/assistant/exams" className={`text-xs px-3 py-1.5 rounded-lg transition ${
            isDark
              ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}>
            <FileText className="h-3 w-3 inline ml-1" /> الامتحانات
          </Link>
          <Link href="/dashboard/assistant/books" className={`text-xs px-3 py-1.5 rounded-lg transition ${
            isDark
              ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}>
            <Book className="h-3 w-3 inline ml-1" /> الكتب
          </Link>
          <Link href="/dashboard/assistant/question-bank" className={`text-xs px-3 py-1.5 rounded-lg transition ${
            isDark
              ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-300'
              : 'bg-purple-100 hover:bg-purple-200 text-purple-600'
          }`}>
            <Database className="h-3 w-3 inline ml-1" /> بنوك الأسئلة
          </Link>
          <Link href="/dashboard/assistant/students-affairs" className={`text-xs px-3 py-1.5 rounded-lg transition ${
            isDark
              ? 'bg-[var(--bg-card)] hover:bg-white/5 text-[var(--text-secondary)]'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
          }`}>
            <Users className="h-3 w-3 inline ml-1" /> شؤون الطلاب
          </Link>
        </div>
      </div>
    </div>
  );
}