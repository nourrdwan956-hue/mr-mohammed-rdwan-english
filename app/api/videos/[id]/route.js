// app/api/videos/[id]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { verifyCourseOwnership } from '@/lib/playlist-utils';

// ============================================================
// GET: جلب بيانات فيديو معين (مع التحقق من الصلاحية)
// ============================================================
export async function GET(request, { params }) {
  try {
    // ✅ استخراج id مع await
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الفيديو مطلوب' },
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

    // جلب الفيديو مع بيانات الكورس
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select(
        `
          *,
          courses (
            id,
            teacher_id,
            title
          )
        `
      )
      .eq('id', id)
      .single();

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    const userId = session.user.id;
    const courseId = video.course_id;

    // 1- هل هو المعلم؟
    if (video.courses?.teacher_id === userId) {
      return NextResponse.json({ success: true, data: video });
    }

    // 2- هل هو مساعد مع صلاحية مشاهدة المحتوى؟
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('permissions')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .single();

    if (!assistantError && assistant?.permissions?.can_view_content === true) {
      return NextResponse.json({ success: true, data: video });
    }

    // 3- هل هو طالب مشترك؟
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle();

    if (!enrollError && enrollment) {
      const { data: subscription, error: subError } = await supabase
        .from('course_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .eq('status', 'active')
        .maybeSingle();

      if (!subError && subscription) {
        return NextResponse.json({ success: true, data: video });
      }

      const { data: courseData } = await supabase
        .from('courses')
        .select('is_free')
        .eq('id', courseId)
        .single();

      if (courseData?.is_free === true) {
        return NextResponse.json({ success: true, data: video });
      }
    }

    return NextResponse.json(
      { success: false, error: 'غير مصرح لك بمشاهدة هذا الفيديو' },
      { status: 403 }
    );
  } catch (error) {
    console.error('GET /api/videos/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ============================================================
// PUT: تحديث بيانات فيديو (للمعلم أو المساعد فقط)
// ============================================================
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الفيديو مطلوب' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      title,
      description,
      videoUrl,
      displayMode,
      duration,
      playlistId,
      playlistOrder,
    } = body;

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // جلب الفيديو الحالي للتأكد من وجوده والحصول على course_id
    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('id, course_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingVideo) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    const { isAuthorized, error: authzError } = await verifyCourseOwnership(
      user.id,
      existingVideo.course_id
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك بتعديل هذا الفيديو' },
        { status: 403 }
      );
    }

    const updateData = { updated_at: new Date().toISOString() };
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (videoUrl !== undefined) updateData.video_url = videoUrl;
    if (displayMode !== undefined) updateData.display_mode = displayMode;
    if (duration !== undefined) updateData.duration = duration;

    if (playlistId !== undefined) {
      updateData.playlist_id = playlistId || null;
      if (playlistId === null) {
        updateData.playlist_order = null;
      }
    }

    if (playlistOrder !== undefined) {
      updateData.playlist_order = playlistOrder !== null ? playlistOrder : null;
    }

    const { data, error } = await supabase
      .from('videos')
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
      message: 'تم تحديث الفيديو بنجاح',
    });
  } catch (error) {
    console.error('PUT /api/videos/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE: حذف فيديو (للمعلم أو المساعد فقط)
// ============================================================
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الفيديو مطلوب' },
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

    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('id, course_id')
      .eq('id', id)
      .single();

    if (fetchError || !existingVideo) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    const { isAuthorized, error: authzError } = await verifyCourseOwnership(
      user.id,
      existingVideo.course_id
    );

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: authzError || 'غير مصرح لك بحذف هذا الفيديو' },
        { status: 403 }
      );
    }

    const { error } = await supabase.from('videos').delete().eq('id', id);

    if (error) {
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
    console.error('DELETE /api/videos/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}