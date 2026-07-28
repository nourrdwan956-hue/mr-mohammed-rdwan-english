

// ================================================================
// 📁 app/api/assistant-login/route.js
// 🔐 تسجيل دخول المساعدين – إصدار نهائي مبسط وآمن
// ================================================================
// - يستخدم Service Role Key لتجاوز RLS والوصول المباشر للبيانات
// - دعم كلمات المرور النصية والمشفرة
// - إرجاع JSON فقط، لا توجيهات
// - سجلات واضحة لتصحيح الأخطاء
// ================================================================

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

// ================================================================
// 🌐 متغيرات البيئة
// ================================================================
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// التحقق من وجود المتغيرات
if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    '❌ متغيرات البيئة مفقودة: NEXT_PUBLIC_SUPABASE_URL أو SUPABASE_SERVICE_ROLE_KEY'
  );
}

// ================================================================
// 🔧 تهيئة عميل Supabase (مع صلاحيات الخدمة)
// ================================================================
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,   // لا حاجة لتحديث التوكن تلقائياً
    persistSession: false,      // لا نخزن الجلسة على مستوى العميل
  },
});

// ================================================================
// 📡 الوظيفة الرئيسية – POST
// ================================================================
export async function POST(request) {
  try {
    // قراءة البيانات من الطلب
    const body = await request.json();
    const { password, accessCode } = body;

    // سجل عملية الدخول (للتصحيح)
    console.log(`🔍 محاولة تسجيل دخول - accessCode: "${accessCode}"`);

    // ===== 1. التحقق من صحة المدخلات =====
    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'كلمة المرور مطلوبة' },
        { status: 400 }
      );
    }

    if (!accessCode || typeof accessCode !== 'string') {
      return NextResponse.json(
        { error: 'رمز الأمان مطلوب' },
        { status: 400 }
      );
    }

    const trimmedPassword = password.trim();
    const trimmedAccessCode = accessCode.trim();

    // التحقق من الحد الأدنى للأطوال
    if (trimmedPassword.length < 8) {
      return NextResponse.json(
        { error: 'كلمة المرور يجب أن تكون 8 خانات على الأقل' },
        { status: 400 }
      );
    }

    if (trimmedAccessCode.length < 6) {
      return NextResponse.json(
        { error: 'رمز الأمان يجب أن يكون 6 خانات على الأقل' },
        { status: 400 }
      );
    }

    // ===== 2. البحث عن المساعد باستخدام رمز الأمان =====
    // استخدام ilike للبحث غير الحساس لحالة الأحرف
    const { data: assistants, error: searchError } = await supabaseAdmin
      .from('assistants')
      .select('*')
      .ilike('access_code', trimmedAccessCode);

    if (searchError) {
      console.error('❌ خطأ في البحث عن المساعد:', searchError);
      return NextResponse.json(
        { error: 'حدث خطأ في الخادم' },
        { status: 500 }
      );
    }

    // التحقق من وجود مساعد واحد على الأقل
    if (!assistants || assistants.length === 0) {
      console.log(`❌ لم يتم العثور على مساعد بالرمز: "${trimmedAccessCode}"`);
      // رسالة عامة لتجنب كشف المعلومات
      return NextResponse.json(
        { error: 'كلمة المرور أو رمز الأمان غير صحيحين' },
        { status: 401 }
      );
    }

    // إذا وجد أكثر من مساعد، نأخذ الأول (عادةً لن يحدث بسبب فريدة access_code)
    const foundAssistant = assistants[0];

    console.log(
      `✅ تم العثور على المساعد: ${foundAssistant.full_name} (${foundAssistant.id})`
    );

    // ===== 3. التحقق من صحة كلمة المرور =====
    let isPasswordValid = false;
    const storedPassword = foundAssistant.password_hash || '';

    // دعم كلمات المرور المشفرة بـ bcrypt
    if (storedPassword.startsWith('$2a$') || storedPassword.startsWith('$2b$')) {
      try {
        isPasswordValid = await bcrypt.compare(trimmedPassword, storedPassword);
      } catch (err) {
        console.error('❌ خطأ في bcrypt:', err);
        isPasswordValid = false;
      }
    } else {
      // مقارنة نصية مباشرة (للتوافق مع الإصدارات القديمة)
      isPasswordValid = storedPassword === trimmedPassword;
    }

    if (!isPasswordValid) {
      console.log(`❌ كلمة مرور غير صحيحة للمساعد: ${foundAssistant.full_name}`);
      // رسالة عامة لتجنب كشف المعلومات
      return NextResponse.json(
        { error: 'كلمة المرور أو رمز الأمان غير صحيحين' },
        { status: 401 }
      );
    }

    // ===== 4. التحقق من نشاط الحساب =====
    if (!foundAssistant.is_active) {
      console.log(`❌ حساب غير مفعل: ${foundAssistant.full_name}`);
      return NextResponse.json(
        { error: 'هذا الحساب غير مفعل، يرجى التواصل مع المعلم' },
        { status: 403 }
      );
    }

    // ===== 5. تسجيل نجاح الدخول =====
    // يمكن إضافة سجل في assistant_logs هنا لاحقاً إذا أردت
    console.log(`✅ تسجيل دخول ناجح: ${foundAssistant.full_name}`);

    // ===== 6. إرجاع بيانات المساعد (بدون كلمة المرور) =====
    return NextResponse.json({
      success: true,
      assistant: {
        id: foundAssistant.id,
        full_name: foundAssistant.full_name,
        display_name: foundAssistant.display_name,
        role: foundAssistant.role,
        role_level: foundAssistant.role_level,
        teacher_id: foundAssistant.teacher_id,
        access_code: foundAssistant.access_code,
        last_login: foundAssistant.last_login,
        created_at: foundAssistant.created_at,
        // لا نُعيد password_hash لأسباب أمنية
      },
    });
  } catch (error) {
    console.error('❌ خطأ غير متوقع في API تسجيل الدخول:', error);
    return NextResponse.json(
      { error: 'حدث خطأ أثناء تسجيل الدخول، حاول مرة أخرى' },
      { status: 500 }
    );
  }
}

// ================================================================
// 🌐 دعم CORS للسماح بالطلبات من أي نطاق (اختياري)
// ================================================================
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}