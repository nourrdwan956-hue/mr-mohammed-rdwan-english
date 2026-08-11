// ================================================================
// 📁 app/api/assistant/exams/[id]/attempts/route.js
// إدارة محاولات الطلاب للمساعد (GET, PUT) – بدون DELETE
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
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get('studentId');

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
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة محاولات هذا الامتحان' }, { status: 403 });
    }

    // التحقق من ملكية الامتحان
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('teacher_id', assistant.teacher_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود أو لا يخص معلمك' }, { status: 404 });
    }

    // جلب المحاولات
    let query = supabaseAdmin
      .from('exam_attempts')
      .select('*, profiles:student_id (full_name, email)')
      .eq('exam_id', examId);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data: attempts, error: attemptsError } = await query
      .order('created_at', { ascending: false });

    if (attemptsError) {
      return NextResponse.json({ error: 'فشل جلب المحاولات: ' + attemptsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attempts: attempts || [],
    });
  } catch (error) {
    console.error('❌ GET /api/assistant/exams/[id]/attempts error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId } = await params;
    const body = await request.json();
    const { studentId, custom_attempts_limit } = body;

    if (!studentId || custom_attempts_limit === undefined) {
      return NextResponse.json({ error: 'معرف الطالب وعدد المحاولات مطلوبان' }, { status: 400 });
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

    // صلاحية التعديل
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_edit, can_manage')
      .eq('assistant_id', assistantId);

    const canEdit = permissions?.some(
      (p) => (p.module === 'exams') && (p.can_edit || p.can_manage)
    );

    if (!canEdit) {
      return NextResponse.json({ error: 'غير مصرح لك بتعديل محاولات الطلاب' }, { status: 403 });
    }

    // التحقق من ملكية الامتحان
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('id', examId)
      .eq('teacher_id', assistant.teacher_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود أو لا يخص معلمك' }, { status: 404 });
    }

    // تحديث custom_attempts_limit للمحاولة الأحدث للطالب في هذا الامتحان
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .update({ custom_attempts_limit: Number(custom_attempts_limit) })
      .eq('exam_id', examId)
      .eq('student_id', studentId)
      .select()
      .single();

    if (attemptError) {
      return NextResponse.json({ error: 'فشل تحديث المحاولات: ' + attemptError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      attempt,
    });
  } catch (error) {
    console.error('❌ PUT /api/assistant/exams/[id]/attempts error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}