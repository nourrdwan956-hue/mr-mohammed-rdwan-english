// app/api/send-otp/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { email, otp, studentName, phone, parentPhone, school, grade, governorate } = await request.json();

    if (!email || !otp) {
      return NextResponse.json({ error: 'يرجى إدخال البريد الإلكتروني ورمز التحقق' }, { status: 400 });
    }

    // إنشاء ناقل SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: (process.env.SMTP_PASS || '').replace(/\s/g, ''),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // ✅ محتوى نصي عادي – محسن (الرمز في سطر منفصل)
    const plainText = `مرحباً ${studentName || 'الطالب'}،

رمز تأكيد التسجيل في منصة محمد رضوان هو:

${otp}

الرمز صالح لمدة 5 دقائق فقط.

قم بإدخال هذا الرمز في الصفحة الخاصة بتأكيد البريد الإلكتروني لإكمال التسجيل.

مع تحيات فريق الدعم.`;

    // ✅ محتوى HTML – تحسينات كبيرة للوضوح
    const htmlContent = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head><meta charset="UTF-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; background: #f9fafb; padding: 20px;">
  <div style="max-width: 550px; margin: auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 8px 24px rgba(0,0,0,0.08);">
    <!-- الهيدر -->
    <div style="background: #1a1f2e; padding: 24px 20px; text-align: center;">
      <h1 style="color: #fbbf24; margin: 0; font-size: 28px;">منصة محمد رضوان</h1>
      <p style="color: #d1d5db; margin: 6px 0 0; font-size: 16px;">🔐 تأكيد التسجيل</p>
    </div>

    <!-- المحتوى -->
    <div style="padding: 30px 24px;">
      <p style="font-size: 18px; margin-top: 0;">مرحباً <strong>${studentName || 'الطالب'}</strong>،</p>
      <p style="font-size: 16px; color: #333;">تم إنشاء طلب تسجيل جديد لحسابك. لإكمال العملية، استخدم رمز التحقق التالي:</p>

      <!-- ✅ رمز التحقق – كبير وواضح جداً -->
      <div style="text-align: center; margin: 30px 0; padding: 20px; background: #fef9e7; border: 2px solid #fbbf24; border-radius: 16px; box-shadow: 0 4px 12px rgba(251, 191, 36, 0.2);">
        <span style="font-size: 52px; letter-spacing: 8px; font-weight: 900; color: #1a1a1a; background: #ffffff; padding: 12px 28px; border-radius: 12px; display: inline-block; border: 1px dashed #f59e0b; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
          ${otp}
        </span>
      </div>

      <p style="font-size: 16px; color: #444; text-align: center;">
        ⏳ هذا الرمز صالح لمدة <strong>5 دقائق</strong> فقط.
      </p>
      <p style="font-size: 16px; color: #444; text-align: center;">
        الرجاء إدخال الرمز في الصفحة المخصصة لتأكيد البريد الإلكتروني.
      </p>

      <!-- بيانات إضافية (اختيارية) -->
      <div style="background: #f0fdf4; padding: 16px; border-radius: 10px; margin: 20px 0; border-right: 4px solid #22c55e;">
        <p style="margin: 0 0 4px; color: #166534; font-weight: bold;">📋 بياناتك المسجلة:</p>
        <p style="margin: 2px 0; font-size: 14px; color: #14532d;">
          الهاتف: ${phone || 'غير مضاف'} | ولي الأمر: ${parentPhone || 'غير مضاف'}
        </p>
        <p style="margin: 2px 0; font-size: 14px; color: #14532d;">
          المدرسة: ${school || 'غير مضاف'} | الصف: ${grade || 'غير مضاف'} | المحافظة: ${governorate || 'غير مضاف'}
        </p>
      </div>

      <p style="color: #888; font-size: 13px; text-align: center; border-top: 1px solid #eee; padding-top: 16px;">
        📧 هذه رسالة آلية، يرجى عدم الرد عليها.<br>
        إذا لم تطلب هذا التسجيل، يمكنك تجاهل هذه الرسالة.
      </p>
    </div>
  </div>
</body>
</html>
    `;

    // إرسال البريد
    const info = await transporter.sendMail({
      from: `"منصة محمد رضوان" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔐 رمز تأكيد التسجيل – منصة محمد رضوان',
      text: plainText,
      html: htmlContent,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'High',
        'List-Unsubscribe': `<mailto:${process.env.SMTP_USER}>`,
      },
    });

    console.log('✅ OTP sent:', info.messageId);
    return NextResponse.json({ success: true, message: 'تم إرسال رمز التحقق بنجاح' });
  } catch (error) {
    console.error('❌ OTP send error:', error);
    return NextResponse.json(
      { error: 'فشل إرسال رمز التحقق. تأكد من اتصالك بالإنترنت أو حاول لاحقاً.' },
      { status: 500 }
    );
  }
}