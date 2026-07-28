

// app/api/assistant/exams/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب جميع الامتحانات مع بيانات البنوك
// ================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    // 1. جلب الامتحانات
    const { data: exams, error: examsError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (examsError) {
      console.error('❌ Exams error:', examsError);
      return NextResponse.json({ error: 'فشل جلب الامتحانات' }, { status: 500 });
    }

    const examIds = exams?.map(e => e.id) || [];

    // 2. جلب إحصائيات المحاولات والأسئلة
    let attemptsCounts = {};
    let questionsCounts = {};

    if (examIds.length > 0) {
      const { data: attemptsData } = await supabaseAdmin
        .from('exam_attempts')
        .select('exam_id')
        .in('exam_id', examIds);

      attemptsData?.forEach(row => {
        attemptsCounts[row.exam_id] = (attemptsCounts[row.exam_id] || 0) + 1;
      });

      const { data: questionsData } = await supabaseAdmin
        .from('exam_questions')
        .select('exam_id, bank_question_id')
        .in('exam_id', examIds);

      questionsData?.forEach(row => {
        questionsCounts[row.exam_id] = (questionsCounts[row.exam_id] || 0) + 1;
      });

      // 3. جلب بيانات البنوك المصدر
      const bankQuestionIds = questionsData
        ?.filter(q => q.bank_question_id)
        .map(q => q.bank_question_id) || [];

      let questionBankMap = {};
      if (bankQuestionIds.length > 0) {
        const { data: questions } = await supabaseAdmin
          .from('questions')
          .select('id, bank_id')
          .in('id', bankQuestionIds);
        questions?.forEach(q => {
          questionBankMap[q.id] = q.bank_id;
        });
      }

      const examBankMap = {};
      questionsData?.forEach(q => {
        if (q.bank_question_id && questionBankMap[q.bank_question_id]) {
          const bankId = questionBankMap[q.bank_question_id];
          if (!examBankMap[q.exam_id]) {
            examBankMap[q.exam_id] = { bankId, count: 0 };
          }
          examBankMap[q.exam_id].count += 1;
        }
      });

      const bankIds = Object.values(examBankMap).map(item => item.bankId).filter(Boolean);
      let bankMap = {};
      if (bankIds.length > 0) {
        const { data: banks } = await supabaseAdmin
          .from('question_banks')
          .select('id, title')
          .in('id', bankIds);
        banks?.forEach(b => { bankMap[b.id] = b.title; });
      }

      // 4. إضافة بيانات البنك إلى كل امتحان
      exams?.forEach(exam => {
        const bankInfo = examBankMap[exam.id];
        if (bankInfo) {
          exam.bank_id = bankInfo.bankId;
          exam.bank_title = bankMap[bankInfo.bankId] || 'بنك غير معروف';
          exam.bank_questions_count = bankInfo.count;
        }
      });
    }

    const processed = exams?.map(exam => ({
      ...exam,
      attempts_count: attemptsCounts[exam.id] || 0,
      questions_count: questionsCounts[exam.id] || 0,
    })) || [];

    return NextResponse.json({
      success: true,
      exams: processed,
      banks: {}, // يمكن إضافة البنوك هنا إذا لزم الأمر
    });
  } catch (err) {
    console.error('❌ GET exams error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

// ================================================================
// 📡 POST – إنشاء امتحان جديد
// ================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      teacher_id,
      course_id,
      title,
      description,
      duration_minutes,
      start_date,
      end_date,
      total_marks,
      passing_marks,
      shuffle_questions,
      shuffle_options,
      allow_backward,
      show_results_immediately,
      attempts_allowed,
      password,
      settings,
      is_published,
    } = body;

    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'عنوان الامتحان مطلوب' }, { status: 400 });
    }

    const examData = {
      teacher_id,
      course_id: course_id || null,
      title: title.trim(),
      description: description?.trim() || null,
      duration_minutes: duration_minutes || 0,
      start_date: start_date || new Date().toISOString(),
      end_date: end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      total_marks: total_marks || 0,
      passing_marks: passing_marks || 0,
      shuffle_questions: !!shuffle_questions,
      shuffle_options: !!shuffle_options,
      allow_backward: !!allow_backward,
      show_results_immediately: !!show_results_immediately,
      attempts_allowed: attempts_allowed || 1,
      password: password || null,
      settings: settings || {},
      is_published: !!is_published,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: exam, error } = await supabaseAdmin
      .from('exams')
      .insert(examData)
      .select()
      .single();

    if (error) {
      console.error('❌ Insert exam error:', error);
      return NextResponse.json({ error: 'فشل إنشاء الامتحان' }, { status: 500 });
    }

    return NextResponse.json({ success: true, exam });
  } catch (err) {
    console.error('❌ POST exam error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}