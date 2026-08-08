

// app/api/assistant/exams/[id]/results/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الامتحان مطلوب' }, { status: 400 });
    }
    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    // 1. التحقق من وجود الامتحان وملكيته
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', teacherId)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود' }, { status: 404 });
    }

    // 2. جلب محاولات الطلاب
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        *,
        profiles:student_id (full_name, email)
      `)
      .eq('exam_id', id)
      .eq('status', 'completed')
      .order('score', { ascending: false });

    if (attemptsError) {
      console.error('❌ Attempts error:', attemptsError);
      return NextResponse.json({ error: 'فشل جلب المحاولات' }, { status: 500 });
    }

    const processedAttempts = (attempts || []).map(a => ({
      ...a,
      student_name: a.profiles?.full_name || 'طالب',
      student_email: a.profiles?.email || '',
      total_marks: exam.total_marks || 0,
    }));

    // 3. جلب أسئلة الامتحان مع معلومات البنوك
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('exam_questions')
      .select('id, question_text, question_type, marks, bank_question_id, difficulty, order_index')
      .eq('exam_id', id)
      .order('order_index', { ascending: true });

    if (questionsError) {
      console.error('❌ Questions error:', questionsError);
      return NextResponse.json({ error: 'فشل جلب الأسئلة' }, { status: 500 });
    }

    // 4. جلب إجابات الطلاب
    const { data: studentAnswers, error: answersError } = await supabaseAdmin
      .from('student_answers')
      .select('question_id, student_id, is_correct, score_earned')
      .eq('exam_id', id);

    if (answersError) {
      console.error('❌ Answers error:', answersError);
      // نستمر حتى لو فشل جلب الإجابات، نرجع بيانات جزئية
    }

    // 5. حساب إحصائيات الأسئلة
    const questionStatsMap = {};
    const studentAnswersData = studentAnswers || [];

    questions?.forEach(q => {
      const answers = studentAnswersData.filter(a => a.question_id === q.id);
      const correctCount = answers.filter(a => a.is_correct).length;
      const totalAttempts = answers.length;
      const avgScore = totalAttempts > 0
        ? answers.reduce((sum, a) => sum + (a.score_earned || 0), 0) / totalAttempts
        : 0;

      questionStatsMap[q.id] = {
        ...q,
        totalAttempts,
        correctCount,
        correctRate: totalAttempts > 0 ? (correctCount / totalAttempts) * 100 : 0,
        avgScore,
        isBankQuestion: !!q.bank_question_id,
      };
    });

    const questionStats = Object.values(questionStatsMap);

    // 6. إحصائيات البنوك
    const bankQuestions = questionStats.filter(q => q.isBankQuestion);
    const bankCorrect = bankQuestions.reduce((sum, q) => sum + q.correctCount, 0);
    const bankTotalAttempts = bankQuestions.reduce((sum, q) => sum + q.totalAttempts, 0);
    const bankAvgScore = bankTotalAttempts > 0
      ? bankQuestions.reduce((sum, q) => sum + (q.avgScore * q.totalAttempts), 0) / bankTotalAttempts
      : 0;

    // 7. جلب أسماء البنوك للأسئلة
    const bankQuestionIds = bankQuestions.map(q => q.bank_question_id).filter(Boolean);
    let bankMap = {};
    if (bankQuestionIds.length > 0) {
      const { data: originalQuestions } = await supabaseAdmin
        .from('questions')
        .select('id, bank_id')
        .in('id', bankQuestionIds);

      const bankIds = [...new Set(originalQuestions?.map(q => q.bank_id).filter(Boolean))];
      if (bankIds.length > 0) {
        const { data: banks } = await supabaseAdmin
          .from('question_banks')
          .select('id, title')
          .in('id', bankIds);
        banks?.forEach(b => { bankMap[b.id] = b.title; });
      }

      // ربط كل سؤال باسم البنك
      const bankIdMap = {};
      originalQuestions?.forEach(q => {
        if (q.bank_id) bankIdMap[q.id] = q.bank_id;
      });

      bankQuestions.forEach(q => {
        const bankId = bankIdMap[q.bank_question_id];
        if (bankId) {
          q.bank_name = bankMap[bankId] || 'بنك غير معروف';
          q.bank_id = bankId;
        }
      });
    }

    // 8. ترتيب أسئلة البنك حسب الأداء
    const sortedBankQuestions = [...bankQuestions].sort((a, b) => b.correctRate - a.correctRate);
    const topBankQuestions = sortedBankQuestions.slice(0, 5);
    const lowestBankQuestions = [...sortedBankQuestions].reverse().slice(0, 5);

    return NextResponse.json({
      success: true,
      attempts: processedAttempts,
      questionStats,
      bankStats: {
        bankQuestions: bankQuestions.length,
        bankCorrect,
        bankAvgScore,
        bankTotalAttempts,
      },
      topBankQuestions,
      lowestBankQuestions,
    });
  } catch (err) {
    console.error('❌ GET results error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}