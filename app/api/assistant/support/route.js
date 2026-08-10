// ================================================================
// 📁 app/api/assistant/support/route.js
// ✅ النسخة النهائية المعدلة – إصلاح صلاحيات وجلب التذكرة الفردية
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request) {
  try {
    // 1. استخراج assistantId من الـ Header
    const assistantId = request.headers.get('x-assistant-id');
    if (!assistantId) {
      return NextResponse.json(
        { error: 'معرف المساعد مطلوب' },
        { status: 400 }
      );
    }

    // 2. تهيئة Supabase Admin
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseSecretKey) {
      return NextResponse.json(
        { error: 'تكوين الخادم غير مكتمل' },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: 'المساعد غير موجود' },
        { status: 404 }
      );
    }

    if (!assistant.is_active) {
      return NextResponse.json(
        { error: 'الحساب غير مفعل' },
        { status: 403 }
      );
    }

    // 4. التحقق من صلاحية عرض التذاكر (يدعم tickets و support)
    const { data: permissions, error: permsError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('module, can_view, can_edit, can_delete, can_manage')
      .eq('assistant_id', assistantId);

    if (permsError) {
      console.error('Permissions error:', permsError);
      return NextResponse.json(
        { error: 'فشل جلب الصلاحيات' },
        { status: 500 }
      );
    }

    const canViewTickets = permissions?.some(
      (p) => (p.module === 'tickets' || p.module === 'support') && (p.can_view || p.can_manage)
    );

    if (!canViewTickets) {
      return NextResponse.json(
        { error: 'غير مصرح لك بمشاهدة التذاكر' },
        { status: 403 }
      );
    }

    // 5. جلب التذاكر حسب النوع و/أو المعرف
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'technical' أو 'academic'
    const ticketId = searchParams.get('id'); // اختياري لتفاصيل تذكرة معينة

    let query = supabaseAdmin
      .from('tickets')
      .select('*, student:profiles!tickets_student_id_fkey(full_name, email), course:courses(title)')
      .eq('assigned_to', assistantId);

    if (type) {
      query = query.eq('support_type', type);
    }

    if (ticketId) {
      // جلب تذكرة واحدة ولكن نرجعها كمصفوفة لتوحيد التعامل
      const { data, error } = await query.eq('id', ticketId);

      if (error) {
        console.error('Ticket fetch error:', error);
        if (error.code === 'PGRST116') {
          return NextResponse.json(
            { error: 'التذكرة غير موجودة' },
            { status: 404 }
          );
        }
        return NextResponse.json(
          { error: 'فشل جلب التذكرة' },
          { status: 500 }
        );
      }

      if (!data || data.length === 0) {
        return NextResponse.json(
          { error: 'التذكرة غير موجودة' },
          { status: 404 }
        );
      }

      // تأكد من أن التذكرة مخصصة لهذا المساعد (تم بالفعل في الشرط)
      const ticket = data[0];
      if (ticket.assigned_to !== assistantId) {
        return NextResponse.json(
          { error: 'غير مصرح لك بمشاهدة هذه التذكرة' },
          { status: 403 }
        );
      }

      // نعيد كمصفوفة تحت مفتاح tickets
      return NextResponse.json({
        success: true,
        tickets: [ticket],
      });
    }

    // جلب جميع التذاكر
    const { data: tickets, error: ticketsError } = await query.order('created_at', { ascending: false });

    if (ticketsError) {
      console.error('Tickets error:', ticketsError);
      return NextResponse.json(
        { error: 'فشل جلب التذاكر' },
        { status: 500 }
      );
    }

    // 6. إحصائيات سريعة
    const allTickets = tickets || [];
    const open = allTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
    const inProgress = allTickets.filter((t) => t.status === 'in_progress').length;
    const resolved = allTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

    // 7. الرد
    return NextResponse.json({
      success: true,
      tickets: allTickets,
      stats: { open, inProgress, resolved },
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}