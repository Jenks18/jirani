import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;
  
  // Debug logging
  console.log('🔍 Middleware Debug:', {
    hostname,
    pathname,
    url: request.url
  });
  
  // Check if it's the maps subdomain
  const isMapsSubdomain = hostname.startsWith('maps.') || 
                          hostname === 'maps.majiraniwetu.org';
  
  console.log('📍 Is Maps Subdomain:', isMapsSubdomain);
  
  // If accessing from maps subdomain, rewrite to /maps route
  if (isMapsSubdomain) {
    console.log('✅ Rewriting to /maps route');
    // Rewrite to /maps route but keep the URL as maps.majiraniwetu.org
    return NextResponse.rewrite(new URL('/maps', request.url));
  }
  
  // If accessing /maps on main domain, redirect to maps subdomain
  if (!isMapsSubdomain && pathname.startsWith('/maps')) {
    console.log('🔄 Redirecting to maps subdomain');
    return NextResponse.redirect(new URL('https://maps.majiraniwetu.org', request.url));
  }
  
  console.log('➡️ Passing through to next()');
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*))',
  ],
};

