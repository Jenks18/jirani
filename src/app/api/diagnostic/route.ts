import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({
    message: "Simple diagnostic endpoint working",
    url: req.url,
    pathname: req.nextUrl.pathname,
    searchParams: Object.fromEntries(req.nextUrl.searchParams.entries()),
    timestamp: new Date().toISOString()
  });
}
