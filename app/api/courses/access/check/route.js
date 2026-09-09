

// app/api/courses/access/check/route.js
// ================================================================
// 🛡️ API التحقق من صلاحية الوصول إلى الكورس – للاستخدام من قبل المكونات
// ================================================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { checkCourseAccess, checkSubscriptionOnly } from '@/lib/course-access';

// ================================================================
// 📥 التحقق من صلاحية الوصول
// ================================================================

export async function POST(request) {
  try {
    // 1. استلام البيانات من الطلب
    const body = await request.json();
    const { courseId, studentId, checkDevices = true } = body;

    // 2. التحقق من صحة المدخلات
    if (!courseId || !studentId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس والطالب مطلوبان' },
        { status: 400 }
      );
    }

    // 3. جلب بيانات الكورس
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('is_free, price')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    // 4. إذا كان الكورس مجانياً → سماح تلقائي
    if (course.is_free || course.price === 0) {
      return NextResponse.json({
        success: true,
        allowed: true,
        reason: 'free_course',
        course: { id: courseId, is_free: true },
      });
    }

    // 5. الكورس مدفوع → التحقق من الصلاحية
    let result;
    if (checkDevices) {
      // التحقق الكامل (اشتراك + أجهزة)
      result = await checkCourseAccess(courseId, studentId);
    } else {
      // التحقق من الاشتراك فقط (للامتحانات)
      const hasSubscription = await checkSubscriptionOnly(studentId, courseId);
      result = {
        allowed: hasSubscription,
        reason: hasSubscription ? 'subscription_only' : 'no_subscription',
        subscription: hasSubscription ? { is_active: true } : null,
      };
    }

    // 6. إرجاع النتيجة
    if (result.allowed) {
      return NextResponse.json({
        success: true,
        allowed: true,
        reason: result.reason || 'allowed',
        subscription: result.subscription || null,
        device: result.device || null,
        isNewDevice: result.isNew || false,
      });
    }

    // 7. رفض الوصول
    return NextResponse.json({
      success: true,
      allowed: false,
      reason: result.reason || 'denied',
      message: getErrorMessage(result.reason),
      maxDevices: result.maxDevices || null,
      currentDevices: result.currentDevices || null,
    });

  } catch (error) {
    console.error('❌ Access check error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء التحقق من الصلاحية' },
      { status: 500 }
    );
  }
}

// ================================================================
// 🧪 دالة مساعدة للحصول على رسالة الخطأ
// ================================================================

function getErrorMessage(reason) {
  const messages = {
    no_subscription: 'لا يوجد اشتراك نشط لهذا الكورس',
    expired: 'انتهت صلاحية الاشتراك',
    max_devices: 'تم تجاوز الحد الأقصى للأجهزة المسموح بها',
    device_register_failed: 'فشل تسجيل الجهاز، يرجى المحاولة مرة أخرى',
    fingerprint_failed: 'تعذر الحصول على بصمة الجهاز',
    db_error: 'حدث خطأ في قاعدة البيانات',
    system_error: 'حدث خطأ في النظام',
  };
  return messages[reason] || 'لا يمكن الوصول إلى هذا المحتوى';
}

// ================================================================
// 🔍 GET – التحقق السريع (اختياري)
// ================================================================

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const studentId = searchParams.get('studentId');
    const checkDevices = searchParams.get('checkDevices') !== 'false';

    if (!courseId || !studentId) {
      return NextResponse.json(
        { success: false, error: 'معرف الكورس والطالب مطلوبان' },
        { status: 400 }
      );
    }

    // إعادة استخدام POST logic
    const mockRequest = {
      json: async () => ({ courseId, studentId, checkDevices }),
    };
    return await POST(mockRequest);

  } catch (error) {
    console.error('❌ GET access check error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء التحقق من الصلاحية' },
      { status: 500 }
    );
  }
}