

// app/api/assistant/question-bank/tags/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    // جلب جميع الوسوم من بنوك المعلم
    const { data: banks, error: banksError } = await supabaseAdmin
      .from('question_banks')
      .select('id')
      .eq('teacher_id', teacherId);

    if (banksError) {
      console.error('❌ Tags error:', banksError);
      return NextResponse.json({ error: 'فشل جلب الوسوم' }, { status: 500 });
    }

    const bankIds = banks?.map(b => b.id) || [];
    if (bankIds.length === 0) {
      return NextResponse.json({ success: true, tags: [] });
    }

    const { data: tagsData, error } = await supabaseAdmin
      .from('question_bank_tags')
      .select('tag')
      .in('bank_id', bankIds);

    if (error) {
      console.error('❌ Tags error:', error);
      return NextResponse.json({ error: 'فشل جلب الوسوم' }, { status: 500 });
    }

    const tags = [...new Set(tagsData?.map(t => t.tag).filter(Boolean))] || [];

    return NextResponse.json({ success: true, tags });
  } catch (err) {
    console.error('❌ GET tags error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { bank_id, tag, teacher_id } = body;

    if (!bank_id) {
      return NextResponse.json({ error: 'bank_id مطلوب' }, { status: 400 });
    }
    if (!tag?.trim()) {
      return NextResponse.json({ error: 'الوسم مطلوب' }, { status: 400 });
    }
    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    // التحقق من ملكية البنك
    const { data: bank, error: checkError } = await supabaseAdmin
      .from('question_banks')
      .select('id')
      .eq('id', bank_id)
      .eq('teacher_id', teacher_id)
      .single();

    if (checkError || !bank) {
      return NextResponse.json({ error: 'البنك غير موجود أو غير مصرح لك به' }, { status: 404 });
    }

    const { data: inserted, error } = await supabaseAdmin
      .from('question_bank_tags')
      .insert({ bank_id, tag: tag.trim() })
      .select();

    if (error) {
      console.error('❌ Insert tag error:', error);
      return NextResponse.json({ error: 'فشل إضافة الوسم' }, { status: 500 });
    }

    return NextResponse.json({ success: true, tag: inserted?.[0] });
  } catch (err) {
    console.error('❌ POST tag error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const bankId = searchParams.get('bank_id');
    const tag = searchParams.get('tag');
    const teacherId = searchParams.get('teacher_id');

    if (!bankId) {
      return NextResponse.json({ error: 'bank_id مطلوب' }, { status: 400 });
    }
    if (!tag) {
      return NextResponse.json({ error: 'الوسم مطلوب' }, { status: 400 });
    }
    if (!teacherId) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }

    // التحقق من ملكية البنك
    const { data: bank, error: checkError } = await supabaseAdmin
      .from('question_banks')
      .select('id')
      .eq('id', bankId)
      .eq('teacher_id', teacherId)
      .single();

    if (checkError || !bank) {
      return NextResponse.json({ error: 'البنك غير موجود أو غير مصرح لك به' }, { status: 404 });
    }

    const { error } = await supabaseAdmin
      .from('question_bank_tags')
      .delete()
      .match({ bank_id: bankId, tag });

    if (error) {
      console.error('❌ Delete tag error:', error);
      return NextResponse.json({ error: 'فشل حذف الوسم' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'تم حذف الوسم' });
  } catch (err) {
    console.error('❌ DELETE tag error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}