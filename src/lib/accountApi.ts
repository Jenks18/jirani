import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { currentMember, sameOrigin } from './session';
import type { Member } from './platform';

export const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });

export async function authed(req: NextRequest, mutating: boolean): Promise<{ member: Member } | { res: NextResponse }> {
  if (mutating && !sameOrigin(req)) return { res: json({ error: 'Forbidden' }, 403) };
  const member = await currentMember();
  if (!member) return { res: json({ error: 'Not signed in' }, 401) };
  return { member };
}

export async function body<T = Record<string, unknown>>(req: NextRequest): Promise<T> {
  try {
    return (await req.json()) as T;
  } catch {
    return {} as T;
  }
}

export const maskPhone = (p: string) => `+${p.slice(0, 3)} ••• ••• ${p.slice(-3)}`;
