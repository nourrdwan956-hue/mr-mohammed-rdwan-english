

// ============================================================
// app/api/upload-video/route.js
// رفع فيديو (YouTube) – النسخة النهائية V8
// مع دعم المرحلة/الصف، وإعدادات العرض، وحماية محسّنة
// ============================================================

import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(request) {
  try {
    // 1. الحصول على الـ cookies وإنشاء عميل Supabase
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            cookieStore.set({ name, value, ...options });
          },
          remove(name, options) {
            cookieStore.set({ name, value: '', ...options });
          },
        },
      }
    );

    // 2. المصادقة – محاولة getUser أولاً، ثم getSession كاحتياطي
    let user = null;
    try {
      const { data: { user: u }, error } = await supabase.auth.getUser();
      if (!error && u) {
        user = u;
      } else {
        // محاولة الحصول على الجلسة إذا فشل getUser
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          user = session.user;
        }
      }
    } catch (authErr) {
      console.error('Auth error:', authErr);
      return NextResponse.json(
        { error: 'خطأ في المصادقة، يرجى تسجيل الدخول مرة أخرى' },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'يجب تسجيل الدخول' },
        { status: 401 }
      );
    }

    // 3. التحقق من صلاحية المعلم
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'teacher') {
      return NextResponse.json(
        { error: 'غير مصرح لك، يجب أن تكون معلماً' },
        { status: 403 }
      );
    }

    // 4. قراءة البيانات من الطلب
    const body = await request.json();
    const {
      title,
      description,
      courseId,
      youtubeUrl,
      tags,
      level,
      grade_stage,
      grade_level,
      is_free,
      is_scheduled,
      scheduled_date,
      is_published,
      display_mode,
    } = body;

    // 5. التحقق من الحقول الأساسية
    if (!title || !youtubeUrl) {
      return NextResponse.json(
        { error: 'العنوان ورابط YouTube مطلوبان' },
        { status: 400 }
      );
    }

    // 6. إعداد كائن الفيديو للإدراج
    const videoData = {
      teacher_id: user.id,
      course_id: courseId || null,
      title: title.trim(),
      description: description?.trim() || '',
      video_url: youtubeUrl.trim(),
      storage_type: 'youtube',
      telegram_file_id: null,
      views: 0,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      level: level || null,
      grade_stage: grade_stage || null,
      grade_level: grade_level || null,
      is_free: is_free || false,
      is_scheduled: is_scheduled || false,
      scheduled_date: scheduled_date || null,
      is_published: is_published !== undefined ? is_published : true,
      display_mode: display_mode || 'platform',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 7. إدراج الفيديو في قاعدة البيانات
    const { data, error } = await supabase
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'فشل حفظ الفيديو: ' + error.message },
        { status: 500 }
      );
    }

    // 8. نجاح العملية
    return NextResponse.json({
      success: true,
      message: 'تم إضافة الفيديو بنجاح',
      video: data,
    });

  } catch (error) {
    // 9. معالجة الأخطاء العامة
    console.error('Upload error:', error);

    // رسائل خطأ مفهومة للمستخدم
    let errorMsg = 'حدث خطأ أثناء إضافة الفيديو';
    if (error.message?.includes('ConnectTimeoutError') || error.message?.includes('timeout')) {
      errorMsg = 'تعذر الاتصال بالخادم، تحقق من اتصالك بالإنترنت وحاول مرة أخرى.';
    } else if (error.message?.includes('fetch failed')) {
      errorMsg = 'تعذر الاتصال بقاعدة البيانات، حاول مرة أخرى.';
    }

    return NextResponse.json(
      { error: errorMsg },
      { status: 500 }
    );
  }
}