

import { NextResponse } from 'next/server';
import { extractQuestionsFromFile } from '@/lib/questionExtractor';
import { supabase } from '@/lib/supabaseClient';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.split(' ')[1];
    if (!token) {
      return NextResponse.json({ error: 'لم يتم توفير رمز المصادقة' }, { status: 401 });
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    if (!file) {
      return NextResponse.json({ error: 'لم يتم إرسال ملف' }, { status: 400 });
    }

    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json({ error: 'الملف كبير جداً (الحد الأقصى 50 ميجابايت)' }, { status: 400 });
    }

    const ext = file.name.split('.').pop().toLowerCase();
    if (!['pdf', 'docx', 'txt', 'csv', 'json'].includes(ext)) {
      return NextResponse.json({ error: 'نوع الملف غير مدعوم' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    let questions = [];
    try {
      questions = await extractQuestionsFromFile(buffer, file.name);
    } catch (extractError) {
      console.error('خطأ في الاستخلاص:', extractError);
      return NextResponse.json(
        { error: extractError.message },
        { status: 500 }
      );
    }

    questions = questions.filter(q => q.question_text && q.question_text.trim().length > 0);

    return NextResponse.json({
      questions,
      count: questions.length,
      success: true,
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error.message || 'حدث خطأ داخلي' },
      { status: 500 }
    );
  }
}