'use client';

import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function POST(request, { params }) {
  const { id: courseId } = params;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 401 }
      );
    }

    // التحقق من صلاحية الكورس
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course || course.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 403 }
      );
    }

    const { videoId, playlistId } = await request.json();

    if (!videoId) {
      return NextResponse.json(
        { success: false, error: 'معرف الفيديو مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من أن الفيديو يخص هذا الكورس
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id')
      .eq('id', videoId)
      .eq('course_id', courseId)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود في هذا الكورس' },
        { status: 404 }
      );
    }

    // إذا كان playlistId = null، ننقل الفيديو إلى القائمة الفردية
    // إذا كان playlistId موجود، نتحقق من وجودها
    if (playlistId !== null) {
      const { data: playlist, error: playlistError } = await supabase
        .from('video_playlists')
        .select('id')
        .eq('id', playlistId)
        .eq('course_id', courseId)
        .single();

      if (playlistError || !playlist) {
        return NextResponse.json(
          { success: false, error: 'القائمة غير موجودة في هذا الكورس' },
          { status: 404 }
        );
      }
    }

    // تحديث الفيديو
    const { data: updatedVideo, error } = await supabase
      .from('videos')
      .update({ playlist_id: playlistId || null })
      .eq('id', videoId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, video: updatedVideo });
  } catch (error) {
    console.error('Error moving video:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}