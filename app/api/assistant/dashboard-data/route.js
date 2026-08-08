
// app/api/assistant/dashboard-data/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
export async function GET(request) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. جلب بيانات المساعد
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
    }

    if (!assistant.is_active) {
      return NextResponse.json({ error: 'الحساب غير نشط' }, { status: 403 });
    }

    // تحديث last_login
    await supabaseAdmin
      .from('assistants')
      .update({ last_login: new Date().toISOString() })
      .eq('id', assistantId);

    // 2. جلب الصلاحيات
    const { data: permissions, error: permsError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('*')
      .eq('assistant_id', assistantId);

    const perms = permissions || [];

    // 3. جلب الإحصائيات
    const teacherId = assistant.teacher_id;
    const stats = {};

    const countTable = async (table, field = 'teacher_id') => {
      const { count, error } = await supabaseAdmin
        .from(table)
        .select('*', { count: 'exact', head: true })
        .eq(field, teacherId);
      if (error) return 0;
      return count || 0;
    };

    stats.courses = await countTable('courses');
    stats.videos = await countTable('videos');
    stats.exams = await countTable('exams');
    stats.books = await countTable('books');
    stats.questionBanks = await countTable('question_banks');

    // عدد الطلاب: enrollments عبر course_ids
    const { data: courseIdsData } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('teacher_id', teacherId);
    const courseIds = courseIdsData?.map(c => c.id) || [];
    let studentsCount = 0;
    if (courseIds.length > 0) {
      const { count } = await supabaseAdmin
        .from('enrollments')
        .select('student_id', { count: 'exact', head: true })
        .in('course_id', courseIds);
      studentsCount = count || 0;
    }
    stats.students = studentsCount;

    // 4. جلب آخر النشاطات (اختياري)
    const { data: logs, error: logsError } = await supabaseAdmin
      .from('assistant_logs')
      .select('*')
      .eq('assistant_id', assistantId)
      .order('created_at', { ascending: false })
      .limit(6);

    // استجابة موحدة
    return NextResponse.json({
      success: true,
      assistant: {
        id: assistant.id,
        full_name: assistant.full_name,
        display_name: assistant.display_name,
        role: assistant.role,
        teacher_id: assistant.teacher_id,
        access_code: assistant.access_code,
        is_active: assistant.is_active,
        created_at: assistant.created_at,
        last_login: assistant.last_login,
      },
      permissions: perms,
      stats,
      logs: logs || [],
    });
  } catch (err) {
    console.error('❌ Dashboard data error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}