import 'server-only';
import { createHash, timingSafeEqual } from 'crypto';

const digest = (value: string) => createHash('sha256').update(value).digest();

export function safeEqual(given: string, expected: string): boolean {
  return timingSafeEqual(digest(given), digest(expected));
}

export function adminAuthorized(req: Request): boolean {
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) return false;
  return safeEqual(req.headers.get('x-admin-token') ?? '', expected);
}
