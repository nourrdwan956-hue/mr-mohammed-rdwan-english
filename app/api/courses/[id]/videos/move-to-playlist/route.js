// app/api/courses/[id]/videos/move-to-playlist/route.js
import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  console.log('🚀 API called with params:', params);
  
  try {
    const courseId = params?.id;
    if (!courseId) {
      console.error('❌ No courseId in params');
      return NextResponse.json({ error: 'معرف الكورس مطلوب' }, { status: 400 });
    }

    let body;
    try {
      body = await request.json();
      console.log('📦 Request body:', body);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', parseError);
      return NextResponse.json({ error: 'بيانات الطلب غير صالحة' }, { status: 400 });
    }

    const { videoId, playlistId } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'معرف الفيديو مطلوب' }, { status: 400 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('❌ Auth error:', userError);
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }
    console.log('✅ User authenticated:', user.id);

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('❌ Course error:', courseError);
      return NextResponse.json({ error: 'الكورس غير موجود' }, { status: 404 });
    }

    if (course.teacher_id !== user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 });
    }
    console.log('✅ Course owned by user');

    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', videoId)
      .eq('course_id', courseId)
      .single();

    if (videoError || !video) {
      console.error('❌ Video error:', videoError);
      return NextResponse.json({ error: 'الفيديو غير موجود في هذا الكورس' }, { status: 404 });
    }
    console.log('✅ Video exists');

    if (playlistId) {
      const { data: playlist, error: playlistError } = await supabase
        .from('video_playlists')
        .select('id')
        .eq('id', playlistId)
        .eq('course_id', courseId)
        .single();

      if (playlistError || !playlist) {
        console.error('❌ Playlist error:', playlistError);
        return NextResponse.json({ error: 'القائمة غير موجودة في هذا الكورس' }, { status: 404 });
      }
      console.log('✅ Playlist exists');
    }

    console.log('🔄 Updating video:', videoId, '→ playlist:', playlistId || 'null');
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update({ playlist_id: playlistId || null })
      .eq('id', videoId)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json({ error: 'فشل تحديث الفيديو: ' + updateError.message }, { status: 500 });
    }

    console.log('✅ Video updated successfully');
    return NextResponse.json({ success: true, video: updatedVideo });

  } catch (error) {
    console.error('❌ Unhandled error:', error);
    return NextResponse.json(
      { error: error.message || 'خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}