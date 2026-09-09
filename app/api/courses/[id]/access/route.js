// app/api/courses/[id]/access/route.js
// ============================================================
// API للتحقق من صلاحية وصول الطالب إلى كورس معين
// يدعم: الاشتراكات المدفوعة، أكواد الشحن، المجانية، والأجهزة
// ============================================================

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { checkCourseAccess } from '@/lib/course-access';

/**
 * GET /api/courses/[id]/access
 * التحقق من صلاحية وصول الطالب إلى كورس معين
 */
export async function GET(request, { params }) {
  try {
    const courseId = params.id;
    if (!courseId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس مطلوب' },
        { status: 400 }
      );
    }

    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك، يرجى تسجيل الدخول' },
        { status: 401 }
      );
    }

    // 1. جلب معلومات الكورس
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, is_free, price, max_devices, subscription_duration_days, enable_payment, access_code_enabled, teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    // إذا كان المعلم هو صاحب الكورس، يسمح له بالوصول الكامل
    if (course.teacher_id === user.id) {
      return NextResponse.json({
        success: true,
        hasAccess: true,
        isOwner: true,
        course,
        accessType: 'owner',
        message: 'أنت مالك هذا الكورس، لديك صلاحية كاملة',
      });
    }

    // 2. استخدام دالة checkCourseAccess الجديدة (التي تتحقق من max_devices)
    const accessResult = await checkCourseAccess(courseId, user.id);

    if (accessResult.allowed) {
      // جلب الاشتراك لتضمينه في الرد
      const { data: subscription } = await supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', user.id)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .single();

      return NextResponse.json({
        success: true,
        hasAccess: true,
        course,
        subscription,
        accessType: subscription?.access_type || 'unknown',
        maxDevices: accessResult.maxDevices || subscription?.max_devices || course.max_devices || 2,
        currentDevices: accessResult.currentDevices || 0,
        deviceInfo: accessResult.device ? {
          id: accessResult.device.id,
          isPrimary: accessResult.device.is_primary,
          deviceName: accessResult.device.device_name,
        } : null,
        message: 'لديك صلاحية الوصول',
      });
    }

    // 3. حالة الرفض
    const errorMessage = getErrorMessage(accessResult.reason);
    return NextResponse.json({
      success: false,
      hasAccess: false,
      error: errorMessage,
      reason: accessResult.reason,
      course,
      maxDevices: accessResult.maxDevices || null,
      currentDevices: accessResult.currentDevices || null,
      requiresPayment: course.enable_payment !== false,
      requiresCode: course.access_code_enabled !== false,
      isFree: course.is_free || false,
      price: course.price || 0,
    });

  } catch (error) {
    console.error('Error checking course access:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء التحقق من الصلاحية' },
      { status: 500 }
    );
  }
}

/**
 * POST - تفعيل كود الشحن (اختياري)
 */
export async function POST(request, { params }) {
  try {
    const courseId = params.id;
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'كود الشحن مطلوب' },
        { status: 400 }
      );
    }

    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // التحقق من وجود الكود
    const { data: codeData, error: codeError } = await supabase
      .from('course_access_codes')
      .select('id, code, course_id, max_devices, is_used, used_by_user_id, used_at, expires_at')
      .eq('code', code)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (codeError || !codeData) {
      return NextResponse.json(
        { success: false, error: 'الكود غير صالح أو غير موجود' },
        { status: 404 }
      );
    }

    if (codeData.is_used) {
      return NextResponse.json(
        { success: false, error: 'هذا الكود مستخدم بالفعل' },
        { status: 400 }
      );
    }

    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'انتهت صلاحية هذا الكود' },
        { status: 400 }
      );
    }

    // تفعيل الكود
    const { error: updateError } = await supabase
      .from('course_access_codes')
      .update({
        is_used: true,
        used_by_user_id: user.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', codeData.id);

    if (updateError) throw updateError;

    // إنشاء اشتراك جديد مع max_devices = 1 للكود
    const { data: subscription, error: subError } = await supabase
      .from('course_subscriptions')
      .insert({
        student_id: user.id,
        course_id: courseId,
        access_type: 'code',
        max_devices: codeData.max_devices || 1, // الكود يسمح بجهاز واحد
        is_active: true,
        activated_at: new Date().toISOString(),
        expires_at: codeData.expires_at || null,
      })
      .select()
      .single();

    if (subError) throw subError;

    // تسجيل استخدام الكود
    const fingerprint = await getDeviceFingerprint(request);
    await supabase
      .from('code_usage_logs')
      .insert({
        code_id: codeData.id,
        student_id: user.id,
        device_fingerprint: fingerprint || 'unknown',
        used_at: new Date().toISOString(),
        ip_address: getClientIp(request),
        user_agent: request.headers.get('user-agent') || '',
      });

    return NextResponse.json({
      success: true,
      message: 'تم تفعيل الكود بنجاح',
      subscription,
      code: codeData,
      maxDevices: codeData.max_devices || 1,
    });

  } catch (error) {
    console.error('Error activating code:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تفعيل الكود' },
      { status: 500 }
    );
  }
}

// ============================================================
// دوال مساعدة
// ============================================================

function getErrorMessage(reason) {
  const messages = {
    no_subscription: 'لا يوجد اشتراك نشط لهذا الكورس',
    expired: 'انتهت صلاحية الاشتراك',
    max_devices: 'تم تجاوز الحد الأقصى للأجهزة المسموح بها (جهاز واحد للكود، جهازان للدفع)',
    device_register_failed: 'فشل تسجيل الجهاز، يرجى المحاولة مرة أخرى',
    fingerprint_failed: 'تعذر الحصول على بصمة الجهاز',
    db_error: 'حدث خطأ في قاعدة البيانات',
    system_error: 'حدث خطأ في النظام',
  };
  return messages[reason] || 'لا يمكن الوصول إلى هذا المحتوى';
}

async function getDeviceFingerprint(request) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    const ip = getClientIp(request) || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const platform = request.headers.get('sec-ch-ua-platform') || '';
    const raw = `${userAgent}|${ip}|${acceptLanguage}|${platform}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    console.error('Error generating fingerprint:', error);
    return null;
  }
}

function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
}