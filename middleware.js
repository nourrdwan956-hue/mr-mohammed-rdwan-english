// middleware.js
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request) {
  const path = request.nextUrl.pathname;

  // ✅ استثناء مسارات الـ API والمساعدين والصفحات العامة
  const publicPaths = ['/', '/login', '/register', '/reset-password', '/update-password'];
  if (path.startsWith('/api/') || 
      path === '/assistant-login' || 
      path.startsWith('/dashboard/assistant') ||
      publicPaths.some(p => path === p)) {
    return NextResponse.next();
  }

  // ✅ التحقق من الجلسة باستخدام Supabase
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();

  // لو مش مسجل دخول ويحاول يدخل على صفحة محمية
  if (!session && path.startsWith('/dashboard/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectedFrom', path);
    return NextResponse.redirect(loginUrl);
  }

  // لو مسجل دخول ويحاول يدخل على صفحة تسجيل الدخول
  if (session && (path === '/login' || path === '/register')) {
    const role = session.user.user_metadata?.role || 'student';
    const redirectPath = role === 'teacher' ? '/dashboard/teacher' : '/dashboard/student';
    return NextResponse.redirect(new URL(redirectPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register', '/reset-password', '/update-password', '/assistant-login'],
};