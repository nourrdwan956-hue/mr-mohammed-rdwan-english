// ================================================================
// 📁 app/api/assistant/exams/[id]/questions/route.js
// إدارة أسئلة الامتحان للمساعد (GET, POST, PUT) – بدون DELETE
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ===== دالة مساعدة للتحقق من المساعد والامتحان =====
async function verifyAssistantAndExam(assistantId, examId, supabaseAdmin, requiredPermission = 'can_edit') {
  // 1. جلب المساعد
  const { data: assistant, error: assistantError } = await supabaseAdmin
    .from('assistants')
    .select('*')
    .eq('id', assistantId)
    .single();

  if (assistantError || !assistant) {
    throw new Error('المساعد غير موجود');
  }

  if (!assistant.is_active) {
    throw new Error('الحساب غير مفعل');
  }

  // 2. التحقق من صلاحية المساعد (اختياري، يمكن تعطيله مؤقتاً)
  // لكننا سنحتفظ به للتوافق مع المستقبل
  const { data: permissions } = await supabaseAdmin
    .from('assistant_permissions')
    .select('module, can_view, can_edit, can_manage')
    .eq('assistant_id', assistantId);

  const hasPerm = permissions?.some(
    (p) => p.module === 'exams' && (p[requiredPermission] || p.can_manage)
  );

  if (!hasPerm) {
    throw new Error(`غير مصرح لك بـ ${requiredPermission === 'can_edit' ? 'إدارة' : 'مشاهدة'} الأسئلة`);
  }

  // 3. التحقق من ملكية الامتحان للمعلم
  const { data: exam, error: examError } = await supabaseAdmin
    .from('exams')
    .select('id')
    .eq('id', examId)
    .eq('teacher_id', assistant.teacher_id)
    .single();

  if (examError || !exam) {
    throw new Error('الامتحان غير موجود أو لا يخص معلمك');
  }

  return { assistant, exam };
}

// ===== GET: جلب جميع أسئلة الامتحان =====
export async function GET(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await verifyAssistantAndExam(assistantId, examId, supabaseAdmin, 'can_view');

    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    if (questionsError) {
      return NextResponse.json({ error: 'فشل جلب الأسئلة: ' + questionsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      questions: questions || [],
    });
  } catch (error) {
    console.error('❌ GET /api/assistant/exams/[id]/questions error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

// ===== POST: إضافة سؤال جديد =====
export async function POST(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId } = await params;
    const body = await request.json();

    // التحقق من الحقول المطلوبة
    if (!body.type || !body.question_text) {
      return NextResponse.json({ error: 'نوع السؤال ونص السؤال مطلوبان' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await verifyAssistantAndExam(assistantId, examId, supabaseAdmin, 'can_edit');

    // إعداد بيانات السؤال
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

    const { data: newQuestion, error: insertError } = await supabaseAdmin
      .from('exam_questions')
      .insert(questionData)
      .select()
      .single();

    if (insertError) {
      console.error('Insert error:', insertError);
      return NextResponse.json({ error: 'فشل إضافة السؤال: ' + insertError.message }, { status: 500 });
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
      question: newQuestion,
    });
  } catch (error) {
    console.error('❌ POST /api/assistant/exams/[id]/questions error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

// ===== PUT: تحديث سؤال موجود =====
export async function PUT(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId } = await params;
    const body = await request.json();
    const questionId = body.id; // يجب أن يأتي معرف السؤال في الـ body

    if (!questionId) {
      return NextResponse.json({ error: 'معرف السؤال مطلوب' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    await verifyAssistantAndExam(assistantId, examId, supabaseAdmin, 'can_edit');

    // التأكد من أن السؤال موجود وينتمي لهذا الامتحان
    const { data: existingQuestion, error: checkError } = await supabaseAdmin
      .from('exam_questions')
      .select('id')
      .eq('id', questionId)
      .eq('exam_id', examId)
      .single();

    if (checkError || !existingQuestion) {
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

    // لا نسمح بتحديث exam_id أو bank_question_id عبر PUT
    delete updateData.bank_question_id;

    const { data: updatedQuestion, error: updateError } = await supabaseAdmin
      .from('exam_questions')
      .update(updateData)
      .eq('id', questionId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث السؤال: ' + updateError.message }, { status: 500 });
    }

    // إعادة حساب total_marks
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
    console.error('❌ PUT /api/assistant/exams/[id]/questions error:', error);
    return NextResponse.json({ error: error.message || 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

// ❌ DELETE ممنوع للمساعد
export async function DELETE(request, { params }) {
  return NextResponse.json({ error: 'لا يمكن حذف الأسئلة من حساب المساعد' }, { status: 403 });
}