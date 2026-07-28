
// app/api/assistant/courses/[id]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب تفاصيل الكورس مع المحتوى المرتبط
// ================================================================
export async function GET(request, { params }) {
  try {
    // ✅ استخدام await مع params كما هو مطلوب في Next.js 16
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الكورس مطلوب' },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    // 1. جلب الكورس
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('*')
      .eq('id', id)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    // التأكد من أن الكورس يخص المعلم الذي يعمل له المساعد
    if (course.teacher_id !== teacherId) {
      return NextResponse.json(
        { error: 'غير مصرح لك بمشاهدة هذا الكورس' },
        { status: 403 }
      );
    }

    // 2. جلب الفيديوهات
    const { data: videos, error: videosError } = await supabaseAdmin
      .from('videos')
      .select('*')
      .eq('course_id', id)
      .order('order_index', { ascending: true });

    // 3. جلب الامتحانات
    const { data: exams, error: examsError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('course_id', id)
      .order('created_at', { ascending: true });

    // 4. جلب الكتب
    const { data: books, error: booksError } = await supabaseAdmin
      .from('books')
      .select('*')
      .eq('course_id', id)
      .order('created_at', { ascending: true });

    // 5. جلب الطلاب المسجلين مع بياناتهم
    const { data: enrollments, error: enrollError } = await supabaseAdmin
      .from('enrollments')
      .select(`
        student_id,
        progress,
        completed_at,
        updated_at,
        profiles:student_id (full_name, email)
      `)
      .eq('course_id', id);

    const students = (enrollments || []).map(en => ({
      id: en.student_id,
      full_name: en.profiles?.full_name || 'طالب',
      email: en.profiles?.email || '',
      progress: en.progress || 0,
      completed_at: en.completed_at,
      updated_at: en.updated_at,
    }));

    // 6. جلب بنوك الأسئلة
    const { data: banks, error: banksError } = await supabaseAdmin
      .from('question_banks')
      .select('id, title, questions:questions(count), is_published')
      .eq('course_id', id)
      .order('created_at', { ascending: true });

    const banksWithCount = (banks || []).map(b => ({
      ...b,
      questions_count: b.questions?.[0]?.count || 0,
    }));

    // 7. جلب محاولات الامتحانات لحساب متوسط الدرجات (اختياري)
    const examIds = (exams || []).map(e => e.id);
    let examAttempts = [];
    if (examIds.length > 0) {
      const { data: attempts } = await supabaseAdmin
        .from('exam_attempts')
        .select('score, total_marks')
        .in('exam_id', examIds)
        .eq('status', 'completed');
      examAttempts = attempts || [];
    }

    // إضافة إحصائيات إضافية مثل عدد المشاهدات
    const totalViews = (videos || []).reduce((acc, v) => acc + (v.views || 0), 0);

    // إرجاع كل البيانات
    return NextResponse.json({
      success: true,
      course,
      videos: videos || [],
      exams: exams || [],
      books: books || [],
      students,
      banks: banksWithCount || [],
      exam_attempts: examAttempts,
      totalViews,
    });
  } catch (err) {
    console.error('❌ GET course details error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 PUT – تحديث الكورس
// ================================================================
export async function PUT(request, { params }) {
  try {
    // ✅ استخدام await مع params
    const { id } = await params;
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الكورس مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الكورس
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('courses')
      .select('teacher_id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    // استخراج الحقول القابلة للتحديث (الأعمدة الموجودة)
    const {
      title,
      description,
      price,
      grade_stage,
      grade_level,
      cover_image,
      is_free,
      slug,
      is_published,
    } = body;

    // بناء كائن التحديث
    const updateData = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined) updateData.price = parseFloat(price);
    if (grade_stage !== undefined) updateData.grade_stage = grade_stage.trim();
    if (grade_level !== undefined) updateData.grade_level = parseInt(grade_level);
    if (cover_image !== undefined) updateData.cover_image = cover_image || null;
    if (is_free !== undefined) updateData.is_free = !!is_free;
    if (slug !== undefined) updateData.slug = slug;
    if (is_published !== undefined) updateData.is_published = !!is_published;
    updateData.updated_at = new Date().toISOString();

    // تنفيذ التحديث
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('courses')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json(
        { error: 'فشل تحديث الكورس: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      course: updated,
    });
  } catch (err) {
    console.error('❌ PUT error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 DELETE – حذف الكورس
// ================================================================
export async function DELETE(request, { params }) {
  try {
    // ✅ استخدام await مع params
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الكورس مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الكورس
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('id', id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    // حذف الكورس
    const { error: deleteError } = await supabaseAdmin
      .from('courses')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return NextResponse.json(
        { error: 'فشل حذف الكورس: ' + deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الكورس بنجاح',
    });
  } catch (err) {
    console.error('❌ DELETE error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم: ' + err.message },
      { status: 500 }
    );
  }
}