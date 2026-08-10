// ================================================================
// 📁 app/api/assistant-data/route.js
// 🔐 جلب بيانات المساعد والصلاحيات – نسخة محسنة
// ================================================================
// - يستخدم Service Role لتجاوز RLS
// - يتحقق من نشاط الحساب ويرفض غير المفعل
// - يُحدث last_login عند كل طلب ناجح
// - سجلات غنية لسهولة التتبع
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ================================================================
// 📡 الوظيفة الرئيسية – GET
// ================================================================
export async function GET(request) {
  try {
    console.log('🔍 [assistant-data] بدء جلب بيانات المساعد');

    // 1. استخراج assistantId من الـ Header
    const assistantId = request.headers.get('x-assistant-id');
    console.log(`📝 [assistant-data] assistantId المستلم: "${assistantId}"`);

    if (!assistantId) {
      console.warn('⚠️ [assistant-data] assistantId غير موجود');
      return NextResponse.json(
        { error: 'معرف المساعد مطلوب' },
        { status: 400 }
      );
    }

    // 2. تهيئة عميل Supabase باستخدام Service Role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseSecretKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseSecretKey) {
      console.error('❌ [assistant-data] مفاتيح Supabase غير مكتملة');
      return NextResponse.json(
        { error: 'تكوين الخادم غير مكتمل' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseSecretKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log('✅ [assistant-data] تم تهيئة عميل Supabase بنجاح');

    // 3. جلب بيانات المساعد
    console.log(`🔍 [assistant-data] جلب بيانات المساعد ${assistantId}`);
    const { data: assistant, error: assistantError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .eq('id', assistantId)
      .single();

    if (assistantError) {
      console.error('❌ [assistant-data] خطأ في جلب المساعد:', assistantError);
      return NextResponse.json(
        { error: 'فشل جلب بيانات المساعد' },
        { status: 404 }
      );
    }

    if (!assistant) {
      console.warn(`⚠️ [assistant-data] لم يتم العثور على مساعد بالمعرف ${assistantId}`);
      return NextResponse.json(
        { error: 'المساعد غير موجود' },
        { status: 404 }
      );
    }

    console.log(`✅ [assistant-data] تم العثور على المساعد: ${assistant.full_name}`);

    // 4. التحقق من نشاط الحساب
    if (!assistant.is_active) {
      console.warn(`⚠️ [assistant-data] حساب غير نشط: ${assistant.full_name}`);
      return NextResponse.json(
        { error: 'هذا الحساب غير مفعل، يرجى التواصل مع المعلم' },
        { status: 403 }
      );
    }

    // 5. تحديث last_login
    try {
      await supabaseAdmin
        .from('assistants')
        .update({ last_login: new Date().toISOString() })
        .eq('id', assistantId);
      console.log(`✅ [assistant-data] تم تحديث last_login للمساعد ${assistantId}`);
    } catch (updateError) {
      console.error('⚠️ [assistant-data] فشل تحديث last_login:', updateError);
    }

    // 6. جلب صلاحيات المساعد
    console.log(`🔍 [assistant-data] جلب صلاحيات المساعد ${assistantId}`);
    const { data: permissions, error: permsError } = await supabaseAdmin
      .from('assistant_permissions')
      .select('*')
      .eq('assistant_id', assistantId);

    if (permsError) {
      console.error('❌ [assistant-data] خطأ في جلب الصلاحيات:', permsError);
    }

    const permissionsCount = permissions?.length || 0;
    console.log(`✅ [assistant-data] تم جلب ${permissionsCount} صلاحية`);

    // 7. بناء الاستجابة (بدون كلمة المرور)
    const responseData = {
      success: true,
      assistant: {
        id: assistant.id,
        full_name: assistant.full_name,
        display_name: assistant.display_name,
        role: assistant.role,
        role_level: assistant.role_level,
        teacher_id: assistant.teacher_id,
        access_code: assistant.access_code,
        is_active: assistant.is_active,
        created_at: assistant.created_at,
        last_login: assistant.last_login || null,
      },
      permissions: permissions || [],
    };

    console.log('✅ [assistant-data] تم إرسال البيانات بنجاح');
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('❌ [assistant-data] خطأ غير متوقع:', error);
    return NextResponse.json(
      { error: `حدث خطأ في الخادم: ${error.message}` },
      { status: 500 }
    );
  }
}