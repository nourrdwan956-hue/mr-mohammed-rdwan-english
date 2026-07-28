

// app/api/assistant/question-bank/[id]/publish/route.js
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
    const { teacher_id, is_published } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف البنك مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    const { data: existing, error: checkError } = await supabaseAdmin
      .from('question_banks')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', teacher_id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'البنك غير موجود أو غير مصرح لك به' }, { status: 404 });
    }

    const { data: bank, error } = await supabaseAdmin
      .from('question_banks')
      .update({
        is_published: !!is_published,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Publish error:', error);
      return NextResponse.json({ error: 'فشل تغيير حالة النشر' }, { status: 500 });
    }

    return NextResponse.json({ success: true, bank });
  } catch (err) {
    console.error('❌ PUT publish error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}