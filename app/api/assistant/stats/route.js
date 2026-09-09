

// app/api/assistant/stats/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');
    const type = searchParams.get('type');

    if (!teacherId || !type) {
      return NextResponse.json(
        { error: 'معرف المعلم ونوع الإحصائية مطلوبان' },
        { status: 400 }
      );
    }

    // استخدام Service Role لتجاوز RLS
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let count = 0;
    let error = null;

    switch (type) {
      case 'courses':
        ({ count, error } = await supabaseAdmin
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', teacherId));
        break;
      case 'videos':
        ({ count, error } = await supabaseAdmin
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', teacherId));
        break;
      case 'exams':
        ({ count, error } = await supabaseAdmin
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', teacherId));
        break;
      case 'books':
        ({ count, error } = await supabaseAdmin
          .from('books')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', teacherId));
        break;
      case 'question_banks':
        ({ count, error } = await supabaseAdmin
          .from('question_banks')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', teacherId));
        break;
      case 'students':
        // جلب عدد الطلاب المسجلين في كورسات المعلم
        const { data: coursesData, error: coursesError } = await supabaseAdmin
          .from('courses')
          .select('id')
          .eq('teacher_id', teacherId);

        if (coursesError) {
          error = coursesError;
          break;
        }
        const courseIds = coursesData?.map(c => c.id) || [];
        if (courseIds.length === 0) {
          count = 0;
          break;
        }
        ({ count, error } = await supabaseAdmin
          .from('enrollments')
          .select('student_id', { count: 'exact', head: true })
          .in('course_id', courseIds));
        break;
      default:
        return NextResponse.json(
          { error: 'نوع إحصائية غير معروف' },
          { status: 400 }
        );
    }

    if (error) {
      console.error(`❌ [Stats] خطأ في جلب ${type}:`, error);
      return NextResponse.json(
        { error: `فشل جلب إحصائية ${type}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, count: count || 0 });
  } catch (err) {
    console.error('❌ [Stats] خطأ غير متوقع:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}