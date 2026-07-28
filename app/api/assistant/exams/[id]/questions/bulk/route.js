

// app/api/assistant/exams/[id]/questions/bulk/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id, ids, updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الامتحان مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'لا توجد أسئلة محددة' }, { status: 400 });
    }
    if (!updates || Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'لا توجد تحديثات' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('exam_questions')
      .update(updates)
      .in('id', ids)
      .eq('exam_id', id);

    if (error) {
      console.error('❌ Bulk update error:', error);
      return NextResponse.json({ error: 'فشل تحديث الأسئلة' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `تم تحديث ${ids.length} سؤال`,
      count: ids.length,
    });
  } catch (err) {
    console.error('❌ Bulk update error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id, ids } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الامتحان مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'لا توجد أسئلة محددة للحذف' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('exam_questions')
      .delete()
      .in('id', ids)
      .eq('exam_id', id);

    if (error) {
      console.error('❌ Bulk delete error:', error);
      return NextResponse.json({ error: 'فشل حذف الأسئلة' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `تم حذف ${ids.length} سؤال`,
      count: ids.length,
    });
  } catch (err) {
    console.error('❌ Bulk delete error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}