import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/admin/:path*',
    '/student/:path*'
  ],
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Check for authentication tokens
  const authToken = req.cookies.get('auth-token');
  const userRole = req.cookies.get('user-role')?.value;
  
  // If no authentication token, redirect to login
  if (!authToken) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Admin routes - only allow admin and professor roles
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'professor') {
      if (userRole === 'student') {
        return NextResponse.redirect(new URL('/student/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }
  
  // Student routes - only allow student role
  if (pathname.startsWith('/student')) {
    if (userRole !== 'student') {
      if (userRole === 'admin' || userRole === 'professor') {
        return NextResponse.redirect(new URL('/admin/dashboard', req.url));
      }
      return NextResponse.redirect(new URL('/auth/login', req.url));
    }
  }
  
  return NextResponse.next();
}
