

// app/api/assistant/exams/[id]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!id) {
      return NextResponse.json({ error: 'معرف الامتحان مطلوب' }, { status: 400 });
    }
    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    const { data: exam, error } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', teacherId)
      .single();

    if (error || !exam) {
      return NextResponse.json({ error: 'الامتحان غير موجود' }, { status: 404 });
    }

    return NextResponse.json({ success: true, exam });
  } catch (err) {
    console.error('❌ GET exam error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id, ...updateData } = body;

    if (!id) {
      return NextResponse.json({ error: 'معرف الامتحان مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    // التحقق من الملكية
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('exams')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', teacher_id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json({ error: 'الامتحان غير موجود أو غير مصرح لك به' }, { status: 404 });
    }

    updateData.updated_at = new Date().toISOString();

    const { data: exam, error } = await supabaseAdmin
      .from('exams')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ Update exam error:', error);
      return NextResponse.json({ error: 'فشل تحديث الامتحان' }, { status: 500 });
    }

    return NextResponse.json({ success: true, exam });
  } catch (err) {
    console.error('❌ PUT exam error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}