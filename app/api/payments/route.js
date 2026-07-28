

// app/api/payments/route.js
// API لجلب سجل المدفوعات (للمعلم والطالب)
// يدعم: تصفية حسب الكورس، الحالة، الفترة الزمنية، والحد

import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

// ================================================================
// 📥 GET – جلب المدفوعات
// ================================================================
export async function GET(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // قراءة معاملات الاستعلام
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const status = searchParams.get('status'); // paid, pending, failed, refunded
    const from = searchParams.get('from'); // تاريخ البداية (ISO)
    const to = searchParams.get('to');     // تاريخ النهاية (ISO)
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');
    const studentId = searchParams.get('studentId'); // للمعلم فقط

    // التحقق من صلاحيات المستخدم
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء التحقق من الصلاحيات' },
        { status: 500 }
      );
    }

    const isTeacher = userProfile?.role === 'teacher';
    const isStudent = userProfile?.role === 'student';

    let query = supabase
      .from('course_payments')
      .select(`
        *,
        course:course_id (id, title),
        student:student_id (id, full_name, email)
      `);

    // ===== تطبيق الفلاتر حسب الصلاحية =====
    if (isStudent) {
      // الطالب يرى مدفوعاته فقط
      query = query.eq('student_id', user.id);
    } else if (isTeacher) {
      // المعلم يرى مدفوعات كورساته، أو طالب معين إذا أرسل studentId
      // أولاً: جلب كورسات المعلم
      const { data: teacherCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id')
        .eq('teacher_id', user.id);

      if (coursesError) {
        console.error('Error fetching teacher courses:', coursesError);
        return NextResponse.json(
          { success: false, error: 'حدث خطأ أثناء جلب الكورسات' },
          { status: 500 }
        );
      }

      const courseIds = teacherCourses.map(c => c.id);
      if (courseIds.length === 0) {
        // لا توجد كورسات، نعيد مصفوفة فارغة
        return NextResponse.json({
          success: true,
          payments: [],
          total: 0,
          limit,
          offset,
        });
      }

      query = query.in('course_id', courseIds);

      // إذا حدد المعلم طالباً معيناً
      if (studentId) {
        // التحقق من أن الطالب مسجل في أحد كورسات المعلم
        const { data: enrollment, error: enrollmentError } = await supabase
          .from('enrollments')
          .select('student_id')
          .eq('student_id', studentId)
          .in('course_id', courseIds)
          .limit(1);

        if (enrollmentError || !enrollment || enrollment.length === 0) {
          return NextResponse.json(
            { success: false, error: 'هذا الطالب ليس مسجلاً في أي من كورساتك' },
            { status: 403 }
          );
        }
        query = query.eq('student_id', studentId);
      }
    } else {
      // دور غير معروف
      return NextResponse.json(
        { success: false, error: 'صلاحيات غير معروفة' },
        { status: 403 }
      );
    }

    // ===== فلاتر إضافية =====
    if (courseId) {
      query = query.eq('course_id', courseId);
    }

    if (status) {
      query = query.eq('payment_status', status);
    }

    if (from) {
      query = query.gte('created_at', from);
    }

    if (to) {
      query = query.lte('created_at', to);
    }

    // ===== ترتيب وحدود =====
    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: payments, error: paymentsError, count } = await query;

    if (paymentsError) {
      console.error('Error fetching payments:', paymentsError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء جلب المدفوعات' },
        { status: 500 }
      );
    }

    // الحصول على العدد الإجمالي (للميتادات)
    const { count: totalCount, error: countError } = await supabase
      .from('course_payments')
      .select('*', { count: 'exact', head: true })
      .eq('student_id', isStudent ? user.id : studentId || user.id)
      .in('course_id', isTeacher ? (await getTeacherCourseIds(supabase, user.id)) : undefined);

    return NextResponse.json({
      success: true,
      payments: payments || [],
      total: count || 0,
      limit,
      offset,
      isTeacher,
      isStudent,
    });

  } catch (error) {
    console.error('GET /api/payments error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// ➕ POST – إنشاء سجل دفع (للاستخدام الداخلي أو Webhook)
// ================================================================
export async function POST(request) {
  try {
    const supabase = createClient(cookies());
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك' },
        { status: 401 }
      );
    }

    // السماح فقط للمعلمين أو النظام (يمكن استخدام مفتاح API)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userProfile?.role !== 'teacher') {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بإنشاء سجل دفع' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { studentId, courseId, amount, paymentMethod = 'paymob', transactionId, paymentStatus = 'pending', metadata } = body;

    if (!studentId || !courseId || !amount) {
      return NextResponse.json(
        { success: false, error: 'البيانات المطلوبة: studentId, courseId, amount' },
        { status: 400 }
      );
    }

    // التحقق من ملكية الكورس للمعلم
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('teacher_id')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { success: false, error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    if (course.teacher_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح لك بإضافة دفع لهذا الكورس' },
        { status: 403 }
      );
    }

    // إنشاء سجل الدفع
    const { data: payment, error: insertError } = await supabase
      .from('course_payments')
      .insert({
        student_id: studentId,
        course_id: courseId,
        amount: Math.round(amount * 100), // تخزين بالأقساط
        payment_method: paymentMethod,
        transaction_id: transactionId,
        payment_status: paymentStatus,
        metadata,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating payment record:', insertError);
      return NextResponse.json(
        { success: false, error: 'حدث خطأ أثناء إنشاء سجل الدفع' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      payment,
      message: 'تم إنشاء سجل الدفع بنجاح',
    });

  } catch (error) {
    console.error('POST /api/payments error:', error);
    return NextResponse.json(
      { success: false, error: 'حدث خطأ داخلي في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// دالة مساعدة لجلب معرفات كورسات المعلم
// ================================================================
async function getTeacherCourseIds(supabase, teacherId) {
  const { data, error } = await supabase
    .from('courses')
    .select('id')
    .eq('teacher_id', teacherId);
  if (error) throw error;
  return data.map(c => c.id);
}

// ================================================================
// 📌 OPTIONS – دعم CORS
// ================================================================
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Allow': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    }
  );
}