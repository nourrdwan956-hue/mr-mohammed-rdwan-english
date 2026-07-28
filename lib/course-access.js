

// lib/course-access.js
// ================================================================
// 🛡️ نظام التحقق من الوصول إلى الكورسات المدفوعة
// يتعامل مع: الاشتراكات، الأجهزة، الأكواد، وسجل الدخول
// ================================================================

import { supabase } from '@/lib/supabaseClient';
import { getDeviceFingerprint, getDeviceName, getDeviceInfo } from '@/lib/device-fingerprint';

/**
 * التحقق من صلاحية الوصول إلى كورس معين للطالب الحالي
 * @param {string} courseId - معرف الكورس
 * @param {string} studentId - معرف الطالب
 * @returns {Promise<{ allowed: boolean, reason?: string, device?: object, subscription?: object, maxDevices?: number, currentDevices?: number }>}
 */
export async function checkCourseAccess(courseId, studentId) {
  try {
    // 1. جلب بصمة الجهاز الحالي
    const fingerprint = await getDeviceFingerprint();
    if (!fingerprint) {
      return { allowed: false, reason: 'fingerprint_failed' };
    }

    // 2. التحقق من وجود اشتراك نشط للطالب في هذا الكورس
    const { data: subscription, error: subError } = await supabase
      .from('course_subscriptions')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (subError || !subscription) {
      await logAccessAttempt(studentId, courseId, fingerprint, 'no_subscription');
      return { allowed: false, reason: 'no_subscription' };
    }

    // 3. التحقق من صلاحية الاشتراك (تاريخ الانتهاء)
    if (subscription.expires_at && new Date(subscription.expires_at) < new Date()) {
      // إلغاء تنشيط الاشتراك تلقائياً
      await supabase
        .from('course_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', subscription.id);
      
      await logAccessAttempt(studentId, courseId, fingerprint, 'expired');
      return { allowed: false, reason: 'expired' };
    }

    // 4. تسجيل الجهاز الجديد أو تحديثه (upsert)
    const deviceName = getDeviceName();
    const deviceInfo = getDeviceInfo();

    const { data: device, error: upsertError } = await supabase
      .from('course_devices')
      .upsert({
        student_id: studentId,
        course_id: courseId,
        device_fingerprint: fingerprint,
        device_name: deviceName,
        device_info: deviceInfo,
        is_primary: false, // سيتم ضبطها لاحقاً
        last_used_at: new Date().toISOString(),
      }, {
        onConflict: 'student_id, course_id, device_fingerprint',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (upsertError) {
      console.error('Error upserting device:', upsertError);
      await logAccessAttempt(studentId, courseId, fingerprint, 'device_register_failed');
      return { allowed: false, reason: 'device_register_failed' };
    }

    // إذا كان هذا هو الجهاز الأول، اجعله أساسياً
    if (device.is_primary === null || device.is_primary === undefined) {
      const { count } = await supabase
        .from('course_devices')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('is_active', true);

      if (count === 1) {
        await supabase
          .from('course_devices')
          .update({ is_primary: true })
          .eq('id', device.id);
      }
    }

    await logAccessAttempt(studentId, courseId, fingerprint, 'allowed');
    return {
      allowed: true,
      device,
      subscription,
      reason: 'device_registered_or_updated'
    };

  } catch (error) {
    console.error('Course access check error:', error);
    return { allowed: false, reason: 'system_error' };
  }
}

/**
 * تفعيل كود شحن للطالب
 * @param {string} code - كود الشحن
 * @param {string} studentId - معرف الطالب
 * @param {string} courseId - معرف الكورس (إلزامي)
 * @returns {Promise<{ success: boolean, message: string, subscription?: object }>}
 */
export async function activateAccessCode(code, studentId, courseId) {
  try {
    if (!code || !studentId) {
      return { success: false, message: 'بيانات غير مكتملة' };
    }

    // ✅ يجب أن يكون courseId إلزامياً لتجنب الغموض
    if (!courseId) {
      return { success: false, message: 'معرف الكورس مطلوب' };
    }

    // البحث عن الكود (مع courseId إلزامي)
    const { data: codeData, error: codeError } = await supabase
      .from('course_access_codes')
      .select('*')
      .eq('code', code.trim().toUpperCase())
      .eq('course_id', courseId)
      .eq('is_used', false)
      .eq('is_active', true)
      .single();

    if (codeError || !codeData) {
      return { success: false, message: 'الكود غير صالح أو منتهي الصلاحية' };
    }

    // 2. التحقق من صلاحية الكود (تاريخ الانتهاء)
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return { success: false, message: 'انتهت صلاحية الكود' };
    }

    // 3. التحقق من عدم وجود اشتراك مسبق للطالب في هذا الكورس
    const { data: existingSub } = await supabase
      .from('course_subscriptions')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', codeData.course_id)
      .maybeSingle();

    if (existingSub) {
      return { success: false, message: 'أنت مشترك بالفعل في هذا الكورس' };
    }

    // 4. إنشاء اشتراك جديد للطالب
    const expiresAt = codeData.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const { data: subscription, error: subError } = await supabase
      .from('course_subscriptions')
      .insert({
        student_id: studentId,
        course_id: codeData.course_id,
        access_type: 'code',
        max_devices: codeData.max_devices || 1,
        activated_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      return { success: false, message: 'فشل إنشاء الاشتراك' };
    }

    // 5. تحديث حالة الكود إلى مستخدم
    await supabase
      .from('course_access_codes')
      .update({
        is_used: true,
        used_by_user_id: studentId,
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', codeData.id);

    // 6. تسجيل استخدام الكود
    const fingerprint = await getDeviceFingerprint();
    await supabase
      .from('code_usage_logs')
      .insert({
        code_id: codeData.id,
        student_id: studentId,
        device_fingerprint: fingerprint || 'unknown',
        used_at: new Date().toISOString(),
      });

    return {
      success: true,
      message: 'تم تفعيل الكود بنجاح!',
      subscription,
      courseId: codeData.course_id,
    };

  } catch (error) {
    console.error('Error activating code:', error);
    return { success: false, message: 'حدث خطأ أثناء تفعيل الكود' };
  }
}

/**
 * الحصول على قائمة الأجهزة المسجلة للطالب في كورس معين
 * @param {string} studentId - معرف الطالب
 * @param {string} courseId - معرف الكورس
 * @returns {Promise<{ devices: Array, subscription: object }>}
 */
export async function getStudentDevices(studentId, courseId) {
  try {
    const [devicesRes, subRes] = await Promise.all([
      supabase
        .from('course_devices')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('first_used_at', { ascending: true }),
      supabase
        .from('course_subscriptions')
        .select('*')
        .eq('student_id', studentId)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .single(),
    ]);

    return {
      devices: devicesRes.data || [],
      subscription: subRes.data || null,
    };
  } catch (error) {
    console.error('Error fetching devices:', error);
    return { devices: [], subscription: null };
  }
}

/**
 * إلغاء تنشيط جهاز (حذف) – للطالب أو المعلم
 * @param {string} deviceId - معرف الجهاز
 * @param {string} studentId - معرف الطالب (للتحقق من الملكية)
 * @returns {Promise<{ success: boolean }>}
 */
export async function deactivateDevice(deviceId, studentId) {
  try {
    const { error } = await supabase
      .from('course_devices')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', deviceId)
      .eq('student_id', studentId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deactivating device:', error);
    return { success: false };
  }
}

/**
 * تسجيل محاولة دخول في سجل الأحداث
 * @param {string} studentId - معرف الطالب
 * @param {string} courseId - معرف الكورس
 * @param {string} fingerprint - بصمة الجهاز
 * @param {string} status - الحالة (allowed, blocked, max_devices, expired, ...)
 */
async function logAccessAttempt(studentId, courseId, fingerprint, status) {
  try {
    await supabase
      .from('course_access_logs')
      .insert({
        student_id: studentId,
        course_id: courseId,
        device_fingerprint: fingerprint || 'unknown',
        access_status: status,
        user_agent: typeof window !== 'undefined' ? navigator.userAgent : null,
        created_at: new Date().toISOString(),
      });
  } catch (e) {
    // تجاهل أخطاء التسجيل (لا تؤثر على الوظيفة الأساسية)
    console.warn('Failed to log access attempt:', e);
  }
}

/**
 * التحقق من صلاحية جهاز معين للطالب في كورس معين (معرف بالفعل)
 * @param {string} studentId - معرف الطالب
 * @param {string} courseId - معرف الكورس
 * @param {string} fingerprint - بصمة الجهاز
 * @returns {Promise<{ allowed: boolean, device?: object }>}
 */
export async function validateDevice(studentId, courseId, fingerprint) {
  try {
    const { data, error } = await supabase
      .from('course_devices')
      .select('*')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('device_fingerprint', fingerprint)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !data) {
      return { allowed: false };
    }

    // تحديث وقت آخر استخدام
    await supabase
      .from('course_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', data.id);

    return { allowed: true, device: data };
  } catch (error) {
    console.error('Error validating device:', error);
    return { allowed: false };
  }
}

/**
 * التحقق من وجود اشتراك نشط فقط (بدون أجهزة)
 * @param {string} studentId - معرف الطالب
 * @param {string} courseId - معرف الكورس
 * @returns {Promise<boolean>}
 */
export async function checkSubscriptionOnly(studentId, courseId) {
  try {
    const { data, error } = await supabase
      .from('course_subscriptions')
      .select('id, expires_at')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (error || !data) return false;

    // التحقق من انتهاء الصلاحية
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      // تحديث الحالة تلقائياً
      await supabase
        .from('course_subscriptions')
        .update({ is_active: false })
        .eq('id', data.id);
      return false;
    }

    return true;
  } catch {
    return false;
  }
}