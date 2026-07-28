

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  try {
    // ✅ انتظار params قبل استخدامها (مطلوب في Next.js 16)
    const { bankId } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');
    const assistantId = request.headers.get('x-assistant-id');

    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    if (!bankId) {
      return NextResponse.json({ error: 'معرف البنك مطلوب' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // التحقق من صلاحية can_view
    const { data: perm, error: permError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('can_view')
      .eq('assistant_id', assistantId)
      .eq('module', 'question_bank')
      .single();

    if (permError || !perm?.can_view) {
      return NextResponse.json(
        { error: 'لا تملك صلاحية لعرض هذا البنك' },
        { status: 403 }
      );
    }

    // التحقق من البنك
    const { data: bank, error: bankError } = await supabaseAdmin
      .from('question_banks')
      .select('teacher_id')
      .eq('id', bankId)
      .single();

    if (bankError || !bank) {
      return NextResponse.json({ error: 'البنك غير موجود' }, { status: 404 });
    }

    if (teacherId && bank.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'البنك لا يخص هذا المعلم' },
        { status: 403 }
      );
    }

    // جلب الأسئلة
    const { data: questions, error: questionsError } = await supabaseAdmin
      .from('questions')
      .select('*')
      .eq('bank_id', bankId)
      .order('created_at', { ascending: false });

    if (questionsError) {
      console.error('Error fetching questions:', questionsError);
      return NextResponse.json(
        { error: 'فشل جلب الأسئلة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questions: questions || [],
    });
  } catch (error) {
    console.error('❌ Error in questions API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}