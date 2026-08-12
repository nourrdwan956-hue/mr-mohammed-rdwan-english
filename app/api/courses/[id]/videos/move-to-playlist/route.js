// app/api/courses/[id]/videos/move-to-playlist/route.js
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  try {
    // 1. التحقق من params
    const courseId = params?.id;
    if (!courseId) {
      return NextResponse.json({ error: 'معرف الكورس مطلوب' }, { status: 400 });
    }

    // 2. قراءة الجسم
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400 });
    }

    const { videoId, playlistId } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'معرف الفيديو مطلوب' }, { status: 400 });
    }

    // 3. التحقق من المستخدم
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    // 4. التحقق من ملكية الكورس
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    if (course.teacher_id !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }

    // 5. التحقق من وجود الفيديو في الكورس
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', videoId)
      .eq('course_id', courseId)
      .single();

    if (videoError || !video) {
      return NextResponse.json({ error: 'الفيديو غير موجود في هذا الكورس' }, { status: 404 });
    }

    // 6. إذا كانت playlistId موجودة، تحقق من وجودها في نفس الكورس
    if (playlistId) {
      const { data: playlist, error: playlistError } = await supabase
        .from('video_playlists')
        .select('id')
        .eq('id', playlistId)
        .eq('course_id', courseId)
        .single();

      if (playlistError || !playlist) {
        return NextResponse.json({ error: 'القائمة غير موجودة في هذا الكورس' }, { status: 404 });
      }
    }

    // 7. تحديث الفيديو
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({ playlist_id: playlistId || null })
      .eq('id', videoId)
      .select()
      .single();

    if (updateError) {
      console.error('Supabase update error:', updateError);
      return NextResponse.json({ error: 'فشل تحديث الفيديو: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, video: updatedVideo });

  } catch (error) {
    console.error('Unhandled error:', error);
    return NextResponse.json(
      { error: error.message || 'خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}