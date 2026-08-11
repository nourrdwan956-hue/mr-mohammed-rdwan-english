// ================================================================
// 📁 app/api/assistant/exams/[id]/publish/route.js
// نشر/إلغاء نشر الامتحان للمساعد (يتطلب صلاحية can_publish)
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function PUT(request, { params }) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const { id: examId } = await params;
    const body = await request.json();
    const { is_published } = body;

    if (is_published === undefined) {
      return NextResponse.json({ error: 'حقل is_published مطلوب' }, { status: 400 });
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

    // صلاحية النشر
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_publish, can_manage')
      .eq('assistant_id', assistantId);

    const canPublish = permissions?.some(
      (p) => (p.module === 'exams') && (p.can_publish || p.can_manage)
    );

    if (!canPublish) {
      return NextResponse.json({ error: 'غير مصرح لك بنشر الامتحانات' }, { status: 403 });
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

    // تحديث حالة النشر
    const { data: updatedExam, error: updateError } = await supabaseAdmin
      .from('exams')
      .update({
        is_published: is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', examId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'فشل تحديث حالة النشر: ' + updateError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      exam: updatedExam,
    });
  } catch (error) {
    console.error('❌ PUT /api/assistant/exams/[id]/publish error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}