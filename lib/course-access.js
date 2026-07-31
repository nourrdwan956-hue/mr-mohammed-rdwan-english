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
      await logAccessAttempt(studentId, courseId, fingerprint, 'fingerprint_failed');
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
      await supabase
        .from('course_subscriptions')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', subscription.id);
      
      await logAccessAttempt(studentId, courseId, fingerprint, 'expired');
      return { allowed: false, reason: 'expired' };
    }

    // 4. الحصول على max_devices من الاشتراك أو من الكورس
    let maxDevices = subscription.max_devices;
    if (!maxDevices) {
      // جلب من الكورس كـ fallback
      const { data: course } = await supabase
        .from('courses')
        .select('max_devices')
        .eq('id', courseId)
        .single();
      maxDevices = course?.max_devices || 2;
    }

    // 5. حساب عدد الأجهزة المسجلة حالياً (النشطة) لهذا الطالب والكورس
    const { count, error: countError } = await supabase
      .from('course_devices')
      .select('id', { count: 'exact', head: true })
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('is_active', true);

    if (countError) {
      console.error('Error counting devices:', countError);
      await logAccessAttempt(studentId, courseId, fingerprint, 'db_error');
      return { allowed: false, reason: 'db_error' };
    }

    const currentDevices = count || 0;

    // 6. التحقق مما إذا كان الجهاز الحالي مسجلاً بالفعل
    const { data: existingDevice, error: existingError } = await supabase
      .from('course_devices')
      .select('id, is_primary')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .eq('device_fingerprint', fingerprint)
      .eq('is_active', true)
      .maybeSingle();

    const isExisting = existingDevice !== null;

    // 7. إذا كان الجهاز موجوداً بالفعل → سماح (تحديث وقت آخر استخدام)
    if (isExisting) {
      await supabase
        .from('course_devices')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', existingDevice.id);

      await logAccessAttempt(studentId, courseId, fingerprint, 'allowed_existing');
      return {
        allowed: true,
        device: existingDevice,
        subscription,
        maxDevices,
        currentDevices,
        reason: 'existing_device',
      };
    }

    // 8. الجهاز غير مسجل → التحقق من الحد الأقصى
    if (currentDevices >= maxDevices) {
      await logAccessAttempt(studentId, courseId, fingerprint, 'max_devices');
      return {
        allowed: false,
        reason: 'max_devices',
        maxDevices,
        currentDevices,
        subscription,
      };
    }

    // 9. تسجيل الجهاز الجديد (لأن العدد أقل من maxDevices)
    const deviceName = getDeviceName();
    const deviceInfo = getDeviceInfo();

    const { data: newDevice, error: insertError } = await supabase
      .from('course_devices')
      .insert({
        student_id: studentId,
        course_id: courseId,
        device_fingerprint: fingerprint,
        device_name: deviceName,
        device_info: deviceInfo,
        is_active: true,
        is_primary: currentDevices === 0, // أول جهاز يكون أساسياً
        first_used_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting device:', insertError);
      await logAccessAttempt(studentId, courseId, fingerprint, 'device_register_failed');
      return { allowed: false, reason: 'device_register_failed' };
    }

    await logAccessAttempt(studentId, courseId, fingerprint, 'allowed_new');
    return {
      allowed: true,
      device: newDevice,
      subscription,
      maxDevices,
      currentDevices: currentDevices + 1,
      reason: 'new_device_registered',
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
        max_devices: codeData.max_devices || 2, // جهازين زي الدفع
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

    // ================================================================
    // ✅ 7. تسجيل الدفعة في سجل المدفوعات (ربط الكود بالدفع)
    // ================================================================
    try {
      // جلب سعر الكورس
      const { data: courseData } = await supabase
        .from('courses')
        .select('price')
        .eq('id', codeData.course_id)
        .single();

      const price = courseData?.price || 0;
      const amountInCents = Math.round(price * 100); // تخزين بالأقرش

      // إدراج سجل دفع جديد
      const { error: paymentError } = await supabase
        .from('course_payments')
        .insert({
          student_id: studentId,
          course_id: codeData.course_id,
          amount: amountInCents,
          payment_status: 'paid',
          payment_method: 'code',
          transaction_id: codeData.code, // الكود نفسه كمرجع
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (paymentError) {
        console.error('❌ Failed to record payment for code activation:', paymentError);
        // لا نوقف العملية، فقط نسجل الخطأ
      } else {
        console.log('✅ Payment recorded for code activation:', codeData.code);
      }
    } catch (paymentErr) {
      console.error('❌ Error recording payment:', paymentErr);
    }

    // 8. إنشاء تسجيل في enrollments (للتأكيد)
    const { data: existingEnroll } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', codeData.course_id)
      .maybeSingle();

    if (existingEnroll) {
      await supabase
        .from('enrollments')
        .update({ progress: 0, updated_at: new Date().toISOString() })
        .eq('id', existingEnroll.id);
    } else {
      await supabase
        .from('enrollments')
        .insert({
          student_id: studentId,
          course_id: codeData.course_id,
          progress: 0,
          enrolled_at: new Date().toISOString(),
        });
    }

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

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
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