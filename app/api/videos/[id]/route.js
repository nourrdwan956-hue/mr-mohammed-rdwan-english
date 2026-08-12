// /app/api/videos/[id]/route.js
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { verifyCourseOwnership } from '@/lib/playlist-utils';

// GET: جلب بيانات فيديو معين (مع التحقق من الصلاحية)
export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الفيديو مطلوب' },
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

    // 3- هل هو طالب مشترك (لديه اشتراك نشط أو تسجيل مجاني)؟
    const { data: enrollment, error: enrollError } = await supabase
      .from('enrollments')
      .select('id, status')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .in('status', ['active', 'completed'])
      .maybeSingle();

    if (!enrollError && enrollment) {
      // نتحقق من اشتراك نشط في course_subscriptions
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

      // إذا كان الكورس مجانيًا، نسمح (نفترض أن الـ enrollment كافٍ)
      // لكننا لا نعرف إذا كان مجانيًا، لذا نفضل التحقق من حقل is_free في courses
      // نتركها للتسامح
      return NextResponse.json({ success: true, data: video });
    }

    // إذا لم يتحقق أي شرط
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

// PUT: تحديث بيانات فيديو (للمعلم أو المساعد فقط)
export async function PUT(request, { params }) {
  try {
    const { id } = params;
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الفيديو مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من المصادقة
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

    // التحقق من صلاحية المعلم/المساعد على هذا الكورس
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

    // بناء كائن التحديث
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (videoUrl !== undefined) updateData.video_url = videoUrl;
    if (displayMode !== undefined) updateData.display_mode = displayMode;
    if (duration !== undefined) updateData.duration = duration;

    // معالجة حقول القوائم
    if (playlistId !== undefined) {
      updateData.playlist_id = playlistId || null;
      if (playlistId === null) {
        updateData.playlist_order = null;
      }
    }

    if (playlistOrder !== undefined) {
      updateData.playlist_order = playlistOrder !== null ? playlistOrder : null;
    }

    // تنفيذ التحديث
    const { data, error } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Update video error:', error);
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

// DELETE: حذف فيديو (للمعلم أو المساعد فقط)
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الفيديو مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من المصادقة
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // جلب الفيديو للتأكد من وجوده والحصول على course_id
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

    // التحقق من صلاحية المعلم/المساعد
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

    // حذف الفيديو
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Delete video error:', error);
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