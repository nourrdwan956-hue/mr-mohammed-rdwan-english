// ================================================================
// 📁 app/api/assistant/exams/route.js
// إدارة الامتحانات للمساعد (GET, POST) – بدون حذف
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // جلب بيانات المساعد
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

    // جلب صلاحيات المساعد
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_view, can_manage')
      .eq('assistant_id', assistantId);

    const canView = permissions?.some(
      (p) => (p.module === 'exams') && (p.can_view || p.can_manage)
    );

    if (!canView) {
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة الامتحانات' }, { status: 403 });
    }

    // معاملات التصفية
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const status = searchParams.get('status'); // published, draft, active, upcoming, ended

    // بناء الاستعلام
    let query = supabaseAdmin
      .from('exams')
      .select('*')
      .eq('teacher_id', assistant.teacher_id)
      .order('created_at', { ascending: false });

    if (courseId && courseId !== 'all') {
      query = query.eq('course_id', courseId);
    }

    if (status) {
      const now = new Date().toISOString();
      if (status === 'published') {
        query = query.eq('is_published', true);
      } else if (status === 'draft') {
        query = query.eq('is_published', false);
      } else if (status === 'active') {
        query = query
          .eq('is_published', true)
          .lte('start_date', now)
          .gte('end_date', now);
      } else if (status === 'upcoming') {
        query = query
          .eq('is_published', true)
          .gt('start_date', now);
      } else if (status === 'ended') {
        query = query
          .eq('is_published', true)
          .lt('end_date', now);
      }
    }

    const { data: exams, error: examsError } = await query;

    if (examsError) {
      return NextResponse.json({ error: 'فشل جلب الامتحانات: ' + examsError.message }, { status: 500 });
    }

    // جلب إحصائيات إضافية (عدد الأسئلة والمحاولات) لكل امتحان
    const examIds = exams.map(e => e.id);
    let attemptsCount = {};
    let questionsCount = {};

    if (examIds.length > 0) {
      // عدد المحاولات
      const { data: attemptsData } = await supabaseAdmin
        .from('exam_attempts')
        .select('exam_id')
        .in('exam_id', examIds);
      
      attemptsData?.forEach(a => {
        attemptsCount[a.exam_id] = (attemptsCount[a.exam_id] || 0) + 1;
      });

      // عدد الأسئلة (استبعاد القطع)
      const { data: questionsData } = await supabaseAdmin
        .from('exam_questions')
        .select('exam_id, type')
        .in('exam_id', examIds)
        .neq('type', 'passage');

      questionsData?.forEach(q => {
        questionsCount[q.exam_id] = (questionsCount[q.exam_id] || 0) + 1;
      });
    }

    const enrichedExams = exams.map(exam => ({
      ...exam,
      attempts_count: attemptsCount[exam.id] || 0,
      questions_count: questionsCount[exam.id] || 0,
    }));

    return NextResponse.json({
      success: true,
      exams: enrichedExams,
    });
  } catch (error) {
    console.error('❌ GET /api/assistant/exams error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, course_id, duration_minutes, start_date, end_date, total_marks, passing_marks, shuffle_questions, shuffle_options, allow_backward, show_results_immediately, attempts_allowed, password, settings, is_published } = body;

    // التحقق من الحقول المطلوبة
    if (!title || !duration_minutes || !start_date || !end_date) {
      return NextResponse.json({ error: 'العنوان، المدة، تاريخ البدء وتاريخ الانتهاء مطلوبة' }, { status: 400 });
    }

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

    // صلاحية الإنشاء
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_create, can_manage')
      .eq('assistant_id', assistantId);

    const canCreate = permissions?.some(
      (p) => (p.module === 'exams') && (p.can_create || p.can_manage)
    );

    if (!canCreate) {
      return NextResponse.json({ error: 'غير مصرح لك بإنشاء امتحانات' }, { status: 403 });
    }

    // التحقق من وجود الكورس (إن وجد)
    if (course_id) {
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', course_id)
        .eq('teacher_id', assistant.teacher_id)
        .single();

      if (courseError || !course) {
        return NextResponse.json({ error: 'الكورس غير موجود أو لا يخص معلمك' }, { status: 400 });
      }
    }

    // إنشاء الامتحان
    const examData = {
      teacher_id: assistant.teacher_id,
      title: title.trim(),
      description: description?.trim() || '',
      course_id: course_id || null,
      duration_minutes: Number(duration_minutes),
      start_date: start_date,
      end_date: end_date,
      total_marks: Number(total_marks) || 0,
      passing_marks: Number(passing_marks) || 0,
      shuffle_questions: shuffle_questions !== undefined ? shuffle_questions : true,
      shuffle_options: shuffle_options !== undefined ? shuffle_options : true,
      allow_backward: allow_backward || false,
      show_results_immediately: show_results_immediately !== undefined ? show_results_immediately : true,
      attempts_allowed: Number(attempts_allowed) || 1,
      password: password || null,
      settings: settings || {},
      is_published: is_published || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: newExam, error: insertError } = await supabaseAdmin
      .from('exams')
      .insert(examData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'فشل إنشاء الامتحان: ' + insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      exam: newExam,
    });
  } catch (error) {
    console.error('❌ POST /api/assistant/exams error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}