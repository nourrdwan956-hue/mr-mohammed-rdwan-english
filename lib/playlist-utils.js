// /lib/playlist-utils.js
import { createClient } from '@/lib/supabase/server';

/**
 * جلب جميع قوائم التشغيل الخاصة بكورس معين، مع فيديوهات كل قائمة
 * @param {string} courseId - ID الكورس
 * @returns {Promise<{ data: any[] | null, error: any }>}
 */
export async function getCoursePlaylists(courseId) {
  try {
    const supabase = await createClient();

    // 1. جلب القوائم مرتبة حسب order_index
    const { data: playlists, error: playlistsError } = await supabase
      .from('playlists')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (playlistsError) throw playlistsError;
    if (!playlists || playlists.length === 0) {
      return { data: [], error: null };
    }

    // 2. جلب الفيديوهات الخاصة بهذه القوائم (كل الفيديوهات في الكورس)
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
      .not('playlist_id', 'is', null) // فقط الفيديوهات المرتبطة بقوائم
      .order('playlist_order', { ascending: true });

    if (videosError) throw videosError;

    // 3. دمج الفيديوهات مع القوائم (تجميعها داخل كل قائمة)
    const playlistsWithVideos = playlists.map((playlist) => ({
      ...playlist,
      videos: videos?.filter((video) => video.playlist_id === playlist.id) || [],
    }));

    return { data: playlistsWithVideos, error: null };
  } catch (error) {
    console.error('Error in getCoursePlaylists:', error);
    return { data: null, error: error.message };
  }
}

/**
 * جلب قائمة واحدة مع فيديوهاتها
 * @param {string} playlistId - ID القائمة
 * @returns {Promise<{ data: any | null, error: any }>}
 */
export async function getPlaylistWithVideos(playlistId) {
  try {
    const supabase = await createClient();

    // جلب القائمة
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .single();

    if (playlistError) throw playlistError;

    // جلب فيديوهاتها
    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('playlist_order', { ascending: true });

    if (videosError) throw videosError;

    return {
      data: {
        ...playlist,
        videos: videos || [],
      },
      error: null,
    };
  } catch (error) {
    console.error('Error in getPlaylistWithVideos:', error);
    return { data: null, error: error.message };
  }
}

/**
 * الحصول على الترتيب التالي لفيديو جديد في قائمة معينة
 * @param {string} playlistId
 * @returns {Promise<number>}
 */
export async function getNextPlaylistOrder(playlistId) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('videos')
      .select('playlist_order')
      .eq('playlist_id', playlistId)
      .order('playlist_order', { ascending: false })
      .limit(1);

    if (error) throw error;
    if (!data || data.length === 0) return 0;
    return (data[0]?.playlist_order || 0) + 1;
  } catch (error) {
    console.error('Error in getNextPlaylistOrder:', error);
    return 0;
  }
}

/**
 * إضافة فيديو إلى قائمة (أو تحديث ترتيبه)
 * @param {string} videoId
 * @param {string} playlistId
 * @param {number} order - (اختياري) لو مش متاح، هنحسبه تلقائياً
 */
export async function addVideoToPlaylist(videoId, playlistId, order = null) {
  try {
    const supabase = await createClient();

    let finalOrder = order;
    if (finalOrder === null || finalOrder === undefined) {
      finalOrder = await getNextPlaylistOrder(playlistId);
    }

    const { data, error } = await supabase
      .from('videos')
      .update({
        playlist_id: playlistId,
        playlist_order: finalOrder,
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error in addVideoToPlaylist:', error);
    return { data: null, error: error.message };
  }
}

/**
 * إزالة فيديو من قائمة (جعله فردياً)
 * @param {string} videoId
 */
export async function removeVideoFromPlaylist(videoId) {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('videos')
      .update({
        playlist_id: null,
        playlist_order: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', videoId)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error in removeVideoFromPlaylist:', error);
    return { data: null, error: error.message };
  }
}

/**
 * حذف قائمة تشغيل بالكامل (مع تحديث الفيديوهات إلى NULL تلقائياً في قاعدة البيانات بفضل ON DELETE SET NULL)
 * @param {string} playlistId
 */
export async function deletePlaylist(playlistId) {
  try {
    const supabase = await createClient();

    // أولاً نجيب القائمة عشان نعرف الـ course_id عشان نعيد ترتيب القوائم المتبقية
    const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('course_id, order_index')
      .eq('id', playlistId)
      .single();

    if (fetchError) throw fetchError;

    // حذف القائمة (الفيديوهات هتاخد NULL تلقائياً)
    const { error: deleteError } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (deleteError) throw deleteError;

    // إعادة ترتيب القوائم المتبقية في نفس الكورس (عشان مفيش فجوات في order_index)
    const { data: remainingPlaylists, error: remainingError } = await supabase
      .from('playlists')
      .select('id, order_index')
      .eq('course_id', playlist.course_id)
      .order('order_index', { ascending: true });

    if (remainingError) throw remainingError;

    // تحديث ترتيب القوائم المتبقية بشكل متسلسل
    for (let i = 0; i < remainingPlaylists.length; i++) {
      await supabase
        .from('playlists')
        .update({ order_index: i })
        .eq('id', remainingPlaylists[i].id);
    }

    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error in deletePlaylist:', error);
    return { data: null, error: error.message };
  }
}

/**
 * التحقق من أن المستخدم الحالي هو مالك الكورس (أو مساعد بصلاحية)
 * @param {string} userId
 * @param {string} courseId
 * @returns {Promise<{ isAuthorized: boolean, error: any }>}
 */
export async function verifyCourseOwnership(userId, courseId) {
  try {
    const supabase = await createClient();

    // 1. نفحص هل اليوزر هو صاحب الكورس (المعلم)
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    if (course.teacher_id === userId) {
      return { isAuthorized: true, error: null };
    }

    // 2. نفحص هل هو مساعد له صلاحية على هذا الكورس
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id, permissions')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (assistantError && assistantError.code !== 'PGRST116') {
      // PGRST116 = not found
      throw assistantError;
    }

    if (assistant && assistant.permissions?.can_manage_content === true) {
      return { isAuthorized: true, error: null };
    }

    return { isAuthorized: false, error: 'غير مصرح لك بإدارة هذا الكورس' };
  } catch (error) {
    console.error('Error in verifyCourseOwnership:', error);
    return { isAuthorized: false, error: error.message };
  }
}