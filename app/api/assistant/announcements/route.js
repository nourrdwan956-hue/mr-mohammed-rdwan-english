

// app/api/assistant/announcements/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب قائمة الإعلانات
// ================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    const { data: announcements, error } = await supabaseAdmin
      .from('announcements')
      .select(`
        *,
        course:courses (id, title)
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ GET announcements error:', error);
      return NextResponse.json(
        { error: 'فشل جلب الإعلانات' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      announcements: announcements || [],
    });
  } catch (err) {
    console.error('❌ GET announcements error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 POST – إنشاء إعلان جديد
// ================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { teacher_id, course_id, title, body: content, grade_stage, grade_level, is_published } = body;

    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'عنوان الإعلان مطلوب' },
        { status: 400 }
      );
    }

    if (!content?.trim() || content === '<p><br></p>') {
      return NextResponse.json(
        { error: 'محتوى الإعلان مطلوب' },
        { status: 400 }
      );
    }

    const announcementData = {
      teacher_id,
      course_id: course_id || null,
      title: title.trim(),
      body: content,
      grade_stage: grade_stage || null,
      grade_level: grade_level ? parseInt(grade_level) : null,
      is_published: !!is_published,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data: announcement, error } = await supabaseAdmin
      .from('announcements')
      .insert(announcementData)
      .select()
      .single();

    if (error) {
      console.error('❌ POST announcement error:', error);
      return NextResponse.json(
        { error: 'فشل إنشاء الإعلان' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      announcement,
    });
  } catch (err) {
    console.error('❌ POST announcement error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}