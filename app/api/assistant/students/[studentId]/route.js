

// app/api/assistant/students/[studentId]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب بيانات طالب معين
// ================================================================
export async function GET(request, { params }) {
  try {
    const { studentId } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!studentId) {
      return NextResponse.json(
        { error: 'معرف الطالب مطلوب' },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    // جلب بيانات الطالب
    const { data: student, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email')
      .eq('id', studentId)
      .single();

    if (error || !student) {
      return NextResponse.json(
        { error: 'الطالب غير موجود' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      student,
    });
  } catch (err) {
    console.error('❌ GET student error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}