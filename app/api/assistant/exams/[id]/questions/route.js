// app/api/assistant/exams/[id]/questions/route.js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request, { params }) {
  try {
    // 1. جلب assistant-id من الـ Header
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId } = await params;
    const body = await request.json();

    // 2. التحقق من المساعد (موجود ونشط)
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('teacher_id, is_active')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
    }

    if (!assistant.is_active) {
      return NextResponse.json({ error: 'الحساب غير مفعل' }, { status: 403 });
    }

    // 3. التحقق من صلاحية التعديل على الامتحانات
    const { data: permission } = await supabaseAdmin
      .from('assistant_permissions')
      .select('can_edit, can_manage')
      .eq('assistant_id', assistantId)
      .eq('module', 'exams')
      .maybeSingle();

    if (!permission?.can_edit && !permission?.can_manage) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية إضافة أسئلة' },
        { status: 403 }
      );
    }

    // 4. التحقق من أن الامتحان يخص معلم هذا المساعد
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('teacher_id', assistant.teacher_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: 'الامتحان غير موجود أو لا يخص معلمك' },
        { status: 404 }
      );
    }

    // 5. إدراج السؤال (RLS معطلة، لكن الـ API بيحمي)
    const { data: newQuestion, error: insertError } = await supabaseAdmin
      .from('exam_questions')
      .insert({
        exam_id: examId,
        type: body.type,
        question_text: body.question_text,
        options: body.options || [],
        correct_answer: body.correct_answer || null,
        marks: body.marks || 1,
        difficulty: body.difficulty || 'medium',
        order_index: body.order_index || 0,
        explanation: body.explanation || '',
        category: body.category || '',
        time_limit: body.time_limit || 60,
        hint: body.hint || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return NextResponse.json(
        { error: 'فشل إضافة السؤال: ' + insertError.message },
        { status: 500 }
      );
    }

    // 6. تحديث total_marks
    const { data: allQuestions } = await supabaseAdmin
      .from('exam_questions')
      .select('marks')
      .eq('exam_id', examId);

    const totalMarks = allQuestions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
    await supabaseAdmin
      .from('exams')
      .update({ total_marks: totalMarks, updated_at: new Date().toISOString() })
      .eq('id', examId);

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error) {
    console.error('❌ POST error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + error.message },
      { status: 500 }
    );
  }
}