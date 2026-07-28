

// app/api/courses/[id]/access/route.js
// API للتحقق من صلاحية وصول الطالب إلى كورس معين
// يدعم: الاشتراكات المدفوعة، أكواد الشحن، المجانية، والأجهزة

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

/**
 * GET /api/courses/[id]/access
 * التحقق من صلاحية وصول الطالب إلى كورس معين
 * 
 * @param {Request} request - كائن الطلب
 * @param {Object} params - معاملات الرابط
 * @returns {NextResponse} - نتيجة التحقق مع معلومات الوصول
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

    // جلب المستخدم الحالي من التوكن
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

    // 2. التحقق من الاشتراك النشط
    const { data: subscription, error: subError } = await supabase
      .from('course_subscriptions')
      .select('id, access_type, max_devices, activated_at, expires_at, is_active')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    // إذا كان هناك اشتراك نشط
    if (subscription && !subError) {
      // التحقق من انتهاء الصلاحية (إذا كان هناك تاريخ انتهاء)
      if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
        // الاشتراك منتهي الصلاحية - نقوم بتحديث حالته
        await supabase
          .from('course_subscriptions')
          .update({ is_active: false })
          .eq('id', subscription.id);

        return NextResponse.json({
          success: false,
          hasAccess: false,
          error: 'انتهت صلاحية اشتراكك في هذا الكورس',
          course,
          subscription: { ...subscription, is_active: false },
        });
      }

      // الاشتراك صالح - التحقق من الأجهزة
      const deviceCheck = await checkDeviceAccess(supabase, user.id, courseId, request);

      if (!deviceCheck.success) {
        return NextResponse.json({
          success: false,
          hasAccess: false,
          error: deviceCheck.error,
          course,
          subscription,
          deviceInfo: deviceCheck,
        });
      }

      // كل شيء على ما يرام
      return NextResponse.json({
        success: true,
        hasAccess: true,
        course,
        subscription,
        accessType: subscription.access_type,
        maxDevices: subscription.max_devices || course.max_devices || 2,
        deviceInfo: deviceCheck,
        message: `لديك صلاحية الوصول عبر ${subscription.access_type === 'paid' ? 'الدفع' : subscription.access_type === 'code' ? 'كود الشحن' : 'مجاني'}`,
      });
    }

    // 3. إذا كان الكورس مجانياً ولا يوجد اشتراك، يتم إنشاء اشتراك مجاني تلقائياً
    if (course.is_free) {
      // إنشاء اشتراك مجاني
      const { data: newSubscription, error: createError } = await supabase
        .from('course_subscriptions')
        .insert({
          student_id: user.id,
          course_id: courseId,
          access_type: 'free',
          max_devices: course.max_devices || 2,
          is_active: true,
          activated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating free subscription:', createError);
        return NextResponse.json(
          { success: false, error: 'حدث خطأ أثناء إنشاء الاشتراك المجاني' },
          { status: 500 }
        );
      }

      // تسجيل الجهاز
      const deviceCheck = await registerDevice(supabase, user.id, courseId, request);

      return NextResponse.json({
        success: true,
        hasAccess: true,
        course,
        subscription: newSubscription,
        accessType: 'free',
        maxDevices: course.max_devices || 2,
        deviceInfo: deviceCheck,
        message: 'تم إنشاء اشتراك مجاني تلقائياً',
      });
    }

    // 4. الكورس مدفوع ولا يوجد اشتراك نشط
    // التحقق من وجود اشتراك منتهي الصلاحية
    const { data: expiredSub, error: expiredError } = await supabase
      .from('course_subscriptions')
      .select('id, access_type, expires_at')
      .eq('student_id', user.id)
      .eq('course_id', courseId)
      .eq('is_active', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (expiredSub && !expiredError && expiredSub.expires_at) {
      const expiredDate = new Date(expiredSub.expires_at);
      if (expiredDate < new Date()) {
        return NextResponse.json({
          success: false,
          hasAccess: false,
          error: 'انتهت صلاحية اشتراكك السابق، يرجى تجديد الاشتراك',
          course,
          subscription: expiredSub,
          expiredDate: expiredDate.toISOString(),
        });
      }
    }

    // 5. لا يوجد اشتراك على الإطلاق
    return NextResponse.json({
      success: false,
      hasAccess: false,
      error: 'لا تملك صلاحية الوصول إلى هذا الكورس. يرجى الدفع أو تفعيل كود الشحن',
      course,
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

// ============================================================
// دوال مساعدة للتحقق من الأجهزة وتسجيلها
// ============================================================

/**
 * التحقق من صلاحية الجهاز الحالي
 */
async function checkDeviceAccess(supabase, userId, courseId, request) {
  try {
    // جلب بصمة الجهاز من الطلب
    const fingerprint = await getDeviceFingerprint(request);

    if (!fingerprint) {
      return {
        success: false,
        error: 'تعذر التعرف على الجهاز، يرجى المحاولة مرة أخرى',
        deviceRegistered: false,
      };
    }

    // البحث عن الجهاز المسجل
    const { data: device, error: deviceError } = await supabase
      .from('course_devices')
      .select('id, is_active, is_primary, device_name, first_used_at, last_used_at')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .eq('device_fingerprint', fingerprint)
      .single();

    if (device && !deviceError) {
      // الجهاز موجود
      if (!device.is_active) {
        return {
          success: false,
          error: 'تم حظر هذا الجهاز من قبل المعلم',
          deviceRegistered: true,
          device,
        };
      }

      // تحديث آخر استخدام
      await supabase
        .from('course_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', device.id);

      return {
        success: true,
        deviceRegistered: true,
        device,
        isPrimary: device.is_primary || false,
      };
    }

    // الجهاز غير مسجل - محاولة تسجيله
    return await registerDevice(supabase, userId, courseId, request);

  } catch (error) {
    console.error('Error checking device:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء التحقق من الجهاز',
      deviceRegistered: false,
    };
  }
}

/**
 * تسجيل جهاز جديد
 */
async function registerDevice(supabase, userId, courseId, request) {
  try {
    const fingerprint = await getDeviceFingerprint(request);

    if (!fingerprint) {
      return {
        success: false,
        error: 'تعذر التعرف على الجهاز، يرجى المحاولة مرة أخرى',
        deviceRegistered: false,
      };
    }

    // جلب الاشتراك الحالي للحصول على max_devices
    const { data: subscription } = await supabase
      .from('course_subscriptions')
      .select('id, max_devices')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    const maxDevices = subscription?.max_devices || 2;

    // حساب عدد الأجهزة المسجلة حالياً
    const { count, error: countError } = await supabase
      .from('course_devices')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (countError) throw countError;

    if (count >= maxDevices) {
      return {
        success: false,
        error: `لقد تجاوزت الحد الأقصى للأجهزة المسموح بها (${maxDevices})، يرجى حذف جهاز آخر أولاً`,
        deviceRegistered: false,
        maxDevices,
        currentDevices: count,
      };
    }

    // تسجيل الجهاز الجديد
    const deviceName = getDeviceName(request);
    const deviceInfo = {
      userAgent: request.headers.get('user-agent') || '',
      platform: request.headers.get('sec-ch-ua-platform') || '',
      deviceType: request.headers.get('sec-ch-ua-mobile') ? 'mobile' : 'desktop',
    };

    const { data: newDevice, error: insertError } = await supabase
      .from('course_devices')
      .insert({
        student_id: userId,
        course_id: courseId,
        device_fingerprint: fingerprint,
        device_name: deviceName,
        device_info: deviceInfo,
        is_active: true,
        is_primary: count === 0, // أول جهاز يكون أساسياً
        first_used_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // تسجيل محاولة الوصول في السجل
    await supabase
      .from('course_access_logs')
      .insert({
        student_id: userId,
        course_id: courseId,
        device_fingerprint: fingerprint,
        access_status: 'granted',
        ip_address: getClientIp(request),
        user_agent: request.headers.get('user-agent') || '',
        created_at: new Date().toISOString(),
      });

    return {
      success: true,
      deviceRegistered: true,
      device: newDevice,
      isPrimary: newDevice.is_primary || false,
      maxDevices,
      currentDevices: count + 1,
    };

  } catch (error) {
    console.error('Error registering device:', error);
    return {
      success: false,
      error: 'حدث خطأ أثناء تسجيل الجهاز',
      deviceRegistered: false,
    };
  }
}

/**
 * توليد بصمة الجهاز من الطلب
 */
async function getDeviceFingerprint(request) {
  try {
    const userAgent = request.headers.get('user-agent') || '';
    const ip = getClientIp(request) || '';
    const acceptLanguage = request.headers.get('accept-language') || '';
    const platform = request.headers.get('sec-ch-ua-platform') || '';

    // دمج المعلومات لتوليد بصمة فريدة
    const raw = `${userAgent}|${ip}|${acceptLanguage}|${platform}`;

    // استخدام Web Crypto API لتوليد SHA-256
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

/**
 * الحصول على اسم الجهاز من الطلب
 */
function getDeviceName(request) {
  const userAgent = request.headers.get('user-agent') || '';
  if (userAgent.includes('Windows')) return 'Windows PC';
  if (userAgent.includes('Macintosh')) return 'Mac';
  if (userAgent.includes('Linux')) return 'Linux PC';
  if (userAgent.includes('Android')) return 'Android Device';
  if (userAgent.includes('iPhone')) return 'iPhone';
  if (userAgent.includes('iPad')) return 'iPad';
  return 'جهاز غير معروف';
}

/**
 * الحصول على IP العميل
 */
function getClientIp(request) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return request.headers.get('x-real-ip') || request.headers.get('cf-connecting-ip') || 'unknown';
}

// ============================================================
// POST - تفعيل كود الشحن (اختياري)
// ============================================================

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

    // التحقق من صلاحية الكود
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

    // إنشاء اشتراك جديد
    const { data: subscription, error: subError } = await supabase
      .from('course_subscriptions')
      .insert({
        student_id: user.id,
        course_id: courseId,
        access_type: 'code',
        max_devices: codeData.max_devices || 1,
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
    });

  } catch (error) {
    console.error('Error activating code:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ أثناء تفعيل الكود' },
      { status: 500 }
    );
  }
}
