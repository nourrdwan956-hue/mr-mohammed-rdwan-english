// ================================================================
// 📁 app/api/assistant/support/route.js
// ✅ نسخة مبسطة – تجلب التذاكر بناءً على teacher_id من الطلاب أو الكورسات
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    // 1. استخراج معرف المساعد
    const assistantId = request.headers.get('x-assistant-id');
    console.log('🔍 assistantId:', assistantId);

    if (!assistantId) {
      return NextResponse.json({ error: 'معرف المساعد مطلوب' }, { status: 400 });
    }

    // 2. تهيئة Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      console.error('❌ مفاتيح Supabase غير مكتملة');
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
      console.error('❌ المساعد غير موجود:', assistantError);
      return NextResponse.json({ error: 'المساعد غير موجود' }, { status: 404 });
    }

    console.log('✅ المساعد:', assistant.full_name, 'teacher_id:', assistant.teacher_id);

    if (!assistant.is_active) {
      return NextResponse.json({ error: 'الحساب غير مفعل' }, { status: 403 });
    }

    // 4. التحقق من الصلاحيات
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

    // 5. استخراج معاملات الطلب
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const ticketId = searchParams.get('id');

    // 6. جلب جميع الطلاب التابعين لهذا المعلم (للتأكد من التذاكر)
    const { data: students } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('teacher_id', assistant.teacher_id);

    const studentIds = students?.map(s => s.id) || [];
    console.log('👨‍🎓 عدد الطلاب التابعين للمعلم:', studentIds.length);

    // 7. جلب جميع كورسات المعلم
    const { data: courses } = await supabaseAdmin
      .from('courses')
      .select('id')
      .eq('teacher_id', assistant.teacher_id);

    const courseIds = courses?.map(c => c.id) || [];
    console.log('📚 عدد الكورسات:', courseIds.length);

    // 8. بناء الاستعلام الأساسي: يجيب التذاكر التي:
    //    - معينة لهذا المساعد OR غير معينة
    //    - و (course_id في كورسات المعلم OR course_id IS NULL)
    //    - أو student_id في قائمة الطلاب التابعين للمعلم (للحالات التي ليس لها course_id)
    let query = supabaseAdmin
      .from('tickets')
      .select('*, student:profiles!tickets_student_id_fkey(full_name, email), course:courses(title, teacher_id)')
      .or(`assigned_to.eq.${assistantId},assigned_to.is.null`);

    // شرط الكورس أو الطالب
    const conditions = [];
    if (courseIds.length > 0) {
      const courseInClause = courseIds.map(id => `'${id}'`).join(',');
      conditions.push(`course_id.in.(${courseInClause})`);
    }
    conditions.push('course_id.is.null');

    // إذا كان هناك طلاب تابعين للمعلم، نضيف شرط student_id
    if (studentIds.length > 0) {
      const studentInClause = studentIds.map(id => `'${id}'`).join(',');
      conditions.push(`student_id.in.(${studentInClause})`);
    }

    query = query.or(conditions.join(','));

    if (type) {
      query = query.eq('support_type', type);
    }

    // 9. تنفيذ الاستعلام
    if (ticketId) {
      // تذكرة محددة
      const { data, error } = await query.eq('id', ticketId);
      if (error) {
        console.error('❌ خطأ في جلب التذكرة:', error);
        return NextResponse.json({ error: 'فشل جلب التذكرة' }, { status: 500 });
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
      return NextResponse.json({ error: 'فشل جلب التذاكر' }, { status: 500 });
    }

    console.log(`✅ تم جلب ${tickets?.length || 0} تذكرة`);

    // 10. إحصائيات
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
    console.error('❌ خطأ عام:', error);
    return NextResponse.json({ error: 'حدث خطأ في الخادم' }, { status: 500 });
  }
}