// /app/api/videos/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCourseOwnership, getNextPlaylistOrder } from '@/lib/playlist-utils';

// ============================================================
// GET: جلب فيديوهات الكورس
// ============================================================
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

// ============================================================
// POST: إضافة فيديو جديد
// ============================================================
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

    console.log('📝 POST /api/videos - Received data:', {
      courseId,
      title,
      playlistId,
      playlistOrder,
    });

    // التحقق من البيانات الأساسية
    if (!courseId || !title || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'البيانات الأساسية للفيديو مطلوبة' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // التحقق من صلاحية المعلم
    const { isAuthorized, error: authzError } = await verifyCourseOwnership(user.id, courseId);
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك' },
        { status: 403 }
      );
    }

    // ✅ معالجة playlistId بشكل آمن
    let finalPlaylistId = null;
    if (playlistId && playlistId !== 'undefined' && playlistId !== 'null' && playlistId.trim() !== '') {
      // التحقق من صيغة UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playlistId)) {
        console.warn('⚠️ Invalid playlistId format:', playlistId);
        // لا نعيد خطأ، بل نعتبر الفيديو فردياً (نضع null)
        finalPlaylistId = null;
      } else {
        // التحقق من وجود القائمة في قاعدة البيانات
        const { data: playlistExists, error: checkError } = await supabase
          .from('playlists')
          .select('id')
          .eq('id', playlistId)
          .maybeSingle();

        if (checkError) {
          console.error('Error checking playlist existence:', checkError);
        }

        if (!playlistExists) {
          console.warn('⚠️ Playlist not found:', playlistId);
          // القائمة غير موجودة، نعتبر الفيديو فردياً
          finalPlaylistId = null;
        } else {
          finalPlaylistId = playlistId;
        }
      }
    }

    // حساب الترتيب إذا كانت القائمة موجودة
    let finalPlaylistOrder = playlistOrder !== undefined ? playlistOrder : null;
    if (finalPlaylistId && (finalPlaylistOrder === null || finalPlaylistOrder === undefined)) {
      finalPlaylistOrder = await getNextPlaylistOrder(finalPlaylistId);
    }

    // تجهيز بيانات الفيديو
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

    console.log('📝 Inserting video with data:', videoData);

    const { data, error } = await supabase
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'فشل إضافة الفيديو' },
        { status: 500 }
      );
    }

    console.log('✅ Video inserted successfully:', data.id);
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

// ============================================================
// DELETE: حذف فيديو
// ============================================================
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