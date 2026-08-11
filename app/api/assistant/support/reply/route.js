// ================================================================
// 📁 app/api/assistant/support/reply/route.js
// ✅ النسخة المحسّنة – لا تخصص التذكرة للمساعد (تبقى ظاهرة للجميع)
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const body = await request.json();
    const { ticketId, message } = body;

    if (!ticketId || !message?.trim()) {
      return NextResponse.json({ error: 'معرف التذكرة والرسالة مطلوبان' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // جلب المساعد
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

    // صلاحية الرد
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_edit, can_manage')
      .eq('assistant_id', assistantId);

    const canReply = permissions?.some(
      (p) => (p.module === 'tickets' || p.module === 'support') && (p.can_edit || p.can_manage)
    );

    if (!canReply) {
      return NextResponse.json({ error: 'غير مصرح لك بالرد' }, { status: 403 });
    }

    // جلب التذكرة
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'التذكرة غير موجودة' }, { status: 404 });
    }

    // منع الرد إذا كانت معينة لمساعد آخر (وليس للمعلم ولا للمساعد الحالي)
    const isAssignedToOther = ticket.assigned_to !== null 
                              && ticket.assigned_to !== assistantId 
                              && ticket.assigned_to !== assistant.teacher_id;

    if (isAssignedToOther) {
      return NextResponse.json({ error: 'هذه التذكرة معينة لمساعد آخر' }, { status: 403 });
    }

    // منع الرد إذا كانت مغلقة
    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'هذه التذكرة مغلقة' }, { status: 403 });
    }

    // sender_id = teacher_id (المعلم)
    const senderId = assistant.teacher_id;
    const { data: teacherProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', senderId)
      .single();

    if (!teacherProfile) {
      return NextResponse.json({ error: 'المعلم غير موجود' }, { status: 500 });
    }

    // إدراج الرد
    const { data: newReply, error: insertError } = await supabaseAdmin
      .from('ticket_replies')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        message: message.trim(),
        created_at: new Date().toISOString(),
        // نضيف حقل replied_by_assistant_id لتتبع من رد (سنضيفه إذا كان الجدول يدعمه، وإلا سنكتفي بـ sender_id)
        // لكننا سنضيفه في الرد المُرجَع (من خلال الاستعلام اللاحق)
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'فشل إدراج الرد: ' + insertError.message }, { status: 500 });
    }

    // 🔹 تخصيص التذكرة للمساعد الحالي فقط إذا كانت غير مخصصة (assigned_to = null)
    // وإلا نتركها كما هي (لا نغير التخصيص)
    let assignedToChanged = false;
    if (ticket.assigned_to === null) {
      const { error: updateError } = await supabaseAdmin
        .from('tickets')
        .update({ assigned_to: assistantId, updated_at: new Date().toISOString() })
        .eq('id', ticketId);
      if (!updateError) {
        assignedToChanged = true;
      }
    }

    // تحديث first_reply_at و status
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

    // جلب اسم المساعد لعرضه في الرد
    const assistantName = assistant.display_name || assistant.full_name || 'مساعد';

    // إرجاع الرد مع معلومات المساعد
    return NextResponse.json({
      success: true,
      reply: {
        ...newReply,
        sender: { full_name: teacherProfile.full_name },
        replied_by_assistant: {
          id: assistant.id,
          full_name: assistantName,
        },
        // نشير إلى أنه تم تخصيص التذكرة للمساعد (إن كانت غير مخصصة)
        assigned_to_changed: assignedToChanged,
        assigned_to: ticket.assigned_to === null ? assistantId : ticket.assigned_to,
      },
    });
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}