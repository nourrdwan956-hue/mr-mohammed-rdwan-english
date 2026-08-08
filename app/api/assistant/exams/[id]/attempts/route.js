

// app/api/assistant/exams/[id]/attempts/route.js
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

    const { data: attempts, error } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        *,
        profiles:student_id (full_name, email)
      `)
      .eq('exam_id', id)
      .eq('status', 'completed')
      .order('score', { ascending: false });

    if (error) {
      console.error('❌ Attempts error:', error);
      return NextResponse.json({ error: 'فشل جلب المحاولات' }, { status: 500 });
    }

    const processed = (attempts || []).map(a => ({
      ...a,
      student_name: a.profiles?.full_name || 'طالب',
      student_email: a.profiles?.email || '',
    }));

    return NextResponse.json({ success: true, attempts: processed });
  } catch (err) {
    console.error('❌ GET attempts error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}