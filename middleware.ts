import { NextRequest, NextResponse } from 'next/server';

export const config = {
  matcher: [
    '/admin/:path*',
    '/student/:path*'
  ],
};

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;
  
  // Get all authentication cookies
  const authToken = req.cookies.get('auth-token')?.value;
  const userRole = req.cookies.get('user-role')?.value;
  const userEmail = req.cookies.get('user-email')?.value;
  const sessionId = req.cookies.get('session-id')?.value;
  
  // Public paths that don't require authentication
  const publicPaths = ['/auth/login', '/auth/register', '/api/auth/login', '/api/auth/session'];
  if (publicPaths.includes(pathname)) {
    return NextResponse.next();
  }

  // API routes that need authentication
  if (pathname.startsWith('/api/')) {
    if (!authToken || !sessionId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Comprehensive auth check for protected routes
  if (!authToken || !sessionId || !userRole || !userEmail) {
    console.log('Missing auth credentials:', { authToken: !!authToken, sessionId: !!sessionId, userRole: !!userRole, userEmail: !!userEmail });
    const loginUrl = new URL('/auth/login', req.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Admin routes - only allow admin and professor roles
  if (pathname.startsWith('/admin')) {
    if (userRole !== 'admin' && userRole !== 'professor') {
      console.log('Unauthorized admin access attempt:', { userRole, path: pathname });
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
