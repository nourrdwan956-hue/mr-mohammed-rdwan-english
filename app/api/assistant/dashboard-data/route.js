// ================================================================
// 📁 app/api/assistant/dashboard-data/route.js
// ✅ إرجاع إحصائيات لوحة التحكم، بما فيها عدد التذاكر غير المردود عليها
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

    // جلب الصلاحيات
    const { data: permissions } = await supabaseAdmin
      .from('assistant_permissions')
      .select('*')
      .eq('assistant_id', assistantId);

    // ===== إحصائيات المحتوى =====
    const stats = {};

    if (permissions.some(p => p.module === 'courses' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.courses = count || 0;
    }

    if (permissions.some(p => p.module === 'videos' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.videos = count || 0;
    }

    if (permissions.some(p => p.module === 'exams' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.exams = count || 0;
    }

    if (permissions.some(p => p.module === 'books' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.books = count || 0;
    }

    if (permissions.some(p => p.module === 'question_bank' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.questionBanks = count || 0;
    }

    // ===== الدعم: عدد التذاكر غير المردود عليها =====
    if (permissions.some(p => (p.module === 'support' || p.module === 'tickets') && (p.can_view || p.can_manage))) {
      // 1. جلب جميع مساعدي المعلم (بما فيهم المساعد الحالي)
      const { data: allAssistants } = await supabaseAdmin
        .from('assistants')
        .select('id')
        .eq('teacher_id', assistant.teacher_id);

      const assistantIds = allAssistants?.map(a => a.id) || [];
      // نضيف معرف المعلم نفسه (كـ "مساعد" خاص)
      const assignableIds = [assistant.teacher_id, ...assistantIds];

      // 2. جلب التذاكر المفتوحة/قيد المعالجة المرتبطة بهذا المعلم (عن طريق assigned_to أو عبر الكورس)
      //    - التذاكر التي assigned_to في قائمة assignableIds (معلم أو مساعديه)
      //    - أو التذاكر غير المخصصة (assigned_to IS NULL) ولكن مرتبطة بكورس لهذا المعلم
      
      // 2.a التذاكر المخصصة لأحدهم
      const { data: assignedTickets, error: err1 } = await supabaseAdmin
        .from('tickets')
        .select('id')
        .in('assigned_to', assignableIds)
        .in('status', ['open', 'in_progress']);

      if (err1) console.error('err1', err1);
      const assignedIds = assignedTickets?.map(t => t.id) || [];

      // 2.b التذاكر غير المخصصة ولكن مرتبطة بكورس لهذا المعلم
      const { data: unassignedTickets, error: err2 } = await supabaseAdmin
        .from('tickets')
        .select('id, course_id')
        .is('assigned_to', null)
        .in('status', ['open', 'in_progress']);

      if (err2) console.error('err2', err2);
      
      // فلترة التذاكر غير المخصصة التي تتبع كورسات المعلم
      let courseIds = [];
      if (unassignedTickets && unassignedTickets.length > 0) {
        const courseIdList = unassignedTickets.map(t => t.course_id).filter(id => id !== null);
        if (courseIdList.length > 0) {
          const { data: teacherCourses } = await supabaseAdmin
            .from('courses')
            .select('id')
            .eq('teacher_id', assistant.teacher_id)
            .in('id', courseIdList);
          courseIds = teacherCourses?.map(c => c.id) || [];
        }
      }
      
      const unassignedValidIds = unassignedTickets
        ?.filter(t => courseIds.includes(t.course_id))
        .map(t => t.id) || [];

      // دمج المعرفات
      const allTicketIds = [...assignedIds, ...unassignedValidIds];

      // 3. من بين هذه التذاكر، احسب التي ليس لها رد (first_reply_at IS NULL)
      let pendingCount = 0;
      if (allTicketIds.length > 0) {
        const { count } = await supabaseAdmin
          .from('tickets')
          .select('*', { count: 'exact', head: true })
          .in('id', allTicketIds)
          .is('first_reply_at', null);
        pendingCount = count || 0;
      }

      stats.support = pendingCount;
    } else {
      stats.support = 0;
    }

    // ===== إحصائيات إضافية =====
    if (permissions.some(p => p.module === 'announcements' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.announcements = count || 0;
    }
    if (permissions.some(p => p.module === 'messages' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.messages = count || 0;
    }
    if (permissions.some(p => p.module === 'notes' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('notes')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.notes = count || 0;
    }

    // ===== آخر النشاطات (آخر 5 تذاكر) =====
    let ticketsForLogs = [];
    if (allTicketIds && allTicketIds.length > 0) {
      const { data: logsData } = await supabaseAdmin
        .from('tickets')
        .select('id, subject, status, updated_at, created_at')
        .in('id', allTicketIds.slice(0, 20)) // نأخذ عينة
        .order('updated_at', { ascending: false })
        .limit(5);
      ticketsForLogs = logsData || [];
    }

    const formattedLogs = ticketsForLogs.map(log => ({
      id: log.id,
      action: `تذكرة: ${log.subject}`,
      created_at: log.updated_at || log.created_at,
    }));

    return NextResponse.json({
      success: true,
      assistant: {
        ...assistant,
        permissions,
      },
      permissions,
      stats,
      logs: formattedLogs,
    });
  } catch (error) {
    console.error('❌ Dashboard data error:', error);
    return NextResponse.json(
      { error: 'فشل جلب بيانات لوحة التحكم', details: error.message },
      { status: 500 }
    );
  }
}