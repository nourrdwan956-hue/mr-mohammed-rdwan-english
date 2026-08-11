// ================================================================
// 📁 app/api/assistant/exams/[id]/questions/[questionId]/route.js
// إدارة سؤال محدد للمساعد (GET, PUT) – بدون DELETE
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId, questionId } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // جلب المساعد
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
    }

    if (!assistant.is_active) {
      return NextResponse.json({ error: 'الحساب غير مفعل' }, { status: 403 });
    }

    // التحقق من صلاحية العرض
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_view, can_manage')
      .eq('assistant_id', assistantId);

    const canView = permissions?.some(
      (p) => (p.module === 'exams') && (p.can_view || p.can_manage)
    );

    if (!canView) {
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة هذا السؤال' }, { status: 403 });
    }

    // جلب السؤال
    const { data: question, error: questionError } = await supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('id', questionId)
      .eq('exam_id', examId)
      .single();

    if (questionError || !question) {
      return NextResponse.json({ error: 'السؤال غير موجود أو لا يخص هذا الامتحان' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      question,
    });
  } catch (error) {
    console.error('❌ GET /api/assistant/exams/[id]/questions/[questionId] error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId, questionId } = await params;
    const body = await request.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // جلب المساعد
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
    }

    if (!assistant.is_active) {
      return NextResponse.json({ error: 'الحساب غير مفعل' }, { status: 403 });
    }

    // صلاحية التعديل
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_edit, can_manage')
      .eq('assistant_id', assistantId);

    const canEdit = permissions?.some(
      (p) => (p.module === 'exams') && (p.can_edit || p.can_manage)
    );

    if (!canEdit) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل الأسئلة' }, { status: 403 });
    }

    // التحقق من وجود السؤال
    const { data: existingQuestion, error: qError } = await supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('id', questionId)
      .eq('exam_id', examId)
      .single();

    if (qError || !existingQuestion) {
      return NextResponse.json({ error: 'السؤال غير موجود أو لا يخص هذا الامتحان' }, { status: 404 });
    }

    // تحديث السؤال
    const updateData = {
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
      text_align: body.text_align || 'left',
      updated_at: new Date().toISOString(),
    };

    const { data: updatedQuestion, error: updateError } = await supabaseAdmin
      .from('exam_questions')
      .update(updateData)
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث السؤال: ' + updateError.message }, { status: 500 });
    }

    // تحديث total_marks
    const { data: allQuestions } = await supabaseAdmin
      .from('exam_questions')
      .select('marks, type')
      .eq('exam_id', examId);

    const totalMarks = allQuestions
      ?.filter(q => q.type !== 'passage')
      .reduce((sum, q) => sum + (q.marks || 0), 0) || 0;

    await supabaseAdmin
      .from('exams')
      .update({ total_marks: totalMarks, updated_at: new Date().toISOString() })
      .eq('id', examId);

    return NextResponse.json({
      success: true,
      question: updatedQuestion,
    });
  } catch (error) {
    console.error('❌ PUT /api/assistant/exams/[id]/questions/[questionId] error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

// ❌ DELETE ممنوع للمساعد
export async function DELETE(request, { params }) {
  return NextResponse.json({ error: 'لا يمكن حذف الأسئلة من حساب المساعد' }, { status: 403 });
}