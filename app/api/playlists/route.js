// /app/api/playlists/route.js
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';
import {
  getCoursePlaylists,
  verifyCourseOwnership,
} from '@/lib/playlist-utils';

// GET: جلب جميع قوائم التشغيل لكورس معين (متاح للجميع بعد تسجيل الدخول)
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

    // التحقق من تسجيل الدخول (RLS هيكمل الباقي)
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

    // جلب القوائم
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

// POST: إنشاء قائمة تشغيل جديدة (للمعلم أو المساعد فقط)
export async function POST(request) {
  try {
    const body = await request.json();
    const { courseId, title, description, orderIndex } = body;

    if (!courseId || !title || title.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس والعنوان مطلوبان' },
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

    // التحقق من صلاحية المعلم أو المساعد على هذا الكورس
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

    // حساب order_index تلقائياً لو مش مرسل
    let finalOrder = orderIndex;
    if (finalOrder === undefined || finalOrder === null) {
      const { data: existingPlaylists, error: countError } = await supabase
        .from('playlists')
        .select('id', { count: 'exact' })
        .eq('course_id', courseId);

      if (countError) throw countError;
      finalOrder = existingPlaylists?.length || 0;
    }

    // إدراج القائمة الجديدة
    const { data, error } = await supabase
      .from('playlists')
      .insert({
        course_id: courseId,
        title: title.trim(),
        description: description?.trim() || null,
        order_index: finalOrder,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, data, message: 'تم إنشاء قائمة التشغيل بنجاح' },
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