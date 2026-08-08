

// app/api/assistant/exams/batch/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 PUT – نشر جماعي
// ================================================================
export async function PUT(request) {
  try {
    const body = await request.json();
    const { teacher_id, ids, action } = body;

    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'لا توجد امتحانات محددة' }, { status: 400 });
    }

    // التحقق من الملكية
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .in('id', ids)
      .eq('teacher_id', teacher_id);

    if (checkError || existing?.length !== ids.length) {
      return NextResponse.json({ error: 'بعض الامتحانات غير موجودة أو غير مصرح لك بها' }, { status: 404 });
    }

    if (action === 'publish') {
      const { error } = await supabaseAdmin
        .from('exams')
        .update({ is_published: true, updated_at: new Date().toISOString() })
        .in('id', ids);

      if (error) {
        console.error('❌ Batch publish error:', error);
        return NextResponse.json({ error: 'فشل نشر الامتحانات' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `تم نشر ${ids.length} امتحان`,
        count: ids.length,
      });
    }

    return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
  } catch (err) {
    console.error('❌ Batch PUT error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

// ================================================================
// 📡 DELETE – حذف جماعي
// ================================================================
export async function DELETE(request) {
  try {
    const body = await request.json();
    const { teacher_id, ids } = body;

    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'لا توجد امتحانات محددة' }, { status: 400 });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .in('id', ids)
      .eq('teacher_id', teacher_id);

    if (checkError || existing?.length !== ids.length) {
      return NextResponse.json({ error: 'بعض الامتحانات غير موجودة أو غير مصرح لك بها' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('exams')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('❌ Batch delete error:', error);
      return NextResponse.json({ error: 'فشل حذف الامتحانات' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `تم حذف ${ids.length} امتحان`,
      count: ids.length,
    });
  } catch (err) {
    console.error('❌ Batch DELETE error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}