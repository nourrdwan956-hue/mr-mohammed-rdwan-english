// app/api/exams/copy/route.js
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    // 1. قراءة الكوكيز
    const cookieStore = cookies();
    const cookieHeader = cookieStore.toString();

    // 2. إنشاء عميل Supabase مع تمرير الكوكيز يدوياً
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
        global: {
          headers: {
            Cookie: cookieHeader,
          },
        },
      }
    );

    // 3. الحصول على المستخدم
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('Auth error:', userError);
      return NextResponse.json({ error: 'Authentication failed: ' + userError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    // 4. قراءة البيانات من الطلب
    let examId, targetCourseId;
    try {
      const body = await request.json();
      examId = body.examId;
      targetCourseId = body.targetCourseId;
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!examId || !targetCourseId) {
      return NextResponse.json({ error: 'examId and targetCourseId are required' }, { status: 400 });
    }

    // 5. جلب الامتحان الأصلي
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .eq('teacher_id', user.id)
      .single();

    if (examError) {
      console.error('Error fetching exam:', examError);
      return NextResponse.json({ error: 'Exam not found or you do not have permission' }, { status: 404 });
    }

    if (!exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // 6. التحقق من الكورس الهدف
    const { data: targetCourse, error: courseError } = await supabase
      .from('courses')
      .select('id')
      .eq('id', targetCourseId)
      .eq('teacher_id', user.id)
      .single();

    if (courseError) {
      console.error('Error fetching target course:', courseError);
      return NextResponse.json({ error: 'Target course not found or you do not have permission' }, { status: 404 });
    }

    if (!targetCourse) {
      return NextResponse.json({ error: 'Target course not found' }, { status: 404 });
    }

    // 7. إنشاء نسخة جديدة من الامتحان
    const newExamData = {
      teacher_id: user.id,
      title: exam.title + ' (منسوخ)',
      description: exam.description,
      course_id: targetCourseId,
      duration_minutes: exam.duration_minutes,
      start_date: exam.start_date,
      end_date: exam.end_date,
      total_marks: exam.total_marks,
      passing_marks: exam.passing_marks,
      shuffle_questions: exam.shuffle_questions,
      shuffle_options: exam.shuffle_options,
      allow_backward: exam.allow_backward,
      show_results_immediately: exam.show_results_immediately,
      attempts_allowed: exam.attempts_allowed,
      password: exam.password,
      settings: exam.settings || {},
      is_published: false,
    };

    const { data: newExam, error: insertError } = await supabase
      .from('exams')
      .insert(newExamData)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting new exam:', insertError);
      return NextResponse.json({ error: 'Failed to copy exam: ' + insertError.message }, { status: 500 });
    }

    // 8. نسخ الأسئلة
    const { data: questions, error: qError } = await supabase
      .from('exam_questions')
      .select('*')
      .eq('exam_id', examId)
      .order('order_index', { ascending: true });

    if (qError) {
      console.error('Error fetching questions:', qError);
      // لا نعتبر هذا خطأ فادحاً، نستمر مع تحذير
      return NextResponse.json({
        exam: newExam,
        warning: 'Exam copied but questions could not be retrieved'
      }, { status: 207 });
    }

    if (questions && questions.length > 0) {
      const newQuestions = questions.map(q => ({
        exam_id: newExam.id,
        question_type: q.question_type,
        question_text: q.question_text,
        options: q.options || [],
        correct_answer: q.correct_answer || '',
        marks: q.marks || 1,
        order_index: q.order_index || 0,
        explanation: q.explanation || '',
        // لا ننسخ bank_question_id
      }));

      const { error: insertQError } = await supabase
        .from('exam_questions')
        .insert(newQuestions);

      if (insertQError) {
        console.error('Error copying questions:', insertQError);
        return NextResponse.json({
          exam: newExam,
          warning: 'Exam copied but questions could not be copied'
        }, { status: 207 });
      }
    }

    return NextResponse.json({ exam: newExam, message: 'Exam copied successfully' });

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error: ' + err.message }, { status: 500 });
  }
}