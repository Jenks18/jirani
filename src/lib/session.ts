import 'server-only';
import { createHash, createHmac, randomInt, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { db, type Member } from './platform';

export const SESSION_COOKIE = 'jirani_session';
const SESSION_DAYS = 30;
const CODE_TTL_MS = 10 * 60_000;
export const MAX_CODE_TRIES = 5;

function secret(): string | null {
  return process.env.SESSION_SECRET || null;
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');

export function signSession(memberId: string, phone: string): string | null {
  const key = secret();
  if (!key) return null;
  const body = b64(JSON.stringify({ m: memberId, p: phone, e: Date.now() + SESSION_DAYS * 86_400_000 }));
  const sig = createHmac('sha256', key).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function readSession(token: string | undefined): { memberId: string; phone: string } | null {
  const key = secret();
  if (!key || !token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', key).update(body).digest('base64url');
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof p.e !== 'number' || p.e < Date.now()) return null;
    return { memberId: p.m, phone: p.p };
  } catch {
    return null;
  }
}

export async function setSessionCookie(memberId: string, phone: string): Promise<boolean> {
  const token = signSession(memberId, phone);
  if (!token) return false;
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
  return true;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function currentMember(): Promise<Member | null> {
  const s = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return null;
  const { data } = await db().from('members').select('*').eq('id', s.memberId).maybeSingle();
  return (data as Member | null) ?? null;
}

const ALLOWED_HOSTS = new Set(['maps.the625movement.com', 'jirani.the625movement.com']);

export function sameOrigin(req: NextRequest): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    return ALLOWED_HOSTS.has(host) || host === req.headers.get('host') || host.endsWith('localhost:3000');
  } catch {
    return false;
  }
}

const codeHash = (code: string, phone: string) =>
  createHash('sha256').update(`${code}:${phone}:${secret() ?? ''}`).digest('hex');

export async function issueLoginCode(member: Member): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db()
    .from('members')
    .update({ pending: { action: 'login', hash: codeHash(code, member.phone), exp: Date.now() + CODE_TTL_MS, tries: 0, at: new Date().toISOString() } })
    .eq('id', member.id);
  return code;
}

export async function verifyLoginCode(phone: string, code: string): Promise<Member | null> {
  const { data } = await db().from('members').select('*').eq('phone', phone).maybeSingle();
  const member = data as (Member & { pending: { action?: string; hash?: string; exp?: number; tries?: number } | null }) | null;
  const p = member?.pending;
  if (!member || !p || p.action !== 'login' || !p.hash || !p.exp || p.exp < Date.now() || (p.tries ?? 0) >= MAX_CODE_TRIES) return null;
  const given = codeHash(code, phone);
  const ok = given.length === p.hash.length && timingSafeEqual(Buffer.from(given), Buffer.from(p.hash));
  if (!ok) {
    await db()
      .from('members')
      .update({ pending: { ...p, tries: (p.tries ?? 0) + 1 } })
      .eq('id', member.id);
    return null;
  }
  await db().from('members').update({ pending: null }).eq('id', member.id);
  return member;
}
