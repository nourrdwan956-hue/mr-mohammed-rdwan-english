// ================================================================
// 📁 app/api/assistant/support/route.js
// ✅ API جديد – جلب تذاكر الدعم الخاصة بالمساعد (مع التحقق من الصلاحية)
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

    // 4. التحقق من صلاحية عرض التذاكر
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
      (p) => p.module === 'tickets' && (p.can_view || p.can_manage)
    );

    if (!canViewTickets) {
      return NextResponse.json(
        { error: 'غير مصرح لك بمشاهدة التذاكر' },
        { status: 403 }
      );
    }

    // 5. جلب التذاكر حسب النوع (من query param)
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
      query = query.eq('id', ticketId).single();
    } else {
      query = query.order('created_at', { ascending: false });
    }

    const { data: tickets, error: ticketsError } = await query;

    if (ticketsError) {
      console.error('Tickets error:', ticketsError);
      return NextResponse.json(
        { error: 'فشل جلب التذاكر' },
        { status: 500 }
      );
    }

    // 6. إحصائيات سريعة (مفتوحة، معلقة، محلولة)
    let stats = {};
    if (!ticketId) {
      const allTickets = tickets || [];
      const open = allTickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;
      const resolved = allTickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;
      stats = { open, inProgress: allTickets.filter((t) => t.status === 'in_progress').length, resolved };
    }

    // 7. الرد
    return NextResponse.json({
      success: true,
      assistant: {
        id: assistant.id,
        full_name: assistant.full_name,
        display_name: assistant.display_name,
        role: assistant.role,
        teacher_id: assistant.teacher_id,
      },
      tickets: ticketId ? tickets : tickets || [],
      stats: ticketId ? undefined : stats,
    });
  } catch (error) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      { error: 'حدث خطأ في الخادم' },
      { status: 500 }
    );
  }
}