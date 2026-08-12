// /app/api/videos/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCourseOwnership, getNextPlaylistOrder } from '@/lib/playlist-utils';

// ============================================================
// GET: جلب فيديوهات الكورس (مع دعم التصفية حسب القائمة أو الفردية)
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

    // التحقق من تسجيل الدخول
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
      // فيديوهات غير مرتبطة بأي قائمة (playlist_id IS NULL)
      query = query.is('playlist_id', null);
    } else if (playlistId) {
      // فيديوهات تخص قائمة معينة (مرتبة حسب الترتيب داخل القائمة)
      query = query.eq('playlist_id', playlistId).order('playlist_order', { ascending: true });
    } else {
      // كل الفيديوهات (مرتبة حسب order_index القديم للحفاظ على التوافق مع النظام القديم)
      query = query.order('order_index', { ascending: true });
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error in GET /api/videos:', error);
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
// POST: إضافة فيديو جديد (للمعلم أو المساعد فقط)
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

    // التحقق من البيانات الأساسية
    if (!courseId || !title || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'البيانات الأساسية للفيديو مطلوبة' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // التحقق من صلاحية المعلم أو المساعد على هذا الكورس
    const { isAuthorized, error: authzError } = await verifyCourseOwnership(
      user.id,
      courseId
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك' },
        { status: 403 }
      );
    }

    // ✅ التحقق من صحة playlistId إذا كان موجوداً
    let finalPlaylistId = null;
    if (playlistId) {
      // 1. التحقق من صيغة UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(playlistId)) {
        return NextResponse.json(
          { success: false, error: 'معرف القائمة غير صالح' },
          { status: 400 }
        );
      }

      // 2. التحقق من وجود القائمة في قاعدة البيانات
      const { data: playlistExists, error: checkError } = await supabase
        .from('playlists')
        .select('id')
        .eq('id', playlistId)
        .maybeSingle();

      if (checkError || !playlistExists) {
        return NextResponse.json(
          { success: false, error: 'القائمة غير موجودة أو تم حذفها' },
          { status: 400 }
        );
      }

      finalPlaylistId = playlistId;
    }

    // حساب الترتيب التالي إذا كانت القائمة موجودة
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

    const { data, error } = await supabase
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error in POST /api/videos:', error);
      // إرجاع خطأ JSON بدلاً من HTML
      return NextResponse.json(
        { success: false, error: error.message || 'فشل إضافة الفيديو' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'تم إضافة الفيديو بنجاح',
    });
  } catch (error) {
    console.error('POST /api/videos error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE: حذف فيديو (للمعلم أو المساعد فقط)
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

    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // جلب الفيديو للتأكد من وجوده والحصول على course_id
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

    // التحقق من صلاحية المعلم/المساعد
    const { isAuthorized, error: authzError } = await verifyCourseOwnership(
      user.id,
      video.course_id
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك بحذف هذا الفيديو' },
        { status: 403 }
      );
    }

    // حذف الفيديو
    const { error } = await supabase.from('videos').delete().eq('id', videoId);

    if (error) {
      console.error('Supabase delete error in DELETE /api/videos:', error);
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