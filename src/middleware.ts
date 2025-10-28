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
  
  // ONLY allow maps subdomain - block /maps route on main domain completely
  if (isMapsSubdomain) {
    console.log('✅ Maps subdomain detected - Rewriting to /maps route');
    // Rewrite to /maps route but keep the URL as maps.majiraniwetu.org
    return NextResponse.rewrite(new URL('/maps', request.url));
  }
  
  // Block any direct access to /maps on main domain - return 404
  if (pathname.startsWith('/maps')) {
    console.log('� Blocking direct /maps access on main domain');
    return new NextResponse(null, { status: 404 });
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

