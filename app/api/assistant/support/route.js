// ================================================================
// 📁 app/api/assistant/support/route.js
// ✅ النسخة النهائية – تجلب تذاكر المعلم والمساعد وغير المعينة
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    // 1. جلب assistantId من الهيدر
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    // 2. تهيئة Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json({ error: 'تكوين الخادم غير مكتمل' }, { status: 500 });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. جلب بيانات المساعد
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

    // 4. التحقق من صلاحية العرض
    const { data: permissions, error: permsError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_view, can_manage')
      .eq('assistant_id', assistantId);

    const canView = permissions?.some(
      (p) => (p.module === 'tickets' || p.module === 'support') && (p.can_view || p.can_manage)
    );

    if (!canView) {
      return NextResponse.json({ error: 'غير مصرح لك بمشاهدة التذاكر' }, { status: 403 });
    }

    // 5. معاملات الطلب
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const ticketId = searchParams.get('id');

    // 6. جلب التذاكر:
    //    - المعينة للمساعد نفسه (assigned_to = assistantId)
    //    - غير المعينة (assigned_to = null)
    //    - المعينة للمعلم (assigned_to = assistant.teacher_id)  ← هذا هو التعديل الجوهري
    let query = supabaseAdmin
      .from('tickets')
      .select('*, student:profiles!tickets_student_id_fkey(full_name, email), course:courses(title, teacher_id)')
      .or(`assigned_to.eq.${assistantId},assigned_to.is.null,assigned_to.eq.${assistant.teacher_id}`);

    if (type) {
      query = query.eq('support_type', type);
    }

    if (ticketId) {
      query = query.eq('id', ticketId);
      const { data, error } = await query;
      if (error) {
        console.error('❌ خطأ في جلب التذكرة:', error);
        return NextResponse.json({ error: 'فشل جلب التذكرة: ' + error.message }, { status: 500 });
      }
      if (!data || data.length === 0) {
        return NextResponse.json({ error: 'التذكرة غير موجودة' }, { status: 404 });
      }
      return NextResponse.json({ success: true, tickets: data });
    }

    // جلب جميع التذاكر
    const { data: tickets, error: ticketsError } = await query.order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('❌ خطأ في جلب التذاكر:', ticketsError);
      return NextResponse.json({ error: 'فشل جلب التذاكر: ' + ticketsError.message }, { status: 500 });
    }

    // 7. تصفية إضافية للتأكد من أن التذاكر تابعة للمعلم (عن طريق course_id أو student_id)
    // جلب قائمة الكورسات والطلاب التابعين للمعلم
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

    // تصفية التذاكر: يجب أن تكون مرتبطة بكورس من كورسات المعلم أو طالب من طلاب المعلم
    const filteredTickets = (tickets || []).filter(ticket => {
      if (ticket.course_id) {
        return courseIds.has(ticket.course_id);
      }
      if (ticket.student_id) {
        return studentIds.has(ticket.student_id);
      }
      // إذا لم يكن لها لا course ولا student، نقبلها إذا كانت assigned_to = المعلم أو المساعد (حالة عامة)
      return (ticket.assigned_to === assistant.teacher_id || ticket.assigned_to === assistantId);
    });

    // 8. إحصائيات
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