// ================================================================
// 📁 app/api/assistant/exams/[id]/questions/route.js
// إدارة أسئلة الامتحان للمساعد – نسخة مبسطة مع تجاوز RLS
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // التحقق من المساعد
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

    // التحقق من الامتحان
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('teacher_id', assistant.teacher_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود أو لا يخص معلمك' }, { status: 404 });
    }

    // جلب الأسئلة
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
    console.error('❌ GET error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId } = await params;
    const body = await request.json();

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

    // التحقق من المساعد
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

    // التحقق من الامتحان
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('teacher_id', assistant.teacher_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود أو لا يخص معلمك' }, { status: 404 });
    }

    // ✅ إعداد بيانات السؤال (تأكد من أن جميع الحقول موجودة)
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

    // ✅ استخدام supabaseAdmin مباشرة للإدراج (يتجاوز RLS)
    const { data: newQuestion, error: insertError } = await supabaseAdmin
      .from('exam_questions')
      .insert(questionData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
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
    console.error('❌ POST error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

// ❌ DELETE ممنوع للمساعد
export async function DELETE(request) {
  return NextResponse.json({ error: 'لا يمكن حذف الأسئلة من حساب المساعد' }, { status: 403 });
}