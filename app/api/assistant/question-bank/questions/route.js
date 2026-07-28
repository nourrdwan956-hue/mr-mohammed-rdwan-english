

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch (err) {
    return NextResponse.json({ error: 'خطأ في قراءة البيانات: ' + err.message }, { status: 400 });
  }

  console.log('📦 [add-question] body:', JSON.stringify(body, null, 2));

  const { bank_id, question_text, type, difficulty, options, correct_answer, explanation, tags, marks, passage } = body;
  const assistantId = request.headers.get('x-assistant-id');

  // تحقق أولي سريع
  if (!assistantId) {
    return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
  }
  if (!bank_id) {
    return NextResponse.json({ error: 'bank_id مطلوب' }, { status: 400 });
  }
  if (!question_text || question_text.trim() === '') {
    return NextResponse.json({ error: 'نص السؤال مطلوب' }, { status: 400 });
  }

  // معالجة options بمرونة
  let processedOptions = [];
  let processedCorrectAnswer = correct_answer || '';

  if (options) {
    if (Array.isArray(options)) {
      // إذا كانت المصفوفة تحتوي على كائنات {text, isCorrect}
      if (options.length > 0 && typeof options[0] === 'object' && 'text' in options[0]) {
        // استخرج النصوص
        processedOptions = options.map(o => o.text).filter(t => t && t.trim() !== '');
        // ابحث عن الخيار الصحيح
        const correct = options.find(o => o.isCorrect === true);
        if (correct && correct.text) {
          processedCorrectAnswer = correct.text;
        }
      } else {
        // المصفوفة نصوص بالفعل
        processedOptions = options.filter(t => t && t.trim() !== '');
        // إذا كان correct_answer فارغاً، نأخذ أول خيار (لكن الأفضل أن يكون محدداً)
        if (!processedCorrectAnswer && processedOptions.length > 0) {
          processedCorrectAnswer = processedOptions[0];
        }
      }
    } else if (typeof options === 'string') {
      // إذا كانت سلسلة مفصولة بفواصل
      processedOptions = options.split(',').map(s => s.trim()).filter(Boolean);
      if (!processedCorrectAnswer && processedOptions.length > 0) {
        processedCorrectAnswer = processedOptions[0];
      }
    }
  }

  // إذا كان النوع mcq ولم يتم تحديد answer، نحاول أخذه من الخيارات
  if (type === 'mcq' && !processedCorrectAnswer && processedOptions.length > 0) {
    processedCorrectAnswer = processedOptions[0];
  }

  // معالجة الوسوم
  let processedTags = [];
  if (tags) {
    if (Array.isArray(tags)) {
      processedTags = tags.filter(t => t && t.trim() !== '');
    } else if (typeof tags === 'string') {
      processedTags = tags.split(',').map(s => s.trim()).filter(Boolean);
    }
  }

  // تحضير كائن السؤال
  const newQuestion = {
    bank_id,
    question_text: question_text.trim(),
    type: type || 'mcq',
    difficulty: difficulty || 'medium',
    options: processedOptions,
    correct_answer: processedCorrectAnswer,
    explanation: explanation || '',
    tags: processedTags,
    marks: marks || 1,
    passage: passage || '',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  console.log('📝 [add-question] final question:', JSON.stringify(newQuestion, null, 2));

  try {
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. التحقق من صلاحية can_create
    const { data: perm, error: permError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('can_create')
      .eq('assistant_id', assistantId)
      .eq('module', 'question_bank')
      .single();

    if (permError || !perm?.can_create) {
      console.error('❌ Permission denied:', permError);
      return NextResponse.json({ error: 'لا تملك صلاحية إضافة أسئلة' }, { status: 403 });
    }

    // 2. التحقق من البنك
    const { data: bank, error: bankError } = await supabaseAdmin
      .from('question_banks')
      .select('teacher_id')
      .eq('id', bank_id)
      .single();

    if (bankError || !bank) {
      console.error('❌ Bank not found:', bankError);
      return NextResponse.json({ error: 'البنك غير موجود' }, { status: 404 });
    }

    // (اختياري) التحقق من teacher_id إذا أرسلته الواجهة
    // نترك هذا مرناً

    // 3. إدراج السؤال
    const { data: question, error: insertError } = await supabaseAdmin
      .from('questions')
      .insert(newQuestion)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return NextResponse.json({ error: 'فشل إضافة السؤال: ' + insertError.message }, { status: 500 });
    }

    // 4. تسجيل النشاط
    await supabaseAdmin.from('assistant_logs').insert({
      assistant_id: assistantId,
      action: 'add_question',
      module: 'question_bank',
      details: { bank_id, question_id: question.id },
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      question,
      message: 'تم إضافة السؤال بنجاح',
    });
  } catch (error) {
    console.error('❌ Error in add question API:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}