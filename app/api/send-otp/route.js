// app/api/send-otp/route.js
import { NextResponse } from 'next/server';

// دالة مساعدة لتحميل Resend عند الحاجة
async function getResendClient() {
  const { default: Resend } = await import('resend');
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY غير موجود في متغيرات البيئة');
  }
  return new Resend(apiKey);
}

export async function POST(request) {
  try {
    const { email, otp, studentName, phone, parentPhone, school, grade, governorate } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'البريد الإلكتروني أو الرمز مفقود' }, { status: 400 });
    }

    // محتوى البريد (HTML خفيف)
    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: Arial, sans-serif; background: #f9fafb; padding: 20px;">
  <div style="max-width: 500px; margin: auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <div style="background: #1a1f2e; padding: 20px; text-align: center;">
      <h1 style="color: #fbbf24; margin: 0;">منصة محمد رضوان</h1>
      <p style="color: #d1d5db; margin: 5px 0 0;">تأكيد التسجيل</p>
    </div>
    <div style="padding: 20px;">
      <p>مرحباً <strong>${studentName || 'الطالب'}</strong>،</p>
      <p>رمز التحقق الخاص بك هو:</p>
      <div style="text-align: center; margin: 20px 0;">
        <span style="font-size: 32px; letter-spacing: 6px; font-weight: bold; color: #1a1a1a; background: #fef3c7; padding: 10px 20px; border-radius: 8px; border: 1px dashed #fbbf24;">${otp}</span>
      </div>
      <p style="color: #555;">الرمز صالح لمدة <strong>5 دقائق</strong>.</p>
      <p style="color: #888; font-size: 12px;">هذه رسالة آلية، يرجى عدم الرد.</p>
    </div>
  </div>
</body>
</html>
    `;

    // تحميل Resend وإرسال البريد
    const resend = await getResendClient();

    const { data, error } = await resend.emails.send({
      from: 'منصة محمد رضوان <onboarding@resend.dev>',
      to: email,
      subject: 'رمز تأكيد التسجيل – منصة محمد رضوان',
      html: htmlContent,
    });

    if (error) {
      console.error('Resend error:', error);
      return NextResponse.json({ error: 'فشل إرسال البريد الإلكتروني' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'تم إرسال رمز التحقق بنجاح' });
  } catch (error) {
    console.error('OTP route error:', error);
    return NextResponse.json({ error: 'حدث خطأ داخلي' }, { status: 500 });
  }
}