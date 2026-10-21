import 'server-only';
import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { db, findMemberByPhone, openMember, type Member } from './platform';

export const SESSION_COOKIE = 'jirani_session';
const SESSION_DAYS = 14;
const CODE_TTL_MS = 10 * 60_000;
export const MAX_CODE_TRIES = 5;

export const sessionConfigured = (): boolean => Boolean(process.env.SESSION_SECRET);

function subkey(label: string): Buffer | null {
  const secret = process.env.SESSION_SECRET;
  return secret ? createHmac('sha256', secret).update(`jirani/${label}`).digest() : null;
}

const b64 = (s: string) => Buffer.from(s).toString('base64url');

const sign = (key: Buffer, body: string) => createHmac('sha256', key).update(body).digest('base64url');

export function signSession(member: Pick<Member, 'id' | 'session_epoch'>): string | null {
  const key = subkey('session');
  if (!key) return null;
  const body = b64(JSON.stringify({ m: member.id, v: member.session_epoch ?? 0, e: Date.now() + SESSION_DAYS * 86_400_000 }));
  return `${body}.${sign(key, body)}`;
}

export function readSession(token: string | undefined): { memberId: string; epoch: number } | null {
  const key = subkey('session');
  if (!key || !token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = sign(key, body);
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (typeof p.e !== 'number' || p.e < Date.now() || typeof p.m !== 'string' || typeof p.v !== 'number') return null;
    return { memberId: p.m, epoch: p.v };
  } catch {
    return null;
  }
}

export async function setSessionCookie(member: Pick<Member, 'id' | 'session_epoch'>): Promise<boolean> {
  const token = signSession(member);
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
  if (!data || (data.session_epoch ?? 0) !== s.epoch) return null;
  return openMember(data as Member);
}

export async function revokeSessions(): Promise<void> {
  const s = readSession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!s) return;
  await db().from('members').update({ session_epoch: s.epoch + 1 }).eq('id', s.memberId).eq('session_epoch', s.epoch);
}

const ALLOWED_HOSTS = new Set(['maps.the625movement.com', 'jirani.the625movement.com']);

export function sameOrigin(req: NextRequest): boolean {
  const site = req.headers.get('sec-fetch-site');
  if (site === 'cross-site') return false;
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try {
    const host = new URL(origin).host;
    if (ALLOWED_HOSTS.has(host) || host === req.headers.get('host')) return true;
    return process.env.NODE_ENV !== 'production' && /^localhost(:\d+)?$/.test(host);
  } catch {
    return false;
  }
}

const codeHash = (code: string, phone: string) => {
  const key = subkey('login-code');
  if (!key) throw new Error('SESSION_SECRET is not set');
  return createHmac('sha256', key).update(`${code}:${phone}`).digest('hex');
};

export async function issueLoginCode(member: Member): Promise<string> {
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await db()
    .from('members')
    .update({ pending: { action: 'login', hash: codeHash(code, member.phone), exp: Date.now() + CODE_TTL_MS, tries: 0, at: new Date().toISOString() } })
    .eq('id', member.id);
  return code;
}

export async function verifyLoginCode(phone: string, code: string): Promise<Member | null> {
  const member = await findMemberByPhone(phone);
  const p = member?.pending as { action?: string; hash?: string; exp?: number; tries?: number } | null | undefined;
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
