// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const path = request.nextUrl.pathname;

  // ✅ استثناء مسارات الـ API
  if (path.startsWith('/api/')) {
    return NextResponse.next();
  }

  // ✅ استثناء المساعدين
  if (path === '/assistant-login' || path.startsWith('/dashboard/assistant')) {
    return NextResponse.next();
  }

  // ✅ الصفحات العامة (متاحة للجميع)
  const publicPaths = ['/', '/login', '/register', '/reset-password'];
  if (publicPaths.some(p => path === p)) {
    return NextResponse.next();
  }

  // ===== التحقق من المصادقة =====
  // هنا يمكنك إضافة منطق التحقق من الجلسة
  // مثال: التحقق من وجود token في الـ cookies
  const token = request.cookies.get('sb-access-token')?.value || 
                request.cookies.get('supabase-auth-token')?.value;

  // لو مش مسجل دخول ويحاول يدخل على صفحة محمية، نوجهه لتسجيل الدخول
  if (!token && path.startsWith('/dashboard/')) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', path);
    return NextResponse.redirect(loginUrl);
  }

  // لو مسجل دخول ويحاول يدخل على صفحة تسجيل الدخول، نوجهه للـ dashboard
  if (token && (path === '/login' || path === '/register')) {
    return NextResponse.redirect(new URL('/dashboard/student', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/reset-password',
    '/assistant-login',
  ],
};