// ================================================================
// 📁 app/api/assistant/support/reply/route.js
// ✅ إرسال رد – مع تخصيص التذكرة تلقائياً لأول مساعد يرد
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

    // جلب بيانات المساعد
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

    // التحقق من صلاحية الرد
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

    // جلب التذكرة
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'التذكرة غير موجودة' }, { status: 404 });
    }

    // التحقق من أن التذكرة غير معينة لمساعد آخر
    const isAssignedToOther = ticket.assigned_to !== null 
                              && ticket.assigned_to !== assistantId 
                              && ticket.assigned_to !== assistant.teacher_id;

    if (isAssignedToOther) {
      return NextResponse.json({ error: 'هذه التذكرة معينة لمساعد آخر' }, { status: 403 });
    }

    // التحقق من الصلاحية على التذكرة
    const isAssignedToAssistant = ticket.assigned_to === assistantId;
    const isUnassigned = ticket.assigned_to === null;
    const isAssignedToTeacher = ticket.assigned_to === assistant.teacher_id;

    if (!isAssignedToAssistant && !isUnassigned && !isAssignedToTeacher) {
      return NextResponse.json({ error: 'غير مصرح لك بالرد على هذه التذكرة' }, { status: 403 });
    }

    // ✅ تحديد sender_id (دائماً teacher_id لأن المعلم هو الوحيد في profiles)
    const senderId = assistant.teacher_id;

    // تأكد من وجود teacher_id في profiles
    const { data: teacherProfile, error: teacherProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name')
      .eq('id', senderId)
      .single();

    if (teacherProfileError || !teacherProfile) {
      return NextResponse.json(
        { error: 'المعلم غير موجود. تأكد من أن teacher_id صحيح.' },
        { status: 500 }
      );
    }

    // إدراج الرد
    const { data: newReply, error: insertError } = await supabaseAdmin
      .from('ticket_replies')
      .insert({
        ticket_id: ticketId,
        sender_id: senderId,
        message: message.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ خطأ في إدراج الرد:', insertError);
      return NextResponse.json({ error: 'فشل إدراج الرد: ' + insertError.message }, { status: 500 });
    }

    // 🆕 تخصيص التذكرة للمساعد الحالي (إذا كانت غير معينة أو معينة للمعلم)
    if (ticket.assigned_to === null || ticket.assigned_to === assistant.teacher_id) {
      await supabaseAdmin
        .from('tickets')
        .update({ 
          assigned_to: assistantId,
          updated_at: new Date().toISOString()
        })
        .eq('id', ticketId);
    }

    // تحديث التذكرة (first_reply_at, status)
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

    // إرجاع الرد مع معلومات المساعد الذي رد
    return NextResponse.json({
      success: true,
      reply: {
        ...newReply,
        sender: {
          full_name: teacherProfile.full_name,
        },
        replied_by_assistant: {
          id: assistant.id,
          full_name: assistant.display_name || assistant.full_name || 'مساعد',
        },
      },
    });
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}