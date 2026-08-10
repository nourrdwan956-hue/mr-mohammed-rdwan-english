// ================================================================
// 📁 app/api/assistant/support/route.js
// ✅ النسخة النهائية – تشمل التذاكر غير المعينة (assigned_to = null)
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

    // التحقق من صلاحية عرض التذاكر
    const { data: permissions, error: permsError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_view, can_manage')
      .eq('assistant_id', assistantId);

    const canViewTickets = permissions?.some(
      (p) => (p.module === 'tickets' || p.module === 'support') && (p.can_view || p.can_manage)
    );

    if (!canViewTickets) {
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة التذاكر' }, { status: 403 });
    }

    // استخراج معاملات الطلب
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const ticketId = searchParams.get('id');

    // جلب جميع كورسات المعلم (لتصفية التذاكر الخاصة به فقط)
    const { data: teacherCourses } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('teacher_id', assistant.teacher_id);

    const courseIds = teacherCourses?.map(c => c.id) || [];
    if (courseIds.length === 0) {
      // إذا لم يكن للمعلم أي كورسات، نعيد فارغ
      return NextResponse.json({
        success: true,
        tickets: [],
        stats: { open: 0, inProgress: 0, resolved: 0 },
      });
    }

    // بناء الاستعلام الأساسي: التذاكر المعينة لهذا المساعد أو غير المعينة (null)
    let query = supabaseAdmin
      .from('tickets')
      .select('*, student:profiles!tickets_student_id_fkey(full_name, email), course:courses(title, teacher_id)')
      .in('course_id', courseIds)
      .or(`assigned_to.eq.${assistantId},assigned_to.is.null`);

    if (type) {
      query = query.eq('support_type', type);
    }

    // إذا طلب تذكرة معينة
    if (ticketId) {
      const { data, error } = await query.eq('id', ticketId);
      if (error) {
        console.error('Ticket fetch error:', error);
        return NextResponse.json({ error: 'فشل جلب التذكرة' }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'التذكرة غير موجودة' }, { status: 404 });
      }
      const ticket = data[0];
      // تأكد أن المساعد يملك صلاحية على هذه التذكرة (إذا كانت معينة لشخص آخر يمنع)
      if (ticket.assigned_to !== null && ticket.assigned_to !== assistantId) {
        return NextResponse.json({ error: 'غير مصرح لك بمشاهدة هذه التذكرة' }, { status: 403 });
      }
      return NextResponse.json({ success: true, tickets: [ticket] });
    }

    // جلب جميع التذاكر
    const { data: tickets, error: ticketsError } = await query.order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('Tickets error:', ticketsError);
      return NextResponse.json({ error: 'فشل جلب التذاكر' }, { status: 500 });
    }

    // إحصائيات
    const allTickets = tickets || [];
    const open = allTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const inProgress = allTickets.filter(t => t.status === 'in_progress').length;
    const resolved = allTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    return NextResponse.json({
      success: true,
      tickets: allTickets,
      stats: { open, inProgress, resolved },
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}