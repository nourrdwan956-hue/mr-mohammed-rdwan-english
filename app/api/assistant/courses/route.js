
// app/api/assistant/courses/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب قائمة الكورسات
// ================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    const { data: courses, error } = await supabaseAdmin
      .from('courses')
      .select(`
        *,
        enrollments:enrollments(count),
        videos:videos(count),
        exams:exams(count),
        books:books(count),
        question_banks:question_banks(count)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ GET error:', error);
      return NextResponse.json(
        { error: 'فشل جلب الكورسات' },
        { status: 500 }
      );
    }

    const processed = (courses || []).map((course) => ({
      ...course,
      students_count: course.enrollments?.[0]?.count || 0,
      videos_count: course.videos?.[0]?.count || 0,
      exams_count: course.exams?.[0]?.count || 0,
      books_count: course.books?.[0]?.count || 0,
      question_banks_count: course.question_banks?.[0]?.count || 0,
    }));

    return NextResponse.json({ success: true, courses: processed });
  } catch (err) {
    console.error('❌ GET unexpected error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 POST – إنشاء كورس جديد (مع الأعمدة الموجودة فقط)
// ================================================================
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      teacher_id,
      title,
      description,
      price,
      grade_stage,
      grade_level,
      cover_image,
      is_free,
      slug,
      is_published,
      // ⚠️ الأعمدة التالية غير موجودة في قاعدة البيانات حالياً
      // start_date,
      // end_date,
      // max_students,
      // tags,
    } = body;

    // ===== التحقق من البيانات المطلوبة =====
    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'عنوان الكورس مطلوب' },
        { status: 400 }
      );
    }

    if (!description || !description.trim()) {
      return NextResponse.json(
        { error: 'الوصف مطلوب' },
        { status: 400 }
      );
    }

    if (!grade_stage || !grade_stage.trim()) {
      return NextResponse.json(
        { error: 'المرحلة الدراسية مطلوبة' },
        { status: 400 }
      );
    }

    if (!grade_level || isNaN(parseInt(grade_level))) {
      return NextResponse.json(
        { error: 'الصف الدراسي مطلوب' },
        { status: 400 }
      );
    }

    if (!is_free && (!price || parseFloat(price) <= 0)) {
      return NextResponse.json(
        { error: 'السعر مطلوب (أو اختر مجاني)' },
        { status: 400 }
      );
    }

    // ===== التحقق من عدم تكرار slug =====
    let finalSlug = slug || generateSlug(title);
    const { data: existing } = await supabaseAdmin
      .from('courses')
      .select('slug')
      .eq('slug', finalSlug)
      .maybeSingle();

    if (existing) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    // ===== بناء كائن الكورس (الأعمدة الموجودة فقط) =====
    const courseData = {
      teacher_id,
      title: title.trim(),
      description: description.trim(),
      price: is_free ? 0 : parseFloat(price),
      grade_stage: grade_stage.trim(),
      grade_level: parseInt(grade_level),
      cover_image: cover_image || null,
      is_free: !!is_free,
      slug: finalSlug,
      is_published: !!is_published,
      updated_at: new Date().toISOString(),
    };

    // ===== إدخال الكورس =====
    const { data: course, error: insertError } = await supabaseAdmin
      .from('courses')
      .insert(courseData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return NextResponse.json(
        { error: 'فشل إنشاء الكورس: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (err) {
    console.error('❌ POST unexpected error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}

// ================================================================
// 🔧 دوال مساعدة
// ================================================================
function generateSlug(text) {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[^\u0600-\u06FF\u0750-\u077F\u08A0-\u08FFa-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 100);
}