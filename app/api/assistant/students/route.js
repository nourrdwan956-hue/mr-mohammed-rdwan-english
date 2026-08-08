

// app/api/assistant/students/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب قائمة الطلاب المسجلين في كورسات المعلم
// ================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    // 1. جلب كورسات المعلم
    const { data: courses, error: coursesError } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('teacher_id', teacherId);

    if (coursesError) {
      console.error('❌ Courses error:', coursesError);
      return NextResponse.json(
        { error: 'فشل جلب الكورسات' },
        { status: 500 }
      );
    }

    const courseIds = courses?.map(c => c.id) || [];
    if (courseIds.length === 0) {
      return NextResponse.json({ success: true, students: [] });
    }

    // 2. جلب الطلاب المسجلين في هذه الكورسات
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select('student_id')
      .in('course_id', courseIds);

    if (enrollError) {
      console.error('❌ Enrollments error:', enrollError);
      return NextResponse.json(
        { error: 'فشل جلب تسجيلات الطلاب' },
        { status: 500 }
      );
    }

    const studentIds = [...new Set(enrollments?.map(e => e.student_id) || [])];
    if (studentIds.length === 0) {
      return NextResponse.json({ success: true, students: [] });
    }

    // 3. جلب بيانات الطلاب
    const { data: students, error: studentsError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .in('id', studentIds)
      .order('full_name');

    if (studentsError) {
      console.error('❌ Students error:', studentsError);
      return NextResponse.json(
        { error: 'فشل جلب بيانات الطلاب' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      students: students || [],
    });
  } catch (err) {
    console.error('❌ GET students error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}