// /app/api/videos/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabaseClient';
import { verifyCourseOwnership } from '@/lib/playlist-utils'; // استيراد دالة التحقق من الصلاحية (موجودة في playlist-utils)
import { getNextPlaylistOrder } from '@/lib/playlist-utils';

// GET: جلب فيديوهات الكورس (مع إمكانية تصفية حسب القائمة)
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const playlistId = searchParams.get('playlistId'); // اختياري: لو عايز فيديوهات قائمة معينة

    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من تسجيل الدخول
    const supabaseClient = createRouteHandlerClient({ cookies });
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    // بناء الاستعلام
    let query = supabase
      .from('videos')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    // تصفية حسب playlistId لو موجود
    if (playlistId) {
      query = query.eq('playlist_id', playlistId);
    } else if (playlistId === null || playlistId === 'null') {
      // لو playlistId = null، نجيب الفيديوهات الفردية فقط
      query = query.is('playlist_id', null);
    }
    // لو playlistId مش موجود خالص، نجيب كل فيديوهات الكورس (القوائم والفردي)

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

// POST: إضافة فيديو جديد (مع دعم القوائم)
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      courseId,
      title,
      description,
      videoUrl,
      displayMode = 'platform',
      duration = 0,
      // الحقول الجديدة للقوائم ↓
      playlistId = null,
      playlistOrder = null,
    } = body;

    // التحقق من البيانات الإلزامية
    if (!courseId || !title || !videoUrl) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس، العنوان، ورابط الفيديو مطلوبة' },
        { status: 400 }
      );
    }

    // التحقق من المصادقة
    const supabaseClient = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

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
        { success: false, error: authzError || 'غير مصرح لك بإضافة فيديوهات في هذا الكورس' },
        { status: 403 }
      );
    }

    // تجهيز كائن الإدراج
    const videoData = {
      course_id: courseId,
      title: title.trim(),
      description: description?.trim() || null,
      video_url: videoUrl,
      display_mode: displayMode,
      duration: duration || 0,
      playlist_id: playlistId || null, // لو undefined أو null، يبقى NULL في قاعدة البيانات
      playlist_order: playlistOrder !== null && playlistOrder !== undefined ? playlistOrder : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // لو playlistId موجود و playlistOrder مش موجود، نحسبه تلقائياً
    if (playlistId && (playlistOrder === null || playlistOrder === undefined)) {
      videoData.playlist_order = await getNextPlaylistOrder(playlistId);
    }

    // إدراج الفيديو في قاعدة البيانات
    const { data, error } = await supabase
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'تم إضافة الفيديو بنجاح' + (playlistId ? ' إلى قائمة التشغيل' : ''),
    });
  } catch (error) {
    console.error('POST /api/videos error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// DELETE: حذف فيديو (مع التحقق من الصلاحية)
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

    // التحقق من المصادقة
    const supabaseClient = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // جلب الفيديو لمعرفة course_id للتحقق من الصلاحية
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('course_id')
      .eq('id', videoId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من صلاحية المعلم أو المساعد
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

    // تنفيذ الحذف
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', videoId);

    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json(
        { success: false, error: error.message },
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