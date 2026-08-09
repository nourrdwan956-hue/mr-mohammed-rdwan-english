// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendResetPasswordEmail } from '@/lib/resend';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, redirectTo } = body;

    // التحقق من وجود البريد
    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    // استخدام عميل المسؤول في Supabase لتوليد رابط إعادة التعيين
    const supabaseAdmin = createAdminClient();

    // إنشاء رابط استعادة باستخدام Admin API
    const { data, error } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email.trim(),
      options: {
        redirectTo: redirectTo || `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
      },
    });

    if (error) {
      console.error('❌ فشل توليد رابط الاستعادة من Supabase:', error);
      return NextResponse.json(
        { error: error.message || 'فشل توليد رابط الاستعادة' },
        { status: 500 }
      );
    }

    // استخراج الرابط من الرد
    const resetLink = data?.properties?.action_link;
    if (!resetLink) {
      return NextResponse.json(
        { error: 'لم نتمكن من توليد رابط صالح' },
        { status: 500 }
      );
    }

    console.log(`🔗 تم توليد رابط الاستعادة لـ ${email}:`, resetLink);

    // إرسال البريد عبر Resend
    const { error: emailError } = await sendResetPasswordEmail(
      email.trim(),
      resetLink,
      '' // يمكن إضافة اسم المستخدم لو موجود
    );

    if (emailError) {
      console.error('❌ فشل إرسال البريد عبر Resend:', emailError);
      return NextResponse.json(
        { error: emailError.message || 'فشل إرسال البريد الإلكتروني' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم إرسال رابط إعادة التعيين بنجاح',
    });
  } catch (err) {
    console.error('❌ خطأ عام في API:', err);
    return NextResponse.json(
      { error: err.message || 'حدث خطأ غير متوقع' },
      { status: 500 }
    );
  }
}