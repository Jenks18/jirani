import { NextRequest } from 'next/server';
import { authed, body, json } from '@/lib/accountApi';
import { joinCommunity, leaveCommunity } from '@/lib/platform';

export async function POST(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const b = await body<{ slug?: string }>(req);
  const c = await joinCommunity(a.member.id, String(b.slug ?? ''));
  if (!c) return json({ error: 'Community not found.' }, 404);
  return json({ ok: true }, 201);
}

export async function DELETE(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const slug = req.nextUrl.searchParams.get('slug');
  if (!slug) return json({ error: 'Missing slug' }, 400);
  await leaveCommunity(a.member.id, slug);
  return json({ ok: true });
}
