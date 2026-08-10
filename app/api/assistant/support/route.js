// ================================================================
// 📁 app/api/assistant/support/route.js
// ✅ جلب التذاكر – تظهر فقط التذاكر المتاحة للمساعد الحالي
// (غير معينة، معينة للمعلم، أو معينة له شخصياً)
// التذاكر المعينة لمساعد آخر لا تظهر ولا يمكن الوصول إليها
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

    // التحقق من صلاحية العرض
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

    // بناء الاستعلام الأساسي: التذاكر التي يمكن للمساعد رؤيتها
    // 1. المعينة له (assigned_to = assistantId)
    // 2. غير المعينة (assigned_to = null)
    // 3. المعينة للمعلم (assigned_to = assistant.teacher_id)
    let query = supabaseAdmin
      .from('tickets')
      .select('*, student:profiles!tickets_student_id_fkey(full_name, email), course:courses(title, teacher_id)')
      .or(`assigned_to.eq.${assistantId},assigned_to.is.null,assigned_to.eq.${assistant.teacher_id}`);

    if (type) {
      query = query.eq('support_type', type);
    }

    // إذا طلب تذكرة محددة
    if (ticketId) {
      const { data, error } = await query.eq('id', ticketId);
      if (error) {
        return NextResponse.json({ error: 'فشل جلب التذكرة: ' + error.message }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'التذكرة غير موجودة أو غير مصرح لك بمشاهدتها' }, { status: 404 });
      }
      // نتحقق إضافياً أن التذكرة ليست معينة لمساعد آخر (لن يمر بالشرط أعلاه، لكن للتأكيد)
      const ticket = data[0];
      if (ticket.assigned_to !== null && ticket.assigned_to !== assistantId && ticket.assigned_to !== assistant.teacher_id) {
        return NextResponse.json({ error: 'غير مصرح لك بمشاهدة هذه التذكرة' }, { status: 403 });
      }
      return NextResponse.json({ success: true, tickets: [ticket] });
    }

    // جلب جميع التذاكر المتاحة
    const { data: tickets, error: ticketsError } = await query.order('created_at', { ascending: false });

    if (ticketsError) {
      return NextResponse.json({ error: 'فشل جلب التذاكر: ' + ticketsError.message }, { status: 500 });
    }

    // تصفية إضافية للتأكد من أن التذاكر تابعة للمعلم (عن طريق course_id أو student_id)
    const { data: teacherCourses } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('teacher_id', assistant.teacher_id);

    const { data: teacherStudents } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('teacher_id', assistant.teacher_id);

    const courseIds = new Set(teacherCourses?.map(c => c.id) || []);
    const studentIds = new Set(teacherStudents?.map(s => s.id) || []);

    const filteredTickets = (tickets || []).filter(ticket => {
      // إذا كان للتذكرة course_id، يجب أن يكون ضمن كورسات المعلم
      if (ticket.course_id) {
        return courseIds.has(ticket.course_id);
      }
      // إذا كان لها student_id، يجب أن يكون ضمن طلاب المعلم
      if (ticket.student_id) {
        return studentIds.has(ticket.student_id);
      }
      // إذا لم يكن لها لا course ولا student، نقبلها إذا كانت معينة للمعلم أو المساعد الحالي أو غير معينة (هذا مضمون بالشرط أعلاه)
      return true;
    });

    // إحصائيات
    const open = filteredTickets.filter(t => t.status === 'open' || t.status === 'in_progress').length;
    const inProgress = filteredTickets.filter(t => t.status === 'in_progress').length;
    const resolved = filteredTickets.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    return NextResponse.json({
      success: true,
      tickets: filteredTickets,
      stats: { open, inProgress, resolved },
    });
  } catch (error) {
    console.error('❌ خطأ عام:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم: ' + error.message }, { status: 500 });
  }
}