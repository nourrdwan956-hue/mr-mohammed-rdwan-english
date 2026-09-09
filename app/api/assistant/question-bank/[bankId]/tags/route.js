

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request, { params }) {
  try {
    // ✅ انتظار params قبل استخدامها (مطلوب في Next.js 16)
    const { bankId } = await params;
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

    // جلب الوسوم
    const { data: tags, error: tagsError } = await supabaseAdmin
      .from('question_bank_tags')
      .select('tag')
      .eq('bank_id', bankId);

    if (tagsError) {
      console.error('Error fetching tags:', tagsError);
      return NextResponse.json(
        { error: 'فشل جلب الوسوم' },
        { status: 500 }
      );
    }

    const tagList = tags.map(row => row.tag);

    return NextResponse.json({
      success: true,
      tags: tagList,
    });
  } catch (error) {
    console.error('❌ Error in tags API:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}