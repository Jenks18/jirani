import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Minimal host-based routing fallback.
  // Primary routing is still handled by vercel.json at the edge, but
  // this middleware provides a safe fallback to ensure the correct
  // app is served while DNS/edge caches propagate.
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname || '/';

  const isMapsSubdomain = host.startsWith('maps.');
  const isMainDomain = host === 'majiraniwetu.org' || host === 'www.majiraniwetu.org';

  if (isMapsSubdomain) {
    // Serve the map app under /maps
    // If requesting root, rewrite to /maps
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/maps', request.url));
    }
    // If not already under /maps, rewrite into that namespace
    if (!pathname.startsWith('/maps')) {
      return NextResponse.rewrite(new URL('/maps' + pathname, request.url));
    }
    return NextResponse.next();
  }

  if (isMainDomain) {
    // Redirect attempts to access /maps on the main domain to the maps subdomain
    if (pathname === '/maps' || pathname.startsWith('/maps/')) {
      // preserve the path suffix when redirecting
      const suffix = pathname.replace(/^\/maps/, '') || '';
      return NextResponse.redirect(new URL(`https://maps.majiraniwetu.org${suffix}`, request.url));
    }

    // Serve the landing site under /site
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/site', request.url));
    }
    if (!pathname.startsWith('/site')) {
      return NextResponse.rewrite(new URL('/site' + pathname, request.url));
    }
    return NextResponse.next();
  }

  // Fallback: do not interfere with other hosts
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

