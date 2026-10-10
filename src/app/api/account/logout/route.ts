import { NextRequest } from 'next/server';
import { json } from '@/lib/accountApi';
import { clearSessionCookie, sameOrigin } from '@/lib/session';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  await clearSessionCookie();
  return json({ ok: true });
}
