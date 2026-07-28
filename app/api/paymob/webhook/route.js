

// ================================================================
// 📡 app/api/paymob/webhook/route.js
// Webhook Paymob – استقبال تأكيد الدفع وتحديث النظام
// يعمل مع نظام الأكواد (سليم) ونظام الدفع عبر Paymob
// ================================================================

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { handleWebhook } from '@/lib/payment/paymob';

// ================================================================
// 📥 POST – استقبال Webhook من Paymob
// ================================================================

export async function POST(request) {
  // تسجيل بداية الطلب (للمساعدة في التصحيح)
  console.log('📡 Webhook received at', new Date().toISOString());

  try {
    // 1. قراءة البيانات الخام من الطلب
    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      console.error('❌ Webhook: Invalid JSON payload:', err.message);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON' },
        { status: 400 }
      );
    }

    // 2. استخراج التوقيع من الـ Headers (يدعم كلاً من x-paymob-signature و hmac)
    const signature = request.headers.get('x-paymob-signature') || 
                      request.headers.get('hmac') || 
                      null;

    console.log('📡 Webhook details:', {
      signature: signature ? 'present' : 'missing',
      order_id: payload.order_id,
      transaction_id: payload.transaction_id,
      success: payload.success,
    });

    // 3. إنشاء عميل Supabase للمسؤول (لتجاوز RLS)
    let adminSupabase;
    try {
      adminSupabase = createAdminClient();
    } catch (err) {
      console.error('❌ Webhook: Failed to create admin client:', err.message);
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // 4. معالجة الدفع عبر الـ handler (مع تمرير العميل والتوقيع)
    const result = await handleWebhook(
      adminSupabase,   // العميل المُمرر
      payload,         // البيانات
      signature        // التوقيع (يمكن أن يكون null)
    );

    // 5. التحقق من نتيجة المعالجة
    if (!result.success) {
      console.error('❌ Webhook processing failed:', result.error || result.message);
      return NextResponse.json(
        { success: false, error: result.error || 'Processing failed' },
        { status: 500 }
      );
    }

    // 6. تسجيل النجاح
    console.log('✅ Webhook processed successfully:', result.message);

    // 7. إرجاع استجابة نجاح لـ Paymob (يجب أن تكون 200 OK)
    // حتى لا يعيد Paymob إرسال الطلب
    return NextResponse.json({
      success: true,
      message: result.message || 'Payment processed successfully',
    });

  } catch (error) {
    // أي خطأ غير متوقع
    console.error('❌ Webhook unhandled error:', error.message);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ================================================================
// 🔍 GET – للتحقق من صحة Webhook أثناء التطوير
// ================================================================

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'Paymob webhook endpoint is active and ready',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
}

// ================================================================
// 📌 OPTIONS – دعم CORS (للتطوير)
// ================================================================

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Allow': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-paymob-signature, hmac',
      },
    }
  );
}