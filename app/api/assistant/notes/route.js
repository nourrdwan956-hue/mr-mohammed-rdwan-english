

// app/api/assistant/notes/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب قائمة الملاحظات
// ================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');
    const limit = parseInt(searchParams.get('limit') || '50');

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
        student:profiles!student_notes_student_id_fkey (id, full_name, email),
        course:courses (id, title)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Notes GET error:', error);
      return NextResponse.json(
        { error: 'فشل جلب الملاحظات' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: notes || [],
    });
  } catch (err) {
    console.error('❌ GET notes error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 POST – إضافة ملاحظة جديدة
// ================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { teacher_id, student_id, note, course_id } = body;

    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    if (!student_id) {
      return NextResponse.json(
        { error: 'student_id مطلوب' },
        { status: 400 }
      );
    }

    if (!note?.trim()) {
      return NextResponse.json(
        { error: 'نص الملاحظة مطلوب' },
        { status: 400 }
      );
    }

    const noteData = {
      teacher_id,
      student_id,
      note: note.trim(),
      course_id: course_id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: created, error } = await supabaseAdmin
      .from('student_notes')
      .insert(noteData)
      .select()
      .single();

    if (error) {
      console.error('❌ Notes POST error:', error);
      return NextResponse.json(
        { error: 'فشل إضافة الملاحظة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note: created,
    });
  } catch (err) {
    console.error('❌ POST note error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}