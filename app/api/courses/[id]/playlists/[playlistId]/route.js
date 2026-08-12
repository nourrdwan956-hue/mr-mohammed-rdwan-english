'use client';

import { supabase } from '@/lib/supabaseClient';
import { NextResponse } from 'next/server';

export async function PUT(request, { params }) {
  const { id: courseId, playlistId } = params;

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

    const { title, description, order_index, is_published } = await request.json();

    const updates = {};
    if (title !== undefined) updates.title = title.trim();
    if (description !== undefined) updates.description = description.trim();
    if (order_index !== undefined) updates.order_index = order_index;
    if (is_published !== undefined) updates.is_published = is_published;

    const { data: playlist, error } = await supabase
      .from('video_playlists')
      .update(updates)
      .eq('id', playlistId)
      .eq('course_id', courseId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, playlist });
  } catch (error) {
    console.error('Error updating playlist:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id: courseId, playlistId } = params;

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

    // حذف القائمة (سيتم تعيين playlist_id = NULL تلقائياً في videos بسبب ON DELETE SET NULL)
    const { error } = await supabase
      .from('video_playlists')
      .delete()
      .eq('id', playlistId)
      .eq('course_id', courseId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting playlist:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}