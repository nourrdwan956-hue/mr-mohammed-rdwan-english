
// app/api/assistant/announcements/[id]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب إعلان معين
// ================================================================
export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الإعلان مطلوب' },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .select('*')
      .eq('id', id)
      .eq('teacher_id', teacherId)
      .single();

    if (error || !announcement) {
      return NextResponse.json(
        { error: 'الإعلان غير موجود أو غير مصرح لك به' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (err) {
    console.error('❌ GET announcement error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 PUT – تحديث الإعلان
// ================================================================
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const {
      teacher_id,
      title,
      body: content,
      is_published,
      course_id,
      grade_stage,
      grade_level,
    } = body;

    if (!id) {
      return NextResponse.json(
        { error: 'معرف الإعلان مطلوب' },
        { status: 400 }
      );
    }

    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من وجود الإعلان وملكيته
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('announcements')
      .select('id')
      .eq('id', id)
      .eq('teacher_id', teacher_id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'الإعلان غير موجود أو غير مصرح لك به' },
        { status: 404 }
      );
    }

    const updateData = {
      title: title?.trim(),
      body: content?.trim(),
      is_published: !!is_published,
      course_id: course_id || null,
      grade_stage: grade_stage || null,
      grade_level: grade_level ? parseInt(grade_level) : null,
      updated_at: new Date().toISOString(),
    };

    const { data: announcement, error: updateError } = await supabaseAdmin
      .from('announcements')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Update error:', updateError);
      return NextResponse.json(
        { error: 'فشل تحديث الإعلان' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (err) {
    console.error('❌ PUT announcement error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}