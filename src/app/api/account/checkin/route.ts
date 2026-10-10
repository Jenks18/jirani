import { NextRequest } from 'next/server';
import { authed, body, json } from '@/lib/accountApi';
import { startCheckin } from '@/lib/safetyNet';

export async function POST(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  const b = await body<{ minutes?: number; note?: string }>(req);
  const minutes = Math.min(Math.max(Math.round(Number(b.minutes) || 60), 5), 1440);
  const due = await startCheckin(a.member, minutes, b.note ? String(b.note) : undefined);
  return json({ ok: true, dueAt: due.toISOString() }, 201);
}
