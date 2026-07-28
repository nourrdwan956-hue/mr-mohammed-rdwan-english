


// app/api/send-otp/route.js
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request) {
  try {
    const { email, otp, studentName, phone, parentPhone, school, grade, governorate } = await request.json();

    // إعدادات SMTP (استخدم بريد Gmail مجاني)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // ✨ القالب الجديد مع الشعار الرسمي
    const htmlContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>رمز تأكيد التسجيل – منصة محمد رضوان</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5; margin: 0; padding: 20px; }
        .container { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden; }
        .header { background: linear-gradient(135deg, #1a1f2e 0%, #0f1225 100%); padding: 24px 20px; text-align: center; }
        .header img { width: 72px; height: 72px; border-radius: 16px; background: #fff; padding: 8px; box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
        .header h1 { margin: 12px 0 0; color: #fbbf24; font-size: 24px; }
        .header p { margin: 6px 0 0; color: #9ca3af; font-size: 14px; }
        .content { padding: 28px 24px; }
        .content h2 { color: #1a1a1a; font-size: 20px; margin-top: 0; }
        .info-block { background: #f9fafb; border-radius: 10px; padding: 14px 16px; margin: 12px 0; border-right: 4px solid #fbbf24; }
        .info-block p { margin: 4px 0; color: #333; font-size: 14px; }
        .info-block strong { color: #1a1a1a; }
        .otp-box { background: #fef3c7; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0; border: 2px dashed #fbbf24; }
        .otp-box span { font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #1a1a1a; font-family: 'Courier New', monospace; }
        .note { background: #f0fdf4; border-radius: 8px; padding: 12px 16px; margin: 16px 0; border-right: 4px solid #22c55e; }
        .note p { margin: 4px 0; color: #166534; font-size: 14px; }
        .footer { background: #f3f4f6; padding: 16px 24px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        .footer a { color: #f59e0b; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- الرأس -->
        <div class="header">
          <img src="https://ucwwejlbulvkixgnzayq.supabase.co/storage/v1/object/public/images/logo.png" alt="منصة محمد رضوان" />
          <h1>منصة محمد رضوان</h1>
          <p>للغة الإنجليزية – تأكيد التسجيل</p>
        </div>

        <!-- المحتوى -->
        <div class="content">
          <h2>مرحباً ${studentName || 'الطالب'}،</h2>
          <p style="color: #333; font-size: 15px; line-height: 1.7;">
            تم استلام طلب تسجيلك في منصة محمد رضوان التعليمية. لتأكيد هويتك وإتمام التسجيل، يرجى استخدام الرمز التأكيدي أدناه.
          </p>

          <!-- بيانات الطالب -->
          <div class="info-block">
            <p><strong>👤 الاسم:</strong> ${studentName || 'غير مضاف'}</p>
            <p><strong>📱 رقم هاتفك:</strong> ${phone || 'غير مضاف'}</p>
            <p><strong>📱 رقم ولي الأمر:</strong> ${parentPhone || 'غير مضاف'}</p>
            <p><strong>🏫 المدرسة:</strong> ${school || 'غير مضاف'}</p>
            <p><strong>📚 الصف الدراسي:</strong> ${grade || 'غير مضاف'}</p>
            <p><strong>🗺️ المحافظة:</strong> ${governorate || 'غير مضاف'}</p>
          </div>

          <!-- الرمز التأكيدي -->
          <div class="otp-box">
            <span>${otp}</span>
          </div>

          <!-- تعليمات -->
          <div class="note">
            <p>🔒 <strong>تعليمات هامة:</strong></p>
            <p>• أدخل هذا الرمز في صفحة التأكيد لإتمام التسجيل.</p>
            <p>• الرمز صالح لمدة <strong>5 دقائق</strong> فقط.</p>
            <p>• سيتم التواصل معك عبر أرقام الهاتف المسجلة لأي استفسارات.</p>
            <p>• في حال لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
          </div>

          <p style="color: #555; font-size: 14px; margin-top: 16px;">
            مع تحيات فريق <strong>منصة محمد رضوان</strong> 🌟
          </p>
        </div>

        <!-- التذييل -->
        <div class="footer">
          <p>© 2026 منصة محمد رضوان – جميع الحقوق محفوظة</p>
          <p>للاستفسارات: <a href="mailto:support@mohamedradwan.com">support@mohamedradwan.com</a></p>
          <p>هذه رسالة آلية، يرجى عدم الرد عليها.</p>
        </div>
      </div>
    </body>
    </html>
    `;

    // إرسال البريد
    await transporter.sendMail({
      from: `"منصة محمد رضوان" <${process.env.SMTP_USER}>`,
      to: email,
      subject: '🔐 رمز تأكيد التسجيل في منصة محمد رضوان',
      html: htmlContent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'فشل إرسال البريد الإلكتروني' }, { status: 500 });
  }
}