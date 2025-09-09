import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    // Protect all routes except public ones
    '/((?!api|_next/static|_next/image|favicon.ico|public|auth/login|auth/register).*)',
  ],
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Allow access to public routes
  const publicRoutes = [
    '/',
    '/auth/login',
    '/auth/register',
    '/api/auth',
  ];
  
  // Check if the route is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // Check for Firebase session cookie
  const sessionCookie = req.cookies.get('__session');
  const firebaseToken = req.cookies.get('firebase-auth-token');
  
  // If no authentication token, redirect to login
  if (!sessionCookie && !firebaseToken) {
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // For authenticated users, check role-based access
  const userRole = req.cookies.get('user-role')?.value;
  
  // Admin-only routes
  if (pathname.startsWith('/admin') && userRole !== 'admin' && userRole !== 'professor') {
    return NextResponse.redirect(new URL('/student/dashboard', req.url));
  }
  
  // Student-only routes
  if (pathname.startsWith('/student') && userRole === 'admin') {
    return NextResponse.redirect(new URL('/admin/dashboard', req.url));
  }
  
  return NextResponse.next();
}
