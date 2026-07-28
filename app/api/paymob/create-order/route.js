

// ================================================================
// 💳 app/api/paymob/create-order/route.js
// API Route لإنشاء طلب دفع عبر Paymob
// يستقبل studentId و courseId، ويعيد رابط الدفع (iframe)
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createPaymentIntent } from '@/lib/payment/paymob';

// ================================================================
// 📥 POST – إنشاء طلب دفع جديد
// ================================================================

export async function POST(request) {
  try {
    // 1. إنشاء عميل Supabase للخادم (لمصادقة المستخدم وجلب البيانات)
    const supabase = await createClient();

    // 2. التحقق من هوية المستخدم (يجب أن يكون مسجلاً دخوله)
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.warn('⚠️ Unauthenticated user attempted to create payment order');
      return NextResponse.json(
        { success: false, error: 'يجب تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    // 3. قراءة البيانات من الطلب (JSON)
    let body;
    try {
      body = await request.json();
    } catch (err) {
      console.error('❌ Invalid JSON body:', err.message);
      return NextResponse.json(
        { success: false, error: 'بيانات الطلب غير صحيحة (JSON)' },
        { status: 400 }
      );
    }

    const { studentId, courseId } = body;

    // 4. التحقق من صحة المدخلات
    if (!studentId || !courseId) {
      console.warn('⚠️ Missing studentId or courseId', { studentId, courseId });
      return NextResponse.json(
        { success: false, error: 'معرف الطالب والكورس مطلوبان' },
        { status: 400 }
      );
    }

    // 5. التأكد من أن المستخدم الحالي هو نفس الطالب (أو معلم يقوم بالنيابة)
    if (user.id !== studentId) {
      // يمكن إضافة صلاحية للمعلمين للدفع نيابة عن الطلاب، لكن نكتفي حالياً بأن الطالب يدفع لنفسه
      console.warn(`⚠️ User ${user.id} attempted to pay for student ${studentId}`);
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بالدفع لهذا الطالب' },
        { status: 403 }
      );
    }

    // 6. جلب بيانات الكورس من قاعدة البيانات
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, price, is_free, teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      console.error('❌ Course not found:', courseId, courseError?.message);
      return NextResponse.json(
        { success: false, error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    // 7. التأكد من أن الكورس ليس مجانياً
    if (course.is_free || course.price === 0) {
      console.info('ℹ️ Course is free, no payment required', courseId);
      return NextResponse.json(
        { success: false, error: 'الكورس مجاني ولا يحتاج إلى دفع' },
        { status: 400 }
      );
    }

    // 8. التحقق من أن الطالب ليس مشتركاً بالفعل (لتجنب الدفع المزدوج)
    const { data: existingSub, error: subCheckError } = await supabase
      .from('course_subscriptions')
      .select('id, is_active')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (existingSub && existingSub.is_active === true) {
      console.info(`ℹ️ Student ${studentId} already subscribed to course ${courseId}`);
      return NextResponse.json(
        { success: false, error: 'أنت مشترك بالفعل في هذا الكورس' },
        { status: 400 }
      );
    }

    // 9. (اختياري) التحقق من وجود تسجيل (enrollment) للكورس، وإنشاء واحد إذا لم يكن موجوداً
    // هذا يضمن أن الطالب لديه حق الوصول بعد الدفع
    const { data: existingEnrollment, error: enrollmentCheckError } = await supabase
      .from('enrollments')
      .select('id')
      .eq('student_id', studentId)
      .eq('course_id', courseId)
      .maybeSingle();

    if (!existingEnrollment) {
      // إنشاء تسجيل (enrollment) بحالة pending
      const { error: enrollError } = await supabase
        .from('enrollments')
        .insert({
          student_id: studentId,
          course_id: courseId,
          progress: 0,
          enrolled_at: new Date().toISOString(),
          status: 'pending_payment', // لتتبع حالات الدفع غير المكتملة
        });

      if (enrollError) {
        console.error('❌ Error creating enrollment:', enrollError.message);
        // لا نوقف التنفيذ هنا، لكن نسجل الخطأ
      }
    }

    // 10. إنشاء طلب الدفع عبر Paymob
    // نستخدم عميل المسؤول (Admin Client) لتجاوز RLS عند إدراج payment_intent
    // وهذا آمن لأننا في بيئة خادم ونتحقق من الصلاحيات يدوياً أعلاه
    const adminSupabase = await createClient(); // يمكن استخدام createAdminClient() إذا كان service role متاحاً
    // لكننا نفضل استخدام createClient() مع صلاحيات المستخدم العادية، ولكن قد تتعارض مع RLS.
    // لذا نستخدم createAdminClient() للحصول على صلاحيات كاملة.
    // نضيف دالة createAdminClient في lib/supabase/server.js (ستأتي في رسالة لاحقة)

    // لكن حالياً، سنستخدم العميل العادي مع تمرير user.id للتحقق، لكن insert قد يفشل بسبب RLS.
    // لذلك نستورد createAdminClient من supabase/server (سنقوم بإنشائه)

    // نستخدم العميل المُمرر مع صلاحيات المستخدم العادي (قد ينجح إذا كانت سياسات RLS تسمح)
    // بدلاً من ذلك، نمرر supabase (العادي) إلى createPaymentIntent، وسنعتمد على أن RLS تسمح بالإدراج
    // إذا واجهت مشاكل، سنضبط RLS أو نستخدم admin client لاحقاً.

    const result = await createPaymentIntent(
      supabase, // نمرر العميل العادي (مع جلسة المستخدم)
      studentId,
      courseId,
      course.price,
      course.title,
      {
        billingData: {
          // يمكن ملء بيانات الفاتورة من ملف تعريف الطالب، لكننا نتركها افتراضية حالياً
          first_name: user.user_metadata?.full_name || 'Student',
          email: user.email || 'NA',
          phone_number: user.user_metadata?.phone || 'NA',
        },
        metadata: {
          teacher_id: course.teacher_id,
          course_title: course.title,
        },
      }
    );

    // 11. التعامل مع نتيجة الدفع
    if (!result.success) {
      console.error('❌ createPaymentIntent failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error || 'فشل إنشاء طلب الدفع' },
        { status: 500 }
      );
    }

    // 12. إرجاع رابط الدفع إلى العميل
    console.log(`✅ Payment order created: orderId=${result.orderId}, student=${studentId}`);
    return NextResponse.json({
      success: true,
      paymentUrl: result.paymentUrl,
      orderId: result.orderId,
      intentId: result.intentId,
    });

  } catch (error) {
    // أي خطأ غير متوقع (مثل مشكلة في الشبكة أو قاعدة البيانات)
    console.error('❌ Unhandled error in /api/paymob/create-order:', error.message);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📌 OPTIONS – دعم CORS (لتسهيل التطوير)
// ================================================================

export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Allow': 'POST, OPTIONS',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}