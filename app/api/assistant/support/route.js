// ================================================================
// 📁 app/api/assistant/support/route.js
// ✅ إرجاع التذاكر مع الردود و replied_by_assistant (باستخدام left join صريح)
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*, teacher:teacher_id(full_name)')
      .eq('id', assistantId)
      .single();

    if (assistantError || !assistant) {
      return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
    }

    if (!assistant.is_active) {
      return NextResponse.json({ error: 'الحساب غير مفعل' }, { status: 403 });
    }

    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_view, can_manage')
      .eq('assistant_id', assistantId);

    const canView = permissions?.some(
      (p) => (p.module === 'tickets' || p.module === 'support') && (p.can_view || p.can_manage)
    );

    if (!canView) {
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة التذاكر' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const ticketId = searchParams.get('id');
    const status = searchParams.get('status');
    const assignedToMeFilter = searchParams.get('assignedToMe') === 'true';

    let query = supabaseAdmin
      .from('tickets')
      .select(`
        *,
        student:profiles!tickets_student_id_fkey(full_name, email),
        course:courses(title, teacher_id)
      `);

    if (type) query = query.eq('support_type', type);
    if (status) query = query.eq('status', status);
    if (assignedToMeFilter) query = query.eq('assigned_to', assistantId);

    // ===== جلب تذكرة واحدة مع الردود =====
    if (ticketId) {
      query = query.eq('id', ticketId);
      const { data, error } = await query;
      if (error) {
        return NextResponse.json({ error: 'فشل جلب التذكرة: ' + error.message }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'التذكرة غير موجودة' }, { status: 404 });
      }

      // ✅ جلب الردود مع اسم المساعد باستخدام left join يدوي
      const { data: replies, error: repliesError } = await supabaseAdmin
        .from('ticket_replies')
        .select(`
          *,
          sender:profiles(full_name)
        `)
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });

      if (repliesError) {
        console.warn('⚠️ فشل جلب الردود:', repliesError.message);
      }

      // ✅ جلب أسماء المساعدين لكل رد (بشكل منفصل لتجنب مشاكل العلاقة)
      const repliesWithAssistant = await Promise.all((replies || []).map(async (reply) => {
        let replied_by_assistant = null;
        if (reply.replied_by_assistant_id) {
          const { data: assistantData } = await supabaseAdmin
            .from('assistants')
            .select('id, full_name, display_name')
            .eq('id', reply.replied_by_assistant_id)
            .single();
          if (assistantData) {
            replied_by_assistant = {
              id: assistantData.id,
              full_name: assistantData.display_name || assistantData.full_name || 'مساعد'
            };
          }
        }
        return {
          ...reply,
          replied_by_assistant
        };
      }));

      // اسم المساعد المخصص للتذكرة
      let assignedToName = null;
      if (data[0].assigned_to) {
        const { data: assistantData } = await supabaseAdmin
          .from('assistants')
          .select('full_name, display_name')
          .eq('id', data[0].assigned_to)
          .single();
        assignedToName = assistantData?.display_name || assistantData?.full_name || 'مساعد';
      }

      const enhancedTicket = {
        ...data[0],
        assigned_to_name: assignedToName,
        replies: repliesWithAssistant || [],
      };

      return NextResponse.json({
        success: true,
        tickets: [enhancedTicket],
      });
    }

    // ===== جلب جميع التذاكر =====
    const { data: tickets, error: ticketsError } = await query
      .order('priority', { ascending: false })
      .order('created_at', { ascending: false });

    if (ticketsError) {
      return NextResponse.json({ error: 'فشل جلب التذاكر: ' + ticketsError.message }, { status: 500 });
    }

    // جلب أسماء المساعدين المخصصين
    const assignedToIds = tickets.map(t => t.assigned_to).filter(id => id !== null);
    let assistantsMap = {};
    if (assignedToIds.length > 0) {
      const { data: assistantsData } = await supabaseAdmin
        .from('assistants')
        .select('id, full_name, display_name')
        .in('id', assignedToIds);
      assistantsData?.forEach(a => {
        assistantsMap[a.id] = a.display_name || a.full_name || 'مساعد';
      });
    }

    const enhancedTickets = tickets.map(ticket => ({
      ...ticket,
      assigned_to_name: ticket.assigned_to ? (assistantsMap[ticket.assigned_to] || 'مساعد') : null,
      is_assigned_to_me: ticket.assigned_to === assistantId,
      can_reply: (ticket.assigned_to === null || ticket.assigned_to === assistantId || ticket.assigned_to === assistant.teacher_id) && ticket.status !== 'closed',
    }));

    const open = tickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const inProgress = tickets.filter(t => t.status === 'in_progress').length;
    const resolved = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;
    const unassigned = tickets.filter(t => t.assigned_to === null).length;
    const assignedToMeCount = tickets.filter(t => t.assigned_to === assistantId).length;

    return NextResponse.json({
      success: true,
      tickets: enhancedTickets || [],
      stats: {
        open,
        inProgress,
        resolved,
        unassigned,
        assignedToMe: assignedToMeCount,
        total: tickets.length,
      },
    });
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}