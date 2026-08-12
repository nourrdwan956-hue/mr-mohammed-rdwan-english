// /app/api/playlists/[id]/route.js
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabaseServer';
import {
  getPlaylistWithVideos,
  deletePlaylist,
  verifyCourseOwnership,
} from '@/lib/playlist-utils';

export async function GET(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف القائمة مطلوب' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    const { data, error } = await getPlaylistWithVideos(id);
    if (error) {
      return NextResponse.json(
        { success: false, error: error },
        { status: 500 }
      );
    }
    if (!data) {
      return NextResponse.json(
        { success: false, error: 'القائمة غير موجودة' },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('GET /api/playlists/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { title, description, orderIndex } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف القائمة مطلوب' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // جلب course_id للتحقق
    const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('course_id')
      .eq('id', id)
      .single();

    if (fetchError || !playlist) {
      return NextResponse.json(
        { success: false, error: 'القائمة غير موجودة' },
        { status: 404 }
      );
    }

    const { isAuthorized, error: authzError } = await verifyCourseOwnership(
      user.id,
      playlist.course_id
    );
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك' },
        { status: 403 }
      );
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (orderIndex !== undefined) updateData.order_index = orderIndex;

    const { data, error } = await supabase
      .from('playlists')
      .update(updateData)
      .eq('id', id)
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
      message: 'تم تحديث القائمة بنجاح',
    });
  } catch (error) {
    console.error('PUT /api/playlists/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف القائمة مطلوب' },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    const { data: playlist, error: fetchError } = await supabase
      .from('playlists')
      .select('course_id')
      .eq('id', id)
      .single();

    if (fetchError || !playlist) {
      return NextResponse.json(
        { success: false, error: 'القائمة غير موجودة' },
        { status: 404 }
      );
    }

    const { isAuthorized, error: authzError } = await verifyCourseOwnership(
      user.id,
      playlist.course_id
    );
    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك' },
        { status: 403 }
      );
    }

    const { data, error } = await deletePlaylist(id);
    if (error) {
      return NextResponse.json(
        { success: false, error: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: 'تم حذف القائمة بنجاح، وتم إعادة ترتيب القوائم المتبقية',
    });
  } catch (error) {
    console.error('DELETE /api/playlists/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}