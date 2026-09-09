// ================================================================
// 📁 app/api/assistant/exams/[id]/questions/route.js
// إدارة أسئلة الامتحان للمساعد (GET, POST) – بدون DELETE
// ================================================================

import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

// ============================================================
// GET - جلب جميع أسئلة الامتحان
// ============================================================
export async function GET(request, { params }) {
  try {
    // 1. جلب assistant-id من الـ Header
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json(
        { error: 'معرف المساعد مطلوب في الـ Header' },
        { status: 400 }
      );
    }

    const { id: examId } = await params;

    // 2. التحقق من المساعد (موجود ونشط)
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('teacher_id, is_active')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json(
        { error: 'المساعد غير موجود' },
        { status: 404 }
      );
    }

    if (!assistant.is_active) {
      return NextResponse.json(
        { error: 'الحساب غير مفعل' },
        { status: 403 }
      );
    }

    // 3. التحقق من صلاحية العرض (can_view أو can_manage)
    const { data: permission } = await supabaseAdmin
      .from('assistant_permissions')
      .select('can_view, can_manage')
      .eq('assistant_id', assistantId)
      .eq('module', 'exams')
      .maybeSingle();

    if (!permission?.can_view && !permission?.can_manage) {
      return NextResponse.json(
        { error: 'ليس لديك صلاحية عرض الأسئلة' },
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

    // 5. جلب الأسئلة
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('❌ Questions fetch error:', questionsError);
      return NextResponse.json(
        { error: 'فشل جلب الأسئلة: ' + questionsError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: questions || [],
    });
  } catch (error) {
    console.error('❌ GET error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// POST - إضافة سؤال جديد (بدون حذف)
// ============================================================
export async function POST(request, { params }) {
  try {
    // 1. جلب assistant-id من الـ Header
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json(
        { error: 'معرف المساعد مطلوب في الـ Header' },
        { status: 400 }
      );
    }

    const { id: examId } = await params;
    const body = await request.json();

    // التحقق من الحقول المطلوبة
    if (!body.type || !body.question_text) {
      return NextResponse.json(
        { error: 'نوع السؤال ونص السؤال مطلوبان' },
        { status: 400 }
      );
    }

    // 2. التحقق من المساعد (موجود ونشط)
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('teacher_id, is_active')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json(
        { error: 'المساعد غير موجود' },
        { status: 404 }
      );
    }

    if (!assistant.is_active) {
      return NextResponse.json(
        { error: 'الحساب غير مفعل' },
        { status: 403 }
      );
    }

    // 3. التحقق من صلاحية التعديل (can_edit أو can_manage)
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

    // 5. إعداد بيانات السؤال
    const questionData = {
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
      passage_id: body.passage_id || null,
      case_sensitive: body.case_sensitive || false,
      ignore_extra_spaces: body.ignore_extra_spaces !== undefined ? body.ignore_extra_spaces : true,
      partial_marking: body.partial_marking || false,
      word_limit: body.word_limit || 0,
      bank_question_id: body.bank_question_id || null,
      text_align: body.text_align || 'left',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 6. إدراج السؤال (RLS معطلة، لكن الـ API بيحمي)
    const { data: newQuestion, error: insertError } = await supabaseAdmin
      .from('exam_questions')
      .insert(questionData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return NextResponse.json(
        { error: 'فشل إضافة السؤال: ' + insertError.message },
        { status: 500 }
      );
    }

    // 7. تحديث total_marks في الامتحان
    const { data: allQuestions } = await supabaseAdmin
      .from('exam_questions')
      .select('marks')
      .eq('exam_id', examId);

    const totalMarks = allQuestions?.reduce((sum, q) => sum + (q.marks || 0), 0) || 0;
    await supabaseAdmin
      .from('exams')
      .update({
        total_marks: totalMarks,
        updated_at: new Date().toISOString()
      })
      .eq('id', examId);

    return NextResponse.json({
      success: true,
      question: newQuestion,
    });
  } catch (error) {
    console.error('❌ POST error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + error.message },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE - ممنوع للمساعد (يرجع 403)
// ============================================================
export async function DELETE() {
  return NextResponse.json(
    { error: 'لا يمكن حذف الأسئلة من حساب المساعد' },
    { status: 403 }
  );
}