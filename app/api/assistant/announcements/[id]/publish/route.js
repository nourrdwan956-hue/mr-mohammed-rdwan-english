
// app/api/assistant/announcements/[id]/publish/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 PUT – تبديل حالة النشر
// ================================================================
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { teacher_id } = body;

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
      .select('is_published')
      .eq('id', id)
      .eq('teacher_id', teacher_id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'الإعلان غير موجود أو غير مصرح لك به' },
        { status: 404 }
      );
    }

    const newStatus = !existing.is_published;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('announcements')
      .update({
        is_published: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('❌ Publish toggle error:', updateError);
      return NextResponse.json(
        { error: 'فشل تغيير حالة النشر' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: newStatus ? 'تم نشر الإعلان' : 'تم إلغاء نشر الإعلان',
      announcement: updated,
    });
  } catch (err) {
    console.error('❌ PUT publish error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}