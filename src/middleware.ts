import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAPS_HOST = 'maps.the625movement.com';

export function middleware(request: NextRequest) {
  // Host-based routing: the map app is served from MAPS_HOST and the
  // marketing site from the main host. Both are the same Next.js deployment.
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname || '/';

  // Anything that is not the maps host (production main host, Vercel previews, localhost) serves the site.
  // For local map testing use http://maps.localhost:3000.
  const isMapsSubdomain = host === MAPS_HOST || host.startsWith('maps.');
  const isMainDomain = !isMapsSubdomain;

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
      return NextResponse.redirect(new URL(`https://${MAPS_HOST}${suffix}`, request.url));
    }

    // /site/* is an internal namespace; send direct hits to the clean URL
    if (pathname === '/site' || pathname.startsWith('/site/')) {
      const clean = pathname.replace(/^\/site/, '') || '/';
      return NextResponse.redirect(new URL(clean, request.url), 308);
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
    // Match all paths except API, next/static, next/image, favicon and files with extensions
    '/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)',
  ],
};

