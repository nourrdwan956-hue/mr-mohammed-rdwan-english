

// app/api/assistant/question-bank/[id]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id, title, description, course_id, grade_level, is_published, published_to_students } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف البنك مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('question_banks')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', teacher_id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'البنك غير موجود أو غير مصرح لك به' }, { status: 404 });
    }

    const updateData = {
      title: title.trim(),
      description: description?.trim() || null,
      course_id: course_id || null,
      grade_level,
      is_published: !!is_published,
      published_to_students: !!published_to_students,
      updated_at: new Date().toISOString(),
    };

    const { data: bank, error } = await supabaseAdmin
      .from('question_banks')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update error:', error);
      return NextResponse.json({ error: 'فشل تحديث البنك' }, { status: 500 });
    }

    return NextResponse.json({ success: true, bank });
  } catch (err) {
    console.error('❌ PUT error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!id) {
      return NextResponse.json({ error: 'معرف البنك مطلوب' }, { status: 400 });
    }
    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('question_banks')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', teacherId)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'البنك غير موجود أو غير مصرح لك به' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('question_banks')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Delete error:', error);
      return NextResponse.json({ error: 'فشل حذف البنك' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف البنك' });
  } catch (err) {
    console.error('❌ DELETE error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}