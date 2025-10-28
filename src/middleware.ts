import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Route by hostname:
  // - maps.majiraniwetu.org -> serve map at /maps
  // - majiraniwetu.org (and www) -> serve site at /site
  const hostname = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  // DEBUG: log host/path to Vercel runtime logs (temporary)
  try {
    console.log('[middleware] host=%s path=%s url=%s ua=%s', hostname, pathname, request.url, request.headers.get('user-agent') || '');
  } catch (e) {
    // swallow logging errors
  }

  const isMapsSubdomain = hostname.startsWith('maps.');
  const isMainDomain = hostname === 'majiraniwetu.org' || hostname === 'www.majiraniwetu.org';

  try {
    console.log('[middleware] isMapsSubdomain=%s isMainDomain=%s', isMapsSubdomain, isMainDomain);
  } catch (e) {}

  if (isMapsSubdomain) {
    try { console.log('[middleware] maps subdomain request, pathname=', pathname); } catch (e) {}
    // If already requesting /maps files, allow. Otherwise rewrite root to /maps
    if (pathname === '/' || pathname === '') {
      try { console.log('[middleware] rewriting root -> /maps'); } catch (e) {}
      return NextResponse.rewrite(new URL('/maps', request.url));
    }
    return NextResponse.next();
  }

  if (isMainDomain) {
    try { console.log('[middleware] main domain request, pathname=', pathname); } catch (e) {}
    // Prevent access to /maps on the main domain - redirect users to the maps subdomain
    if (pathname.startsWith('/maps')) {
      try { console.log('[middleware] redirecting /maps -> https://maps.majiraniwetu.org'); } catch (e) {}
      // Redirect any /maps request on the main domain to the maps subdomain root
      return NextResponse.redirect(new URL('https://maps.majiraniwetu.org', request.url));
    }
    // Serve the landing site from /site
    if (pathname === '/' || pathname === '') {
      try { console.log('[middleware] rewriting root -> /site'); } catch (e) {}
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

