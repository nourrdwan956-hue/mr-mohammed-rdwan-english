// ================================================================
// 📁 app/api/assistant/dashboard-data/route.js
// ✅ إرجاع إحصائيات لوحة التحكم - نسخة مستقرة ومحسّنة
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
    const { data: permissions, error: permsError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('*')
      .eq('assistant_id', assistantId);

    if (permsError) {
      console.error('❌ Permissions error:', permsError);
    }

    const permissionsList = permissions || [];

    // ===== إحصائيات المحتوى =====
    const stats = {
      courses: 0,
      videos: 0,
      exams: 0,
      books: 0,
      questionBanks: 0,
      support: 0,
      announcements: 0,
      messages: 0,
      notes: 0,
    };

    try {
      if (permissionsList.some(p => p.module === 'courses' && (p.can_view || p.can_manage))) {
        const { count } = await supabaseAdmin
          .from('courses')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', assistant.teacher_id);
        stats.courses = count || 0;
      }
    } catch (e) { console.error('Courses count error:', e); }

    try {
      if (permissionsList.some(p => p.module === 'videos' && (p.can_view || p.can_manage))) {
        const { count } = await supabaseAdmin
          .from('videos')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', assistant.teacher_id);
        stats.videos = count || 0;
      }
    } catch (e) { console.error('Videos count error:', e); }

    try {
      if (permissionsList.some(p => p.module === 'exams' && (p.can_view || p.can_manage))) {
        const { count } = await supabaseAdmin
          .from('exams')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', assistant.teacher_id);
        stats.exams = count || 0;
      }
    } catch (e) { console.error('Exams count error:', e); }

    try {
      if (permissionsList.some(p => p.module === 'books' && (p.can_view || p.can_manage))) {
        const { count } = await supabaseAdmin
          .from('books')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', assistant.teacher_id);
        stats.books = count || 0;
      }
    } catch (e) { console.error('Books count error:', e); }

    try {
      if (permissionsList.some(p => p.module === 'question_bank' && (p.can_view || p.can_manage))) {
        const { count } = await supabaseAdmin
          .from('questions')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', assistant.teacher_id);
        stats.questionBanks = count || 0;
      }
    } catch (e) { console.error('Question bank count error:', e); }

    // ===== الدعم: عدد التذاكر غير المردود عليها =====
    if (permissionsList.some(p => (p.module === 'support' || p.module === 'tickets') && (p.can_view || p.can_manage))) {
      try {
        // 1. جلب جميع مساعدي المعلم
        const { data: allAssistants } = await supabaseAdmin
          .from('assistants')
          .select('id')
          .eq('teacher_id', assistant.teacher_id);

        const assistantIds = allAssistants?.map(a => a.id) || [];
        const assignableIds = [assistant.teacher_id, ...assistantIds];

        // 2. جلب التذاكر المخصصة للمعلم أو مساعديه
        const { data: assignedTickets, error: err1 } = await supabaseAdmin
          .from('tickets')
          .select('id')
          .in('assigned_to', assignableIds)
          .in('status', ['open', 'in_progress']);

        if (err1) console.error('⚠️ Error fetching assigned tickets:', err1);
        const assignedIds = assignedTickets?.map(t => t.id) || [];

        // 3. جلب التذاكر غير المخصصة ولكن مرتبطة بكورس المعلم
        const { data: unassignedTickets, error: err2 } = await supabaseAdmin
          .from('tickets')
          .select('id, course_id')
          .is('assigned_to', null)
          .in('status', ['open', 'in_progress']);

        if (err2) console.error('⚠️ Error fetching unassigned tickets:', err2);

        // فلترة التذاكر غير المخصصة التي تتبع كورسات المعلم
        let unassignedValidIds = [];
        if (unassignedTickets && unassignedTickets.length > 0) {
          const courseIdList = unassignedTickets
            .map(t => t.course_id)
            .filter(id => id !== null);

          if (courseIdList.length > 0) {
            const { data: teacherCourses } = await supabaseAdmin
              .from('courses')
              .select('id')
              .eq('teacher_id', assistant.teacher_id)
              .in('id', courseIdList);

            const courseIds = teacherCourses?.map(c => c.id) || [];
            unassignedValidIds = unassignedTickets
              .filter(t => courseIds.includes(t.course_id))
              .map(t => t.id);
          }
        }

        // دمج المعرفات (مع ضمان أنها مصفوفة)
        const allTicketIds = [...assignedIds, ...unassignedValidIds];

        // 4. حساب التذاكر التي ليس لها رد
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

        // 5. جلب آخر النشاطات (آخر 5 تذاكر من هذه القائمة)
        let logsTickets = [];
        if (allTicketIds.length > 0) {
          const { data: logsData } = await supabaseAdmin
            .from('tickets')
            .select('id, subject, status, updated_at, created_at')
            .in('id', allTicketIds.slice(0, 20))
            .order('updated_at', { ascending: false })
            .limit(5);
          logsTickets = logsData || [];
        }

        // تخزين مؤقت للـ logs لاستخدامه لاحقاً
        global._dashboardLogs = logsTickets.map(log => ({
          id: log.id,
          action: `تذكرة: ${log.subject}`,
          created_at: log.updated_at || log.created_at,
        }));

      } catch (e) {
        console.error('❌ Support stats error:', e);
        stats.support = 0;
        global._dashboardLogs = [];
      }
    } else {
      stats.support = 0;
      global._dashboardLogs = [];
    }

    // ===== إحصائيات إضافية =====
    try {
      if (permissionsList.some(p => p.module === 'announcements' && (p.can_view || p.can_manage))) {
        const { count } = await supabaseAdmin
          .from('announcements')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', assistant.teacher_id);
        stats.announcements = count || 0;
      }
    } catch (e) { console.error('Announcements error:', e); }

    try {
      if (permissionsList.some(p => p.module === 'messages' && (p.can_view || p.can_manage))) {
        const { count } = await supabaseAdmin
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', assistant.teacher_id);
        stats.messages = count || 0;
      }
    } catch (e) { console.error('Messages error:', e); }

    try {
      if (permissionsList.some(p => p.module === 'notes' && (p.can_view || p.can_manage))) {
        const { count } = await supabaseAdmin
          .from('notes')
          .select('*', { count: 'exact', head: true })
          .eq('teacher_id', assistant.teacher_id);
        stats.notes = count || 0;
      }
    } catch (e) { console.error('Notes error:', e); }

    // ===== جلب آخر النشاطات =====
    let logs = global._dashboardLogs || [];
    if (logs.length === 0) {
      // محاولة جلب أي تذاكر حديثة كبديل
      try {
        const { data: fallbackLogs } = await supabaseAdmin
          .from('tickets')
          .select('id, subject, updated_at, created_at')
          .eq('teacher_id', assistant.teacher_id)
          .order('updated_at', { ascending: false })
          .limit(5);
        logs = (fallbackLogs || []).map(log => ({
          id: log.id,
          action: `تذكرة: ${log.subject}`,
          created_at: log.updated_at || log.created_at,
        }));
      } catch (e) {
        logs = [];
      }
    }

    return NextResponse.json({
      success: true,
      assistant: {
        ...assistant,
        permissions: permissionsList,
      },
      permissions: permissionsList,
      stats,
      logs,
    });

  } catch (error) {
    console.error('❌ Dashboard data error:', error);
    return NextResponse.json(
      { 
        error: 'فشل جلب بيانات لوحة التحكم', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}