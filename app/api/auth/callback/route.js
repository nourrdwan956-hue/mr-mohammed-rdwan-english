

// app/api/auth/callback/route.js
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  // الحصول على cookies مع await (مطلوب في Next.js 16)
  const cookieStore = await cookies();

  // إنشاء عميل Supabase مع إدارة الكوكيز
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value;
        },
        set(name, value, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name, options) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  // إذا كان هناك كود، نقوم بتبادله للحصول على جلسة
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  }

  // جلب الجلسة بعد التبادل
  const { data: { session } } = await supabase.auth.getSession();

  // توجيه المستخدم بناءً على دوره
  if (session) {
    const role = session.user?.user_metadata?.role || 'student';
    const redirectPath = role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // في حالة الفشل، العودة لتسجيل الدخول مع رسالة خطأ
  return NextResponse.redirect(new URL('/login?error=authentication_failed', request.url));
}