// ================================================================
// 📁 app/api/assistant/exams/[id]/route.js
// إدارة امتحان محدد للمساعد (GET, PUT) – بدون DELETE
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasPermission } from '@/lib/permissions';

export async function GET(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id } = await params; // Next.js 15+ requires await params

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

    // صلاحية العرض
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_view, can_manage')
      .eq('assistant_id', assistantId);

    const canView = permissions?.some(
      (p) => (p.module === 'exams') && (p.can_view || p.can_manage)
    );

    if (!canView) {
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة هذا الامتحان' }, { status: 403 });
    }

    // جلب الامتحان
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('*, course:courses(title, teacher_id)')
      .eq('id', id)
      .eq('teacher_id', assistant.teacher_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود أو لا يخص معلمك' }, { status: 404 });
    }

    // جلب إحصائيات إضافية
    const [attemptsCount, questionsCount] = await Promise.all([
      supabaseAdmin.from('exam_attempts').select('id', { count: 'exact', head: true }).eq('exam_id', id),
      supabaseAdmin.from('exam_questions').select('id', { count: 'exact', head: true }).eq('exam_id', id).neq('type', 'passage'),
    ]);

    const examWithStats = {
      ...exam,
      attempts_count: attemptsCount.count || 0,
      questions_count: questionsCount.count || 0,
    };

    return NextResponse.json({
      success: true,
      exam: examWithStats,
    });
  } catch (error) {
    console.error('❌ GET /api/assistant/exams/[id] error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id } = await params;
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
      return NextResponse.json({ error: 'غير مصرح لك بتعديل الامتحانات' }, { status: 403 });
    }

    // التحقق من وجود الامتحان وملكيته
    const { data: existingExam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', assistant.teacher_id)
      .single();

    if (examError || !existingExam) {
      return NextResponse.json({ error: 'الامتحان غير موجود أو لا يخص معلمك' }, { status: 404 });
    }

    // التحقق من الكورس (إن وجد)
    if (body.course_id) {
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('id')
        .eq('id', body.course_id)
        .eq('teacher_id', assistant.teacher_id)
        .single();

      if (courseError || !course) {
        return NextResponse.json({ error: 'الكورس غير موجود أو لا يخص معلمك' }, { status: 400 });
      }
    }

    // بناء بيانات التحديث
    const updateData = {};
    const allowedFields = [
      'title', 'description', 'course_id', 'duration_minutes', 'start_date', 'end_date',
      'total_marks', 'passing_marks', 'shuffle_questions', 'shuffle_options',
      'allow_backward', 'show_results_immediately', 'attempts_allowed', 'password', 'settings',
      'is_published'
    ];
    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    });
    updateData.updated_at = new Date().toISOString();

    const { data: updatedExam, error: updateError } = await supabaseAdmin
      .from('exams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث الامتحان: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      exam: updatedExam,
    });
  } catch (error) {
    console.error('❌ PUT /api/assistant/exams/[id] error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

// ❌ DELETE ممنوع للمساعد
export async function DELETE(request, { params }) {
  return NextResponse.json({ error: 'لا يمكن حذف الامتحانات من حساب المساعد' }, { status: 403 });
}