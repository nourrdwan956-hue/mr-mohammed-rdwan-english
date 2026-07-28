

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('courseId');
    const userId = request.headers.get('x-user-id');
    const assistantId = request.headers.get('x-assistant-id');

    if (!courseId) {
      return NextResponse.json({ error: 'معرف الكورس مطلوب' }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SECRET_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // تحديد هوية المستخدم (معلم أم مساعد)
    let teacherId = null;

    if (userId) {
      teacherId = userId;
    } else if (assistantId) {
      const { data: assistant } = await supabaseAdmin
        .from('assistants')
        .select('teacher_id')
        .eq('id', assistantId)
        .single();
      teacherId = assistant?.teacher_id;
    }

    // بناء الاستعلام
    let query = supabaseAdmin
      .from('books')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });

    if (teacherId) {
      query = query.eq('teacher_id', teacherId);
    }

    const { data: books, error } = await query;

    if (error) {
      console.error('❌ Error fetching books:', error);
      return NextResponse.json({ error: 'فشل جلب الكتب' }, { status: 500 });
    }

    // تنسيق البيانات قبل الإرسال (إضافة معلومات مفيدة للواجهة)
    const formattedBooks = books.map(book => ({
      ...book,
      // تحديد نوع الملف لعرض أيقونة مناسبة
      file_type_display: book.file_name?.split('.').pop()?.toLowerCase() || 'unknown',
      // تحديد ما إذا كان الملف قابلاً للتحميل مباشرة (Supabase) أم رابط خارجي
      is_downloadable: book.source_type === 'supabase',
      // رابط التحميل المناسب
      download_url: book.source_type === 'supabase' ? book.file_url : book.external_url,
      // حجم الملف بتنسيق مقروء
      file_size_display: book.file_size ? formatFileSize(book.file_size) : 'غير محدد',
    }));

    return NextResponse.json({
      success: true,
      books: formattedBooks,
      count: books.length,
    });
  } catch (error) {
    console.error('❌ Error in books API:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}

// دالة مساعدة لتنسيق حجم الملف
function formatFileSize(bytes) {
  if (bytes === 0) return '0 بايت';
  const k = 1024;
  const sizes = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}