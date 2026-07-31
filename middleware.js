// middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // ✅ مسارات عامة لا تحتاج تسجيل دخول
  const publicPaths = ['/', '/login', '/register', '/reset-password', '/update-password', '/assistant-login'];
  if (publicPaths.some(p => path === p) || path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ✅ إنشاء استجابة مبدئية (سنعدل الكوكيز عليها)
  let response = NextResponse.next();

  // ✅ التحقق من الجلسة مع دعم تحديث الكوكيز
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // ❌ لو مش مسجل دخول → منع الوصول للمسارات المحمية
  if (!session) {
    if (path.startsWith('/dashboard/') || path.startsWith('/watch/')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirectedFrom', path);
      return NextResponse.redirect(loginUrl);
    }
    // لو صفحة تانية (مش محمية) → نسمح
    return response;
  }

  // ✅ مسجل دخول → نتحقق من الأدوار حسب المسار
  const role = session.user.user_metadata?.role || 'student';

  // 1. منع الوصول لصفحات المعلم
  if (path.startsWith('/dashboard/teacher') && role !== 'teacher') {
    const redirectPath = role === 'assistant' ? '/dashboard/assistant' : '/dashboard/student';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // 2. منع الوصول لصفحات الطالب (للمعلم فقط)
  if (path.startsWith('/dashboard/student') && role === 'teacher') {
    return NextResponse.redirect(new URL('/dashboard/teacher', request.url));
  }

  // 3. منع المساعد من دخول صفحة المعلم (تأكيد إضافي)
  if (path.startsWith('/dashboard/teacher') && role === 'assistant') {
    return NextResponse.redirect(new URL('/dashboard/assistant', request.url));
  }

  // 4. منع غير المساعد من دخول صفحة المساعد
  if (path.startsWith('/dashboard/assistant') && role !== 'assistant') {
    const redirectPath = role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // 5. لو مسجل دخول ويحاول يدخل على صفحات تسجيل الدخول → نوجهه للوحة
  if (session && (path === '/login' || path === '/register')) {
    const redirectPath = role === 'teacher' ? '/dashboard/teacher' : 
                         role === 'assistant' ? '/dashboard/assistant' : '/dashboard/student';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  // ✅ السماح بمرور الطلبات مع تحديث الكوكيز (إن لزم)
  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/watch/:path*',
    '/login',
    '/register',
    '/reset-password',
    '/update-password',
    '/assistant-login',
  ],
};