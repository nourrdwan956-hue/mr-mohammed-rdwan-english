'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useTheme } from '@/lib/hooks/useTheme';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  ChevronUp,
  ChevronDown,
  X,
  Save,
  FolderOpen,
  Video,
  ArrowLeft,
} from 'lucide-react';
import toast from 'react-hot-toast';

// مكون مساعد لعرض رسالة فارغة
const EmptyState = ({ message, icon: Icon }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <Icon className="w-16 h-16 text-gray-400 dark:text-gray-600 mb-4" />
    <p className="text-gray-500 dark:text-gray-400 text-lg">{message}</p>
  </div>
);

// مكون مودال بسيط
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
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>
        {children}
      </motion.div>
    </div>
  );
};

export default function TeacherPlaylistsPage() {
  const params = useParams();
  const courseId = params.id;
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // حالات الصفحة
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // حالات المودال
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingPlaylist, setEditingPlaylist] = useState(null);

  // حالات النماذج
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formOrder, setFormOrder] = useState(0);

  // منع التكرار
  const fetchedRef = useRef(false);

  // جلب القوائم
  const fetchPlaylists = useCallback(async () => {
    if (!courseId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/playlists?courseId=${courseId}`);
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في جلب القوائم');
      }
      setPlaylists(data.data || []);
    } catch (err) {
      console.error('Error fetching playlists:', err);
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    if (!fetchedRef.current && courseId) {
      fetchedRef.current = true;
      fetchPlaylists();
    }
  }, [courseId, fetchPlaylists]);

  // إنشاء قائمة جديدة
  const handleCreatePlaylist = async (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      toast.error('الرجاء إدخال عنوان القائمة');
      return;
    }

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          orderIndex: formOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في إنشاء القائمة');
      }
      toast.success('تم إنشاء القائمة بنجاح');
      setFormTitle('');
      setFormDescription('');
      setFormOrder(0);
      setIsCreateModalOpen(false);
      fetchPlaylists(); // تحديث القائمة
    } catch (err) {
      toast.error(err.message);
    }
  };

  // تعديل قائمة
  const handleEditPlaylist = async (e) => {
    e.preventDefault();
    if (!editingPlaylist) return;
    if (!formTitle.trim()) {
      toast.error('الرجاء إدخال عنوان القائمة');
      return;
    }

    try {
      const res = await fetch(`/api/playlists/${editingPlaylist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          orderIndex: formOrder,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في تحديث القائمة');
      }
      toast.success('تم تحديث القائمة بنجاح');
      setIsEditModalOpen(false);
      setEditingPlaylist(null);
      fetchPlaylists();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // حذف قائمة
  const handleDeletePlaylist = async (playlistId) => {
    if (!confirm('هل أنت متأكد من حذف هذه القائمة؟ سيتم نقل الفيديوهات المرتبطة بها إلى القسم الفردي.'))
      return;

    try {
      const res = await fetch(`/api/playlists/${playlistId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشل في حذف القائمة');
      }
      toast.success('تم حذف القائمة بنجاح');
      fetchPlaylists();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // تغيير ترتيب القائمة (رفع/خفض)
  const movePlaylist = async (playlistId, direction) => {
    const index = playlists.findIndex((p) => p.id === playlistId);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= playlists.length) return;

    // نسخ القائمة وتبديل الترتيب
    const updated = [...playlists];
    const [moved] = updated.splice(index, 1);
    updated.splice(newIndex, 0, moved);

    // تحديث order_index لكل قائمة بناءً على الموضع الجديد
    try {
      // إرسال طلبات تحديث لكل قائمة (أو يمكن تحديث الاثنين المتأثرين فقط)
      // لكن للبساطة، نحدث جميع القوائم بالترتيب الجديد
      for (let i = 0; i < updated.length; i++) {
        const p = updated[i];
        await fetch(`/api/playlists/${p.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderIndex: i }),
        });
      }
      // تحديث الحالة المحلية فوراً لتجنب إعادة الجلب
      setPlaylists(updated);
      toast.success('تم تحديث الترتيب بنجاح');
    } catch (err) {
      toast.error('فشل في تحديث الترتيب');
      fetchPlaylists(); // إعادة جلب لتصحيح الحالة
    }
  };

  // فتح مودال التعديل
  const openEditModal = (playlist) => {
    setEditingPlaylist(playlist);
    setFormTitle(playlist.title);
    setFormDescription(playlist.description || '');
    setFormOrder(playlist.order_index || 0);
    setIsEditModalOpen(true);
  };

  // إدارة فيديوهات القائمة
  const manageVideos = (playlistId) => {
    router.push(`/dashboard/teacher/playlists/${playlistId}/videos`);
  };

  // العودة إلى صفحة الكورس
  const goBack = () => {
    router.push(`/dashboard/teacher/courses/${courseId}`);
  };

  // تنسيق الألوان حسب الثيم
  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const cardBg = isDark ? 'bg-gray-800' : 'bg-white';
  const borderColor = isDark ? 'border-gray-700' : 'border-gray-200';
  const inputBg = isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
  const labelColor = isDark ? 'text-gray-300' : 'text-gray-700';

  return (
    <div className={`min-h-screen ${bg} ${text} p-6 transition-colors duration-300`}>
      {/* العنوان وشريط الإجراءات */}
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-3xl font-bold">إدارة قوائم التشغيل</h1>
          </div>
          <button
            onClick={() => {
              setFormTitle('');
              setFormDescription('');
              setFormOrder(playlists.length);
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow transition"
          >
            <Plus className="w-5 h-5" />
            إضافة قائمة جديدة
          </button>
        </div>

        {/* حالة التحميل */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        )}

        {/* عرض الأخطاء */}
        {error && !loading && (
          <div className="text-center py-8 text-red-500">
            <p>حدث خطأ: {error}</p>
            <button
              onClick={fetchPlaylists}
              className="mt-2 px-4 py-2 bg-amber-500 text-white rounded-lg"
            >
              إعادة المحاولة
            </button>
          </div>
        )}

        {/* قائمة القوائم */}
        {!loading && !error && (
          <>
            {playlists.length === 0 ? (
              <EmptyState
                message="لا توجد قوائم تشغيل حتى الآن. أضف أول قائمة!"
                icon={FolderOpen}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence>
                  {playlists.map((playlist, idx) => (
                    <motion.div
                      key={playlist.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className={`${cardBg} rounded-xl shadow-md p-5 border ${borderColor} flex flex-col`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold line-clamp-1">
                            {playlist.title}
                          </h3>
                          {playlist.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">
                              {playlist.description}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                            {playlist.videos?.length || 0} فيديو
                          </span>
                        </div>
                      </div>

                      {/* إحصائيات سريعة (عدد الفيديوهات) */}
                      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4">
                        <Video className="w-4 h-4" />
                        <span>
                          {playlist.videos?.length || 0} مقطع
                          {playlist.videos?.length !== 1 ? 'ات' : ''}
                        </span>
                      </div>

                      {/* أزرار التحكم */}
                      <div className="flex flex-wrap items-center gap-2 mt-auto pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => manageVideos(playlist.id)}
                          className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition"
                        >
                          <Video className="w-4 h-4" />
                          إدارة الفيديوهات
                        </button>

                        <button
                          onClick={() => openEditModal(playlist)}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4 text-amber-500" />
                        </button>

                        <button
                          onClick={() => handleDeletePlaylist(playlist.id)}
                          className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>

                        <div className="flex items-center gap-1 mr-auto">
                          <button
                            onClick={() => movePlaylist(playlist.id, 'up')}
                            disabled={idx === 0}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                              idx === 0 ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            title="رفع"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => movePlaylist(playlist.id, 'down')}
                            disabled={idx === playlists.length - 1}
                            className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ${
                              idx === playlists.length - 1 ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                            title="خفض"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </>
        )}
      </div>

      {/* ======== مودال إنشاء قائمة ======== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="قائمة تشغيل جديدة"
      >
        <form onSubmit={handleCreatePlaylist} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>
              عنوان القائمة *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              placeholder="مثال: أساسيات الرياضيات"
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>
              وصف القائمة (اختياري)
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows="3"
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              placeholder="وصف مختصر لمحتوى القائمة"
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>
              ترتيب القائمة
            </label>
            <input
              type="number"
              value={formOrder}
              onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              min="0"
            />
            <p className="text-xs text-gray-400 mt-1">
              القيم الأصغر تظهر أولاً. اتركها كما هي للإضافة في النهاية.
            </p>
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
              <Save className="w-4 h-4" />
              إنشاء
            </button>
          </div>
        </form>
      </Modal>

      {/* ======== مودال تعديل قائمة ======== */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingPlaylist(null);
        }}
        title="تعديل القائمة"
      >
        <form onSubmit={handleEditPlaylist} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>
              عنوان القائمة *
            </label>
            <input
              type="text"
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              required
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>
              وصف القائمة (اختياري)
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              rows="3"
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${labelColor} mb-1`}>
              ترتيب القائمة
            </label>
            <input
              type="number"
              value={formOrder}
              onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
              className={`w-full px-3 py-2 rounded-lg border ${inputBg} focus:ring-2 focus:ring-amber-500 outline-none transition`}
              min="0"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingPlaylist(null);
              }}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg shadow transition flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              حفظ التغييرات
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}