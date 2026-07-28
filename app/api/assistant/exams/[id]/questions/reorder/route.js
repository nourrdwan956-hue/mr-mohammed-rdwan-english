

// app/api/assistant/exams/[id]/questions/reorder/route.js
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
    const { teacher_id, questions } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الامتحان مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!questions || questions.length === 0) {
      return NextResponse.json({ error: 'لا توجد أسئلة لإعادة الترتيب' }, { status: 400 });
    }

    // تحديث كل سؤال بالترتيب الجديد
    for (const q of questions) {
      const { error } = await supabaseAdmin
        .from('exam_questions')
        .update({ order_index: q.order_index })
        .eq('id', q.id)
        .eq('exam_id', id);

      if (error) {
        console.error('❌ Reorder error:', error);
        return NextResponse.json({ error: 'فشل إعادة ترتيب الأسئلة' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, message: 'تم إعادة ترتيب الأسئلة بنجاح' });
  } catch (err) {
    console.error('❌ Reorder error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}