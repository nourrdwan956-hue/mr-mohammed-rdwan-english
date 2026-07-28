

// app/api/assistant/notes/[studentId]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب جميع ملاحظات طالب معين
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

    const { data: notes, error } = await supabaseAdmin
      .from('student_notes')
      .select(`
        *,
        course:courses (id, title)
      `)
      .eq('student_id', studentId)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Notes by student error:', error);
      return NextResponse.json(
        { error: 'فشل جلب ملاحظات الطالب' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: notes || [],
    });
  } catch (err) {
    console.error('❌ GET student notes error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}