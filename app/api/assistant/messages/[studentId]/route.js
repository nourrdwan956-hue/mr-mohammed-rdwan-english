

// app/api/assistant/messages/[studentId]/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب رسائل المحادثة مع طالب معين
// ================================================================
export async function GET(request, { params }) {
  try {
    const { studentId } = await params;
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');

    if (!studentId) {
      return NextResponse.json(
        { error: 'معرف الطالب مطلوب' },
        { status: 400 }
      );
    }

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    // جلب رسائل المحادثة بين المعلم والطالب
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${teacherId},receiver_id.eq.${studentId}),and(sender_id.eq.${studentId},receiver_id.eq.${teacherId})`
      )
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Messages error:', error);
      return NextResponse.json(
        { error: 'فشل جلب الرسائل' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: messages || [],
    });
  } catch (err) {
    console.error('❌ GET messages error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}

// ================================================================
// 📡 DELETE – حذف رسالة
// ================================================================
export async function DELETE(request, { params }) {
  try {
    const { studentId } = await params; // studentId هنا هو messageId
    const body = await request.json();
    const { teacher_id } = body;

    if (!studentId) {
      return NextResponse.json(
        { error: 'معرف الرسالة مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من أن الرسالة تخص المعلم
    const { data: msg, error: checkError } = await supabaseAdmin
      .from('messages')
      .select('sender_id')
      .eq('id', studentId)
      .single();

    if (checkError || !msg) {
      return NextResponse.json(
        { error: 'الرسالة غير موجودة' },
        { status: 404 }
      );
    }

    // التحقق من الملكية
    if (msg.sender_id !== teacher_id) {
      return NextResponse.json(
        { error: 'غير مصرح لك بحذف هذه الرسالة' },
        { status: 403 }
      );
    }

    // حذف الرسالة
    const { error: deleteError } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', studentId);

    if (deleteError) {
      console.error('❌ Delete error:', deleteError);
      return NextResponse.json(
        { error: 'فشل حذف الرسالة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'تم حذف الرسالة بنجاح',
    });
  } catch (err) {
    console.error('❌ DELETE error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}