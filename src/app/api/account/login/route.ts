import { NextRequest } from 'next/server';
import { body, json } from '@/lib/accountApi';
import { normalizePhone } from '@/lib/geo';
import { loginRateLimiter } from '@/lib/rateLimiter';
import { sameOrigin, setSessionCookie, verifyLoginCode } from '@/lib/session';

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return json({ error: 'Forbidden' }, 403);
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (!loginRateLimiter.checkLimit(ip).allowed) return json({ error: 'Too many attempts. Please wait a few minutes.' }, 429);
  if (!process.env.SESSION_SECRET) return json({ error: 'Sign-in is not available right now.' }, 503);

  const b = await body<{ phone?: string; code?: string }>(req);
  const phone = normalizePhone(String(b.phone ?? ''));
  const code = String(b.code ?? '').replace(/\D/g, '');
  if (!phone || code.length !== 6) return json({ error: 'Enter your phone number and the 6-digit code.' }, 400);

  const member = await verifyLoginCode(phone, code);
  if (!member) return json({ error: 'That code is wrong or has expired. Message LOGIN to Jirani for a new one.' }, 401);
  await setSessionCookie(member.id, member.phone);
  return json({ ok: true });
}
