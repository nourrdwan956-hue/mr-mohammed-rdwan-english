

// app/api/assistant/question-bank/route.js
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

    const { data: banks, error } = await supabaseAdmin
      .from('question_banks')
      .select(`
        *,
        courses!left(title),
        questions:questions(count)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Banks error:', error);
      return NextResponse.json({ error: 'فشل جلب البنوك' }, { status: 500 });
    }

    // جلب الوسوم
    const bankIds = banks?.map(b => b.id) || [];
    let tagsMap = {};
    if (bankIds.length > 0) {
      const { data: tagsData } = await supabaseAdmin
        .from('question_bank_tags')
        .select('bank_id, tag')
        .in('bank_id', bankIds);
      tagsData?.forEach(row => {
        if (!tagsMap[row.bank_id]) tagsMap[row.bank_id] = [];
        tagsMap[row.bank_id].push(row.tag);
      });
    }

    const formatted = banks?.map(b => ({
      ...b,
      course_title: b.courses?.title || null,
      questions_count: b.questions?.[0]?.count || 0,
      tags: tagsMap[b.id] || [],
      courses: undefined,
      questions: undefined,
    })) || [];

    return NextResponse.json({ success: true, banks: formatted });
  } catch (err) {
    console.error('❌ GET error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { teacher_id, title, description, course_id, grade_level, is_published, published_to_students } = body;

    if (!teacher_id) {
      return NextResponse.json({ error: 'teacher_id مطلوب' }, { status: 400 });
    }
    if (!title?.trim()) {
      return NextResponse.json({ error: 'عنوان البنك مطلوب' }, { status: 400 });
    }
    if (!grade_level) {
      return NextResponse.json({ error: 'المرحلة الدراسية مطلوبة' }, { status: 400 });
    }

    const bankData = {
      teacher_id,
      title: title.trim(),
      description: description?.trim() || null,
      course_id: course_id || null,
      grade_level,
      is_published: !!is_published,
      published_to_students: !!published_to_students,
      archived: false,
      student_access_code: published_to_students
        ? Math.random().toString(36).substring(2, 8).toUpperCase()
        : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: bank, error } = await supabaseAdmin
      .from('question_banks')
      .insert(bankData)
      .select()
      .single();

    if (error) {
      console.error('❌ Insert error:', error);
      return NextResponse.json({ error: 'فشل إنشاء البنك' }, { status: 500 });
    }

    return NextResponse.json({ success: true, bank });
  } catch (err) {
    console.error('❌ POST error:', err);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}