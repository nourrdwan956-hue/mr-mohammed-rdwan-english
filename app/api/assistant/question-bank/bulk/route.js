

// app/api/assistant/question-bank/bulk/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PUT(request) {
  try {
    const body = await request.json();
    const { teacher_id, ids, action } = body;

    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'لا توجد بنوك محددة' }, { status: 400 });
    }

    // التحقق من الملكية
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('question_banks')
      .select('id')
      .in('id', ids)
      .eq('teacher_id', teacher_id);

    if (checkError || existing?.length !== ids.length) {
      return NextResponse.json({ error: 'بعض البنوك غير موجودة أو غير مصرح لك بها' }, { status: 404 });
    }

    let updateData = {};
    if (action === 'publish') {
      updateData = { is_published: true, archived: false, updated_at: new Date().toISOString() };
    } else if (action === 'archive') {
      updateData = { archived: true, updated_at: new Date().toISOString() };
    } else {
      return NextResponse.json({ error: 'إجراء غير معروف' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('question_banks')
      .update(updateData)
      .in('id', ids);

    if (error) {
      console.error('❌ Bulk update error:', error);
      return NextResponse.json({ error: 'فشل التحديث الجماعي' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `تم تحديث ${ids.length} بنك` });
  } catch (err) {
    console.error('❌ Bulk PUT error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { teacher_id, ids } = body;

    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'لا توجد بنوك محددة' }, { status: 400 });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('question_banks')
      .select('id')
      .in('id', ids)
      .eq('teacher_id', teacher_id);

    if (checkError || existing?.length !== ids.length) {
      return NextResponse.json({ error: 'بعض البنوك غير موجودة أو غير مصرح لك بها' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('question_banks')
      .delete()
      .in('id', ids);

    if (error) {
      console.error('❌ Bulk delete error:', error);
      return NextResponse.json({ error: 'فشل الحذف الجماعي' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `تم حذف ${ids.length} بنك` });
  } catch (err) {
    console.error('❌ Bulk DELETE error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}