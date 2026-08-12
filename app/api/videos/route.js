// /app/api/videos/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { verifyCourseOwnership, getNextPlaylistOrder } from '@/lib/playlist-utils';

// GET: جلب فيديوهات الكورس (مع إمكانية تصفية غير المرتبطة بقوائم)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const unassigned = searchParams.get('unassigned') === 'true';

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس مطلوب' },
        { status: 400 }
      );
    }

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
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (unassigned) {
      query = query.is('playlist_id', null);
    }

    const { data, error } = await query;

    if (error) {
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

// POST: إضافة فيديو جديد (مع دعم playlist_id و playlist_order)
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

    if (!courseId || !title?.trim() || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'البيانات الأساسية للفيديو مطلوبة' },
        { status: 400 }
      );
    }

    // التحقق من الصلاحية
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

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

    // تجهيز البيانات
    const videoData = {
      course_id: courseId,
      title: title.trim(),
      description: description?.trim() || null,
      video_url: videoUrl,
      display_mode: displayMode || 'platform',
      duration: duration || 0,
      playlist_id: playlistId || null,
      playlist_order: playlistOrder !== undefined ? playlistOrder : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // حساب الترتيب التلقائي إذا لم يُقدم
    if (playlistId && (playlistOrder === undefined || playlistOrder === null)) {
      videoData.playlist_order = await getNextPlaylistOrder(playlistId);
    }

    const { data, error } = await supabase
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
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