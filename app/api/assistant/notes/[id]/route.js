

// app/api/assistant/notes/[id]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 PUT – تحديث ملاحظة
// ================================================================
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id, note, course_id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الملاحظة مطلوب' },
        { status: 400 }
      );
    }

    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    if (!note?.trim()) {
      return NextResponse.json(
        { error: 'نص الملاحظة مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الملاحظة وملكيتها
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('student_notes')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', teacher_id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'الملاحظة غير موجودة أو غير مصرح لك بها' },
        { status: 404 }
      );
    }

    const updateData = {
      note: note.trim(),
      course_id: course_id || null,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await supabaseAdmin
      .from('student_notes')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Notes PUT error:', error);
      return NextResponse.json(
        { error: 'فشل تحديث الملاحظة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note: updated,
    });
  } catch (err) {
    console.error('❌ PUT note error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 DELETE – حذف ملاحظة
// ================================================================
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الملاحظة مطلوب' },
        { status: 400 }
      );
    }

    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الملاحظة وملكيتها
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('student_notes')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', teacher_id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'الملاحظة غير موجودة أو غير مصرح لك بها' },
        { status: 404 }
      );
    }

    const { error } = await supabaseAdmin
      .from('student_notes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Notes DELETE error:', error);
      return NextResponse.json(
        { error: 'فشل حذف الملاحظة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الملاحظة بنجاح',
    });
  } catch (err) {
    console.error('❌ DELETE note error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}