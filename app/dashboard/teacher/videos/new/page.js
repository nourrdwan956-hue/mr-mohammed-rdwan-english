// ============================================================
// app/dashboard/teacher/videos/page.js
// إدارة الفيديوهات – النسخة العبقرية V5 (مع قوائم التشغيل)
// ============================================================

'use client';

import { TeacherLayout } from '@/components/TeacherLayout';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { Doughnut, Bar } from 'react-chartjs-2';

import { getCachedAssistantPermissions, hasPermission } from '@/lib/permissions';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ============================================================
// 1. عداد متحرك
// ============================================================

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
    <span ref={ref} className="font-extrabold">
      {count}{suffix}
    </span>
  );
};

// ============================================================
// 2. بطاقة إحصائية
// ============================================================

const StatCard = ({ stat }) => {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: stat.delay }}
      whileHover={{ y: -6, scale: 1.02 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 hover:border-yellow-400/50 transition-all duration-300 hover:shadow-2xl hover:shadow-yellow-400/10 overflow-hidden group"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${stat.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
      <div className="relative z-10 flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm">{stat.label}</p>
          <p className="text-3xl font-extrabold text-white mt-1">
            <AnimatedCounter target={stat.value} suffix={stat.suffix || ''} />
          </p>
        </div>
        <div className={`p-3 rounded-xl bg-gradient-to-br ${stat.color} bg-opacity-20`}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <div className="mt-4 h-1 w-full bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full w-3/4 bg-gradient-to-r ${stat.color} rounded-full animate-pulse`}
        />
      </div>
    </motion.div>
  );
};

// ============================================================
// 3. مكونات القوائم الجديدة
// ============================================================

// 3.1 قائمة منسدلة لنقل الفيديو
const MoveToPlaylistDropdown = ({
  videoId,
  currentPlaylistId,
  playlists,
  onMove,
  isMoving,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleMove = async (targetPlaylistId) => {
    if (targetPlaylistId === currentPlaylistId) {
      setIsOpen(false);
      return;
    }
    await onMove(videoId, targetPlaylistId);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isMoving}
        className="p-1.5 hover:bg-blue-500/20 rounded-lg transition text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs"
        title="نقل الفيديو"
      >
        {isMoving ? (
          <Icons.Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Icons.FolderPlus className="h-3.5 w-3.5" />
        )}
        <span className="hidden sm:inline">نقل</span>
      </button>

      {isOpen && !isMoving && (
        <div className="absolute right-0 mt-1 w-48 bg-[#1a1f2e] border border-white/10 rounded-xl shadow-2xl z-20 py-1">
          <button
            onClick={() => handleMove(null)}
            className="w-full text-right px-3 py-1.5 text-xs hover:bg-white/5 transition flex items-center gap-2 text-gray-300"
          >
            <Icons.ArrowUp className="h-3 w-3" /> فيديو فردي
          </button>
          {playlists.map((p) => (
            <button
              key={p.id}
              onClick={() => handleMove(p.id)}
              className={`w-full text-right px-3 py-1.5 text-xs hover:bg-white/5 transition flex items-center gap-2 ${
                p.id === currentPlaylistId
                  ? 'text-yellow-400 bg-yellow-400/10'
                  : 'text-gray-300'
              }`}
            >
              <Icons.Folder className="h-3 w-3" /> {p.title}
              {p.id === currentPlaylistId && (
                <Icons.Check className="h-3 w-3 mr-auto" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// 3.2 بطاقة عرض قائمة (مع فيديوهاتها)
const PlaylistCard = ({
  playlist,
  videos,
  onEditPlaylist,
  onDeletePlaylist,
  onEditVideo,
  onDeleteVideo,
  onMoveVideo,
  isMovingVideo,
  permissions,
  isAssistant,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const playlistVideos = useMemo(
    () => videos.filter((v) => v.playlist_id === playlist.id),
    [videos, playlist.id]
  );

  const canEditPlaylist =
    !isAssistant || hasPermission(permissions, 'playlists', 'can_edit');
  const canDeletePlaylist =
    !isAssistant || hasPermission(permissions, 'playlists', 'can_delete');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden hover:border-yellow-400/50 transition-all duration-300"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* رأس القائمة */}
      <div
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 transition"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <Icons.Folder
            className={`h-5 w-5 text-yellow-400 transition-transform ${
              isExpanded ? 'rotate-0' : 'rotate-90'
            }`}
          />
          <div>
            <h4 className="font-bold text-white">{playlist.title}</h4>
            <p className="text-xs text-gray-400">
              {playlistVideos.length} فيديو • {playlist.description || ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full ${
              playlist.is_published
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-500/20 text-gray-400'
            }`}
          >
            {playlist.is_published ? 'منشور' : 'مسودة'}
          </span>
          {canEditPlaylist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEditPlaylist(playlist);
              }}
              className="p-1.5 hover:bg-yellow-400/20 rounded-lg transition text-yellow-400 hover:text-yellow-300"
            >
              <Icons.Edit className="h-4 w-4" />
            </button>
          )}
          {canDeletePlaylist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeletePlaylist(playlist);
              }}
              className="p-1.5 hover:bg-red-500/20 rounded-lg transition text-red-400 hover:text-red-300"
            >
              <Icons.Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="p-1.5 hover:bg-white/10 rounded-lg transition"
          >
            {isExpanded ? (
              <Icons.ChevronUp className="h-4 w-4" />
            ) : (
              <Icons.ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* محتوى القائمة (فيديوهات) */}
      {isExpanded && (
        <div className="p-3 pt-0 border-t border-white/5">
          {playlistVideos.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-4">
              لا توجد فيديوهات في هذه القائمة
            </p>
          ) : (
            <div className="space-y-2">
              {playlistVideos.map((video, idx) => (
                <motion.div
                  key={video.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="bg-white/5 border border-white/10 rounded-lg p-2 hover:border-yellow-400/50 transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">#{idx + 1}</span>
                        <Icons.Play className="h-3 w-3 text-yellow-400" />
                        <span className="text-sm font-medium text-white truncate">
                          {video.title}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Icons.Eye className="h-3 w-3" /> {video.views || 0}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] ${
                            video.is_published
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}
                        >
                          {video.is_published ? 'منشور' : 'مسودة'}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 mr-2">
                      <Link
                        href={`/watch/${video.id}`}
                        target="_blank"
                        className="p-1 hover:bg-blue-500/20 rounded-lg transition text-blue-400"
                      >
                        <Icons.Eye className="h-3.5 w-3.5" />
                      </Link>
                      {(!isAssistant ||
                        hasPermission(permissions, 'videos', 'can_edit')) && (
                        <button
                          onClick={() => onEditVideo(video.id)}
                          className="p-1 hover:bg-yellow-400/20 rounded-lg transition text-yellow-400"
                        >
                          <Icons.Edit className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {(!isAssistant ||
                        hasPermission(permissions, 'videos', 'can_delete')) && (
                        <button
                          onClick={() => onDeleteVideo(video.id, video.title)}
                          className="p-1 hover:bg-red-500/20 rounded-lg transition text-red-400"
                        >
                          <Icons.Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {/* زر النقل (يظهر فقط إذا كان هناك قوائم أخرى أو إمكانية النقل) */}
                      {(!isAssistant ||
                        hasPermission(permissions, 'videos', 'can_edit')) && (
                        <MoveToPlaylistDropdown
                          videoId={video.id}
                          currentPlaylistId={playlist.id}
                          playlists={[]} // سنمرر القوائم من الخارج، لكنه لا يحتاجها هنا لأنه سينقل خارج القائمة
                          onMove={onMoveVideo}
                          isMoving={isMovingVideo}
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
};

// 3.3 مودال إنشاء/تعديل القائمة
const PlaylistModal = ({
  isOpen,
  onClose,
  onSuccess,
  playlist = null,
  courseId,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const isEditing = !!playlist;

  useEffect(() => {
    if (playlist) {
      setTitle(playlist.title || '');
      setDescription(playlist.description || '');
    } else {
      setTitle('');
      setDescription('');
    }
  }, [playlist]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('يرجى إدخال عنوان القائمة');
      return;
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('غير مسجل دخول');

      const payload = {
        title: title.trim(),
        description: description.trim(),
        course_id: courseId,
        teacher_id: user.id,
      };

      let result;
      if (isEditing) {
        const { data, error } = await supabase
          .from('video_playlists')
          .update(payload)
          .eq('id', playlist.id)
          .select()
          .single();
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('video_playlists')
          .insert(payload)
          .select()
          .single();
        if (error) throw error;
        result = data;
      }

      toast.success(isEditing ? '✅ تم تحديث القائمة' : '✅ تم إنشاء القائمة');
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#1a1f2e] border border-white/10 rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">
            {isEditing ? 'تعديل القائمة' : 'إضافة قائمة جديدة'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition text-gray-400"
          >
            <Icons.X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              عنوان القائمة <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
              placeholder="مثال: مراجعة شاملة، شرح الوحدة الأولى..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              وصف (اختياري)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows="3"
              className="w-full p-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition resize-none"
              placeholder="وصف مختصر للقائمة..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-gray-400 hover:text-white transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
            >
              {loading && <Icons.Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'جاري الحفظ...' : isEditing ? 'تحديث' : 'إنشاء'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// ============================================================
// 4. بطاقة الفيديو (معدلة لإضافة زر النقل)
// ============================================================

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
  permissions,
  isAssistant,
  playlists, // قائمة القوائم المتاحة للنقل
  onMoveVideo,
  isMovingVideo,
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const getYoutubeId = (url) => {
    if (!url) return null;
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?]+)/);
    return match ? match[1] : null;
  };

  const youtubeId = getYoutubeId(video.video_url) || video.telegram_file_id;
  const thumbnail = youtubeId
    ? `https://img.youtube.com/vi/${youtubeId}/mqdefault.jpg`
    : null;

  const displayMode = video.display_mode || 'platform';
  const isPlatform = displayMode === 'platform';

  const canEdit =
    !isAssistant || hasPermission(permissions, 'videos', 'can_edit');
  const canDelete =
    !isAssistant || hasPermission(permissions, 'videos', 'can_delete');
  const canPublish =
    !isAssistant || hasPermission(permissions, 'videos', 'can_publish');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative bg-white/5 backdrop-blur-sm border rounded-2xl overflow-hidden hover:border-yellow-400/50 transition-all duration-500 hover:shadow-2xl hover:shadow-yellow-400/10 ${
        isSelected ? 'border-yellow-400/70 bg-yellow-400/5' : 'border-white/10'
      }`}
    >
      <div
        className={`absolute inset-0 bg-gradient-to-br from-yellow-400/5 via-purple-500/5 to-transparent rounded-2xl transition-opacity duration-500 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <div className="relative z-10 p-5">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Checkbox + الصورة المصغرة */}
          <div className="flex items-start gap-3 md:w-48 flex-shrink-0">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(video.id)}
              className="mt-1 w-4 h-4 accent-yellow-400 cursor-pointer rounded border-white/20 bg-white/5"
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
                  <Icons.Video className="h-10 w-10 text-gray-600" />
                  <span className="text-xs text-gray-500">لا توجد صورة</span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover/image:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                <Icons.Play className="h-8 w-8 text-yellow-400" />
              </div>
              <div className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded-full bg-black/60 text-white border border-white/10">
                {video.storage_type === 'youtube' ? 'YouTube' : 'مباشر'}
              </div>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between flex-wrap gap-2">
              <h3 className="text-lg font-bold text-white group-hover:text-yellow-300 transition-colors cursor-pointer">
                {video.title}
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                {isPlatform && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/20 flex items-center gap-1">
                    <Icons.Lock className="h-3 w-3" /> محمي
                  </span>
                )}
                <span className="text-sm text-gray-400">
                  <Icons.Eye className="h-4 w-4 inline ml-1" />
                  {video.views || 0}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] ${
                    video.is_published
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-gray-500/20 text-gray-400'
                  }`}
                >
                  {video.is_published ? 'منشور' : 'مسودة'}
                </span>
              </div>
            </div>

            {video.description && (
              <p className="text-sm text-gray-400 mt-1 line-clamp-2">
                {video.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-400">
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.Book className="h-3.5 w-3.5" />
                {courseTitle || 'بدون كورس'}
              </span>
              <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                <Icons.Calendar className="h-3.5 w-3.5" />
                {new Date(video.created_at).toLocaleDateString('ar-EG')}
              </span>
              {video.tags && video.tags.length > 0 && (
                <span className="flex items-center gap-1.5 bg-white/5 px-3 py-1 rounded-full">
                  <Icons.Tag className="h-3.5 w-3.5" />
                  {video.tags.join(', ')}
                </span>
              )}
              <span
                className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] ${
                  isPlatform
                    ? 'bg-yellow-400/20 text-yellow-300 border border-yellow-400/20'
                    : 'bg-blue-400/20 text-blue-300 border border-blue-400/20'
                }`}
              >
                {isPlatform ? (
                  <Icons.Shield className="h-3 w-3" />
                ) : (
                  <Icons.Globe className="h-3 w-3" />
                )}
                {isPlatform ? 'داخل المنصة 🔒' : 'على YouTube 🌐'}
              </span>
            </div>

            {/* ===== الأزرار ===== */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-white/5">
              <button
                onClick={() => onPlay(video.id)}
                className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-xl text-xs font-semibold hover:bg-blue-500/30 transition flex items-center gap-1"
              >
                <Icons.Eye className="h-3 w-3" /> مشاهدة
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
                  {video.is_published ? (
                    <Icons.EyeOff className="h-3 w-3" />
                  ) : (
                    <Icons.Eye className="h-3 w-3" />
                  )}
                  {video.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
              )}

              {canEdit && (
                <button
                  onClick={() => onEdit(video.id)}
                  className="px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-xl text-xs font-semibold hover:bg-yellow-500/30 transition flex items-center gap-1"
                >
                  <Icons.Edit className="h-3 w-3" /> تعديل
                </button>
              )}

              {canDelete && (
                <button
                  onClick={() => onDelete(video.id, video.title)}
                  className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-xl text-xs font-semibold hover:bg-red-500/30 transition flex items-center gap-1"
                >
                  <Icons.Trash2 className="h-3 w-3" /> حذف
                </button>
              )}

              {/* زر النقل (يظهر فقط إذا كان هناك قوائم متاحة ولديه صلاحية التعديل) */}
              {canEdit && playlists && playlists.length > 0 && (
                <MoveToPlaylistDropdown
                  videoId={video.id}
                  currentPlaylistId={video.playlist_id || null}
                  playlists={playlists}
                  onMove={onMoveVideo}
                  isMoving={isMovingVideo}
                />
              )}

              {/* أزرار المشاركة ونسخ الرابط (تظهر فقط إذا لم يكن محمياً) */}
              {!isPlatform && (
                <>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/watch/${video.id}`;
                      if (navigator.share) {
                        navigator
                          .share({
                            title: video.title,
                            text: video.description || 'شاهد هذا الفيديو',
                            url: shareUrl,
                          })
                          .catch(() => {});
                      } else {
                        navigator.clipboard
                          .writeText(shareUrl)
                          .then(() => toast.success('✅ تم نسخ الرابط'))
                          .catch(() => toast.error('فشل نسخ الرابط'));
                      }
                    }}
                    className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded-xl text-xs font-semibold hover:bg-cyan-500/30 transition flex items-center gap-1"
                    title="مشاركة الفيديو"
                  >
                    <Icons.Share2 className="h-3 w-3" /> مشاركة
                  </button>
                  <button
                    onClick={() => {
                      const shareUrl = `${window.location.origin}/watch/${video.id}`;
                      navigator.clipboard
                        .writeText(shareUrl)
                        .then(() => toast.success('✅ تم نسخ الرابط'))
                        .catch(() => toast.error('فشل نسخ الرابط'));
                    }}
                    className="px-3 py-1.5 bg-gray-500/20 text-gray-400 rounded-xl text-xs font-semibold hover:bg-gray-500/30 transition flex items-center gap-1"
                    title="نسخ رابط الفيديو"
                  >
                    <Icons.Link className="h-3 w-3" /> نسخ الرابط
                  </button>
                </>
              )}

              {canEdit && (
                <button
                  onClick={() => onToggleDisplayMode(video)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1 ${
                    isPlatform
                      ? 'bg-purple-500/20 text-purple-300 hover:bg-purple-500/30'
                      : 'bg-orange-500/20 text-orange-300 hover:bg-orange-500/30'
                  }`}
                  title={
                    isPlatform
                      ? 'تحويل إلى العرض على YouTube'
                      : 'تحويل إلى العرض داخل المنصة'
                  }
                >
                  {isPlatform ? (
                    <Icons.Globe className="h-3 w-3" />
                  ) : (
                    <Icons.Shield className="h-3 w-3" />
                  )}
                  {isPlatform ? 'عرض على يوتيوب' : 'عرض داخل المنصة'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================================
// 5. نافذة تأكيد الحذف
// ============================================================

const DeleteModal = ({ isOpen, onClose, onConfirm, title, count, isBatch }) => {
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
        className="bg-[#1a1f2e] border border-white/10 rounded-3xl p-8 max-w-md w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <Icons.AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-2">
            {isBatch ? `حذف ${count} فيديو` : 'تأكيد الحذف'}
          </h3>
          <p className="text-gray-400 text-sm mb-6">
            {isBatch
              ? `هل أنت متأكد من حذف ${count} فيديو؟ هذا الإجراء لا يمكن التراجع عنه.`
              : `هل أنت متأكد من حذف "${title}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
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

// ============================================================
// 6. الصفحة الرئيسية – مع صلاحيات المساعد وقوائم التشغيل
// ============================================================

export default function TeacherVideosPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get('courseId');

  // ===== حالات عامة =====
  const [videos, setVideos] = useState([]);
  const [playlists, setPlaylists] = useState([]);
  const [courses, setCourses] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ===== فلترة وبحث وترتيب =====
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
    playlistCount: 0,
  });

  // ===== صلاحيات المساعد =====
  const [permissions, setPermissions] = useState(null);
  const [isAssistant, setIsAssistant] = useState(false);

  // ===== حالات الحذف =====
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBatchDeleteModalOpen, setIsBatchDeleteModalOpen] = useState(false);

  // ===== حالات القوائم =====
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);
  const [isMovingVideo, setIsMovingVideo] = useState(false);

  // ===== بيانات الرسم البياني =====
  const [chartData, setChartData] = useState(null);

  // ===== جلب البيانات =====
  const fetchVideos = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // جلب صلاحيات المساعد
      const perms = await getCachedAssistantPermissions(user.id);
      if (perms !== null) {
        setIsAssistant(true);
        setPermissions(perms);
      } else {
        setIsAssistant(false);
        setPermissions(null);
      }

      // التحقق من صلاحية العرض
      if (perms !== null && !hasPermission(perms, 'videos', 'can_view')) {
        toast.error('غير مصرح لك بمشاهدة هذه الصفحة');
        router.push('/dashboard/assistant');
        return;
      }

      // جلب الكورسات (للفلترة)
      const { data: coursesData } = await supabase
        .from('courses')
        .select('id, title')
        .eq('teacher_id', user.id);

      const courseMap = {};
      (coursesData || []).forEach((c) => {
        courseMap[c.id] = c.title;
      });
      setCourses(courseMap);

      // جلب الفيديوهات
      let query = supabase
        .from('videos')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (courseId && courseId !== 'all') {
        query = query.eq('course_id', courseId);
      }

      const { data: videosData, error: videosError } = await query;
      if (videosError) throw videosError;

      // جلب القوائم
      let playlistQuery = supabase
        .from('video_playlists')
        .select('*')
        .eq('teacher_id', user.id)
        .order('order_index', { ascending: true });

      if (courseId && courseId !== 'all') {
        playlistQuery = playlistQuery.eq('course_id', courseId);
      }

      const { data: playlistsData, error: playlistsError } =
        await playlistQuery;
      if (playlistsError) throw playlistsError;

      setVideos(videosData || []);
      setPlaylists(playlistsData || []);

      // حساب الإحصائيات
      const total = videosData?.length || 0;
      const published =
        videosData?.filter((v) => v.is_published).length || 0;
      const totalViews =
        videosData?.reduce((acc, v) => acc + (v.views || 0), 0) || 0;
      const youtubeCount =
        videosData?.filter((v) => v.storage_type === 'youtube').length || 0;
      const platformCount =
        videosData?.filter((v) => (v.display_mode || 'platform') === 'platform')
          .length || 0;
      const playlistCount = playlistsData?.length || 0;

      setStats({
        total,
        published,
        totalViews,
        youtubeCount,
        platformCount,
        playlistCount,
      });

      // إعداد بيانات الرسم البياني
      if (videosData && videosData.length > 0) {
        const sorted = [...videosData].sort(
          (a, b) => (b.views || 0) - (a.views || 0)
        );
        const labels = sorted.slice(0, 5).map((v) => v.title.substring(0, 20));
        const viewsData = sorted.slice(0, 5).map((v) => v.views || 0);
        setChartData({
          labels,
          datasets: [
            {
              label: 'المشاهدات',
              data: viewsData,
              backgroundColor: [
                'rgba(255, 215, 0, 0.7)',
                'rgba(59, 130, 246, 0.7)',
                'rgba(52, 211, 153, 0.7)',
                'rgba(168, 85, 247, 0.7)',
                'rgba(251, 146, 60, 0.7)',
              ],
              borderColor: [
                'rgb(255, 215, 0)',
                'rgb(59, 130, 246)',
                'rgb(52, 211, 153)',
                'rgb(168, 85, 247)',
                'rgb(251, 146, 60)',
              ],
              borderWidth: 2,
            },
          ],
        });
      } else {
        setChartData(null);
      }

      // إعادة تعيين التحديد
      setSelectedIds([]);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('فشل جلب البيانات: ' + err.message);
      toast.error('فشل جلب البيانات');
    } finally {
      setLoading(false);
    }
  }, [courseId, router]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  // ===== الفلترة والبحث والترتيب =====
  const playlistIds = useMemo(() => playlists.map((p) => p.id), [playlists]);

  // الفيديوهات الفردية (التي ليس لها playlist_id أو playlist_id غير موجود)
  const individualVideos = useMemo(() => {
    return videos.filter(
      (v) => !v.playlist_id || !playlistIds.includes(v.playlist_id)
    );
  }, [videos, playlistIds]);

  // تطبيق الفلترة على الفيديوهات الفردية
  const filteredIndividualVideos = useMemo(() => {
    let result = [...individualVideos];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.title.toLowerCase().includes(q) ||
          v.description?.toLowerCase().includes(q)
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
  }, [individualVideos, searchQuery, filterCourse, filterDisplayMode, sortBy]);

  // فلترة القوائم حسب البحث والكورس
  const filteredPlaylists = useMemo(() => {
    let result = [...playlists];

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q)
      );
    }

    if (filterCourse && filterCourse !== 'all') {
      result = result.filter((p) => p.course_id === filterCourse);
    }

    // ترتيب حسب order_index
    result.sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    return result;
  }, [playlists, searchQuery, filterCourse]);

  // ===== دوال التحكم =====

  // دوال الفيديوهات (الحالية)
  const handleDeleteClick = (id, title) => {
    setDeleteTarget({ id, title });
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('id', deleteTarget.id);
      if (error) throw error;
      toast.success('✅ تم حذف الفيديو بنجاح');
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchVideos();
    } catch (err) {
      console.error('Error deleting video:', err);
      toast.error('فشل حذف الفيديو');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (isAssistant && !hasPermission(permissions, 'videos', 'can_delete')) {
      toast.error('ليس لديك صلاحية لحذف الفيديوهات');
      return;
    }
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`✅ تم حذف ${selectedIds.length} فيديو بنجاح`);
      setIsBatchDeleteModalOpen(false);
      setSelectedIds([]);
      fetchVideos();
    } catch (err) {
      console.error('Error batch deleting:', err);
      toast.error('فشل حذف الفيديوهات المحددة');
    }
  };

  const handleBatchPublish = async () => {
    if (selectedIds.length === 0) return;
    if (isAssistant && !hasPermission(permissions, 'videos', 'can_publish')) {
      toast.error('ليس لديك صلاحية لنشر الفيديوهات');
      return;
    }
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_published: true })
        .in('id', selectedIds);
      if (error) throw error;
      toast.success(`✅ تم نشر ${selectedIds.length} فيديو بنجاح`);
      setSelectedIds([]);
      fetchVideos();
    } catch (err) {
      console.error('Error batch publishing:', err);
      toast.error('فشل نشر الفيديوهات');
    }
  };

  const handleEdit = (id) => {
    router.push(`/dashboard/teacher/videos/${id}/edit`);
  };

  const handlePlay = (id) => {
    router.push(`/watch/${id}`);
  };

  const handleTogglePublish = async (video) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ is_published: !video.is_published })
        .eq('id', video.id);
      if (error) throw error;
      toast.success(`✅ تم ${video.is_published ? 'إلغاء نشر' : 'نشر'} الفيديو`);
      fetchVideos();
    } catch (err) {
      console.error('Error toggling publish:', err);
      toast.error('فشل تغيير حالة النشر');
    }
  };

  const handleToggleDisplayMode = async (video) => {
    const currentMode = video.display_mode || 'platform';
    const newMode = currentMode === 'platform' ? 'youtube' : 'platform';
    try {
      const { error } = await supabase
        .from('videos')
        .update({ display_mode: newMode })
        .eq('id', video.id);
      if (error) throw error;
      toast.success(
        `✅ تم تغيير وضع العرض إلى ${
          newMode === 'platform' ? 'داخل المنصة (محمي)' : 'على YouTube (مفتوح)'
        }`
      );
      fetchVideos();
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
    if (selectedIds.length === filteredIndividualVideos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredIndividualVideos.map((v) => v.id));
    }
  };

  const handleAddVideo = () => {
    const url =
      courseId && courseId !== 'all'
        ? `/dashboard/teacher/videos/new?course_id=${courseId}`
        : '/dashboard/teacher/videos/new';
    router.push(url);
  };

  const handleExportVideos = () => {
    const data = filteredIndividualVideos.map((v) => ({
      title: v.title,
      description: v.description,
      course: courses[v.course_id] || 'بدون كورس',
      views: v.views || 0,
      published: v.is_published ? 'نعم' : 'لا',
      display_mode:
        (v.display_mode || 'platform') === 'platform' ? 'داخل المنصة' : 'YouTube',
      created_at: v.created_at,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `videos_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('✅ تم تصدير قائمة الفيديوهات');
  };

  // ===== دوال إدارة القوائم =====
  const handleAddPlaylist = () => {
    setEditingPlaylist(null);
    setIsPlaylistModalOpen(true);
  };

  const handleEditPlaylist = (playlist) => {
    setEditingPlaylist(playlist);
    setIsPlaylistModalOpen(true);
  };

  const handleDeletePlaylist = async (playlist) => {
    if (
      !window.confirm(
        `هل أنت متأكد من حذف القائمة "${playlist.title}"؟ سيتم نقل فيديوهاتها إلى الفيديوهات الفردية.`
      )
    )
      return;
    try {
      const { error } = await supabase
        .from('video_playlists')
        .delete()
        .eq('id', playlist.id);
      if (error) throw error;
      toast.success('✅ تم حذف القائمة');
      fetchVideos();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMoveVideo = async (videoId, targetPlaylistId) => {
    setIsMovingVideo(true);
    try {
      const { error } = await supabase
        .from('videos')
        .update({ playlist_id: targetPlaylistId })
        .eq('id', videoId);
      if (error) throw error;
      toast.success('✅ تم نقل الفيديو');
      fetchVideos();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsMovingVideo(false);
    }
  };

  // ===== قائمة الكورسات للفلترة =====
  const courseOptions = useMemo(() => {
    const uniqueCourses = {};
    videos.forEach((v) => {
      if (v.course_id && !uniqueCourses[v.course_id]) {
        uniqueCourses[v.course_id] = courses[v.course_id] || 'كورس غير معروف';
      }
    });
    // إضافة الكورسات من القوائم أيضاً
    playlists.forEach((p) => {
      if (p.course_id && !uniqueCourses[p.course_id]) {
        uniqueCourses[p.course_id] = courses[p.course_id] || 'كورس غير معروف';
      }
    });
    return Object.entries(uniqueCourses).map(([id, title]) => ({ id, title }));
  }, [videos, playlists, courses]);

  // ===== إحصائيات البطاقات =====
  const statsData = [
    {
      id: 1,
      label: 'إجمالي الفيديوهات',
      value: stats.total,
      suffix: '',
      icon: Icons.Video,
      color: 'from-blue-400 to-blue-600',
      delay: 0,
    },
    {
      id: 2,
      label: 'منشور',
      value: stats.published,
      suffix: '',
      icon: Icons.CheckCircle,
      color: 'from-green-400 to-green-600',
      delay: 0.1,
    },
    {
      id: 3,
      label: 'إجمالي المشاهدات',
      value: stats.totalViews,
      suffix: '',
      icon: Icons.Eye,
      color: 'from-purple-400 to-purple-600',
      delay: 0.2,
    },
    {
      id: 4,
      label: 'فيديوهات YouTube',
      value: stats.youtubeCount,
      suffix: '',
      icon: Icons.Video,
      color: 'from-red-400 to-red-600',
      delay: 0.3,
    },
    {
      id: 5,
      label: 'محمية (داخل المنصة)',
      value: stats.platformCount || 0,
      suffix: '',
      icon: Icons.Shield,
      color: 'from-yellow-400 to-yellow-600',
      delay: 0.4,
    },
    {
      id: 6,
      label: 'قوائم تشغيل',
      value: stats.playlistCount || 0,
      suffix: '',
      icon: Icons.Folder,
      color: 'from-pink-400 to-pink-600',
      delay: 0.5,
    },
  ];

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" />
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="relative">
        {/* ===== رأس الصفحة ===== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-white">
              📹 إدارة الفيديوهات
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              {courseId && courseId !== 'all'
                ? `فيديوهات الكورس: ${courses[courseId] || ''}`
                : 'جميع الفيديوهات'}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 mt-3 md:mt-0">
            {selectedIds.length > 0 && (
              <>
                {(!isAssistant ||
                  hasPermission(permissions, 'videos', 'can_delete')) && (
                  <button
                    onClick={() => setIsBatchDeleteModalOpen(true)}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-sm transition flex items-center gap-2"
                  >
                    <Icons.Trash2 className="h-4 w-4" /> حذف المحدد (
                    {selectedIds.length})
                  </button>
                )}
                {(!isAssistant ||
                  hasPermission(permissions, 'videos', 'can_publish')) && (
                  <button
                    onClick={handleBatchPublish}
                    className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl text-sm transition flex items-center gap-2"
                  >
                    <Icons.Eye className="h-4 w-4" /> نشر المحدد (
                    {selectedIds.length})
                  </button>
                )}
              </>
            )}
            <button
              onClick={handleExportVideos}
              className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-xl text-sm transition flex items-center gap-2"
            >
              <Icons.Download className="h-4 w-4" /> تصدير القائمة
            </button>
            {(!isAssistant ||
              hasPermission(permissions, 'playlists', 'can_create')) && (
              <button
                onClick={handleAddPlaylist}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl text-sm transition flex items-center gap-2"
              >
                <Icons.FolderPlus className="h-4 w-4" /> إضافة قائمة
              </button>
            )}
            {(!isAssistant ||
              hasPermission(permissions, 'videos', 'can_create')) && (
              <button
                onClick={handleAddVideo}
                className="px-6 py-2.5 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-bold rounded-xl hover:scale-[1.02] transition shadow-lg shadow-yellow-400/20 flex items-center gap-2"
              >
                <Icons.Plus className="h-5 w-5" /> إضافة فيديو
              </button>
            )}
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
              <Icons.AlertCircle className="h-5 w-5" />
              <span className="flex-1">{error}</span>
              <button
                onClick={() => setError('')}
                className="text-red-400/70 hover:text-red-400"
              >
                <Icons.X className="h-4 w-4" />
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
              <Icons.CheckCircle className="h-5 w-5" />
              <span className="flex-1">{success}</span>
              <button
                onClick={() => setSuccess('')}
                className="text-green-400/70 hover:text-green-400"
              >
                <Icons.X className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ===== الإحصائيات ===== */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {statsData.map((stat) => (
            <StatCard key={stat.id} stat={stat} />
          ))}
        </div>

        {/* ===== الرسم البياني ===== */}
        {chartData && (
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-5 mb-6">
            <h3 className="text-sm font-semibold text-white mb-4 text-center">
              أكثر الفيديوهات مشاهدة
            </h3>
            <div className="max-w-sm mx-auto h-48">
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
                      ticks: { color: '#fff' },
                      grid: { color: 'rgba(255,255,255,0.05)' },
                    },
                    x: {
                      ticks: { color: '#fff', font: { size: 10 } },
                      grid: { display: false },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {/* ===== الفلتر والبحث والترتيب ===== */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Icons.Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في الفيديوهات والقوائم (عنوان أو وصف)..."
              className="w-full p-2.5 pr-10 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
            />
          </div>
          <select
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
          >
            <option value="all">جميع الكورسات</option>
            {courseOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.title}
              </option>
            ))}
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
          >
            <option value="newest">الأحدث</option>
            <option value="oldest">الأقدم</option>
            <option value="views">الأكثر مشاهدة</option>
            <option value="title">العنوان</option>
          </select>
          <select
            value={filterDisplayMode}
            onChange={(e) => setFilterDisplayMode(e.target.value)}
            className="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-yellow-400/50 outline-none transition"
          >
            <option value="all">كل أوضاع العرض</option>
            <option value="platform">داخل المنصة 🔒</option>
            <option value="youtube">على YouTube 🌐</option>
          </select>
          {filteredIndividualVideos.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm transition"
            >
              {selectedIds.length === filteredIndividualVideos.length
                ? 'إلغاء الكل'
                : 'تحديد الكل'}
            </button>
          )}
        </div>

        {/* ===== المحتوى: القوائم + الفيديوهات الفردية ===== */}
        {filteredPlaylists.length === 0 && filteredIndividualVideos.length === 0 ? (
          <div className="text-center py-20 bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl">
            <Icons.Video className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white">
              {searchQuery || filterCourse !== 'all' || filterDisplayMode !== 'all'
                ? 'لا توجد نتائج تطابق البحث'
                : 'لا توجد فيديوهات أو قوائم بعد'}
            </h3>
            <p className="text-gray-400 text-sm mt-2">
              {searchQuery || filterCourse !== 'all' || filterDisplayMode !== 'all'
                ? 'حاول تغيير معايير البحث'
                : 'قم بإضافة أول فيديو أو قائمة تشغيل'}
            </p>
            {!searchQuery && filterCourse === 'all' && filterDisplayMode === 'all' && (
              <div className="flex flex-wrap gap-3 justify-center mt-4">
                {(!isAssistant ||
                  hasPermission(permissions, 'videos', 'can_create')) && (
                  <button
                    onClick={handleAddVideo}
                    className="px-6 py-2.5 bg-yellow-400/20 hover:bg-yellow-400/30 text-yellow-300 rounded-xl transition"
                  >
                    إضافة فيديو الآن
                  </button>
                )}
                {(!isAssistant ||
                  hasPermission(permissions, 'playlists', 'can_create')) && (
                  <button
                    onClick={handleAddPlaylist}
                    className="px-6 py-2.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-xl transition"
                  >
                    إضافة قائمة تشغيل
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* القوائم */}
            {filteredPlaylists.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Icons.Folder className="h-5 w-5 text-yellow-400" /> قوائم التشغيل (
                  {filteredPlaylists.length})
                </h2>
                <div className="space-y-3">
                  {filteredPlaylists.map((playlist) => (
                    <PlaylistCard
                      key={playlist.id}
                      playlist={playlist}
                      videos={videos}
                      onEditPlaylist={handleEditPlaylist}
                      onDeletePlaylist={handleDeletePlaylist}
                      onEditVideo={handleEdit}
                      onDeleteVideo={handleDeleteClick}
                      onMoveVideo={handleMoveVideo}
                      isMovingVideo={isMovingVideo}
                      permissions={permissions}
                      isAssistant={isAssistant}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* الفيديوهات الفردية */}
            {filteredIndividualVideos.length > 0 && (
              <div>
                <h2 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                  <Icons.Video className="h-5 w-5 text-blue-400" /> فيديوهات فردية (
                  {filteredIndividualVideos.length})
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {filteredIndividualVideos.map((video) => (
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
                      permissions={permissions}
                      isAssistant={isAssistant}
                      playlists={playlists}
                      onMoveVideo={handleMoveVideo}
                      isMovingVideo={isMovingVideo}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== نوافذ التأكيد ===== */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title={deleteTarget?.title}
      />

      <DeleteModal
        isOpen={isBatchDeleteModalOpen}
        onClose={() => setIsBatchDeleteModalOpen(false)}
        onConfirm={handleBatchDelete}
        count={selectedIds.length}
        isBatch={true}
      />

      {/* ===== مودال القائمة ===== */}
      <PlaylistModal
        isOpen={isPlaylistModalOpen}
        onClose={() => setIsPlaylistModalOpen(false)}
        onSuccess={fetchVideos}
        playlist={editingPlaylist}
        courseId={courseId && courseId !== 'all' ? courseId : null}
      />

      {/* ===== روابط سريعة ===== */}
      <div className="mt-6 bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4">
        <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
          <Icons.Link className="h-4 w-4 text-yellow-400" /> روابط سريعة
        </h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/dashboard/teacher"
            className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white"
          >
            الرئيسية
          </Link>
          <Link
            href="/dashboard/teacher/courses"
            className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white"
          >
            الكورسات
          </Link>
          <Link
            href="/dashboard/teacher/exams"
            className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white"
          >
            الامتحانات
          </Link>
          <Link
            href="/dashboard/teacher/books"
            className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white"
          >
            الكتب
          </Link>
          <Link
            href="/dashboard/teacher/students"
            className="text-xs bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition text-gray-300 hover:text-white"
          >
            الطلاب
          </Link>
          <Link
            href="/dashboard/teacher/question-bank"
            className="text-xs bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg transition text-purple-300 hover:text-purple-200"
          >
            بنوك الأسئلة
          </Link>
        </div>
      </div>
    </TeacherLayout>
  );
}