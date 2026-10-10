import { NextRequest } from 'next/server';
import { authed, body, json } from '@/lib/accountApi';
import { db } from '@/lib/platform';
import { addContact } from '@/lib/safetyNet';

export async function POST(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const b = await body<{ name?: string; phone?: string }>(req);
  const name = String(b.name ?? '').trim();
  if (!name) return json({ error: 'Enter a name.' }, 400);
  const r = await addContact(a.member, name, String(b.phone ?? ''));
  if (!r.ok) return json({ error: r.reason }, 400);
  return json({ ok: true, invited: r.invited }, 201);
}

export async function DELETE(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return json({ error: 'Missing id' }, 400);
  await db().from('trusted_contacts').update({ status: 'removed', responded_at: new Date().toISOString() }).eq('id', id).eq('member_id', a.member.id);
  return json({ ok: true });
}
