import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Route by hostname:
  // - maps.majiraniwetu.org -> serve map at /maps
  // - majiraniwetu.org (and www) -> serve site at /site
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  const isMapsSubdomain = hostname.startsWith('maps.');
  const isMainDomain = hostname === 'majiraniwetu.org' || hostname === 'www.majiraniwetu.org';

  if (isMapsSubdomain) {
    // If already requesting /maps files, allow. Otherwise rewrite root to /maps
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/maps', request.url));
    }
    return NextResponse.next();
  }

  if (isMainDomain) {
    // Prevent access to /maps on the main domain - redirect users to the maps subdomain
    if (pathname.startsWith('/maps')) {
      return NextResponse.redirect(new URL('https://maps.majiraniwetu.org' + pathname, request.url));
    }
    // Serve the landing site from /site
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/site', request.url));
    }
    // If the path already targets site, allow
    if (pathname.startsWith('/site')) {
      return NextResponse.next();
    }
    // For anything else under main domain, pass through (or customize)
    return NextResponse.next();
  }

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

