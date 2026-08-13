// lib/playlist-utils.js
import { createClient } from '@/lib/supabase/server';

/**
 * جلب جميع قوائم التشغيل الخاصة بكورس معين، مع فيديوهات كل قائمة
 */
export async function getCoursePlaylists(courseId) {
  try {
    const supabase = await createClient();
    const { data: playlists, error: playlistsError } = await supabase
      .from('playlists')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (playlistsError) throw playlistsError;
    if (!playlists || playlists.length === 0) {
      return { data: [], error: null };
    }

    const { data: videos, error: videosError } = await supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
      .not('playlist_id', 'is', null)
      .order('playlist_order', { ascending: true });

    if (videosError) throw videosError;

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
 */
export async function getPlaylistWithVideos(playlistId) {
  try {
    const supabase = await createClient();
    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .single();

    if (playlistError) throw playlistError;

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
 * حذف قائمة تشغيل بالكامل (مع تحديث الفيديوهات إلى NULL)
 */
export async function deletePlaylist(playlistId) {
  try {
    const supabase = await createClient();

    // جلب القائمة للحصول على course_id
    const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('course_id, order_index')
      .eq('id', playlistId)
      .single();

    if (fetchError) throw fetchError;

    // حذف من video_playlists أولاً لتجنب انتهاك القيد
    const { error: vpDeleteError } = await supabase
      .from('video_playlists')
      .delete()
      .eq('id', playlistId);

    if (vpDeleteError) {
      console.error('Error deleting from video_playlists:', vpDeleteError);
      // نستمر حتى لو فشل الحذف من video_playlists
    }

    // حذف من playlists
    const { error: deleteError } = await supabase
      .from('playlists')
      .delete()
      .eq('id', playlistId);

    if (deleteError) throw deleteError;

    // إعادة ترتيب القوائم المتبقية
    const { data: remainingPlaylists, error: remainingError } = await supabase
      .from('playlists')
      .select('id, order_index')
      .eq('course_id', playlist.course_id)
      .order('order_index', { ascending: true });

    if (remainingError) throw remainingError;

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
 * التحقق من أن المستخدم الحالي هو مالك الكورس (المعلم)
 */
export async function verifyCourseOwnership(userId, courseId) {
  try {
    const supabase = await createClient();
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError) throw courseError;

    if (course.teacher_id === userId) {
      return { isAuthorized: true, error: null };
    }

    return { isAuthorized: false, error: 'غير مصرح لك بإدارة هذا الكورس' };
  } catch (error) {
    console.error('Error in verifyCourseOwnership:', error);
    return { isAuthorized: false, error: error.message };
  }
}

/**
 * التأكد من وجود playlist_id في جدول video_playlists مع البيانات الكاملة
 * إذا لم يكن موجوداً، يتم جلب البيانات من playlists وإدراجها في video_playlists
 * @param {SupabaseClient} supabase
 * @param {string} playlistId
 * @returns {Promise<boolean>}
 */
export async function ensurePlaylistInVideoPlaylists(supabase, playlistId) {
  try {
    // 1. التحقق من وجود القائمة في video_playlists
    const { data: existing, error: checkError } = await supabase
      .from('video_playlists')
      .select('id')
      .eq('id', playlistId)
      .maybeSingle();

    if (checkError) {
      console.error('❌ Error checking video_playlists:', checkError);
      return false;
    }

    if (existing) {
      return true; // موجود بالفعل
    }

    // 2. جلب بيانات القائمة من playlists
    const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('*')
      .eq('id', playlistId)
      .single();

    if (fetchError || !playlist) {
      console.error('❌ Could not fetch playlist from playlists:', fetchError);
      return false;
    }

    // 3. إدراج البيانات في video_playlists (مع كل الأعمدة المطلوبة)
    const { error: insertError } = await supabase
      .from('video_playlists')
      .insert({
        id: playlist.id,
        title: playlist.title,
        description: playlist.description,
        course_id: playlist.course_id,
        order_index: playlist.order_index,
        is_active: playlist.is_active ?? true,
        created_at: playlist.created_at || new Date().toISOString(),
        updated_at: playlist.updated_at || new Date().toISOString(),
        // في حالة وجود أعمدة أخرى، أضفها هنا
      });

    if (insertError) {
      console.error('❌ Error inserting into video_playlists:', insertError);
      return false;
    }

    console.log(`✅ Inserted playlist ${playlistId} into video_playlists with full data`);
    return true;
  } catch (error) {
    console.error('❌ Error in ensurePlaylistInVideoPlaylists:', error);
    return false;
  }
}