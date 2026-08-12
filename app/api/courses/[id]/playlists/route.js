'use client';

import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id: courseId } = params;

  try {
    // جلب جميع القوائم الخاصة بالكورس
    const { data: playlists, error } = await supabase
      .from('video_playlists')
      .select(`
        *,
        videos:videos(count)
      `)
      .eq('course_id', courseId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    // إضافة عدد الفيديوهات في كل قائمة
    const playlistsWithCount = (playlists || []).map(p => ({
      ...p,
      videos_count: p.videos?.[0]?.count || 0
    }));

    return NextResponse.json({ success: true, playlists: playlistsWithCount });
  } catch (error) {
    console.error('Error fetching playlists:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

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

    // التحقق من أن الكورس يخص المعلم
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    if (course.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح' },
        { status: 403 }
      );
    }

    const { title, description } = await request.json();

    if (!title || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'عنوان القائمة مطلوب' },
        { status: 400 }
      );
    }

    // الحصول على أعلى ترتيب
    const { data: maxOrder } = await supabase
      .from('video_playlists')
      .select('order_index')
      .eq('course_id', courseId)
      .order('order_index', { ascending: false })
      .limit(1);

    const newOrder = maxOrder?.length > 0 ? maxOrder[0].order_index + 1 : 0;

    // إنشاء القائمة
    const { data: playlist, error } = await supabase
      .from('video_playlists')
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description?.trim() || '',
        order_index: newOrder,
        is_published: true,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, playlist });
  } catch (error) {
    console.error('Error creating playlist:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}