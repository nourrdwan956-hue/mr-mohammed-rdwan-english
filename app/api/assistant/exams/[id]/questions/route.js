

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ================================================================
// POST - إضافة سؤال
// ================================================================
export async function POST(request, { params }) {
  try {
    // ✅ انتظار params
    const { id: examId } = await params;
    const assistantId = request.headers.get('x-assistant-id');
    console.log('📥 [POST] examId:', examId, 'assistantId:', assistantId);

    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const body = await request.json();
    let data = body.question || body;
    const { question_text, type, difficulty, options, correct_answer, explanation, marks, order_index } = data;

    if (!question_text) {
      return NextResponse.json({ error: 'نص السؤال مطلوب' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // التحقق من الصلاحية
    const { data: perm } = await supabaseAdmin
      .from('assistant_permissions')
      .select('can_edit')
      .eq('assistant_id', assistantId)
      .eq('module', 'exams')
      .single();

    if (!perm?.can_edit) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    // إدراج السؤال
    const newQuestion = {
      exam_id: examId,
      question_text: question_text.trim(),
      type: type || 'mcq',
      difficulty: difficulty || 'medium',
      options: options || [],
      correct_answer: correct_answer || '',
      explanation: explanation || '',
      marks: marks || 1,
      order_index: order_index || 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: question, error: insertError } = await supabaseAdmin
      .from('exam_questions')
      .insert(newQuestion)
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, question });
  } catch (error) {
    console.error('❌ POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ================================================================
// GET - جلب الأسئلة (مع await params)
// ================================================================
export async function GET(request, { params }) {
  try {
    // ✅ انتظار params (هذا هو المفتاح)
    const { id: examId } = await params;
    const assistantId = request.headers.get('x-assistant-id');

    console.log('📥 [GET] examId:', examId, 'assistantId:', assistantId);

    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }
    if (!examId) {
      return NextResponse.json({ error: 'معرف الامتحان مطلوب' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // التحقق من صلاحية view
    const { data: perm } = await supabaseAdmin
      .from('assistant_permissions')
      .select('can_view')
      .eq('assistant_id', assistantId)
      .eq('module', 'exams')
      .single();

    if (!perm?.can_view) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    // جلب الأسئلة
    const { data: questions, error } = await supabaseAdmin
      .from('exam_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    if (error) throw error;

    console.log('✅ [GET] questions count:', questions?.length || 0);

    return NextResponse.json({ success: true, questions: questions || [] });
  } catch (error) {
    console.error('❌ GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ================================================================
// DELETE - حذف سؤال
// ================================================================
export async function DELETE(request, { params }) {
  try {
    const { id: examId } = await params;
    const { searchParams } = new URL(request.url);
    const questionId = searchParams.get('questionId');
    const assistantId = request.headers.get('x-assistant-id');

    if (!assistantId || !questionId) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: perm } = await supabaseAdmin
      .from('assistant_permissions')
      .select('can_delete')
      .eq('assistant_id', assistantId)
      .eq('module', 'exams')
      .single();

    if (!perm?.can_delete) {
      return NextResponse.json({ error: 'لا تملك صلاحية' }, { status: 403 });
    }

    const { error } = await supabaseAdmin
      .from('exam_questions')
      .delete()
      .eq('id', questionId)
      .eq('exam_id', examId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('❌ DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}