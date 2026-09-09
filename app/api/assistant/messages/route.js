

// app/api/assistant/messages/route.js
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY|| process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// ================================================================
// 📡 GET – جلب المحادثات (للمساعد)
// ================================================================
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const teacherId = searchParams.get('teacher_id');
    const assistantId = searchParams.get('assistant_id');

    if (!teacherId) {
      return NextResponse.json(
        { error: 'teacher_id مطلوب' },
        { status: 400 }
      );
    }

    // جلب جميع الرسائل التي تخص المعلم (مرسل أو مستقبل)
    const { data: messages, error: msgError } = await supabaseAdmin
      .from('messages')
      .select(`
        id,
        sender_id,
        receiver_id,
        body,
        is_read,
        created_at,
        sender:profiles!messages_sender_id_fkey (id, full_name, email),
        receiver:profiles!messages_receiver_id_fkey (id, full_name, email)
      `)
      .or(`sender_id.eq.${teacherId},receiver_id.eq.${teacherId}`)
      .order('created_at', { ascending: false });

    if (msgError) {
      console.error('❌ Messages error:', msgError);
      return NextResponse.json(
        { error: 'فشل جلب الرسائل' },
        { status: 500 }
      );
    }

    // ===== تجميع المحادثات =====
    const conversationMap = new Map();
    messages?.forEach(msg => {
      const isSender = msg.sender_id === teacherId;
      const other = isSender ? msg.receiver : msg.sender;
      if (!other) return;
      const studentId = other.id;

      if (!conversationMap.has(studentId)) {
        conversationMap.set(studentId, {
          student: other,
          lastMessage: msg.body,
          lastDate: msg.created_at,
          unreadCount: 0,
        });
      }
      const conv = conversationMap.get(studentId);
      // تحديث آخر رسالة (الأحدث)
      if (new Date(msg.created_at) > new Date(conv.lastDate)) {
        conv.lastMessage = msg.body;
        conv.lastDate = msg.created_at;
      }
      // حساب الرسائل غير المقروءة (التي استلمها المعلم)
      if (!msg.is_read && msg.receiver_id === teacherId) {
        conv.unreadCount += 1;
      }
    });

    const conversations = Array.from(conversationMap.values()).map(conv => ({
      ...conv,
      lastDate: conv.lastDate,
      lastMessage: conv.lastMessage,
    }));

    return NextResponse.json({
      success: true,
      conversations,
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
// 📡 POST – إرسال رسالة جديدة (باسم المعلم)
// ================================================================
export async function POST(request) {
  try {
    const body = await request.json();
    const { sender_id, receiver_id, body: messageBody } = body;

    if (!sender_id) {
      return NextResponse.json(
        { error: 'sender_id مطلوب' },
        { status: 400 }
      );
    }

    if (!receiver_id) {
      return NextResponse.json(
        { error: 'receiver_id مطلوب' },
        { status: 400 }
      );
    }

    if (!messageBody || !messageBody.trim()) {
      return NextResponse.json(
        { error: 'نص الرسالة مطلوب' },
        { status: 400 }
      );
    }

    // إدراج الرسالة
    const { data: message, error: insertError } = await supabaseAdmin
      .from('messages')
      .insert({
        sender_id,
        receiver_id,
        body: messageBody.trim(),
        is_read: false,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert message error:', insertError);
      return NextResponse.json(
        { error: 'فشل إرسال الرسالة' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (err) {
    console.error('❌ POST message error:', err);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}