// app/api/videos/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCourseOwnership, getNextPlaylistOrder } from '@/lib/playlist-utils';

// ===================== دالة مساعدة للتأكد من وجود القائمة في video_playlists =====================
async function ensurePlaylistInVideoPlaylists(supabase, playlistId) {
  // التحقق من وجود القائمة في video_playlists
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

  // إذا غير موجود، نقوم بإدراجه
  const { error: insertError } = await supabase
    .from('video_playlists')
    .insert({ id: playlistId });

  if (insertError) {
    console.error('❌ Error inserting into video_playlists:', insertError);
    return false;
  }

  console.log(`✅ Inserted playlist ${playlistId} into video_playlists`);
  return true;
}

// ===================== GET =====================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const unassigned = searchParams.get('unassigned') === 'true';
    const playlistId = searchParams.get('playlistId');

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس مطلوب' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    let query = supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId);

    if (unassigned) {
      query = query.is('playlist_id', null);
    } else if (playlistId) {
      query = query.eq('playlist_id', playlistId).order('playlist_order', { ascending: true });
    } else {
      query = query.order('order_index', { ascending: true });
    }

    const { data, error } = await query;
    if (error) {
      console.error('GET /api/videos error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/videos error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ===================== POST (معدل) =====================
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      courseId,
      title,
      description,
      videoUrl,
      displayMode,
      duration,
      playlistId,
      playlistOrder,
    } = body;

    console.log('📥 POST /api/videos - playlistId received:', {
      value: playlistId,
      type: typeof playlistId,
    });

    if (!courseId || !title || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'البيانات الأساسية للفيديو مطلوبة' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    const { isAuthorized, error: authzError } = await verifyCourseOwnership(user.id, courseId);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك' },
        { status: 403 }
      );
    }

    // ===================== معالجة playlistId =====================
    let finalPlaylistId = null;
    let finalPlaylistOrder = playlistOrder !== undefined ? playlistOrder : null;

    if (playlistId !== undefined && playlistId !== null && String(playlistId).trim() !== '') {
      const idStr = String(playlistId).trim();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(idStr)) {
        console.warn(`⚠️ Invalid UUID format: "${idStr}" — Setting playlist_id to NULL`);
        finalPlaylistId = null;
      } else {
        // 1. التحقق من وجود القائمة في playlists
        const { data: playlist, error: pError } = await supabase
          .from('playlists')
          .select('id')
          .eq('id', idStr)
          .maybeSingle();

        if (pError || !playlist) {
          console.warn(`⚠️ Playlist not found in playlists: "${idStr}" — setting to NULL`);
          finalPlaylistId = null;
        } else {
          // 2. التأكد من وجودها في video_playlists (وإنشائها إذا لزم الأمر)
          const ensured = await ensurePlaylistInVideoPlaylists(supabase, idStr);
          if (ensured) {
            finalPlaylistId = idStr;
            console.log(`✅ Playlist ${finalPlaylistId} is ready in video_playlists`);
          } else {
            console.warn(`⚠️ Could not ensure playlist in video_playlists — setting to NULL`);
            finalPlaylistId = null;
          }
        }
      }
    } else {
      console.log('ℹ️ No valid playlistId — video will be individual (playlist_id = NULL)');
    }

    if (finalPlaylistId && (finalPlaylistOrder === null || finalPlaylistOrder === undefined)) {
      finalPlaylistOrder = await getNextPlaylistOrder(finalPlaylistId);
    }

    const videoData = {
      course_id: courseId,
      title: title.trim(),
      description: description?.trim() || null,
      video_url: videoUrl,
      display_mode: displayMode || 'platform',
      duration: duration || 0,
      playlist_id: finalPlaylistId,
      playlist_order: finalPlaylistOrder,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('📝 Final videoData to insert:', JSON.stringify(videoData, null, 2));

    const { data, error } = await supabase
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return NextResponse.json(
        { 
          success: false, 
          error: error.message || 'فشل إضافة الفيديو',
          details: {
            code: error.code,
            hint: error.hint,
            playlistId_sent: finalPlaylistId,
          }
        },
        { status: 500 }
      );
    }

    console.log(`✅ Video inserted successfully, ID: ${data.id}`);
    return NextResponse.json({
      success: true,
      data,
      message: 'تم إضافة الفيديو بنجاح',
    });
  } catch (error) {
    console.error('❌ POST /api/videos error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ===================== DELETE =====================
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const videoId = searchParams.get('id');

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'معرف الفيديو مطلوب' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    const { data: video, error: fetchError } = await supabase
      .from('videos')
      .select('id, course_id')
      .eq('id', videoId)
      .single();

    if (fetchError || !video) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    const { isAuthorized, error: authzError } = await verifyCourseOwnership(user.id, video.course_id);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك بحذف هذا الفيديو' },
        { status: 403 }
      );
    }

    const { error } = await supabase.from('videos').delete().eq('id', videoId);
    if (error) {
      console.error('DELETE /api/videos error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'فشل حذف الفيديو' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الفيديو بنجاح',
    });
  } catch (error) {
    console.error('DELETE /api/videos error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}