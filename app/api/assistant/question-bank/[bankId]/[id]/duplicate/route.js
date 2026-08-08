

// app/api/assistant/question-bank/[id]/duplicate/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف البنك مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    // جلب البنك الأصلي
    const { data: original, error: fetchError } = await supabaseAdmin
      .from('question_banks')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', teacher_id)
      .single();

    if (fetchError || !original) {
      return NextResponse.json({ error: 'البنك غير موجود أو غير مصرح لك به' }, { status: 404 });
    }

    // نسخ البنك
    const { id: _, ...copyData } = original;
    const newBank = {
      ...copyData,
      title: `${original.title} (نسخة)`,
      is_published: false,
      published_to_students: false,
      student_access_code: null,
      archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: bank, error: insertError } = await supabaseAdmin
      .from('question_banks')
      .insert(newBank)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Duplicate error:', insertError);
      return NextResponse.json({ error: 'فشل نسخ البنك' }, { status: 500 });
    }

    return NextResponse.json({ success: true, bank });
  } catch (err) {
    console.error('❌ POST duplicate error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}