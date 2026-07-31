// app/api/codes/activate/route.js
// ================================================================
// 🎫 API تفعيل كود الشحن – باستخدام upsert للاشتراكات
// ================================================================

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getDeviceFingerprint } from '@/lib/device-fingerprint';

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, studentId, courseId } = body;

    if (!code || !studentId) {
      return NextResponse.json(
        { success: false, message: 'الكود ومعرف الطالب مطلوبان' },
        { status: 400 }
      );
    }

    const cleanCode = code.trim().toUpperCase();

    const query = supabase
      .from('course_access_codes')
      .select('*, courses:course_id(title, is_free, price)')
      .eq('code', cleanCode)
      .eq('is_used', false)
      .eq('is_active', true);

    if (courseId) {
      query.eq('course_id', courseId);
    }

    const { data: codeData, error: codeError } = await query.single();

    if (codeError || !codeData) {
      return NextResponse.json(
        { success: false, message: 'الكود غير صالح أو منتهي الصلاحية' },
        { status: 404 }
      );
    }

    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      await supabase
        .from('course_access_codes')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', codeData.id);
      return NextResponse.json(
        { success: false, message: 'انتهت صلاحية الكود' },
        { status: 400 }
      );
    }

    // ========== ✅ استخدام upsert بدلاً من insert/update ==========
    const expiresAt = codeData.expires_at || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { data: subscription, error: subError } = await supabase
      .from('course_subscriptions')
      .upsert(
        {
          student_id: studentId,
          course_id: codeData.course_id,
          access_type: 'code',
          max_devices: codeData.max_devices || 2,
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
          is_active: true,
        },
        {
          onConflict: 'student_id,course_id',
        }
      )
      .select()
      .single();

    if (subError) {
      console.error('❌ Error upserting subscription:', subError);
      return NextResponse.json(
        { success: false, message: 'فشل إنشاء الاشتراك' },
        { status: 500 }
      );
    }
    // ========== نهاية التعديل ==========

    // تسجيل الدفعة
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('price')
        .eq('id', codeData.course_id)
        .single();
      const price = courseData?.price || 0;
      const amountInCents = Math.round(price * 100);

      const { error: paymentError } = await supabase
        .from('course_payments')
        .insert({
          student_id: studentId,
          course_id: codeData.course_id,
          amount: amountInCents,
          payment_status: 'paid',
          payment_method: 'code',
          transaction_id: codeData.code,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (paymentError) {
        console.error('❌ Failed to record payment:', paymentError);
      }
    } catch (paymentErr) {
      console.error('❌ Error recording payment:', paymentErr);
    }

    // تحديث الكود
    await supabase
      .from('course_access_codes')
      .update({
        is_used: true,
        used_by_user_id: studentId,
        used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', codeData.id);

    // سجل الاستخدام
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
    }

    // enrollment
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

    // تسجيل الجهاز
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
        }
      }
    } catch (deviceErr) {
      console.warn('⚠️ Could not register device:', deviceErr);
    }

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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const courseId = searchParams.get('courseId');

    if (!code) {
      return NextResponse.json({ success: false, message: 'الكود مطلوب' }, { status: 400 });
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
      return NextResponse.json({ success: false, valid: false, message: 'الكود غير صالح' });
    }

    if (data.is_used) {
      return NextResponse.json({ success: true, valid: false, message: 'الكود مستخدم بالفعل', data });
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      return NextResponse.json({ success: true, valid: false, message: 'انتهت صلاحية الكود', data });
    }

    return NextResponse.json({ success: true, valid: true, message: 'الكود صالح', data });
  } catch (error) {
    console.error('❌ Code check error:', error);
    return NextResponse.json({ success: false, message: 'حدث خطأ أثناء التحقق من الكود' }, { status: 500 });
  }
}