import { NextResponse } from 'next/server';
import { db, safely } from '@/lib/platform';

export async function GET() {
  const posts = await safely<unknown[]>(
    () =>
      db()
        .from('news_posts')
        .select('id, title, body, author, pinned, published_at, areas(name, slug), communities(name, slug)')
        .lte('published_at', new Date().toISOString())
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false })
        .limit(50),
    []
  );
  return NextResponse.json({ posts }, { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' } });
}
