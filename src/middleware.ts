import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const url = request.nextUrl.clone();
  
  // Check if it's the maps subdomain
  const isMapsSubdomain = hostname.startsWith('maps.') || 
                          hostname.includes('maps.majiraniwetu.org') ||
                          hostname.includes('maps.localhost');
  
  // If accessing from maps subdomain and on root, redirect to /maps
  if (isMapsSubdomain && url.pathname === '/') {
    url.pathname = '/maps';
    return NextResponse.redirect(url);
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
