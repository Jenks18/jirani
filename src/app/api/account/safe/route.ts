import { NextRequest } from 'next/server';
import { authed, json } from '@/lib/accountApi';
import { markSafe } from '@/lib/safetyNet';

export async function POST(req: NextRequest) {
  const a = await authed(req, true);
  if ('res' in a) return a.res;
  return json({ ok: true, ...(await markSafe(a.member)) });
}
