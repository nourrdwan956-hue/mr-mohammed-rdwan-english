
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const assistantId = searchParams.get('assistantId');
    if (!assistantId) {
      return NextResponse.json({ error: 'Assistant ID required' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // جلب كل شيء في نفس الوقت
    const [assistantResult, permissionsResult, banksResult, coursesResult] = await Promise.all([
      supabaseAdmin.from('assistants').select('*').eq('id', assistantId).single(),
      supabaseAdmin.from('assistant_permissions').select('*').eq('assistant_id', assistantId),
      supabaseAdmin.from('question_banks').select('*').eq('teacher_id', (await supabaseAdmin.from('assistants').select('teacher_id').eq('id', assistantId).single()).data.teacher_id),
      supabaseAdmin.from('courses').select('*').eq('teacher_id', (await supabaseAdmin.from('assistants').select('teacher_id').eq('id', assistantId).single()).data.teacher_id),
    ]);

    return NextResponse.json({
      assistant: assistantResult.data || null,
      permissions: permissionsResult.data || [],
      banks: banksResult.data || [],
      courses: coursesResult.data || [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}