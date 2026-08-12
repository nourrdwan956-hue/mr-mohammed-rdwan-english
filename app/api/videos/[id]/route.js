// /app/api/videos/[id]/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

// GET: جلب فيديو واحد مع بياناته
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

    // جلب الفيديو
    const { data: video, error } = await supabase
      .from('videos')
      .select(`
        *,
        courses (
          id,
          title,
          teacher_id,
          max_devices,
          subscription_duration_days
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    if (!video) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من أن المستخدم لديه صلاحية الوصول لهذا الفيديو (مشترك في الكورس أو معلم/مساعد)
    const userId = session.user.id;
    const isTeacher = video.courses?.teacher_id === userId;

    // إذا كان معلم أو مساعد، يسمح له بالوصول
    if (isTeacher) {
      return NextResponse.json({ success: true, data: video });
    }

    // التحقق من أن المستخدم مساعد له صلاحية على هذا الكورس
    const { data: assistant, error: assistantError } = await supabase
      .from('assistants')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', video.course_id)
      .single();

    if (assistant && !assistantError) {
      return NextResponse.json({ success: true, data: video });
    }

    // إذا كان طالب، تحقق من الاشتراك
    const { data: subscription, error: subError } = await supabase
      .from('course_subscriptions')
      .select('id, status')
      .eq('course_id', video.course_id)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { success: false, error: 'غير مشترك في هذا الكورس' },
        { status: 403 }
      );
    }

    // التحقق من صلاحية الجهاز (جهاز واحد للكود، جهازان للدفع)
    const { data: device, error: deviceError } = await supabase
      .from('course_devices')
      .select('id')
      .eq('course_id', video.course_id)
      .eq('user_id', userId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { success: false, error: 'هذا الجهاز غير مسموح به لهذا الكورس' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, data: video });
  } catch (error) {
    console.error('GET /api/videos/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// PUT: تحديث فيديو (للمعلم أو المساعد)
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const body = await request.json();

    if (!id) {
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

    // جلب الفيديو للتحقق من ملكية الكورس
    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('course_id, courses(teacher_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existingVideo) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من أن المستخدم هو معلم الكورس
    const isTeacher = existingVideo.courses?.teacher_id === user.id;

    if (!isTeacher) {
      // التحقق من أنه مساعد له صلاحية على هذا الكورس
      const { data: assistant, error: assistantError } = await supabase
        .from('assistants')
        .select('permissions')
        .eq('user_id', user.id)
        .eq('course_id', existingVideo.course_id)
        .single();

      if (
        assistantError ||
        !assistant ||
        assistant.permissions?.can_manage_content !== true
      ) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بتعديل هذا الفيديو' },
          { status: 403 }
        );
      }
    }

    // استخراج البيانات من الجسم
    const {
      title,
      description,
      videoUrl,
      displayMode,
      duration,
      // الحقول الجديدة للقوائم
      playlistId,
      playlistOrder,
      // حقول أخرى إن وجدت
    } = body;

    // بناء كائن التحديث
    const updateData = {
      updated_at: new Date().toISOString(),
    };

    // إضافة الحقول الأساسية إذا كانت موجودة
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined)
      updateData.description = description?.trim() || null;
    if (videoUrl !== undefined) updateData.video_url = videoUrl;
    if (displayMode !== undefined) updateData.display_mode = displayMode;
    if (duration !== undefined) updateData.duration = duration;

    // إضافة الحقول الجديدة للقوائم
    if (playlistId !== undefined) {
      // إذا كان playlistId = null، نزيل الفيديو من القائمة
      updateData.playlist_id = playlistId || null;
      // إذا تم إزالة الفيديو من القائمة، نمسح الترتيب أيضاً
      if (playlistId === null) {
        updateData.playlist_order = null;
      }
    }

    if (playlistOrder !== undefined) {
      // إذا كان playlistOrder = null ونحن نضيف فيديو لقائمة، نحتاج لحساب الترتيب تلقائياً
      if (playlistOrder === null && updateData.playlist_id) {
        // حساب الترتيب التالي
        const { data: maxOrderData, error: orderError } = await supabase
          .from('videos')
          .select('playlist_order')
          .eq('playlist_id', updateData.playlist_id)
          .order('playlist_order', { ascending: false })
          .limit(1);

        if (!orderError && maxOrderData && maxOrderData.length > 0) {
          updateData.playlist_order = (maxOrderData[0].playlist_order || 0) + 1;
        } else {
          updateData.playlist_order = 0;
        }
      } else {
        updateData.playlist_order = playlistOrder;
      }
    }

    // إذا كان playlistId موجود و playlistOrder غير موجود، نحسب الترتيب تلقائياً
    if (playlistId && playlistOrder === undefined) {
      const { data: maxOrderData, error: orderError } = await supabase
        .from('videos')
        .select('playlist_order')
        .eq('playlist_id', playlistId)
        .order('playlist_order', { ascending: false })
        .limit(1);

      if (!orderError && maxOrderData && maxOrderData.length > 0) {
        updateData.playlist_order = (maxOrderData[0].playlist_order || 0) + 1;
      } else {
        updateData.playlist_order = 0;
      }
    }

    // تنفيذ التحديث
    const { data: updatedVideo, error: updateError } = await supabase
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { success: false, error: updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedVideo,
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

// DELETE: حذف فيديو (للمعلم أو المساعد)
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

    // جلب الفيديو للتحقق من ملكية الكورس
    const { data: existingVideo, error: fetchError } = await supabase
      .from('videos')
      .select('course_id, courses(teacher_id)')
      .eq('id', id)
      .single();

    if (fetchError || !existingVideo) {
      return NextResponse.json(
        { success: false, error: 'الفيديو غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من أن المستخدم هو معلم الكورس
    const isTeacher = existingVideo.courses?.teacher_id === user.id;

    if (!isTeacher) {
      // التحقق من أنه مساعد له صلاحية على هذا الكورس
      const { data: assistant, error: assistantError } = await supabase
        .from('assistants')
        .select('permissions')
        .eq('user_id', user.id)
        .eq('course_id', existingVideo.course_id)
        .single();

      if (
        assistantError ||
        !assistant ||
        assistant.permissions?.can_manage_content !== true
      ) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بحذف هذا الفيديو' },
          { status: 403 }
        );
      }
    }

    // تنفيذ الحذف
    const { error: deleteError } = await supabase
      .from('videos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      return NextResponse.json(
        { success: false, error: deleteError.message },
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