// lib/resend.js
import { Resend } from 'resend';

let resendInstance = null;

function getResend() {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY is missing in environment variables.');
      // ما نرميش خطأ، بس نرجّع null عشان البناء مايوقعش
      return null;
    }
    resendInstance = new Resend(apiKey);
  }
  return resendInstance;
}

export const FROM_EMAIL = 'onboarding@resend.dev';
export const FROM_NAME = 'منصة محمد رضوان التعليمية';

export async function sendResetPasswordEmail(to, resetLink, userName = '') {
  const resend = getResend();
  
  if (!resend) {
    console.error('❌ Resend client not initialized. API key missing.');
    return { error: new Error('RESEND_API_KEY not configured') };
  }

  const htmlContent = `
    <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 30px; border-radius: 16px; border: 1px solid #e5e7eb;">
      <div style="text-align: center; margin-bottom: 25px;">
        <h1 style="color: #FACC15; font-size: 28px; margin: 0;">منصة محمد رضوان</h1>
        <p style="color: #6b7280; font-size: 14px;">التعليم بلا حدود</p>
      </div>
      <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <h2 style="color: #1f2937; font-size: 20px; margin-top: 0;">إعادة تعيين كلمة المرور</h2>
        <p style="color: #374151; font-size: 15px; line-height: 1.7;">مرحباً ${userName || 'الطالب'}،</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.7;">لقد تلقينا طلباً لإعادة تعيين كلمة المرور لحسابك في منصة محمد رضوان التعليمية.</p>
        <p style="color: #374151; font-size: 15px; line-height: 1.7;">اضغط على الزر أدناه لتعيين كلمة مرور جديدة:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background: #FACC15; color: #000; text-decoration: none; border-radius: 10px; font-weight: bold; font-size: 16px;">إعادة تعيين كلمة المرور</a>
        </div>
        <p style="color: #6b7280; font-size: 13px; line-height: 1.6;">إذا لم تطلب إعادة التعيين، يمكنك تجاهل هذا البريد. لن يتم تغيير كلمة المرور الخاصة بك.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">هذا بريد إلكتروني آلي، يرجى عدم الرد عليه.</p>
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">© 2026 منصة محمد رضوان - جميع الحقوق محفوظة</p>
      </div>
    </div>
  `;

  try {
    const { data, error } = await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to,
      subject: 'إعادة تعيين كلمة المرور - منصة محمد رضوان',
      html: htmlContent,
    });

    if (error) {
      console.error('❌ فشل إرسال البريد عبر Resend:', error);
      return { error };
    }

    console.log('✅ تم إرسال البريد عبر Resend بنجاح:', data);
    return { data };
  } catch (err) {
    console.error('❌ خطأ غير متوقع في Resend:', err);
    return { error: err };
  }
}