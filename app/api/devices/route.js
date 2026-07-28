

// app/api/devices/route.js
// API لإدارة أجهزة الطلاب (جلب، حذف، تحديث الحالة)
// يدعم: الطالب (أجهزته الخاصة) والمعلم (أجهزة طلابه في كورساته)

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ================================================================
// 📥 GET – جلب الأجهزة
// ================================================================
export async function GET(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // قراءة معاملات الاستعلام
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');
    const courseId = searchParams.get('courseId');

    let query = supabase
      .from('course_devices')
      .select(`
        id,
        device_fingerprint,
        device_name,
        device_info,
        is_active,
        is_primary,
        first_used_at,
        last_used_at,
        student:student_id (id, full_name, email),
        course:course_id (id, title)
      `);

    // حالة 1: المستخدم طالب – يعرض أجهزته فقط
    if (!studentId) {
      query = query.eq('student_id', user.id);
    } 
    // حالة 2: المستخدم معلم – يعرض أجهزة طالب معين (مع التحقق من الملكية)
    else {
      // التأكد من أن المستخدم هو معلم لهذا الطالب (لديه كورسات يملكها والطالب مسجل فيها)
      const { data: teacherCourses, error: teacherCheckError } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', user.id);

      if (teacherCheckError || !teacherCourses || teacherCourses.length === 0) {
        return NextResponse.json(
          { success: false, error: 'غير مصرح لك بعرض أجهزة هذا الطالب' },
          { status: 403 }
        );
      }

      const courseIds = teacherCourses.map(c => c.id);
      
      // التأكد من أن الطالب مسجل في أحد كورسات المعلم
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select('course_id')
        .eq('student_id', studentId)
        .in('course_id', courseIds)
        .limit(1);

      if (enrollmentError || !enrollment || enrollment.length === 0) {
        return NextResponse.json(
          { success: false, error: 'هذا الطالب ليس مسجلاً في أي من كورساتك' },
          { status: 403 }
        );
      }

      query = query.eq('student_id', studentId);
    }

    // تصفية حسب الكورس (اختياري)
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    // ترتيب حسب آخر استخدام
    query = query.order('last_used_at', { ascending: false });

    const { data: devices, error: devicesError } = await query;

    if (devicesError) {
      console.error('Error fetching devices:', devicesError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء جلب الأجهزة' },
        { status: 500 }
      );
    }

    // إعادة البيانات مع معلومات إضافية
    return NextResponse.json({
      success: true,
      devices: devices || [],
      count: devices?.length || 0,
      isOwner: !studentId, // إذا كان المستخدم يطلب أجهزته الخاصة
    });

  } catch (error) {
    console.error('GET /api/devices error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 🗑️ DELETE – حذف جهاز
// ================================================================
export async function DELETE(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // قراءة معرف الجهاز من جسم الطلب أو من معاملات الاستعلام
    const body = await request.json().catch(() => ({}));
    const deviceId = body.deviceId || new URL(request.url).searchParams.get('deviceId');

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'معرف الجهاز مطلوب' },
        { status: 400 }
      );
    }

    // جلب معلومات الجهاز للتحقق من الملكية
    const { data: device, error: deviceError } = await supabase
      .from('course_devices')
      .select(`
        id,
        student_id,
        course:course_id (teacher_id)
      `)
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { success: false, error: 'الجهاز غير موجود' },
        { status: 404 }
      );
    }

    // التحقق من الصلاحية: الطالب يحذف جهازه الخاص، أو المعلم يحذف جهاز طالب في كورسه
    const isOwner = device.student_id === user.id;
    const isTeacher = device.course?.teacher_id === user.id;

    if (!isOwner && !isTeacher) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بحذف هذا الجهاز' },
        { status: 403 }
      );
    }

    // حذف الجهاز
    const { error: deleteError } = await supabase
      .from('course_devices')
      .delete()
      .eq('id', deviceId);

    if (deleteError) {
      console.error('Error deleting device:', deleteError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء حذف الجهاز' },
        { status: 500 }
      );
    }

    // تسجيل النشاط (اختياري)
    await supabase
      .from('course_access_logs')
      .insert({
        student_id: device.student_id,
        course_id: device.course?.id || null,
        device_fingerprint: 'deleted',
        access_status: 'device_deleted',
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: 'تم حذف الجهاز بنجاح',
      deviceId,
    });

  } catch (error) {
    console.error('DELETE /api/devices error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// ✏️ PATCH – تحديث حالة الجهاز (للمعلم فقط)
// ================================================================
export async function PATCH(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { deviceId, isActive } = body;

    if (!deviceId) {
      return NextResponse.json(
        { success: false, error: 'معرف الجهاز مطلوب' },
        { status: 400 }
      );
    }

    if (isActive === undefined || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'الحالة (isActive) مطلوبة وقيمتها يجب أن تكون true أو false' },
        { status: 400 }
      );
    }

    // جلب معلومات الجهاز للتحقق من أن المستخدم هو معلم الكورس
    const { data: device, error: deviceError } = await supabase
      .from('course_devices')
      .select(`
        id,
        student_id,
        course:course_id (teacher_id, title)
      `)
      .eq('id', deviceId)
      .single();

    if (deviceError || !device) {
      return NextResponse.json(
        { success: false, error: 'الجهاز غير موجود' },
        { status: 404 }
      );
    }

    // فقط المعلم يمكنه تغيير حالة الجهاز
    if (device.course?.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بتغيير حالة هذا الجهاز' },
        { status: 403 }
      );
    }

    // تحديث حالة الجهاز
    const { error: updateError } = await supabase
      .from('course_devices')
      .update({
        is_active: isActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', deviceId);

    if (updateError) {
      console.error('Error updating device:', updateError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء تحديث حالة الجهاز' },
        { status: 500 }
      );
    }

    // تسجيل النشاط
    await supabase
      .from('course_access_logs')
      .insert({
        student_id: device.student_id,
        course_id: device.course?.id || null,
        device_fingerprint: 'status_changed',
        access_status: isActive ? 'device_activated' : 'device_deactivated',
        created_at: new Date().toISOString(),
      });

    return NextResponse.json({
      success: true,
      message: `تم ${isActive ? 'تفعيل' : 'تعطيل'} الجهاز بنجاح`,
      deviceId,
      isActive,
    });

  } catch (error) {
    console.error('PATCH /api/devices error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📌 OPTIONS – دعم CORS (اختياري)
// ================================================================
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Allow': 'GET, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, DELETE, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}