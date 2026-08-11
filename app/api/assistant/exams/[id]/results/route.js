// ================================================================
// 📁 app/api/assistant/exams/[id]/results/route.js
// جلب نتائج الامتحان للمساعد (GET)
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
    const limit = parseInt(searchParams.get('limit')) || 100;
    const offset = parseInt(searchParams.get('offset')) || 0;

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
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة نتائج هذا الامتحان' }, { status: 403 });
    }

    // التحقق من ملكية الامتحان
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', examId)
      .eq('teacher_id', assistant.teacher_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود أو لا يخص معلمك' }, { status: 404 });
    }

    // جلب المحاولات مع بيانات الطلاب
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        *,
        profiles:student_id (id, full_name, email, phone, parent_phone, school, grade, governorate)
      `)
      .eq('exam_id', examId)
      .eq('status', 'completed')
      .order('score', { ascending: false })
      .range(offset, offset + limit - 1);

    if (attemptsError) {
      return NextResponse.json({ error: 'فشل جلب المحاولات: ' + attemptsError.message }, { status: 500 });
    }

    // معالجة البيانات لتضمين اسم الطالب
    const processedAttempts = (attempts || []).map(a => ({
      ...a,
      full_name: a.profiles?.full_name || 'طالب',
      email: a.profiles?.email || '',
      phone: a.profiles?.phone || '',
      parent_phone: a.profiles?.parent_phone || '',
      school: a.profiles?.school || '',
      grade: a.profiles?.grade || '',
      governorate: a.profiles?.governorate || '',
    }));

    // جلب عدد المحاولات الكلي
    const { count, error: countError } = await supabaseAdmin
      .from('exam_attempts')
      .select('id', { count: 'exact', head: true })
      .eq('exam_id', examId)
      .eq('status', 'completed');

    if (countError) {
      console.warn('⚠️ فشل جلب عدد المحاولات:', countError.message);
    }

    return NextResponse.json({
      success: true,
      attempts: processedAttempts,
      total: count || 0,
      exam,
    });
  } catch (error) {
    console.error('❌ GET /api/assistant/exams/[id]/results error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}