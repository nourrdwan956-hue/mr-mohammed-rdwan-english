'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useTheme } from '@/lib/hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Save,
  Video,
  ListVideo,
  GripVertical,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold dark:text-white">{title}</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

const VideoItem = ({ video, index, total, onMoveUp, onMoveDown, onRemove, isDark }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`flex items-center gap-3 p-3 rounded-lg border ${
        isDark ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'
      } shadow-sm hover:shadow-md transition`}
    >
      <div className="flex items-center gap-2">
        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400 w-6">{index + 1}</span>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium truncate">{video.title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {video.duration ? `المدة: ${video.duration}s` : 'بدون مدة'}
        </p>
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onMoveUp(index)}
          disabled={index === 0}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
            index === 0 ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          title="رفع"
        >
          <ChevronUp className="w-4 h-4" />
        </button>
        <button
          onClick={() => onMoveDown(index)}
          disabled={index === total - 1}
          className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
            index === total - 1 ? 'opacity-40 cursor-not-allowed' : ''
          }`}
          title="خفض"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
        <button
          onClick={() => onRemove(video.id)}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 transition"
          title="إزالة من القائمة"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
};

export default function TeacherPlaylistVideosPage() {
  const params = useParams();
  // ⚠️ هام: إذا كان اسم مجلد الـ playlistId هو [id] فاستخدم params.id
  // const playlistId = params?.id;
  const playlistId = params?.playlistId; // الافتراضي [playlistId]
  
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [playlist, setPlaylist] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const [availableVideos, setAvailableVideos] = useState([]);
  const [selectedVideoId, setSelectedVideoId] = useState('');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoDisplayMode, setNewVideoDisplayMode] = useState('platform');

  const fetchedRef = useRef(false);

  const fetchPlaylistData = useCallback(async () => {
    if (!playlistId) {
      setLoading(false);
      setError('معرف القائمة غير موجود');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists/${playlistId}`);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'فشل في جلب بيانات القائمة');
      }
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'فشل في جلب بيانات القائمة');
      setPlaylist(data.data);
      setVideos(data.data.videos || []);
    } catch (err) {
      console.error('Error fetching playlist:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [playlistId]);

  const fetchAvailableVideos = useCallback(async () => {
    if (!playlist) return;
    try {
      const res = await fetch(`/api/videos?courseId=${playlist.course_id}&unassigned=true`);
      if (!res.ok) throw new Error('فشل في جلب الفيديوهات المتاحة');
      const data = await res.json();
      if (data.success) setAvailableVideos(data.data || []);
      else setAvailableVideos([]);
    } catch (err) {
      console.error('Error fetching available videos:', err);
      setAvailableVideos([]);
    }
  }, [playlist]);

  useEffect(() => {
    if (playlistId && !fetchedRef.current) {
      fetchedRef.current = true;
      fetchPlaylistData();
    }
    if (!playlistId) {
      setLoading(false);
      setError('معرف القائمة غير موجود');
    }
  }, [playlistId, fetchPlaylistData]);

  useEffect(() => {
    if (playlist) fetchAvailableVideos();
  }, [playlist, fetchAvailableVideos]);

  const handleMoveVideo = async (index, direction) => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= videos.length) return;
    const updated = [...videos];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);
    try {
      for (let i = 0; i < updated.length; i++) {
        const video = updated[i];
        const res = await fetch(`/api/videos/${video.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playlistOrder: i }),
        });
        if (!res.ok) throw new Error('فشل تحديث الترتيب');
      }
      setVideos(updated);
      toast.success('تم تحديث ترتيب الفيديوهات');
    } catch (err) {
      toast.error('فشل في تحديث الترتيب');
      fetchPlaylistData();
    }
  };

  const handleRemoveVideo = async (videoId) => {
    if (!confirm('هل أنت متأكد من إزالة هذا الفيديو من القائمة؟ سيصبح فيديو فردياً.')) return;
    try {
      const res = await fetch(`/api/videos/${videoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playlistId: null }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل في إزالة الفيديو');
      }
      toast.success('تم إزالة الفيديو من القائمة');
      setVideos((prev) => prev.filter((v) => v.id !== videoId));
      fetchAvailableVideos();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleAddExistingVideo = async (e) => {
    e.preventDefault();
    if (!selectedVideoId) {
      toast.error('الرجاء اختيار فيديو');
      return;
    }
    try {
      const nextOrder = videos.length;
      const res = await fetch(`/api/videos/${selectedVideoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playlistId: playlistId,
          playlistOrder: nextOrder,
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'فشل في إضافة الفيديو');
      }
      toast.success('تم إضافة الفيديو إلى القائمة');
      setSelectedVideoId('');
      setIsAddModalOpen(false);
      fetchPlaylistData();
      fetchAvailableVideos();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateVideo = async (e) => {
    e.preventDefault();
    if (!newVideoTitle.trim() || !newVideoUrl.trim()) {
      toast.error('العنوان ورابط الفيديو مطلوبان');
      return;
    }

    if (!playlistId) {
      toast.error('معرف القائمة غير صالح');
      return;
    }

    // تسجيل القيمة المرسلة
    console.log('🔍 Sending playlistId to API:', playlistId);
    console.log('🔍 Type:', typeof playlistId);

    try {
      const payload = {
        courseId: playlist.course_id,
        title: newVideoTitle.trim(),
        description: newVideoDescription.trim() || null,
        videoUrl: newVideoUrl.trim(),
        displayMode: newVideoDisplayMode,
        duration: 0,
        playlistId: playlistId, // سيكون إما null أو UUID صالح
        playlistOrder: videos.length,
      };
      console.log('📦 Full payload:', payload);

      const res = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error('حدث خطأ في الخادم، يرجى المحاولة مرة أخرى');
      }

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في إنشاء الفيديو');
      }

      toast.success('تم إنشاء الفيديو وإضافته إلى القائمة');
      setNewVideoTitle('');
      setNewVideoDescription('');
      setNewVideoUrl('');
      setNewVideoDisplayMode('platform');
      setIsCreateModalOpen(false);
      fetchPlaylistData();
      fetchAvailableVideos();
    } catch (err) {
      console.error('❌ Create video error:', err);
      toast.error(err.message || 'حدث خطأ أثناء إنشاء الفيديو');
    }
  };

  const goBack = () => {
    if (playlist?.course_id) {
      router.push(`/dashboard/teacher/courses/${playlist.course_id}/playlists`);
    } else {
      router.push('/dashboard/teacher/courses');
    }
  };

  // تعريف الألوان حسب الثيم
  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';

  if (!playlistId) {
    return (
      <div className={`min-h-screen ${bg} ${text} p-6 flex items-center justify-center`}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">معرف القائمة غير موجود</h2>
          <p className="text-gray-500 dark:text-gray-400 mb-4">تأكد من أن الرابط صحيح، أو عد إلى قائمة القوائم.</p>
          <button
            onClick={() => router.push('/dashboard/teacher/courses')}
            className="px-4 py-2 bg-amber-500 text-white rounded-lg shadow hover:bg-amber-600 transition"
          >
            العودة إلى الكورسات
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className={`min-h-screen ${bg} flex items-center justify-center`}>
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <p className="text-xl font-semibold text-red-500">{error || 'القائمة غير موجودة'}</p>
          <button onClick={goBack} className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-lg">
            العودة إلى القوائم
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${bg} ${text} p-6 transition-colors duration-300`}>
      <div className="max-w-5xl mx-auto">
        {/* شريط العنوان */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button onClick={goBack} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-2xl font-bold">{playlist.title}</h1>
              {playlist.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400">{playlist.description}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedVideoId('');
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg shadow transition"
            >
              <Plus className="w-5 h-5" /> إضافة فيديو موجود
            </button>
            <button
              onClick={() => {
                setNewVideoTitle('');
                setNewVideoDescription('');
                setNewVideoUrl('');
                setNewVideoDisplayMode('platform');
                setIsCreateModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow transition"
            >
              <Plus className="w-5 h-5" /> فيديو جديد
            </button>
          </div>
        </div>

        {/* إحصائيات سريعة */}
        <div className={`${cardBg} rounded-lg p-4 mb-6 border ${borderColor}`}>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Video className="w-5 h-5 text-amber-500" />
              <span className="font-medium">{videos.length} فيديو</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <ListVideo className="w-4 h-4" />
              <span>القائمة: {playlist.title}</span>
            </div>
          </div>
        </div>

        {/* قائمة الفيديوهات */}
        {videos.length === 0 ? (
          <div className="text-center py-16">
            <Video className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400 text-lg">لا توجد فيديوهات في هذه القائمة</p>
            <p className="text-sm text-gray-400 mt-1">أضف فيديوهات باستخدام الأزرار أعلاه</p>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {videos.map((video, idx) => (
                <VideoItem
                  key={video.id}
                  video={video}
                  index={idx}
                  total={videos.length}
                  onMoveUp={(i) => handleMoveVideo(i, 'up')}
                  onMoveDown={(i) => handleMoveVideo(i, 'down')}
                  onRemove={handleRemoveVideo}
                  isDark={isDark}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
          <ExternalLink className="inline-block w-4 h-4 mr-1" />
          يتم عرض هذه القائمة للطلاب في صفحة الكورس
        </div>
      </div>

      {/* مودال إضافة فيديو موجود */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="إضافة فيديو موجود إلى القائمة">
        <form onSubmit={handleAddExistingVideo} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>اختر فيديو من الكورس *</label>
            <select
              value={selectedVideoId}
              onChange={(e) => setSelectedVideoId(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              required
            >
              <option value="">-- اختر فيديو --</option>
              {availableVideos.map((video) => (
                <option key={video.id} value={video.id}>
                  {video.title}
                </option>
              ))}
            </select>
            {availableVideos.length === 0 && (
              <p className="text-xs text-amber-500 mt-1">لا توجد فيديوهات فردية متاحة. يمكنك إنشاء فيديو جديد.</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={availableVideos.length === 0}
              className={`px-4 py-2 bg-blue-500 text-white rounded-lg shadow transition flex items-center gap-2 ${
                availableVideos.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-600'
              }`}
            >
              <Plus className="w-4 h-4" /> إضافة
            </button>
          </div>
        </form>
      </Modal>

      {/* مودال إنشاء فيديو جديد */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="إنشاء فيديو جديد وإضافته للقائمة">
        <form onSubmit={handleCreateVideo} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>عنوان الفيديو *</label>
            <input
              type="text"
              value={newVideoTitle}
              onChange={(e) => setNewVideoTitle(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              placeholder="مثال: الدرس الأول"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>الوصف (اختياري)</label>
            <textarea
              value={newVideoDescription}
              onChange={(e) => setNewVideoDescription(e.target.value)}
              rows="2"
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              placeholder="وصف مختصر"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>رابط الفيديو *</label>
            <input
              type="url"
              value={newVideoUrl}
              onChange={(e) => setNewVideoUrl(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              placeholder="https://example.com/video.mp4"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>وضع العرض</label>
            <select
              value={newVideoDisplayMode}
              onChange={(e) => setNewVideoDisplayMode(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
            >
              <option value="platform">مشغل المنصة</option>
              <option value="youtube">YouTube (رابط خارجي)</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" /> إنشاء وإضافة
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}