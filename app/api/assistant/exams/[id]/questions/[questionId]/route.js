

// app/api/assistant/exams/[id]/questions/[questionId]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PUT(request, { params }) {
  try {
    const { id, questionId } = await params;
    const body = await request.json();
    const { teacher_id, question } = body;

    if (!id || !questionId) {
      return NextResponse.json({ error: 'معرف الامتحان والسؤال مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!question) {
      return NextResponse.json({ error: 'بيانات السؤال مطلوبة' }, { status: 400 });
    }

    const { data: updated, error } = await supabaseAdmin
      .from('exam_questions')
      .update(question)
      .eq('id', questionId)
      .eq('exam_id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update question error:', error);
      return NextResponse.json({ error: 'فشل تحديث السؤال' }, { status: 500 });
    }

    return NextResponse.json({ success: true, question: updated });
  } catch (err) {
    console.error('❌ PUT question error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id, questionId } = await params;
    const body = await request.json();
    const { teacher_id } = body;

    if (!id || !questionId) {
      return NextResponse.json({ error: 'معرف الامتحان والسؤال مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('exam_questions')
      .delete()
      .eq('id', questionId)
      .eq('exam_id', id);

    if (error) {
      console.error('❌ Delete question error:', error);
      return NextResponse.json({ error: 'فشل حذف السؤال' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف السؤال بنجاح' });
  } catch (err) {
    console.error('❌ DELETE question error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}