// app/api/codes/activate/route.js
// ================================================================
// 🎫 API تفعيل كود الشحن – للطلاب الذين لديهم أكواد من المعلمين
// ================================================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getDeviceFingerprint } from '@/lib/device-fingerprint';

// ================================================================
// 📥 تفعيل كود الشحن
// ================================================================

export async function POST(request) {
  try {
    // 1. استلام البيانات من الطلب
    const body = await request.json();
    const { code, studentId, courseId } = body;

    // 2. التحقق من صحة المدخلات
    if (!code || !studentId) {
      return NextResponse.json(
        { success: false, message: 'الكود ومعرف الطالب مطلوبان' },
        { status: 400 }
      );
    }

    // 3. تنظيف الكود (إزالة المسافات وتحويل إلى أحرف كبيرة)
    const cleanCode = code.trim().toUpperCase();

    // 4. البحث عن الكود في قاعدة البيانات
    const query = supabase
      .from('course_access_codes')
      .select('*, courses:course_id(title, is_free, price)')
      .eq('code', cleanCode)
      .eq('is_used', false)
      .eq('is_active', true);

    // إذا تم تمرير courseId، نضيفه كشرط إضافي
    if (courseId) {
      query.eq('course_id', courseId);
    }

    const { data: codeData, error: codeError } = await query.single();

    if (codeError || !codeData) {
      console.error('❌ Code not found or already used:', codeError);
      return NextResponse.json(
        { success: false, message: 'الكود غير صالح أو منتهي الصلاحية' },
        { status: 404 }
      );
    }

    // 5. التحقق من صلاحية الكود (تاريخ الانتهاء)
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      // تحديث حالة الكود إلى غير نشط
      await supabase
        .from('course_access_codes')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', codeData.id);

      return NextResponse.json(
        { success: false, message: 'انتهت صلاحية الكود' },
        { status: 400 }
      );
    }

    // 6. التحقق من عدم وجود اشتراك مسبق للطالب في هذا الكورس
    const { data: existingSub, error: subCheckError } = await supabase
      .from('course_subscriptions')
      .select('id, is_active')
      .eq('student_id', studentId)
      .eq('course_id', codeData.course_id)
      .maybeSingle();

    if (existingSub && existingSub.is_active) {
      return NextResponse.json(
        { success: false, message: 'أنت مشترك بالفعل في هذا الكورس' },
        { status: 400 }
      );
    }

    // 7. إنشاء اشتراك جديد للطالب
    const expiresAt = codeData.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const { data: subscription, error: subError } = await supabase
      .from('course_subscriptions')
      .insert({
        student_id: studentId,
        course_id: codeData.course_id,
        access_type: 'code',
        max_devices: codeData.max_devices || 2, // ← التغيير هنا (كان 1)
        activated_at: new Date().toISOString(),
        expires_at: expiresAt,
        is_active: true,
      })
      .select()
      .single();

    if (subError) {
      console.error('❌ Error creating subscription:', subError);
      return NextResponse.json(
        { success: false, message: 'فشل إنشاء الاشتراك' },
        { status: 500 }
      );
    }

    // ================================================================
    // ✅ تسجيل الدفعة في سجل المدفوعات
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
      } else {
        console.log('✅ Payment recorded for code activation:', codeData.code);
      }
    } catch (paymentErr) {
      console.error('❌ Error recording payment:', paymentErr);
    }

    // 8. تحديث حالة الكود إلى مستخدم
    const { error: updateError } = await supabase
      .from('course_access_codes')
      .update({
        is_used: true,
        used_by_user_id: studentId,
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', codeData.id);

    if (updateError) {
      console.error('❌ Error updating code:', updateError);
      // لا نوقف العملية هنا، فقط نسجل الخطأ
    }

    // 9. تسجيل استخدام الكود (للأمان والمراجعة)
    try {
      const fingerprint = await getDeviceFingerprint();
      await supabase
        .from('code_usage_logs')
        .insert({
          code_id: codeData.id,
          student_id: studentId,
          device_fingerprint: fingerprint || 'unknown',
          used_at: new Date().toISOString(),
        });
    } catch (logError) {
      console.warn('⚠️ Failed to log code usage:', logError);
      // لا نوقف العملية هنا
    }

    // 10. إذا كان هناك تسجيل (enrollment) سابق، نقوم بتحديثه
    const { data: existingEnroll } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', codeData.course_id)
      .maybeSingle();

    if (existingEnroll) {
      await supabase
        .from('enrollments')
        .update({
          progress: 0,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingEnroll.id);
    } else {
      // إنشاء تسجيل جديد
      await supabase
        .from('enrollments')
        .insert({
          student_id: studentId,
          course_id: codeData.course_id,
          progress: 0,
          enrolled_at: new Date().toISOString(),
        });
    }

    // ================================================================
    // ✅ تسجيل الجهاز الحالي تلقائياً
    // ================================================================
    try {
      const deviceFingerprint = await getDeviceFingerprint();
      if (deviceFingerprint) {
        const { count } = await supabase
          .from('course_devices')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentId)
          .eq('course_id', codeData.course_id)
          .eq('is_active', true);

        if ((count || 0) < (codeData.max_devices || 2)) {
          await supabase
            .from('course_devices')
            .insert({
              student_id: studentId,
              course_id: codeData.course_id,
              device_fingerprint: deviceFingerprint,
              device_name: 'جهاز أساسي',
              device_info: {},
              is_active: true,
              is_primary: true,
              first_used_at: new Date().toISOString(),
              last_used_at: new Date().toISOString(),
            });
          console.log('✅ Device registered during code activation');
        }
      }
    } catch (deviceErr) {
      console.warn('⚠️ Could not register device:', deviceErr);
    }

    // 11. إرجاع الرد الناجح
    return NextResponse.json({
      success: true,
      message: 'تم تفعيل الكود بنجاح!',
      subscription,
      courseId: codeData.course_id,
      courseTitle: codeData.courses?.title || 'الكورس',
    });

  } catch (error) {
    console.error('❌ Code activation error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء تفعيل الكود' },
      { status: 500 }
    );
  }
}

// ================================================================
// 🔍 GET – التحقق من صحة الكود (اختياري)
// ================================================================

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const courseId = searchParams.get('courseId');

    if (!code) {
      return NextResponse.json(
        { success: false, message: 'الكود مطلوب' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    const query = supabase
      .from('course_access_codes')
      .select('code, is_used, is_active, expires_at, course_id')
      .eq('code', cleanCode)
      .eq('is_active', true);

    if (courseId) {
      query.eq('course_id', courseId);
    }

    const { data, error } = await query.maybeSingle();

    if (error || !data) {
      return NextResponse.json({
        success: false,
        valid: false,
        message: 'الكود غير صالح',
      });
    }

    if (data.is_used) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'الكود مستخدم بالفعل',
        data,
      });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({
        success: true,
        valid: false,
        message: 'انتهت صلاحية الكود',
        data,
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      message: 'الكود صالح',
      data,
    });

  } catch (error) {
    console.error('❌ Code check error:', error);
    return NextResponse.json(
      { success: false, message: 'حدث خطأ أثناء التحقق من الكود' },
      { status: 500 }
    );
  }
}