// app/api/auth/reset-password/route.js
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { sendResetPasswordEmail } from '@/lib/resend';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, redirectTo } = body;

    if (!email || !email.trim()) {
      return NextResponse.json(
        { error: 'البريد الإلكتروني مطلوب' },
        { status: 400 }
      );
    }

    // ✅ التحقق من وجود مفتاح Resend
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY غير موجود في البيئة');
      return NextResponse.json(
        { error: 'خدمة البريد غير متاحة حالياً، يرجى المحاولة لاحقاً' },
        { status: 503 }
      );
    }

    const supabaseAdmin = createAdminClient();

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

    const resetLink = data?.properties?.action_link;
    if (!resetLink) {
      return NextResponse.json(
        { error: 'لم نتمكن من توليد رابط صالح' },
        { status: 500 }
      );
    }

    console.log(`🔗 تم توليد رابط الاستعادة لـ ${email}:`, resetLink);

    const { error: emailError } = await sendResetPasswordEmail(
      email.trim(),
      resetLink,
      ''
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