import { NextRequest } from 'next/server';
import { authed, body, json } from '@/lib/accountApi';
import { db, findArea, subscribe } from '@/lib/platform';

export async function POST(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const b = await body<{ areaSlug?: string; minSeverity?: number }>(req);
  const area = await findArea(String(b.areaSlug ?? ''));
  if (!area) return json({ error: 'Choose an area.' }, 400);
  const minSeverity = Math.min(Math.max(Math.round(Number(b.minSeverity) || 3), 1), 5);
  await subscribe(a.member.id, { areaId: area.id, minSeverity });
  return json({ ok: true }, 201);
}

export async function DELETE(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);
  await db().from('alert_subscriptions').update({ active: false }).eq('id', id).eq('member_id', a.member.id);
  return json({ ok: true });
}
