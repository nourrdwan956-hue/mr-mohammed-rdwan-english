

// ================================================================
// 🗄️ lib/supabase/server.js
// عميل Supabase لبيئة الخادم (Server Client)
// يستخدم في API Routes، Server Components، Webhooks، وأي مكان في الخادم
// ================================================================

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * إنشاء عميل Supabase للخادم مع إدارة الكوكيز بشكل صحيح
 * يعمل في Next.js 16 (App Router) مع async cookies
 * يستخدم هذا العميل صلاحيات المستخدم العادي (مقيد بـ RLS)
 * @returns {Promise<SupabaseClient>}
 */
export async function createClient() {
  // في Next.js 16، دالة cookies() هي async ويجب استخدام await
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        // جلب جميع الكوكيز من الطلب الحالي
        getAll() {
          return cookieStore.getAll();
        },
        // تعيين الكوكيز في الاستجابة (لـ RLS و Auth)
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // تجاهل الأخطاء في حالة بيئات الخادم الثابت (Static Generation)
            // أو عند عدم وجود كائن استجابة، لأن بعض الـ API Routes قد لا تحتاج إلى كتابة كوكيز جديدة
            console.warn('⚠️ Supabase Server Client: Could not set cookies.', error?.message);
          }
        },
      },
    }
  );
}

/**
 * إنشاء عميل Supabase للخادم بصلاحيات المسؤول (Service Role)
 * يستخدم فقط في العمليات الحساسة جداً (مثل تحديث حالات الدفع، Webhook)
 * **تحذير:** هذا العميل يتجاوز RLS بالكامل! استخدمه بحذر شديد.
 * يجب وضع مفتاح SUPABASE_SERVICE_ROLE_KEY في ملف .env.local
 * @returns {SupabaseClient}
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    const errorMsg = '❌ SUPABASE_SERVICE_ROLE_KEY is missing in environment variables.';
    console.error(errorMsg);
    throw new Error(errorMsg);
  }

  // استخدام createServerClient مع مفتاح Service Role
  // لا نحتاج إلى كوكيز لأن Service Role يتجاوز RLS
  return createServerClient(supabaseUrl, supabaseServiceKey, {
    cookies: {
      getAll() {
        return [];
      },
      setAll() {
        // لا نقوم بتعيين أي كوكيز لأننا لا نريد تغيير جلسة المستخدم
        // ونحن نستخدم صلاحيات خدمية
      },
    },
  });
}

/**
 * التحقق من صحة الاتصال بقاعدة البيانات (اختياري)
 * @param {boolean} useAdmin - استخدام عميل المسؤول للتحقق
 * @returns {Promise<boolean>}
 */
export async function checkSupabaseConnection(useAdmin = false) {
  try {
    const supabase = useAdmin ? createAdminClient() : await createClient();
    const { error } = await supabase.from('profiles').select('id').limit(1);
    if (error) {
      console.error('❌ Supabase connection failed:', error.message);
      return false;
    }
    console.log(`✅ Supabase connection successful (${useAdmin ? 'Admin' : 'User'} Client)`);
    return true;
  } catch (err) {
    console.error('❌ Supabase connection error:', err.message);
    return false;
  }
}

/**
 * الحصول على عميل Supabase مع إمكانية الاختيار بين العادي والمسؤول
 * @param {boolean} admin - استخدام عميل المسؤول
 * @returns {Promise<SupabaseClient>|SupabaseClient}
 */
export async function getSupabaseClient(admin = false) {
  if (admin) {
    return createAdminClient();
  }
  return await createClient();
}

// تصدير افتراضي لتسهيل الاستيراد
export default {
  createClient,
  createAdminClient,
  checkSupabaseConnection,
  getSupabaseClient,
};