import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ✅ إنشاء supabaseAdmin مع تحقق قوي
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// ✅ تأكد من وجود المفتاح
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_SERVICE_ROLE_KEY in environment!');
}

const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function POST(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId } = await params;
    const body = await request.json();

    // ... التحقق من المساعد والصلاحيات ...

    // ✅ إدراج السؤال باستخدام supabaseAdmin
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
      console.error('❌ Insert error with Admin:', insertError);
      return NextResponse.json(
        { error: 'فشل إضافة السؤال: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, question: newQuestion });
  } catch (error) {
    console.error('❌ POST error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + error.message },
      { status: 500 }
    );
  }
}