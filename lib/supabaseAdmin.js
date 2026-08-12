// ============================================================
// 📁 lib/supabaseAdmin.js
// عميل Supabase بصلاحيات Admin (يتجاوز RLS)
// يستخدم Service Role Key من متغيرات البيئة
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabaseClient';
// واستخدم supabaseAdmin بدلاً من supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// تحقق من وجود المفتاح في البيئة
if (!supabaseUrl) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not defined in environment');
}

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not defined in environment');
}

// إنشاء العميل مع إعدادات تمنع حفظ الجلسة (للاستخدام في الخادم فقط)
export const supabaseAdmin = createClient(
  supabaseUrl || '',
  supabaseServiceKey || '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// دالة مساعدة للتحقق من وجود المفتاح قبل أي عملية
export function isAdminClientReady() {
  return !!(supabaseUrl && supabaseServiceKey);
}