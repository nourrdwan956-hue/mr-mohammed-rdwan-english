

// app/api/assistant/videos/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب الفيديوهات (مع أو بدون course_id)
// ================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');
    const teacherId = searchParams.get('teacher_id');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    // بناء الاستعلام
    let query = supabaseAdmin
      .from('videos')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false });

    if (courseId && courseId !== 'all') {
      // التحقق من أن الكورس يخص المعلم
      const { data: course, error: courseError } = await supabaseAdmin
        .from('courses')
        .select('teacher_id')
        .eq('id', courseId)
        .single();

      if (courseError || !course) {
        return NextResponse.json(
          { error: 'الكورس غير موجود' },
          { status: 404 }
        );
      }

      if (course.teacher_id !== teacherId) {
        return NextResponse.json(
          { error: 'غير مصرح لك بمشاهدة فيديوهات هذا الكورس' },
          { status: 403 }
        );
      }

      query = query.eq('course_id', courseId);
    }

    const { data: videos, error } = await query;

    if (error) {
      console.error('❌ GET videos error:', error);
      return NextResponse.json(
        { error: 'فشل جلب الفيديوهات' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videos: videos || [],
    });
  } catch (err) {
    console.error('❌ GET videos unexpected error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 POST – إضافة فيديو جديد
// ================================================================
export async function POST(request) {
  try {
    const body = await request.json();

    const {
      teacher_id,
      course_id,
      title,
      description,
      video_url,
      storage_type,
      duration,
      tags,
      level,
      grade_stage,
      grade_level,
      is_free,
      is_published,
      is_scheduled,
      scheduled_date,
      display_mode,
      order_index,
    } = body;

    // التحقق من البيانات المطلوبة
    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    if (!course_id) {
      return NextResponse.json(
        { error: 'course_id مطلوب' },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'عنوان الفيديو مطلوب' },
        { status: 400 }
      );
    }

    if (!video_url?.trim()) {
      return NextResponse.json(
        { error: 'رابط الفيديو مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الكورس وصلاحيته
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('teacher_id')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'الكورس غير موجود' },
        { status: 404 }
      );
    }

    if (course.teacher_id !== teacher_id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بإضافة فيديو لهذا الكورس' },
        { status: 403 }
      );
    }

    // إنشاء الفيديو
    const videoData = {
      teacher_id,
      course_id,
      title: title.trim(),
      description: description?.trim() || null,
      video_url: video_url.trim(),
      storage_type: storage_type || 'youtube',
      duration: duration ? parseInt(duration) : null,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
      level: level || null,
      grade_stage: grade_stage || null,
      grade_level: grade_level ? parseInt(grade_level) : null,
      is_free: !!is_free,
      is_published: !!is_published,
      is_scheduled: !!is_scheduled,
      scheduled_date: scheduled_date || null,
      display_mode: display_mode || 'platform',
      order_index: order_index ? parseInt(order_index) : 0,
      views: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: video, error: insertError } = await supabaseAdmin
      .from('videos')
      .insert(videoData)
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert video error:', insertError);
      return NextResponse.json(
        { error: 'فشل إضافة الفيديو: ' + insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video,
    });
  } catch (err) {
    console.error('❌ POST video error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 PUT – تحديث فيديو (نشر، وضع العرض، تعديل البيانات)
// ================================================================
export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الفيديو مطلوب' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // الحقول المسموح بتحديثها
    const allowedFields = [
      'title', 'description', 'video_url', 'storage_type',
      'duration', 'tags', 'level', 'grade_stage', 'grade_level',
      'is_free', 'is_published', 'is_scheduled', 'scheduled_date',
      'display_mode', 'order_index'
    ];

    const updateData = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        if (field === 'tags' && typeof body[field] === 'string') {
          updateData[field] = body[field].split(',').map(t => t.trim()).filter(Boolean);
        } else if (field === 'duration' || field === 'order_index') {
          updateData[field] = body[field] ? parseInt(body[field]) : null;
        } else if (field === 'grade_level') {
          updateData[field] = body[field] ? parseInt(body[field]) : null;
        } else if (field === 'is_free' || field === 'is_published' || field === 'is_scheduled') {
          updateData[field] = !!body[field];
        } else {
          updateData[field] = body[field] || null;
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'لا توجد بيانات للتحديث' },
        { status: 400 }
      );
    }

    updateData.updated_at = new Date().toISOString();

    const { data: video, error: updateError } = await supabaseAdmin
      .from('videos')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update video error:', updateError);
      return NextResponse.json(
        { error: 'فشل تحديث الفيديو: ' + updateError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      video,
    });
  } catch (err) {
    console.error('❌ PUT video error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 DELETE – حذف فيديو (فردي أو جماعي)
// ================================================================
export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const idsParam = searchParams.get('ids'); // قائمة مفصولة بفواصل للحذف الجماعي

    // إذا كان هناك ids (حذف جماعي)
    if (idsParam) {
      const ids = idsParam.split(',').filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json(
          { error: 'لا توجد معرفات للحذف' },
          { status: 400 }
        );
      }

      // التحقق من وجود الفيديوهات
      const { data: existing, error: checkError } = await supabaseAdmin
        .from('videos')
        .select('id')
        .in('id', ids);

      if (checkError) {
        console.error('❌ Check videos error:', checkError);
        return NextResponse.json(
          { error: 'فشل التحقق من الفيديوهات' },
          { status: 500 }
        );
      }

      if (existing.length !== ids.length) {
        return NextResponse.json(
          { error: 'بعض الفيديوهات غير موجودة' },
          { status: 404 }
        );
      }

      const { error: deleteError } = await supabaseAdmin
        .from('videos')
        .delete()
        .in('id', ids);

      if (deleteError) {
        console.error('❌ Batch delete error:', deleteError);
        return NextResponse.json(
          { error: 'فشل حذف الفيديوهات: ' + deleteError.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `تم حذف ${ids.length} فيديو بنجاح`,
        deletedCount: ids.length,
      });
    }

    // حذف فردي
    if (!id) {
      return NextResponse.json(
        { error: 'معرف الفيديو مطلوب' },
        { status: 400 }
      );
    }

    const { error: deleteError } = await supabaseAdmin
      .from('videos')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('❌ Delete video error:', deleteError);
      return NextResponse.json(
        { error: 'فشل حذف الفيديو: ' + deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الفيديو بنجاح',
    });
  } catch (err) {
    console.error('❌ DELETE video error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}