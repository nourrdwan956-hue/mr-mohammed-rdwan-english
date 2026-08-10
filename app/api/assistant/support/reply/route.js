// ================================================================
// 📁 app/api/assistant/support/reply/route.js
// ✅ إرسال رد على تذكرة دعم (بصلاحيات Service Role)
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    // 1. جلب assistantId من الهيدر
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    // 2. جلب البيانات من الجسم
    const body = await request.json();
    const { ticketId, message } = body;

    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ error: 'معرف التذكرة والرسالة مطلوبان' }, { status: 400 });
    }

    // 3. تهيئة Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 4. جلب بيانات المساعد (للتحقق)
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
    }

    if (!assistant.is_active) {
      return NextResponse.json({ error: 'الحساب غير مفعل' }, { status: 403 });
    }

    // 5. التحقق من صلاحية الرد على التذاكر
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_edit, can_manage')
      .eq('assistant_id', assistantId);

    const canReply = permissions?.some(
      (p) => (p.module === 'tickets' || p.module === 'support') && (p.can_edit || p.can_manage)
    );

    if (!canReply) {
      return NextResponse.json({ error: 'غير مصرح لك بالرد على التذاكر' }, { status: 403 });
    }

    // 6. التأكد من وجود التذكرة وأن المساعد يملك صلاحية الوصول إليها
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'التذكرة غير موجودة' }, { status: 404 });
    }

    // التحقق من أن التذكرة تابعة للمعلم أو المساعد نفسه
    const isAssignedToAssistant = ticket.assigned_to === assistantId;
    const isUnassigned = ticket.assigned_to === null;
    const isAssignedToTeacher = ticket.assigned_to === assistant.teacher_id;

    if (!isAssignedToAssistant && !isUnassigned && !isAssignedToTeacher) {
      return NextResponse.json({ error: 'غير مصرح لك بالرد على هذه التذكرة' }, { status: 403 });
    }

    // 7. إدراج الرد في جدول ticket_replies
    const { data: newReply, error: insertError } = await supabaseAdmin
      .from('ticket_replies')
      .insert({
        ticket_id: ticketId,
        sender_id: assistantId,
        message: message.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ خطأ في إدراج الرد:', insertError);
      return NextResponse.json({ error: 'فشل إدراج الرد: ' + insertError.message }, { status: 500 });
    }

    // 8. تحديث التذكرة (أول رد → تعيين first_reply_at، تغيير الحالة إذا كانت open)
    const updates = {};
    if (!ticket.first_reply_at) {
      updates.first_reply_at = new Date().toISOString();
    }
    if (ticket.status === 'open') {
      updates.status = 'in_progress';
      updates.updated_at = new Date().toISOString();
    }

    if (Object.keys(updates).length > 0) {
      await supabaseAdmin
        .from('tickets')
        .update(updates)
        .eq('id', ticketId);
    }

    // 9. إرجاع الرد الجديد مع بيانات المرسل
    return NextResponse.json({
      success: true,
      reply: {
        ...newReply,
        sender: {
          full_name: assistant.display_name || assistant.full_name || 'مساعد',
        },
      },
    });
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}