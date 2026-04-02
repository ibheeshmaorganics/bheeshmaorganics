import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('admin_token')?.value;
  const path = request.nextUrl.pathname;

  // Ignore static files and API routes perfectly
  const isApiRoute = path.startsWith('/api');
  const isStaticFile = path.startsWith('/_next') || path.startsWith('/images') || path === '/favicon.ico';
  
  if (isApiRoute || isStaticFile) {
    return NextResponse.next();
  }

  const isAdminRoute = path.startsWith('/admin');

  if (token) {
    // Admin is logged in: CANNOT access public user pages
    if (!isAdminRoute) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    // Logged in admin does not need to see login page
    if (path === '/admin/login') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  } else {
    // Public user: CANNOT access admin pages except login
    if (isAdminRoute && path !== '/admin/login') {
      return NextResponse.redirect(new URL('/admin/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
