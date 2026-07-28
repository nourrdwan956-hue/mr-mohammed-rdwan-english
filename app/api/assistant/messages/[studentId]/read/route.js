

// app/api/assistant/messages/[studentId]/read/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 PUT – تأشير الرسائل كمقروءة
// ================================================================
export async function PUT(request, { params }) {
  try {
    const { studentId } = await params;
    const body = await request.json();
    const { teacher_id } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'معرف الطالب مطلوب' },
        { status: 400 }
      );
    }

    if (!teacher_id) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', studentId)
      .eq('receiver_id', teacher_id)
      .eq('is_read', false);

    if (error) {
      console.error('❌ Read update error:', error);
      return NextResponse.json(
        { error: 'فشل تحديث حالة القراءة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم تأشير الرسائل كمقروءة',
    });
  } catch (err) {
    console.error('❌ PUT read error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}