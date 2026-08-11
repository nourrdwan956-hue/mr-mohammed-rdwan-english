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

    // ===== إحصائيات المحتوى (حسب الصلاحيات) =====
    const stats = {};

    // الكورسات
    if (permissions.some(p => p.module === 'courses' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.courses = count || 0;
    }

    // الفيديوهات
    if (permissions.some(p => p.module === 'videos' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('videos')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.videos = count || 0;
    }

    // الامتحانات
    if (permissions.some(p => p.module === 'exams' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.exams = count || 0;
    }

    // الكتب
    if (permissions.some(p => p.module === 'books' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('books')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.books = count || 0;
    }

    // بنك الأسئلة
    if (permissions.some(p => p.module === 'question_bank' && (p.can_view || p.can_manage))) {
      const { count } = await supabaseAdmin
        .from('questions')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id);
      stats.questionBanks = count || 0;
    }

    // ===== الدعم: عدد التذاكر التي لم يتم الرد عليها (غير مخصصة أو مفتوحة بدون رد) =====
    if (permissions.some(p => (p.module === 'support' || p.module === 'tickets') && (p.can_view || p.can_manage))) {
      // ✅ 1- التذاكر غير المخصصة (assigned_to IS NULL) والمفتوحة أو قيد المعالجة
      const { count: unassignedOpen } = await supabaseAdmin
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id) // افتراض وجود teacher_id في tickets
        .is('assigned_to', null)
        .in('status', ['open', 'in_progress']);

      // ✅ 2- التذاكر المخصصة ولكن لم يرد عليها بعد (first_reply_at IS NULL)
      const { count: noReply } = await supabaseAdmin
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('teacher_id', assistant.teacher_id)
        .not('assigned_to', 'is', null)
        .is('first_reply_at', null)
        .in('status', ['open', 'in_progress']);

      stats.support = (unassignedOpen || 0) + (noReply || 0);
    } else {
      stats.support = 0;
    }

    // ===== إحصائيات إضافية: الإعلانات، المراسلات، الملاحظات =====
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

    // ===== آخر النشاطات (آخر 5 تذاكر أو أحداث) =====
    const { data: logs } = await supabaseAdmin
      .from('tickets')
      .select('id, subject, status, created_at, updated_at, assigned_to')
      .eq('teacher_id', assistant.teacher_id)
      .order('updated_at', { ascending: false })
      .limit(5);

    const formattedLogs = (logs || []).map(log => ({
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