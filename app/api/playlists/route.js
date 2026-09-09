// app/api/playlists/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  getCoursePlaylists,
  verifyCourseOwnership,
  ensurePlaylistInVideoPlaylists,
} from '@/lib/playlist-utils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');

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

    const { data, error } = await getCoursePlaylists(courseId);

    if (error) {
      return NextResponse.json(
        { success: false, error: error },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/playlists error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { courseId, title, description, orderIndex } = body;

    if (!courseId || !title?.trim()) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس والعنوان مطلوبان' },
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

    let finalOrder = orderIndex;
    if (finalOrder === undefined || finalOrder === null) {
      const { data: existing, error: countError } = await supabase
        .from('playlists')
        .select('id', { count: 'exact' })
        .eq('course_id', courseId);

      if (countError) throw countError;
      finalOrder = existing?.length || 0;
    }

    const { data: playlist, error: playlistError } = await supabase
      .from('playlists')
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description?.trim() || null,
        order_index: finalOrder,
      })
      .select()
      .single();

    if (playlistError) {
      console.error('❌ Error creating playlist:', playlistError);
      return NextResponse.json(
        { success: false, error: playlistError.message },
        { status: 500 }
      );
    }

    // ✅ استخدام الدالة المعدلة لإدراج القائمة في video_playlists
    const ensured = await ensurePlaylistInVideoPlaylists(supabase, playlist.id);
    if (!ensured) {
      console.warn(`⚠️ Could not ensure playlist ${playlist.id} in video_playlists`);
    }

    return NextResponse.json(
      { success: true, data: playlist, message: 'تم إنشاء قائمة التشغيل بنجاح' },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/playlists error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}