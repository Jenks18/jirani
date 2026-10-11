import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const MAPS_HOST = 'maps.the625movement.com';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname || '/';

  const isMapsSubdomain = host === MAPS_HOST || host.startsWith('maps.');
  const isMainDomain = !isMapsSubdomain;

  if (isMapsSubdomain) {
    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/maps', request.url));
    }
    if (!pathname.startsWith('/maps')) {
      return NextResponse.rewrite(new URL('/maps' + pathname, request.url));
    }
    return NextResponse.next();
  }

  if (isMainDomain) {
    if (pathname === '/maps' || pathname.startsWith('/maps/')) {
      const suffix = pathname.replace(/^\/maps/, '') || '';
      return NextResponse.redirect(new URL(`https://${MAPS_HOST}${suffix}`, request.url));
    }

    if (pathname === '/site' || pathname.startsWith('/site/')) {
      const clean = pathname.replace(/^\/site/, '') || '/';
      return NextResponse.redirect(new URL(clean, request.url), 308);
    }

    if (pathname === '/' || pathname === '') {
      return NextResponse.rewrite(new URL('/site', request.url));
    }
    if (!pathname.startsWith('/site')) {
      return NextResponse.rewrite(new URL('/site' + pathname, request.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|opengraph-image|twitter-image|icon|apple-icon|robots.txt|sitemap.xml|manifest.webmanifest|.*\\..*).*)',
  ],
};

